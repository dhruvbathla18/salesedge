# React Component Migration Guide

## Overview
Guide for updating React components to work with new PostgreSQL schema and API services.

---

## 1. Component Update Checklist by Page

### Dashboard Component
**File:** `src/pages/Dashboard.jsx` or `src/components/Dashboard.jsx`

**Changes Required:**

```javascript
// OLD CODE
const calls = [{
  id: 'CALL-1042',
  name: 'Priya Sharma',           // ← OLD: from users.name
  company: 'Nexus Systems',       // ← OLD
  type: 'Outgoing',               // ← OLD
  direction: 'Outgoing',          // ← OLD field name
  duration: '08:42',              // ← OLD: duration
  classification: 'Business',     // ← OLD: from call_classifications
  recording: 'Uploaded'           // ← OLD
}];

// NEW CODE
import callLogService from '../services/callLogService';
import { CALL_DIRECTION_LABELS, CALL_CATEGORY_LABELS } from '../constants/enums';

async function loadDashboardData() {
  // Fetch today's calls with details
  const response = await callLogService.getTodayCallLogs(undefined, 10);
  
  return response.data.map(callLog => ({
    id: callLog.id,                           // ← UUID from call_logs
    employee_name: callLog.employee?.full_name,  // ← NEW: from employees.full_name
    company_name: callLog.call_form?.company_name || '—',  // ← NEW: from call_form_data
    call_direction: callLog.call_direction,   // ← NEW: INCOMING | OUTGOING | MISSED
    duration_seconds: callLog.duration_seconds, // ← NEW: seconds not string
    call_category: callLog.call_category,     // ← NEW: CLIENT | TEAM_MEMBER | PERSONAL | MISSED
    has_recording: callLog.has_recording,     // ← NEW: boolean
  }));
}

// In render:
<td>
  <span className={'direction ' + callLog.call_direction.toLowerCase()}>
    {callLog.call_direction === 'INCOMING' ? '↓' : '↑'} 
    {CALL_DIRECTION_LABELS[callLog.call_direction]}
  </span>
</td>
<td>{Math.floor(callLog.duration_seconds / 60)}:{String(callLog.duration_seconds % 60).padStart(2, '0')}</td>
<td>
  <Badge kind={
    callLog.call_category === 'CLIENT' ? 'danger' :
    callLog.call_category === 'TEAM_MEMBER' ? 'warning' : 'info'
  }>
    {CALL_CATEGORY_LABELS[callLog.call_category]}
  </Badge>
</td>
<td>
  {callLog.has_recording ? (
    <Badge kind="success">Uploaded</Badge>
  ) : callLog.call_category === 'CLIENT' ? (
    <Badge kind="secondary">Processing</Badge>
  ) : null}
</td>
```

**Key Changes:**
- Call data now comes from API, not hardcoded
- Access employee name via `callLog.employee.full_name`
- Company via `callLog.call_form.company_name`
- Direction is enum: `INCOMING`, `OUTGOING`, `MISSED`
- Duration is in seconds, not formatted string
- Category is enum: `CLIENT`, `TEAM_MEMBER`, `PERSONAL`, `MISSED`
- Recording exists only if `has_recording` is true

---

### Employees Component
**File:** `src/pages/Employees.jsx`

**Changes Required:**

