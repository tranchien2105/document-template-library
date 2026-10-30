import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { readFile, mkdir, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { Template } from './template.entity';
import { DocumentsService } from '../documents/documents.service';
import {
  generatedRoot,
  assertSafeDirectory,
  safeGeneratedPath,
  safeTemplatePath,
  templateRoot,
  writeNewFile,
} from '../common/storage';
import { loadValidatedOfficePackage } from '../common/office-package';
import type { CreateTemplateDto, UpdateTemplateDto } from './template.dto';

type ManifestTemplate = Pick<
  Template,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'type'
  | 'category'
  | 'filePath'
  | 'thumbnailPath'
  | 'preview'
>;

const mime = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const maxUploadBytes = (() => {
  const configured = Number(process.env.TEMPLATE_UPLOAD_MAX_BYTES);
  return Number.isSafeInteger(configured) && configured >= 1024 * 1024 && configured <= 50 * 1024 * 1024
    ? configured
    : 10 * 1024 * 1024;
})();
const maxTemplateReadBytes = 50 * 1024 * 1024;

type UploadedOfficeFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

function validateUploadFile(
  file: UploadedOfficeFile | undefined,
  type: 'document' | 'presentation',
): asserts file is UploadedOfficeFile {
  const extension = type === 'document' ? '.docx' : '.pptx';
  const expectedMime = mime[type === 'document' ? 'docx' : 'pptx'];
  if (!file || typeof file.originalname !== 'string' || !file.originalname.toLowerCase().endsWith(extension)) {
    throw new UnsupportedMediaTypeException(`Chỉ chấp nhận tệp ${extension.slice(1).toUpperCase()}.`);
  }
  if (file.mimetype !== expectedMime && file.mimetype !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException('Loại nội dung không khớp với định dạng Office được yêu cầu.');
  }
  if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw new BadRequestException('Tệp tải lên không có dữ liệu.');
  }
  if (file.buffer.length > maxUploadBytes) {
    throw new PayloadTooLargeException('Tệp tải lên vượt quá giới hạn cho phép.');
  }
}

function validateMetadataObject(value: unknown, allowedKeys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Thông tin mẫu không hợp lệ.');
  }
  for (const [key, fieldValue] of Object.entries(value)) {
    if (!allowedKeys.includes(key)) {
      throw new BadRequestException('Thông tin mẫu chứa trường không được hỗ trợ.');
    }
    if (typeof fieldValue !== 'string') {
      throw new BadRequestException(`Trường ${key} phải là văn bản.`);
    }
  }
}

function assertValidTemplateId(id: number) {
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new BadRequestException('Mã template không hợp lệ.');
  }
}

async function readTemplatePackage(filePath: string, type: 'document' | 'presentation') {
  const fileStats = await stat(filePath);
  if (!fileStats.isFile() || fileStats.size === 0) {
    throw new NotFoundException('Tệp mẫu không tồn tại hoặc đang trống.');
  }
  if (fileStats.size > maxTemplateReadBytes) {
    throw new BadRequestException('Tệp mẫu vượt quá giới hạn xử lý.');
  }
  return loadValidatedOfficePackage(await readFile(filePath), type);
}

@Injectable()
export class TemplateService implements OnModuleInit {
  constructor(
    @InjectRepository(Template)
    private readonly repo: Repository<Template>,
    private readonly documents: DocumentsService,
  ) { }

  async onModuleInit() {
    await this.syncManifest();
  }

  async syncManifest() {
    const manifestPath = path.join(templateRoot, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
      templates?: ManifestTemplate[];
    };
    if (!Array.isArray(manifest.templates)) {
      throw new Error('Manifest không có danh sách templates hợp lệ.');
    }

    const seenIds = new Set<number>();
    const seenSlugs = new Set<string>();

    for (const item of manifest.templates) {
      if (
        !Number.isInteger(item.id) ||
        !item.slug ||
        !/^[a-z0-9-]+$/.test(item.slug) ||
        !item.name ||
        !item.description ||
        !item.category ||
        !['document', 'presentation'].includes(item.type)
      ) {
        throw new Error(`Metadata mẫu không hợp lệ (ID ${item.id}).`);
      }
      if (seenIds.has(item.id) || seenSlugs.has(item.slug)) {
        throw new Error('Manifest chứa ID hoặc slug trùng lặp.');
      }
      seenIds.add(item.id);
      seenSlugs.add(item.slug);

      const resolved = safeTemplatePath(item.filePath);
      if (
        (item.type === 'document' && !resolved.endsWith('.docx')) ||
        (item.type === 'presentation' && !resolved.endsWith('.pptx'))
      ) {
        throw new Error(`Phần mở rộng không khớp với mẫu ${item.slug}.`);
      }
      if (
        !item.preview ||
        typeof item.preview !== 'object' ||
        Array.isArray(item.preview)
      ) {
        throw new Error(`Dữ liệu xem trước không hợp lệ: ${item.slug}.`);
      }
      if (item.thumbnailPath) safeTemplatePath(item.thumbnailPath);
    }

    await this.repo.manager.transaction(async (manager) => {
      for (const item of manifest.templates!) {
        const byId = await manager
          .getRepository(Template)
          .findOne({ where: { id: item.id } });
        const bySlug = await manager
          .getRepository(Template)
          .findOne({ where: { slug: item.slug } });

        if (
          (byId && byId.slug !== item.slug) ||
          (bySlug && bySlug.id !== item.id)
        ) {
          throw new Error(
            `Xung đột ID/slug trong cơ sở dữ liệu: ${item.slug}.`,
          );
        }
        // The manifest seeds bundled templates once. After that, database
        // metadata is authoritative so admin edits and deactivations survive
        // backend restarts.
        await manager.getRepository(Template).save(
          byId
            ? {
              ...item,
              name: byId.name,
              description: byId.description,
              category: byId.category,
              thumbnailPath: byId.thumbnailPath,
              preview: {
                ...item.preview,
                ...byId.preview,
                renderPreview: item.preview.renderPreview,
              },
              isActive: byId.isActive,
            }
            : { ...item, isActive: true },
        );
      }
    });
  }

