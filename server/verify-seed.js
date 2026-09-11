/**
 * Verify that all seed data was correctly inserted
 */

import sequelize from './config/db.js';
import {
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
  AuditLog,
} from './models/index.js';

(async () => {
  try {
    await sequelize.authenticate();
    
    const employees = await Employee.count();
    const devices = await Device.count();
    const callLogs = await CallLog.count();
    const forms = await CallFormData.count();
    const recordings = await CallRecording.count();
    const audits = await AuditLog.count();
    
    console.log('\nDatabase Verification:\n');
    console.log(`   Employees:         ${employees} (expected 4)`);
    console.log(`   Devices:           ${devices} (expected 3)`);
    console.log(`   Call Logs:         ${callLogs} (expected 5)`);
    console.log(`   Call Forms:        ${forms} (expected 2)`);
    console.log(`   Call Recordings:   ${recordings} (expected 3)`);
    console.log(`   Audit Logs:        ${audits} (expected 2)\n`);
    
    const allCorrect = employees === 4 && devices === 3 && callLogs === 5 && 
                       forms === 2 && recordings === 3 && audits === 2;
    
    if (allCorrect) {
      console.log('✓ All data verified successfully!\n');
      process.exit(0);
    } else {
      console.log('✗ Some counts do not match expected values!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
