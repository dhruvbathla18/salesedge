/**
 * Single Admin User Creation Script
 * Creates or resets the single administrator account in PostgreSQL
 *
 * Usage: node scripts/create-admin.js
 */

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/index.js';

const createAdmin = async () => {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await connectDB();

    const email = process.env.AUTH_USER_EMAIL || 'admin@mistavinya.local';
    const name = process.env.AUTH_USER_NAME || 'MIST Avinya Admin';
    const plainPassword = process.env.ADMIN_INITIAL_PASSWORD || 'Admin@12345';
    const role = 'ADMIN';

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const [user, created] = await User.findOrCreate({
      where: { email },
      defaults: {
        id: process.env.AUTH_USER_ID || '00000000-0000-4000-8000-000000000001',
        name,
        email,
        password: passwordHash,
        role,
        is_active: true,
      },
    });

    if (!created) {
      user.name = name;
      user.password = passwordHash;
      user.role = role;
      user.is_active = true;
      await user.save();
      console.log(`✅ Admin account updated: ${email} (Role: ${role})`);
    } else {
      console.log(`✅ Admin account created: ${email} (Role: ${role})`);
    }

    console.log('   Email:    ', email);
    console.log('   Password: ', plainPassword);
    console.log('   Role:     ', role);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdmin();
