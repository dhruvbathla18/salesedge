import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  InternalServerError,
  NotFoundError,
  OperationalError,
  RateLimitError,
  UnavailableError,
  ValidationError,
  isOperationalError,
} from '../../utils/errors.js';
import {
  failure,
  listSuccess,
  loginSuccess,
  playbackSuccess,
  success,
} from '../../utils/http.js';
import {
  MAX_LIMIT,
  createPagination,
  parsePagination,
} from '../../utils/pagination.js';
import { createStableOrder } from '../../utils/ordering.js';
import {
  createInclusiveDateRange,
  endOfAsiaKolkataDay,
  startOfAsiaKolkataDay,
} from '../../utils/dates.js';
import { serializeBigInts, toBigIntJsonValue } from '../../utils/bigint.js';
import { CIRCULAR, REDACTED, redactSensitiveValues } from '../../utils/redaction.js';

test('success and failure helpers always produce canonical envelopes', () => {
  assert.deepEqual(success({ id: 1 }, 'Loaded'), {
    success: true,
    data: { id: 1 },
    message: 'Loaded',
  });
  assert.deepEqual(failure('Invalid request'), {
    success: false,
    data: null,
    message: 'Invalid request',
  });
});

test('list envelope is the only pagination compatibility mirror', () => {
  const envelope = listSuccess([], { page: 2, limit: 20, total: 0 });

  assert.deepEqual(envelope.pagination, {
    page: 2,
    limit: 20,
    total: 0,
    pages: 0,
  });
  assert.equal(envelope.page, 2);
  assert.equal(envelope.pages, 0);
  assert.equal(envelope.total, 0);
  assert.equal('page' in success([], 'Loaded'), false);
});

test('login and playback helpers retain canonical data and exact client mirrors', () => {
  const user = { id: 'principal-1', role: 'ADMIN' };
  const login = loginSuccess('jwt-value', user);
  assert.deepEqual(login.data, { token: 'jwt-value', user });
  assert.equal(login.token, 'jwt-value');
  assert.equal(login.user, user);

  const playbackData = {
    url: 'https://example.invalid/signed',
    expiresIn: 300,
    fileName: 'recording.m4a',
  };
  const playback = playbackSuccess(playbackData);
  assert.deepEqual(playback.data, playbackData);
  assert.equal(playback.url, playbackData.url);
  assert.equal(playback.expiresIn, 300);
  assert.equal(playback.fileName, 'recording.m4a');
});

test('typed operational errors retain safe fixed status categories', () => {
  const cases = [
    [new ValidationError(), 400, 'VALIDATION_ERROR'],
    [new AuthenticationError(), 401, 'AUTHENTICATION_REQUIRED'],
    [new AuthorizationError(), 403, 'FORBIDDEN'],
    [new NotFoundError(), 404, 'NOT_FOUND'],
    [new UnavailableError(), 404, 'RESOURCE_UNAVAILABLE'],
    [new ConflictError(), 409, 'CONFLICT'],
    [new RateLimitError(), 429, 'RATE_LIMITED'],
    [new InternalServerError(), 500, 'INTERNAL_ERROR'],
  ];

  for (const [error, statusCode, code] of cases) {
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.status, statusCode);
    assert.equal(error.code, code);
    assert.equal(isOperationalError(error), true);
    assert.equal(error instanceof OperationalError, true);
  }

  assert.equal(new ValidationError('No', { statusCode: 503 }).statusCode, 400);
  assert.equal(isOperationalError(new Error('unexpected')), false);
});

test('pagination defaults malformed values, clamps integer bounds, and has safe offsets', () => {
  assert.deepEqual(parsePagination(), { page: 1, limit: 20, offset: 0 });
  assert.deepEqual(parsePagination({ page: '1.5', limit: 'abc' }), {
    page: 1,
    limit: 20,
    offset: 0,
  });
  assert.deepEqual(parsePagination({ page: '-9', limit: '0' }), {
    page: 1,
    limit: 1,
    offset: 0,
  });
  assert.deepEqual(parsePagination({ page: '3', limit: '999' }), {
    page: 3,
    limit: MAX_LIMIT,
    offset: 400,
  });
  assert.deepEqual(parsePagination({ page: Number.MAX_SAFE_INTEGER, limit: 200 }), {
    page: 1,
    limit: 200,
    offset: 0,
  });
});

