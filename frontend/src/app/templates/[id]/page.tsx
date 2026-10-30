
'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { CSSProperties, FormEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useToast } from '../../../components/ToastProvider';
import {
  getSampleValue,
  getTemplateCopy,
  translateCategory,
  translateFieldLabel,
} from '../../../lib/translations';

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

type Field = {
  key: string;
  label: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  type?: string;
};

type DocumentBlock =
  | {
      type: 'paragraph';
      role: string;
      text: string;
      runs?: { text: string; style?: CSSProperties }[];
    }
  | { type: 'table'; rows: string[][] };

type PresentationShape = {
  x: number;
  y: number;
  width: number;
  height: number;
  geometry: string;
  fill?: string | null;
  line?: string | null;
  text: string;
  textStyle?: {
    fontSize?: number;
    fontFace?: string;
    color?: string | null;
    bold?: boolean;
    align?: string;
    verticalAlign?: string;
  };
};

type PresentationSlide = {
  background: string;
  widthInches: number;
  heightInches: number;
  shapes: PresentationShape[];
};

type Template = {
  id: number;
  name: string;
  slug: string;
  description: string;
  type: 'document' | 'presentation';
  category: string;
  preview: {
    kind?: string;
    sections?: string[];
    slides?: string[];
    slideFields?: string[][];
    slideCount?: number;
    fields?: Field[];
    placeholders?: string[];
    renderPreview?: {
      kind?: string;
      blocks?: DocumentBlock[];
      slides?: PresentationSlide[];
    };
  };
};

type GeneratedDocument = {
  id: string;
  templateId: number;
  name: string;
  fileType: 'docx' | 'pptx';
  fileName: string;
  downloadUrl: string;
  createdAt?: string;
};

function errorMessage(cause: unknown) {
  if (cause instanceof TypeError) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.';
  }

  if (cause instanceof Error) {
    return cause.message;
  }

  return 'Không thể tạo tệp. Vui lòng thử lại.';
}

function replacePreviewValues(text: string, values: Record<string, string>) {
  return text.replace(/\{\{([^{}]+)\}\}/g, (placeholder, key: string) =>
    values[key]?.trim() || placeholder,
  );
}

function renderDocumentRuns(
  runs: NonNullable<Extract<DocumentBlock, { type: 'paragraph' }>['runs']>,
  fallbackText: string,
  values: Record<string, string>,
): ReactNode[] {
  const source = runs.map((run) => run.text).join('');
  const segments: { start: number; end: number; runIndex: number }[] = [];
  let cursor = 0;
  runs.forEach((run, runIndex) => {
    segments.push({ start: cursor, end: cursor + run.text.length, runIndex });
    cursor += run.text.length;
  });

  const result: ReactNode[] = [];
  const tokenPattern = /\{\{([^{}]+)\}\}/g;
  let sourceCursor = 0;
  let match: RegExpExecArray | null;

  function appendStyledRange(start: number, end: number, replacement?: string) {
    if (start >= end && replacement === undefined) return;
    const firstSegment = segments.find((segment) => start >= segment.start && start < segment.end)
      ?? segments[segments.length - 1];
    const style = firstSegment ? runs[firstSegment.runIndex]?.style ?? {} : {};
    if (replacement !== undefined) {
      result.push(<span key={`replacement-${result.length}`} style={style}>{replacement}</span>);
      return;
    }

    for (const segment of segments) {
      const overlapStart = Math.max(start, segment.start);
      const overlapEnd = Math.min(end, segment.end);
      if (overlapStart >= overlapEnd) continue;
      result.push(
        <span key={`run-${result.length}`} style={runs[segment.runIndex].style}>
          {source.slice(overlapStart, overlapEnd)}
        </span>,
      );
    }
  }

  while ((match = tokenPattern.exec(source)) !== null) {
    appendStyledRange(sourceCursor, match.index);
    const value = values[match[1]]?.trim();
    appendStyledRange(match.index, tokenPattern.lastIndex, value || match[0]);
    sourceCursor = tokenPattern.lastIndex;
  }
  appendStyledRange(sourceCursor, source.length);

  return result.length ? result : [replacePreviewValues(fallbackText, values)];
}

