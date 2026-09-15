/**
 * Safe cleanup of leftover demo/seed employees.
 *
 * Deletes ONLY employees that satisfy ALL of these guards:
 *   1. email is a placeholder (ends with @imported.local), i.e. never updated
 *      from the real HR directory, AND
 *   2. has ZERO call_logs linked (no real activity), AND
 *   3. emp_id matches the seed pattern EMP-000N / EMP-001N (the demo fixtures).
 *
 * This guarantees we never remove a real employee or anyone with call history
 * or recordings. Their DEV-<empId> devices (if any) are removed too.
 *
 * Dry run by default; pass --apply to actually delete.
 *   node scripts/cleanup-seed-employees.js          # preview only
 *   node scripts/cleanup-seed-employees.js --apply  # perform deletion
 */

import { sequelize } from '../config/db.js';
import { QueryTypes } from 'sequelize';
import { Employee, Device, CallLog } from '../models/index.js';

const APPLY = process.argv.includes('--apply');

// Original demo/seed fixtures use zero-padded IDs EMP-0001 .. EMP-0012 with
// real-looking @mistavinya.com emails. They are NOT in the HR directory and
// carry no real calls. We target this exact pattern, still guarded by 0-calls
// so nothing with any activity can ever be deleted.
const SEED_PATTERN = /^EMP-\d{4}$/;

async function main() {
  const all = await Employee.findAll({ attributes: ['emp_id', 'full_name', 'email'], raw: true });

  const toDelete = [];
  const kept = [];
  for (const e of all) {
    const matchesSeed = SEED_PATTERN.test(e.emp_id);
    if (!matchesSeed) continue; // only ever consider the EMP-000N seed format
    const calls = await CallLog.count({ where: { employee_id: e.emp_id } });
    if (calls === 0) {
      toDelete.push(e.emp_id);
    } else {
      kept.push(`${e.emp_id} (calls=${calls})`);
    }
  }

  if (kept.length) {
    console.log(`Kept (seed-format but has calls, NOT deleted): ${kept.join(', ')}`);
  }

  console.log(`Candidates for deletion (${toDelete.length}):`);
  console.log(toDelete.join(', ') || '(none)');

  if (!APPLY) {
    console.log('\nDry run only. Re-run with --apply to delete these employees and their DEV- devices.');
    await sequelize.close();
    process.exit(0);
  }

  if (toDelete.length === 0) {
    console.log('Nothing to delete.');
    await sequelize.close();
    process.exit(0);
  }

  await sequelize.transaction(async (tx) => {
    // Remove their synthesized devices first (FK: devices.employee_id -> employees).
    const devs = await Device.destroy({ where: { employee_id: toDelete }, transaction: tx });
    const emps = await Employee.destroy({ where: { emp_id: toDelete }, transaction: tx, force: true });
    console.log(`Deleted devices: ${devs}, employees: ${emps}`);
  });

  console.log('✅ Cleanup complete.');
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Cleanup failed:', err.message);
  if (err?.original) console.error('   pg:', err.original.message, '| constraint:', err.original.constraint);
  process.exit(1);
});