test('pagination metadata reports exact totals and zero-result pages', () => {
  assert.deepEqual(createPagination({ page: 1, limit: 20, total: 41 }), {
    page: 1,
    limit: 20,
    total: 41,
    pages: 3,
  });
  assert.equal(createPagination({ page: 4, limit: 20, total: 0 }).pages, 0);
  assert.throws(
    () => createPagination({ page: 1, limit: 201, total: 1 }),
    /between 1 and 200/,
  );
});

test('stable ordering uses descending created time and a deterministic key tie-breaker', () => {
  assert.deepEqual(createStableOrder(), [
    ['created_at', 'DESC'],
    ['id', 'DESC'],
  ]);
  assert.deepEqual(createStableOrder({ keyField: 'emp_id' }), [
    ['created_at', 'DESC'],
    ['emp_id', 'DESC'],
  ]);
  assert.throws(() => createStableOrder({ keyField: 'id; DROP TABLE' }), /valid model attribute/);
});

test('Asia/Kolkata date-only boundaries are inclusive UTC instants', () => {
  assert.equal(
    startOfAsiaKolkataDay('2024-01-01').toISOString(),
    '2023-12-31T18:30:00.000Z',
  );
  assert.equal(
    endOfAsiaKolkataDay('2024-01-01').toISOString(),
    '2024-01-01T18:29:59.999Z',
  );

  const range = createInclusiveDateRange({ from: '2024-02-29', to: '2024-03-01' });
  assert.equal(range.from.toISOString(), '2024-02-28T18:30:00.000Z');
  assert.equal(range.to.toISOString(), '2024-03-01T18:29:59.999Z');
});

test('date range utility preserves timestamp instants and rejects invalid ranges', () => {
  const range = createInclusiveDateRange({
    from: '2024-04-01T12:00:00.000Z',
    to: '2024-04-01T13:00:00.000Z',
  });
  assert.equal(range.from.toISOString(), '2024-04-01T12:00:00.000Z');
  assert.equal(range.to.toISOString(), '2024-04-01T13:00:00.000Z');

  assert.throws(
    () => createInclusiveDateRange({ from: '2024-04-02', to: '2024-04-01' }),
    (error) => error instanceof ValidationError && error.code === 'INVALID_DATE_RANGE',
  );
  assert.throws(() => startOfAsiaKolkataDay('2023-02-29'), ValidationError);
});

test('BIGINT values are numbers only inside the JavaScript safe range', () => {
  assert.equal(toBigIntJsonValue('9007199254740991'), Number.MAX_SAFE_INTEGER);
  assert.equal(toBigIntJsonValue('9007199254740992'), '9007199254740992');
  assert.equal(toBigIntJsonValue(-9007199254740992n), '-9007199254740992');
  assert.deepEqual(serializeBigInts({ bytes: 9007199254740992n, values: [2n] }), {
    bytes: '9007199254740992',
    values: [2],
  });
  assert.throws(() => toBigIntJsonValue('1.5'), /must be an integer/);
});

test('redaction removes nested credentials, tokens, signed URLs, and configured secrets', () => {
  const input = {
    passwordHash: 'hash-value',
    token: 'opaque-token',
    headers: { authorization: 'Bearer header-token' },
    url: 'https://bucket.invalid/key?X-Amz-Signature=signature',
    note: 'prefix local-development-secret suffix',
    safe: 'visible',
  };
  input.self = input;

  const output = redactSensitiveValues(input, { secrets: ['local-development-secret'] });

  assert.equal(output.passwordHash, REDACTED);
  assert.equal(output.token, REDACTED);
  assert.equal(output.headers.authorization, REDACTED);
  assert.equal(output.url, REDACTED);
  assert.equal(output.note, `prefix ${REDACTED} suffix`);
  assert.equal(output.safe, 'visible');
  assert.equal(output.self, CIRCULAR);
  assert.equal(input.passwordHash, 'hash-value');
});
