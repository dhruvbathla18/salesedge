/**
 * Database Sync Script
 * Syncs Sequelize models with PostgreSQL database
 * Creates tables if they don't exist
 * 
 * Usage: npm run db:sync
 */

import 'dotenv/config';
import { connectDB, syncDB } from '../config/db.js';
import models from '../models/index.js'; // Import all models to register them

const main = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await connectDB();

    console.log('📋 Syncing database schema (6 tables)...');
    await syncDB({
      force: false, // Don't drop existing tables
      logging: false // Set to console.log for verbose output
    });

    console.log('✅ Database synchronized — 6 tables created');
    console.log('   Tables: employees, devices, call_logs, call_form_data, call_recordings, audit_logs');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing database:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

main();
