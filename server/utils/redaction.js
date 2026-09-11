export const REDACTED = '[REDACTED]';
export const CIRCULAR = '[Circular]';

const SENSITIVE_KEY_PARTS = Object.freeze([
  'password',
  'passwd',
  'pwd',
  'passwordhash',
  'authorization',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwttoken',
  'jwtsecret',
  'secret',
  'accesskeyid',
  'awssecretaccesskey',
  'awssessiontoken',
  'apikey',
  'cookie',
  'credential',
  'signedurl',
  'presignedurl',
  'playbackurl',
]);

const normalizeKey = (key) => String(key).replace(/[^a-z0-9]/gi, '').toLowerCase();

export const isSensitiveKey = (key) => {
  const normalized = normalizeKey(key);
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
};

const looksLikeSignedUrl = (value) => {
  if (typeof value !== 'string') return false;

  return /[?&](?:X-Amz-(?:Signature|Credential|Security-Token)|X-Goog-Signature|Signature|AWSAccessKeyId)=/i
    .test(value);
};

const looksLikeTokenOrHash = (value) => {
  if (typeof value !== 'string') return false;

  return /^Bearer\s+\S+/i.test(value)
    || /^\$2[aby]\$\d{2}\$/.test(value)
    || /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
};

const redactString = (value, secrets) => {
  if (looksLikeSignedUrl(value) || looksLikeTokenOrHash(value)) return REDACTED;

  let result = value;
  for (const secret of secrets) {
    if (secret && result.includes(secret)) {
      result = result.split(secret).join(REDACTED);
    }
  }
  return result;
};

/**
 * Return a recursively redacted copy suitable for audit snapshots and logs.
 * Configured secrets are removed even when embedded in a larger string.
 */
export const redactSensitiveValues = (value, { secrets = [] } = {}) => {
  const normalizedSecrets = secrets
    .filter((secret) => ['string', 'number', 'bigint'].includes(typeof secret))
    .map(String)
    .filter(Boolean);
  const ancestors = new WeakSet();

  const visit = (current, key) => {
    if (key !== undefined && isSensitiveKey(key)) return REDACTED;
    if (typeof current === 'string') return redactString(current, normalizedSecrets);
    if (current === null || typeof current !== 'object') return current;
    if (current instanceof Date) return new Date(current.getTime());
    if (Buffer.isBuffer(current)) return current;

    if (ancestors.has(current)) return CIRCULAR;
    ancestors.add(current);

    let clone;
    if (Array.isArray(current)) {
      clone = current.map((item) => visit(item));
    } else if (current instanceof Error) {
      clone = {
        name: current.name,
        message: redactString(current.message, normalizedSecrets),
        ...Object.fromEntries(
          Object.entries(current).map(([childKey, child]) => [childKey, visit(child, childKey)]),
        ),
      };
    } else {
      clone = Object.fromEntries(
        Object.entries(current).map(([childKey, child]) => [childKey, visit(child, childKey)]),
      );
    }

    ancestors.delete(current);
    return clone;
  };

  return visit(value);
};
