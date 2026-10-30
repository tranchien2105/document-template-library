import { constants, existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { open, unlink } from 'node:fs/promises';

export const projectRoot = path.resolve(__dirname, '../../..');
export const templateRoot = path.resolve(projectRoot, process.env.TEMPLATE_STORAGE_DIR ?? 'storage/templates');
export const generatedRoot = path.resolve(projectRoot, process.env.GENERATED_STORAGE_DIR ?? 'storage/generated');

function isWithin(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertSafeRelativePath(relativePath: string) {
  if (
    typeof relativePath !== 'string' ||
    !relativePath ||
    path.isAbsolute(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.includes('\0')
  ) {
    throw new Error('Đường dẫn tệp không hợp lệ.');
  }
}

export function safeTemplatePath(relativePath: string): string {
  assertSafeRelativePath(relativePath);
  const resolved = path.resolve(templateRoot, relativePath);
  if (!isWithin(templateRoot, resolved) || resolved === templateRoot || !existsSync(resolved)) {
    throw new Error('Không tìm thấy tệp mẫu.');
  }
  const canonicalRoot = realpathSync(templateRoot);
  const canonicalFile = realpathSync(resolved);
  if (!isWithin(canonicalRoot, canonicalFile)) {
    throw new Error('Đường dẫn mẫu không an toàn.');
  }
  return canonicalFile;
}

export function safeGeneratedPath(relativePath: string): string {
  assertSafeRelativePath(relativePath);

  const resolved = path.resolve(generatedRoot, relativePath);
  const relative = path.relative(generatedRoot, resolved);
  const [directory, fileName, ...rest] = relative.split(path.sep);
  const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  const validDocument =
    directory === 'documents' && new RegExp(`^${uuid}\\.docx$`, 'i').test(fileName ?? '');
  const validPresentation =
    directory === 'presentations' && new RegExp(`^${uuid}\\.pptx$`, 'i').test(fileName ?? '');

  if (!isWithin(generatedRoot, resolved) || rest.length > 0 || (!validDocument && !validPresentation)) {
    throw new Error('Đường dẫn tệp đã tạo không hợp lệ.');
  }

  const canonicalRoot = realpathSync(generatedRoot);
  const parent = realpathSync(path.dirname(resolved));
  if (!isWithin(canonicalRoot, parent)) {
    throw new Error('Đường dẫn tệp đã tạo không an toàn.');
  }
  if (existsSync(resolved) && !isWithin(canonicalRoot, realpathSync(resolved))) {
    throw new Error('Đường dẫn tệp đã tạo không an toàn.');
  }

  return resolved;
}

export async function writeNewFile(filePath: string, data: Buffer) {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  let created = false;
  try {
    handle = await open(
      filePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    created = true;
    await handle.writeFile(data);
    await handle.close();
    handle = undefined;
  } catch (error) {
    await handle?.close().catch(() => undefined);
    if (created) await unlink(filePath).catch(() => undefined);
    throw error;
  }
}

export function assertSafeDirectory(root: string, directory: string) {
  const canonicalRoot = realpathSync(root);
  const canonicalDirectory = realpathSync(directory);
  if (!isWithin(canonicalRoot, canonicalDirectory)) {
    throw new Error('Thư mục lưu trữ không an toàn.');
  }
}
