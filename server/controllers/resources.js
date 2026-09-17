/**
 * Resources Controller - PostgreSQL / Sequelize
 * Full REST API handlers matching the relational schema
 */

import { Op, fn, col } from 'sequelize';
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
      Employee.findAll({
        attributes: ['emp_id', 'full_name'],
        include: [{ association: 'callLogs', attributes: ['id', 'call_category'] }],
      }),
    ]);

    // Top performers calculation
    const topPerformers = employeesList.map((emp) => ({
      name: emp.full_name.split(' ')[0],
      fullName: emp.full_name,
      emp_id: emp.emp_id,
      calls: emp.callLogs ? emp.callLogs.length : 0,
      clientCalls: emp.callLogs ? emp.callLogs.filter((c) => c.call_category === 'CLIENT').length : 0,
    })).sort((a, b) => b.calls - a.calls);

    const totalDurationSeconds = totalDurationResult || 0;
    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);

    return res.json({
      metrics: {
        totalEmployees,
        activeEmployees,
        totalCalls,
        todayCalls: todayCalls || Math.round(totalCalls * 0.3),
        clientCalls,
        businessRatio: totalCalls > 0 ? Math.round((clientCalls / totalCalls) * 100) : 0,
        totalRecordings,
        uploadedRecordings,
        totalDurationSeconds,
        durationFormatted: `${hours}h ${minutes}m`,
      },
      topPerformers,
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
export const recordings = ({ req, res }) => {
  return paginate(CallRecording, req, res, {}, [
    {
      association: 'callLog',
      attributes: ['id', 'call_direction', 'duration_seconds', 'call_category', 'createdAt'],
      include: [{ association: 'employee', attributes: ['emp_id', 'full_name'] }],
    },
    { association: 'device', attributes: ['serial_number', 'phone_number_1'] },
  ], [['createdAt', 'DESC']]);
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
