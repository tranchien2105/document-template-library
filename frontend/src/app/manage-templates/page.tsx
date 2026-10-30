'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../components/ToastProvider';

const API = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

type CreatedTemplate = { id: number; name: string; slug: string };
type ManagedTemplate = {
  id: number;
  name: string;
  slug: string;
  description: string;
  category: string;
  type: TemplateType;
};
type TemplateType = 'document' | 'presentation';

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi-VN')
    .trim();
}

export default function ManageTemplatesPage() {
  const notify = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Tài liệu');
  const [type, setType] = useState<TemplateType>('document');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<CreatedTemplate | null>(null);
  const [templates, setTemplates] = useState<ManagedTemplate[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TemplateType>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [listBusy, setListBusy] = useState(true);
  const [listError, setListError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState({ name: '', description: '', category: '' });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [manageMessage, setManageMessage] = useState('');

  const loadTemplates = useCallback(async (showSuccess = false) => {
    setListBusy(true);
    setListError('');
    try {
      const firstResponse = await fetch(`${API}/api/templates?page=1&limit=60`);
      const firstBody = await firstResponse.json().catch(() => null);
      if (!firstResponse.ok) {
        throw new Error(typeof firstBody?.message === 'string' ? firstBody.message : 'Không thể tải danh sách mẫu.');
      }
      const allTemplates = [...(firstBody?.items ?? [])] as ManagedTemplate[];
      const totalPages = Math.max(1, Number(firstBody?.meta?.totalPages ?? 1));

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await fetch(`${API}/api/templates?page=${page}&limit=60`);
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(typeof body?.message === 'string' ? body.message : 'Không thể tải đầy đủ danh sách mẫu.');
        }
        allTemplates.push(...((body?.items ?? []) as ManagedTemplate[]));
      }

      setTemplates(allTemplates);
      if (showSuccess) notify('success', 'Đã cập nhật danh sách mẫu.');
    } catch (cause) {
      const message = cause instanceof TypeError
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.'
        : cause instanceof Error ? cause.message : 'Không thể tải danh sách mẫu.';
      setListError(message);
      notify('error', message);
    } finally {
      setListBusy(false);
    }
  }, [notify]);

  const categories = useMemo(
    () => [...new Set(templates.map((template) => template.category))]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'vi')),
    [templates],
  );

  const filteredTemplates = useMemo(() => {
    const query = normalizeSearch(templateSearch);

    return templates.filter((template) => {
      const matchesType = typeFilter === 'all' || template.type === typeFilter;
      const matchesCategory = !categoryFilter || template.category === categoryFilter;
      const searchableText = normalizeSearch(
        `${template.name} ${template.description} ${template.category} ${template.slug}`,
      );
      return matchesType && matchesCategory && (!query || searchableText.includes(query));
    });
  }, [templates, templateSearch, typeFilter, categoryFilter]);

  const hasActiveFilters = Boolean(templateSearch || typeFilter !== 'all' || categoryFilter);

  function clearTemplateFilters() {
    setTemplateSearch('');
    setTypeFilter('all');
    setCategoryFilter('');
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTemplates(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTemplates]);

  function beginEdit(template: ManagedTemplate) {
    setEditingId(template.id);
    setEditValues({
      name: template.name,
      description: template.description,
      category: template.category,
    });
    setManageMessage('');
    setThumbnailFile(null);
    notify('success', 'Đang chỉnh sửa thông tin mẫu.');
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, id: number) {
    event.preventDefault();
    setSavingId(id);
    setManageMessage('');
    setListError('');
    try {
      const response = await fetch(`${API}/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof body?.message === 'string' ? body.message : 'Không thể cập nhật mẫu.');
      }
      if (thumbnailFile) {
        const imageData = new FormData();
        imageData.set('file', thumbnailFile);
        const imageResponse = await fetch(`${API}/api/templates/${id}/thumbnail`, {
          method: 'POST',
          body: imageData,
        });
        const imageBody = await imageResponse.json().catch(() => null);
        if (!imageResponse.ok) {
          throw new Error(
            typeof imageBody?.message === 'string'
              ? `Thông tin mẫu đã lưu nhưng ảnh chưa cập nhật: ${imageBody.message}`
              : 'Thông tin mẫu đã lưu nhưng ảnh thumbnail chưa cập nhật được.',
          );
        }
      }
      setTemplates((current) => current.map((template) => template.id === id
        ? { ...template, name: body.name, description: body.description, category: body.category }
        : template));
      if (categoryFilter && categoryFilter !== body.category) setCategoryFilter('');
      setEditingId(null);
      setThumbnailFile(null);
      const message = 'Đã cập nhật thông tin mẫu.';
      setManageMessage(message);
      notify('success', message);
    } catch (cause) {
      const message = cause instanceof TypeError
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.'
        : cause instanceof Error ? cause.message : 'Không thể cập nhật mẫu.';
      setListError(message);
      notify('error', message);
    } finally {
      setSavingId(null);
    }
  }

  async function removeTemplate(template: ManagedTemplate) {
    const confirmed = window.confirm(
      `Xóa “${template.name}” khỏi thư viện? Tệp mẫu gốc sẽ được giữ lại trên máy chủ.`,
    );
    if (!confirmed) return;

    setRemovingId(template.id);
    setManageMessage('');
    setListError('');
    try {
      const response = await fetch(`${API}/api/templates/${template.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof body?.message === 'string' ? body.message : 'Không thể xóa mẫu.');
      }
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (editingId === template.id) setEditingId(null);
      const message = 'Đã xóa mẫu khỏi thư viện. Tệp gốc vẫn được lưu trên máy chủ.';
      setManageMessage(message);
      notify('success', message);
    } catch (cause) {
      const message = cause instanceof TypeError
        ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.'
        : cause instanceof Error ? cause.message : 'Không thể xóa mẫu.';
      setListError(message);
      notify('error', message);
    } finally {
      setRemovingId(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setCreated(null);
    try {
      if (!file) throw new Error(`Chọn tệp ${type === 'document' ? 'DOCX' : 'PPTX'} cần tải lên.`);
      const formData = new FormData();
      formData.set('name', name);
      formData.set('description', description);
      formData.set('category', category);
      formData.set('file', file);

      const uploadPath = type === 'document' ? '/api/templates' : '/api/templates/presentations';
      const response = await fetch(`${API}${uploadPath}`, {
        method: 'POST',
        body: formData,
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof body?.message === 'string'
            ? body.message
            : 'Không thể lưu mẫu. Vui lòng kiểm tra thông tin và thử lại.',
        );
      }
      setCreated(body as CreatedTemplate);
      notify('success', `Đã thêm mẫu “${body.name}” vào thư viện.`);
      void loadTemplates();
      setName('');
      setDescription('');
      setFile(null);
      const input = document.getElementById('template-file') as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (cause) {
      const message =
        cause instanceof TypeError
          ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.'
          : cause instanceof Error
            ? cause.message
            : 'Đã xảy ra lỗi khi tải mẫu.';
      setError(message);
      notify('error', message);
    } finally {
      setBusy(false);
    }
  }

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
          <Link className="sidebar-link" href="/documents">
            <span className="sidebar-icon" aria-hidden="true">▣</span>
            <span>Tài liệu của tôi</span>
          </Link>
          <Link className="sidebar-link active" href="/manage-templates" aria-current="page">
            <span className="sidebar-icon" aria-hidden="true">＋</span>
            <span>Quản lý mẫu</span>
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-bottom-mark">P</div>
          <div>
            <strong>Papertrail</strong>
            <span>Thư viện mẫu tài liệu</span>
          </div>
        </div>
      </aside>

      <div className="main-panel">
        <header className="content-topbar">
          <div className="breadcrumb">
            <Link href="/">Thư viện</Link>
            <span className="breadcrumb-separator">/</span>
            <strong>Quản lý mẫu</strong>
          </div>
          <Link className="topbar-link" href="/documents">Tài liệu của tôi</Link>
        </header>

        <section className="documents-main">
          <div className="library-intro">
            <div>
              <div className="eyebrow">PAPERTRAIL / QUẢN LÝ NỘI DUNG</div>
              <h1>Thêm mẫu vào thư viện</h1>
              <p>Thêm mẫu Word hoặc PowerPoint mới. Thông tin mẫu được lưu cùng dữ liệu xem trước để thư viện tự động hiển thị.</p>
            </div>
          </div>

          <form className="manage-template-form" onSubmit={submit}>
            <label className="field">
              Loại mẫu
              <select value={type} onChange={(event) => {
                setType(event.target.value as TemplateType);
                setFile(null);
              }}>
                <option value="document">Tài liệu Word (DOCX)</option>
                <option value="presentation">Bản trình chiếu (PPTX)</option>
              </select>
            </label>
            <label className="field">
              Tên mẫu
              <input required maxLength={180} value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              Mô tả
              <textarea required maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <label className="field">
              Danh mục
              <input required maxLength={100} value={category} onChange={(event) => setCategory(event.target.value)} />
            </label>
            <label className="field">
              Tệp {type === 'document' ? 'DOCX' : 'PPTX'}
              <input
                id="template-file"
                key={type}
                required
                type="file"
                accept={type === 'document'
                  ? '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  : '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation'}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
              <small>
                Giới hạn 10 MB. {type === 'document'
                  ? <>Tệp phải là gói DOCX hợp lệ và có ít nhất một placeholder như {'{{ho_ten}}'}.</>
                  : 'Tệp phải là gói PPTX hợp lệ; Papertrail sẽ đọc số lượng slide và tiêu đề để tạo preview.'}
              </small>
            </label>

            {error && <div className="inline-error" role="alert">{error}</div>}
            {created && (
              <div className="inline-success" role="status">
                <strong>Đã thêm mẫu vào thư viện.</strong>
                <span> Mẫu đã được lưu trên máy chủ và sẽ còn sau khi khởi động lại.</span>
                <div className="manage-template-actions">
                  <Link href={`/templates/${created.id}`}>Mở mẫu</Link>
                  <Link href="/">Quay lại thư viện</Link>
                </div>
              </div>
            )}

            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? 'Đang kiểm tra và lưu mẫu…' : 'Tải mẫu lên'}
            </button>
            <p className="privacy-note">Tệp mẫu gốc được lưu riêng. DOCX giữ định dạng cơ bản khi thay thế trường; PPTX được sao chép thành tệp độc lập.</p>
          </form>

          <section className="managed-templates" aria-labelledby="managed-templates-title">
            <div className="managed-templates-heading">
              <div>
                <div className="eyebrow">DANH SÁCH MẪU</div>
                <h2 id="managed-templates-title">Sửa hoặc xóa mẫu</h2>
                <p>Thay đổi tên, mô tả, danh mục hoặc gỡ mẫu khỏi thư viện. Dùng bộ lọc để tìm mẫu nhanh hơn.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => void loadTemplates(true)} disabled={listBusy}>
                {listBusy ? 'Đang tải…' : 'Làm mới'}
              </button>
            </div>

            {listError && <div className="inline-error" role="alert">{listError}</div>}
            {manageMessage && <div className="inline-success" role="status">{manageMessage}</div>}

            <div className="managed-template-filters" aria-label="Lọc danh sách mẫu">
              <label className="field">
                Tìm mẫu
                <input
                  type="search"
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  placeholder="Nhập tên, mô tả hoặc danh mục…"
                  aria-label="Tìm mẫu theo tên, mô tả hoặc danh mục"
                />
              </label>
              <label className="field">
                Loại mẫu
                <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as 'all' | TemplateType)}>
                  <option value="all">Tất cả loại</option>
                  <option value="document">Tài liệu Word</option>
                  <option value="presentation">Bản trình chiếu</option>
                </select>
              </label>
              <label className="field">
                Danh mục
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="">Tất cả danh mục</option>
                  {categories.map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </label>
              {hasActiveFilters && (
                <button className="secondary-button managed-filter-clear" type="button" onClick={clearTemplateFilters}>
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {!listBusy && !listError && (
              <p className="managed-filter-count" aria-live="polite">
                Đang hiển thị <strong>{filteredTemplates.length}</strong> / {templates.length} mẫu
              </p>
            )}

            {listBusy ? (
              <div className="documents-state" role="status">Đang tải danh sách mẫu…</div>
            ) : templates.length === 0 ? (
              <div className="documents-state">Chưa có mẫu nào trong thư viện.</div>
            ) : filteredTemplates.length === 0 ? (
              <div className="documents-state">
                <p>Không tìm thấy mẫu phù hợp với bộ lọc hiện tại.</p>
                <button className="secondary-button" type="button" onClick={clearTemplateFilters}>Xóa bộ lọc</button>
              </div>
            ) : (
              <div className="managed-template-list">
                {filteredTemplates.map((template) => (
                  <article className="managed-template" key={template.id}>
                    {editingId === template.id ? (
                      <form className="managed-template-edit" onSubmit={(event) => void saveEdit(event, template.id)}>
                        <label className="field">
                          Tên mẫu
                          <input required maxLength={180} value={editValues.name} onChange={(event) => setEditValues((current) => ({ ...current, name: event.target.value }))} />
                        </label>
                        <label className="field">
                          Mô tả
                          <textarea required maxLength={2000} value={editValues.description} onChange={(event) => setEditValues((current) => ({ ...current, description: event.target.value }))} />
                        </label>
                        <label className="field">
                          Danh mục
                          <input required maxLength={100} value={editValues.category} onChange={(event) => setEditValues((current) => ({ ...current, category: event.target.value }))} />
                        </label>
                        <label className="field">
                          Ảnh thumbnail
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                            onChange={(event) => setThumbnailFile(event.target.files?.[0] ?? null)}
                          />
                          <small>Chọn ảnh PNG, JPG hoặc WebP, tối đa 5 MB. Để trống nếu chỉ sửa thông tin.</small>
                        </label>
                        <div className="thumbnail-edit-preview">
                          <Image
                            src={`${API}/api/templates/${template.id}/thumbnail`}
                            alt={`Thumbnail hiện tại của ${template.name}`}
                            fill
                            sizes="240px"
                            unoptimized
                          />
                          <span>{thumbnailFile ? `Ảnh mới: ${thumbnailFile.name}` : 'Thumbnail hiện tại'}</span>
                        </div>
                        <div className="managed-template-actions">
                          <button className="primary-button" type="submit" disabled={savingId === template.id}>
                            {savingId === template.id ? 'Đang lưu…' : 'Lưu thay đổi'}
                          </button>
                          <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setThumbnailFile(null); }} disabled={savingId === template.id}>
                            Hủy
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="managed-template-info">
                          <div className="meta">
                            <span>{template.type === 'document' ? 'TÀI LIỆU WORD' : 'BẢN TRÌNH CHIẾU'}</span>
                            <span>{template.category}</span>
                          </div>
                          <h3>{template.name}</h3>
                          <p>{template.description}</p>
                        </div>
                        <div className="managed-template-actions">
                          <Link className="secondary-button" href={`/templates/${template.id}`}>Xem mẫu</Link>
                          <button className="secondary-button" type="button" onClick={() => beginEdit(template)}>Sửa</button>
                          <button className="danger-button" type="button" onClick={() => void removeTemplate(template)} disabled={removingId === template.id}>
                            {removingId === template.id ? 'Đang xóa…' : 'Xóa khỏi thư viện'}
                          </button>
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
