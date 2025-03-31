// import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
// import { InjectRepository } from "@nestjs/typeorm";
// import { Repository } from "typeorm";
// import Stripe from "stripe";
// import { User } from "../user.entity";

// @Injectable()
// export class StripeService {
//   private stripe: Stripe;

//   constructor(
//     @InjectRepository(User) private userRepo: Repository<User>,
//   ) {
//     if (!process.env.STRIPE_SECRET_KEY) {
//       throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
//     }
  
//     this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
//       apiVersion: "2025-02-24.acacia",
//     });
//   }
  

//   // ======================
//   // CORE ACCOUNT METHODS
//   // ======================

//   async createConnectedAccount(email: string) {
//     const account = await this.stripe.accounts.create({
//       type: "express",
//       email,
//       capabilities: { transfers: { requested: true } },
//     });

//     await this.userRepo.update({ email }, { 
//       connectedAccountId: account.id,
//       isOnboardComplete: false 
//     });

//     return { accountId: account.id };
//   }

//   async generateOnboardingLink(accountId: string) {
//     const link = await this.stripe.accountLinks.create({
//       account: accountId,
//       refresh_url: "https://stripe-investor-frontend.vercel.app/reauth",
//       return_url: "https://stripe-investor-frontend.vercel.app/paymentdashboard",
//       type: "account_onboarding",
//     });
//     return { url: link.url };
//   }

//   // ======================
//   // PAYMENT METHODS
//   // ======================

//   async attachPaymentMethod(paymentMethodId: string, customerId: string) {
//     await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
//     await this.stripe.customers.update(customerId, {
//       invoice_settings: { default_payment_method: paymentMethodId },
//     });
//     return { success: true };
//   }

//   async getPaymentMethods(customerId: string) {
//     return (await this.stripe.paymentMethods.list({
//       customer: customerId,
//       type: 'card',
//     })).data;
//   }

//   // ======================
//   // PAYOUT METHODS
//   // ======================

//   async getPayoutMethods(accountId: string) {
//     const account = await this.stripe.accounts.retrieve(accountId);
//     return account.external_accounts?.data || [];
//   }

//   async createPayout(
//     amount: number, // in cents
//     currency: string,
//     accountId: string,
//     payoutMethodId: string
//   ) {
//     // Basic validation
//     if (amount < 100) throw new HttpException('Minimum payout is $1.00', HttpStatus.BAD_REQUEST);

//     const payout = await this.stripe.payouts.create({
//       amount,
//       currency,
//       destination: payoutMethodId,
//       metadata: { account_id: accountId }
//     });


//   const user = await this.userRepo.findOneBy({ connectedAccountId: accountId });
//   if (!user) {
//     throw new Error(`User with connectedAccountId ${accountId} not found`);
//   }
  
//   await this.updateWalletBalance(user.id, amount / 100, currency, 'withdrawal');


//     return {
//       id: payout.id,
//       status: payout.status,
//       arrivalDate: new Date(payout.arrival_date * 1000)
//     };
//   }

//   // ======================
//   // WALLET METHODS
//   // ======================

//   async updateWalletBalance(
//     userId: string,
//     amount: number, // in dollars
//     currency: string,
//     type: 'deposit' | 'withdrawal'
//   ) {
//     const user = await this.userRepo.findOneBy({ id: userId });
//     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

//     const newBalance = type === 'deposit' 
//       ? user.walletBalance + amount 
//       : user.walletBalance - amount;

//     if (newBalance < 0) throw new HttpException('Insufficient funds', HttpStatus.BAD_REQUEST);

//     await this.userRepo.update({ id: userId }, { walletBalance: newBalance });
//     return { newBalance };
//   }

//   async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
//     return this.stripe.paymentIntents.retrieve(paymentIntentId);
//   }

//   async createPaymentIntent(
//     amount: number,
//     currency: string,
//     customerId?: string
//   ) {
//     // Validate amount is positive
//     if (amount <= 0) {
//       throw new HttpException('Amount must be positive', HttpStatus.BAD_REQUEST);
//     }
  
//     // Validate currency is supported
//     const supportedCurrencies = ['USD', 'EUR', 'GBP', 'KES'];
//     if (!supportedCurrencies.includes(currency.toUpperCase())) {
//       throw new HttpException(`Unsupported currency: ${currency}`, HttpStatus.BAD_REQUEST);
//     }
  
//     const params: Stripe.PaymentIntentCreateParams = {
//       amount: Math.round(amount * 100), // Convert to cents
//       currency: currency.toLowerCase(),
//       payment_method_types: ['card'],
//       ...(customerId && { customer: customerId })
//     };
  
//     try {
//       const paymentIntent = await this.stripe.paymentIntents.create(params);
//       return {
//         clientSecret: paymentIntent.client_secret, // Keep Stripe's naming
//         id: paymentIntent.id,
//         amount: paymentIntent.amount,
//         currency: paymentIntent.currency
//       };
//     } catch (error) {
//       console.error('Stripe payment intent error:', error);
//       throw new HttpException(
//         error.message,
//         HttpStatus.BAD_REQUEST
//       );
//     }
//   }
//   // ======================
//   // HELPER METHODS
//   // ======================

