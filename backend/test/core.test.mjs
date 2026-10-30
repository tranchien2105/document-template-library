import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, rm, writeFile, symlink } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import JSZip from 'jszip';
import { BadRequestException, InternalServerErrorException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { extractDocxPlaceholderKeys, extractPptxPlaceholderKeys, replaceDocxPlaceholders, replacePptxPlaceholders, TemplateService } from '../dist/templates/template.service.js';
import { DocumentsService } from '../dist/documents/documents.service.js';
import { generatedRoot, safeGeneratedPath, safeTemplatePath, templateRoot, writeNewFile } from '../dist/common/storage.js';
import { loadValidatedOfficePackage } from '../dist/common/office-package.js';
import { UploadExceptionFilter } from '../dist/common/upload-exception.filter.js';

test('replaces a placeholder split across Word text runs and escapes XML input', () => {
  const xml = '<w:p><w:r><w:t>{{ho_ten</w:t></w:r><w:r><w:t>}}</w:t></w:r></w:p>';
  const result = replaceDocxPlaceholders(xml, { ho_ten: 'Nguyễn & An' });
  assert.match(result, /Nguyễn &amp; An/);
  assert.doesNotMatch(result, /\{\{/);
});

test('extracts uploaded DOCX fields across separate Word runs', () => {
  const xml = '<w:p><w:r><w:t>{{ho_ten</w:t></w:r><w:r><w:t>}}</w:t></w:r></w:p>';
  assert.deepEqual(extractDocxPlaceholderKeys([xml]), ['ho_ten']);
});

test('validates uploaded DOCX packages and registers extracted fields', async () => {
  const packageZip = new JSZip();
  packageZip.file('[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml" PartName="/word/document.xml"/></Types>');
  packageZip.file('_rels/.rels', '<Relationships><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  packageZip.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>{{ho_ten}}</w:t></w:r></w:p></w:body></w:document>');
  const buffer = await packageZip.generateAsync({ type: 'nodebuffer' });
  let created;
  const templateRepository = {
    findOne: async () => null,
    create: (value) => value,
    save: async (value) => { created = value; return value; },
  };
  const repository = {
    manager: {
      transaction: async (callback) => callback({
        query: async () => [{ id: '31' }],
        getRepository: () => templateRepository,
      }),
    },
  };
  const service = new TemplateService(repository);
  const result = await service.uploadDocumentTemplate(
    { originalname: 'ho-so.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer },
    { name: 'Hồ sơ mới', description: 'Mẫu hồ sơ dùng thử.', category: 'Nhân sự' },
  );

  try {
    assert.equal(created.id, 31);
    assert.equal(created.type, 'document');
    assert.equal(created.preview.fields[0].key, 'ho_ten');
    assert.equal(result.slug, 'ho-so-moi');
    assert.equal('filePath' in result, false);
    assert.ok((await stat(safeTemplatePath(created.filePath))).size > 0);
  } finally {
    await rm(safeTemplatePath(created.filePath), { force: true });
  }

  await assert.rejects(
    service.uploadDocumentTemplate(
      { originalname: 'not-a-word.docx', mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer: Buffer.from('MZ\u0000not an Office package') },
      { name: 'Không hợp lệ', description: 'Tệp không hợp lệ.', category: 'Khác' },
    ),
    BadRequestException,
  );
});

test('validates uploaded PPTX packages and registers slide preview metadata', async () => {
  const packageZip = new JSZip();
  packageZip.file('[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml" PartName="/ppt/presentation.xml"/></Types>');
  packageZip.file('_rels/.rels', '<Relationships><Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');
  packageZip.file('ppt/presentation.xml', '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>');
  packageZip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>');
  packageZip.file('ppt/slides/slide1.xml', '<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>Giới thiệu Công ty</a:t></a:r></a:p><a:p><a:r><a:t>{{company</a:t></a:r><a:r><a:t>Name}}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
  const buffer = await packageZip.generateAsync({ type: 'nodebuffer' });
  let created;
  const templateRepository = {
    findOne: async () => null,
    create: (value) => value,
    save: async (value) => { created = value; return value; },
  };
  const repository = {
    manager: {
      transaction: async (callback) => callback({
        query: async () => [{ id: '32' }],
        getRepository: () => templateRepository,
      }),
    },
  };
  const service = new TemplateService(repository);
  const result = await service.uploadPresentationTemplate(
    { originalname: 'gioi-thieu-cong-ty.pptx', mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer },
    { name: 'Giới thiệu công ty', description: 'Bộ slide giới thiệu doanh nghiệp.', category: 'Doanh nghiệp' },
  );

  try {
    assert.equal(created.id, 32);
    assert.equal(created.type, 'presentation');
    assert.deepEqual(created.preview.slides, ['Giới thiệu Công ty']);
    assert.equal(created.preview.slideCount, 1);
    assert.deepEqual(created.preview.slideFields, [['companyName']]);
    assert.deepEqual(created.preview.placeholders, ['{{companyName}}']);
    assert.equal(created.preview.fields[0].key, 'companyName');
    assert.equal(created.preview.fields[0].required, true);
    assert.equal(result.slug, 'gioi-thieu-cong-ty');
    assert.equal('filePath' in result, false);
    assert.ok((await stat(safeTemplatePath(created.filePath))).size > 0);
  } finally {
    await rm(safeTemplatePath(created.filePath), { force: true });
  }

  await assert.rejects(
    service.uploadPresentationTemplate(
      { originalname: 'invalid.pptx', mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', buffer: Buffer.from('not a PPTX') },
      { name: 'Không hợp lệ', description: 'Tệp không hợp lệ.', category: 'Khác' },
    ),
    BadRequestException,
  );
});

test('rejects a renamed non-Office ZIP and a ZIP-bomb-style archive before extraction', async () => {
  const arbitrary = new JSZip();
  arbitrary.file('readme.txt', 'This is not a document.');
  const arbitraryBuffer = await arbitrary.generateAsync({ type: 'nodebuffer' });
  await assert.rejects(
    loadValidatedOfficePackage(arbitraryBuffer, 'document'),
    BadRequestException,
  );

  const fakeExecutable = Buffer.from('MZ\u0000this is not a ZIP Office document');
  await assert.rejects(
    loadValidatedOfficePackage(fakeExecutable, 'document'),
    BadRequestException,
  );

  const compressed = new JSZip();
  compressed.file('[Content_Types].xml', '<Types/>');
  compressed.file('_rels/.rels', '<Relationships/>');
  compressed.file('word/document.xml', '<w:document/>');
  compressed.file('word/large.xml', 'x'.repeat(1.2 * 1024 * 1024));
  const bombLikeBuffer = await compressed.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  await assert.rejects(
    loadValidatedOfficePackage(bombLikeBuffer, 'document'),
    BadRequestException,
  );
});

test('rejects invalid upload MIME and files exceeding the configured default limit', async () => {
  const service = new TemplateService({}, {});
  await assert.rejects(
    service.uploadDocumentTemplate(
      { originalname: 'renamed.docx', mimetype: 'application/x-msdownload', buffer: Buffer.from('MZ') },
      { name: 'Tệp giả', description: 'Không phải DOCX.', category: 'Kiểm tra' },
    ),
    (error) => error?.status === 415,
  );
  await assert.rejects(
    service.uploadDocumentTemplate(
      {
        originalname: 'large.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
      },
      { name: 'Tệp lớn', description: 'Vượt dung lượng.', category: 'Kiểm tra' },
    ),
    PayloadTooLargeException,
  );
});

test('maps a Multer size-limit error to HTTP 413 without returning internal details', () => {
  let statusCode;
  let payload;
  const response = {
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; },
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) };
  new UploadExceptionFilter().catch(
    Object.assign(new Error('internal multer details'), { name: 'MulterError', code: 'LIMIT_FILE_SIZE' }),
    host,
  );
  assert.equal(statusCode, 413);
  assert.match(payload.message, /vượt quá giới hạn/i);
  assert.doesNotMatch(JSON.stringify(payload), /internal multer details/);
});

test('replaces a placeholder split across PowerPoint text runs and escapes XML input', () => {
  const xml = '<a:p><a:r><a:t>{{cong_ty</a:t></a:r><a:r><a:t>_ten}}</a:t></a:r></a:p>';
  const result = replacePptxPlaceholders(xml, { cong_ty_ten: 'Công ty A & B' });
  assert.match(result, /Công ty A &amp; B/);
  assert.doesNotMatch(result, /\{\{/);
});

test('extracts PPTX placeholders even when WordArt text splits a token across runs', () => {
  const xml = '<a:p><a:r><a:t>{{ten_cong</a:t></a:r><a:r><a:t>_ty}}</a:t></a:r></a:p>';
  assert.deepEqual(extractPptxPlaceholderKeys([xml]), ['ten_cong_ty']);
});

test('backfills missing placeholder metadata for older uploaded presentations before copying', async () => {
  const relativePath = `uploads/legacy-pptx-${Date.now()}.pptx`;
  const sourcePath = join(templateRoot, relativePath);
  const packageZip = new JSZip();
  packageZip.file('[Content_Types].xml', '<Types><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/></Types>');
  packageZip.file('_rels/.rels', '<Relationships><Relationship Id="rId0" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>');
  packageZip.file('ppt/presentation.xml', '<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst></p:presentation>');
  packageZip.file('ppt/_rels/presentation.xml.rels', '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>');
  packageZip.file('ppt/slides/slide1.xml', '<p:sld><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>{{company_name}}</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>');
  await writeFile(sourcePath, await packageZip.generateAsync({ type: 'nodebuffer' }));
  const template = {
    id: 40,
    slug: 'legacy-company-deck',
    name: 'Bản trình chiếu cũ',
    type: 'presentation',
    filePath: relativePath,
    preview: { slides: ['Giới thiệu công ty'], slideCount: 1 },
  };
  let savedTemplate;
  let generatedId = '';
  let outputPath = '';
  const service = new TemplateService(
    {
      findOne: async () => template,
      save: async (value) => { savedTemplate = value; return value; },
    },
    { create: async (record) => { generatedId = record.id; return record; } },
  );

  try {
    const result = await service.copyPresentation(template.id, {
      company_name: 'Công ty Minh An',
    });
    outputPath = join(generatedRoot, 'presentations', `${result.id}.pptx`);
    const outputZip = await JSZip.loadAsync(await readFile(outputPath));
    const slideXml = await outputZip.file('ppt/slides/slide1.xml').async('string');
    assert.equal(result.id, generatedId);
    assert.deepEqual(savedTemplate.preview.slideFields, [['company_name']]);
    assert.equal(savedTemplate.preview.fields[0].key, 'company_name');
    assert.match(slideXml, /Công ty Minh An/);
    assert.doesNotMatch(slideXml, /\{\{/);
  } finally {
    await rm(sourcePath, { force: true });
    if (outputPath) await rm(outputPath, { force: true });
  }
});

test('keeps the required DrawingML text node when a placeholder is blank', () => {
  const xml = '<a:p><a:r><a:rPr/><a:t>{{optional_value}}</a:t></a:r></a:p>';
  const result = replacePptxPlaceholders(xml, { optional_value: '' });
  assert.match(result, /<a:t><\/a:t>/);
  const runs = [...result.matchAll(/<a:r\b[^>]*>([\s\S]*?)<\/a:r>/g)];
  assert.ok(runs.every((run) => /<a:t(?:\s[^>]*)?>/.test(run[1])));
});

test('rejects path traversal and resolves an in-root template', () => {
  assert.throws(() => safeTemplatePath('../../package.json'), /không hợp lệ|Không tìm thấy/i);
  assert.equal(safeTemplatePath('documents/business-report.docx'), join(templateRoot, 'documents/business-report.docx'));
  assert.throws(() => safeGeneratedPath('../../package.json'), /không hợp lệ/i);
  assert.equal(
    safeGeneratedPath('documents/123e4567-e89b-12d3-a456-426614174000.docx'),
    join(generatedRoot, 'documents', '123e4567-e89b-12d3-a456-426614174000.docx'),
  );
});

test('rejects template symlinks that resolve outside the template directory', async () => {
  const relative = `uploads/security-link-${Date.now()}.docx`;
  const linkPath = join(templateRoot, relative);
  await symlink('/etc/passwd', linkPath);
  try {
    assert.throws(() => safeTemplatePath(relative), /không an toàn/i);
  } finally {
    await rm(linkPath, { force: true });
  }
});

test('exclusive output writes do not overwrite an existing generated file', async () => {
  const relative = `documents/${randomUUID()}.docx`;
  const filePath = safeGeneratedPath(relative);
  await writeFile(filePath, 'original', { flag: 'wx' });
  try {
    await assert.rejects(writeNewFile(filePath, Buffer.from('replacement')));
    assert.equal(await readFile(filePath, 'utf8'), 'original');
  } finally {
    await rm(filePath, { force: true });
  }
});

test('manifest points to eight valid Office Open XML packages', async () => {
  const manifest = JSON.parse(await readFile(resolve(templateRoot, 'manifest.json'), 'utf8'));
  assert.equal(manifest.templates.length, 8);
  for (const entry of manifest.templates) {
    assert.match(entry.name, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, `${entry.slug} must have a Vietnamese display name`);
    assert.match(entry.description, /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i, `${entry.slug} must have a Vietnamese description`);
    const file = safeTemplatePath(entry.filePath);
    assert.ok((await stat(file)).size > 0, `${entry.slug} must not be empty`);
    await loadValidatedOfficePackage(await readFile(file), entry.type);
    const zip = await JSZip.loadAsync(await readFile(file));
    assert.ok(zip.file(entry.type === 'document' ? 'word/document.xml' : 'ppt/presentation.xml'), `${entry.slug} must be a valid Office package`);
    if (entry.type === 'document') {
      const xml = await zip.file('word/document.xml').async('string');
      const actual = [...new Set([...xml.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]))].sort();
      const fields = entry.preview.fields.map((field) => field.key).sort();
      assert.deepEqual(fields, actual, `${entry.slug} manifest fields must match its actual placeholders`);
      assert.match(xml, /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i, `${entry.slug} must contain Vietnamese text`);
    } else {
      const slideFiles = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
      assert.equal(slideFiles.length, entry.preview.slideCount, `${entry.slug} slide count must match metadata`);
      const slideText = (await Promise.all(slideFiles.map((name) => zip.file(name).async('string')))).join(' ');
      assert.match(slideText, /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i, `${entry.slug} must contain Vietnamese text`);
      const textRuns = (await Promise.all(slideFiles.map(async (name) => {
        const xml = await zip.file(name).async('string');
        return [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]).join('');
      }))).join('');
      const actualFields = [...new Set([...textRuns.matchAll(/\{\{([^{}]+)\}\}/g)].map((match) => match[1]))].sort();
      const manifestFields = entry.preview.fields.map((field) => field.key).sort();
      assert.deepEqual(manifestFields, actualFields, `${entry.slug} fields must match its actual slide placeholders`);
      if (entry.slug === 'business-review') {
        assert.match(textRuns, /\{\{tong_doanh_thu\}\}/);
        assert.match(textRuns, /\{\{doanh_thu_ke_hoach\}\}/);
        assert.match(textRuns, /\{\{giu_chan_ty_le\}\}/);
      }
    }
  }
});

test('creates an independent Vietnamese DOCX and an unchanged PPTX copy', async () => {
  const manifest = JSON.parse(await readFile(join(templateRoot, 'manifest.json'), 'utf8'));
  const templates = new Map(manifest.templates.map((template) => [template.id, template]));
  const savedDocuments = [];
  const documentsService = {
    create: async (record) => {
      savedDocuments.push(record);
      return record;
    },
    getForDownload: async (id) => {
      const record = savedDocuments.find((saved) => saved.id === id);
      if (!record) throw new NotFoundException('Không tìm thấy tệp đã tạo.');
      return { fileType: record.fileType, filePath: record.filePath };
    },
  };
  const service = new TemplateService(
    { findOne: async ({ where }) => templates.get(where.id) ?? null },
    documentsService,
  );
  const docSource = safeTemplatePath(templates.get(3).filePath);
  const sourceHash = createHash('sha256').update(await readFile(docSource)).digest('hex');
  await assert.rejects(service.createDocument(3, { unsafe: 'value' }));
  const docResult = await service.createDocument(3, {
    nhan_vien_ten: 'Nguyễn Thị An', phong_ban: 'Kinh doanh',
    nghi_phep_bat_dau_ngay: '01/11/2026', nghi_phep_ket_thuc_ngay: '02/11/2026', nghi_phep_ly_do: 'Việc gia đình',
  });
  assert.equal(savedDocuments[0].id, docResult.id);
  assert.equal(savedDocuments[0].templateId, 3);
  assert.equal(savedDocuments[0].name, 'Nguyễn Thị An');
  assert.equal(savedDocuments[0].fileType, 'docx');
  assert.equal(savedDocuments[0].formData.nhan_vien_ten, 'Nguyễn Thị An');
  assert.equal(savedDocuments[0].filePath, `documents/${docResult.id}.docx`);
  const docOutput = join(generatedRoot, 'documents', `${docResult.id}.docx`);
  try {
    const downloadableDoc = await service.file(docResult.id);
    assert.equal(downloadableDoc.mimeType, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const outputZip = await JSZip.loadAsync(await readFile(docOutput));
    const sourceZip = await JSZip.loadAsync(await readFile(docSource));
    const outputXml = await outputZip.file('word/document.xml').async('string');
    assert.match(outputXml, /Nguyễn Thị An/);
    assert.doesNotMatch(outputXml, /\{\{[^{}]+\}\}/);
    assert.match(outputXml, /<w:tbl\b/, 'generated Word document should retain its table structure');
    assert.match(outputXml, /<w:rPr\b/, 'generated Word document should retain run formatting');
    assert.deepEqual(
      await outputZip.file('word/styles.xml').async('nodebuffer'),
      await sourceZip.file('word/styles.xml').async('nodebuffer'),
      'generated document should preserve the template style definitions',
    );
    for (const part of Object.keys(sourceZip.files).filter((name) => /^word\/(header|footer)\d*\.xml$/.test(name))) {
      assert.ok(outputZip.file(part), `generated document should retain ${part}`);
    }
    assert.equal(createHash('sha256').update(await readFile(docSource)).digest('hex'), sourceHash);
  } finally { await rm(docOutput, { force: true }); }

  const pptSource = safeTemplatePath(templates.get(6).filePath);
  const pptHash = createHash('sha256').update(await readFile(pptSource)).digest('hex');
  const pptResult = await service.copyPresentation(6, {
    cong_ty_ten: 'Công ty An Việt',
    lien_he_email: 'lienhe@example.com',
  });
  assert.equal(savedDocuments[1].id, pptResult.id);
  assert.equal(savedDocuments[1].templateId, 6);
  assert.equal(savedDocuments[1].fileType, 'pptx');
  assert.equal(savedDocuments[1].formData.cong_ty_ten, 'Công ty An Việt');
  const pptOutput = join(generatedRoot, 'presentations', `${pptResult.id}.pptx`);
  try {
    const downloadablePpt = await service.file(pptResult.id);
    assert.equal(downloadablePpt.mimeType, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    const generatedPresentation = await JSZip.loadAsync(await readFile(pptOutput));
    const slides = Object.keys(generatedPresentation.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    const text = (await Promise.all(slides.map((name) => generatedPresentation.file(name).async('string')))).join('\n');
    assert.match(text, /Công ty An Việt/);
    assert.match(text, /lienhe@example\.com/);
    assert.doesNotMatch(text, /\{\{[a-zA-Z0-9_]+\}\}/);
    assert.equal(createHash('sha256').update(await readFile(pptSource)).digest('hex'), pptHash);
  } finally { await rm(pptOutput, { force: true }); }

  await assert.rejects(
    service.copyPresentation(6, { field_not_in_template: 'Không hợp lệ' }),
    BadRequestException,
  );
});

test('concurrent presentation copies receive independent output IDs and preserve the source', async () => {
  const manifest = JSON.parse(await readFile(join(templateRoot, 'manifest.json'), 'utf8'));
  const template = manifest.templates.find((entry) => entry.slug === 'company-intro');
  const sourcePath = safeTemplatePath(template.filePath);
  const sourceHash = createHash('sha256').update(await readFile(sourcePath)).digest('hex');
  const records = [];
  const service = new TemplateService(
    { findOne: async () => template },
    { create: async (record) => { records.push(record); return record; } },
  );
  const values = Object.fromEntries(
    template.preview.fields
      .filter((field) => field.required)
      .map((field) => [field.key, `Giá trị ${field.label}`]),
  );
  const results = await Promise.all([
    service.copyPresentation(template.id, values),
    service.copyPresentation(template.id, values),
  ]);
  const outputPaths = results.map((result) => join(generatedRoot, 'presentations', `${result.id}.pptx`));

  try {
    assert.notEqual(results[0].id, results[1].id);
    assert.notEqual(results[0].fileName, results[1].fileName);
    assert.equal(records.length, 2);
    for (const outputPath of outputPaths) assert.ok((await stat(outputPath)).size > 0);
    assert.equal(createHash('sha256').update(await readFile(sourcePath)).digest('hex'), sourceHash);
  } finally {
    await Promise.all(outputPaths.map((outputPath) => rm(outputPath, { force: true })));
  }
});

test('download requires a saved record and an existing generated file', async () => {
  const id = '123e4567-e89b-12d3-a456-426614174001';
  const missingRecordService = new TemplateService({}, {
    getForDownload: async () => { throw new NotFoundException(); },
  });
  await assert.rejects(missingRecordService.file(id), NotFoundException);

  const missingFileService = new TemplateService({}, {
    getForDownload: async () => ({
      fileType: 'docx',
      filePath: `documents/${id}.docx`,
    }),
  });
  await assert.rejects(missingFileService.file(id), NotFoundException);
});

test('fills declared fields in every presentation template without changing sources', async () => {
  const manifest = JSON.parse(await readFile(join(templateRoot, 'manifest.json'), 'utf8'));
  const presentations = manifest.templates.filter((template) => template.type === 'presentation');

  for (const template of presentations) {
    const records = [];
    const service = new TemplateService(
      { findOne: async ({ where }) => manifest.templates.find((item) => item.id === where.id) ?? null },
      { create: async (record) => { records.push(record); return record; } },
    );
    const sourcePath = safeTemplatePath(template.filePath);
    const sourceHash = createHash('sha256').update(await readFile(sourcePath)).digest('hex');
    const values = Object.fromEntries(
      template.preview.fields
        .filter((field) => field.required)
        .map((field) => [field.key, `Dữ liệu ${field.label}`]),
    );
    const result = await service.copyPresentation(template.id, values);
    const generatedPath = join(generatedRoot, 'presentations', `${result.id}.pptx`);

    try {
      const generatedZip = await JSZip.loadAsync(await readFile(generatedPath));
      const slideNames = Object.keys(generatedZip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
      const slideText = (await Promise.all(slideNames.map(async (name) => {
        const xml = await generatedZip.file(name).async('string');
        const runs = [...xml.matchAll(/<a:r\b[^>]*>([\s\S]*?)<\/a:r>/g)];
        assert.ok(runs.every((run) => /<a:t(?:\s[^>]*)?>/.test(run[1])), `${template.slug}/${name} must retain a text element in every regular text run`);
        return [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((match) => match[1]).join('');
      }))).join('');

      assert.equal(records[0].templateId, template.id);
      assert.equal(records[0].fileType, 'pptx');
      assert.deepEqual(records[0].formData, Object.fromEntries(template.preview.fields.map((field) => [field.key, values[field.key] ?? ''])));
      assert.doesNotMatch(slideText, /\{\{[a-zA-Z0-9_]+\}\}/);
      assert.equal(createHash('sha256').update(await readFile(sourcePath)).digest('hex'), sourceHash);
    } finally {
      await rm(generatedPath, { force: true });
    }
  }
});

test('removes a generated document when saving its metadata fails', async () => {
  const manifest = JSON.parse(await readFile(join(templateRoot, 'manifest.json'), 'utf8'));
  const template = manifest.templates.find((entry) => entry.id === 3);
  let generatedPath;
  const service = new TemplateService(
    { findOne: async () => template },
    {
      create: async (record) => {
        generatedPath = join(generatedRoot, record.filePath);
        throw new Error('database unavailable');
      },
    },
  );

  await assert.rejects(
    service.createDocument(3, {
      nhan_vien_ten: 'Nguyễn Thị An',
      phong_ban: 'Kinh doanh',
      nghi_phep_bat_dau_ngay: '01/11/2026',
      nghi_phep_ket_thuc_ngay: '02/11/2026',
      nghi_phep_ly_do: 'Việc gia đình',
    }),
    InternalServerErrorException,
  );
  assert.ok(generatedPath);
  await assert.rejects(stat(generatedPath), { code: 'ENOENT' });
});

test('document metadata API omits filesystem paths and form data', async () => {
  const document = {
    id: 'b3a4459f-533a-47bb-8f27-886f13001c13',
    templateId: 2,
    name: 'Hồ sơ ứng tuyển',
    fileType: 'docx',
    fileName: 'resume-b3a4459f.docx',
    filePath: '/internal/storage/generated/documents/private.docx',
    formData: { email: 'private@example.com' },
    createdAt: new Date('2026-10-29T00:00:00.000Z'),
    updatedAt: new Date('2026-10-29T00:00:00.000Z'),
  };
  const service = new DocumentsService({ findOne: async () => document });
  const result = await service.getPublic(document.id);

  assert.equal(result.id, document.id);
  assert.equal(result.downloadUrl, `/api/files/${document.id}`);
  assert.equal('filePath' in result, false);
  assert.equal('formData' in result, false);
  await assert.rejects(
    new DocumentsService({ findOne: async () => null }).getPublic(document.id),
    NotFoundException,
  );
});

test('assigns generated records to the demo user and lists only public metadata', async () => {
  const demoUser = { id: 14, name: 'Demo User', email: 'demo@papertrail.local' };
  const saved = [];
  const userRepository = {
    findOne: async ({ where }) => where.email === demoUser.email ? demoUser : null,
  };
  const documentRepository = {
    create: (record) => record,
    save: async (record) => { saved.push(record); return record; },
    find: async (options) => {
      assert.equal(options.where.userId, demoUser.id);
      assert.deepEqual(options.relations, { template: true });
      return [{
        id: 'a3b4459f-533a-47bb-8f27-886f13001c13',
        templateId: 4,
        template: { name: 'Biên bản cuộc họp', type: 'document' },
        name: 'Cuộc họp tháng 11',
        fileType: 'docx',
        fileName: 'meeting.docx',
        filePath: '/private/path',
        formData: { ghi_chu: 'nội bộ' },
        createdAt: new Date('2026-10-29T00:00:00.000Z'),
        updatedAt: new Date('2026-10-29T00:00:00.000Z'),
      }];
    },
  };
  const service = new DocumentsService(documentRepository, userRepository);
  const created = await service.create({
    id: 'a3b4459f-533a-47bb-8f27-886f13001c14',
    templateId: 4,
    name: 'Cuộc họp tháng 11',
    fileType: 'docx',
    fileName: 'meeting.docx',
    filePath: 'documents/meeting.docx',
    formData: { ghi_chu: 'nội bộ' },
  });
  assert.equal(created.userId, demoUser.id);
  assert.equal(saved[0].userId, demoUser.id);

  const [item] = await service.listPublic();
  assert.equal(item.templateName, 'Biên bản cuộc họp');
  assert.equal(item.templateType, 'document');
  assert.equal(item.downloadUrl, `/api/files/${item.id}`);
  assert.equal('userId' in item, false);
  assert.equal('filePath' in item, false);
  assert.equal('formData' in item, false);
});

test('lists templates with combined filters and rejects invalid query values', async () => {
  const filters = [];
  const query = {
    where(expression, params) { filters.push([expression, params]); return this; },
    andWhere(expression, params) { filters.push([expression, params]); return this; },
    orderBy() { return this; }, skip(value) { this.offset = value; return this; }, take(value) { this.count = value; return this; },
    async getManyAndCount() { return [[{ id: 1, slug: 'business-report' }], 1]; },
  };
  const service = new TemplateService({ createQueryBuilder: () => query });
  const result = await service.list({ type: 'document', category: 'Business', search: 'Report', page: 2, limit: 3 });
  assert.equal(result.meta.page, 2);
  assert.equal(query.offset, 3);
  assert.equal(query.count, 3);
  assert.equal(filters.length, 4);
  assert.match(filters[3][0], /preview::text/);
  await assert.rejects(service.list({ page: 'NaN' }), BadRequestException);
});

test('returns categories and a 404 for missing template IDs', async () => {
  const query = {
    select() { return this; }, where() { return this; }, orderBy() { return this; },
    async getRawMany() { return [{ category: 'Business' }, { category: 'Company' }]; },
  };
  const service = new TemplateService({ createQueryBuilder: () => query, findOne: async () => null });
  assert.deepEqual(await service.categories(), ['Business', 'Company']);
  await assert.rejects(service.get(999), NotFoundException);
});

test('serves the extracted PPTX layout when the database contains a stale preview', async () => {
  const staleTemplate = {
    id: 7,
    slug: 'business-review',
    type: 'presentation',
    isActive: true,
    preview: {
      slides: ['Tóm tắt Điều hành'],
      slideFields: [[]],
      fields: [],
      renderPreview: { kind: 'old-placeholder-preview', slides: [] },
    },
  };
  const service = new TemplateService({
    findOne: async () => staleTemplate,
    save: async (value) => value,
  }, {});

  const preview = await service.preview(7);
  assert.equal(preview.renderPreview.kind, 'pptx-layout');
  assert.equal(preview.renderPreview.slides.length, 6);
  assert.ok(preview.renderPreview.slides[2].shapes.some((shape) => shape.text.includes('{{tong_doanh_thu}}')));
});
