import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string; // Auto-generated unique ID

  @Column({ unique: true })
  email: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  walletBalance: number;

  @Column({ nullable: true })
  customerId?: string;

  @Column({ nullable: true })
  connectedAccountId: string;
}