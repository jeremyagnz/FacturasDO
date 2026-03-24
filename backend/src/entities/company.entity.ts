import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Invoice } from './invoice.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  rnc: string;

  @Column({ nullable: true })
  plan_id: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => User, (user) => user.company)
  users: User[];

  @OneToMany(() => Invoice, (invoice) => invoice.company)
  invoices: Invoice[];
}
