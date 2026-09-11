const INTEGER_TEXT = /^[+-]?\d+$/;

/**
 * Convert a database BIGINT into a JSON-safe number when exact, otherwise a
 * canonical decimal string. Sequelize commonly returns BIGINT columns as text.
 */
export const toBigIntJsonValue = (value) => {
  let integer;

  if (typeof value === 'bigint') {
    integer = value;
  } else if (typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)) {
    integer = BigInt(value);
  } else if (typeof value === 'string' && INTEGER_TEXT.test(value.trim())) {
    integer = BigInt(value.trim());
  } else {
    throw new TypeError('BIGINT value must be an integer number, bigint, or decimal string');
  }

  if (integer >= BigInt(Number.MIN_SAFE_INTEGER) && integer <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return Number(integer);
  }

  return integer.toString(10);
};

/** Recursively replace native bigint values so JSON.stringify cannot throw. */
export const serializeBigInts = (value) => {
  if (typeof value === 'bigint') return toBigIntJsonValue(value);
  if (Array.isArray(value)) return value.map(serializeBigInts);
  if (value instanceof Date || value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, serializeBigInts(child)]),
  );
};
