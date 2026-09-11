/**
 * AWS Connection Diagnostics Tool
 * Tests both AWS RDS (PostgreSQL) and AWS S3 connections in one go
 *
 * Usage: node scripts/check-aws-connection.js (or npm run check:aws)
 */

import 'dotenv/config';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { connectDB, sequelize } from '../config/db.js';
import {
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
} from '../models/index.js';

async function runDiagnostics() {
  console.log('\n===============================================================');
  console.log('            🧪 AWS RDS & S3 CONNECTION DIAGNOSTICS            ');
  console.log('===============================================================\n');

  let rdsSuccess = false;
  let s3Success = false;

  // --------------------------------------------------------------------------
  // 1. TEST AWS RDS (POSTGRESQL)
  // --------------------------------------------------------------------------
  console.log('1️⃣ Testing AWS RDS PostgreSQL Connection...');
  console.log(`   Host:     ${process.env.DB_HOST}`);
  console.log(`   Port:     ${process.env.DB_PORT || 5432}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User:     ${process.env.DB_USER}`);

  try {
    await connectDB();
    console.log('   ✅ Successfully connected to PostgreSQL database!');

    const [empCount, callCount, recCount, devCount, formCount] = await Promise.all([
      Employee.count().catch(() => 'Table not found'),
      CallLog.count().catch(() => 'Table not found'),
      CallRecording.count().catch(() => 'Table not found'),
      Device.count().catch(() => 'Table not found'),
      CallFormData.count().catch(() => 'Table not found'),
    ]);

    console.log('\n   📊 Real Database Counts on AWS RDS:');
    console.log(`      • Employees:       ${empCount}`);
    console.log(`      • Devices:         ${devCount}`);
    console.log(`      • Call Logs:       ${callCount}`);
    console.log(`      • Call Forms:      ${formCount}`);
    console.log(`      • Call Recordings: ${recCount}\n`);

    rdsSuccess = true;
  } catch (err) {
    console.error('   ❌ AWS RDS Connection Failed:', err.message);
    if (err.name === 'SequelizeConnectionRefusedError') {
      console.error('      👉 Tip: Check if AWS Security Group allows inbound port 5432 from your IP.');
    } else if (err.name === 'SequelizeAccessDeniedError' || err.message.includes('password')) {
      console.error('      👉 Tip: Check your DB_USER and DB_PASSWORD credentials.');
    } else if (err.message.includes('timeout')) {
      console.error('      👉 Tip: Check if your RDS instance is set to "Publicly Accessible: Yes".');
    }
  }

  // --------------------------------------------------------------------------
  // 2. TEST AWS S3 (AUDIO RECORDINGS BUCKET)
  // --------------------------------------------------------------------------
  console.log('2️⃣ Testing AWS S3 Bucket Connection...');
  console.log(`   Bucket: ${process.env.AWS_S3_BUCKET}`);
  console.log(`   Region: ${process.env.AWS_REGION || 'ap-south-1'}`);

  if (
    !process.env.AWS_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID === 'local_aws_access_key_not_configured'
  ) {
    console.warn('   ⚠️ AWS S3 credentials not configured in server/.env (using local audio fallback).');
  } else {
    try {
      const s3Client = new S3Client({
        region: process.env.AWS_REGION || 'ap-south-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      const result = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: process.env.AWS_S3_BUCKET,
          MaxKeys: 5,
        })
      );

      const objectCount = result.KeyCount || 0;
      console.log(`   ✅ Successfully connected to AWS S3 Bucket!`);
      console.log(`      Found sample objects in bucket: ${objectCount}`);
      if (result.Contents && result.Contents.length > 0) {
        result.Contents.forEach((item, index) => {
          console.log(`      [${index + 1}] ${item.Key} (${(item.Size / 1024).toFixed(1)} KB)`);
        });
      }
      s3Success = true;
    } catch (err) {
      console.error('   ❌ AWS S3 Connection Failed:', err.message);
      if (err.name === 'NoSuchBucket') {
        console.error('      👉 Tip: Check your AWS_S3_BUCKET name spelling.');
      } else if (err.name === 'InvalidAccessKeyId' || err.name === 'SignatureDoesNotMatch') {
        console.error('      👉 Tip: Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
      }
    }
  }

  console.log('\n===============================================================');
  if (rdsSuccess) {
    console.log('🎉 READY: Your backend can fetch live data from AWS!');
  } else {
    console.log('⚠️ Please update server/.env with valid AWS credentials.');
  }
  console.log('===============================================================\n');

  process.exit(rdsSuccess ? 0 : 1);
}

runDiagnostics();
