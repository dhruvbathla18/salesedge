import { AuditLog } from '../models/index.js';

/**
 * Audit logging middleware for PostgreSQL
 * Safely creates an immutable audit record on request completion
 */
export const log = (action, entityType = 'SYSTEM') => (req, res, next) => {
  res.on('finish', () => {
    if (req.user && res.statusCode < 400) {
      const allowedActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'VIEW', 'PLAY'];
      const allowedEntities = ['EMPLOYEE', 'DEVICE', 'CALL', 'RECORDING', 'SYSTEM'];

      const validAction = allowedActions.includes(action) ? action : 'VIEW';
      const validEntity = allowedEntities.includes(entityType) ? entityType : 'SYSTEM';

      AuditLog.create({
        admin_user: req.user.email || req.user.name || 'admin@mistavinya.local',
        action: validAction,
        entity_type: validEntity,
        entity_id: req.params.id || req.query.id || req.baseUrl + req.path,
        old_values: null,
        new_values: { path: req.originalUrl, method: req.method, statusCode: res.statusCode },
        ip_address: req.ip || req.connection?.remoteAddress || '127.0.0.1',
        user_agent: req.get('user-agent') || 'Browser Client',
        created_at: new Date(),
      }).catch((err) => {
        console.warn('⚠️ Non-fatal audit log creation failed:', err.message);
      });
    }
  });
  next();
};
