import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  company_id: string;

  @ManyToOne(() => Company, (company) => company.invoices)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @Column({ nullable: true })
  customer_id: string;

  @Column({ unique: true })
  ecf: string;

  @Column('decimal', { precision: 12, scale: 2 })
  total: number;

  @Column()
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
