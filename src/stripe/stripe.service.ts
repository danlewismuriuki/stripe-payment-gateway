// import { Injectable, HttpException, HttpStatus } from "@nestjs/common";
// import { InjectRepository } from "@nestjs/typeorm";
// import { Repository } from "typeorm";
// import Stripe from "stripe";
// import { User } from "../user.entity";

// if (process.env.NODE_ENV !== "production") {
//   require("dotenv").config();
// }

// @Injectable()
// export class StripeService {
//   private stripe: Stripe;

//   constructor(
//     @InjectRepository(User) private readonly userRepository: Repository<User>,
//   ) {
//     if (!process.env.STRIPE_SECRET_KEY) {
//       throw new Error("STRIPE_SECRET_KEY is not defined");
//     }
    
//     this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
//       apiVersion: "2025-02-24.acacia",
//     });
//   }


//   async createConnectedAccount(email: string) {
//     try {
//         const account = await this.stripe.accounts.create({
//             type: "express",
//             country: "US",
//             email,
//             capabilities: {
//                 transfers: { requested: true },
//             },
//         });

//         console.log("✔️ Stripe account created:", account.id);

//         // Fetch user before saving
//         let user = await this.userRepository.findOne({ where: { email } });
//         console.log("🔍 User before update:", user);

//         if (user) {
//             user.connectedAccountId = account.id;
//             await this.userRepository.save(user);
//         } else {
//             user = await this.userRepository.save({ email, connectedAccountId: account.id });
//         }

//         console.log("✅ User after update:", user);

//         return { accountId: account.id };
//     } catch (error) {
//         console.error("❌ Failed to create connected account:", error);
//         throw new HttpException(`Failed to create connected account: ${error.message}`, HttpStatus.BAD_REQUEST);
//     }
// }


//   async generateAccountLink(accountId: string) {
//     console.log("🟢 Received accountId for link generation:", accountId);

//     if (!accountId || typeof accountId !== 'string' || !accountId.startsWith("acct_")) {
//         console.error("❌ Invalid Account ID passed:", accountId);
//         throw new Error("Invalid Account ID. Please ensure a valid account ID is passed.");
//     }

//     try {
//         const accountLink = await this.stripe.accountLinks.create({
//             account: accountId,
//             refresh_url: "https://stripe-investor-frontend.vercel.app/reauth",
//             return_url: "https://stripe-investor-frontend.vercel.app/paymentdashboard",
//             type: "account_onboarding",
//         });

//         console.log("🔗 Generated Stripe account link:", accountLink.url);

//         return { url: accountLink.url };
//     } catch (error) {
//         console.error("❌ Error creating account link:", error);
//         throw new Error(`Failed to create account link: ${error.message}`);
//     }
// }

//   async getSavedPaymentMethodsForAccount(accountId: string) {
//     try {
//       const paymentMethods = await this.stripe.paymentMethods.list({
//         customer: accountId,
//         type: "card",
//       });
  
//       return paymentMethods.data;
//     } catch (error) {
//       console.error("Failed to retrieve payment methods:", error);
//       throw new Error(`Failed to retrieve payment methods: ${error.message}`);
//     }
//   }

//   async getConnectedAccountId(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
  
//     if (!user || !user.connectedAccountId) {
//       throw new HttpException("User not found or no connected account", HttpStatus.NOT_FOUND);
//     }
  
//     return { connectedAccountId: user.connectedAccountId };
//   }

//    async completeOnboarding(customerId: string, email: string) {
//     try {
//       const { connectedAccountId } = await this.getConnectedAccountId(email);
//       const paymentMethods = await this.getConnectedAccountPaymentMethods(connectedAccountId);

//       if (paymentMethods.length === 0) {
//         throw new Error("No payment methods found in the connected account.");
//       }
//       const paymentMethodId = paymentMethods[0].id;
//       await this.attachPaymentMethodToCustomer(customerId, paymentMethodId);

//       return { success: true };
//     } catch (error) {
//       throw new Error(`Failed to complete onboarding: ${error.message}`);
//     }
//   }


