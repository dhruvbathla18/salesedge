export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MIN_LIMIT = 1;
export const MAX_LIMIT = 200;

const INTEGER_TEXT = /^[+-]?\d+$/;

const toSafeInteger = (value) => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) ? value : null;
  }

  if (typeof value !== 'string' || !INTEGER_TEXT.test(value.trim())) {
    return null;
  }

  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) ? parsed : null;
};

/**
 * Convert untrusted query values into a bounded Sequelize pagination tuple.
 * Malformed or fractional values use defaults; valid out-of-range integers
 * are clamped. A page that would produce an unsafe offset falls back to page 1.
 */
export const parsePagination = (query = {}) => {
  const rawLimit = toSafeInteger(query?.limit);
  const limit = rawLimit === null
    ? DEFAULT_LIMIT
    : Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, rawLimit));

  const rawPage = toSafeInteger(query?.page);
  let page = rawPage === null ? DEFAULT_PAGE : Math.max(DEFAULT_PAGE, rawPage);
  let offset = (page - 1) * limit;

  if (!Number.isSafeInteger(offset) || offset < 0) {
    page = DEFAULT_PAGE;
    offset = 0;
  }

  return { page, limit, offset };
};

/**
 * Build metadata for a completed count query. Empty result sets deliberately
 * report zero pages rather than one empty page.
 */
export const createPagination = ({ page, limit, total }) => {
  const normalizedPage = toSafeInteger(page);
  const normalizedLimit = toSafeInteger(limit);
  const normalizedTotal = toSafeInteger(total);

  if (normalizedPage === null || normalizedPage < DEFAULT_PAGE) {
    throw new TypeError('Pagination page must be an integer of at least 1');
  }
  if (normalizedLimit === null || normalizedLimit < MIN_LIMIT || normalizedLimit > MAX_LIMIT) {
    throw new TypeError(`Pagination limit must be an integer between ${MIN_LIMIT} and ${MAX_LIMIT}`);
  }
  if (normalizedTotal === null || normalizedTotal < 0) {
    throw new TypeError('Pagination total must be a non-negative integer');
  }

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    total: normalizedTotal,
    pages: normalizedTotal === 0 ? 0 : Math.ceil(normalizedTotal / normalizedLimit),
  };
};