function slideShapeStyle(
  shape: PresentationShape,
  slide: PresentationSlide,
): CSSProperties {
  return {
    left: `${(shape.x / slide.widthInches) * 100}%`,
    top: `${(shape.y / slide.heightInches) * 100}%`,
    width: `${(shape.width / slide.widthInches) * 100}%`,
    height: `${(shape.height / slide.heightInches) * 100}%`,
    ...(shape.fill ? { backgroundColor: shape.fill } : {}),
    ...(shape.line ? { border: `1px solid ${shape.line}` } : {}),
    ...(shape.line ? { color: shape.line } : {}),
    ...(shape.geometry === 'ellipse' ? { borderRadius: '50%' } : {}),
    ...(shape.geometry.toLowerCase().includes('round') ? { borderRadius: '4px' } : {}),
  };
}

function SlideArtwork({
  slide,
  values,
}: {
  slide: PresentationSlide;
  values: Record<string, string>;
}) {
  return (
    <div
      className="slide-artwork"
      style={{ backgroundColor: slide.background }}
    >
      {slide.shapes.map((shape, index) => (
        <div
          className={`ooxml-shape ${shape.geometry === 'line' ? 'line' : ''}`}
          key={`${shape.geometry}-${index}`}
          style={slideShapeStyle(shape, slide)}
        >
          {shape.text && (
            <span
              style={{
                color: shape.textStyle?.color ?? '#0A0A0A',
                fontFamily: shape.textStyle?.fontFace ?? 'Aptos, Arial, sans-serif',
                fontSize: `${((shape.textStyle?.fontSize ?? 12) / (72 * slide.widthInches)) * 100}cqw`,
                fontWeight: shape.textStyle?.bold ? 700 : 400,
                textAlign: (shape.textStyle?.align ?? 'left') as CSSProperties['textAlign'],
                justifyContent: (shape.textStyle?.align ?? 'left') as CSSProperties['justifyContent'],
                alignItems: shape.textStyle?.verticalAlign === 'middle'
                  ? 'center'
                  : shape.textStyle?.verticalAlign === 'bottom'
                    ? 'flex-end'
                    : 'flex-start',
              }}
            >
              {replacePreviewValues(shape.text, values)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Xem trước tài liệu Word bằng dữ liệu mô tả từ API.
 */
function DocumentPreview({
  name,
  sections,
  fields,
  values,
  blocks,
}: {
  name: string;
  sections: string[];
  fields: Field[];
  values: Record<string, string>;
  blocks?: DocumentBlock[];
}) {
  const visibleSections =
    sections.length > 0
      ? sections
      : ['Thông tin chung', 'Nội dung chính', 'Kết luận'];

  return (
    <section
      className="document-preview"
      aria-label="Xem trước tài liệu Word"
    >
      <div className="preview-heading">
        <div>
          <span className="eyebrow">XEM TRƯỚC TÀI LIỆU</span>
          <h2>Bản xem trước Word</h2>
        </div>

        <span className="preview-file-badge">DOCX</span>
      </div>

      <div className="document-stage">
        <article className={`document-page ${blocks?.length ? 'document-page-ooxml' : ''}`}>
          {!blocks?.length && (
            <>
              <div className="document-page-top">
                <span className="document-brand">PAPERTRAIL</span>
                <span className="document-page-type">TÀI LIỆU</span>
              </div>
              <div className="document-page-rule" />
            </>
          )}

          <div className="document-page-content">
            {blocks?.length ? blocks.map((block, index) => (
              block.type === 'table' ? (
                <div className="docx-table-wrap" key={`table-${index}`}>
                  <table className="docx-preview-table">
                    <tbody>
                      {block.rows.map((row, rowIndex) => (
                        <tr key={`row-${rowIndex}`}>
                          {row.map((cell, cellIndex) => {
                            const Cell = rowIndex === 0 ? 'th' : 'td';
                            return (
                              <Cell key={`cell-${cellIndex}`}>
                                {replacePreviewValues(cell, values)}
                              </Cell>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p
                  className={`docx-block docx-${block.role}`}
                  key={`paragraph-${index}`}
                >
                  {block.runs?.length
                    ? renderDocumentRuns(block.runs, block.text, values)
                    : replacePreviewValues(block.text, values)}
                </p>
              )
            )) : (
              <>
                <span className="document-kicker">BẢN XEM TRƯỚC</span>
                <h3>{name}</h3>
                <p className="document-placeholder">Bản xem trước nội dung theo các trường mẫu</p>
                {fields.slice(0, 6).map((field) => (
                  <div className="document-section-preview" key={field.key}>
                    <h4>{translateFieldLabel(field.label)}</h4>
                    <p className="document-placeholder">{values[field.key]?.trim() || 'Chưa có nội dung'}</p>
                  </div>
                ))}
                {visibleSections.map((section, index) => (
                  <section className="document-section-preview" key={`${section}-${index}`}>
                    <h4>{index + 1}. {section}</h4>
                    <div className="document-line" />
                    <div className="document-line" />
                    <div className="document-line document-line-medium" />
                  </section>
                ))}
              </>
            )}
          </div>

          {!blocks?.length && (
            <footer className="document-page-footer">
              <span>Papertrail</span>
              <span>Trang 1</span>
            </footer>
          )}
        </article>
      </div>

      <div className="document-preview-note">
        <span className="preview-status-dot" />
        <span>
          Nội dung và bảng được lấy từ chính tệp DOCX; dữ liệu thay đổi theo các trường bạn nhập. Cách phân trang có thể khác giữa Word và trình duyệt.
        </span>
      </div>

      <div className="document-outline">
        <div className="document-outline-heading">
          <h3>Cấu trúc tài liệu</h3>
          <span>{visibleSections.length} mục</span>
        </div>

        <ol>
          {visibleSections.map((section, index) => (
            <li key={`${section}-${index}`}>
              <span className="outline-number">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{section}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Xem trước PowerPoint với thumbnail có thể lựa chọn.
 */
function PresentationPreview({
  slides,
  values,
  renderSlides,
}: {
  slides: string[];
  values: Record<string, string>;
  renderSlides?: PresentationSlide[];
}) {
  const slideTitles = slides;

  const [activeSlide, setActiveSlide] = useState(0);

  const currentTitle = slideTitles[activeSlide] ?? 'Chưa có dữ liệu xem trước';
  const hasRenderedSlides = Boolean(
    renderSlides?.length && renderSlides.every((slide) => Array.isArray(slide.shapes)),
  );

  function previousSlide() {
    setActiveSlide((current) =>
      current > 0 ? current - 1 : slideTitles.length - 1,
    );
  }

  function nextSlide() {
    setActiveSlide((current) =>
      current < slideTitles.length - 1 ? current + 1 : 0,
    );
  }

  return (
    <section
      className="presentation-preview"
      aria-label="Xem trước bộ slide PowerPoint"
    >
      <div className="preview-heading">
        <div>
          <span className="eyebrow">XEM TRƯỚC BẢN TRÌNH CHIẾU</span>
          <h2>Xem trước bộ slide</h2>
        </div>

        <span className="preview-file-badge">PPTX</span>
      </div>

      <div className="slide-stage">
        {hasRenderedSlides && renderSlides?.[activeSlide] ? (
          <div className="slide-canvas slide-canvas-rendered">
            <SlideArtwork slide={renderSlides[activeSlide]} values={values} />
          </div>
        ) : (
          <div className="slide-preview-unavailable" role="status">
            <span className="preview-file-badge">SLIDE {activeSlide + 1}</span>
            <h3>{currentTitle}</h3>
            <p>
              Chưa có bản xem trước bố cục thực tế cho tệp này. Bạn vẫn có thể tạo
              bản sao PPTX để mở bằng PowerPoint hoặc ứng dụng tương thích.
            </p>
          </div>
        )}
      </div>

      <div className="slide-controls">
        <button
          type="button"
          className="slide-arrow"
          onClick={previousSlide}
          aria-label="Slide trước"
          disabled={slideTitles.length <= 1}
        >
          ←
        </button>

        <span>
          Slide <strong>{activeSlide + 1}</strong> / {slideTitles.length}
        </span>

        <button
          type="button"
          className="slide-arrow"
          onClick={nextSlide}
          aria-label="Slide tiếp theo"
          disabled={slideTitles.length <= 1}
        >
          →
        </button>
      </div>

      <div className="slide-thumbnails">
        {slideTitles.map((title, index) => (
          <button
            type="button"
            key={`${title}-${index}`}
            className={`slide-thumbnail ${activeSlide === index ? 'active' : ''
              }`}
            onClick={() => setActiveSlide(index)}
            aria-label={`Xem slide ${index + 1}: ${title}`}
            aria-pressed={activeSlide === index}
          >
            {hasRenderedSlides && renderSlides?.[index] ? (
              <div className="slide-thumbnail-paper slide-thumbnail-rendered">
                <SlideArtwork slide={renderSlides[index]} values={values} />
              </div>
            ) : (
              <div className="slide-thumbnail-paper slide-thumbnail-outline">
                <span>SLIDE {String(index + 1).padStart(2, '0')}</span>
                <strong>{title}</strong>
              </div>
            )}

            <span className="slide-thumbnail-label">
              {String(index + 1).padStart(2, '0')}. {title}
            </span>
          </button>
        ))}
      </div>

      <div className="document-preview-note">
        <span className="preview-status-dot" />
        <span>
          {hasRenderedSlides
            ? 'Nội dung, vị trí và màu của các thành phần được đọc từ slide PowerPoint gốc; trường mẫu cập nhật trực tiếp trong preview.'
            : 'Tệp này chưa có dữ liệu bố cục để dựng preview thực tế. Nội dung trên chỉ là danh sách tiêu đề slide.'}
        </span>
      </div>
    </section>
  );
}

export default function TemplateDetailPage() {
  const notify = useToast();
  const params = useParams<{ id: string }>();

  const [template, setTemplate] = useState<Template | null>(null);
  const [preview, setPreview] = useState<Template['preview'] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [generated, setGenerated] = useState<GeneratedDocument | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadTemplate() {
      setLoading(true);
      setError('');

      try {
        const [templateResponse, previewResponse] = await Promise.all([
          fetch(`${API}/api/templates/${params.id}`, { signal: controller.signal }),
          fetch(`${API}/api/templates/${params.id}/preview`, { signal: controller.signal }),
        ]);

        if (!templateResponse.ok) {
          throw new Error(templateResponse.status === 404
            ? 'Không tìm thấy mẫu này.'
            : 'Không thể tải thông tin mẫu. Vui lòng thử lại.');
        }
        if (!previewResponse.ok) {
          throw new Error('Không thể tải dữ liệu xem trước. Vui lòng thử lại.');
        }

        const [result, previewData] = await Promise.all([
          templateResponse.json() as Promise<Template>,
          previewResponse.json() as Promise<Template['preview']>,
        ]);

        setTemplate(result);
        setPreview(previewData);

        if (result.type === 'document') {
          const fields = previewData?.fields ?? [];

          setValues(
            Object.fromEntries(
              fields.map((field) => {
                const sampleValue = getSampleValue(
                  result.slug,
                  field.key,
                  field.label,
                  field.type,
                );

                return [
                  field.key,
                  sampleValue || field.placeholder || '',
                ];
              }),
            ),
          );
        } else {
          const fields = previewData?.fields ?? [];
          setValues(
            Object.fromEntries(
              fields.map((field) => {
                const sampleValue = getSampleValue(
                  result.slug,
                  field.key,
                  field.label,
                  field.type,
                );
                return [
                  field.key,
                  sampleValue || field.placeholder || '',
                ];
              }),
            ),
          );
        }
      } catch (cause: unknown) {
        if (!controller.signal.aborted) {
          const message = errorMessage(cause);
          setError(message);
          notify('error', message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTemplate();

    return () => controller.abort();
  }, [params.id, notify]);

  async function useTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!template) return;

    setBusy(true);
    setError('');
    setMessage('');
    setGenerated(null);

    try {
      const endpoint =
        template.type === 'document'
          ? `${API}/api/templates/${template.id}/documents`
          : `${API}/api/templates/${template.id}/copies`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values }),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof body.message === 'string'
            ? body.message
            : 'Không thể tạo tệp. Vui lòng thử lại.',
        );
      }

      let metadata: GeneratedDocument;
      let metadataLoaded = false;

      try {
        const metadataResponse = await fetch(`${API}/api/documents/${body.id}`);
        if (!metadataResponse.ok) {
          throw new Error('Không tải được thông tin tệp đã lưu.');
        }

        metadata = await metadataResponse.json();
        if (metadata.id !== body.id || metadata.downloadUrl !== body.downloadUrl) {
          throw new Error('Thông tin tệp trả về không khớp.');
        }
        metadataLoaded = true;
      } catch {
        // A successful generation response means the backend has already
        // persisted the record; retain its download details if metadata lookup
        // is temporarily unavailable.
        metadata = {
          id: body.id,
          templateId: template.id,
          name,
          fileType: isDocument ? 'docx' : 'pptx',
          fileName: body.fileName,
          downloadUrl: body.downloadUrl,
        };
      }

      setGenerated(metadata);
      setMessage(metadataLoaded
        ? `Đã tạo và lưu ${metadata.fileName}. Bạn có thể tải xuống bên dưới.`
        : `Đã tạo ${metadata.fileName}. Chi tiết lưu trữ tạm thời chưa tải được; bạn vẫn có thể tải tệp.`);
      notify('success', metadataLoaded
        ? `Tạo và lưu ${metadata.fileName} thành công.`
        : `Đã tạo ${metadata.fileName}; có thể tải xuống ngay.`);
    } catch (cause: unknown) {
      const message = errorMessage(cause);
      setError(message);
      notify('error', message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadGeneratedFile() {
    if (!generated) return;
    setDownloading(true);
    setDownloadError('');
    try {
      const response = await fetch(`${API}${generated.downloadUrl}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          typeof body?.message === 'string'
            ? body.message
            : 'Tệp không còn trên máy chủ. Vui lòng tạo lại từ mẫu.',
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = generated.fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('success', `Đang tải xuống ${generated.fileName}.`);
    } catch (cause: unknown) {
      const message = errorMessage(cause);
      setDownloadError(message);
      notify('error', message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="detail-shell">
        <Link href="/" className="back">
          ← Quay lại thư viện
        </Link>

        <div className="detail-loading">
          Đang tải thông tin mẫu…
        </div>
      </main>
    );
  }

  if (error && !template) {
    return (
      <main className="detail-shell">
        <Link href="/" className="back">
          ← Quay lại thư viện
        </Link>

        <div className="state error" role="alert">
          <strong>Không thể mở mẫu</strong>
          <span>{error}</span>
        </div>
      </main>
    );
  }

  if (!template) return null;

  const translatedTemplate = getTemplateCopy(template.slug);
  const name = translatedTemplate?.name ?? template.name;
  const description = translatedTemplate?.description ?? template.description;
  const category =
    translatedTemplate?.category ?? translateCategory(template.category);
  const activePreview = preview ?? template.preview;
  const sections = activePreview?.sections ?? activePreview?.slides ?? [];
  const isDocument = template.type === 'document';
  const typeLabel = isDocument ? 'Tài liệu Word' : 'Bản trình chiếu';
  const fields = activePreview?.fields ?? [];
  const primaryFields = fields.filter((field) => field.required);
  const additionalFields = fields.filter((field) => !field.required);
  const completedFieldCount = fields.filter((field) => Boolean(values[field.key]?.trim())).length;
  const completionPercent = fields.length
    ? Math.round((completedFieldCount / fields.length) * 100)
    : 0;

  function renderField(field: Field) {
    return (
      <label className="field" key={field.key}>
        {translateFieldLabel(field.label)}
        {field.required && <em> *</em>}

        {field.type === 'textarea' ? (
          <textarea
            required={field.required}
            maxLength={field.maxLength ?? 500}
            placeholder={field.placeholder}
            value={values[field.key] ?? ''}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))
            }
          />
        ) : (
          <input
            required={field.required}
            maxLength={field.maxLength ?? 500}
            type={field.type === 'email' ? 'email' : 'text'}
            placeholder={field.placeholder}
            value={values[field.key] ?? ''}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))
            }
          />
        )}
      </label>
    );
  }

  return (
    <main className="detail-shell">
      <header className="detail-top">
        <Link
          className="brand"
          href="/"
          aria-label="Papertrail - Trang chủ"
        >
          Papertrail
        </Link>

        <Link href="/" className="back">
          ← Tất cả mẫu
        </Link>

        <Link href="/documents" className="back">
          Tài liệu của tôi
        </Link>
      </header>

      <nav className="breadcrumbs" aria-label="Đường dẫn">
        <Link href="/">Thư viện</Link>
        <span>/</span>
        <span>{typeLabel}</span>
        <span>/</span>
        <strong>{name}</strong>
      </nav>

      <section className="detail-grid">
        <div className="detail-preview-column">
          {isDocument ? (
            <DocumentPreview
              name={name}
              sections={sections}
              fields={fields}
              values={values}
              blocks={activePreview?.renderPreview?.blocks}
            />
          ) : (
            <PresentationPreview
              key={template.id}
              slides={activePreview?.slides ?? sections}
              values={values}
              renderSlides={activePreview?.renderPreview?.slides}
            />
          )}

          <div className="outline">
            <div className="eyebrow">
              {isDocument
                ? 'NỘI DUNG TÀI LIỆU'
                : `${activePreview?.slideCount ?? sections.length} SLIDE`}
            </div>

            <h2>
              {isDocument
                ? 'Mẫu này gồm có'
                : 'Tổng quan bộ slide'}
            </h2>

            {sections.length > 0 ? (
              <ol>
                {sections.map((section, index) => (
                  <li key={`${section}-${index}`}>{section}</li>
                ))}
              </ol>
            ) : (
              <p>Chưa có thông tin chi tiết về cấu trúc mẫu.</p>
            )}
          </div>
        </div>

        <aside className="detail-panel">
          <div className="detail-panel-topline">
            <div className="meta">
              <span>{category}</span>
              <span>{typeLabel.toLocaleUpperCase('vi-VN')}</span>
            </div>
            <span className="template-ready"><i aria-hidden="true" /> Mẫu có sẵn</span>
          </div>

          <h1>{name}</h1>
          <p>{description}</p>

          <div className="panel-rule" />

          <h2>
            {isDocument
              ? 'Thông tin tài liệu'
              : 'Thông tin trình chiếu'}
          </h2>

          <p className="subcopy">
            {isDocument
              ? 'Các trường đã được điền sẵn dữ liệu mẫu. Bạn chỉ cần chỉnh sửa thông tin cần thiết rồi tải xuống.'
              : 'Chỉnh sửa các trường trong slide, sau đó tạo một bản PowerPoint riêng để tải xuống.'}
          </p>

          <form onSubmit={useTemplate}>
            {fields.length > 0 && (
              <>
                <div className="sample-note">
                  <div className="field-progress-heading">
                    <strong>Dữ liệu mẫu đã điền</strong>
                    <span>{completedFieldCount}/{fields.length} trường</span>
                  </div>
                  <div className="field-progress" aria-label={`Đã điền ${completionPercent}% trường`}>
                    <span style={{ width: `${completionPercent}%` }} />
                  </div>
                  <p>Kiểm tra nội dung bên dưới. Bạn có thể dùng dữ liệu mẫu hoặc thay bằng thông tin của mình.</p>
                </div>

                {primaryFields.map(renderField)}

                {additionalFields.length > 0 && (
                  <details className="extra-fields">
                    <summary>
                      Tùy chỉnh thêm {additionalFields.length} trường không
                      bắt buộc
                    </summary>

                    <div className="extra-fields-list">
                      {additionalFields.map(renderField)}
                    </div>
                  </details>
                )}
              </>
            )}

            {error && (
              <div className="inline-error" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="inline-success" role="status">
                {message}
              </div>
            )}

            {generated && (
              <div className="inline-success generated-file" aria-label="Thông tin tệp đã tạo">
                <strong>{generated.name}</strong>
                <span>{generated.fileName}</span>
                <button
                  className="use-template"
                  type="button"
                  onClick={() => void downloadGeneratedFile()}
                  disabled={downloading}
                >
                  {downloading ? 'Đang tải tệp…' : `Tải xuống ${generated.fileType.toUpperCase()}`}
                  <span aria-hidden="true">↓</span>
                </button>
                {downloadError && <span role="alert">{downloadError}</span>}
                <small>
                  {generated.createdAt
                    ? `Đã lưu lúc ${new Date(generated.createdAt).toLocaleString('vi-VN')}`
                    : 'Tệp được lưu qua yêu cầu tạo mẫu'}
                </small>
              </div>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={busy}
            >
              {busy
                ? 'Đang chuẩn bị tệp…'
                : `Tạo ${isDocument ? 'tài liệu DOCX' : 'bản sao PPTX'}`}
              <span>→</span>
            </button>
          </form>

          <small className="privacy-note">
            Tệp tải xuống là bản riêng; mẫu gốc được giữ nguyên.
          </small>
        </aside>
      </section>
    </main>
  );
}