  async list(query: {
    type?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    if (query.page !== undefined && !/^\d+$/.test(String(query.page))) {
      throw new BadRequestException('Số trang phải là số nguyên dương.');
    }
    if (query.limit !== undefined && !/^\d+$/.test(String(query.limit))) {
      throw new BadRequestException('Giới hạn trang phải là số nguyên dương.');
    }

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);

    if (!Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('Số trang phải là số nguyên dương hợp lệ.');
    }
    if (limit < 1 || limit > 60) {
      throw new BadRequestException('Số mẫu mỗi trang phải từ 1 đến 60.');
    }
    if (
      query.category &&
      (typeof query.category !== 'string' || query.category.length > 100)
    ) {
      throw new BadRequestException('Danh mục không hợp lệ.');
    }
    if (
      query.search &&
      (typeof query.search !== 'string' || query.search.length > 100)
    ) {
      throw new BadRequestException('Từ khóa tìm kiếm quá dài.');
    }

    const qb = this.repo.createQueryBuilder('t').where('t.isActive = true');

    if (query.type) {
      if (!['document', 'presentation'].includes(query.type)) {
        throw new BadRequestException('Loại mẫu không hợp lệ.');
      }
      qb.andWhere('t.type = :type', { type: query.type });
    }
    if (query.category) {
      qb.andWhere('t.category = :category', { category: query.category });
    }
    if (query.search?.trim()) {
      qb.andWhere(
        '(LOWER(t.name) LIKE :q OR LOWER(t.description) LIKE :q OR LOWER(t.slug) LIKE :q OR LOWER(t.preview::text) LIKE :q)',
        {
          q: `%${query.search.trim().slice(0, 100).toLowerCase()}%`,
        },
      );
    }

    qb.orderBy('t.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.publicTemplate(item)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async categories() {
    const rows = await this.repo
      .createQueryBuilder('t')
      .select('DISTINCT t.category', 'category')
      .where('t.isActive = true')
      .orderBy('t.category')
      .getRawMany();
    return rows.map((r) => r.category as string);
  }

  async uploadDocumentTemplate(
    file: UploadedOfficeFile | undefined,
    metadata: CreateTemplateDto,
  ) {
    validateUploadFile(file, 'document');
    validateMetadataObject(metadata, ['name', 'description', 'category']);
    const name = metadata.name?.trim();
    const description = metadata.description?.trim();
    const category = metadata.category?.trim();
    if (typeof name !== 'string' || !name || name.length > 180) {
      throw new BadRequestException('Tên mẫu phải có từ 1 đến 180 ký tự.');
    }
    if (typeof description !== 'string' || !description || description.length > 2000) {
      throw new BadRequestException('Mô tả mẫu phải có từ 1 đến 2.000 ký tự.');
    }
    if (typeof category !== 'string' || !category || category.length > 100) {
      throw new BadRequestException('Danh mục phải có từ 1 đến 100 ký tự.');
    }

    const zip = await loadValidatedOfficePackage(file.buffer, 'document');
    const entryNames = Object.keys(zip.files);
    if (
      entryNames.length > 2000 ||
      entryNames.some((entry) =>
        entry.startsWith('/') ||
        entry.includes('\\') ||
        entry.split('/').includes('..'),
      )
    ) {
      throw new BadRequestException('Cấu trúc tệp DOCX không an toàn.');
    }
    const wordXmlNames = Object.keys(zip.files).filter((entry) =>
      /^word\/(document|header\d*|footer\d*)\.xml$/.test(entry),
    );
    const wordXml = await Promise.all(
      wordXmlNames.map((entry) => zip.file(entry)!.async('string')),
    );
    const keys = extractDocxPlaceholderKeys(wordXml);
    if (!keys.length) {
      throw new BadRequestException(
        'Tệp DOCX cần có ít nhất một trường mẫu dạng {{ten_truong}}.',
      );
    }
    if (keys.some((key) => !/^[a-zA-Z0-9_]{1,80}$/.test(key))) {
      throw new BadRequestException('Tệp chứa placeholder không đúng định dạng.');
    }

    const fields = keys.map((key) => ({
      key,
      label: key.replace(/_/g, ' ').replace(/^./, (letter) => letter.toLocaleUpperCase('vi-VN')),
      required: false,
      maxLength: 500,
      placeholder: `Nhập ${key.replace(/_/g, ' ')}`,
    }));
    const slugBase = slugify(name);
    const fileId = randomUUID();
    const relativePath = `uploads/${slugBase}-${fileId}.docx`;
    const absolutePath = path.join(templateRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    assertSafeDirectory(templateRoot, path.dirname(absolutePath));
    await writeNewFile(absolutePath, file.buffer);

    try {
      const item = await this.repo.manager.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [774196201]);
        const rows = await manager.query(
          'SELECT COALESCE(MAX("id"), 0) + 1 AS "id" FROM "templates"',
        ) as Array<{ id: string | number }>;
        let slug = slugBase;
        let suffix = 2;
        while (await manager.getRepository(Template).findOne({ where: { slug } })) {
          slug = `${slugBase}-${suffix++}`;
        }
        const template = manager.getRepository(Template).create({
          id: Number(rows[0]?.id ?? 1),
          slug,
          name,
          description,
          type: 'document',
          category,
          filePath: relativePath,
          thumbnailPath: null,
          preview: {
            kind: 'document',
            sections: ['Nội dung mẫu'],
            placeholders: keys,
            fields,
          },
          isActive: true,
        });
        return manager.getRepository(Template).save(template);
      });
      return this.publicTemplate(item);
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async uploadPresentationTemplate(
    file: UploadedOfficeFile | undefined,
    metadata: CreateTemplateDto,
  ) {
    validateUploadFile(file, 'presentation');
    validateMetadataObject(metadata, ['name', 'description', 'category']);
    const name = metadata.name?.trim();
    const description = metadata.description?.trim();
    const category = metadata.category?.trim();
    if (typeof name !== 'string' || !name || name.length > 180) {
      throw new BadRequestException('Tên mẫu phải có từ 1 đến 180 ký tự.');
    }
    if (typeof description !== 'string' || !description || description.length > 2000) {
      throw new BadRequestException('Mô tả mẫu phải có từ 1 đến 2.000 ký tự.');
    }
    if (typeof category !== 'string' || !category || category.length > 100) {
      throw new BadRequestException('Danh mục phải có từ 1 đến 100 ký tự.');
    }
    const zip = await loadValidatedOfficePackage(file.buffer, 'presentation');
    const entryNames = Object.keys(zip.files);
    if (
      !zip.file('[Content_Types].xml') ||
      !zip.file('_rels/.rels') ||
      !zip.file('ppt/presentation.xml') ||
      !zip.file('ppt/_rels/presentation.xml.rels') ||
      entryNames.length > 3000 ||
      entryNames.some((entry) =>
        entry.startsWith('/') || entry.includes('\\') || entry.split('/').includes('..'),
      )
    ) {
      throw new BadRequestException('Tệp PPTX thiếu thành phần bắt buộc hoặc có cấu trúc không an toàn.');
    }

    const [presentationXml, presentationRels] = await Promise.all([
      zip.file('ppt/presentation.xml')!.async('string'),
      zip.file('ppt/_rels/presentation.xml.rels')!.async('string'),
    ]);

    const relationshipTargets = new Map<string, { target: string; type: string }>();
    for (const match of presentationRels.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
      const attributes = match[1];
      const id = attributes.match(/\bId="([^"]+)"/)?.[1];
      const target = attributes.match(/\bTarget="([^"]+)"/)?.[1];
      const relationshipType = attributes.match(/\bType="([^"]+)"/)?.[1];
      if (id && target && relationshipType) {
        relationshipTargets.set(id, { target, type: relationshipType });
      }
    }
    const slideIds = [...presentationXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"[^>]*\/?\s*>/g)]
      .map((match) => match[1]);
    if (!slideIds.length || slideIds.length > 300) {
      throw new BadRequestException('Bản trình chiếu phải có từ 1 đến 300 slide.');
    }

    const slides: string[] = [];
    const slideFields: string[][] = [];
    const placeholderKeys = new Set<string>();
    for (const [index, relationshipId] of slideIds.entries()) {
      const relationship = relationshipTargets.get(relationshipId);
      if (!relationship?.type.endsWith('/slide')) {
        throw new BadRequestException('Bản trình chiếu có relationship slide không hợp lệ.');
      }
      const slidePath = path.posix.normalize(path.posix.join('ppt', relationship.target));
      if (!slidePath || !/^ppt\/slides\/slide\d+\.xml$/.test(slidePath) || !zip.file(slidePath)) {
        throw new BadRequestException('Bản trình chiếu có liên kết slide không hợp lệ.');
      }
      const xml = await zip.file(slidePath)!.async('string');
      if (!/<p:sld\b[\s\S]*<\/p:sld>/.test(xml)) {
        throw new BadRequestException(`Nội dung slide ${index + 1} không hợp lệ.`);
      }
      const paragraphs = extractOfficeParagraphTexts(xml, 'a');
      const slideTitle = paragraphs.find((text) => text.trim())?.trim();
      slides.push(slideTitle || `Slide ${index + 1}`);
      const keys = extractPptxPlaceholderKeys([xml]);
      if (keys.some((key) => !/^[a-zA-Z0-9_]{1,80}$/.test(key))) {
        throw new BadRequestException(`Slide ${index + 1} chứa placeholder không hợp lệ.`);
      }
      slideFields.push(keys);
      keys.forEach((key) => placeholderKeys.add(key));
    }

    const slugBase = slugify(name);
    const fileId = randomUUID();
    const relativePath = `uploads/${slugBase}-${fileId}.pptx`;
    const absolutePath = path.join(templateRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    assertSafeDirectory(templateRoot, path.dirname(absolutePath));
    await writeNewFile(absolutePath, file.buffer);

    try {
      const item = await this.repo.manager.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [774196201]);
        const rows = await manager.query(
          'SELECT COALESCE(MAX("id"), 0) + 1 AS "id" FROM "templates"',
        ) as Array<{ id: string | number }>;
        let slug = slugBase;
        let suffix = 2;
        while (await manager.getRepository(Template).findOne({ where: { slug } })) {
          slug = `${slugBase}-${suffix++}`;
        }
        const template = manager.getRepository(Template).create({
          id: Number(rows[0]?.id ?? 1),
          slug,
          name,
          description,
          type: 'presentation',
          category,
          filePath: relativePath,
          thumbnailPath: null,
          preview: {
            kind: 'presentation-outline',
            generatedFrom: 'nội dung slide trong tệp PPTX',
            slides,
            slideCount: slides.length,
            slideFields,
            placeholders: [...placeholderKeys].map((key) => `{{${key}}}`),
            fields: createPlaceholderFields([...placeholderKeys]),
          },
          isActive: true,
        });
        return manager.getRepository(Template).save(template);
      });
      return this.publicTemplate(item);
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  async updateMetadata(id: number, metadata: UpdateTemplateDto) {
    assertValidTemplateId(id);
    validateMetadataObject(metadata, ['name', 'description', 'category']);
    const template = await this.repo.findOne({ where: { id, isActive: true } });
    if (!template) throw new NotFoundException('Không tìm thấy template.');
    if (metadata.name !== undefined) {
      const value = metadata.name.trim();
      if (!value || value.length > 180) throw new BadRequestException('Tên mẫu không hợp lệ.');
      template.name = value;
    }
    if (metadata.description !== undefined) {
      const value = metadata.description.trim();
      if (!value || value.length > 2000) throw new BadRequestException('Mô tả mẫu không hợp lệ.');
      template.description = value;
    }
    if (metadata.category !== undefined) {
      const value = metadata.category.trim();
      if (!value || value.length > 100) throw new BadRequestException('Danh mục không hợp lệ.');
      template.category = value;
    }
    return this.publicTemplate(await this.repo.save(template));
  }

  async deactivate(id: number) {
    assertValidTemplateId(id);
    const template = await this.repo.findOne({ where: { id, isActive: true } });
    if (!template) throw new NotFoundException('Không tìm thấy template.');
    template.isActive = false;
    await this.repo.save(template);
    return { id, isActive: false };
  }

  async get(id: number) {
    assertValidTemplateId(id);
    const item = await this.repo.findOne({ where: { id, isActive: true } });
    if (!item) throw new NotFoundException('Không tìm thấy template.');
    if (item.type === 'presentation') await this.ensurePresentationFields(item);
    return this.publicTemplate(item);
  }

  private async ensurePresentationFields(item: Template, sourceZip?: JSZip) {
    const preview = item.preview as {
      fields?: Array<{ key: string; label: string }>;
      slideFields?: string[][];
      slides?: string[];
      slideCount?: number;
    };
    if (Array.isArray(preview.fields) && Array.isArray(preview.slideFields)) return;

    let zip = sourceZip;
    try {
      zip ??= await readTemplatePackage(safeTemplatePath(item.filePath), 'presentation');
    } catch {
      throw new NotFoundException('Không tìm thấy hoặc không thể đọc tệp PowerPoint của mẫu.');
    }

    const presentation = zip.file('ppt/presentation.xml');
    const relationships = zip.file('ppt/_rels/presentation.xml.rels');
    if (!presentation || !relationships) {
      throw new BadRequestException('Tệp PowerPoint thiếu metadata slide hợp lệ.');
    }
    const [presentationXml, relationshipsXml] = await Promise.all([
      presentation.async('string'),
      relationships.async('string'),
    ]);
    const targets = new Map<string, { target: string; type: string }>();
    for (const match of relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)) {
      const id = match[1].match(/\bId="([^"]+)"/)?.[1];
      const target = match[1].match(/\bTarget="([^"]+)"/)?.[1];
      const relationshipType = match[1].match(/\bType="([^"]+)"/)?.[1];
      if (id && target && relationshipType) {
        targets.set(id, { target, type: relationshipType });
      }
    }
    const relationshipIds = [...presentationXml.matchAll(
      /<p:sldId\b[^>]*\br:id="([^"]+)"[^>]*\/?\s*>/g,
    )].map((match) => match[1]);
    if (!relationshipIds.length || relationshipIds.length > 300) {
      throw new BadRequestException('Bản trình chiếu phải có từ 1 đến 300 slide.');
    }

    const actualSlides: string[] = [];
    const slideFields: string[][] = [];
    const allKeys = new Set<string>();
    for (const [index, relationshipId] of relationshipIds.entries()) {
      const relationship = targets.get(relationshipId);
      if (!relationship?.type.endsWith('/slide')) {
        throw new BadRequestException('Bản trình chiếu có relationship slide không hợp lệ.');
      }
      const slidePath = path.posix.normalize(path.posix.join('ppt', relationship.target));
      const slide = slidePath && /^ppt\/slides\/slide\d+\.xml$/.test(slidePath)
        ? zip.file(slidePath)
        : null;
      if (!slide) throw new BadRequestException('Bản trình chiếu có liên kết slide không hợp lệ.');
      const xml = await slide.async('string');
      const paragraphs = extractOfficeParagraphTexts(xml, 'a');
      actualSlides.push(paragraphs.find((text) => text.trim())?.trim() || `Slide ${index + 1}`);
      const keys = extractPptxPlaceholderKeys([xml]);
      if (keys.some((key) => !/^[a-zA-Z0-9_]{1,80}$/.test(key))) {
        throw new BadRequestException(`Slide ${index + 1} chứa placeholder không hợp lệ.`);
      }
      slideFields.push(keys);
      keys.forEach((key) => allKeys.add(key));
    }

    item.preview = {
      ...item.preview,
      kind: 'presentation-outline',
      generatedFrom: 'nội dung slide trong tệp PPTX',
      slides: preview.slides?.length ? preview.slides : actualSlides,
      slideCount: preview.slideCount ?? actualSlides.length,
      slideFields,
      placeholders: [...allKeys].map((key) => `{{${key}}}`),
      fields: createPlaceholderFields([...allKeys]),
    };
    await this.repo.save(item);
  }

  async preview(id: number) {
    assertValidTemplateId(id);
    const template = await this.repo.findOne({ where: { id, isActive: true } });
    if (!template) throw new NotFoundException('Không tìm thấy template.');
    if (template.type === 'presentation') await this.ensurePresentationFields(template);
    const preview = template.preview as Record<string, unknown>;

    if (template.type === 'document') {
      try {
        const zip = await readTemplatePackage(safeTemplatePath(template.filePath), 'document');
        const document = zip.file('word/document.xml');
        if (document) {
          const renderPreview = extractDocxPreview(await document.async('string'));
          if (renderPreview.blocks.length) return { ...preview, renderPreview };
        }
      } catch {
        // Keep the template metadata available when its file cannot be previewed.
      }
    }

    // Recover the bundled OOXML-derived preview when a database was seeded
    // before render previews were added to the manifest.
    try {
      const manifestPath = path.join(templateRoot, 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
        templates?: ManifestTemplate[];
      };
      const bundled = manifest.templates?.find(
        (item) => item.id === template.id && item.slug === template.slug,
      );
      const bundledPreview = bundled?.preview as Record<string, unknown> | undefined;
      const bundledRenderPreview = bundledPreview?.renderPreview as
        | { kind?: string; slides?: unknown[]; blocks?: unknown[] }
        | undefined;
      const currentRenderPreview = preview.renderPreview as
        | { kind?: string; slides?: unknown[]; blocks?: unknown[] }
        | undefined;
      const hasUsableBundledPreview = template.type === 'presentation'
        ? bundledRenderPreview?.kind === 'pptx-layout'
          && Array.isArray(bundledRenderPreview.slides)
          && bundledRenderPreview.slides.length > 0
        : Array.isArray(bundledRenderPreview?.blocks)
          && bundledRenderPreview.blocks.length > 0;

      // The bundled preview is extracted from the actual Office package. It
      // takes precedence for shipped templates over stale database snapshots.
      if (hasUsableBundledPreview) {
        return { ...preview, renderPreview: bundledRenderPreview };
      }

      if (currentRenderPreview) return preview;
    } catch {
      // Keep the metadata preview available if the optional bundled manifest
      // cannot be read; uploaded templates are not required to appear in it.
    }

    return preview;
  }

  async thumbnail(id: number) {
    assertValidTemplateId(id);
    const item = await this.repo.findOne({ where: { id, isActive: true } });
    if (!item) throw new NotFoundException('Không tìm thấy ảnh xem trước của mẫu.');

    if (item.thumbnailPath) {
      try {
        const filePath = safeTemplatePath(item.thumbnailPath);
        const extension = path.extname(filePath).toLowerCase();
        const mimeType = ({
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.webp': 'image/webp',
        } as Record<string, string>)[extension];
        if (mimeType) {
          const fileStats = await stat(filePath);
          if (fileStats.isFile() && fileStats.size > 0 && fileStats.size <= 5 * 1024 * 1024) {
            return { data: await readFile(filePath), mimeType };
          }
        }
      } catch {
        // Missing or unsupported thumbnails use the metadata-based cover below.
      }
    }

    return {
      data: Buffer.from(this.createThumbnailSvg(item), 'utf8'),
      mimeType: 'image/svg+xml; charset=utf-8',
    };
  }

  async updateThumbnail(id: number, file: UploadedOfficeFile | undefined) {
    assertValidTemplateId(id);
    const template = await this.repo.findOne({ where: { id, isActive: true } });
    if (!template) throw new NotFoundException('Không tìm thấy mẫu cần cập nhật ảnh.');
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new BadRequestException('Chọn ảnh thumbnail cần tải lên.');
    }
    if (file.buffer.length > 5 * 1024 * 1024) {
      throw new PayloadTooLargeException('Ảnh thumbnail không được vượt quá 5 MB.');
    }

    const extension = path.extname(file.originalname).toLowerCase();
    const imageTypes: Record<string, { mimeType: string; valid: (buffer: Buffer) => boolean }> = {
      '.png': {
        mimeType: 'image/png',
        valid: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      },
      '.jpg': {
        mimeType: 'image/jpeg',
        valid: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
      },
      '.jpeg': {
        mimeType: 'image/jpeg',
        valid: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
      },
      '.webp': {
        mimeType: 'image/webp',
        valid: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP',
      },
    };
    const imageType = imageTypes[extension];
    if (!imageType || !imageType.valid(file.buffer) || (file.mimetype !== imageType.mimeType && file.mimetype !== 'application/octet-stream')) {
      throw new UnsupportedMediaTypeException('Chỉ nhận ảnh PNG, JPG hoặc WebP hợp lệ.');
    }

    const relativePath = `thumbnails/${id}-${randomUUID()}${extension}`;
    const absolutePath = path.join(templateRoot, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    assertSafeDirectory(templateRoot, path.dirname(absolutePath));
    await writeNewFile(absolutePath, file.buffer);

    const previousPath = template.thumbnailPath;
    try {
      template.thumbnailPath = relativePath;
      const saved = await this.repo.save(template);
      if (previousPath?.startsWith('thumbnails/')) {
        try {
          await unlink(safeTemplatePath(previousPath));
        } catch {
          // A stale old thumbnail must not undo a successful update.
        }
      }
      return this.publicTemplate(saved);
    } catch (error) {
      await unlink(absolutePath).catch(() => undefined);
      throw error;
    }
  }

  private createThumbnailSvg(item: Template) {
    const escape = (value: string) => value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
    const name = escape(item.name);
    const category = escape(item.category);
    const nameLines: string[] = [];
    let currentLine = '';
    for (const word of item.name.split(/\s+/)) {
      const nextLine = currentLine ? `${currentLine} ${word}` : word;
      if (nextLine.length > 17 && currentLine) {
        nameLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = nextLine;
      }
    }
    if (currentLine) nameLines.push(currentLine);
    const titleLines = nameLines.slice(0, 3).map((line, index) =>
      `<tspan x="42" dy="${index === 0 ? 0 : 29}">${escape(line)}${index === 2 && nameLines.length > 3 ? '…' : ''}</tspan>`,
    ).join('');
    const format = item.type === 'document' ? 'TÀI LIỆU WORD' : 'BẢN TRÌNH CHIẾU';
    const pageShape = item.type === 'document'
      ? '<rect x="292" y="42" width="232" height="276" rx="5" fill="#fff" stroke="#dedede" stroke-width="2"/><rect x="322" y="76" width="42" height="5" rx="2" fill="#f45100"/><rect x="322" y="104" width="168" height="13" rx="3" fill="#171717"/><rect x="322" y="128" width="140" height="6" rx="3" fill="#b7b7b7"/><rect x="322" y="166" width="172" height="5" rx="2" fill="#dedede"/><rect x="322" y="181" width="156" height="5" rx="2" fill="#dedede"/><rect x="322" y="196" width="168" height="5" rx="2" fill="#dedede"/><rect x="322" y="225" width="116" height="5" rx="2" fill="#dedede"/> '
      : '<rect x="256" y="53" width="306" height="220" rx="8" fill="#171717"/><rect x="274" y="71" width="270" height="184" rx="4" fill="#fff"/><rect x="298" y="96" width="48" height="5" rx="2" fill="#f45100"/><rect x="298" y="121" width="190" height="16" rx="3" fill="#171717"/><rect x="298" y="151" width="151" height="6" rx="3" fill="#b7b7b7"/><rect x="298" y="178" width="202" height="5" rx="2" fill="#dedede"/><path d="M390 274v15m-34 4h68" stroke="#555" stroke-width="6" stroke-linecap="round"/>';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="380" viewBox="0 0 800 380" role="img" aria-label="Ảnh minh họa ${name}"><rect width="800" height="380" fill="#f7f7f7"/><rect width="12" height="380" fill="#f45100"/>${pageShape}<text x="42" y="68" fill="#f45100" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="2">PAPERTRAIL</text><text x="42" y="104" fill="#333" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="1">${category.toLocaleUpperCase('vi-VN')}</text><text x="42" y="151" fill="#0a0a0a" font-family="Arial,sans-serif" font-size="22" font-weight="700">${titleLines}</text><text x="42" y="315" fill="#555" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="1">${format}</text></svg>`;
  }

  private publicTemplate(item: Template) {
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      type: item.type,
      category: item.category,
      thumbnailPath: item.thumbnailPath,
      preview: item.preview,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async createDocument(id: number, values: Record<string, unknown>) {
    assertValidTemplateId(id);
    const item = await this.repo.findOne({
      where: { id, type: 'document', isActive: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy mẫu DOCX.');

    const fields = (
      item.preview as {
        fields?: Array<{
          key: string;
          label: string;
          required?: boolean;
          maxLength?: number;
          type?: string;
        }>;
      }
    ).fields;

    if (!Array.isArray(fields)) {
      throw new BadRequestException('Mẫu chưa cấu hình các trường nhập liệu.');
    }
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
      throw new BadRequestException('Dữ liệu biểu mẫu không hợp lệ.');
    }

    const allowed = new Set(fields.map((f) => f.key));
    for (const key of Object.keys(values)) {
      if (!allowed.has(key)) {
        throw new BadRequestException(`Trường không được hỗ trợ: ${key}`);
      }
    }

    const replacements: Record<string, string> = {};
    for (const field of fields) {
      const raw = values[field.key];
      if (raw != null && typeof raw !== 'string') {
        throw new BadRequestException(`${field.label} phải là văn bản.`);
      }
      const value = raw == null ? '' : raw.trim();
      if (field.required && !value) {
        throw new BadRequestException(`Vui lòng nhập ${field.label}.`);
      }
      if (value.length > (field.maxLength ?? 500)) {
        throw new BadRequestException(
          `${field.label} vượt quá độ dài cho phép.`,
        );
      }
      if (containsInvalidXmlCharacters(value)) {
        throw new BadRequestException(
          `${field.label} chứa ký tự không được hỗ trợ trong tài liệu.`,
        );
      }
      if (
        field.type === 'email' &&
        value &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        throw new BadRequestException(
          `${field.label} không đúng định dạng email.`,
        );
      }
      replacements[field.key] = value;
    }

    let zip: JSZip;
    try {
      zip = await readTemplatePackage(safeTemplatePath(item.filePath), 'document');
    } catch {
      throw new NotFoundException('Không tìm thấy hoặc không thể đọc tệp DOCX của mẫu.');
    }
    const xmlFiles = Object.keys(zip.files).filter((name) =>
      /^word\/(document|header\d*|footer\d*)\.xml$/.test(name),
    );

    for (const fileName of xmlFiles) {
      let xml = await zip.file(fileName)!.async('string');
      xml = replaceDocxPlaceholders(xml, replacements);
      zip.file(fileName, xml);
    }

    const remaining = await Promise.all(
      xmlFiles.map(
        async (name) =>
          (await zip.file(name)!.async('string')).match(
            /\{\{[a-zA-Z0-9_]+\}\}/g,
          ) ?? [],
      ),
    );

    if (remaining.flat().length) {
      throw new BadRequestException(
        `Còn trường chưa được thay thế: ${[...new Set(remaining.flat())].join(', ')}`,
      );
    }

    const outputDir = path.join(generatedRoot, 'documents');
    await mkdir(outputDir, { recursive: true });
    assertSafeDirectory(generatedRoot, outputDir);

    const fileId = randomUUID();
    const fileName = `${item.slug}-${fileId.slice(0, 8)}.docx`;
    const outputPath = path.join(outputDir, `${fileId}.docx`);
    const output = await zip.generateAsync({ type: 'nodebuffer' });
    await writeNewFile(outputPath, output);

    try {
      await this.documents.create({
        id: fileId,
        templateId: item.id,
        name: getDocumentName(item, replacements),
        fileType: 'docx',
        fileName,
        filePath: `documents/${fileId}.docx`,
        formData: replacements,
      });
    } catch (error) {
      await unlink(outputPath).catch(() => undefined);
      throw new InternalServerErrorException(
        'Không thể lưu thông tin tài liệu đã tạo.',
        { cause: error },
      );
    }

    return { id: fileId, fileName, downloadUrl: `/api/files/${fileId}` };
  }

  async copyPresentation(
    id: number,
    submittedValues: Record<string, unknown> = {},
  ) {
    assertValidTemplateId(id);
    const item = await this.repo.findOne({
      where: { id, type: 'presentation', isActive: true },
    });
    if (!item) throw new NotFoundException('Không tìm thấy mẫu trình chiếu.');

    let zip: JSZip;
    try {
      zip = await readTemplatePackage(safeTemplatePath(item.filePath), 'presentation');
    } catch {
      throw new NotFoundException('Không tìm thấy hoặc không thể đọc tệp PPTX mẫu.');
    }
    await this.ensurePresentationFields(item, zip);
    const fields = (item.preview as {
      fields?: Array<{
        key: string;
        label: string;
        required?: boolean;
        maxLength?: number;
        type?: string;
      }>
    }).fields ?? [];
    const replacements = validateTemplateValues(fields, submittedValues);
    const slideFiles = Object.keys(zip.files).filter((name) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name),
    );

    for (const fileName of slideFiles) {
      const slide = zip.file(fileName);
      if (slide) {
        zip.file(fileName, replacePptxPlaceholders(await slide.async('string'), replacements));
      }
    }

    const remaining = await Promise.all(slideFiles.map(async (fileName) => {
      const slide = zip.file(fileName);
      return slide ? (await slide.async('string')).match(/\{\{[a-zA-Z0-9_]+\}\}/g) ?? [] : [];
    }));
    if (remaining.flat().length) {
      throw new BadRequestException(
        `Còn trường trình chiếu chưa được thay thế: ${[...new Set(remaining.flat())].join(', ')}`,
      );
    }

    const outputDir = path.join(generatedRoot, 'presentations');
    await mkdir(outputDir, { recursive: true });
    assertSafeDirectory(generatedRoot, outputDir);

    const fileId = randomUUID();
    const fileName = `${item.slug}-${fileId.slice(0, 8)}.pptx`;
    const outputPath = path.join(outputDir, `${fileId}.pptx`);
    const output = await zip.generateAsync({ type: 'nodebuffer' });
    await writeNewFile(outputPath, output);

    try {
      await this.documents.create({
        id: fileId,
        templateId: item.id,
        name: getDocumentName(item, replacements),
        fileType: 'pptx',
        fileName,
        filePath: `presentations/${fileId}.pptx`,
        formData: Object.keys(replacements).length ? replacements : null,
      });
    } catch (error) {
      await unlink(outputPath).catch(() => undefined);
      throw new InternalServerErrorException(
        'Không thể lưu thông tin bản trình chiếu đã tạo.',
        { cause: error },
      );
    }

    return { id: fileId, fileName, downloadUrl: `/api/files/${fileId}` };
  }

  async file(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new NotFoundException('Không tìm thấy tệp.');
    }

    const document = await this.documents.getForDownload(id);
    const directory = document.fileType === 'docx' ? 'documents' : document.fileType === 'pptx' ? 'presentations' : '';
    const expectedRelativePath = directory ? `${directory}/${id}.${document.fileType}` : '';
    if (!expectedRelativePath || document.filePath !== expectedRelativePath) {
      throw new NotFoundException('Loại tệp đã tạo không hợp lệ.');
    }

    let filePath: string;
    try {
      filePath = safeGeneratedPath(document.filePath);
      const fileStats = await stat(filePath);
      if (!fileStats.isFile() || !fileStats.size) {
        throw new NotFoundException('Tệp đã tạo không tồn tại hoặc đang trống.');
      }
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Tệp đã tạo không còn trên máy chủ.');
    }

    const candidateName = typeof document.fileName === 'string' ? document.fileName : '';
    const safeFileName = /^[a-z0-9][a-z0-9-]{0,110}-[0-9a-f]{8}\.(docx|pptx)$/i.test(candidateName) &&
      candidateName.toLowerCase().endsWith(`.${document.fileType}`)
      ? candidateName
      : `papertrail-${id.slice(0, 8)}.${document.fileType}`;
    return { filePath, fileName: safeFileName, mimeType: mime[document.fileType] };
  }
}

function getDocumentName(
  template: Template,
  values: Record<string, string>,
) {
  const name =
    values.bao_cao_tieu_de ||
    values.cong_ty_ten ||
    values.du_an_ten ||
    values.cuoc_hop_tieu_de ||
    values.day_du_ten ||
    values.nhan_vien_ten ||
    template.name;
  return name.trim().slice(0, 255) || template.name;
}

function validateTemplateValues(
  fields: Array<{
    key: string;
    label: string;
    required?: boolean;
    maxLength?: number;
    type?: string;
  }>,
  values: Record<string, unknown>,
) {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new BadRequestException('Dữ liệu biểu mẫu không hợp lệ.');
  }

  const allowed = new Set(fields.map((field) => field.key));
  for (const key of Object.keys(values)) {
    if (!allowed.has(key)) {
      throw new BadRequestException(`Trường không được hỗ trợ: ${key}`);
    }
  }

  const replacements: Record<string, string> = {};
  for (const field of fields) {
    const raw = values[field.key];
    if (raw != null && typeof raw !== 'string') {
      throw new BadRequestException(`${field.label} phải là văn bản.`);
    }
    const value = raw == null ? '' : raw.trim();
    if (field.required && !value) {
      throw new BadRequestException(`Vui lòng nhập ${field.label}.`);
    }
    if (value.length > (field.maxLength ?? 500)) {
      throw new BadRequestException(`${field.label} vượt quá độ dài cho phép.`);
    }
    if (containsInvalidXmlCharacters(value)) {
      throw new BadRequestException(
        `${field.label} chứa ký tự không được hỗ trợ trong tệp.`,
      );
    }
    if (
      field.type === 'email' &&
      value &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    ) {
      throw new BadRequestException(`${field.label} không đúng định dạng email.`);
    }
    replacements[field.key] = value;
  }

  return replacements;
}

function xmlDecode(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function xmlEncode(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function containsInvalidXmlCharacters(value: string) {
  for (const character of value) {
    const codePoint = character.codePointAt(0)!;
    const isValid =
      codePoint === 0x9 ||
      codePoint === 0xa ||
      codePoint === 0xd ||
      (codePoint >= 0x20 && codePoint <= 0xd7ff) ||
      (codePoint >= 0xe000 && codePoint <= 0xfffd) ||
      (codePoint >= 0x10000 && codePoint <= 0x10ffff);

    if (!isValid) return true;
  }

  return false;
}

export function replaceDocxPlaceholders(
  xml: string,
  values: Record<string, string>,
) {
  return replaceOfficeTextPlaceholders(xml, values, 'w');
}

export function replacePptxPlaceholders(
  xml: string,
  values: Record<string, string>,
) {
  return replaceOfficeTextPlaceholders(xml, values, 'a');
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function extractDocxPreview(xml: string) {
  const body = xml.match(/<w:body\b[^>]*>([\s\S]*?)<\/w:body>/)?.[1] ?? '';
  const blocks: Record<string, unknown>[] = [];
  const elements = body.match(/<w:p\b[\s\S]*?<\/w:p>|<w:tbl\b[\s\S]*?<\/w:tbl>/g) ?? [];
  const readParagraph = (fragment: string) => {
    const text = [...fragment.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((match) => decodeXmlText(match[1]))
      .join('')
      .trim();
    const styleName = fragment.match(/<w:pStyle\b[^>]*w:val="([^"]+)"/)?.[1]?.toLowerCase() ?? '';
    const role = styleName === 'title'
      ? 'title'
      : styleName.includes('heading1')
        ? 'heading'
        : styleName.includes('heading2')
          ? 'subheading'
          : /<w:numPr\b/.test(fragment)
            ? 'bullet'
            : text.startsWith('THƯ VIỆN MẪU TÀI LIỆU')
              ? 'eyebrow'
              : 'paragraph';
    const runs = [...fragment.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/g)]
      .map((match) => {
        const runXml = match[1];
        const runText = [...runXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
          .map((textMatch) => decodeXmlText(textMatch[1]))
          .join('');
        const properties = runXml.match(/<w:rPr\b[^>]*>([\s\S]*?)<\/w:rPr>/)?.[1] ?? '';
        const style: Record<string, string | number> = {};
        if (/<w:b(?:\s[^>]*)?\s*\/>/.test(properties) || /<w:b\b[^>]*w:val="(?:true|1)"/.test(properties)) {
          style.fontWeight = 700;
        }
        if (/<w:i(?:\s[^>]*)?\s*\/>/.test(properties) || /<w:i\b[^>]*w:val="(?:true|1)"/.test(properties)) {
          style.fontStyle = 'italic';
        }
        if (/<w:u\b/.test(properties)) style.textDecoration = 'underline';
        const color = properties.match(/<w:color\b[^>]*w:val="([0-9A-Fa-f]{6})"/)?.[1];
        const size = properties.match(/<w:sz\b[^>]*w:val="(\d+)"/)?.[1];
        const font = properties.match(/<w:rFonts\b[^>]*w:(?:ascii|hAnsi)="([^"]+)"/)?.[1];
        if (color) style.color = `#${color}`;
        if (size) style.fontSize = Number(size) / 2;
        if (font) style.fontFamily = font;
        return runText ? { text: runText, style } : null;
      })
      .filter((run): run is { text: string; style: Record<string, string | number> } => Boolean(run));

    return { text, role, runs };
  };

  for (const element of elements) {
    if (element.startsWith('<w:tbl')) {
      const rows = [...element.matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g)].map((row) =>
        [...row[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g)].map((cell) =>
          [...cell[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
            .map((match) => decodeXmlText(match[1]))
            .join('')
            .trim(),
        ),
      );
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }

    const paragraph = readParagraph(element);
    if (paragraph.text) blocks.push({ type: 'paragraph', ...paragraph });
  }

  return { kind: 'docx-content', blocks };
}