//   async getAccountStatus(accountId: string) {
//     const account = await this.stripe.accounts.retrieve(accountId);
//     return {
//       payoutsEnabled: account.payouts_enabled,
//       chargesEnabled: account.charges_enabled
//     };
//   }

//   async ensureCustomerExists(email: string) {
//     let user = await this.userRepo.findOneBy({ email });
//     if (!user) user = await this.userRepo.save({ email });

//     if (!user.customerId) {
//       const customer = await this.stripe.customers.create({ email });
//       await this.userRepo.update({ email }, { customerId: customer.id });
//       user.customerId = customer.id;
//     }

//     return user.customerId;
//   }
// }


import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import { User } from "../user.entity";

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
  // CORE ACCOUNT METHODS
  // ======================

  async createConnectedAccount(email: string) {
    const account = await this.stripe.accounts.create({
      type: "express",
      email,
      capabilities: { transfers: { requested: true } },
    });

    await this.userRepo.update({ email }, { 
      connectedAccountId: account.id,
      isOnboardComplete: false 
    });

    return { accountId: account.id };
  }

  async generateOnboardingLink(accountId: string) {
    const link = await this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: "https://stripe-investor-frontend.vercel.app/reauth",
      return_url: "https://stripe-investor-frontend.vercel.app/paymentdashboard",
      type: "account_onboarding",
    });
    return { url: link.url };
  }

  // ======================
  // PAYMENT METHODS
  // ======================

  async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    return { success: true };
  }

  async getPaymentMethods(customerId: string) {
    return (await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    })).data;
  }

  // ======================
  // PAYOUT METHODS
  // ======================

  async getPayoutMethods(accountId: string) {
    const account = await this.stripe.accounts.retrieve(accountId);
    return account.external_accounts?.data || [];
  }

  async createPayout(
    amount: number, // in cents
    currency: string,
    accountId: string,
    payoutMethodId: string
  ) {
    if (amount < 100) throw new HttpException('Minimum payout is $1.00', HttpStatus.BAD_REQUEST);

    const payout = await this.stripe.payouts.create({
      amount,
      currency,
      destination: payoutMethodId,
      metadata: { account_id: accountId }
    });

    const user = await this.userRepo.findOneBy({ connectedAccountId: accountId });
    if (!user) {
      throw new Error(`User with connectedAccountId ${accountId} not found`);
    }
    
    await this.updateWalletBalance(user.id, amount / 100, currency, 'withdrawal');

    return {
      id: payout.id,
      status: payout.status,
      arrivalDate: new Date(payout.arrival_date * 1000)
    };
  }

  // ======================
  // WALLET METHODS
  // ======================

  async updateWalletBalance(
    userId: string,
    amount: number, // in dollars
    currency: string,
    type: 'deposit' | 'withdrawal'
  ) {
    const user = await this.userRepo.findOneBy({ id: userId });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const newBalance = type === 'deposit' 
      ? user.walletBalance + amount 
      : user.walletBalance - amount;

    if (newBalance < 0) throw new HttpException('Insufficient funds', HttpStatus.BAD_REQUEST);

    await this.userRepo.update({ id: userId }, { walletBalance: newBalance });
    return { newBalance };
  }

  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(paymentIntentId);
  }
  
  async createPaymentIntent(
    amount: number,
    currency: string,
    customerId?: string
  ) {
    if (amount <= 0) {
      throw new HttpException('Amount must be positive', HttpStatus.BAD_REQUEST);
    }
  
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'KES'];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      throw new HttpException(`Unsupported currency: ${currency}`, HttpStatus.BAD_REQUEST);
    }
  
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      payment_method_types: ['card'],
      ...(customerId && { customer: customerId })
    };
  
    try {
      const paymentIntent = await this.stripe.paymentIntents.create(params);
      return {
        clientSecret: paymentIntent.client_secret,
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // WEBHOOK METHODS
  // ======================

  constructEvent(payload: Buffer, signature: string) {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret
    );
  }

  async handleSuccessfulPayment(paymentIntentId: string) {
    const paymentIntent = await this.retrievePaymentIntent(paymentIntentId);
    
    if (!paymentIntent.customer) {
      throw new Error('Payment intent has no associated customer');
    }

    const user = await this.userRepo.findOneBy({ 
      customerId: paymentIntent.customer as string 
    });
    
    if (!user) {
      throw new Error('User not found for this payment');
    }

    return this.updateWalletBalance(
      user.id,
      paymentIntent.amount / 100,
      paymentIntent.currency,
      'deposit'
    );
  }

  // ======================
  // HELPER METHODS
  // ======================

  async getAccountStatus(accountId: string) {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
      payoutsEnabled: account.payouts_enabled,
      chargesEnabled: account.charges_enabled
    };
  }

  async ensureCustomerExists(email: string) {
    let user = await this.userRepo.findOneBy({ email });
    if (!user) user = await this.userRepo.save({ email });

    if (!user.customerId) {
      const customer = await this.stripe.customers.create({ email });
      await this.userRepo.update({ email }, { customerId: customer.id });
      user.customerId = customer.id;
    }

    return user.customerId;
  }
}