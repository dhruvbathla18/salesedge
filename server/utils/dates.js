import { ValidationError } from './errors.js';

export const ASIA_KOLKATA_TIME_ZONE = 'Asia/Kolkata';
export const ASIA_KOLKATA_OFFSET_MINUTES = 330;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_MILLISECONDS = ASIA_KOLKATA_OFFSET_MINUTES * 60 * 1000;

const parseDateOnlyParts = (value) => {
  if (typeof value !== 'string') return null;

  const match = DATE_ONLY.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day
  ) {
    throw new ValidationError(`Invalid calendar date: ${value}`);
  }

  return { year, month, day };
};

const parseInstant = (value, label) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new ValidationError(`Invalid ${label} date`);
    return new Date(value.getTime());
  }

  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`Invalid ${label} date`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new ValidationError(`Invalid ${label} date`);
  return parsed;
};

export const isDateOnly = (value) => typeof value === 'string' && DATE_ONLY.test(value);

/** Convert an Asia/Kolkata calendar date to its inclusive UTC start instant. */
export const startOfAsiaKolkataDay = (value) => {
  const parts = parseDateOnlyParts(value);
  if (!parts) throw new ValidationError('Expected a date in YYYY-MM-DD format');

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - OFFSET_MILLISECONDS);
};

/** Convert an Asia/Kolkata calendar date to its inclusive UTC end instant. */
export const endOfAsiaKolkataDay = (value) => {
  const parts = parseDateOnlyParts(value);
  if (!parts) throw new ValidationError('Expected a date in YYYY-MM-DD format');

  const nextDayStart = Date.UTC(parts.year, parts.month - 1, parts.day + 1) - OFFSET_MILLISECONDS;
  return new Date(nextDayStart - 1);
};

/**
 * Normalize optional range endpoints. Date-only values receive inclusive
 * Asia/Kolkata day boundaries; timestamp values remain exact instants.
 */
export const createInclusiveDateRange = ({ from, to } = {}) => {
  const range = {};

  if (from !== undefined && from !== null && from !== '') {
    range.from = isDateOnly(from)
      ? startOfAsiaKolkataDay(from)
      : parseInstant(from, 'from');
  }

  if (to !== undefined && to !== null && to !== '') {
    range.to = isDateOnly(to)
      ? endOfAsiaKolkataDay(to)
      : parseInstant(to, 'to');
  }

  if (range.from && range.to && range.from.getTime() > range.to.getTime()) {
    throw new ValidationError('The from date must be before or equal to the to date', {
      code: 'INVALID_DATE_RANGE',
    });
  }

  return range;
};
