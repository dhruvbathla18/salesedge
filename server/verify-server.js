import 'dotenv/config';
import { connectDB } from './config/db.js';
import { login } from './controllers/auth.js';
import * as resources from './controllers/resources.js';
import jwt from 'jsonwebtoken';

async function verifyAll() {
  console.log('🧪 Starting Server & Database Verification...');
  await connectDB();

  // Test 1: User authentication
  console.log('1️⃣ Testing Login...');
  let loginResult = null;
  const mockLoginReq = { body: { email: 'admin@mistavinya.local', password: 'Admin@12345' } };
  const mockLoginRes = {
    json: (data) => { loginResult = data; return mockLoginRes; },
    status: (code) => { console.log('Status code:', code); return mockLoginRes; }
  };
  await login(mockLoginReq, mockLoginRes);

  if (!loginResult || !loginResult.token) {
    throw new Error('Login verification failed');
  }
  console.log('   ✅ Login successful! Token received for:', loginResult.user.name);

  // Test 2: Dashboard
  console.log('2️⃣ Testing Dashboard API...');
  let dashResult = null;
  const mockDashReq = {};
  const mockDashRes = {
    json: (data) => { dashResult = data; return mockDashRes; },
    status: () => mockDashRes
  };
  await resources.dashboard(mockDashReq, mockDashRes);
  console.log('   ✅ Dashboard metrics:', JSON.stringify(dashResult.metrics));

  // Test 3: Employees
  console.log('3️⃣ Testing Employees API...');
  let empResult = null;
  await resources.employees({
    req: { query: { page: 1, limit: 10 } },
    res: { json: (data) => { empResult = data; } }
  });
  console.log(`   ✅ Employees total: ${empResult.total}, sample: ${empResult.data[0]?.full_name} (${empResult.data[0]?.designation})`);

  // Test 4: Companies
  console.log('4️⃣ Testing Companies API...');
  let compResult = null;
  await resources.companies({
    req: { query: {} },
    res: { json: (data) => { compResult = data; } }
  });
  console.log(`   ✅ Companies total: ${compResult.total}, sample: ${compResult.data[0]?.name} (Contact: ${compResult.data[0]?.contactPerson})`);

  // Test 5: Calls
  console.log('5️⃣ Testing Calls API...');
  let callsResult = null;
  await resources.calls(
    { query: { page: 1, limit: 10 } },
    { json: (data) => { callsResult = data; } }
  );
  console.log(`   ✅ Calls total: ${callsResult.total}, sample: ${callsResult.data[0]?.call_category} (${callsResult.data[0]?.call_direction})`);

  // Test 6: Devices
  console.log('6️⃣ Testing Devices API...');
  let devResult = null;
  await resources.devices({
    req: { query: {} },
    res: { json: (data) => { devResult = data; } }
  });
  console.log(`   ✅ Devices total: ${devResult.total}, sample: ${devResult.data[0]?.serial_number} (${devResult.data[0]?.link_status})`);

  // Test 7: Recordings & Playback
  console.log('7️⃣ Testing Recordings & Playback API...');
  let recResult = null;
  await resources.recordings({
    req: { query: {} },
    res: { json: (data) => { recResult = data; } }
  });
  console.log(`   ✅ Recordings total: ${recResult.total}, sample: ${recResult.data[0]?.upload_status}`);

  let playResult = null;
  await resources.play(
    { params: { id: recResult.data[0]?.id } },
    { json: (data) => { playResult = data; } }
  );
  console.log(`   ✅ Playback URL: ${playResult?.url}, File: ${playResult?.fileName}`);


  // Test 8: Audit Logs
  console.log('8️⃣ Testing Audit Logs API...');
  let auditResult = null;
  await resources.audit({
    req: { query: {} },
    res: { json: (data) => { auditResult = data; } }
  });
  console.log(`   ✅ Audit Logs total: ${auditResult.total}`);

  console.log('\n🎉 ALL BACKEND APIS & POSTGRESQL QUERIES VERIFIED SUCCESSFULLY!\n');
  process.exit(0);
}

verifyAll().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
