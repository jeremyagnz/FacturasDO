import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { User } from './entities/user.entity';
import { Invoice } from './entities/invoice.entity';
import { ApiKey } from './entities/api-key.entity';
import { ApiUsageLog } from './entities/api-usage-log.entity';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Customer } from './entities/customer.entity';
import { InvoicesModule } from './invoices/invoices.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [Company, User, Invoice, ApiKey, ApiUsageLog, Plan, Subscription, Customer],
      autoLoadEntities: true,
      synchronize: true, // Use false in production
    }),
    InvoicesModule,
    AdminModule,
  ],
})
export class AppModule {}
