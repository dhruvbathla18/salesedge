const ATTRIBUTE_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

const assertAttributeName = (value, label) => {
  if (typeof value !== 'string' || !ATTRIBUTE_NAME.test(value)) {
    throw new TypeError(`${label} must be a valid model attribute name`);
  }
};

/**
 * Return deterministic descending event ordering suitable for Sequelize.
 * A unique resource key resolves rows that share the same created timestamp.
 */
export const createStableOrder = ({
  timestampField = 'created_at',
  keyField = 'id',
} = {}) => {
  assertAttributeName(timestampField, 'timestampField');
  assertAttributeName(keyField, 'keyField');

  if (timestampField === keyField) {
    return [[timestampField, 'DESC']];
  }

  return [
    [timestampField, 'DESC'],
    [keyField, 'DESC'],
  ];
};

export const STABLE_ORDER = Object.freeze([
  Object.freeze(['created_at', 'DESC']),
  Object.freeze(['id', 'DESC']),
]);
