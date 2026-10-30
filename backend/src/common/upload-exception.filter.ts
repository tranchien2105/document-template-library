import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class UploadExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UploadExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const error = exception as { code?: string; name?: string };

    if (exception instanceof HttpException) {
      return response.status(exception.getStatus()).json(exception.getResponse());
    }

    if (error?.name === 'MulterError') {
      const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
      this.logger.warn(`Từ chối tệp tải lên (${error.code ?? 'multer error'}).`);
      return response.status(isTooLarge ? 413 : 400).json({
        statusCode: isTooLarge ? 413 : 400,
        message: isTooLarge
          ? 'Tệp tải lên vượt quá giới hạn cho phép.'
          : 'Yêu cầu tải tệp không hợp lệ.',
        error: isTooLarge ? 'Payload Too Large' : 'Bad Request',
      });
    }

    const diagnostic = error?.name && /^[A-Za-z0-9_]{1,80}$/.test(error.name)
      ? error.name
      : 'UnknownError';
    this.logger.error(`Lỗi không xác định trong yêu cầu tải tệp (${diagnostic}).`);
    return response.status(500).json({
      statusCode: 500,
      message: 'Không thể xử lý tệp tải lên.',
      error: 'Internal Server Error',
    });
  }
}
