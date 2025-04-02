// import { Controller, Post, Get, Body, Req, Param, HttpException, HttpStatus } from '@nestjs/common';
// import { StripeService } from './stripe.service';

// @Controller('stripe')
// export class StripeController {
//   constructor(private readonly stripeService: StripeService) {}

//   // ======================
//   // ACCOUNT ENDPOINTS
//   // ======================

//   @Post('create-account')
//   async createAccount(@Body() body: { email: string }) {
//     try {
//       return await this.stripeService.createConnectedAccount(body.email);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   @Post('onboarding-link')
//   async getOnboardingLink(@Body() body: { accountId: string, email: string }) {
//     try {
//       return await this.stripeService.generateOnboardingLink(body.accountId, body.email);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   @Get('onboarding-status/:email')
//   async checkOnboardingStatus(@Param('email') email: string) {
//     try {
//       return await this.stripeService.checkOnboardingCompletion(email);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   // ======================
//   // WALLET METHODS
//   // ======================

//   @Post('fund-wallet')
//   async fundWallet(@Body() body: { email: string, amount: number, currency?: string }) {
//     console.log('[DEBUG] Received email:', body.email);
//     try {
//       return await this.stripeService.createFundingIntent(
//         body.email,
//         body.amount,
//         body.currency
//       );
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   // ======================
//   // PAYMENT METHODS
//   // ======================

//   @Get('customers/:email/payment-methods')
//   async getPaymentMethods(@Param('email') email: string) {
//     try {
//       const methods = await this.stripeService.getCustomerPaymentMethods(email);
//       return { methods };
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   @Post('payment-methods/attach')
//   async attachPaymentMethod(@Body() body: { email: string, paymentMethodId: string }) {
//     try {
//       return await this.stripeService.attachPaymentMethod(body.email, body.paymentMethodId);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   // ======================
//   // PAYOUTS & EXTERNAL ACCOUNTS
//   // ======================

//   @Get('accounts/:email/payout-methods')
//   async getPayoutMethods(@Param('email') email: string) {
//     try {
//       const result = await this.stripeService.getPayoutMethods(email);
//       return {
//         methodType: result.methodType,
//         methods: result.methods,
//         defaultMethod: result.defaultMethod,
//         capabilities: result.capabilities
//       };
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   @Post('accounts/payout-methods')
//   async addPayoutMethod(@Body() body: { email: string, token: string }) {
//     try {
//       return await this.stripeService.addPayoutMethod(body.email, body.token);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   @Post('accounts/set-default-payout')
//   async setDefaultPayout(@Body() body: { email: string, methodId: string }) {
//     try {
//       return await this.stripeService.setDefaultPayoutMethod(
//         body.email,
//         body.methodId
//       );
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   @Post('payouts')
//   async createPayout(@Body() body: { email: string, amount: number }) {
//     try {
//       return await this.stripeService.createPayout(body.email, body.amount);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   // ======================
//   // ACCOUNT STATUS & BALANCE
//   // ======================

//   @Get('accounts/:email/status')
//   async getAccountStatus(@Param('email') email: string) {
//     try {
//       return await this.stripeService.getAccountDetails(email);
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }

//   // ======================
//   // WEBHOOK HANDLER
//   // ======================

//   @Post('webhook')
//   async handleWebhook(
//     @Body() body: any,
//     @Req() request: Request
//   ) {
//     try {
//       // Get the Stripe signature from headers
//       const signature = request.headers['stripe-signature'];
//       if (!signature) {
//         throw new HttpException('Missing stripe-signature header', HttpStatus.BAD_REQUEST);
//       }

//       // Use raw body if available (needs middleware setup - see below)
//       const rawBody = (request as any).rawBody || JSON.stringify(body);
      
//       const event = this.stripeService.constructEvent(
//         rawBody, 
//         signature as string
//       );

//       switch (event.type) {
//         case 'payment_intent.succeeded':
//           await this.stripeService.handleSuccessfulPayment(event.data.object.id);
//           break;
//         case 'account.updated':
//           await this.stripeService.handleAccountUpdate(event.data.object.id);
//           break;
//       }

//       return { received: true };
//     } catch (error) {
//       throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
//     }
//   }
// }




// import { Controller, Post, Get, Body, Req, Param, HttpException, HttpStatus } from '@nestjs/common';
// import { StripeService } from './stripe.service';
// import { Request } from 'express';
// import { IsEmail, IsNumber, IsString, IsOptional } from 'class-validator';

// // DTO Classes for better validation
// class CreateAccountDto {
//   @IsEmail()
//   email: string;
// }

// class OnboardingLinkDto {
//   @IsString()
//   accountId: string;
  
//   @IsEmail()
//   email: string;
// }

// class PaymentMethodDto {
//   @IsString()
//   token: string;
  
//   @IsString()
//   paymentMethodId: string;
// }