//   async getConnectedAccountPaymentMethods(connectedAccountId: string) {
//     try {
//       const paymentMethods = await this.stripe.paymentMethods.list(
//         { type: "card" },
//         { stripeAccount: connectedAccountId }
//       );
  
//       return paymentMethods.data;
//     } catch (error) {
//       throw new Error(`Failed to retrieve payment methods: ${error.message}`);
//     }
//   }

//   async attachPaymentMethodToCustomer(customerId: string, paymentMethodId: string) {
//     try {
//       await this.stripe.paymentMethods.attach(paymentMethodId, {
//         customer: customerId,
//       });
//       await this.stripe.customers.update(customerId, {
//         invoice_settings: { default_payment_method: paymentMethodId },
//       });

//       return { success: true };
//     } catch (error) {
//       throw new Error(`Failed to attach payment method: ${error.message}`);
//     }
//   }
 
//   async fundWallet(amount: number, currency: string, customerId: string, paymentMethodId: string) {
//     try {
//       console.log(`Fetching payment methods for customer: ${customerId}`);
//       const paymentMethods = await this.getSavedPaymentMethodsForAccount(customerId);
//       console.log("Payment Methods:", paymentMethods);
//       if (paymentMethods.length === 0) {
//         throw new HttpException("No payment methods found. Please add a card.", HttpStatus.BAD_REQUEST);
//       }
  
//       // Ensure the selected payment method is valid
//       const selectedPaymentMethod = paymentMethods.find((pm) => pm.id === paymentMethodId);
//       if (!selectedPaymentMethod) {
//         throw new HttpException("Invalid payment method selected", HttpStatus.BAD_REQUEST);
//       }
  
//       // Set the payment method as the default for the customer
//       await this.stripe.customers.update(customerId, {
//         invoice_settings: { default_payment_method: paymentMethodId },
//       });
  
//       // Create PaymentIntent
//       const paymentIntent = await this.stripe.paymentIntents.create({
//         amount,
//         currency,
//         payment_method: paymentMethodId,
//         customer: customerId,
//         confirm: true,
//         off_session: true,
//       });
  
//       return { clientSecret: paymentIntent.client_secret };
//     } catch (error) {
//       console.error("Stripe API Error:", error);
//       throw new HttpException(`Failed to fund wallet: ${error.message}`, HttpStatus.BAD_REQUEST);
//     }
//   }


//   async createPaymentWithTransfer(amount: number, currency: string, connectedAccountId: string) {
//     try {
//       const transfer = await this.stripe.transfers.create({
//         amount,
//         currency,
//         destination: connectedAccountId,
//       });

//       return { transferId: transfer.id };
//     } catch (error) {
//       throw new Error(`Transfer failed: ${error.message}`);
//     }
//   }

//   // async createPayout(amount: number, currency: string, connectedAccountId: string) {
//   //   try {
//   //     const payout = await this.stripe.payouts.create({
//   //       amount,
//   //       currency,
//   //       destination: connectedAccountId,
//   //     });

//   //     return { payoutId: payout.id };
//   //   } catch (error) {
//   //     throw new Error(`Payout failed: ${error.message}`);
//   //   }
//   // }


//  /*#################################################################################################################*/


//  async getPayoutMethods(accountId: string): Promise<Stripe.BankAccount[]> {
//   try {
//     const account = await this.stripe.accounts.retrieve(accountId);
//     if (!account.external_accounts) {
//       return [];
//     }
//     return account.external_accounts.data as Stripe.BankAccount[];
//   } catch (error) {
//     throw new HttpException(
//       `Failed to get payout methods: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }


// async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
//   try {
//     const paymentMethods = await this.stripe.paymentMethods.list({
//       customer: customerId,
//       type: 'card',
//     });
//     return paymentMethods.data;
//   } catch (error) {
//     throw new HttpException(
//       `Failed to get payment methods: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }

