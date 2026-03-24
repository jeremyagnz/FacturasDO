import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApiUsageLog } from './entities/api-usage-log.entity';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Register interceptor globally
  const logRepository = app.get(getRepositoryToken(ApiUsageLog));
  app.useGlobalInterceptors(new LoggingInterceptor(logRepository));
  
  await app.listen(3000);
}
bootstrap();
