import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { connectDB, syncDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================================================
// STATIC ASSETS & RECORDINGS
// ============================================================================
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/recordings', express.static(path.join(__dirname, 'public/recordings')));


// ============================================================================
// SECURITY & MIDDLEWARE
// ============================================================================

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
].filter(Boolean);

const isAllowedOrigin = (origin) =>
  !origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use(morgan('dev'));

// ============================================================================
// RATE LIMITING
// ============================================================================

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts, please try again later',
});

app.use('/api/auth/login', loginLimiter);

// ============================================================================
// ROUTES
// ============================================================================

app.use('/api', routes);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  
  res.status(status).json({
    success: false,
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { details: err.stack })
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DATABASE CONNECTION & SERVER START
// ============================================================================

const preferredPort = Number(process.env.PORT || 5000);

const startServer = async (port) => {
  try {
    // Connect to PostgreSQL
    await connectDB();
    
    // Sync database schema (create tables if they don't exist)
    // In production, use migrations instead
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Syncing database schema...');
      await syncDB({ alter: false }); // Set to true only for development with caution
    }

    // Start Express server
    const server = app.listen(port, () => {
      console.log('');
      console.log('╔════════════════════════════════════════╗');
      console.log('║   🚀 MIST Avinya API Server Started   ║');
      console.log(`║   📍 Port: ${port.toString().padEnd(36)} ║`);
      console.log(`║   🌍 URL: http://localhost:${port.toString().padEnd(28)} ║`);
      console.log(`║   📊 Environment: ${(process.env.NODE_ENV || 'development').padEnd(23)} ║`);
      console.log('╚════════════════════════════════════════╝');
      console.log('');
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        const fallbackPort = port + 1;
        console.warn(`⚠️  Port ${port} is in use. Trying ${fallbackPort}...`);
        startServer(fallbackPort);
      } else {
        throw error;
      }
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer(preferredPort);
