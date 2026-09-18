// ============================================================================
// MIST AVINYA - PostgreSQL-Backed Admin Portal
// Live PostgreSQL database integration with rich schema sample data
// ============================================================================

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate
} from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  PhoneCall,
  Headphones,
  ChartNoAxesCombined,
  Smartphone,
  ClipboardList,
  Settings,
  LogOut,
  Play,
  Pause,
  LoaderCircle,
  Search,
  ChevronDown,
  ArrowUpRight,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  Volume2
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import './styles.css';

// ============================================================================
// CONFIGURATION & CONTEXT
// ============================================================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const Auth = createContext();
const useAuth = () => useContext(Auth);

const nav = [
  ['Dashboard', '/', LayoutDashboard],
  ['Employees', '/employees', Users],
  ['Companies', '/companies', Building2],
  ['Calls', '/calls', PhoneCall],
  ['Recordings', '/recordings', Headphones],
  ['Reports', '/reports', ChartNoAxesCombined],
  ['Devices', '/devices', Smartphone],
  ['Audit Logs', '/audit-logs', ClipboardList],
  ['Settings', '/settings', Settings]
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Authenticated API caller
 */
async function api(path, token, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers
    }
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.message || 'Unable to load data from server');
  }

  return response.status === 204 ? null : response.json();
}

const initials = (name = '?') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDuration = (seconds = 0) => {
  const mins = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
};

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date(value))
    : '—';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

function Badge({ children, kind }) {
  const badgeKind = (kind || String(children || '')).toLowerCase().replace(/[\s_]+/g, '_');
  return <span className={`badge ${badgeKind}`}>{children}</span>;
}

function Loading() {
  return (
    <article className="panel empty">
      <LoaderCircle className="spin" size={32} color="#6366f1" />
      <h3>Loading PostgreSQL data…</h3>
      <p>Fetching records from local relational database</p>
    </article>
  );
}

function ErrorPanel({ message }) {
  return (
    <article className="panel empty">
      <AlertCircle size={32} color="#f43f5e" />
      <h3>Could not load data</h3>
      <p>{message}</p>
    </article>
  );
}