export function extractDocxPlaceholderKeys(xmlDocuments: string[]) {
  const combinedText = xmlDocuments
    .map((xml) =>
      [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((match) => decodeXmlText(match[1]))
        .join(''),
    )
    .join('\n');
  return [
    ...new Set(
      [...combinedText.matchAll(/\{\{([^{}]+)\}\}/g)].map(
        (match) => match[1],
      ),
    ),
  ];
}

export function extractPptxPlaceholderKeys(slides: string[]) {
  const keys = new Set<string>();
  for (const xml of slides) {
    for (const paragraph of extractOfficeParagraphTexts(xml, 'a')) {
      for (const match of paragraph.matchAll(/\{\{([^{}]+)\}\}/g)) {
        keys.add(match[1]);
      }
    }
  }
  return [...keys];
}

function extractOfficeParagraphTexts(xml: string, namespace: 'a' | 'w') {
  const paragraphPattern = new RegExp(`<${namespace}:p\\b[^>]*>([\\s\\S]*?)<\\/${namespace}:p>`, 'g');
  const textPattern = new RegExp(`<${namespace}:t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${namespace}:t>`, 'g');
  return [...xml.matchAll(paragraphPattern)].map((paragraph) =>
    [...paragraph[1].matchAll(textPattern)]
      .map((match) => decodeXmlText(match[1]))
      .join(''),
  );
}

function createPlaceholderFields(keys: string[]) {
  return keys.map((key, index) => {
    const label = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_]+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase('vi-VN'));
    return {
      key,
      label,
      required: index < 6,
      maxLength: 500,
      placeholder: `Nhập ${label.toLocaleLowerCase('vi-VN')}`,
    };
  });
}

