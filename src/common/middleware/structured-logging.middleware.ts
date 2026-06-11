import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class StructuredLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    res.on('finish', () => {
      const payload = {
        type: 'http_request',
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Date.now() - startTime,
        ip: req.ip,
        userAgent: req.get('user-agent') ?? '',
      };

      if (res.statusCode >= 500) {
        this.logger.error(JSON.stringify(payload));
        return;
      }

      if (res.statusCode >= 400) {
        this.logger.warn(JSON.stringify(payload));
        return;
      }

      this.logger.log(JSON.stringify(payload));
    });

    next();
  }
}
