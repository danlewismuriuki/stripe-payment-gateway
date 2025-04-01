import { Controller, Post, Get, Body, Req, Param, HttpException, HttpStatus } from '@nestjs/common';
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
  async getOnboardingLink(@Body() body: { accountId: string, email: string }) {
    try {
      return await this.stripeService.generateOnboardingLink(body.accountId, body.email);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('onboarding-status/:email')
  async checkOnboardingStatus(@Param('email') email: string) {
    try {
      return await this.stripeService.checkOnboardingCompletion(email);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // WALLET METHODS
  // ======================

  @Post('fund-wallet')
  async fundWallet(@Body() body: { email: string, amount: number, currency?: string }) {
    console.log('[DEBUG] Received email:', email);
    try {
      return await this.stripeService.createFundingIntent(
        body.email,
        body.amount,
        body.currency
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // PAYMENT METHODS
  // ======================

  @Get('customers/:email/payment-methods')
  async getPaymentMethods(@Param('email') email: string) {
    try {
      const methods = await this.stripeService.getCustomerPaymentMethods(email);
      return { methods };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('payment-methods/attach')
  async attachPaymentMethod(@Body() body: { email: string, paymentMethodId: string }) {
    try {
      return await this.stripeService.attachPaymentMethod(body.email, body.paymentMethodId);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // PAYOUTS & EXTERNAL ACCOUNTS
  // ======================

  @Get('accounts/:email/payout-methods')
  async getPayoutMethods(@Param('email') email: string) {
    try {
      const result = await this.stripeService.getPayoutMethods(email);
      return {
        methodType: result.methodType,
        methods: result.methods,
        defaultMethod: result.defaultMethod,
        capabilities: result.capabilities
      };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('accounts/payout-methods')
  async addPayoutMethod(@Body() body: { email: string, token: string }) {
    try {
      return await this.stripeService.addPayoutMethod(body.email, body.token);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('accounts/set-default-payout')
  async setDefaultPayout(@Body() body: { email: string, methodId: string }) {
    try {
      return await this.stripeService.setDefaultPayoutMethod(
        body.email,
        body.methodId
      );
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('payouts')
  async createPayout(@Body() body: { email: string, amount: number }) {
    try {
      return await this.stripeService.createPayout(body.email, body.amount);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // ACCOUNT STATUS & BALANCE
  // ======================

  @Get('accounts/:email/status')
  async getAccountStatus(@Param('email') email: string) {
    try {
      return await this.stripeService.getAccountDetails(email);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // ======================
  // WEBHOOK HANDLER
  // ======================

  @Post('webhook')
  async handleWebhook(
    @Body() body: any,
    @Req() request: Request
  ) {
    try {
      // Get the Stripe signature from headers
      const signature = request.headers['stripe-signature'];
      if (!signature) {
        throw new HttpException('Missing stripe-signature header', HttpStatus.BAD_REQUEST);
      }

      // Use raw body if available (needs middleware setup - see below)
      const rawBody = (request as any).rawBody || JSON.stringify(body);
      
      const event = this.stripeService.constructEvent(
        rawBody, 
        signature as string
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.stripeService.handleSuccessfulPayment(event.data.object.id);
          break;
        case 'account.updated':
          await this.stripeService.handleAccountUpdate(event.data.object.id);
          break;
      }

      return { received: true };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}