// async attachPaymentMethod(paymentMethodId: string, customerId: string) {
//   try {
//     await this.stripe.paymentMethods.attach(paymentMethodId, {
//       customer: customerId,
//     });
//     return { success: true };
//   } catch (error) {
//     throw new HttpException(
//       `Failed to attach payment method: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }

// async createPaymentIntent(
//   amount: number,
//   currency: string,
//   customerId?: string,
//   paymentMethodId?: string
// ) {
//   try {
//     const params: Stripe.PaymentIntentCreateParams = {
//       amount,
//       currency,
//       setup_future_usage: 'off_session',
//     };

//     if (customerId) params.customer = customerId;
//     if (paymentMethodId) params.payment_method = paymentMethodId;

//     const paymentIntent = await this.stripe.paymentIntents.create(params);
    
//     return {
//       clientSecret: paymentIntent.client_secret,
//       paymentIntentId: paymentIntent.id,
//     };
//   } catch (error) {
//     throw new HttpException(
//       `Failed to create payment intent: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }

// // async createPayout(
// //   amount: number,
// //   currency: string,
// //   accountId: string,
// //   payoutMethodId: string
// // ) {
// //   try {
// //     // First verify the payout method belongs to the account
// //     const account = await this.stripe.accounts.retrieve(accountId);
// //     const payoutMethodExists = account.external_accounts?.data.some(
// //       (method) => method.id === payoutMethodId
// //     );

// //     if (!payoutMethodExists) {
// //       throw new Error('Payout method not found for this account');
// //     }

// //     const payout = await this.stripe.payouts.create({
// //       amount,
// //       currency,
// //       destination: payoutMethodId,
// //       metadata: {
// //         account_id: accountId,
// //       },
// //     });

// //     return { payoutId: payout.id };
// //   } catch (error) {
// //     throw new HttpException(
// //       `Failed to create payout: ${error.message}`,
// //       HttpStatus.BAD_REQUEST
// //     );
// //   }
// // }

// async updateWalletBalance(
//   userId: string,
//   amount: number,
//   currency: string,
//   transactionType: 'deposit' | 'withdrawal'
// ) {
//   try {
//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) {
//       throw new Error('User not found');
//     }

//     // Convert amount to your base currency if needed
//     if (transactionType === 'deposit') {
//       user.walletBalance = (user.walletBalance || 0) + amount;
//     } else {
//       if ((user.walletBalance || 0) < amount) {
//         throw new Error('Insufficient funds');
//       }
//       user.walletBalance = (user.walletBalance || 0) - amount;
//     }

//     await this.userRepository.save(user);
//     return { newBalance: user.walletBalance };
//   } catch (error) {
//     throw new HttpException(
//       `Failed to update wallet: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }

// async getAccountVerificationStatus(accountId: string) {
//   try {
//     const account = await this.stripe.accounts.retrieve(accountId);
//     return {
//       chargesEnabled: account.charges_enabled,
//       payoutsEnabled: account.payouts_enabled,
//       requirements: account.requirements,
//     };
//   } catch (error) {
//     throw new HttpException(
//       `Failed to get account status: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }

// async ensureCustomerExists(email: string, paymentMethodId?: string) {
//   try {
//     let user = await this.userRepository.findOne({ where: { email } });
    
//     if (!user) {
//       user = await this.userRepository.save({ email });
//     }

//     if (!user.customerId) {
//       const customer = await this.stripe.customers.create({
//         email,
//         metadata: { userId: user.id },
//       });
//       user.customerId = customer.id;
//       await this.userRepository.save(user);
//     }

//     if (paymentMethodId) {
//       await this.attachPaymentMethod(paymentMethodId, user.customerId);
//     }

//     return { customerId: user.customerId };
//   } catch (error) {
//     throw new HttpException(
//       `Failed to ensure customer exists: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }


// async getTransactionHistory(customerId: string) {
//   try {
//     const charges = await this.stripe.charges.list({ customer: customerId });
//     const payouts = await this.stripe.payouts.list({
//       destination: customerId,
//     });

