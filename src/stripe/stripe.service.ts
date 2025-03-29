import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import { User } from "../user.entity";

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined");
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }


  async createConnectedAccount(email: string) {
    try {
        const account = await this.stripe.accounts.create({
            type: "express",
            country: "US",
            email,
            capabilities: {
                transfers: { requested: true },
            },
        });

        console.log("✔️ Stripe account created:", account.id);

        // Fetch user before saving
        let user = await this.userRepository.findOne({ where: { email } });
        console.log("🔍 User before update:", user);

        if (user) {
            user.connectedAccountId = account.id;
            await this.userRepository.save(user);
        } else {
            user = await this.userRepository.save({ email, connectedAccountId: account.id });
        }

        console.log("✅ User after update:", user);

        return { accountId: account.id };
    } catch (error) {
        console.error("❌ Failed to create connected account:", error);
        throw new HttpException(`Failed to create connected account: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
}


  async generateAccountLink(accountId: string) {
    console.log("🟢 Received accountId for link generation:", accountId);

    if (!accountId || typeof accountId !== 'string' || !accountId.startsWith("acct_")) {
        console.error("❌ Invalid Account ID passed:", accountId);
        throw new Error("Invalid Account ID. Please ensure a valid account ID is passed.");
    }

    try {
        const accountLink = await this.stripe.accountLinks.create({
            account: accountId,
            refresh_url: "https://stripe-investor-frontend.vercel.app/reauth",
            return_url: "https://stripe-investor-frontend.vercel.app/paymentdashboard",
            type: "account_onboarding",
        });

        console.log("🔗 Generated Stripe account link:", accountLink.url);

        return { url: accountLink.url };
    } catch (error) {
        console.error("❌ Error creating account link:", error);
        throw new Error(`Failed to create account link: ${error.message}`);
    }
}

  async getSavedPaymentMethodsForAccount(accountId: string) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: accountId,
        type: "card",
      });
  
      return paymentMethods.data;
    } catch (error) {
      console.error("Failed to retrieve payment methods:", error);
      throw new Error(`Failed to retrieve payment methods: ${error.message}`);
    }
  }

  async getConnectedAccountId(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
  
    if (!user || !user.connectedAccountId) {
      throw new HttpException("User not found or no connected account", HttpStatus.NOT_FOUND);
    }
  
    return { connectedAccountId: user.connectedAccountId };
  }

   async completeOnboarding(customerId: string, email: string) {
    try {
      const { connectedAccountId } = await this.getConnectedAccountId(email);
      const paymentMethods = await this.getConnectedAccountPaymentMethods(connectedAccountId);

      if (paymentMethods.length === 0) {
        throw new Error("No payment methods found in the connected account.");
      }
      const paymentMethodId = paymentMethods[0].id;
      await this.attachPaymentMethodToCustomer(customerId, paymentMethodId);

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to complete onboarding: ${error.message}`);
    }
  }


  async getConnectedAccountPaymentMethods(connectedAccountId: string) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list(
        { type: "card" },
        { stripeAccount: connectedAccountId }
      );
  
      return paymentMethods.data;
    } catch (error) {
      throw new Error(`Failed to retrieve payment methods: ${error.message}`);
    }
  }

  async attachPaymentMethodToCustomer(customerId: string, paymentMethodId: string) {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to attach payment method: ${error.message}`);
    }
  }
 
  async fundWallet(amount: number, currency: string, customerId: string, paymentMethodId: string) {
    try {
      console.log(`Fetching payment methods for customer: ${customerId}`);
      const paymentMethods = await this.getSavedPaymentMethodsForAccount(customerId);
      console.log("Payment Methods:", paymentMethods);
      if (paymentMethods.length === 0) {
        throw new HttpException("No payment methods found. Please add a card.", HttpStatus.BAD_REQUEST);
      }
  
      // Ensure the selected payment method is valid
      const selectedPaymentMethod = paymentMethods.find((pm) => pm.id === paymentMethodId);
      if (!selectedPaymentMethod) {
        throw new HttpException("Invalid payment method selected", HttpStatus.BAD_REQUEST);
      }
  
      // Set the payment method as the default for the customer
      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
  
      // Create PaymentIntent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount,
        currency,
        payment_method: paymentMethodId,
        customer: customerId,
        confirm: true,
        off_session: true,
      });
  
      return { clientSecret: paymentIntent.client_secret };
    } catch (error) {
      console.error("Stripe API Error:", error);
      throw new HttpException(`Failed to fund wallet: ${error.message}`, HttpStatus.BAD_REQUEST);
    }
  }


  async createPaymentWithTransfer(amount: number, currency: string, connectedAccountId: string) {
    try {
      const transfer = await this.stripe.transfers.create({
        amount,
        currency,
        destination: connectedAccountId,
      });

      return { transferId: transfer.id };
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }

  // async createPayout(amount: number, currency: string, connectedAccountId: string) {
  //   try {
  //     const payout = await this.stripe.payouts.create({
  //       amount,
  //       currency,
  //       destination: connectedAccountId,
  //     });

  //     return { payoutId: payout.id };
  //   } catch (error) {
  //     throw new Error(`Payout failed: ${error.message}`);
  //   }
  // }


 /*#################################################################################################################*/


 async getPayoutMethods(accountId: string): Promise<Stripe.BankAccount[]> {
  try {
    const account = await this.stripe.accounts.retrieve(accountId);
    if (!account.external_accounts) {
      return [];
    }
    return account.external_accounts.data as Stripe.BankAccount[];
  } catch (error) {
    throw new HttpException(
      `Failed to get payout methods: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}


