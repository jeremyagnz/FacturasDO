import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoicesRepository: Repository<Invoice>,
  ) {}

  async create(company_id: string, invoiceData: any): Promise<Invoice> {
    const invoice = this.invoicesRepository.create({ ...invoiceData, company_id, status: 'PENDING' });
    return await this.invoicesRepository.save(invoice);
  }

  async findAll(company_id: string): Promise<Invoice[]> {
    return await this.invoicesRepository.find({ where: { company_id } });
  }

  async findOne(id: string, company_id: string): Promise<Invoice> {
    const invoice = await this.invoicesRepository.findOne({ where: { id, company_id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async cancel(id: string, company_id: string): Promise<Invoice> {
    const invoice = await this.findOne(id, company_id);
    invoice.status = 'CANCELLED';
    return await this.invoicesRepository.save(invoice);
  }
}
