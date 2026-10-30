import { BadRequestException } from '@nestjs/common';
import JSZip from 'jszip';
import path from 'node:path';
import { inflateRawSync } from 'node:zlib';
import { TextDecoder } from 'node:util';

const limits = {
  document: { entries: 2000, expandedBytes: 128 * 1024 * 1024 },
  presentation: { entries: 3000, expandedBytes: 128 * 1024 * 1024 },
};

const forbiddenParts = /(?:^|\/)(?:vbaProject\.bin|activex|customUI|externalLinks)(?:\/|$)|(?:^|\/)embeddings\/.+|\.(?:exe|dll|js|vbs|bat|cmd|ps1|hta|html|svg)$/i;

type ZipMetadata = {
  compressedSize?: number;
  uncompressedSize?: number;
  crc32?: number;
  compression?: { magic?: string };
  compressedContent?: Uint8Array;
};

function zipMetadata(file: JSZip.JSZipObject) {
  return (file as unknown as { _data?: ZipMetadata })._data;
}

function fail(message: string): never {
  throw new BadRequestException(message);
}

const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function isInsidePackage(name: string) {
  const normalized = path.posix.normalize(name);
  return !name.startsWith('/') &&
    !name.includes('\\') &&
    name.length <= 512 &&
    name.split('/').length <= 20 &&
    !name.includes(':') &&
    ![...name].some((character) => character.codePointAt(0)! < 0x20) &&
    !name.split('/').some((part) => part === '..' || part === '.') &&
    normalized !== '..' &&
    !normalized.startsWith('../');
}

function preflightZip(buffer: Buffer, type: 'document' | 'presentation') {
  const eocdMinimum = 22;
  const maxCommentLength = 0xffff;
  const searchStart = Math.max(0, buffer.length - eocdMinimum - maxCommentLength);
  let eocd = -1;
  for (let offset = buffer.length - eocdMinimum; offset >= searchStart; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0 || eocd + eocdMinimum + buffer.readUInt16LE(eocd + 20) !== buffer.length) {
    fail('Tệp Office không có cấu trúc ZIP hoàn chỉnh.');
  }

  const diskNumber = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocd + 8);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (
    diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount ||
    entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff ||
    entryCount > limits[type].entries || centralOffset + centralSize !== eocd
  ) {
    fail('Tệp Office dùng cấu trúc ZIP phân đoạn hoặc vượt giới hạn.');
  }

  const names = new Set<string>();
  const localOffsets = new Set<number>();
  let cursor = centralOffset;
  let expandedTotal = 0;
  for (let index = 0; index < entryCount; index++) {
    if (cursor + 46 > eocd || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      fail('Danh mục thành phần ZIP của tệp Office bị hỏng.');
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const crc = buffer.readUInt32LE(cursor + 16);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const expandedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const diskStart = buffer.readUInt16LE(cursor + 34);
    const externalAttributes = buffer.readUInt32LE(cursor + 38);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const recordEnd = cursor + 46 + nameLength + extraLength + commentLength;
    if (
      recordEnd > eocd || diskStart !== 0 ||
      (flags & 0x0001) !== 0 ||
      (method !== 0 && method !== 8) ||
      compressedSize === 0xffffffff || expandedSize === 0xffffffff || localOffset === 0xffffffff
    ) {
      fail('Tệp Office có thành phần ZIP mã hóa hoặc không được hỗ trợ.');
    }

    let name: string;
    try {
      name = new TextDecoder('utf-8', { fatal: true }).decode(
        buffer.subarray(cursor + 46, cursor + 46 + nameLength),
      );
    } catch {
      fail('Tên thành phần trong tệp Office không hợp lệ.');
    }
    if (!isInsidePackage(name!) || names.has(name!)) {
      fail('Tệp Office có đường dẫn thành phần không an toàn hoặc bị trùng.');
    }
    names.add(name!);
    if (forbiddenParts.test(name!)) {
      fail('Tệp Office chứa macro, nội dung nhúng hoặc thành phần không được hỗ trợ.');
    }

    const unixMode = externalAttributes >>> 16;
    if ((unixMode & 0o170000) === 0o120000) {
      fail('Tệp Office không được chứa liên kết tượng trưng.');
    }
    if (localOffsets.has(localOffset) || localOffset + 30 > centralOffset || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      fail('Tệp Office có header ZIP cục bộ không hợp lệ.');
    }
    localOffsets.add(localOffset);
    const localFlags = buffer.readUInt16LE(localOffset + 6);
    const localMethod = buffer.readUInt16LE(localOffset + 8);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const localName = buffer.subarray(localOffset + 30, localOffset + 30 + localNameLength);
    const centralName = buffer.subarray(cursor + 46, cursor + 46 + nameLength);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    if (
      localFlags !== flags || localMethod !== method || !localName.equals(centralName) ||
      dataStart + compressedSize > centralOffset
    ) {
      fail('Header ZIP của tệp Office không khớp với danh mục thành phần.');
    }
    if ((flags & 0x0008) === 0 && (
      buffer.readUInt32LE(localOffset + 14) !== crc ||
      buffer.readUInt32LE(localOffset + 18) !== compressedSize ||
      buffer.readUInt32LE(localOffset + 22) !== expandedSize
    )) {
      fail('Kích thước ZIP cục bộ không khớp với danh mục thành phần.');
    }

    if (expandedSize > 32 * 1024 * 1024) fail('Tệp Office có thành phần vượt quá giới hạn kích thước.');
    if (expandedSize > 1024 * 1024 && (compressedSize === 0 || expandedSize / compressedSize > 200)) {
      fail('Tệp Office có tỷ lệ nén bất thường.');
    }
    expandedTotal += expandedSize;
    if (expandedTotal > limits[type].expandedBytes) {
      fail('Tổng dung lượng giải nén của tệp Office vượt quá giới hạn.');
    }

    cursor = recordEnd;
  }
  if (cursor !== centralOffset + centralSize) {
    fail('Kích thước danh mục ZIP của tệp Office không hợp lệ.');
  }
}

