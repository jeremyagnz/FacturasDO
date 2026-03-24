import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { Plan } from '../entities/plan.entity';
import { Subscription } from '../entities/subscription.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([Company, User, Plan, Subscription])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
