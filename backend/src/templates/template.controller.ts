import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseFilters, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { TemplateService } from './template.service';
import { CreateDocumentDto, CreateTemplateDto, TemplateQueryDto, UpdateTemplateDto } from './template.dto';
import { UploadExceptionFilter } from '../common/upload-exception.filter';

const defaultUploadLimit = 10 * 1024 * 1024;
const configuredUploadLimit = Number(process.env.TEMPLATE_UPLOAD_MAX_BYTES);
const uploadLimit = Number.isSafeInteger(configuredUploadLimit) && configuredUploadLimit >= 1024 * 1024 && configuredUploadLimit <= 50 * 1024 * 1024
  ? configuredUploadLimit
  : defaultUploadLimit;
const uploadLimits = {
  fileSize: uploadLimit,
  files: 1,
  fields: 10,
  fieldSize: 64 * 1024,
  fieldNameSize: 100,
  parts: 11,
};

function assertRequestKeys(value: unknown, allowed: string[]) {
  if (value === undefined || value === null) return;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Nội dung yêu cầu không hợp lệ.');
  }
  if (Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new BadRequestException('Nội dung yêu cầu chứa trường không được hỗ trợ.');
  }
}

@Controller('api/templates')
export class TemplateController {
  constructor(private readonly service: TemplateService) { }
  @Get() list(@Query() query: TemplateQueryDto) { return this.service.list(query); }
  @Get('categories') categories() { return this.service.categories(); }
  @Post()
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', { limits: uploadLimits }))
  upload(
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
    @Body() body: CreateTemplateDto,
  ) {
    return this.service.uploadDocumentTemplate(file, body);
  }
  @Post('presentations')
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', { limits: uploadLimits }))
  uploadPresentation(
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
    @Body() body: CreateTemplateDto,
  ) {
    return this.service.uploadPresentationTemplate(file, body);
  }
  @Patch(':id') update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateTemplateDto) {
    return this.service.updateMetadata(id, body);
  }
  @Post(':id/thumbnail')
  @UseFilters(UploadExceptionFilter)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  updateThumbnail(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: { originalname: string; mimetype: string; buffer: Buffer } | undefined,
  ) {
    return this.service.updateThumbnail(id, file);
  }
  @Delete(':id') deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(id);
  }
  @Get(':id/thumbnail') async thumbnail(@Param('id', ParseIntPipe) id: number, @Res() response: Response) {
    const thumbnail = await this.service.thumbnail(id);
    response.setHeader('Content-Type', thumbnail.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.send(thumbnail.data);
  }
  @Get(':id/preview') preview(@Param('id', ParseIntPipe) id: number) { return this.service.preview(id); }
  @Get(':id') get(@Param('id', ParseIntPipe) id: number) { return this.service.get(id); }
  @Post(':id/documents') createDocument(@Param('id', ParseIntPipe) id: number, @Body() body: CreateDocumentDto) {
    assertRequestKeys(body, ['values']);
    return this.service.createDocument(id, body?.values ?? {});
  }
  @Post(':id/copies') copyPresentation(@Param('id', ParseIntPipe) id: number, @Body() body?: CreateDocumentDto) {
    assertRequestKeys(body, ['values']);
    return this.service.copyPresentation(id, body?.values ?? {});
  }
}

@Controller('api/files')
export class GeneratedFileController {
  constructor(private readonly service: TemplateService) { }
  @Get(':id') async download(@Param('id') id: string, @Res() response: Response) {
    const file = await this.service.file(id);
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.download(file.filePath, file.fileName, (error) => {
      if (!error) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const isMissing = (error as NodeJS.ErrnoException).code === 'ENOENT';
      const status = isMissing ? 404 : 500;
      response.status(status).json({
        statusCode: status,
        message: isMissing ? 'Không tìm thấy tệp đã tạo.' : 'Không thể gửi tệp đã tạo.',
      });
    });
  }
}
