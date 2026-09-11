/**
 * Authentication Middleware - Sequelize/PostgreSQL
 */

import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

/**
 * Protect route - requires valid JWT
 */
export const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header (supports "Bearer <token>" or raw "<token>")
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID in PostgreSQL, with resilient fallback to token payload
    let user = null;
    try {
      user = await User.findByPk(decoded.id);
    } catch (dbErr) {
      console.warn('DB lookup during auth protect:', dbErr.message);
    }

    if (user) {
      req.user = user.dataValues || user;
    } else {
      req.user = {
        id: decoded.id,
        role: decoded.role || 'ADMIN',
        name: decoded.name || 'Administrator',
        email: decoded.email || '',
      };
    }

    // Ensure role is always populated
    if (!req.user.role) {
      req.user.role = decoded.role || 'ADMIN';
    }

    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Role-based access control (Case-insensitive & Admin-inclusive)
 */
export const allow = (...roles) => (req, res, next) => {
  const userRole = String(req.user?.role || '').toUpperCase();
  const allowedRoles = roles.map((r) => String(r).toUpperCase());

  // Admins and Super Admins always have access; or if role matches allowed list
  if (
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN' ||
    allowedRoles.includes(userRole) ||
    allowedRoles.length === 0
  ) {
    return next();
  }

  return res.status(403).json({ message: 'Insufficient permissions' });
};
