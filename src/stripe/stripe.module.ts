// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { User } from '../user.entity';
// import { StripeService } from './stripe.service';
// import { StripeController } from './stripe.controller';
// import { JwtModule } from '@nestjs/jwt';

// @Module({
//   imports: [TypeOrmModule.forFeature([User])],
//   providers: [StripeService],
//   controllers: [StripeController],
// })
// export class StripeModule {}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user.entity';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'yourSecretKey',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [StripeService],
  controllers: [StripeController],
})
export class StripeModule {}
