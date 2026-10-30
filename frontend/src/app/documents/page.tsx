'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../components/ToastProvider';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

type SavedDocument = {
  id: string;
  templateId: number;
  templateName?: string;
  templateType?: 'document' | 'presentation';
  name: string;
  fileType: 'docx' | 'pptx';
  fileName: string;
  downloadUrl: string;
  createdAt: string;
};

export default function DocumentsPage() {
  const notify = useToast();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');

  const loadDocuments = useCallback(async (signal?: AbortSignal, showSuccess = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API}/api/documents`, { signal });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof body?.message === 'string'
            ? body.message
            : 'Không thể tải danh sách tài liệu đã tạo.',
        );
      }
      if (!Array.isArray(body)) {
        throw new Error('Máy chủ trả về danh sách tài liệu không hợp lệ.');
      }
      setDocuments(body);
      if (showSuccess) notify('success', 'Đã tải lại danh sách tài liệu.');
    } catch (cause) {
      if (signal?.aborted) return;
      const message =
        cause instanceof TypeError
          ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.'
          : cause instanceof Error
            ? cause.message
            : 'Đã xảy ra lỗi khi tải dữ liệu.';
      setError(message);
      notify('error', message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [notify]);

  async function downloadDocument(document: SavedDocument) {
    setDownloadingId(document.id);
    setDownloadError('');
    try {
      const response = await fetch(`${API}${document.downloadUrl}`);
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
      link.download = document.fileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      notify('success', `Đang tải xuống ${document.fileName}.`);
    } catch (cause) {
      const message =
        cause instanceof TypeError
          ? 'Không thể kết nối để tải tệp. Vui lòng kiểm tra backend.'
          : cause instanceof Error
            ? cause.message
            : 'Không thể tải tệp. Vui lòng thử lại.';
      setDownloadError(message);
      notify('error', message);
    } finally {
      setDownloadingId('');
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadDocuments(controller.signal);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadDocuments]);

  return (
    <main className="sidebar-layout">
      <aside className="sidebar">
        <Link className="sidebar-brand" href="/" aria-label="Papertrail - Trang chủ">
          Papertrail
        </Link>
        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <span className="sidebar-label">THƯ VIỆN</span>
          <Link className="sidebar-link" href="/">
            <span className="sidebar-icon" aria-hidden="true">▦</span>
            <span>Khám phá mẫu</span>
          </Link>
        </div>
        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <span className="sidebar-label">CÁ NHÂN</span>
          <Link className="sidebar-link active" href="/documents" aria-current="page">
            <span className="sidebar-icon" aria-hidden="true">▣</span>
            <span>Tài liệu của tôi</span>
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-mark">P</div>
          <div>
            <strong>Papertrail</strong>
            <span>Tài liệu đã tạo</span>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="content-topbar">
          <div className="breadcrumb">
            <Link href="/">Thư viện</Link>
            <span className="breadcrumb-separator">/</span>
            <strong>Tài liệu của tôi</strong>
          </div>
          <span className="top-note">Các tệp bạn đã tạo trên Papertrail</span>
        </header>

        <section className="documents-main">
          <div className="library-intro">
            <div>
              <div className="eyebrow">PAPERTRAIL / KHÔNG GIAN CỦA BẠN</div>
              <h1>Tài liệu của tôi</h1>
              <p>Các tài liệu Word và bản trình chiếu được tạo từ thư viện mẫu.</p>
            </div>
            <Link className="primary-button documents-browse-button" href="/">
              Tạo tài liệu mới
            </Link>
          </div>

          {loading ? (
            <div className="documents-state" role="status">Đang tải tài liệu đã lưu…</div>
          ) : error ? (
            <div className="state error" role="alert">
              <strong>Không thể tải tài liệu</strong>
              <span>{error}</span>
              <button type="button" onClick={() => void loadDocuments(undefined, true)}>Thử lại</button>
            </div>
          ) : documents.length === 0 ? (
            <div className="state documents-empty">
              <span className="documents-empty-mark" aria-hidden="true">▤</span>
              <strong>Bạn chưa tạo tài liệu nào</strong>
              <span>Chọn một mẫu trong thư viện để bắt đầu. Tệp được tạo sẽ xuất hiện tại đây.</span>
              <Link className="primary-button" href="/">Khám phá thư viện mẫu</Link>
            </div>
          ) : (
            <>
              {downloadError && <div className="inline-error" role="alert">{downloadError}</div>}
              <div className="documents-list-heading">
                <h2>Tệp đã tạo</h2>
                <span>{documents.length} {documents.length === 1 ? 'tài liệu' : 'tài liệu'}</span>
              </div>
              <div className="documents-list">
                {documents.map((document) => (
                  <article className="saved-document" key={document.id}>
                    <div className={`saved-document-icon ${document.fileType}`} aria-hidden="true">
                      {document.fileType.toUpperCase()}
                    </div>
                    <div className="saved-document-details">
                      <h3>{document.name}</h3>
                      <p>
                        Mẫu: {document.templateName ?? `#${document.templateId}`}
                        <span aria-hidden="true"> · </span>
                        {document.templateType === 'presentation' ? 'Bản trình chiếu' : 'Tài liệu Word'}
                      </p>
                      <time dateTime={document.createdAt}>
                        {new Intl.DateTimeFormat('vi-VN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(document.createdAt))}
                      </time>
                    </div>
                    <button
                      type="button"
                      className="saved-document-download"
                      onClick={() => void downloadDocument(document)}
                      disabled={downloadingId === document.id}
                      aria-label={`Tải ${document.fileName}`}
                    >
                      {downloadingId === document.id ? 'Đang tải…' : `Tải ${document.fileType.toUpperCase()}`} <span aria-hidden="true">↓</span>
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
