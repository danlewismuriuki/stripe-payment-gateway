import { Controller, Post, Get, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  // ======================
  // ACCOUNT ENDPOINTS
  // ======================

  @Post('create-account')
  async createAccount(@Body() body: { email: string }) {
    try {
      return await this.stripeService.createConnectedAccount(body.email);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('onboarding-link')
  async getOnboardingLink(@Body() body: { accountId: string }) {
    try {
      return await this.stripeService.generateOnboardingLink(body.accountId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }


   // ======================
  //  WALLET METHODS
  // ======================


  // Remove the duplicate create-payment-intent endpoint and keep only fund-wallet:

  // Remove the duplicate create-payment-intent endpoint and keep only fund-wallet:

@Post('fund-wallet')
async fundWallet(@Body() body: { 
  amount: number, 
  currency: string, 
  customerId?: string
}) {
  try {
    // Validate input
    if (!body.amount || body.amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (!body.currency) {
      throw new Error('Currency is required');
    }

    // Create payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      body.amount,
      body.currency,
      body.customerId
    );

    // Return only the client secret for Stripe.js
    return {
      clientSecret: paymentIntent.clientSecret, // Now matches the service
      amount: body.amount,
      currency: body.currency
    };
    
  } catch (error) {
    throw new HttpException(
      error.message, 
      HttpStatus.BAD_REQUEST
    );
  }
}

@Post('payment-confirmation')
async handlePaymentConfirmation(@Body() body: {
  paymentIntentId: string,
  userId: string,
  amount: number,
  currency: string
}) {
  try {
    // Verify payment was successful using the service method
    const paymentIntent = await this.stripeService.retrievePaymentIntent(
      body.paymentIntentId
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new Error('Payment not completed');
    }

    // Update wallet balance after successful payment
    return await this.stripeService.updateWalletBalance(
      body.userId,
      body.amount,
      body.currency,
      'deposit'
    );
  } catch (error) {
    throw new HttpException(
      error.message,
      HttpStatus.BAD_REQUEST
    );
  }
}

  // ======================
  // PAYMENT METHODS
  // ======================

  @Get('customers/:customerId/payment-methods')
  async getPaymentMethods(@Param('customerId') customerId: string) {
    try {
      return { methods: await this.stripeService.getPaymentMethods(customerId) };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('payment-methods/attach')
  async attachPaymentMethod(@Body() body: { paymentMethodId: string; customerId: string }) {
    try {
      return await this.stripeService.attachPaymentMethod(body.paymentMethodId, body.customerId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // PAYOUTS
  // ======================

  @Get('accounts/:accountId/payout-methods')
  async getPayoutMethods(@Param('accountId') accountId: string) {
    try {
      return { methods: await this.stripeService.getPayoutMethods(accountId) };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('payouts')
  async createPayout(@Body() body: {
    amount: number;
    currency: string;
    accountId: string;
    payoutMethodId: string;
  }) {
    try {
      return await this.stripeService.createPayout(
        body.amount,
        body.currency,
        body.accountId,
        body.payoutMethodId
      );
    } catch (error) {
      throw new HttpException(error.message, error.status || HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // WALLET OPERATIONS
  // ======================

  @Post('wallet/balance')
  async updateBalance(@Body() body: {
    userId: string;
    amount: number;
    currency: string;
    type: 'deposit' | 'withdrawal';
  }) {
    try {
      return await this.stripeService.updateWalletBalance(
        body.userId,
        body.amount,
        body.currency,
        body.type
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // WEBHOOK (keep your existing implementation)
  // ======================
  
  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    // Your existing webhook handler
  }
}