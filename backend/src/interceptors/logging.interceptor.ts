import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiUsageLog } from '../entities/api-usage-log.entity';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(ApiUsageLog)
    private logRepository: Repository<ApiUsageLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, company_id } = request;

    return next.handle().pipe(
      tap(() => {
        if (company_id) {
          this.logRepository.save({
            company_id,
            endpoint: url,
            method,
          });
        }
      }),
    );
  }
}
