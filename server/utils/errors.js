const DEFAULT_ERROR_CODES = Object.freeze({
  400: 'VALIDATION_ERROR',
  401: 'AUTHENTICATION_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
});

/**
 * An expected application failure that can be translated into a safe HTTP
 * response by centralized error middleware.
 */
export class OperationalError extends Error {
  constructor(message, {
    statusCode = 500,
    code = DEFAULT_ERROR_CODES[statusCode] ?? 'OPERATIONAL_ERROR',
    details,
    cause,
  } = {}) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.status = statusCode;
    this.code = code;
    this.isOperational = true;

    if (details !== undefined) this.details = details;
    if (cause !== undefined) this.cause = cause;

    Error.captureStackTrace?.(this, new.target);
  }
}

export class ValidationError extends OperationalError {
  constructor(message = 'Invalid request', options = {}) {
    super(message, { ...options, statusCode: 400, code: options.code ?? 'VALIDATION_ERROR' });
  }
}

export class AuthenticationError extends OperationalError {
  constructor(message = 'Authentication required', options = {}) {
    super(message, { ...options, statusCode: 401, code: options.code ?? 'AUTHENTICATION_REQUIRED' });
  }
}

export class AuthorizationError extends OperationalError {
  constructor(message = 'You do not have permission to perform this action', options = {}) {
    super(message, { ...options, statusCode: 403, code: options.code ?? 'FORBIDDEN' });
  }
}

export class NotFoundError extends OperationalError {
  constructor(message = 'Resource not found', options = {}) {
    super(message, { ...options, statusCode: 404, code: options.code ?? 'NOT_FOUND' });
  }
}

export class UnavailableError extends NotFoundError {
  constructor(message = 'Resource unavailable', options = {}) {
    super(message, { ...options, code: options.code ?? 'RESOURCE_UNAVAILABLE' });
  }
}

export class ConflictError extends OperationalError {
  constructor(message = 'The request conflicts with the current resource state', options = {}) {
    super(message, { ...options, statusCode: 409, code: options.code ?? 'CONFLICT' });
  }
}

export class RateLimitError extends OperationalError {
  constructor(message = 'Too many requests, please try again later', options = {}) {
    super(message, { ...options, statusCode: 429, code: options.code ?? 'RATE_LIMITED' });
  }
}

export class InternalServerError extends OperationalError {
  constructor(message = 'Internal server error', options = {}) {
    super(message, { ...options, statusCode: 500, code: options.code ?? 'INTERNAL_ERROR' });
  }
}

export const isOperationalError = (error) =>
  error instanceof OperationalError && error.isOperational === true;
