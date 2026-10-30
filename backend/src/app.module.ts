import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import { TemplateModule } from './templates/template.module';
import { Template } from './templates/template.entity';
import { Document } from './documents/document.entity';
import { CreateTemplates1760000000000 } from './migrations/1760000000000-CreateTemplates';
import { CreateDocuments1760000001000 } from './migrations/1760000001000-CreateDocuments';
import { User } from './users/user.entity';
import { CreateUsersAndAssignDocuments1760000002000 } from './migrations/1760000002000-CreateUsersAndAssignDocuments';

@Module({
  imports: [TypeOrmModule.forRoot({
    type: 'postgres', host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres', password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'document_templates', entities: [Template, Document, User],
    migrations: [CreateTemplates1760000000000, CreateDocuments1760000001000, CreateUsersAndAssignDocuments1760000002000], migrationsRun: true, synchronize: false,
  }), TemplateModule],
  controllers: [HealthController],
})
export class AppModule { }