//     return {
//       charges: charges.data,
//       payouts: payouts.data,
//     };
//   } catch (error) {
//     throw new HttpException(
//       `Failed to get transaction history: ${error.message}`,
//       HttpStatus.BAD_REQUEST
//     );
//   }
// }



// /*#########################################################################################*/

//   async getInvestorDashboard(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
//     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

//     const [accountStatus, balance, payoutMethods, paymentMethods] = await Promise.all([
//       user.connectedAccountId ? this.getAccountVerificationStatus(user.connectedAccountId) : null,
//       user.connectedAccountId ? this.stripe.balance.retrieve({ stripeAccount: user.connectedAccountId }) : null,
//       user.connectedAccountId ? this.getPayoutMethods(user.connectedAccountId) : [],
//       user.customerId ? this.getPaymentMethods(user.customerId) : []
//     ]);

//     return {
//       user: {
//         id: user.id,
//         email: user.email,
//         walletBalance: user.walletBalance,
//         currency: user.currency || 'USD'
//       },
//       stripe: {
//         canReceivePayments: accountStatus?.chargesEnabled || false,
//         canMakePayouts: accountStatus?.payoutsEnabled || false,
//         availableBalance: balance?.available[0]?.amount || 0,
//         payoutMethods,
//         paymentMethods
//       }
//     };
//   }

//   async initiateInvestment(
//     investorEmail: string,
//     projectId: string,
//     amount: number,
//     currency: string
//   ) {
//     const user = await this.userRepository.findOne({ where: { email: investorEmail } });
//     if (!user) throw new HttpException('Investor not found', HttpStatus.NOT_FOUND);

//     // Verify investor status
//     const status = await this.getAccountVerificationStatus(user.connectedAccountId);
//     if (!status.payoutsEnabled) {
//       throw new HttpException('Investor account not fully onboarded', HttpStatus.BAD_REQUEST);
//     }

//     // Create transfer
//     const transfer = await this.stripe.transfers.create({
//       amount: Math.round(amount * 100),
//       currency,
//       destination: user.connectedAccountId,
//       metadata: {
//         project_id: projectId,
//         type: 'investment'
//       }
//     }, { idempotencyKey: `invest_${projectId}_${user.id}` });

//     // Update wallet
//     await this.updateWalletBalance(user.id, amount, currency, 'withdraw');

//     return transfer;
//   }

//   async getInvestmentPortfolio(email: string) {
//     const user = await this.userRepository.findOne({ where: { email } });
//     if (!user?.connectedAccountId) return { investments: [] };

//     const transfers = await this.stripe.transfers.list({
//       destination: user.connectedAccountId,
//       limit: 100,
//       expand: ['data.destination_payment']
//     });

//     return {
//       investments: transfers.data
//         .filter(t => t.metadata?.type === 'investment')
//         .map(t => ({
//           id: t.id,
//           amount: t.amount / 100,
//           currency: t.currency,
//           projectId: t.metadata?.project_id,
//           date: new Date(t.created * 1000),
//           status: t.destination_payment?.status || 'pending'
//         }))
//     };
//   }

//   // ========================
//   // UPDATED EXISTING METHODS
//   // ========================

//   async createPayout(
//     amount: number,      // in cents (e.g., $10.00 = 1000)
//     currency: string,    // lowercase (e.g., 'usd')
//     accountId: string,   // Stripe connected account ID
//     payoutMethodId: string,
//     idempotencyKey?: string
//   ): Promise<{
//     payoutId: string;
//     amount: number;
//     currency: string;
//     estimatedArrival: Date;
//   }> {
//     // ======================
//     // 1. VALIDATION
//     // ======================
//     if (!amount || !currency || !accountId || !payoutMethodId) {
//       throw new HttpException('Missing required parameters', HttpStatus.BAD_REQUEST);
//     }
  
//     if (amount < 100) { // $1.00 minimum
//       throw new HttpException(
//         `Minimum payout is $1.00 (attempted: $${(amount/100).toFixed(2)})`,
//         HttpStatus.BAD_REQUEST
//       );
//     }
  
