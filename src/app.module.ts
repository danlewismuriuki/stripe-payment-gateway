import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StripeModule } from './stripe/stripe.module';
import { config } from 'dotenv';
import { User } from './user.entity';

// Load .env file
config();
console.log('DATABASE_URL:', process.env.DATABASE_URL);

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User],
      synchronize: true,
      logging: true,  // Enable logging to debug queries
      ssl: {
        rejectUnauthorized: false,  // Required for Neon.tech
      },
    }),
    StripeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
