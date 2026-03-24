import { Controller, Get, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('companies')
  async getCompanies() { return await this.adminService.getCompanies(); }

  @Get('subscriptions')
  async getSubscriptions() { return await this.adminService.getSubscriptions(); }

  @Get('plans')
  async getPlans() { return await this.adminService.getPlans(); }

  @Post('plans')
  async createPlan(@Body() planData: any) { return await this.adminService.createPlan(planData); }

  @Get('customers')
  async getCustomers() { return await this.adminService.getCustomers(); }
}
