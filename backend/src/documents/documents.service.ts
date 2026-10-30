import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './document.entity';
import { User } from '../users/user.entity';

const DEMO_USER_EMAIL = 'demo@papertrail.local';

export type CreateDocumentRecord = Pick<
  Document,
  | 'id'
  | 'templateId'
  | 'name'
  | 'fileType'
  | 'fileName'
  | 'filePath'
  | 'formData'
>;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repository: Repository<Document>,
    @InjectRepository(User)
    @Optional()
    private readonly users?: Repository<User>,
  ) { }

  async create(record: CreateDocumentRecord): Promise<Document> {
    const user = await this.getDemoUser();
    const document = this.repository.create({
      ...record,
      userId: user.id,
    } as Partial<Document>);
    return this.repository.save(document);
  }

  async listPublic() {
    const user = await this.getDemoUser();
    const documents = await this.repository.find({
      where: { userId: user.id },
      relations: { template: true },
      order: { createdAt: 'DESC' },
    });

    return documents.map((document) => this.toPublic(document));
  }

  async getPublic(id: string) {
    const user = this.users ? await this.getDemoUser() : undefined;
    const document = await this.repository.findOne({
      where: user ? { id, userId: user.id } : { id },
      relations: { template: true },
    });
    if (!document) {
      throw new NotFoundException('Không tìm thấy tài liệu đã tạo.');
    }

    return this.toPublic(document);
  }

  async getForDownload(id: string) {
    const user = this.users ? await this.getDemoUser() : undefined;
    const document = await this.repository.findOne({
      where: user ? { id, userId: user.id } : { id },
    });
    if (!document) {
      throw new NotFoundException('Không tìm thấy tệp đã tạo.');
    }

    return {
      fileType: document.fileType,
      fileName: document.fileName,
      filePath: document.filePath,
    };
  }

  private async getDemoUser(): Promise<User> {
    if (!this.users) {
      throw new Error('Kho người dùng chưa được cấu hình.');
    }
    let user = await this.users.findOne({ where: { email: DEMO_USER_EMAIL } });
    if (!user) {
      await this.users.upsert(
        { name: 'Demo User', email: DEMO_USER_EMAIL },
        ['email'],
      );
      user = await this.users.findOne({ where: { email: DEMO_USER_EMAIL } });
    }
    if (!user) throw new Error('Không thể khởi tạo người dùng demo.');
    return user;
  }

  private toPublic(document: Document) {
    return {
      id: document.id,
      templateId: document.templateId,
      templateName: document.template?.name,
      templateType: document.template?.type,
      name: document.name,
      fileType: document.fileType,
      fileName: document.fileName,
      downloadUrl: `/api/files/${document.id}`,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
