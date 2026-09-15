"use client";

import styles from "./Pagination.module.css";

interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  /** Plural noun for the summary line, e.g. "problems". */
  itemLabel?: string;
  /** Disables every control, e.g. while the next page is loading. */
  disabled?: boolean;
}

// Page numbers to render: the first and last page plus the current page and
// its neighbours, with `null` marking a gap — so a 40-page list shows
// "1 … 11 12 13 … 40" instead of 40 buttons.
const pageWindow = (page: number, pageCount: number): (number | null)[] => {
  const pages = [...new Set([1, page - 1, page, page + 1, pageCount])].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  const result: (number | null)[] = [];
  pages.forEach((value, index) => {
    if (index > 0 && value - pages[index - 1] > 1) result.push(null);
    result.push(value);
  });
  return result;
};

/** Summary line ("Showing 21–40 of 312 problems") plus previous/next and page-number controls. */
export function Pagination({ page, pageSize, total, onPageChange, itemLabel = "items", disabled = false }: PaginationProps) {
  if (total <= 0) return null;

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const first = (currentPage - 1) * pageSize + 1;
  const last = Math.min(currentPage * pageSize, total);

  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <p className={styles.summary}>
        Showing {first}–{last} of {total} {itemLabel}
      </p>
      {pageCount > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.step} onClick={() => onPageChange(currentPage - 1)} disabled={disabled || currentPage <= 1}>
            <span aria-hidden="true">←</span> Prev
          </button>
          {pageWindow(currentPage, pageCount).map((value, index) =>
            value === null ? (
              <span key={`gap-${index}`} className={styles.gap} aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={value}
                type="button"
                className={`${styles.page}${value === currentPage ? ` ${styles.current}` : ""}`}
                aria-label={`Page ${value}`}
                aria-current={value === currentPage ? "page" : undefined}
                onClick={() => onPageChange(value)}
                disabled={disabled || value === currentPage}
              >
                {value}
              </button>
            ),
          )}
          <button type="button" className={styles.step} onClick={() => onPageChange(currentPage + 1)} disabled={disabled || currentPage >= pageCount}>
            Next <span aria-hidden="true">→</span>
          </button>
        </div>
      )}
    </nav>
  );
}
