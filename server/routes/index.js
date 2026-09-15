import { Router } from 'express';
import { z } from 'zod';
import { login, logout, me } from '../controllers/auth.js';
import * as c from '../controllers/resources.js';
import { protect, allow } from '../middleware/auth.js';
import { log } from '../middleware/audit.js';

const r = Router();

const valid = (schema) => (req, res, next) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message || 'Validation error' });
  }
  req.body = parsed.data;
  next();
};

// Public Authentication
r.post(
  '/auth/login',
  valid(z.object({ email: z.string().email(), password: z.string().min(6) })),
  login
);

// Protected Auth Routes
r.post('/auth/logout', protect, log('LOGOUT', 'SYSTEM'), logout);
r.get('/auth/me', protect, me);

// Global Protection
r.use(protect);

// Dashboard
r.get('/dashboard', log('VIEW', 'SYSTEM'), c.dashboard);

// Employees
r.get('/employees/short-calls', log('VIEW', 'EMPLOYEE'), c.shortCallEmployees);
r.get('/employees', log('VIEW', 'EMPLOYEE'), (req, res) => c.employees({ req, res }));

// Companies
r.get('/companies', log('VIEW', 'SYSTEM'), (req, res) => c.companies({ req, res }));

// Calls
r.get('/calls', log('VIEW', 'CALL'), c.calls);
r.get('/calls/:id', log('VIEW', 'CALL'), c.call);

// Recordings
r.get('/recordings', allow('ADMIN', 'SUPER_ADMIN', 'MANAGER'), (req, res) => c.recordings({ req, res }));
r.get('/recordings/:id/play', allow('ADMIN', 'SUPER_ADMIN', 'MANAGER'), log('PLAY', 'RECORDING'), c.play);

// Devices
r.get('/devices', allow('ADMIN', 'SUPER_ADMIN', 'MANAGER'), (req, res) => c.devices({ req, res }));

// Audit Logs
r.get('/audit-logs', allow('ADMIN', 'SUPER_ADMIN', 'MANAGER'), (req, res) => c.audit({ req, res }));

export default r;
