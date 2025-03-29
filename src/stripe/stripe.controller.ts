import { Controller, Get, Post, Param, Body, Req, Res, Headers, HttpException, HttpStatus } from "@nestjs/common";
import { StripeService } from "./stripe.service";
import { Request, Response } from "express";

@Controller("stripe")
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /** ✅ Create a Stripe Connected Account for a user */
  // @Post("create-account")
  // async createConnectedAccount(@Body() body) {
  //   const { email } = body;
  //   return this.stripeService.createConnectedAccount(email);
  // }

  @Post("create-account")
  async createConnectedAccount(@Body() body) {
    const { email } = body;
    const { accountId } = await this.stripeService.createConnectedAccount(email);
    return { accountId };
  }

  @Get("connected-payment-methods/:connectedAccountId")
  async getConnectedPaymentMethods(@Param("connectedAccountId") connectedAccountId: string) {
    try {
      const paymentMethods = await this.stripeService.getConnectedAccountPaymentMethods(connectedAccountId);
      return { paymentMethods };
    } catch (error) {
      return { error: error.message };
    }
  }

  /** ✅ Generate an onboarding link */
  // @Post("account-link")
  // async generateAccountLink(@Body() body) {
  //   const { accountId } = body;
  //   return this.stripeService.generateAccountLink(accountId);
  // }

  @Post("account-link")
async generateAccountLink(@Body() body) {
  const { accountId } = body;
  const { url } = await this.stripeService.generateAccountLink(accountId);
  return { url };
}

    /** ✅ Fetch saved payment methods */
  @Get("saved-payment-methods/:accountId")
  async getSavedPaymentMethods(@Param("accountId") accountId: string) {
    const paymentMethods = await this.stripeService.getSavedPaymentMethodsForAccount(accountId);
    return { paymentMethods };
  }

@Post("fund-wallet")
async fundWallet(@Body() body) {
  const { amount, currency, customerId, paymentMethodId } = body;
  const { clientSecret } = await this.stripeService.fundWallet(amount, currency, customerId, paymentMethodId);
  return { clientSecret };
}


  /** ✅ Create a payment that transfers funds to a connected account */
  @Post("create-payment")
  async createPaymentWithTransfer(@Body() body) {
    const { amount, currency, connectedAccountId } = body;
    return this.stripeService.createPaymentWithTransfer(amount, currency, connectedAccountId);
  }

  /** ✅ Payout funds to a connected account */
  @Post("payout")
  async createPayout(@Body() body) {
    const { amount, currency, connectedAccountId, payoutMethodId } = body;
    // return this.stripeService.createPayout(amount, currency, connectedAccountId);
    return this.stripeService.createPayout(amount, currency, connectedAccountId, payoutMethodId);

  }

  @Post('webhook')
async handleWebhook(
  @Req() req: Request,
  @Res() res: Response,
  @Headers('stripe-signature') sig: string,
) {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    throw new HttpException('Stripe webhook secret is not configured', HttpStatus.INTERNAL_SERVER_ERROR);
  }

  try {
    // Debugging: Log headers and raw body
    console.log('Request headers:', req.headers);
    console.log('Raw body buffer:', req.rawBody);

    // Ensure req.rawBody is defined
    if (!req.rawBody) {
      throw new HttpException('No raw body provided', HttpStatus.BAD_REQUEST);
    }

    // Verify the signature using the raw body (as a Buffer)
    const event = this.stripeService.constructWebhookEvent(
      req.rawBody, // Pass the raw body as a Buffer
      sig,
      endpointSecret,
    );

    console.log("✅ Webhook event received:", event.type);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log("✅ Payment successful! Update investor's balance.");
        break;

      case 'balance.available':
        console.log('💰 Funds available for transactions.');
        break;

      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('🚨 Webhook error:', error.message);
    throw new HttpException(`Webhook Error: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
}
}