function attributes(source: string) {
  const result: Record<string, string> = {};
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of source.matchAll(pattern)) {
    result[match[1]] = (match[2] ?? match[3] ?? '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'");
  }
  return result;
}

function relationshipEntries(xml: string) {
  if (/<Relationships\b[^>]*\/\s*>/.test(xml)) return [];
  if (!/<Relationships\b/.test(xml) || !/<\/Relationships\s*>/.test(xml)) {
    fail('Gói Office có tệp relationship không hợp lệ.');
  }
  return [...xml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map((match) => attributes(match[1]));
}

export async function validateOfficeArchive(zip: JSZip, type: 'document' | 'presentation') {
  const entries = Object.values(zip.files);
  const fileLimits = limits[type];
  if (entries.length > fileLimits.entries) {
    fail('Tệp Office có quá nhiều thành phần.');
  }

  let expandedBytes = 0;
  let compressedBytes = 0;
  const names = new Set<string>();

  for (const entry of entries) {
    const name = entry.unsafeOriginalName || entry.name;
    if (!isInsidePackage(name) || names.has(name)) {
      fail('Tệp Office có đường dẫn thành phần không an toàn hoặc bị trùng.');
    }
    names.add(name);

    const permissions = typeof entry.unixPermissions === 'number'
      ? entry.unixPermissions
      : typeof entry.unixPermissions === 'string'
        ? Number.parseInt(entry.unixPermissions, 8)
        : 0;
    if ((permissions & 0o170000) === 0o120000) {
      fail('Tệp Office không được chứa liên kết tượng trưng.');
    }
    if (forbiddenParts.test(name)) {
      fail('Tệp Office chứa macro, nội dung nhúng hoặc thành phần không được hỗ trợ.');
    }

    if (entry.dir) continue;
    const metadata = zipMetadata(entry);
    const compressedSize = metadata?.compressedSize;
    const uncompressedSize = metadata?.uncompressedSize;
    if (
      !Number.isSafeInteger(compressedSize) ||
      !Number.isSafeInteger(uncompressedSize) ||
      compressedSize! < 0 ||
      uncompressedSize! < 0 ||
      uncompressedSize! > 32 * 1024 * 1024
    ) {
      fail('Tệp Office có thành phần vượt quá giới hạn kích thước.');
    }
    if (uncompressedSize! > 1024 * 1024 &&
      (compressedSize === 0 || uncompressedSize! / compressedSize! > 200)) {
      fail('Tệp Office có tỷ lệ nén bất thường.');
    }

    const compressed = metadata?.compressedContent;
    if (!compressed || compressed.byteLength !== compressedSize) {
      fail('Tệp Office có dữ liệu nén không nhất quán.');
    }
    let inflated: Buffer;
    try {
      const method = metadata?.compression?.magic;
      if (method === '\u0008\u0000') {
        inflated = inflateRawSync(Buffer.from(compressed), { maxOutputLength: 32 * 1024 * 1024 });
      } else if (method === '\u0000\u0000') {
        inflated = Buffer.from(compressed);
      } else {
        fail('Tệp Office dùng phương thức nén không được hỗ trợ.');
      }
    } catch {
      fail('Không thể giải nén an toàn một thành phần của tệp Office.');
    }
    if (inflated!.length !== uncompressedSize || crc32(inflated!) !== (metadata?.crc32 ?? -1) >>> 0) {
      fail('Tệp Office có kích thước hoặc checksum không hợp lệ.');
    }

    expandedBytes += uncompressedSize!;
    compressedBytes += compressedSize!;
    if (expandedBytes > fileLimits.expandedBytes) {
      fail('Tổng dung lượng giải nén của tệp Office vượt quá giới hạn.');
    }
  }

  if (expandedBytes > 1024 * 1024 && compressedBytes > 0 && expandedBytes / compressedBytes > 200) {
    fail('Tệp Office có tỷ lệ nén tổng thể bất thường.');
  }

  const contentTypesFile = zip.file('[Content_Types].xml');
  const rootRelationshipsFile = zip.file('_rels/.rels');
  const mainPath = type === 'document' ? 'word/document.xml' : 'ppt/presentation.xml';
  const mainContentType = type === 'document'
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
    : 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml';
  const mainFile = zip.file(mainPath);

  if (!contentTypesFile || !rootRelationshipsFile || !mainFile) {
    fail(`Tệp tải lên thiếu thành phần bắt buộc của ${type === 'document' ? 'DOCX' : 'PPTX'}.`);
  }

  const readPart = async (file: JSZip.JSZipObject, maxBytes = 8 * 1024 * 1024) => {
    const size = zipMetadata(file)?.uncompressedSize ?? 0;
    if (size > maxBytes) fail('Tệp Office có thành phần XML vượt quá giới hạn.');
    return file.async('string');
  };

  return Promise.all([
    readPart(contentTypesFile),
    readPart(rootRelationshipsFile),
    readPart(mainFile),
  ]).then(async ([contentTypes, rootRelationships, mainXml]) => {
    if (
      !/<Types\b/.test(contentTypes) ||
      !/<\/Types\s*>/.test(contentTypes) ||
      !contentTypes.includes(mainContentType) ||
      /macroEnabled|vbaProject/i.test(contentTypes)
    ) {
      fail('Tệp Office có khai báo loại nội dung không hợp lệ hoặc có macro.');
    }

    const rootRels = relationshipEntries(rootRelationships);
    const officeDocumentRel = rootRels.find((rel) => rel.Type?.endsWith('/officeDocument'));
    const expectedTarget = type === 'document' ? 'word/document.xml' : 'ppt/presentation.xml';
    const mainTarget = officeDocumentRel?.Target?.replace(/^\//, '');
    if (!officeDocumentRel || path.posix.normalize(mainTarget ?? '') !== expectedTarget) {
      fail('Tệp Office không liên kết đến tài liệu chính đúng định dạng.');
    }
    if (type === 'document' && !/<w:document\b[\s\S]*<\/w:document>/.test(mainXml)) {
      fail('Gói DOCX thiếu nội dung Word hợp lệ.');
    }
    if (type === 'presentation' && !/<p:presentation\b[\s\S]*<\/p:presentation>/.test(mainXml)) {
      fail('Gói PPTX thiếu nội dung trình chiếu hợp lệ.');
    }

    for (const [name, entry] of Object.entries(zip.files)) {
      if (!/(?:^|[/])_rels[/][^/]+[.]rels$/.test(name)) continue;
      const xml = await readPart(entry);
      const rels = relationshipEntries(xml);
      const ids = new Set<string>();
      const sourceDirectory = name === '_rels/.rels'
        ? ''
        : name.replace(/\/_rels\/[^/]+\.rels$/, '');
      for (const rel of rels) {
        if (!rel.Id || !rel.Type || !rel.Target || ids.has(rel.Id)) {
          fail('Tệp Office có relationship thiếu thông tin hoặc ID bị trùng.');
        }
        ids.add(rel.Id);
        if (rel.TargetMode === 'External') {
          if (!rel.Type.endsWith('/hyperlink') || !/^(?:https?:|mailto:)/i.test(rel.Target)) {
            fail('Tệp Office chứa liên kết ngoài không được hỗ trợ.');
          }
          continue;
        }
        const target = rel.Target.startsWith('/')
          ? path.posix.normalize(rel.Target.slice(1))
          : path.posix.normalize(path.posix.join(sourceDirectory, rel.Target));
        if (!isInsidePackage(target) || !zip.file(target)) {
          fail('Tệp Office có relationship trỏ đến thành phần không tồn tại.');
        }
      }
    }

    return zip;
  });
}

export async function loadValidatedOfficePackage(
  buffer: Buffer,
  type: 'document' | 'presentation',
) {
  preflightZip(buffer, type);
  let zip: JSZip;
  try {
    // CRC verification eagerly inflates every member. Apply central-directory
    // size limits first, then decompress only bounded XML parts below.
    zip = await JSZip.loadAsync(buffer);
  } catch {
    fail('Tệp tải lên không phải gói Office hợp lệ.');
  }
  return validateOfficeArchive(zip, type);
}
