export class TemplateQueryDto {
  type?: 'document' | 'presentation';
  category?: string;
  search?: string;
  page = 1;
  limit = 12;
}

export class CreateDocumentDto {
  values?: Record<string, string>;
}

export class CreateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
}

export class UpdateTemplateDto {
  name?: string;
  description?: string;
  category?: string;
}