function Layout({ children, title, sub }) {
  const { user, logout } = useAuth();

  return (
    <>
      <aside>
        <div className="brand">
          <div className="brand-icon">M</div>
          <div>
            MIST <b>Avinya</b>
            <small>Sales Intelligence</small>
          </div>
        </div>

        <div className="db-pill">
          <span className="db-dot"></span>
          <span>PostgreSQL Active</span>
        </div>

        <nav>
          {nav.map(([label, path, Icon]) => (
            <NavLink key={label} to={path} end={path === '/'}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="side-bottom">
          <button onClick={logout}>
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <h1>{title}</h1>
            <p>{sub}</p>
          </div>

          <div className="header-actions">
            <div className="user-profile">
              <div className="avatar">{initials(user?.name || 'Admin')}</div>
              <div className="user-info">
                <b>{user?.name || 'Administrator'}</b>
                <small>{(user?.role || 'ADMIN').replace('_', ' ')}</small>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </>
  );
}

function MetricCard({ title, value, subtext, icon: Icon, accent }) {
  return (
    <article className="metric">
      <div className={`metric-icon ${accent}`}>
        <Icon size={22} />
      </div>
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
        {subtext && <small>{subtext}</small>}
      </div>
    </article>
  );
}

/**
 * Data-fetching hook
 */
function useData(path) {
  const { token, logout } = useAuth();
  const [state, setState] = useState({ loading: true, data: null, error: '' });

  useEffect(() => {
    let active = true;

    api(path, token)
      .then((data) => {
        if (active) setState({ loading: false, data, error: '' });
      })
      .catch((error) => {
        if (error.message.includes('expired') || error.message.includes('Authentication required')) {
          logout();
        } else if (active) {
          setState({ loading: false, data: null, error: error.message });
        }
      });

    return () => {
      active = false;
    };
  }, [path, token, logout]);

  return state;
}

// ============================================================================
// PAGE: DASHBOARD
// ============================================================================

function Dashboard() {
  const [perfPeriod, setPerfPeriod] = useState('all');
  const dashData = useData(`/dashboard?period=${perfPeriod}`);
  const callsData = useData('/calls?limit=100');

  if (dashData.loading || callsData.loading) {
    return (
      <Layout title="Dashboard" sub="PostgreSQL-backed real-time metrics">
        <Loading />
      </Layout>
    );
  }

  if (dashData.error || callsData.error) {
    return (
      <Layout title="Dashboard" sub="PostgreSQL-backed real-time metrics">
        <ErrorPanel message={dashData.error || callsData.error} />
      </Layout>
    );
  }

  const metrics = dashData.data.metrics || {};
  const topPerformers = dashData.data.topPerformers || [];
  const calls = callsData.data?.data || [];

  // Real 7-day call volume from the backend (accurate, all calls, not capped).
  const dailyData = dashData.data?.dailyTrend || [];

  return (
    <Layout title="Dashboard" sub="Live sales performance & call intelligence from PostgreSQL">
      {/* Metrics Row */}
      <section className="metrics">
        <MetricCard
          title="Total Employees"
          value={metrics.totalEmployees}
          subtext={`${metrics.activeEmployees} active on team`}
          icon={Users}
          accent="purple"
        />
        <MetricCard
          title="Total Calls"
          value={metrics.totalCalls}
          subtext={`${metrics.todayCalls} recorded today`}
          icon={PhoneCall}
          accent="blue"
        />
        <MetricCard
          title="Business Calls"
          value={metrics.clientCalls}
          subtext={`${metrics.businessRatio}% business ratio`}
          icon={Building2}
          accent="orange"
        />
        <MetricCard
          title="Call Duration"
          value={metrics.durationFormatted || '0m'}
          subtext={`${metrics.uploadedRecordings} recordings stored`}
          icon={Headphones}
          accent="green"
        />
      </section>

      {/* Grid 1: Weekly Volume & Quick Insights */}
      <section className="grid-two">
        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Call volume trend</h3>
              <p>Calls per day over the last 7 days</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="linear"
                dataKey="calls"
                stroke="#6366f1"
                strokeWidth={3}
                fill="url(#callGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Performance insights</h3>
              <p>Key sales operational metrics</p>
            </div>
          </div>
          <div className="insight">
            <span className="mini purple"><PhoneCall size={18} /></span>
            <div>
              <b>{metrics.businessRatio}%</b>
              <p>Client business call ratio</p>
            </div>
            <em>Active</em>
          </div>
          <div className="insight">
            <span className="mini orange"><Building2 size={18} /></span>
            <div>
              <b>{metrics.clientCalls} Accounts</b>
              <p>Client conversations logged</p>
            </div>
            <em>Verified</em>
          </div>
          <div className="insight">
            <span className="mini green"><Headphones size={18} /></span>
            <div>
              <b>{metrics.uploadedRecordings} Files</b>
              <p>Recordings in S3 storage</p>
            </div>
            <em>Secure</em>
          </div>
        </article>
      </section>

      {/* Grid 2: Top Performers & Recent Activity */}
      <section className="grid-two">
        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Top performers</h3>
              <p>Calls per employee ({perfPeriod === 'all' ? 'all time' : perfPeriod === 'today' ? 'today' : perfPeriod === 'week' ? 'last 7 days' : 'last 30 days'})</p>
            </div>
            <select
              value={perfPeriod}
              onChange={(e) => setPerfPeriod(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 12 }}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topPerformers}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="calls" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Storage & sync status</h3>
              <p>PostgreSQL schema health & recording status</p>
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="insight">
              <span className="mini green"><CheckCircle2 size={18} /></span>
              <div>
                <b>PostgreSQL 16 (Local)</b>
                <p>Database: mist_avinya_db</p>
              </div>
              <em>Healthy</em>
            </div>
            <div className="insight">
              <span className="mini purple"><Database size={18} /></span>
              <div>
                <b>7 Relational Tables</b>
                <p>Sequelize ORM managed schema</p>
              </div>
              <em>Synced</em>
            </div>
            <div className="insight">
              <span className="mini orange"><Smartphone size={18} /></span>
              <div>
                <b>{metrics.totalEmployees} Linked Devices</b>
                <p>Hardware provisioning active</p>
              </div>
              <em>Online</em>
            </div>
          </div>
        </article>
      </section>

      {/* Recent Calls Table */}
      <CallsTable calls={calls.slice(0, 5)} compact />
    </Layout>
  );
}

// ============================================================================
// CALLS TABLE COMPONENT
// ============================================================================

function CallsTable({ calls = [], compact = false }) {
  const { token } = useAuth();
  const [selectedCall, setSelectedCall] = useState(null);
  const [playingCallAudio, setPlayingCallAudio] = useState({});

  const playCall = async (call) => {
    try {
      const recId = call.recording?.id;
      if (!recId) {
        // Fallback or find recording
        const data = await api(`/recordings?limit=100`, token);
        const match = data.data?.find((r) => r.callLog?.id === call.id || r.call_log_id === call.id);
        if (match) {
          const playData = await api(`/recordings/${match.id}/play`, token);
          setPlayingCallAudio((prev) => ({ ...prev, [call.id]: playData.url }));
          return;
        }
      } else {
        const playData = await api(`/recordings/${recId}/play`, token);
        setPlayingCallAudio((prev) => ({ ...prev, [call.id]: playData.url }));
        return;
      }
    } catch (e) {
      window.alert('Playback error: ' + e.message);
    }
  };

  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <h3>{compact ? 'Recent activity' : 'All recorded calls'}</h3>
          <p>{compact ? 'Latest call records from team devices' : 'Search, inspect notes, and verify recordings'}</p>
        </div>
        {compact && (
          <NavLink to="/calls" className="primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
            View all calls
          </NavLink>
        )}
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Company & Contact</th>
              <th>Direction</th>
              <th>Date & Time</th>
              <th>Duration</th>
              <th>Category</th>
              <th>Recording</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {calls.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '32px' }}>
                  No call records found matching criteria.
                </td>
              </tr>
            ) : (
              calls.map((call) => {
                const empName = call.employee?.full_name || call.employee_id || 'Unknown';
                const compName = call.callForm?.company_name || '—';
                const custName = call.callForm?.customer_name;
                const direction = call.call_direction || 'OUTGOING';
                const isPlaying = playingCallAudio[call.id];

                return (
                  <tr key={call.id}>
                    <td>
                      <span className="person">{initials(empName)}</span>
                      <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <b>{empName}</b>
                        <small>{call.device_serial || call.employee_id}</small>
                      </div>
                    </td>
                    <td>
                      <b>{compName}</b>
                      {custName && <small>{custName}</small>}
                    </td>
                    <td>
                      <span className={`direction ${direction.toLowerCase()}`}>
                        {direction === 'INCOMING' ? '↓' : direction === 'OUTGOING' ? '↑' : '✕'} {direction}
                      </span>
                    </td>
                    <td>{formatDate(call.createdAt || call.created_at)}</td>
                    <td>{formatDuration(call.duration_seconds)}</td>
                    <td>
                      <Badge kind={call.call_category}>{call.call_category}</Badge>
                    </td>
                    <td>
                      {call.has_recording ? (
                        isPlaying ? (
                          <div style={{ minWidth: 200 }}>
                            <audio controls autoPlay src={isPlaying} style={{ height: 30 }} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="primary playback"
                            style={{ fontSize: 11, padding: '3px 8px' }}
                            onClick={() => playCall(call)}
                          >
                            <Play size={11} /> Play Audio
                          </button>
                        )
                      ) : (
                        <Badge kind="neutral">None</Badge>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {call.callForm && (
                          <button
                            type="button"
                            className="filter-reset"
                            style={{ padding: '4px 8px', fontSize: '11px' }}
                            onClick={() => setSelectedCall(call)}
                          >
                            Notes
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Notes & Recording Modal */}
      {selectedCall && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
            padding: 20
          }}
          onClick={() => setSelectedCall(null)}
        >
          <div
            className="panel"
            style={{ maxWidth: 540, width: '100%', background: '#fff', borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel-title">
              <div>
                <h3>{selectedCall.callForm?.company_name}</h3>
                <p>Contact: {selectedCall.callForm?.customer_name}</p>
              </div>
              <button
                type="button"
                className="filter-reset"
                onClick={() => setSelectedCall(null)}
              >
                ✕ Close
              </button>
            </div>
            <div style={{ margin: '16px 0' }}>
              <b style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Reason for Call</b>
              <p style={{ marginTop: 4, color: '#1e293b' }}>{selectedCall.callForm?.reason_for_call || 'None specified'}</p>
            </div>
            <div style={{ margin: '16px 0' }}>
              <b style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase' }}>Meeting Notes</b>
              <p style={{ marginTop: 4, color: '#334155', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                {selectedCall.callForm?.notes || 'No detailed notes recorded for this call.'}
              </p>
            </div>
            {selectedCall.has_recording && (
              <div style={{ margin: '16px 0', padding: 12, background: '#f1f5f9', borderRadius: 10 }}>
                <b style={{ fontSize: 12, color: '#334155', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Call Audio Playback</b>
                {playingCallAudio[selectedCall.id] ? (
                  <audio controls autoPlay src={playingCallAudio[selectedCall.id]} style={{ width: '100%', height: 34 }} />
                ) : (
                  <button
                    type="button"
                    className="primary playback"
                    onClick={() => playCall(selectedCall)}
                  >
                    <Play size={14} /> Listen to Audio
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748b', marginTop: 16 }}>
              <span>Caller: {selectedCall.caller_number}</span>
              <span>Callee: {selectedCall.callee_number}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// PAGE: EMPLOYEES
// ============================================================================

function Employees() {
  const result = useData('/employees?limit=100');
  const [search, setSearch] = useState('');

  if (result.loading) {
    return (
      <Layout title="Employees" sub="Sales team directory">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Employees" sub="Sales team directory">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const employees = (result.data?.data || []).filter((emp) => {
    const q = search.toLowerCase();
    return (
      !q ||
      emp.full_name?.toLowerCase().includes(q) ||
      emp.emp_id?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.designation?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout title="Employees" sub="PostgreSQL roster of sales reps, accounts, and hardware links">
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Search Team</h3>
            <p>Find employees by name, employee ID, phone or designation</p>
          </div>
          {search && (
            <button type="button" className="filter-reset" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
        <div className="search-shell">
          <input
            type="search"
            placeholder="Search employee name, EMP-XXXX, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Team Roster</h3>
            <p>Showing {employees.length} employee records</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Designation</th>
                <th>Phone Number</th>
                <th>Email</th>
                <th>Calls Logged</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.emp_id}>
                  <td>
                    <span className="person">{initials(emp.full_name)}</span>
                    <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                      <b>{emp.full_name}</b>
                    </div>
                  </td>
                  <td><code>{emp.emp_id}</code></td>
                  <td>{emp.designation}</td>
                  <td>{emp.phone_number}</td>
                  <td>{emp.email}</td>
                  <td>
                    <b>{emp.total_calls || 0} calls</b>
                    <small>{emp.business_calls || 0} business</small>
                  </td>
                  <td>
                    <Badge kind={emp.is_active ? 'active' : 'inactive'}>
                      {emp.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

// ============================================================================
// PAGE: COMPANIES
// ============================================================================

function Companies() {
  const result = useData('/companies');
  const [search, setSearch] = useState('');

  if (result.loading) {
    return (
      <Layout title="Companies" sub="Client accounts & contacts">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Companies" sub="Client accounts & contacts">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const companies = (result.data?.data || []).filter((comp) => {
    const q = search.toLowerCase();
    return (
      !q ||
      comp.name?.toLowerCase().includes(q) ||
      comp.contactPerson?.toLowerCase().includes(q) ||
      comp.assignedSalesperson?.toLowerCase().includes(q)
    );
  });

  return (
    <Layout title="Companies" sub="Client accounts from CallFormData in PostgreSQL">
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Account Search</h3>
            <p>Filter companies by name or primary contact person</p>
          </div>
          {search && (
            <button type="button" className="filter-reset" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
        <div className="search-shell">
          <input
            type="search"
            placeholder="Search company or contact person..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Client Accounts</h3>
            <p>Showing {companies.length} active corporate accounts</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Primary Contact</th>
                <th>Assigned Sales Rep</th>
                <th>Total Calls</th>
                <th>Last Contacted</th>
                <th>Recent Note</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((comp) => (
                <tr key={comp.id || comp.name}>
                  <td>
                    <b>{comp.name}</b>
                  </td>
                  <td>{comp.contactPerson}</td>
                  <td>{comp.assignedSalesperson}</td>
                  <td>
                    <Badge kind="client">{comp.totalCalls} calls</Badge>
                  </td>
                  <td>{formatDate(comp.lastContacted)}</td>
                  <td style={{ maxWidth: 320, whiteSpace: 'normal' }}>
                    <small style={{ color: '#475569' }}>{comp.recentNotes || comp.recentReason || '—'}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

// ============================================================================
// PAGE: CALLS
// ============================================================================

function Calls() {
  const [filters, setFilters] = useState({
    direction: '',
    category: '',
    recordingStatus: '',
    company: '',
    from: '',
    to: '',
    q: '',
    durationOp: '',     // '', 'lt', 'gt', 'between'
    durationValue: '',
    durationValue2: '',
    durationUnit: 'sec' // 'sec' | 'min'
  });

  const queryParams = new URLSearchParams();
  const passthrough = ['direction', 'category', 'recordingStatus', 'company', 'from', 'to', 'q'];
  passthrough.forEach((k) => {
    if (filters[k]) queryParams.set(k, filters[k]);
  });

  // Translate the duration filter into min/max seconds.
  const mul = filters.durationUnit === 'min' ? 60 : 1;
  const dv1 = parseInt(filters.durationValue, 10);
  const dv2 = parseInt(filters.durationValue2, 10);
  if (filters.durationOp === 'lt' && Number.isFinite(dv1)) {
    queryParams.set('maxDuration', String(dv1 * mul));
  } else if (filters.durationOp === 'gt' && Number.isFinite(dv1)) {
    queryParams.set('minDuration', String(dv1 * mul + 1)); // strictly greater than
  } else if (filters.durationOp === 'between' && Number.isFinite(dv1) && Number.isFinite(dv2)) {
    queryParams.set('minDuration', String(Math.min(dv1, dv2) * mul));
    queryParams.set('maxDuration', String(Math.max(dv1, dv2) * mul + 1)); // inclusive upper
  }

  queryParams.set('limit', '200');

  const result = useData(`/calls?${queryParams.toString()}`);
  const hasActiveFilters =
    passthrough.some((k) => filters[k]) || (filters.durationOp && filters.durationValue);

  if (result.loading) {
    return (
      <Layout title="Calls" sub="Comprehensive call log history">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Calls" sub="Comprehensive call log history">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const calls = result.data?.data || [];

  return (
    <Layout title="Calls" sub="Complete PostgreSQL CallLog registry with relational joins">
      {/* Filter Grid */}
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Search & Filters</h3>
            <p>Refine call logs by direction, classification, date range, or audio status</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-reset"
              onClick={() =>
                setFilters({
                  direction: '',
                  category: '',
                  recordingStatus: '',
                  company: '',
                  from: '',
                  to: '',
                  q: '',
                  durationOp: '',
                  durationValue: '',
                  durationValue2: '',
                  durationUnit: 'sec'
                })
              }
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="filter-grid">
          <label className="field-inline">
            <span>Search Text</span>
            <input
              type="search"
              placeholder="Employee name, ID, number, serial..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </label>

          <label className="field-inline">
            <span>Direction</span>
            <select
              value={filters.direction}
              onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
            >
              <option value="">All Directions</option>
              <option value="INCOMING">Incoming</option>
              <option value="OUTGOING">Outgoing</option>
              <option value="MISSED">Missed</option>
            </select>
          </label>

          <label className="field-inline">
            <span>Category</span>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="CLIENT">Client</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="PERSONAL">Personal</option>
              <option value="MISSED">Missed</option>
            </select>
          </label>

          <label className="field-inline">
            <span>Recording</span>
            <select
              value={filters.recordingStatus}
              onChange={(e) => setFilters({ ...filters, recordingStatus: e.target.value })}
            >
              <option value="">All Records</option>
              <option value="HAS_RECORDING">Has Recording</option>
              <option value="NONE">No Recording</option>
              <option value="UPLOADED">Uploaded</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>

          <label className="field-inline">
            <span>Duration</span>
            <select
              value={filters.durationOp}
              onChange={(e) => setFilters({ ...filters, durationOp: e.target.value })}
            >
              <option value="">Any Duration</option>
              <option value="lt">Less than</option>
              <option value="gt">Greater than</option>
              <option value="between">Between</option>
            </select>
          </label>

          {filters.durationOp && (
            <label className="field-inline">
              <span>{filters.durationOp === 'between' ? 'From value' : 'Value'}</span>
              <input
                type="number"
                min="0"
                placeholder="e.g. 60"
                value={filters.durationValue}
                onChange={(e) => setFilters({ ...filters, durationValue: e.target.value })}
              />
            </label>
          )}

          {filters.durationOp === 'between' && (
            <label className="field-inline">
              <span>To value</span>
              <input
                type="number"
                min="0"
                placeholder="e.g. 300"
                value={filters.durationValue2}
                onChange={(e) => setFilters({ ...filters, durationValue2: e.target.value })}
              />
            </label>
          )}

          {filters.durationOp && (
            <label className="field-inline">
              <span>Unit</span>
              <select
                value={filters.durationUnit}
                onChange={(e) => setFilters({ ...filters, durationUnit: e.target.value })}
              >
                <option value="sec">Seconds</option>
                <option value="min">Minutes</option>
              </select>
            </label>
          )}

          <label className="field-inline">
            <span>From Date</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>

          <label className="field-inline">
            <span>To Date</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
        </div>
      </section>

      <CallsTable calls={calls} />
    </Layout>
  );
}

// ============================================================================
// PAGE: RECORDINGS
// ============================================================================

function Recordings() {
  const { token } = useAuth();
  const [playing, setPlaying] = useState({});
  const [filters, setFilters] = useState({ q: '', from: '', to: '', category: '' });

  const params = new URLSearchParams();
  params.set('limit', '200');
  if (filters.q) params.set('q', filters.q);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.category) params.set('category', filters.category);

  const result = useData(`/recordings?${params.toString()}`);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  const playAudio = async (rec) => {
    try {
      const data = await api(`/recordings/${rec.id}/play`, token);
      setPlaying((prev) => ({ ...prev, [rec.id]: data.url }));
    } catch (err) {
      window.alert('Playback error: ' + err.message);
    }
  };

  if (result.loading) {
    return (
      <Layout title="Recordings" sub="Secure audio recording playback">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Recordings" sub="Secure audio recording playback">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const recordings = result.data?.data || [];

  return (
    <Layout title="Recordings" sub="Secure S3-tracked audio records from CallRecording in PostgreSQL">
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Search &amp; Filters</h3>
            <p>Filter recordings by employee, filename, date range, or category</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => setFilters({ q: '', from: '', to: '', category: '' })}
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="filter-grid">
          <label className="field-inline">
            <span>Search Text</span>
            <input
              type="search"
              placeholder="Employee, filename, or ID..."
              value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })}
            />
          </label>

          <label className="field-inline">
            <span>Category</span>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="">All Categories</option>
              <option value="CLIENT">Client</option>
              <option value="TEAM_MEMBER">Team Member</option>
              <option value="PERSONAL">Personal</option>
              <option value="PENDING">Pending</option>
            </select>
          </label>

          <label className="field-inline">
            <span>From Date</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>

          <label className="field-inline">
            <span>To Date</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Audio Library</h3>
            <p>Showing {recordings.length} audio recordings</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee & Device</th>
                <th>Call Direction</th>
                <th>Date & Time</th>
                <th>File Name & Size</th>
                <th>Status</th>
                <th>Audio Playback</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => {
                const empName = rec.callLog?.employee?.full_name || 'Unassigned';
                const fileName = rec.s3_key ? rec.s3_key.split('/').pop() : 'recording.m4a';
                const sizeMb = (rec.file_size_bytes / (1024 * 1024)).toFixed(1);
                const isPlaying = playing[rec.id];

                return (
                  <tr key={rec.id}>
                    <td>
                      <span className="person">{initials(empName)}</span>
                      <div style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                        <b>{empName}</b>
                        <small>{rec.device_serial}</small>
                      </div>
                    </td>
                    <td>
                      <span className={`direction ${(rec.callLog?.call_direction || 'OUTGOING').toLowerCase()}`}>
                        {rec.callLog?.call_direction || 'OUTGOING'}
                      </span>
                    </td>
                    <td>{formatDate(rec.createdAt || rec.created_at)}</td>
                    <td>
                      <b>{fileName}</b>
                      <small>{sizeMb} MB</small>
                    </td>
                    <td>
                      <Badge kind={rec.upload_status}>{rec.upload_status}</Badge>
                    </td>
                    <td>
                      {isPlaying ? (
                        <div className="audio-player-box">
                          <audio controls autoPlay src={isPlaying} />
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="primary playback"
                          onClick={() => playAudio(rec)}
                        >
                          <Play size={13} />
                          Listen
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

// ============================================================================
// PAGE: REPORTS
// ============================================================================

function Reports() {
  const [filters, setFilters] = useState({ from: '', to: '', employee: '' });

  // Report data (date-filtered, accurate DB aggregation).
  const rParams = new URLSearchParams();
  if (filters.from) rParams.set('from', filters.from);
  if (filters.to) rParams.set('to', filters.to);
  if (filters.employee) rParams.set('employee', filters.employee);
  const reportData = useData(`/reports?${rParams.toString()}`);

  // Employee list for the dropdown.
  const empData = useData('/employees?limit=200');

  // The matching calls list (same filters) for the table below.
  const cParams = new URLSearchParams();
  cParams.set('limit', '200');
  if (filters.from) cParams.set('from', filters.from);
  if (filters.to) cParams.set('to', filters.to);
  if (filters.employee) cParams.set('employee', filters.employee);
  const callsData = useData(`/calls?${cParams.toString()}`);

  if (reportData.loading) {
    return (
      <Layout title="Reports" sub="Sales activity analytics">
        <Loading />
      </Layout>
    );
  }

  if (reportData.error) {
    return (
      <Layout title="Reports" sub="Sales activity analytics">
        <ErrorPanel message={reportData.error} />
      </Layout>
    );
  }

  const perEmployee = reportData.data?.perEmployee || [];
  const categoryData = reportData.data?.categoryData || [];
  const totals = reportData.data?.totals || { calls: 0, durationSeconds: 0, employees: 0 };
  const employees = empData.data?.data || [];
  const calls = callsData.data?.data || [];
  const hasActiveFilters = Boolean(filters.from || filters.to || filters.employee);

  const fmtDuration = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <Layout title="Reports" sub="Performance and call volume analytics powered by PostgreSQL">
      {/* Filters */}
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Report Filters</h3>
            <p>View call activity by date range and individual employee</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => setFilters({ from: '', to: '', employee: '' })}
            >
              Reset Filters
            </button>
          )}
        </div>
        <div className="filter-grid">
          <label className="field-inline">
            <span>Employee</span>
            <select
              value={filters.employee}
              onChange={(e) => setFilters({ ...filters, employee: e.target.value })}
            >
              <option value="">All Employees</option>
              {employees.map((emp) => (
                <option key={emp.emp_id} value={emp.emp_id}>
                  {emp.full_name} ({emp.emp_id})
                </option>
              ))}
            </select>
          </label>
          <label className="field-inline">
            <span>From Date</span>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
            />
          </label>
          <label className="field-inline">
            <span>To Date</span>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
            />
          </label>
        </div>
      </section>

      {/* Summary metrics */}
      <section className="grid-equal" style={{ marginBottom: 16 }}>
        <article className="panel" style={{ padding: '16px 20px' }}>
          <p style={{ margin: 0, color: '#64748b' }}>Total Calls</p>
          <b style={{ fontSize: 28 }}>{totals.calls}</b>
        </article>
        <article className="panel" style={{ padding: '16px 20px' }}>
          <p style={{ margin: 0, color: '#64748b' }}>Total Talk Time</p>
          <b style={{ fontSize: 28 }}>{fmtDuration(totals.durationSeconds)}</b>
        </article>
        <article className="panel" style={{ padding: '16px 20px' }}>
          <p style={{ margin: 0, color: '#64748b' }}>Active Employees</p>
          <b style={{ fontSize: 28 }}>{totals.employees}</b>
        </article>
      </section>

      {/* Charts */}
      <section className="grid-equal">
        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Calls by Employee</h3>
              <p>Total volume per sales executive{hasActiveFilters ? ' (filtered)' : ''}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perEmployee.slice(0, 15)}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="calls" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Calls by Classification</h3>
              <p>Breakdown across client, internal, and personal{hasActiveFilters ? ' (filtered)' : ''}</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>

      {/* Per-employee summary table */}
      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Employee Breakdown</h3>
            <p>Per-employee call counts and talk time for the selected range</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Total Calls</th>
                <th>Client Calls</th>
                <th>Talk Time</th>
              </tr>
            </thead>
            <tbody>
              {perEmployee.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    No calls in the selected range
                  </td>
                </tr>
              ) : (
                perEmployee.map((e) => (
                  <tr key={e.emp_id}>
                    <td>
                      <b>{e.fullName}</b>
                      <small>{e.emp_id}</small>
                    </td>
                    <td>{e.calls}</td>
                    <td>{e.clientCalls}</td>
                    <td>{fmtDuration(e.durationSeconds)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CallsTable calls={calls} />
    </Layout>
  );
}

// ============================================================================
// PAGE: DEVICES
// ============================================================================

function Devices() {
  const result = useData('/devices');
  const [search, setSearch] = useState('');

  if (result.loading) {
    return (
      <Layout title="Devices" sub="Mobile hardware inventory">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Devices" sub="Mobile hardware inventory">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const devices = (result.data?.data || []).filter((dev) => {
    const q = search.toLowerCase();
    const emp = dev.employee?.full_name || '';
    return !q || dev.serial_number?.toLowerCase().includes(q) || dev.imei_1?.includes(q) || emp.toLowerCase().includes(q);
  });

  return (
    <Layout title="Devices" sub="Hardware provisioning & link management from PostgreSQL">
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Search Devices</h3>
            <p>Find hardware by serial number, IMEI, or linked employee</p>
          </div>
          {search && (
            <button type="button" className="filter-reset" onClick={() => setSearch('')}>
              Clear
            </button>
          )}
        </div>
        <div className="search-shell">
          <input
            type="search"
            placeholder="Search serial number, IMEI, or employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Device Inventory</h3>
            <p>Showing {devices.length} recorded hardware endpoints</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Assigned Employee</th>
                <th>Primary IMEI</th>
                <th>SIM Phone Number</th>
                <th>Link Status</th>
                <th>Last Active</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.serial_number}>
                  <td>
                    <b>{dev.serial_number}</b>
                  </td>
                  <td>
                    {dev.employee ? (
                      <div>
                        <b>{dev.employee.full_name}</b>
                        <small>{dev.employee.emp_id}</small>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8' }}>Unassigned</span>
                    )}
                  </td>
                  <td><code>{dev.imei_1}</code></td>
                  <td>{dev.phone_number_1}</td>
                  <td>
                    <Badge kind={dev.link_status}>{dev.link_status}</Badge>
                  </td>
                  <td>{dev.last_seen_at ? formatDate(dev.last_seen_at) : 'Never'}</td>
                  <td>
                    <Badge kind={dev.is_active ? 'active' : 'inactive'}>
                      {dev.is_active ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

// ============================================================================
// PAGE: AUDIT LOGS
// ============================================================================

function AuditLogs() {
  const result = useData('/audit-logs?limit=100');

  if (result.loading) {
    return (
      <Layout title="Audit Logs" sub="Immutable activity log">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Audit Logs" sub="Immutable activity log">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const logs = result.data?.data || [];

  return (
    <Layout title="Audit Logs" sub="Immutable security & administrative audit trails in PostgreSQL">
      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Security Trail</h3>
            <p>Showing {logs.length} logged administrative operations</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User / Admin</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.created_at || log.createdAt)}</td>
                  <td>
                    <b>{log.admin_user}</b>
                  </td>
                  <td>
                    <Badge kind={log.action}>{log.action}</Badge>
                  </td>
                  <td>{log.entity_type}</td>
                  <td><code>{log.entity_id || '—'}</code></td>
                  <td>{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}

// ============================================================================
// PAGE: SETTINGS
// ============================================================================

function SettingsPage() {
  return (
    <Layout title="Settings" sub="PostgreSQL database and system configuration">
      <div className="grid-equal">
        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>PostgreSQL Database Status</h3>
              <p>Connected database instance details</p>
            </div>
            <Badge kind="active">Connected</Badge>
          </div>
          <div className="insight">
            <span className="mini green"><Database size={18} /></span>
            <div>
              <b>Database Engine</b>
              <p>PostgreSQL 16 (Dialect: postgres)</p>
            </div>
          </div>
          <div className="insight">
            <span className="mini purple"><CheckCircle2 size={18} /></span>
            <div>
              <b>Database Name</b>
              <p>mist_avinya_db</p>
            </div>
          </div>
          <div className="insight">
            <span className="mini orange"><Clock size={18} /></span>
            <div>
              <b>Host & Port</b>
              <p>localhost:5432</p>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Authentication & Security</h3>
              <p>Stateless JWT tokens & Role-based Access</p>
            </div>
          </div>
          <div className="insight">
            <span className="mini purple"><Users size={18} /></span>
            <div>
              <b>Roles Configured</b>
              <p>ADMIN (Single Administrator)</p>
            </div>
          </div>
          <div className="insight">
            <span className="mini blue"><Volume2 size={18} /></span>
            <div>
              <b>Storage Bucket</b>
              <p>mist-avinya-recordings (ap-south-1)</p>
            </div>
          </div>
        </article>
      </div>
    </Layout>
  );
}

// ============================================================================
// PAGE: LOGIN
// ============================================================================

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">M</div>
          <div>MIST <b>Avinya</b></div>
        </div>

        <h1>Sign In</h1>
        <p>Access the PostgreSQL Sales Intelligence Portal</p>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Hidden decoy fields absorb the browser's autofill attempt so the
              real fields below stay empty. */}
          <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
          <input type="password" name="password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

          <label>
            Admin Email
            <input
              type="email"
              name="login_id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="login_secret"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="new-password"
              readOnly
              onFocus={(e) => e.target.removeAttribute('readonly')}
              required
            />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button type="submit" className="primary wide" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In to Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ROOT APP COMPONENT
// ============================================================================

function App() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem('mist-pg-session') || 'null')
  );

  const authValue = useMemo(
    () => ({
      ...session,
      login: async (email, password) => {
        const data = await api('/auth/login', null, {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const next = { token: data.token, user: data.user };
        localStorage.setItem('mist-pg-session', JSON.stringify(next));
        setSession(next);
      },
      logout: () => {
        localStorage.removeItem('mist-pg-session');
        setSession(null);
      }
    }),
    [session]
  );

  return (
    <Auth.Provider value={authValue}>
      <Routes>
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Auth.Provider>
  );
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
