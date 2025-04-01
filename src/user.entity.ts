// import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

// @Entity()
// export class User {
//   @PrimaryGeneratedColumn("uuid")
//   id: string;

//   @Column({ unique: true })
//   email: string;

//   // Financial Data (unchanged)
//   @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
//   walletBalance: number;

//   // Stripe Integration (unchanged)
//   @Column({ nullable: true })
//   customerId?: string;

//   @Column({ nullable: true })
//   connectedAccountId: string;

//   // ===== NEW FIELDS =====
//   @Column({ type: 'varchar', default: 'USD', length: 3 })
//   currency: string; // Stores user's preferred currency (USD, EUR, etc.)

//   @Column({ type: 'boolean', default: false })
//   isOnboardComplete: boolean; // Tracks if Stripe onboarding finished

//   @Column({ type: 'timestamp', nullable: true })
//   lastPayoutDate: Date; // Useful for limiting payout frequency
// }


import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  connectedAccountId: string;

  @Column({ type: 'varchar', default: 'USD', length: 3 })
  currency: string;

  @Column({ type: 'boolean', default: false })
  isOnboardComplete: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastPayoutDate: Date;

  // Add this new field
  @Column({ 
    type: 'enum', 
    enum: ['not_started', 'in_progress', 'complete'],
    default: 'not_started'
  })
  onboardingStatus: string;
}