```javascript
// OLD CODE
import { useState, useEffect } from 'react';

export function Employees() {
  const [rows] = useState([
    'Priya Sharma|EMP-018|Enterprise Sales|Active|165|142|Today, 10:42 AM',
    'Arjun Mehta|EMP-024|Inside Sales|Active|132|110|Today, 10:18 AM',
  ]);

  return <SimpleTable cols={['Employee', 'Employee ID', 'Department', 'Status', ...]} rows={rows} />;
}

// NEW CODE
import { useEffect, useState } from 'react';
import employeeService from '../services/employeeService';
import { CALL_CATEGORY_LABELS } from '../constants/enums';

export function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmployees() {
      try {
        // Fetch with pagination
        const response = await employeeService.getEmployees(50, 0, {
          is_active: true, // Filter active only
        });
        setEmployees(response.data);
      } catch (error) {
        console.error('Failed to load employees:', error);
      } finally {
        setLoading(false);
      }
    }

    loadEmployees();
  }, []);

  return (
    <section className="panel table-panel">
      <div className="filters">
        <div><Search size={16}/>Search records</div>
        <button><Filter size={16}/>Filters</button>
        <button className="primary">+ Add new</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Employee ID</th>
              <th>Designation</th>
              <th>Status</th>
              <th>Total calls</th>
              <th>Business calls</th>
              <th>Last call</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.emp_id}>
                <td>
                  <span className="person">{emp.full_name.split(' ').map(x => x[0]).join('')}</span>
                  <div>
                    <b>{emp.full_name}</b>        {/* ← Changed from 'name' */}
                    <small>{emp.email}</small>    {/* ← Use email instead of phone_no */}
                  </div>
                </td>
                <td>{emp.emp_id}</td>              {/* ← Changed from phone_no to emp_id */}
                <td>{emp.designation}</td>        {/* ← Changed from 'department' */}
                <td>
                  <Badge kind={emp.is_active ? 'uploaded' : 'neutral'}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </td>
                {/* TODO: Add call stats from callLogService.getEmployeeCallStats(emp.emp_id) */}
                <td>—</td>
                <td>—</td>
                <td>—</td>
                <td><button className="more"><MoreHorizontal size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

**Key Changes:**
- Import from `employeeService` instead of hardcoded data
- `phone_no` → `emp_id`
- `name` → `full_name`
- `department` → `designation`
- Check `is_active` to show status
- Load call statistics async from `callLogService`

---

### Devices Component (NEW)
**File:** `src/pages/Devices.jsx`

**New Component Template:**

```javascript
import { useEffect, useState } from 'react';
import deviceService from '../services/deviceService';
import employeeService from '../services/employeeService';
import { LINK_STATUS_LABELS, LINK_STATUS_COLORS } from '../constants/enums';

