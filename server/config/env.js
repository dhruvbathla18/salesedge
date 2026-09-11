import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const SERVER_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENV_FILE = path.join(SERVER_ROOT, '.env');

const dotenvResult = dotenv.config({ path: ENV_FILE });
if (dotenvResult.error && dotenvResult.error.code !== 'ENOENT') {
  throw new Error('Unable to load the server environment file');
}

const requiredString = (field) =>
  z
    .string({
      required_error: `${field} is required`,
      invalid_type_error: `${field} must be a string`,
    })
    .trim()
    .min(1, `${field} is required`);

const integerFromEnvironment = (field, minimum, maximum) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
        return value;
      }

      return Number(value);
    },
    z
      .number({
        required_error: `${field} is required`,
        invalid_type_error: `${field} must be an integer`,
      })
      .int(`${field} must be an integer`)
      .min(minimum, `${field} must be at least ${minimum}`)
      .max(maximum, `${field} must be at most ${maximum}`),
  );

const environmentSchema = z
  .object({
    DB_HOST: requiredString('DB_HOST'),
    DB_PORT: integerFromEnvironment('DB_PORT', 1, 65_535),
    DB_NAME: requiredString('DB_NAME'),
    DB_USER: requiredString('DB_USER'),
    DB_PASSWORD: requiredString('DB_PASSWORD'),
    DB_DIALECT: z.literal('postgres', {
      required_error: 'DB_DIALECT is required',
      invalid_type_error: 'DB_DIALECT must be postgres',
    }),
    PORT: integerFromEnvironment('PORT', 1, 65_535),
    NODE_ENV: z.enum(['development', 'test', 'production'], {
      required_error: 'NODE_ENV is required',
      invalid_type_error: 'NODE_ENV is invalid',
    }),
    TZ: z.literal('Asia/Kolkata', {
      required_error: 'TZ is required',
      invalid_type_error: 'TZ must be Asia/Kolkata',
    }),
    CLIENT_URL: requiredString('CLIENT_URL').url('CLIENT_URL must be a valid URL'),
    JWT_SECRET: requiredString('JWT_SECRET').min(
      32,
      'JWT_SECRET must contain at least 32 characters',
    ),
    JWT_EXPIRY: requiredString('JWT_EXPIRY'),
    AUTH_USER_ID: requiredString('AUTH_USER_ID').uuid('AUTH_USER_ID must be a UUID'),
    AUTH_USER_NAME: requiredString('AUTH_USER_NAME'),
    AUTH_USER_EMAIL: requiredString('AUTH_USER_EMAIL')
      .email('AUTH_USER_EMAIL must be a valid email address')
      .transform((email) => email.toLowerCase()),
    AUTH_USER_PASSWORD_HASH: requiredString('AUTH_USER_PASSWORD_HASH').regex(
      /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/,
      'AUTH_USER_PASSWORD_HASH must be a bcrypt hash',
    ),
    AUTH_USER_ROLE: z.enum(['ADMIN'], {
      required_error: 'AUTH_USER_ROLE is required',
      invalid_type_error: 'AUTH_USER_ROLE is invalid',
    }),
    AWS_REGION: requiredString('AWS_REGION'),
    AWS_S3_BUCKET: requiredString('AWS_S3_BUCKET'),
    // Optional: when omitted, the AWS SDK resolves credentials from the
    // environment / EC2 instance role / other default provider chain sources.
    AWS_ACCESS_KEY_ID: z.string().trim().min(1).optional(),
    AWS_SECRET_ACCESS_KEY: z.string().trim().min(1).optional(),
    S3_PLAYBACK_EXPIRY_SECONDS: integerFromEnvironment(
      'S3_PLAYBACK_EXPIRY_SECONDS',
      1,
      604_800,
    ),
  });

const toSafeIssues = (error) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.') || 'environment',
    message: issue.message,
  }));

export class EnvironmentConfigurationError extends Error {
  constructor(issues) {
    super(
      `Environment configuration is invalid: ${issues
        .map(({ field, message }) => `${field}: ${message}`)
        .join('; ')}`,
    );
    this.name = 'EnvironmentConfigurationError';
    this.code = 'INVALID_ENVIRONMENT_CONFIGURATION';
    this.issues = issues;
  }
}

const freezeConfig = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.values(value).forEach(freezeConfig);
  return Object.freeze(value);
};

export const validateEnvironment = (source = process.env) => {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    throw new EnvironmentConfigurationError(toSafeIssues(result.error));
  }

  const values = result.data;

  return freezeConfig({
    database: {
      host: values.DB_HOST,
      port: values.DB_PORT,
      name: values.DB_NAME,
      user: values.DB_USER,
      password: values.DB_PASSWORD,
      dialect: values.DB_DIALECT,
      timezone: '+05:30',
    },
    server: {
      port: values.PORT,
      nodeEnv: values.NODE_ENV,
      timezone: values.TZ,
      clientUrl: values.CLIENT_URL,
    },
    jwt: {
      secret: values.JWT_SECRET,
      expiry: values.JWT_EXPIRY,
    },
    principal: {
      id: values.AUTH_USER_ID,
      name: values.AUTH_USER_NAME,
      email: values.AUTH_USER_EMAIL,
      passwordHash: values.AUTH_USER_PASSWORD_HASH,
      role: values.AUTH_USER_ROLE,
      active: true,
    },
    aws: {
      region: values.AWS_REGION,
      bucket: values.AWS_S3_BUCKET,
      accessKeyId: values.AWS_ACCESS_KEY_ID,
      secretAccessKey: values.AWS_SECRET_ACCESS_KEY,
    },
    playback: {
      expirySeconds: values.S3_PLAYBACK_EXPIRY_SECONDS,
    },
  });
};

export const config = validateEnvironment();
process.env.TZ = config.server.timezone;

export const safeConfig = freezeConfig({
  database: {
    host: config.database.host,
    port: config.database.port,
    name: config.database.name,
    user: config.database.user,
    dialect: config.database.dialect,
    timezone: config.database.timezone,
  },
  server: config.server,
  jwt: {
    expiry: config.jwt.expiry,
  },
  principal: {
    id: config.principal.id,
    name: config.principal.name,
    email: config.principal.email,
    role: config.principal.role,
    active: config.principal.active,
  },
  aws: {
    region: config.aws.region,
    bucket: config.aws.bucket,
  },
  playback: config.playback,
});

export default config;