// class FundWalletDto {
//   @IsString()
//   token: string;
  
//   @IsNumber()
//   amount: number;
  
//   @IsString()
//   paymentMethodId: string;
  
//   @IsString()
//   @IsOptional()
//   currency?: string;
// }

// class CreatePayoutDto {
//   @IsString()
//   token: string;
  
//   @IsNumber()
//   amount: number;
  
//   @IsString()
//   methodId: string;
// }

// @Controller('stripe')
// export class StripeController {
//   constructor(private readonly stripeService: StripeService) {}

//   // ======================
//   // ACCOUNT ENDPOINTS
//   // ======================

//   @Post('create-account')
//   async createAccount(@Body() body: CreateAccountDto) {
//     try {
//       return await this.stripeService.createConnectedAccount(body.email);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Post('onboarding-link')
//   async getOnboardingLink(@Body() body: OnboardingLinkDto) {
//     try {
//       return await this.stripeService.generateOnboardingLink(body.accountId, body.email);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Get('onboarding-status/:token')
//   async checkOnboardingStatus(@Param('token') token: string) {
//     try {
//       return await this.stripeService.checkOnboardingCompletion(token);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   // ======================
//   // WALLET METHODS
//   // ======================

//   @Post('fund-wallet')
//   async fundWallet(@Body() body: FundWalletDto) {
//     try {
//       return await this.stripeService.createPaymentIntentWithSavedMethod(
//         body.token,
//         body.amount,
//         body.paymentMethodId,
//         body.currency
//       );
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Get('wallet-balance/:token')
//   async getWalletBalance(@Param('token') token: string) {
//     try {
//       const user = await this.stripeService.verifyAuthToken(token);
//       return { balance: user.walletBalance, currency: user.currency };
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   // ======================
//   // PAYMENT METHODS
//   // ======================

//   @Post('setup-intent')
//   async createSetupIntent(@Body() body: { token: string }) {
//     try {
//       return await this.stripeService.createSetupIntent(body.token);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Post('attach-payment-method')
//   async attachPaymentMethod(@Body() body: PaymentMethodDto) {
//     try {
//       return await this.stripeService.attachPaymentMethod(body.token, body.paymentMethodId);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Get('payment-methods/:token')
//   async getPaymentMethods(@Param('token') token: string) {
//     try {
//       return await this.stripeService.getPaymentMethods(token);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Post('set-default-payment')
//   async setDefaultPaymentMethod(@Body() body: PaymentMethodDto) {
//     try {
//       return await this.stripeService.setDefaultPaymentMethod(body.token, body.paymentMethodId);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Post('remove-payment-method')
//   async removePaymentMethod(@Body() body: PaymentMethodDto) {
//     try {
//       return await this.stripeService.removePaymentMethod(body.token, body.paymentMethodId);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   // ======================
//   // PAYOUTS & EXTERNAL ACCOUNTS
//   // ======================

//   @Get('payout-methods/:token')
//   async getPayoutMethods(@Param('token') token: string) {
//     try {
//       return await this.stripeService.getPayoutMethods(token);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   @Post('create-payout')
//   async createPayout(@Body() body: CreatePayoutDto) {
//     try {
//       return await this.stripeService.createPayout(body.token, body.amount, body.methodId);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   // ======================
//   // ACCOUNT STATUS & BALANCE
//   // ======================

//   @Get('account-details/:token')
//   async getAccountDetails(@Param('token') token: string) {
//     try {
//       return await this.stripeService.getAccountDetails(token);
//     } catch (error) {
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }

//   // ======================
//   // WEBHOOK HANDLER
//   // ======================

//   @Post('webhook')
//   async handleWebhook(@Body() body: any, @Req() request: Request) {
//     try {
//       const signature = request.headers['stripe-signature'];
//       if (!signature) {
//         throw new HttpException('Missing stripe-signature header', HttpStatus.BAD_REQUEST);
//       }

//       const rawBody = (request as any).rawBody || JSON.stringify(body);
      
//       const event = this.stripeService.constructEvent(
//         Buffer.from(rawBody), 
//         signature as string
//       );

//       switch (event.type) {
//         case 'payment_intent.succeeded':
//           await this.stripeService.handleSuccessfulPayment(event.data.object.id);
//           break;
//         case 'account.updated':
//           await this.stripeService.handleAccountUpdate(event.data.object.id);
//           break;
//         default:
//           console.log(`Unhandled event type: ${event.type}`);
//       }

//       return { received: true };
//     } catch (error) {
//       console.error('Webhook error:', error);
//       throw new HttpException(
//         error.message, 
//         error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
//       );
//     }
//   }
// }


import { Controller, Post, Get, Body, Req, Param, HttpException, HttpStatus } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { IsEmail, IsNumber, IsString, IsOptional } from 'class-validator';

// Define the interfaces in the controller file to avoid cross-module type references
interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  isDefault?: boolean;
}