async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  try {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    return paymentMethods.data;
  } catch (error) {
    throw new HttpException(
      `Failed to get payment methods: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

async attachPaymentMethod(paymentMethodId: string, customerId: string) {
  try {
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    return { success: true };
  } catch (error) {
    throw new HttpException(
      `Failed to attach payment method: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

async createPaymentIntent(
  amount: number,
  currency: string,
  customerId?: string,
  paymentMethodId?: string
) {
  try {
    const params: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      setup_future_usage: 'off_session',
    };

    if (customerId) params.customer = customerId;
    if (paymentMethodId) params.payment_method = paymentMethodId;

    const paymentIntent = await this.stripe.paymentIntents.create(params);
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to create payment intent: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

async createPayout(
  amount: number,
  currency: string,
  accountId: string,
  payoutMethodId: string
) {
  try {
    // First verify the payout method belongs to the account
    const account = await this.stripe.accounts.retrieve(accountId);
    const payoutMethodExists = account.external_accounts?.data.some(
      (method) => method.id === payoutMethodId
    );

    if (!payoutMethodExists) {
      throw new Error('Payout method not found for this account');
    }

    const payout = await this.stripe.payouts.create({
      amount,
      currency,
      destination: payoutMethodId,
      metadata: {
        account_id: accountId,
      },
    });

    return { payoutId: payout.id };
  } catch (error) {
    throw new HttpException(
      `Failed to create payout: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

async updateWalletBalance(
  userId: string,
  amount: number,
  currency: string,
  transactionType: 'deposit' | 'withdrawal'
) {
  try {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Convert amount to your base currency if needed
    if (transactionType === 'deposit') {
      user.walletBalance = (user.walletBalance || 0) + amount;
    } else {
      if ((user.walletBalance || 0) < amount) {
        throw new Error('Insufficient funds');
      }
      user.walletBalance = (user.walletBalance || 0) - amount;
    }

    await this.userRepository.save(user);
    return { newBalance: user.walletBalance };
  } catch (error) {
    throw new HttpException(
      `Failed to update wallet: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

async getAccountVerificationStatus(accountId: string) {
  try {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      requirements: account.requirements,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to get account status: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

async ensureCustomerExists(email: string, paymentMethodId?: string) {
  try {
    let user = await this.userRepository.findOne({ where: { email } });
    
    if (!user) {
      user = await this.userRepository.save({ email });
    }

    if (!user.customerId) {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { userId: user.id },
      });
      user.customerId = customer.id;
      await this.userRepository.save(user);
    }

    if (paymentMethodId) {
      await this.attachPaymentMethod(paymentMethodId, user.customerId);
    }

    return { customerId: user.customerId };
  } catch (error) {
    throw new HttpException(
      `Failed to ensure customer exists: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}


async getTransactionHistory(customerId: string) {
  try {
    const charges = await this.stripe.charges.list({ customer: customerId });
    const payouts = await this.stripe.payouts.list({
      destination: customerId,
    });

    return {
      charges: charges.data,
      payouts: payouts.data,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to get transaction history: ${error.message}`,
      HttpStatus.BAD_REQUEST
    );
  }
}

  /** ✅ Webhook event handling */
  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string) {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }
}