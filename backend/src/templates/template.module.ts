import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Template } from './template.entity';
import { TemplateController, GeneratedFileController } from './template.controller';
import { TemplateService } from './template.service';
import { DocumentsModule } from '../documents/documents.module';

@Module({ imports: [TypeOrmModule.forFeature([Template]), DocumentsModule], controllers: [TemplateController, GeneratedFileController], providers: [TemplateService] })
export class TemplateModule { }
