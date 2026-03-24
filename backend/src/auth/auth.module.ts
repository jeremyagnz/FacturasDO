import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from '../entities/api-key.entity';
import { ApiKeyGuard } from './api-key.guard';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