//     // ======================
//     // 2. DATA FETCHING
//     // ======================
//     const [account, user, balance] = await Promise.all([
//       this.stripe.accounts.retrieve(accountId),
//       this.userRepository.findOne({ 
//         where: { connectedAccountId: accountId },
//         select: ['id', 'email', 'walletBalance'] 
//       }),
//       this.stripe.balance.retrieve({ stripeAccount: accountId })
//     ]);
  
//     // ======================
//     // 3. VERIFICATIONS
//     // ======================
//     if (!user) {
//       throw new HttpException('User account not found', HttpStatus.NOT_FOUND);
//     }
  
//     if (!account.payouts_enabled) {
//       throw new HttpException(
//         'Complete onboarding before making payouts',
//         HttpStatus.FORBIDDEN
//       );
//     }
  
//     const payoutMethod = account.external_accounts?.data.find(
//       m => m.id === payoutMethodId
//     );
    
//     if (!payoutMethod) {
//       throw new HttpException('Invalid payout method', HttpStatus.BAD_REQUEST);
//     }
  
//     if (payoutMethod.currency.toLowerCase() !== currency.toLowerCase()) {
//       throw new HttpException(
//         `Payout method currency (${payoutMethod.currency}) mismatch`,
//         HttpStatus.BAD_REQUEST
//       );
//     }
  
//     const availableBalance = balance.available.find(
//       b => b.currency === currency
//     )?.amount || 0;
  
//     if (availableBalance < amount) {
//       throw new HttpException(
//         `Insufficient balance (Available: $${(availableBalance/100).toFixed(2)}, Requested: $${(amount/100).toFixed(2)})`,
//         HttpStatus.BAD_REQUEST
//       );
//     }
  
//     // ======================
//     // 4. EXECUTE PAYOUT
//     // ======================
//     try {
//       const payout = await this.stripe.payouts.create({
//         amount,
//         currency,
//         destination: payoutMethodId,
//         metadata: {
//           user_id: user.id,
//           user_email: user.email,
//           source: 'investor_dashboard'
//         }
//       }, idempotencyKey ? { idempotencyKey } : undefined);
  
//       // ======================
//       // 5. UPDATE RECORDS
//       // ======================
//       const withdrawalAmount = parseFloat((amount / 100).toFixed(2));
      
//       await Promise.all([
//         this.updateWalletBalance(
//           user.id,
//           withdrawalAmount,
//           currency,
//           'withdrawal'
//         ),
//         this.createTransactionRecord({
//           userId: user.id,
//           amount: withdrawalAmount,
//           currency,
//           type: 'payout',
//           reference: payout.id,
//           status: 'pending',
//           metadata: {
//             payout_method: payoutMethodId,
//             stripe_account: accountId
//           }
//         })
//       ]);
  
//       // ======================
//       // 6. RETURN FORMATTED RESPONSE
//       // ======================
//       return {
//         payoutId: payout.id,
//         amount: payout.amount,
//         currency: payout.currency,
//         estimatedArrival: new Date(payout.arrival_date * 1000)
//       };
  
//     } catch (error) {
//       // Handle Stripe-specific errors
//       if (error?.code === 'amount_too_large') {
//         throw new HttpException(
//           'Amount exceeds allowed limit',
//           HttpStatus.BAD_REQUEST
//         );
//       }
  
//       throw new HttpException(
//         `Payout processing failed: ${error.message}`,
//         HttpStatus.INTERNAL_SERVER_ERROR
//       );
//     }
//   }

//   /** ✅ Webhook event handling */
//   constructWebhookEvent(rawBody: Buffer, signature: string, secret: string) {
//     return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
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

  // constructor(
  //   @InjectRepository(User) private userRepo: Repository<User>,
  // ) {
  //   this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  //     apiVersion: "2025-02-24.acacia",
  //   });
  // }

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not defined in environment variables.");
    }
  
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: "2025-02-24.acacia",
    });
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
    // Basic validation
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