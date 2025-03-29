import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [StripeService],
  controllers: [StripeController],
})
export class StripeModule {}