interface PayoutMethod {
  id: string;
  bank_name?: string;
  last4: string;
  currency: string;
  default_for_currency?: boolean;
}

// DTO Classes
class CreateAccountDto {
  @IsEmail()
  email: string;
}

class OnboardingLinkDto {
  @IsString()
  accountId: string;
  
  @IsEmail()
  email: string;
}

class PaymentMethodDto {
  @IsString()
  token: string;
  
  @IsString()
  paymentMethodId: string;
}

class FundWalletDto {
  @IsString()
  token: string;
  
  @IsNumber()
  amount: number;
  
  @IsString()
  paymentMethodId: string;
  
  @IsString()
  @IsOptional()
  currency?: string;
}

class CreatePayoutDto {
  @IsString()
  token: string;
  
  @IsNumber()
  amount: number;
  
  @IsString()
  methodId: string;
}

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // ======================
  // ACCOUNT ENDPOINTS
  // ======================

  @Post('create-account')
  async createAccount(@Body() body: CreateAccountDto) {
    try {
      return await this.stripeService.createConnectedAccount(body.email);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('onboarding-link')
  async getOnboardingLink(@Body() body: OnboardingLinkDto) {
    try {
      return await this.stripeService.generateOnboardingLink(body.accountId, body.email);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('onboarding-status/:token')
  async checkOnboardingStatus(@Param('token') token: string) {
    try {
      return await this.stripeService.checkOnboardingCompletion(token);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  // ======================
  // WALLET METHODS
  // ======================

  @Post('fund-wallet')
  async fundWallet(@Body() body: FundWalletDto) {
    try {
      return await this.stripeService.createPaymentIntentWithSavedMethod(
        body.token,
        body.amount,
        body.paymentMethodId,
        body.currency
      );
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('wallet-balance/:token')
  async getWalletBalance(@Param('token') token: string) {
    try {
      const user = await this.stripeService.verifyAuthToken(token);
      return { balance: user.walletBalance, currency: user.currency };
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  // ======================
  // PAYMENT METHODS
  // ======================

  @Post('setup-intent')
  async createSetupIntent(@Body() body: { token: string }) {
    try {
      return await this.stripeService.createSetupIntent(body.token);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('attach-payment-method')
  async attachPaymentMethod(@Body() body: PaymentMethodDto): Promise<PaymentMethod> {
    try {
      return await this.stripeService.attachPaymentMethod(body.token, body.paymentMethodId);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Get('payment-methods/:token')
  async getPaymentMethods(@Param('token') token: string): Promise<PaymentMethod[]> {
    try {
      return await this.stripeService.getPaymentMethods(token);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('set-default-payment')
  async setDefaultPaymentMethod(@Body() body: PaymentMethodDto) {
    try {
      return await this.stripeService.setDefaultPaymentMethod(body.token, body.paymentMethodId);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('remove-payment-method')
  async removePaymentMethod(@Body() body: PaymentMethodDto) {
    try {
      return await this.stripeService.removePaymentMethod(body.token, body.paymentMethodId);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  // ======================
  // PAYOUTS & EXTERNAL ACCOUNTS
  // ======================

  @Get('payout-methods/:token')
  async getPayoutMethods(@Param('token') token: string): Promise<{
    methods: PayoutMethod[];
    defaultMethod: string | null;
  }> {
    try {
      return await this.stripeService.getPayoutMethods(token);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  @Post('create-payout')
  async createPayout(@Body() body: CreatePayoutDto) {
    try {
      return await this.stripeService.createPayout(body.token, body.amount, body.methodId);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  // ======================
  // ACCOUNT STATUS & BALANCE
  // ======================

  @Get('account-details/:token')
  async getAccountDetails(@Param('token') token: string): Promise<{
    id: string;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    requirements: any;
    payoutMethods: PayoutMethod[];
    defaultPayoutMethod: string | null;
    stripeBalance: number;
    currency: string;
    walletBalance: number;
  }> {
    try {
      return await this.stripeService.getAccountDetails(token);
    } catch (error) {
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }

  // ======================
  // WEBHOOK HANDLER
  // ======================

  @Post('webhook')
  async handleWebhook(@Body() body: any, @Req() request: Request) {
    try {
      const signature = request.headers['stripe-signature'];
      if (!signature) {
        throw new HttpException('Missing stripe-signature header', HttpStatus.BAD_REQUEST);
      }

      const rawBody = (request as any).rawBody || JSON.stringify(body);
      
      const event = this.stripeService.constructEvent(
        Buffer.from(rawBody), 
        signature as string
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.stripeService.handleSuccessfulPayment(event.data.object.id);
          break;
        case 'account.updated':
          await this.stripeService.handleAccountUpdate(event.data.object.id);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw new HttpException(
        error.message, 
        error instanceof HttpException ? error.getStatus() : HttpStatus.BAD_REQUEST
      );
    }
  }
}