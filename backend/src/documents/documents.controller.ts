import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) { }

  @Get()
  list() {
    return this.documents.listPublic();
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.documents.getPublic(id);
  }
}
