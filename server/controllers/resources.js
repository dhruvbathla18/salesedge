/**
 * Resources Controller - PostgreSQL / Sequelize
 * Full REST API handlers matching the relational schema
 */

import { Op, fn, col, literal } from 'sequelize';
import sequelize from '../config/db.js';
import {
  Employee,
  Device,
  CallLog,
  CallFormData,
  CallRecording,
  AuditLog,
} from '../models/index.js';
import { playbackUrl } from '../services/s3.js';

/**
 * Generic paginated query helper for Sequelize
 */
const paginate = async (Model, req, res, where = {}, include = [], order = [['created_at', 'DESC']]) => {
  try {
    const { page = 1, limit = 50, q } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));

    const filter = { ...where };
    if (q) {
      filter[Op.or] = [
        ...(Model.rawAttributes.full_name ? [{ full_name: { [Op.iLike]: `%${q}%` } }] : []),
        ...(Model.rawAttributes.emp_id ? [{ emp_id: { [Op.iLike]: `%${q}%` } }] : []),
        ...(Model.rawAttributes.email ? [{ email: { [Op.iLike]: `%${q}%` } }] : []),
        ...(Model.rawAttributes.phone_number ? [{ phone_number: { [Op.iLike]: `%${q}%` } }] : []),
        ...(Model.rawAttributes.serial_number ? [{ serial_number: { [Op.iLike]: `%${q}%` } }] : []),
        ...(Model.rawAttributes.admin_user ? [{ admin_user: { [Op.iLike]: `%${q}%` } }] : []),
      ];
    }

    const { count, rows } = await Model.findAndCountAll({
      where: filter,
      include,
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order,
      subQuery: false,
      distinct: true,
    });

    return res.json({
      data: rows,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error(`Pagination error for ${Model.name}:`, error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/dashboard
 * Aggregated metrics & chart datasets
 */
export const dashboard = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Period filter for the Top Performers chart: today | week | month | all.
    const period = String(req.query.period || 'all').toLowerCase();
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);
    if (period === 'today') {
      // periodStart already at start of today
    } else if (period === 'week') {
      periodStart.setDate(periodStart.getDate() - 6); // last 7 days incl. today
    } else if (period === 'month') {
      periodStart.setDate(periodStart.getDate() - 29); // last 30 days
    }
    const perfCallWhere = period === 'all' ? {} : { created_at: { [Op.gte]: periodStart } };

    const [
      totalEmployees,
      activeEmployees,
      totalCalls,
      todayCalls,
      clientCalls,
      totalRecordings,
      uploadedRecordings,
      totalDurationResult,
      recentCalls,
      employeesList,
    ] = await Promise.all([
      Employee.count(),
      Employee.count({ where: { is_active: true } }),
      CallLog.count(),
      CallLog.count({ where: { createdAt: { [Op.gte]: todayStart } } }),
      CallLog.count({ where: { call_category: 'CLIENT' } }),
      CallRecording.count(),
      CallRecording.count({ where: { upload_status: 'COMPLETED' } }),
      CallLog.sum('duration_seconds'),
      CallLog.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { association: 'employee', attributes: ['emp_id', 'full_name', 'email'] },
          { association: 'callForm', attributes: ['company_name', 'customer_name'] },
          { association: 'recording', attributes: ['upload_status', 's3_key'] },
        ],
      }),
      // Top performers: per-employee counts for the selected period.
      CallLog.findAll({
        attributes: [
          'employee_id',
          [fn('COUNT', col('CallLog.id')), 'total_calls'],
          [fn('COUNT', literal("CASE WHEN call_category = 'CLIENT' THEN 1 END")), 'client_calls'],
        ],
        where: perfCallWhere,
        group: ['employee_id', 'employee.emp_id', 'employee.full_name'],
        include: [{ association: 'employee', attributes: ['emp_id', 'full_name'] }],
        order: [[literal('total_calls'), 'DESC']],
        raw: true,
        nest: true,
      }),
    ]);

    // Top performers calculation
    const topPerformers = employeesList.map((row) => {
      const fullName = row.employee?.full_name || row.employee_id || '';
      return {
        name: (fullName.split(' ')[0]) || row.employee_id,
        fullName,
        emp_id: row.employee_id,
        calls: Number(row.total_calls) || 0,
        clientCalls: Number(row.client_calls) || 0,
      };
    });

    const totalDurationSeconds = totalDurationResult || 0;
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);

    // Real daily call volume for the last 7 days (accurate, all calls).
    const weekAgo = new Date();
    weekAgo.setHours(0, 0, 0, 0);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const dailyRaw = await CallLog.findAll({
      attributes: [
        [fn('date', col('created_at')), 'day'],
        [fn('COUNT', col('id')), 'count'],
      ],
      where: { created_at: { [Op.gte]: weekAgo } },
      group: [fn('date', col('created_at'))],
      order: [[fn('date', col('created_at')), 'ASC']],
      raw: true,
    });
    // Build a continuous 7-day series (fill missing days with 0).
    const countByDay = new Map(
      dailyRaw.map((r) => [String(r.day).slice(0, 10), Number(r.count) || 0]),
    );
    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dailyTrend = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      // Build the key from LOCAL date parts (matches how created_at::date is
      // grouped in the server's timezone), avoiding a UTC/local off-by-one.
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const label = `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
      dailyTrend.push({
        date: key,
        label,
        calls: countByDay.get(key) || 0,
      });
    }

    return res.json({
      metrics: {
        totalEmployees,
        activeEmployees,
        totalCalls,
        todayCalls,
        clientCalls,
        businessRatio: totalCalls > 0 ? Math.round((clientCalls / totalCalls) * 100) : 0,
        totalRecordings,
        uploadedRecordings,
        totalDurationSeconds,
        durationFormatted: `${hours}h ${minutes}m`,
      },
      topPerformers,
      dailyTrend,
      recentCalls,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/employees
 */
export const employees = async ({ req, res }) => {
  try {
    const { page = 1, limit = 50, q, is_active } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));

    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true' || is_active === true;
    }
    if (q) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${q}%` } },
        { emp_id: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { phone_number: { [Op.iLike]: `%${q}%` } },
        { designation: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const { count, rows } = await Employee.findAndCountAll({
      where,
      include: [
        { association: 'devices', attributes: ['serial_number', 'link_status'] },
        { association: 'callLogs', attributes: ['id', 'call_category'] },
      ],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['emp_id', 'ASC']],
      distinct: true,
    });

    const enrichedEmployees = rows.map((emp) => {
      const calls = emp.callLogs || [];
      return {
        ...emp.toJSON(),
        total_calls: calls.length,
        business_calls: calls.filter((c) => c.call_category === 'CLIENT').length,
      };
    });

    return res.json({
      data: enrichedEmployees,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Employees query error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/companies
 * Synthesizes company roster from CallFormData and linked CallLogs
 */
export const companies = async ({ req, res }) => {
  try {
    const { q } = req.query;
    const formWhere = {};
    if (q) {
      formWhere[Op.or] = [
        { company_name: { [Op.iLike]: `%${q}%` } },
        { customer_name: { [Op.iLike]: `%${q}%` } },
      ];
    }

    const forms = await CallFormData.findAll({
      where: formWhere,
      include: [
        {
          association: 'callLog',
          attributes: ['id', 'employee_id', 'createdAt'],
          include: [{ association: 'employee', attributes: ['emp_id', 'full_name'] }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Aggregate by company_name
    const companyMap = new Map();

    forms.forEach((form) => {
      const name = form.company_name;
      if (!companyMap.has(name)) {
        companyMap.set(name, {
          id: form.id,
          name,
          contactPerson: form.customer_name,
          totalCalls: 0,
          lastContacted: form.createdAt,
          assignedSalesperson: form.callLog?.employee?.full_name || 'Unassigned',
          recentReason: form.reason_for_call,
          recentNotes: form.notes,
        });
      }

      const item = companyMap.get(name);
      item.totalCalls += 1;
      if (new Date(form.createdAt) > new Date(item.lastContacted)) {
        item.lastContacted = form.createdAt;
        item.contactPerson = form.customer_name;
        item.recentReason = form.reason_for_call;
        item.recentNotes = form.notes;
      }
    });

    const companyList = Array.from(companyMap.values());

    return res.json({
      data: companyList,
      total: companyList.length,
    });
  } catch (error) {
    console.error('Companies error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/devices
 */
export const devices = ({ req, res }) => {
  return paginate(Device, req, res, {}, [
    { association: 'employee', attributes: ['emp_id', 'full_name', 'email', 'phone_number'] },
  ], [['serial_number', 'ASC']]);
};

/**
 * GET /api/reports
 *
 * Date-filtered analytics for managers: per-employee call breakdown and an
 * overall category breakdown. Computed with DB aggregation (not capped), so
 * totals are accurate. Optional filters: from, to (dates), employee (emp_id).
 * Read-only — does not touch the schema.
 */
export const reports = async (req, res) => {
  try {
    const { from, to, employee } = req.query;

    const where = {};
    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from);
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = toEnd;
      }
    }
    if (employee) where.employee_id = employee;

    // Per-employee aggregation: total calls, client calls, total duration.
    const perEmployeeRaw = await CallLog.findAll({
      attributes: [
        'employee_id',
        [fn('COUNT', col('CallLog.id')), 'total_calls'],
        [fn('COUNT', literal("CASE WHEN call_category = 'CLIENT' THEN 1 END")), 'client_calls'],
        [fn('COALESCE', fn('SUM', col('duration_seconds')), 0), 'total_duration'],
      ],
      where,
      group: ['employee_id', 'employee.emp_id', 'employee.full_name'],
      include: [{ association: 'employee', attributes: ['emp_id', 'full_name'] }],
      order: [[literal('total_calls'), 'DESC']],
      raw: true,
      nest: true,
    });

    const perEmployee = perEmployeeRaw.map((r) => ({
      emp_id: r.employee_id,
      name: (r.employee?.full_name || r.employee_id || '').split(' ')[0] || r.employee_id,
      fullName: r.employee?.full_name || r.employee_id,
      calls: Number(r.total_calls) || 0,
      clientCalls: Number(r.client_calls) || 0,
      durationSeconds: Number(r.total_duration) || 0,
    }));

    // Category breakdown across the whole (filtered) range.
    const categoryRaw = await CallLog.findAll({
      attributes: ['call_category', [fn('COUNT', col('id')), 'count']],
      where,
      group: ['call_category'],
      raw: true,
    });
    const categoryData = categoryRaw.map((r) => ({
      name: String(r.call_category || 'UNKNOWN').replace('_', ' '),
      count: Number(r.count) || 0,
    }));

    const totalCalls = perEmployee.reduce((s, e) => s + e.calls, 0);
    const totalDuration = perEmployee.reduce((s, e) => s + e.durationSeconds, 0);

    return res.json({
      range: { from: from || null, to: to || null },
      totals: {
        calls: totalCalls,
        durationSeconds: totalDuration,
        employees: perEmployee.length,
      },
      perEmployee,
      categoryData,
    });
  } catch (error) {
    console.error('Reports query error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/employees/short-calls
 *
 * Employees who have short calls (duration below a threshold, default 15s).
 * Returns each employee with their short-call count and their total calls,
 * ordered by the most short calls first. Optional filters: threshold, from, to.
 */
export const shortCallEmployees = async (req, res) => {
  try {
    const { threshold = 15, from, to } = req.query;
    const seconds = Math.max(1, parseInt(threshold, 10) || 15);

    const dateWhere = {};
    if (from || to) {
      dateWhere.created_at = {};
      if (from) dateWhere.created_at[Op.gte] = new Date(from);
      if (to) dateWhere.created_at[Op.lte] = new Date(to);
    }

    // Count short calls per employee.
    const shortRows = await CallLog.findAll({
      attributes: [
        'employee_id',
        [fn('COUNT', col('id')), 'short_calls'],
        [fn('MIN', col('duration_seconds')), 'shortest_seconds'],
      ],
      where: {
        ...dateWhere,
        duration_seconds: { [Op.lt]: seconds },
      },
      group: ['employee_id'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    });

    if (shortRows.length === 0) {
      return res.json({ threshold: seconds, total: 0, data: [] });
    }

    const empIds = shortRows.map((r) => r.employee_id);

    // Total calls per employee (for context), and employee details.
    const totalRows = await CallLog.findAll({
      attributes: ['employee_id', [fn('COUNT', col('id')), 'total_calls']],
      where: { employee_id: empIds },
      group: ['employee_id'],
      raw: true,
    });
    const totalMap = new Map(totalRows.map((r) => [r.employee_id, Number(r.total_calls)]));

    const emps = await Employee.findAll({
      where: { emp_id: empIds },
      attributes: ['emp_id', 'full_name', 'email', 'phone_number', 'designation', 'is_active'],
      raw: true,
    });
    const empMap = new Map(emps.map((e) => [e.emp_id, e]));

    const data = shortRows.map((r) => {
      const emp = empMap.get(r.employee_id) || {};
      return {
        emp_id: r.employee_id,
        full_name: emp.full_name || r.employee_id,
        email: emp.email || null,
        phone_number: emp.phone_number || null,
        designation: emp.designation || null,
        is_active: emp.is_active ?? null,
        short_calls: Number(r.short_calls),
        shortest_seconds: Number(r.shortest_seconds),
        total_calls: totalMap.get(r.employee_id) || Number(r.short_calls),
      };
    });

    return res.json({ threshold: seconds, total: data.length, data });
  } catch (error) {
    console.error('Short-call employees error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/calls
 */
export const calls = async (req, res) => {
  try {
    const {
      employee,
      device,
      direction,
      category,
      classification, // alias for category
      recordingStatus,
      company,
      from,
      to,
      maxDuration,
      minDuration,
      q,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(limit, 10) || 50));

    const where = {};
    if (employee) where.employee_id = employee;
    if (device) where.device_serial = device;
    if (direction) where.call_direction = direction;

    const cat = category || classification;
    if (cat) {
      if (cat === 'BUSINESS') where.call_category = 'CLIENT';
      else where.call_category = cat;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }

    // Duration filters (seconds). e.g. maxDuration=15 -> calls shorter than 15s.
    const maxDur = maxDuration !== undefined ? parseInt(maxDuration, 10) : null;
    const minDur = minDuration !== undefined ? parseInt(minDuration, 10) : null;
    if (Number.isInteger(maxDur) || Number.isInteger(minDur)) {
      where.duration_seconds = {};
      if (Number.isInteger(minDur)) where.duration_seconds[Op.gte] = minDur;
      if (Number.isInteger(maxDur)) where.duration_seconds[Op.lt] = maxDur;
    }

    if (recordingStatus) {
      if (recordingStatus === 'HAS_RECORDING' || recordingStatus === 'YES') {
        where.has_recording = true;
      } else if (recordingStatus === 'NONE' || recordingStatus === 'NO') {
        where.has_recording = false;
      }
    }

    if (q) {
      where[Op.or] = [
        { caller_number: { [Op.iLike]: `%${q}%` } },
        { callee_number: { [Op.iLike]: `%${q}%` } },
        { employee_id: { [Op.iLike]: `%${q}%` } },
        { device_serial: { [Op.iLike]: `%${q}%` } },
        // Search the joined employee's name and email too. The
        // $association.column$ syntax references the included Employee table.
        { '$employee.full_name$': { [Op.iLike]: `%${q}%` } },
        { '$employee.email$': { [Op.iLike]: `%${q}%` } },
      ];
    }

    const callFormWhere = company ? { company_name: { [Op.iLike]: `%${company}%` } } : undefined;
    const recordingWhere = (recordingStatus && ['UPLOADED', 'COMPLETED', 'PENDING', 'FAILED'].includes(recordingStatus))
      ? { upload_status: recordingStatus === 'UPLOADED' ? 'COMPLETED' : recordingStatus }
      : undefined;

    const { count, rows } = await CallLog.findAndCountAll({
      where,
      include: [
        { association: 'employee', attributes: ['emp_id', 'full_name', 'email', 'phone_number'] },
        { association: 'device', attributes: ['serial_number', 'phone_number_1'] },
        { association: 'callForm', where: callFormWhere, required: !!company },
        { association: 'recording', where: recordingWhere, required: !!recordingWhere },
      ],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      order: [['createdAt', 'DESC']],
      // subQuery:false is required so the $employee.full_name$ reference in the
      // WHERE clause resolves against the joined table rather than a subquery.
      subQuery: false,
      distinct: true,
    });

    return res.json({
      data: rows,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Calls query error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/calls/:id
 */
export const call = async (req, res) => {
  try {
    const data = await CallLog.findByPk(req.params.id, {
      include: [
        { association: 'employee', attributes: ['emp_id', 'full_name', 'email', 'phone_number'] },
        { association: 'device', attributes: ['serial_number', 'phone_number_1'] },
        { association: 'callForm', attributes: ['company_name', 'customer_name', 'reason_for_call', 'notes'] },
        { association: 'recording', attributes: ['id', 'upload_status', 's3_key', 'file_size_bytes', 'local_file_path'] },
      ],
    });

    if (!data) {
      return res.status(404).json({ message: 'Call not found' });
    }

    return res.json(data);
  } catch (error) {
    console.error('Call fetch error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/recordings
 */
export const recordings = async ({ req, res }) => {
  try {
    const { from, to, category, q, page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(limit, 10) || 100));

    // Filters that apply to the recording row itself.
    const recWhere = {};
    if (q) {
      recWhere[Op.or] = [
        { s3_key: { [Op.iLike]: `%${q}%` } },
        { file_name: { [Op.iLike]: `%${q}%` } },
        { '$callLog.employee.full_name$': { [Op.iLike]: `%${q}%` } },
        { '$callLog.emp_id$': { [Op.iLike]: `%${q}%` } },
      ];
    }

    // Filters that apply to the linked call log (date range, category).
    const callLogWhere = {};
    if (from || to) {
      callLogWhere.created_at = {};
      if (from) callLogWhere.created_at[Op.gte] = new Date(from);
      if (to) {
        // Make the "to" date inclusive of the whole day.
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        callLogWhere.created_at[Op.lte] = toEnd;
      }
    }
    if (category) callLogWhere.call_category = category;
    const filterByCallLog = Object.keys(callLogWhere).length > 0;

    const { count, rows } = await CallRecording.findAndCountAll({
      where: recWhere,
      include: [
        {
          association: 'callLog',
          attributes: ['id', 'device_serial', 'call_direction', 'duration_seconds', 'call_category', 'createdAt'],
          where: filterByCallLog ? callLogWhere : undefined,
          required: filterByCallLog,
          include: [
            { association: 'employee', attributes: ['emp_id', 'full_name'] },
            { association: 'device', attributes: ['serial_number', 'phone_number_1'] },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      subQuery: false,
      distinct: true,
    });

    return res.json({
      data: rows,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / pageSize),
    });
  } catch (error) {
    console.error('Recordings query error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/recordings/:id/play
 */
export const play = async (req, res) => {
  try {
    const recording = await CallRecording.findByPk(req.params.id, {
      include: [{ association: 'callLog', attributes: ['id', 'employee_id'] }],
    });

    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    const url = await playbackUrl(recording.s3_key);

    return res.json({
      url,
      expiresIn: 300,
      fileName: recording.s3_key ? recording.s3_key.split('/').pop() : 'recording.m4a',
      fileSize: recording.file_size_bytes,
      status: recording.upload_status,
    });
  } catch (error) {
    console.error('Recording playback error:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

/**
 * GET /api/audit-logs
 */
export const audit = ({ req, res }) => {
  return paginate(AuditLog, req, res, {}, [], [['created_at', 'DESC']]);
};
