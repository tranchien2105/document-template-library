
'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useToast } from '../components/ToastProvider';
import { getTemplateCopy, translateCategory } from '../lib/translations';

type Template = {
  id: number;
  slug: string;
  name: string;
  description: string;
  type: 'document' | 'presentation';
  category: string;
  preview: {
    kind?: string;
    sections?: string[];
    slides?: string[];
    slideCount?: number;
  };
};

type Result = {
  items: Template[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const API =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

function displayName(template: Template) {
  return getTemplateCopy(template.slug)?.name ?? template.name;
}

function displayDescription(template: Template) {
  return getTemplateCopy(template.slug)?.description ?? template.description;
}

export default function HomePage() {
  const notify = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load categories directly from the API.
  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API}/api/templates/categories`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Không thể tải danh mục.');
        }

        return response.json();
      })
      .then((data: string[]) => {
        setCategories(data);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setCategories([]);
          notify('error', cause instanceof TypeError
            ? 'Không thể kết nối đến máy chủ để tải danh mục.'
            : cause instanceof Error
              ? cause.message
              : 'Không thể tải danh mục mẫu.');
        }
      });

    return () => controller.abort();
  }, [notify]);

  // Load templates with search, category, type and pagination.
  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: '9',
        });

        if (type) params.set('type', type);
        if (category) params.set('category', category);
        if (search.trim()) params.set('search', search.trim());

        const response = await fetch(
          `${API}/api/templates?${params}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(
            'Không thể tải danh sách mẫu. Vui lòng thử lại.',
          );
        }

        const result: Result = await response.json();

        setItems(result.items);
        setTotal(result.meta.total);
        setTotalPages(Math.max(1, result.meta.totalPages));
      } catch (cause: unknown) {
        if (controller.signal.aborted) return;

        const message = cause instanceof TypeError
          ? 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend.'
          : cause instanceof Error
            ? cause.message
            : 'Đã xảy ra lỗi khi tải danh sách mẫu.';
        setError(message);
        notify('error', message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, category, search, page, refresh, notify]);

  function changeType(value: string) {
    setType(value);
    setPage(1);
  }

  function changeCategory(value: string) {
    setCategory(value);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setCategory('');
    setType('');
    setPage(1);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
  }

  return (
    <main className="sidebar-layout">
      <aside className="sidebar">
        <Link
          className="sidebar-brand"
          href="/"
          aria-label="Papertrail - Trang chủ"
        >
          Papertrail
        </Link>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <span className="sidebar-label">THƯ VIỆN</span>

          <button
            type="button"
            className={`sidebar-link ${!type ? 'active' : ''}`}
            onClick={() => {
              setType('');
              setCategory('');
              setPage(1);
            }}
          >
            <span className="sidebar-icon">▦</span>
            <span>Tất cả mẫu</span>
            <span className="sidebar-count">{total}</span>
          </button>

          <button
            type="button"
            className={`sidebar-link ${type === 'document' ? 'active' : ''
              }`}
            onClick={() => changeType('document')}
          >
            <span className="sidebar-icon">▤</span>
            <span>Tài liệu Word</span>
          </button>

          <button
            type="button"
            className={`sidebar-link ${type === 'presentation' ? 'active' : ''
              }`}
            onClick={() => changeType('presentation')}
          >
            <span className="sidebar-icon">▧</span>
            <span>Bản trình chiếu</span>
          </button>
        </div>

        <div className="sidebar-divider" />
        <div className="sidebar-section">
          <span className="sidebar-label">CÁ NHÂN</span>
          <Link className="sidebar-link" href="/documents">
            <span className="sidebar-icon" aria-hidden="true">▣</span>
            <span>Tài liệu của tôi</span>
          </Link>
          <Link className="sidebar-link" href="/manage-templates">
            <span className="sidebar-icon" aria-hidden="true">＋</span>
            <span>Quản lý mẫu</span>
          </Link>
        </div>

        <div className="sidebar-divider" />

        <div className="sidebar-section">
          <span className="sidebar-label">DANH MỤC</span>

          <button
            type="button"
            className={`sidebar-link ${!category ? 'active' : ''
              }`}
            onClick={() => changeCategory('')}
          >
            <span className="sidebar-category-dot" />
            <span>Tất cả danh mục</span>
          </button>

          {categories.map((value) => (
            <button
              type="button"
              key={value}
              className={`sidebar-link ${category === value ? 'active' : ''
                }`}
              onClick={() => changeCategory(value)}
              title={value}
            >
              <span className="sidebar-category-dot" />
              <span className="sidebar-link-text">{translateCategory(value)}</span>
            </button>
          ))}
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
            <span>Thư viện</span>
            <span className="breadcrumb-separator">/</span>
            <strong>
              {category
                ? translateCategory(category)
                : type === 'document'
                  ? 'Tài liệu Word'
                  : type === 'presentation'
                    ? 'Bản trình chiếu'
                    : 'Tất cả mẫu'}
            </strong>
          </div>

          <span className="top-note">Mẫu rõ ràng. Công việc hiệu quả.</span>
          <Link className="topbar-link" href="/documents">
            Tài liệu của tôi
          </Link>
        </header>

        <section className="library-main" id="thu-vien">
          <div className="library-intro">
            <div>
              <div className="eyebrow">
                PAPERTRAIL / THƯ VIỆN MẪU
              </div>

              <h1>Thư viện mẫu tài liệu</h1>

              <p>
                Tìm kiếm, xem trước và chọn mẫu phù hợp với công việc của bạn.
              </p>
            </div>
          </div>

          <form className="search" onSubmit={submit}>
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>

            <input
              aria-label="Tìm kiếm mẫu tài liệu"
              placeholder="Tìm báo cáo, hồ sơ, kế hoạch..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            {search && (
              <button
                className="clear-search"
                type="button"
                aria-label="Xóa nội dung tìm kiếm"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                ×
              </button>
            )}

            <button
              className="search-submit"
              type="submit"
              aria-label="Tìm kiếm"
            >
              ↵
            </button>
          </form>

          <div className="library-toolbar">
            <div className="library-toolbar-title">
              <h2>
                {search.trim()
                  ? 'Kết quả tìm kiếm'
                  : category
                    ? translateCategory(category)
                    : type === 'document'
                      ? 'Mẫu tài liệu Word'
                      : type === 'presentation'
                        ? 'Mẫu bản trình chiếu'
                        : 'Tất cả mẫu'}
              </h2>

              <span className="result-count">
                {loading ? 'Đang tải...' : `${total} mẫu`}
              </span>
            </div>

            {(search || category || type) && (
              <button
                className="clear-filters"
                type="button"
                onClick={clearFilters}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {error ? (
            <div className="state error" role="alert">
              <strong>Không thể tải danh sách mẫu</strong>
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setRefresh((value) => value + 1)}
              >
                Thử lại
              </button>

              <small>Địa chỉ API: {API}</small>
            </div>
          ) : loading ? (
            <div className="grid" aria-label="Đang tải mẫu">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="skeleton" key={index} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="state">
              <strong>Không tìm thấy mẫu phù hợp</strong>
              <span>
                Thử từ khóa khác hoặc bỏ bớt bộ lọc.
              </span>

              <button type="button" onClick={clearFilters}>
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid">
              {items.map((item, index) => (
                <article className="card" key={item.id}>
                  <Link
                    className={`thumb theme-${index % 4}`}
                    href={`/templates/${item.id}`}
                    aria-label={`Xem trước ${displayName(item)}`}
                  >
                    <Image
                      className="template-thumbnail"
                      src={`${API}/api/templates/${item.id}/thumbnail`}
                      alt={`Ảnh xem trước ${displayName(item)}`}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw"
                      unoptimized
                    />
                    <span className="filetype">
                      {item.type === 'document' ? 'DOCX' : 'PPTX'}
                    </span>

                    <span className="thumb-caption">
                      ẢNH MINH HỌA ↗
                    </span>
                  </Link>

                  <div className="card-content">
                    <div className="meta">
                      <span>{translateCategory(item.category)}</span>
                      <span>
                        {item.type === 'document'
                          ? 'TÀI LIỆU WORD'
                          : 'BẢN TRÌNH CHIẾU'}
                      </span>
                    </div>

                    <h3>
                      <Link href={`/templates/${item.id}`}>
                        {displayName(item)}
                      </Link>
                    </h3>

                    <p>{displayDescription(item)}</p>

                    <div className="card-actions">
                      <span className="format">
                        {item.type === 'document'
                          ? 'Tệp Word'
                          : 'Tệp PowerPoint'}
                      </span>
                    </div>

                    <Link
                      className="use-template"
                      href={`/templates/${item.id}`}
                    >
                      Sử dụng mẫu
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!loading && !error && totalPages > 1 && (
            <nav className="pagination" aria-label="Phân trang">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                ← Trang trước
              </button>

              <span>
                Trang {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Trang sau →
              </button>
            </nav>
          )}

          <footer className="main-footer">
            <span>Papertrail</span>
            <span>Mẫu rõ ràng. Công việc hiệu quả.</span>
            <span>© 2026</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
