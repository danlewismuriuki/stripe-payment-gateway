import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import { User } from "../user.entity";

interface PayoutMethodsResult {
  methodType: 'bank_account' | 'card' | null;
  methods: (Stripe.BankAccount | Stripe.Card)[];
  defaultMethod: Stripe.BankAccount | Stripe.Card | null;
  capabilities: {
    supportsBankAccounts: boolean;
    supportsCards: boolean;
  };
}

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
    }
  
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not defined in environment variables.");
    }
    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  // ======================
  // ENHANCED CORE METHODS
  // ======================

  async createOrUpdateUser(email: string): Promise<User> {
    let user = await this.userRepo.findOneBy({ email });
    
    if (!user) {
      user = await this.userRepo.save({
        email,
        walletBalance: 0,
        isOnboardComplete: false,
        currency: 'USD'
      });
    }
    
    return user;
  }

  async createConnectedAccount(email: string) {
    // First ensure user exists in your database
    const user = await this.createOrUpdateUser(email);

    // Create Stripe customer if not exists
    if (!user.customerId) {
      const customer = await this.stripe.customers.create({ email });
      await this.userRepo.update(user.id, { customerId: customer.id });
    }

    // Create connected account
    const account = await this.stripe.accounts.create({
      type: "express",
      country: "US",
      email,
      capabilities: { 
        transfers: { requested: true },
        card_payments: { requested: true }
      },
      business_profile: {
        url: "https://godanInfo.com"
      }
    });

    // Update user with all Stripe references
    await this.userRepo.update(user.id, { 
      connectedAccountId: account.id,
      email // Ensure email is saved
    });

    return { 
      accountId: account.id,
      customerId: user.customerId,
      email // Return email for confirmation
    };
  }

  async generateOnboardingLink(accountId: string, email: string) {
    try {
      const link = await this.stripe.accountLinks.create({
        account: accountId,
        refresh_url: "https://stripe-investor-frontend.vercel.app/reauth",
        return_url: `https://stripe-investor-frontend.vercel.app/paymentdashboard?email=${encodeURIComponent(email)}`,
        type: "account_onboarding",
      });
  
      // Update user's onboarding status
      await this.userRepo.update(
        { email },
        { onboardingStatus: 'in_progress' }
      );
  
      return { 
        url: link.url,
        expiresAt: link.expires_at 
      };
    } catch (error) {
      console.error('Error generating onboarding link:', error);
      throw new HttpException(
        'Failed to generate onboarding link',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  

  async checkOnboardingCompletion(email: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.connectedAccountId) {
      throw new HttpException('No connected account', HttpStatus.BAD_REQUEST);
    }

    const account = await this.stripe.accounts.retrieve(user.connectedAccountId);
    const isComplete = account.charges_enabled && account.payouts_enabled;

    if (isComplete) {
      await this.userRepo.update(user.id, {
        isOnboardComplete: true,
        onboardingStatus: 'complete'
      });
    }

    return {
      isComplete,
      details: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        requirements: account.requirements
      }
    };
  }

  // ======================
  // ENHANCED PAYMENT METHODS
  // ======================

  async getCustomerPaymentMethods(email: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.customerId) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    return this.stripe.paymentMethods.list({
      customer: user.customerId,
      type: 'card'
    });
  }

  async attachPaymentMethod(email: string, paymentMethodId: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.customerId) {
      throw new HttpException('Customer not found', HttpStatus.NOT_FOUND);
    }

    // Attach the payment method
    const method = await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: user.customerId
    });

    // Set as default if first payment method
    const methods = await this.getCustomerPaymentMethods(email);
    if (methods.data.length === 1) {
      await this.stripe.customers.update(user.customerId, {
        invoice_settings: { default_payment_method: method.id }
      });
    }

    return method;
  }

  // ======================
  // ENHANCED PAYOUT METHODS
  // ======================

  async getPayoutMethods(email: string): Promise<PayoutMethodsResult> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.connectedAccountId) {
      throw new HttpException('No connected account found', HttpStatus.NOT_FOUND);
    }

    // Get account capabilities first
    const account = await this.stripe.accounts.retrieve(user.connectedAccountId);
    
    // Then get external accounts
    const externalAccounts = await this.stripe.accounts.listExternalAccounts(
      user.connectedAccountId,
      { limit: 10 }
    );

    // Determine current method type
    const methodType = externalAccounts.data[0]?.object as 'bank_account' | 'card' | null;

    return {
      methodType,
      methods: externalAccounts.data,
      defaultMethod: externalAccounts.data.find(m => m.default_for_currency) || null,
      capabilities: {
        supportsBankAccounts: account.capabilities?.transfers === 'active',
        supportsCards: account.capabilities?.card_payments === 'active'
      }
    };
  }

  async addPayoutMethod(email: string, token: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.connectedAccountId) {
      throw new HttpException('No connected account found', HttpStatus.NOT_FOUND);
    }

    return this.stripe.accounts.createExternalAccount(
      user.connectedAccountId,
      { external_account: token }
    );
  }

  async setDefaultPayoutMethod(email: string, methodId: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.connectedAccountId) {
      throw new HttpException('No connected account found', HttpStatus.NOT_FOUND);
    }

    await this.stripe.accounts.updateExternalAccount(
      user.connectedAccountId,
      methodId,
      { default_for_currency: true }
    );

    return { success: true };
  }

  async createPayout(email: string, amount: number) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    if (!user.connectedAccountId) {
      throw new HttpException('No connected account', HttpStatus.BAD_REQUEST);
    }

    // Convert to cents
    const amountInCents = Math.round(amount * 100);
    if (amountInCents < 100) {
      throw new HttpException('Minimum payout is $1.00', HttpStatus.BAD_REQUEST);
    }

    if (user.walletBalance < amount) {
      throw new HttpException('Insufficient funds', HttpStatus.BAD_REQUEST);
    }

    // Get payout methods
    const { methods } = await this.getPayoutMethods(email);
    const defaultMethod = methods.find(m => m.default_for_currency);
    
    if (!defaultMethod) {
      throw new HttpException('No default payout method', HttpStatus.BAD_REQUEST);
    }

    // Create payout
    const payout = await this.stripe.payouts.create({
      amount: amountInCents,
      currency: user.currency.toLowerCase(),
      destination: defaultMethod.id,
      metadata: { userId: user.id, email }
    }, {
      stripeAccount: user.connectedAccountId
    });

    // Update wallet balance
    await this.updateWalletBalance(user.id, amount, user.currency, 'withdrawal');

    // Update last payout date
    await this.userRepo.update(user.id, {
      lastPayoutDate: new Date()
    });

    return {
      id: payout.id,
      amount: payout.amount / 100,
      currency: payout.currency,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000)
    };
  }

  // ======================
  // WALLET & PAYMENT METHODS
  // ======================

  async createFundingIntent(email: string, amount: number, currency: string = 'USD') {
    const user = await this.createOrUpdateUser(email);
    
    if (!user.customerId) {
      const customer = await this.stripe.customers.create({ email });
      await this.userRepo.update(user.id, { customerId: customer.id });
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer: user.customerId,
      payment_method_types: ['card'],
      metadata: {
        userId: user.id,
        purpose: 'wallet_funding'
      }
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency
    };
  }

  async updateWalletBalance(
    userId: string,
    amount: number,
    currency: string,
    type: 'deposit' | 'withdrawal'
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const newBalance = type === 'deposit' 
      ? user.walletBalance + amount 
      : user.walletBalance - amount;

    if (newBalance < 0) throw new HttpException('Insufficient funds', HttpStatus.BAD_REQUEST);

    await this.userRepo.update({ id: userId }, { 
      walletBalance: newBalance,
      currency // Update currency if needed
    });
    return { newBalance };
  }

  // ======================
  // WEBHOOK & HELPER METHODS
  // ======================

  constructEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );
  }

  async handleSuccessfulPayment(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (!paymentIntent.metadata.userId) {
      throw new Error('Payment intent missing user reference');
    }

    return this.updateWalletBalance(
      paymentIntent.metadata.userId,
      paymentIntent.amount / 100,
      paymentIntent.currency,
      'deposit'
    );
  }

  async handleAccountUpdate(accountId: string) {
    const user = await this.userRepo.findOneBy({ connectedAccountId: accountId });
    if (!user) return;

    const account = await this.stripe.accounts.retrieve(accountId);
    const isComplete = account.charges_enabled && account.payouts_enabled;

    if (isComplete) {
      await this.userRepo.update(user.id, {
        isOnboardComplete: true,
        onboardingStatus: 'complete'
      });
    }
  }

  async getAccountDetails(email: string) {
    const user = await this.userRepo.findOneBy({ email });
    if (!user?.connectedAccountId) {
      throw new HttpException('No connected account found', HttpStatus.NOT_FOUND);
    }

    const account = await this.stripe.accounts.retrieve(user.connectedAccountId);
    const payoutMethods = await this.getPayoutMethods(email);
    const balance = await this.stripe.balance.retrieve({
      stripeAccount: user.connectedAccountId
    });

    return {
      id: account.id,
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled,
      requirements: account.requirements,
      payoutMethods: payoutMethods.methods,
      defaultPayoutMethod: payoutMethods.defaultMethod,
      balance: balance.available[0]?.amount || 0,
      currency: balance.available[0]?.currency || 'usd',
      walletBalance: user.walletBalance
    };
  }
}