function slugify(value: string) {
  const slug = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return slug || `uploaded-template-${randomUUID().slice(0, 8)}`;
}

function replaceOfficeTextPlaceholders(
  xml: string,
  values: Record<string, string>,
  namespace: 'w' | 'a',
) {
  const paragraphPattern = new RegExp(`<${namespace}:p\\b[^>]*>[\\s\\S]*?<\\/${namespace}:p>`, 'g');
  const textNodePattern = new RegExp(`<${namespace}:t(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${namespace}:t>`, 'g');
  const indexedTextNodePattern = new RegExp(`<${namespace}:t(\\s[^>]*)?>([\\s\\S]*?)<\\/${namespace}:t>`, 'g');

  return xml.replace(paragraphPattern, (paragraph) => {
    let result = paragraph;
    for (const [key, value] of Object.entries(values)) {
      const token = `{{${key}}}`;
      let text = [
        ...result.matchAll(textNodePattern),
      ]
        .map((m) => xmlDecode(m[1]))
        .join('');
      let position = text.indexOf(token);

      while (position >= 0) {
        const nodes = [
          ...result.matchAll(indexedTextNodePattern),
        ];
        let offset = 0;
        let startNode = -1;
        let endNode = -1;
        let startOffset = 0;
        let endOffset = 0;

        for (let i = 0; i < nodes.length; i++) {
          const decoded = xmlDecode(nodes[i][2]);
          if (startNode < 0 && position < offset + decoded.length) {
            startNode = i;
            startOffset = position - offset;
          }
          if (position + token.length <= offset + decoded.length) {
            endNode = i;
            endOffset = position + token.length - offset;
            break;
          }
          offset += decoded.length;
        }

        if (startNode < 0 || endNode < startNode) break;

        for (let i = endNode; i >= startNode; i--) {
          const node = nodes[i];
          const content = xmlDecode(node[2]);
          const next =
            i === startNode
              ? content.slice(0, startOffset) +
              value +
              (i === endNode ? content.slice(endOffset) : '')
              : i === endNode
                ? content.slice(endOffset)
                : '';
          const originalAttributes = node[1] ?? '';
          const preservedAttributes = originalAttributes.replace(
            /\s+xml:space="[^"]*"/g,
            '',
          );
          const preserveSpace =
            /\s+xml:space="preserve"/.test(originalAttributes) ||
            /^\s/.test(next) ||
            /\s$/.test(next);
          // DrawingML requires each regular text run to retain its <a:t>
          // child, even when the replacement value is empty. Removing the
          // element creates a malformed run that PowerPoint may ask to repair.
          const replacement = `<${namespace}:t${preservedAttributes}${preserveSpace ? ' xml:space="preserve"' : ''}>${xmlEncode(next)}</${namespace}:t>`;
          result =
            result.slice(0, node.index) +
            replacement +
            result.slice(node.index + node[0].length);
        }

        text = [
          ...result.matchAll(textNodePattern),
        ]
          .map((m) => xmlDecode(m[1]))
          .join('');
        position = text.indexOf(token);
      }
    }
    return result;
  });
}