export function Devices() {
  const [devices, setDevices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [linkingDevice, setLinkingDevice] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [devicesRes, empRes] = await Promise.all([
          deviceService.getDevices(50, 0),
          employeeService.getEmployees(100, 0),
        ]);
        setDevices(devicesRes.data);
        setEmployees(empRes.data);
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleLinkDevice = async (serial, empId) => {
    try {
      setLinkingDevice(serial);
      await deviceService.linkDevice(serial, empId);
      // Refresh device list
      const res = await deviceService.getDevices(50, 0);
      setDevices(res.data);
    } catch (error) {
      alert('Failed to link device: ' + error.message);
    } finally {
      setLinkingDevice(null);
    }
  };

  const handleUnlinkDevice = async (serial) => {
    if (!confirm('Unlink this device?')) return;
    try {
      await deviceService.unlinkDevice(serial);
      const res = await deviceService.getDevices(50, 0);
      setDevices(res.data);
    } catch (error) {
      alert('Failed to unlink device: ' + error.message);
    }
  };

  return (
    <section className="panel table-panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Serial Number</th>
              <th>IMEI 1</th>
              <th>Phone 1</th>
              <th>Linked Employee</th>
              <th>Link Status</th>
              <th>Last Seen</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {devices.map(device => (
              <tr key={device.serial_number}>
                <td>{device.serial_number}</td>
                <td>{device.imei_1}</td>
                <td>{device.phone_number_1}</td>
                <td>
                  {device.employee ? (
                    <div>
                      <b>{device.employee.full_name}</b>
                      <small>{device.employee.emp_id}</small>
                    </div>
                  ) : (
                    <span className="neutral">Unlinked</span>
                  )}
                </td>
                <td>
                  <Badge kind={LINK_STATUS_COLORS[device.link_status]}>
                    {LINK_STATUS_LABELS[device.link_status]}
                  </Badge>
                </td>
                <td>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : '—'}</td>
                <td>
                  {device.link_status === 'UNLINKED' ? (
                    <select onChange={(e) => handleLinkDevice(device.serial_number, e.target.value)}>
                      <option value="">Link to...</option>
                      {employees.map(emp => (
                        <option key={emp.emp_id} value={emp.emp_id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                  ) : device.link_status !== 'DEACTIVATED' && (
                    <button onClick={() => handleUnlinkDevice(device.serial_number)}>Unlink</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

**Key Features:**
- Fetch devices with `deviceService.getDevices()`
- Show employee info if linked, "Unlinked" if `employee_id` is NULL
- Use `LINK_STATUS_LABELS` and `LINK_STATUS_COLORS` for display
- Link/unlink buttons
- Format timestamps to user locale

---

### Calls Component
**File:** `src/pages/Calls.jsx`

**Changes Required:**

```javascript
// OLD CODE
const calls = [
  {id: 'CALL-1042', name: 'Priya Sharma', company: 'Nexus Systems', 
   type: 'Outgoing', date: 'Today, 10:42 AM', duration: '08:42', 
   classification: 'Business', recording: 'Uploaded'},
];

return <SimpleTable cols={['Employee', 'Company', 'Direction', ...]} rows={...} />;

// NEW CODE
import callLogService from '../services/callLogService';
import callFormService from '../services/callFormService';
import recordingService from '../services/recordingService';
import { CALL_CATEGORY_LABELS, CALL_DIRECTION_LABELS, UPLOAD_STATUS_LABELS } from '../constants/enums';

export function Calls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    call_category: undefined,
    call_direction: undefined,
  });

  useEffect(() => {
    async function loadCalls() {
      try {
        const response = await callLogService.getCallLogs({
          ...filters,
          limit: 50,
          offset: 0,
        });
        setCalls(response.data);
      } catch (error) {
        console.error('Failed to load calls:', error);
      } finally {
        setLoading(false);
      }
    }
    loadCalls();
  }, [filters]);

  return (
    <section className="panel table-panel">
      <div className="filters">
        <div><Search size={16}/>Search calls</div>
        <button><Filter size={16}/>Filters</button>
        <select onChange={(e) => setFilters({...filters, call_direction: e.target.value})}>
          <option value="">All Directions</option>
          <option value="INCOMING">Incoming</option>
          <option value="OUTGOING">Outgoing</option>
          <option value="MISSED">Missed</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Company</th>
              <th>Direction</th>
              <th>Date & time</th>
              <th>Duration</th>
              <th>Category</th>
              <th>Recording</th>
              <th/>
            </tr>
          </thead>
          <tbody>
            {calls.map(call => (
              <tr key={call.id}>
                <td>
                  <span className="person">{call.employee?.full_name.split(' ').map(x => x[0]).join('')}</span>
                  <div>
                    <b>{call.employee?.full_name}</b>
                    <small>{call.employee?.emp_id}</small>
                  </div>
                </td>
                <td>{call.call_form?.company_name || '—'}</td>
                <td>
                  <span className={'direction ' + call.call_direction.toLowerCase()}>
                    {call.call_direction === 'INCOMING' ? '↓' : call.call_direction === 'OUTGOING' ? '↑' : '⊗'}
                    {CALL_DIRECTION_LABELS[call.call_direction]}
                  </span>
                </td>
                <td>{new Date(call.created_at).toLocaleString()}</td>
                <td>{Math.floor(call.duration_seconds / 60)}:{String(call.duration_seconds % 60).padStart(2, '0')}</td>
                <td>
                  <Badge kind={
                    call.call_category === 'CLIENT' ? 'danger' :
                    call.call_category === 'TEAM_MEMBER' ? 'warning' : 'info'
                  }>
                    {CALL_CATEGORY_LABELS[call.call_category]}
                  </Badge>
                </td>
                <td>
                  {call.has_recording ? (
                    <Badge kind={call.recording?.upload_status === 'COMPLETED' ? 'success' : 'info'}>
                      {UPLOAD_STATUS_LABELS[call.recording?.upload_status || 'PENDING']}
                    </Badge>
                  ) : (
                    <Badge kind="neutral">N/A</Badge>
                  )}
                </td>
                <td><button className="more"><MoreHorizontal size={18}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

**Key Changes:**
- Use `callLogService.getCallLogs()` with filters
- `call_direction` is enum: INCOMING, OUTGOING, MISSED
- `call_category` replaces classification
- Duration in seconds: `duration_seconds`
- Access employee via `call.employee.full_name`
- Show form data if `call.call_form` exists
- Show recording if `call.has_recording` is true
- Recording status from `call.recording.upload_status`

---

### Call Form Modal Component
**File:** `src/components/CallFormModal.jsx`

**Important:** Form only shows for CLIENT calls

```javascript
import { useEffect, useState } from 'react';
import callFormService from '../services/callFormService';
import { CALL_CATEGORY } from '../constants/enums';

export function CallFormModal({ callLog, onClose, onSubmit }) {
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ← CRITICAL: Only fetch form if call_category is CLIENT
    if (callLog.call_category !== CALL_CATEGORY.CLIENT) {
      setLoading(false);
      return;
    }

    async function loadForm() {
      try {
        const form = await callFormService.getCallFormByCallLogId(callLog.id);
        setFormData(form || {
          call_log_id: callLog.id,
          company_name: '',
          customer_name: '',
          reason_for_call: '',
          notes: '',
        });
      } catch (error) {
        console.error('Failed to load form:', error);
      } finally {
        setLoading(false);
      }
    }

    loadForm();
  }, [callLog]);

  // ← CRITICAL: Don't render if not CLIENT category
  if (callLog.call_category !== CALL_CATEGORY.CLIENT) {
    return null;
  }

  if (loading) return <div>Loading...</div>;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        // Update existing
        await callFormService.updateCallForm(formData.id, formData);
      } else {
        // Create new
        await callFormService.createCallForm(formData);
      }
      onSubmit();
    } catch (error) {
      alert('Error saving form: ' + error.message);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Call Details - {callLog.caller_number} → {callLog.callee_number}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Company Name
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
              required
            />
          </label>
          <label>
            Customer Name
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
              required
            />
          </label>
          <label>
            Reason for Call
            <input
              type="text"
              value={formData.reason_for_call}
              onChange={(e) => setFormData({...formData, reason_for_call: e.target.value})}
              required
            />
          </label>
          <label>
            Notes
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
            />
          </label>
          <button type="submit" className="primary">Submit</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </form>
      </div>
    </div>
  );
}
```

**Critical Rules:**
- ✅ Only render if `callLog.call_category === 'CLIENT'`
- ✅ Fetch via `callFormService.getCallFormByCallLogId()`
- ✅ Create if form doesn't exist, update if it does
- ❌ DO NOT show for TEAM_MEMBER, PERSONAL, MISSED, PENDING categories

---

### Recording Player Component
**File:** `src/components/RecordingPlayer.jsx`

**Important:** Recording only exists for CLIENT + TEAM_MEMBER calls

```javascript
import { useState, useEffect, useRef } from 'react';
import recordingService from '../services/recordingService';
import { Play, Pause, Download, RefreshCw } from 'lucide-react';

export function RecordingPlayer({ callLog, onClose }) {
  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  // ← CRITICAL: Only render for CLIENT and TEAM_MEMBER
  if (!['CLIENT', 'TEAM_MEMBER'].includes(callLog.call_category)) {
    return null;
  }

  // ← CRITICAL: Only render if call actually has recording
  if (!callLog.has_recording) {
    return (
      <div className="recording-player">
        <p>No recording available for this call</p>
        <button onClick={onClose}>Close</button>
      </div>
    );
  }

  const handlePlayClick = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }

    if (playbackUrl) {
      audioRef.current?.play();
      setPlaying(true);
      return;
    }

    // ← CRITICAL: Get pre-signed URL ON DEMAND
    // Never cache URLs - they expire after ~15 minutes
    setLoading(true);
    setError(null);

    try {
      // First, fetch recording metadata
      const recording = await recordingService.getRecordingByCallLogId(callLog.id);
      if (!recording) {
        setError('Recording metadata not found');
        return;
      }

      // Then get fresh pre-signed URL
      const urlData = await recordingService.getRecordingPlaybackUrl(recording.id);
      setPlaybackUrl(urlData.s3_url);
      
      // Auto-play after URL is ready
      setTimeout(() => {
        audioRef.current?.play();
        setPlaying(true);
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to load recording');
      console.error('Recording playback error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Clear cached URL and reload on next play
    setPlaybackUrl(null);
    setPlaying(false);
    audioRef.current?.pause();
  };

  return (
    <div className="recording-player">
      <div className="player-header">
        <h3>Recording Playback</h3>
        <p>{callLog.caller_number} → {callLog.callee_number}</p>
        <p className="duration">
          Duration: {Math.floor(callLog.duration_seconds / 60)}:{String(callLog.duration_seconds % 60).padStart(2, '0')}
        </p>
      </div>

      <div className="player-controls">
        <button
          onClick={handlePlayClick}
          disabled={loading}
          className="play-btn"
        >
          {loading ? <RefreshCw size={20} /> : playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button onClick={handleRefresh} disabled={loading} title="Reload URL">
          <RefreshCw size={18} />
        </button>
        {/* Download button: optional, if backend supports pre-signed download URLs */}
      </div>

      {error && <div className="error">{error}</div>}

      <audio
        ref={audioRef}
        src={playbackUrl || undefined}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div className="player-footer">
        <small>Pre-signed URL expires in 15 minutes</small>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

**Critical Rules:**
- ✅ Only render if `callLog.call_category` is `CLIENT` or `TEAM_MEMBER`
- ✅ Check `callLog.has_recording` before showing
- ✅ Get pre-signed URL **ON DEMAND** (every time user clicks play)
- ✅ **NEVER cache** the S3 URL - it expires
- ✅ URL expires after ~15 minutes, so refresh button available
- ❌ DO NOT show for PERSONAL, MISSED, PENDING

---

### Audit Logs Component
**File:** `src/pages/AuditLogs.jsx`

```javascript
import { useEffect, useState } from 'react';
import auditLogService from '../services/auditLogService';
import { AUDIT_ACTION_LABELS, ENTITY_TYPE, AUDIT_ACTION } from '../constants/enums';

export function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const response = await auditLogService.getAuditLogs({
          limit: 50,
          offset: 0,
        });
        setLogs(response.data);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  return (
    <section className="panel table-panel">
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Admin</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Changes</th>
              <th>Timestamp</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id}>
                <td><b>{log.admin_user}</b></td>
                <td>
                  <Badge>{AUDIT_ACTION_LABELS[log.action]}</Badge>
                </td>
                <td>{log.entity_type}</td>
                <td><code>{log.entity_id}</code></td>
                <td>{auditLogService.getChangeDescription(log)}</td>
                <td>{new Date(log.created_at).toLocaleString()}</td>
                <td><small>{log.ip_address}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

**Key Features:**
- Read-only: no edit/delete buttons
- Use `auditLogService.getChangeDescription()` to show what changed
- `admin_user` from JWT claims
- `action` is one of: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, EXPORT
- `entity_type` is one of: EMPLOYEE, DEVICE
- Timestamps in user locale

---

## 2. API Usage Examples

### Example 1: Fetch All Calls for an Employee

```typescript
import callLogService from './services/callLogService';

async function getEmployeeCallHistory(emp_id: string) {
  try {
    const response = await callLogService.getEmployeeCallLogs(
      emp_id,
      50, // limit
      0   // offset
    );
    
    console.log(`Total calls: ${response.total}`);
    
    response.data.forEach(call => {
      console.log(`${call.call_direction} call: ${call.caller_number} → ${call.callee_number}`);
      
      // Check if form exists (CLIENT only)
      if (call.call_form) {
        console.log(`  Company: ${call.call_form.company_name}`);
      }
      
      // Check if recording exists (CLIENT + TEAM_MEMBER only)
      if (call.has_recording && call.recording) {
        console.log(`  Recording status: ${call.recording.upload_status}`);
      }
    });
  } catch (error) {
    console.error('Failed to load calls:', error);
  }
}
```

### Example 2: Link Device to Employee

```typescript
import deviceService from './services/deviceService';

async function assignDeviceToEmployee(serial_number: string, emp_id: string) {
  try {
    const device = await deviceService.linkDevice(serial_number, emp_id);
    console.log(`Device linked! Status: ${device.link_status}`);
  } catch (error) {
    console.error('Failed to link device:', error);
  }
}
```

### Example 3: Play Recording (ON DEMAND URL)

```typescript
import recordingService from './services/recordingService';

async function playRecording(recording_id: string) {
  try {
    // Generate fresh pre-signed URL (ON DEMAND)
    // This URL expires after ~15 minutes
    const { s3_url, expires_at } = await recordingService.getRecordingPlaybackUrl(recording_id);
    
    const audio = new Audio(s3_url);
    audio.play();
    
    console.log(`Recording will expire at: ${expires_at}`);
  } catch (error) {
    console.error('Failed to play recording:', error);
  }
}
```

### Example 4: Get Audit History for an Employee

```typescript
import auditLogService from './services/auditLogService';

async function getEmployeeAuditHistory(emp_id: string) {
  try {
    const response = await auditLogService.getEmployeeAuditHistory(emp_id, 50, 0);
    
    response.data.forEach(log => {
      const change = auditLogService.getChangeDescription(log);
      console.log(`${log.admin_user} ${log.action}: ${change}`);
    });
  } catch (error) {
    console.error('Failed to load audit history:', error);
  }
}
```

---

## 3. Error Handling Pattern

```typescript
import { AxiosError } from 'axios';

async function exampleWithErrorHandling() {
  try {
    const data = await employeeService.getEmployee('EMP-0042');
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        // Token expired - will be auto-refreshed by interceptor
        console.log('Token refreshing...');
      } else if (error.response?.status === 404) {
        console.log('Employee not found');
      } else if (error.response?.status === 403) {
        console.log('Permission denied');
      } else if (error.response?.status >= 500) {
        console.log('Server error');
      }
    }
    throw error;
  }
}
```

---

## 4. Migration Checklist

### Phase 1: Setup (Complete FIRST)
- [ ] Create `src/types/interfaces.ts`
- [ ] Create `src/constants/enums.ts`
- [ ] Create `src/services/api.ts`
- [ ] Create `src/services/authService.ts`
- [ ] Update Auth context to use `authService`

### Phase 2: Services (Complete SECOND)
- [ ] Create `employeeService.ts`
- [ ] Create `deviceService.ts`
- [ ] Create `callLogService.ts`
- [ ] Create `callFormService.ts`
- [ ] Create `recordingService.ts`
- [ ] Create `auditLogService.ts`
- [ ] Test all services with backend

### Phase 3: Components (Complete THIRD)
- [ ] Dashboard.jsx - update field mappings
- [ ] Employees.jsx - fetch from service
- [ ] Devices.jsx - link/unlink UI
- [ ] Calls.jsx - new layout with enums
- [ ] CallFormModal.jsx - conditional render
- [ ] RecordingPlayer.jsx - on-demand URL
- [ ] AuditLogs.jsx - read-only audit view

### Phase 4: Testing
- [ ] Login/logout flow
- [ ] Token refresh on 401
- [ ] Employee CRUD
- [ ] Device linking/unlinking
- [ ] Call filtering
- [ ] Form submission for CLIENT calls
- [ ] Recording playback
- [ ] Audit log viewing

---

## Summary

Key migration points:
1. **All field names**: Use new snake_case names
2. **Enums**: Use exported enum constants for badges/labels
3. **Relationships**: Navigate via populated objects (e.g., `callLog.employee`, `callLog.call_form`)
4. **Conditionals**: Check `call_category` and `has_recording` before rendering
5. **S3 URLs**: Get on-demand, never cache
6. **JWT**: Auto-refreshed by axios interceptor
7. **Phone numbers**: Validate E.164 format
