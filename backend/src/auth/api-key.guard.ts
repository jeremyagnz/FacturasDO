import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '../entities/api-key.entity';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API Key is missing');
    }

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiKeyEntity = await this.apiKeyRepository.findOne({ where: { key_hash: keyHash } });

    if (!apiKeyEntity) {
      throw new UnauthorizedException('Invalid API Key');
    }

    request.company_id = apiKeyEntity.company_id;
    return true;
  }
}
