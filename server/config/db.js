import { Sequelize } from 'sequelize';

import config from './env.js';

const isRemoteHost = config.database.host !== 'localhost' && config.database.host !== '127.0.0.1';

const sequelizeOptions = {
  host: config.database.host,
  port: config.database.port,
  dialect: config.database.dialect,
  timezone: config.database.timezone,
  dialectOptions: isRemoteHost
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
  logging: false,
  logQueryParameters: false,
  pool: {
    min: 2,
    max: 10,
    acquire: 30_000,
    idle: 10_000,
  },
  define: {
    timestamps: true,
    underscored: true,
  },
};

/**
 * The process-wide Sequelize instance. Importing this module validates the
 * environment first, but does not open a database connection.
 */
export const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  sequelizeOptions,
);

/**
 * Authenticate PostgreSQL and propagate failures to the startup/command
 * boundary. This module never exits the process or logs connection details.
 */
export const connectDB = async () => {
  await sequelize.authenticate();
  return sequelize;
};

/**
 * Authenticate before synchronizing registered models. Destructive sync
 * behavior remains opt-in, and SQL logging stays disabled even if requested
 * by a caller so bind values and application data cannot reach logs.
 */
export const syncDB = async (options = {}) => {
  await connectDB();
  await sequelize.sync({
    force: false,
    alter: false,
    ...options,
    logging: false,
  });
  return sequelize;
};

const loadAuditGuardInstaller = async () => {
  const guards = await import('../scripts/schema-guards.js');
  const installer = guards.installAuditImmutability
    ?? guards.installAuditGuards
    ?? guards.installSchemaGuards
    ?? guards.default;

  if (typeof installer !== 'function') {
    throw new TypeError('The schema guard module must export an audit guard installer');
  }

  return installer;
};

/**
 * Install database-level audit guards after schema synchronization. An
 * installer may be injected by tests; production commands resolve the schema
 * guard module supplied by the schema task.
 */
export const installAuditGuards = async (installer) => {
  const resolvedInstaller = installer ?? await loadAuditGuardInstaller();
  await resolvedInstaller(sequelize);
  return sequelize;
};

export const installAuditImmutability = installAuditGuards;

/**
 * Preserve Sequelize's managed and unmanaged transaction overloads for domain
 * services and the canonical seed command.
 */
export const transaction = (...args) => sequelize.transaction(...args);

/** Close the shared pool and propagate shutdown errors to the caller. */
export const closeDB = async () => {
  await sequelize.close();
};

export default sequelize;
