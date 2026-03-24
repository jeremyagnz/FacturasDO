import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Subscription } from '../entities/subscription.entity';
import { Plan } from '../entities/plan.entity';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Company) private companyRepository: Repository<Company>,
    @InjectRepository(Subscription) private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Plan) private planRepository: Repository<Plan>,
    @InjectRepository(Customer) private customerRepository: Repository<Customer>,
  ) {}

  async getCompanies() { return await this.companyRepository.find(); }
  async getSubscriptions() { return await this.subscriptionRepository.find({ relations: ['company', 'plan'] }); }
  async getPlans() { return await this.planRepository.find(); }
  async createPlan(planData: any) { return await this.planRepository.save(planData); }
  async getCustomers() { return await this.customerRepository.find(); }
}
