import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('api/invoices')
@UseGuards(ApiKeyGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  async create(@Body() invoiceData: any, @Req() req: any) {
    return await this.invoicesService.create(req.company_id, invoiceData);
  }

  @Get()
  async findAll(@Req() req: any) {
    return await this.invoicesService.findAll(req.company_id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return await this.invoicesService.findOne(id, req.company_id);
  }

  @Post('cancel')
  async cancel(@Body('id') id: string, @Req() req: any) {
    return await this.invoicesService.cancel(id, req.company_id);
  }
}
