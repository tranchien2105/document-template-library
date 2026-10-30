import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'templates' })
export class Template {
  @PrimaryColumn({ type: 'integer' }) id: number;
  @Column({ type: 'varchar', unique: true, length: 120 }) slug: string;
  @Column({ type: 'varchar', length: 180 }) name: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'varchar', length: 24 }) type: 'document' | 'presentation';
  @Column({ type: 'varchar', length: 100 }) category: string;
  @Column({ name: 'file_path', type: 'varchar', length: 300 }) filePath: string;
  @Column({ name: 'thumbnail_path', type: 'varchar', length: 300, nullable: true }) thumbnailPath: string | null;
  @Column({ type: 'jsonb', default: {} }) preview: Record<string, unknown>;
  @Column({ name: 'is_active', type: 'boolean', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
