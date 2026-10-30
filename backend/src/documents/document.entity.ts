import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Template } from '../templates/template.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'documents' })
export class Document {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ name: 'template_id', type: 'integer' })
  templateId: number;

  @Column({ name: 'user_id', type: 'integer' })
  userId: number;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: User;

  @ManyToOne(() => Template, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id', referencedColumnName: 'id' })
  template: Template;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'file_type', type: 'varchar', length: 8 })
  fileType: 'docx' | 'pptx';

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'form_data', type: 'jsonb', nullable: true })
  formData: Record<string, string> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
