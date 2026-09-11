// ============================================================================
// MIST AVINYA - Admin Portal Dashboard
// Live data-backed admin interface with real API integration
// ============================================================================

// --- IMPORTS: Core Libraries ---
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  createRoot
} from 'react-dom/client';
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate
} from 'react-router-dom';

// --- IMPORTS: UI Icons ---
import {
  LayoutDashboard,
  Users,
  Building2,
  PhoneCall,
  Headphones,
  ChartNoAxesCombined,
  ClipboardList,
  Settings,
  LogOut,
  Play,
  LoaderCircle
} from 'lucide-react';

// --- IMPORTS: Charts ---
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts';

// --- IMPORTS: Styles ---
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
  ['Audit Logs', '/audit-logs', ClipboardList],
  ['Settings', '/settings', Settings]
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Make authenticated API calls to the backend
 */
async function api(path, token, options = {}) {
  const response = await fetch(
    `${API_URL}${path}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && {Authorization: `Bearer ${token}`}),
        ...options.headers
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      (await response.json().catch(() => ({}))).message || 'Unable to load data'
    );
  }

  return response.status === 204 ? null : response.json();
}

/**
 * Extract initials from a name
 */
const initials = (name = '?') =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

/**
 * Format seconds into MM:SS format
 */
const formatDuration = (seconds = 0) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Format date and time using Indian locale
 */
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

/**
 * Badge component for status indicators
 */
function Badge({
  children,
  kind
}) {
  return (
    <span className={`badge ${kind || String(children).toLowerCase()}`}>
      {children}
    </span>
  );
}

/**
 * Loading state indicator
 */
function Loading() {
  return (
    <article className="panel empty">
      <LoaderCircle className="spin" size={30} />
      <p>Loading live data…</p>
    </article>
  );
}

/**
 * Error state panel
 */
function ErrorPanel({
  message
}) {
  return (
    <article className="panel empty">
      <h3>Could not load data</h3>
      <p>{message}</p>
    </article>
  );
}

/**
 * Main layout wrapper with sidebar and header
 */
function Layout({
  children,
  title,
  sub
}) {
  const {
    user,
    logout
  } = useAuth();

  return (
    <>
      <aside>
        <div className="brand">
          <span>m</span>
          <div>
            MIST <b>Avinya</b>
            <small>Sales Intelligence</small>
          </div>
        </div>

        <nav>
          {nav.map(([label, path, Icon]) => (
            <NavLink
              key={label}
              to={path}
              end={path === '/'}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="side-bottom">
          <button onClick={logout}>
            <LogOut size={19} />
            Logout
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
            <div className="avatar">
              {initials(user.name)}
            </div>
            <div className="user">
              <b>{user.name}</b>
              <small>{user.role.replace('_', ' ')}</small>
            </div>
          </div>
        </header>

        {children}
      </main>
    </>
  );
}

/**
 * Metric card for dashboard KPIs
 */
function Metric({
  title,
  value,
  icon: Icon,
  accent
}) {
  return (
    <article className="metric">
      <div className={`metric-icon ${accent}`}>
        <Icon size={20} />
      </div>
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
      </div>
    </article>
  );
}

/**
 * Custom hook for fetching and managing data from API
 */
function useData(path) {
  const {
    token,
    logout
  } = useAuth();

  const [state, setState] = useState({
    loading: true,
    data: null,
    error: ''
  });

  useEffect(() => {
    let active = true;

    api(path, token)
      .then((data) => {
        if (active) {
          setState({
            loading: false,
            data,
            error: ''
          });
        }
      })
      .catch((error) => {
        if (error.message.includes('expired') || error.message.includes('Authentication')) {
          logout();
        } else if (active) {
          setState({
            loading: false,
            data: null,
            error: error.message
          });
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

/**
 * Dashboard page with KPIs and charts
 */
function Dashboard() {
  const result = useData('/calls?limit=100');

  if (result.loading) {
    return (
      <Layout title="Dashboard" sub="Live data from MongoDB Atlas">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Dashboard" sub="Live data from MongoDB Atlas">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  return <DashboardContent calls={result.data.data} />;
}

/**
 * Dashboard content renderer
 */
function DashboardContent({
  calls
}) {
  const totalDuration = calls.reduce(
    (sum, call) => sum + (call.duration || 0),
    0
  );

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDay = dayNames.map((name, idx) => ({
    d: name,
    v: calls.filter(
      (call) => new Date(call.startTime).getDay() === idx
    ).length
  }));

  return (
    <Layout title="Dashboard" sub="Live data from MongoDB Atlas">
      {/* Metrics Section */}
      <section className="metrics">
        <Metric
          title="Calls"
          value={calls.length}
          icon={PhoneCall}
          accent="purple"
        />
        <Metric
          title="Business calls"
          value={calls.filter((call) => call.classification === 'BUSINESS').length}
          icon={Building2}
          accent="orange"
        />
        <Metric
          title="Uploaded recordings"
          value={calls.filter((call) => call.recordingId?.uploadStatus === 'UPLOADED').length}
          icon={Headphones}
          accent="green"
        />
        <Metric
          title="Call duration"
          value={formatDuration(totalDuration)}
          icon={Users}
          accent="blue"
        />
      </section>

      {/* Charts & Info Section */}
      <section className="grid-two">
        {/* Calls Overview Chart */}
        <article className="panel chart">
          <div className="panel-title">
            <div>
              <h3>Calls overview</h3>
              <p>Seeded call activity</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={byDay}>
              <XAxis dataKey="d" axisLine={false} tickLine={false} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="v"
                stroke="#6c5ce7"
                strokeWidth="3"
                fill="#eeeaff"
              />
            </AreaChart>
          </ResponsiveContainer>
        </article>

        {/* Recent Recordings Info */}
        <article className="panel">
          <div className="panel-title">
            <div>
              <h3>Recent recordings</h3>
              <p>Open the recordings page to play audio</p>
            </div>
          </div>
          <p style={{marginTop: 22, color: '#77758a'}}>
            {calls.filter((call) => call.recordingId?.uploadStatus === 'UPLOADED').length}
            {' '}
            playable fixture recordings are available.
          </p>
        </article>
      </section>

      {/* Recent Activity Table */}
      <CallsTable calls={calls.slice(0, 5)} compact />
    </Layout>
  );
}

/**
 * Reusable calls table component
 */
function CallsTable({
  calls,
  compact = false
}) {
  return (
    <section className="panel table-panel">
      <div className="panel-title">
        <div>
          <h3>{compact ? 'Recent activity' : 'All calls'}</h3>
          <p>Live MongoDB Atlas records</p>
        </div>
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
              <th>Classification</th>
              <th>Recording</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((call) => (
              <tr key={call._id}>
                <td>
                  <span className="person">
                    {initials(call.employeeId?.name)}
                  </span>
                  <div>
                    <b>{call.employeeId?.name || '—'}</b>
                    <small>{call.callId}</small>
                  </div>
                </td>
                <td>{call.companyId?.name || '—'}</td>
                <td>{call.direction}</td>
                <td>{formatDate(call.startTime)}</td>
                <td>{formatDuration(call.duration)}</td>
                <td>
                  <Badge>{call.classification}</Badge>
                </td>
                <td>
                  <Badge kind={call.recordingId?.uploadStatus === 'UPLOADED' ? 'uploaded' : 'neutral'}>
                    {call.recordingId?.uploadStatus || 'None'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================================
// UTILITY: Query String Builder
// ============================================================================

/**
 * Build query parameters from filter object
 */
function buildQueryString(filters = {}) {
  const params = new URLSearchParams({limit: '200'});

  const map = {
    employee: 'employee',
    company: 'company',
    direction: 'direction',
    classification: 'classification',
    from: 'from',
    to: 'to',
    recordingStatus: 'recordingStatus'
  };

  Object.entries(filters).forEach(([key, value]) => {
    const apiKey = map[key];
    if (apiKey && value !== '' && value !== null && value !== undefined) {
      params.set(apiKey, value);
    }
  });

  return `?${params.toString()}`;
}

// ============================================================================
// PAGE: EMPLOYEES
// ============================================================================

/**
 * Employees listing page with search
 */
function Employees() {
  const result = useData('/employees?limit=200');
  const [searchTerm, setSearchTerm] = useState('');

  if (result.loading) {
    return (
      <Layout title="Employees" sub="Live employee roster">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Employees" sub="Live employee roster">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const employees = (result.data.data || []).filter((employee) => {
    const target = `${employee.name || ''} ${employee.employeeId || ''} ${employee.email || ''}`.toLowerCase();
    return !searchTerm || target.includes(searchTerm.toLowerCase());
  });

  return (
    <Layout title="Employees" sub="Live employee roster from MongoDB Atlas">
      {/* Search Filter */}
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Employee search</h3>
            <p>Quickly find people by name, ID, or email</p>
          </div>
          {searchTerm && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
        <div className="search-shell">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search employees..."
          />
        </div>
      </section>

      {/* Employees Table */}
      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Team directory</h3>
            <p>Current employee records and role access</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>ID</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee._id}>
                  <td>
                    <span className="person">
                      {initials(employee.name)}
                    </span>
                    <div>
                      <b>{employee.name}</b>
                      <small>{employee.employeeId || '—'}</small>
                    </div>
                  </td>
                  <td>{employee.employeeId || '—'}</td>
                  <td>{employee.department || '—'}</td>
                  <td>{employee.phone || '—'}</td>
                  <td>{employee.email || '—'}</td>
                  <td>
                    <Badge kind={employee.status === 'ACTIVE' ? 'uploaded' : 'neutral'}>
                      {employee.status || 'ACTIVE'}
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

/**
 * Companies listing page
 */
function Companies() {
  const result = useData('/companies?limit=200');

  if (result.loading) {
    return (
      <Layout title="Companies" sub="Live account roster">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Companies" sub="Live account roster">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const companies = result.data.data || [];

  return (
    <Layout title="Companies" sub="Account and contact information">
      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Companies</h3>
            <p>Sales accounts and associated contacts</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company._id}>
                  <td>
                    <b>{company.name}</b>
                  </td>
                  <td>{company.contactPerson || '—'}</td>
                  <td>{company.phone || '—'}</td>
                  <td>{company.email || '—'}</td>
                  <td>{company.industry || '—'}</td>
                  <td>{company.location || '—'}</td>
                  <td>{company.assignedSalesperson?.name || '—'}</td>
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
// FILTER COMPONENTS
// ============================================================================

/**
 * Dropdown select filter
 */
function FilterSelect({
  label,
  value,
  onChange,
  options
}) {
  return (
    <label className="field-inline">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Date picker filter
 */
function FilterDate({
  label,
  value,
  onChange
}) {
  return (
    <label className="field-inline">
      <span>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

/**
 * Search input filter
 */
function SearchField({
  label,
  value,
  onChange,
  placeholder
}) {
  return (
    <label className="field-inline field-search">
      <span>{label}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

// Default empty filter state
const emptyFilters = {
  employeeSearch: '',
  direction: '',
  classification: '',
  recordingStatus: '',
  company: '',
  from: '',
  to: ''
};

// ============================================================================
// PAGE: CALLS
// ============================================================================

/**
 * Calls listing page with advanced filters
 */
function Calls() {
  const [filters, setFilters] = useState(emptyFilters);
  const allCalls = useData('/calls?limit=200');

  // Build company options from available calls
  const companyOptions = useMemo(() => {
    if (!allCalls.data?.data) return [];
    const companies = {};
    allCalls.data.data.forEach((call) => {
      const company = call.companyId;
      if (company?._id && company?.name) {
        companies[company._id] = {
          value: company._id,
          label: company.name
        };
      }
    });
    return [
      {value: '', label: 'All companies'},
      ...Object.values(companies)
    ];
  }, [allCalls.data]);

  // Fetch filtered calls
  const result = useData(`/calls${buildQueryString(filters)}`);
  const calls = result.loading || result.error ? [] : result.data.data;

  // Client-side employee name filtering
  const filteredCalls = calls.filter((call) => {
    const employeeName = (call.employeeId?.name || '').toLowerCase();
    const employeeSearch = filters.employeeSearch.trim().toLowerCase();
    return !employeeSearch || employeeName.includes(employeeSearch);
  });

  const hasActiveFilters = Object.values(filters).some(Boolean);

  if (result.loading) {
    return (
      <Layout title="Calls" sub="Search, filter and review call history">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Calls" sub="Search, filter and review call history">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  return (
    <Layout title="Calls" sub="Search, filter and review call history">
      {/* Filter Section */}
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Filters</h3>
            <p>Refine the call history for analytics</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => setFilters(emptyFilters)}
            >
              Reset
            </button>
          )}
        </div>

        <div className="filter-grid">
          <SearchField
            label="Employee"
            value={filters.employeeSearch}
            onChange={(value) =>
              setFilters((current) => ({...current, employeeSearch: value}))
            }
            placeholder="Search by name"
          />
          <FilterSelect
            label="Direction"
            value={filters.direction}
            onChange={(value) =>
              setFilters((current) => ({...current, direction: value}))
            }
            options={[
              {value: '', label: 'All directions'},
              {value: 'INCOMING', label: 'Incoming'},
              {value: 'OUTGOING', label: 'Outgoing'}
            ]}
          />
          <FilterSelect
            label="Classification"
            value={filters.classification}
            onChange={(value) =>
              setFilters((current) => ({...current, classification: value}))
            }
            options={[
              {value: '', label: 'All classifications'},
              {value: 'BUSINESS', label: 'Business'},
              {value: 'PERSONAL', label: 'Personal'}
            ]}
          />
          <FilterSelect
            label="Company"
            value={filters.company}
            onChange={(value) =>
              setFilters((current) => ({...current, company: value}))
            }
            options={companyOptions}
          />
          <FilterDate
            label="From"
            value={filters.from}
            onChange={(value) =>
              setFilters((current) => ({...current, from: value}))
            }
          />
          <FilterDate
            label="To"
            value={filters.to}
            onChange={(value) =>
              setFilters((current) => ({...current, to: value}))
            }
          />
          <FilterSelect
            label="Recording"
            value={filters.recordingStatus}
            onChange={(value) =>
              setFilters((current) => ({...current, recordingStatus: value}))
            }
            options={[
              {value: '', label: 'All records'},
              {value: 'HAS_RECORDING', label: 'Has recording'},
              {value: 'NONE', label: 'No recording'},
              {value: 'UPLOADED', label: 'Uploaded'},
              {value: 'PENDING', label: 'Pending'},
              {value: 'FAILED', label: 'Failed'}
            ]}
          />
        </div>
      </section>

      {/* Calls Table */}
      <CallsTable calls={filteredCalls} />
    </Layout>
  );
}

// ============================================================================
// PAGE: RECORDINGS
// ============================================================================

/**
 * Recordings listing page with playback
 */
function Recordings() {
  const {token} = useAuth();
  const result = useData('/recordings?limit=100');
  const [playing, setPlaying] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * Trigger playback of a recording
   */
  const play = async (recording) => {
    try {
      const data = await api(`/recordings/${recording._id}/play`, token);
      setPlaying((current) => ({...current, [recording._id]: data.url}));
    } catch (error) {
      window.alert(error.message);
    }
  };

  if (result.loading) {
    return (
      <Layout title="Recordings" sub="Local fixture recordings and their upload status">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Recordings" sub="Local fixture recordings and their upload status">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const recordings = (result.data.data || []).filter((recording) => {
    const target = `${recording.employeeId?.name || ''} ${recording.callId?.callId || ''} ${recording.fileName || ''}`.toLowerCase();
    return !searchTerm || target.includes(searchTerm.toLowerCase());
  });

  return (
    <Layout title="Recordings" sub="Local fixture recordings and their upload status">
      {/* Search Filter */}
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Recording search</h3>
            <p>Find recordings by employee, call ID, or file</p>
          </div>
          {searchTerm && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => setSearchTerm('')}
            >
              Clear
            </button>
          )}
        </div>
        <div className="search-shell">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search employees or calls..."
          />
        </div>
      </section>

      {/* Recordings Table */}
      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Business call recordings</h3>
            <p>Play uploaded local fixtures directly from the API.</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Call</th>
                <th>Date & time</th>
                <th>File</th>
                <th>Size</th>
                <th>Status</th>
                <th>Playback</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((recording) => (
                <tr key={recording._id}>
                  <td>{recording.employeeId?.name || '—'}</td>
                  <td>{recording.callId?.callId || '—'}</td>
                  <td>{formatDate(recording.callId?.startTime || recording.uploadedAt)}</td>
                  <td>{recording.fileName}</td>
                  <td>
                    {recording.fileSize
                      ? `${Math.ceil(recording.fileSize / 1024)} KB`
                      : '—'}
                  </td>
                  <td>
                    <Badge
                      kind={
                        recording.uploadStatus === 'UPLOADED'
                          ? 'uploaded'
                          : recording.uploadStatus === 'PENDING'
                          ? 'processing'
                          : 'neutral'
                      }
                    >
                      {recording.uploadStatus}
                    </Badge>
                  </td>
                  <td>
                    {recording.uploadStatus === 'UPLOADED' ? (
                      playing[recording._id] ? (
                        <audio
                          controls
                          autoPlay
                          src={playing[recording._id]}
                        />
                      ) : (
                        <button
                          className="primary playback"
                          onClick={() => play(recording)}
                        >
                          <Play size={14} />
                          Play
                        </button>
                      )
                    ) : (
                      'Unavailable'
                    )}
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
// PAGE: REPORTS
// ============================================================================

/**
 * Reports page with analytics and charts
 */
function Reports() {
  const [filters, setFilters] = useState(emptyFilters);
  const allCalls = useData('/calls?limit=200');

  // Build company options from available calls
  const companyOptions = useMemo(() => {
    if (!allCalls.data?.data) return [];
    const companies = {};
    allCalls.data.data.forEach((call) => {
      const company = call.companyId;
      if (company?._id && company?.name) {
        companies[company._id] = {
          value: company._id,
          label: company.name
        };
      }
    });
    return [
      {value: '', label: 'All companies'},
      ...Object.values(companies)
    ];
  }, [allCalls.data]);

  const result = useData(`/calls${buildQueryString(filters)}`);

  if (result.loading) {
    return (
      <Layout title="Reports" sub="Live call performance">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Reports" sub="Live call performance">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  const calls = result.data.data;

  // Aggregate data by employee
  const employees = Object.values(
    calls.reduce((map, call) => {
      const name = call.employeeId?.name || 'Unassigned';
      map[name] = map[name] || {name, calls: 0, duration: 0};
      map[name].calls += 1;
      map[name].duration += call.duration || 0;
      return map;
    }, {})
  );

  // Aggregate data by company
  const companies = Object.values(
    calls.reduce((map, call) => {
      const name = call.companyId?.name || 'Unassigned';
      map[name] = map[name] || {name, calls: 0, duration: 0};
      map[name].calls += 1;
      map[name].duration += call.duration || 0;
      return map;
    }, {})
  );

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <Layout title="Reports" sub="Live call performance from MongoDB Atlas">
      {/* Filter Section */}
      <section className="filter-panel">
        <div className="filter-header">
          <div>
            <h3>Filters</h3>
            <p>Refine the chart data</p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              className="filter-reset"
              onClick={() => setFilters(emptyFilters)}
            >
              Reset
            </button>
          )}
        </div>

        <div className="filter-grid">
          <FilterSelect
            label="Direction"
            value={filters.direction}
            onChange={(value) =>
              setFilters((current) => ({...current, direction: value}))
            }
            options={[
              {value: '', label: 'All directions'},
              {value: 'INCOMING', label: 'Incoming'},
              {value: 'OUTGOING', label: 'Outgoing'}
            ]}
          />
          <FilterSelect
            label="Classification"
            value={filters.classification}
            onChange={(value) =>
              setFilters((current) => ({...current, classification: value}))
            }
            options={[
              {value: '', label: 'All classifications'},
              {value: 'BUSINESS', label: 'Business'},
              {value: 'PERSONAL', label: 'Personal'}
            ]}
          />
          <FilterSelect
            label="Company"
            value={filters.company}
            onChange={(value) =>
              setFilters((current) => ({...current, company: value}))
            }
            options={companyOptions}
          />
          <FilterDate
            label="From"
            value={filters.from}
            onChange={(value) =>
              setFilters((current) => ({...current, from: value}))
            }
          />
          <FilterDate
            label="To"
            value={filters.to}
            onChange={(value) =>
              setFilters((current) => ({...current, to: value}))
            }
          />
          <FilterSelect
            label="Recording"
            value={filters.recordingStatus}
            onChange={(value) =>
              setFilters((current) => ({...current, recordingStatus: value}))
            }
            options={[
              {value: '', label: 'All records'},
              {value: 'HAS_RECORDING', label: 'Has recording'},
              {value: 'NONE', label: 'No recording'},
              {value: 'UPLOADED', label: 'Uploaded'},
              {value: 'PENDING', label: 'Pending'},
              {value: 'FAILED', label: 'Failed'}
            ]}
          />
        </div>
      </section>

      {/* Key Metrics */}
      <section className="metrics">
        <Metric
          title="Total calls"
          value={calls.length}
          icon={PhoneCall}
          accent="purple"
        />
        <Metric
          title="Business ratio"
          value={`${
            calls.length
              ? Math.round(
                  (calls.filter((call) => call.classification === 'BUSINESS').length /
                    calls.length) *
                    100
                )
              : 0
          }%`}
          icon={Building2}
          accent="orange"
        />
        <Metric
          title="Avg duration"
          value={formatDuration(
            calls.length ? Math.round(calls.reduce((sum, call) => sum + (call.duration || 0), 0) / calls.length) : 0
          )}
          icon={PhoneCall}
          accent="blue"
        />
        <Metric
          title="Recordings"
          value={calls.filter((call) => call.recordingId).length}
          icon={Headphones}
          accent="green"
        />
      </section>

      {/* Charts Grid */}
      <section className="grid-two">
        {/* Employees Chart */}
        <article className="panel chart">
          <div className="panel-title">
            <div>
              <h3>By employee</h3>
              <p>Call volume per salesperson</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={employees}>
              <XAxis dataKey="name" />
              <Tooltip />
              <Bar dataKey="calls" fill="#6c5ce7" />
            </BarChart>
          </ResponsiveContainer>
        </article>

        {/* Companies Chart */}
        <article className="panel chart">
          <div className="panel-title">
            <div>
              <h3>By company</h3>
              <p>Call volume per account</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={companies}>
              <XAxis dataKey="name" />
              <Tooltip />
              <Bar dataKey="calls" fill="#fd79a8" />
            </BarChart>
          </ResponsiveContainer>
        </article>
      </section>
    </Layout>
  );
}

// ============================================================================
// PAGE: AUDIT LOGS
// ============================================================================

/**
 * Audit logs page showing system actions
 */
function AuditLogs() {
  const result = useData('/audit-logs?limit=100');

  if (result.loading) {
    return (
      <Layout title="Audit logs" sub="Actions recorded by the API">
        <Loading />
      </Layout>
    );
  }

  if (result.error) {
    return (
      <Layout title="Audit logs" sub="Actions recorded by the API">
        <ErrorPanel message={result.error} />
      </Layout>
    );
  }

  return (
    <Layout title="Audit logs" sub="Actions recorded by the API">
      <section className="panel table-panel">
        <div className="panel-title">
          <div>
            <h3>Audit trail</h3>
            <p>Recent authenticated actions</p>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {result.data.data.map((entry) => (
                <tr key={entry._id}>
                  <td>{formatDate(entry.timestamp)}</td>
                  <td>{entry.userId?.name || 'System'}</td>
                  <td>{entry.action}</td>
                  <td>{entry.resourceId || '—'}</td>
                  <td>
                    <Badge kind={entry.success ? 'uploaded' : 'neutral'}>
                      {entry.success ? 'Success' : 'Failed'}
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
// PLACEHOLDER: SETTINGS
// ============================================================================

/**
 * Placeholder page for future features
 */
function Placeholder({
  title
}) {
  return (
    <Layout title={title} sub="This screen is ready for the next workflow">
      <article className="panel empty">
        <h3>{title} coming soon</h3>
      </article>
    </Layout>
  );
}

// ============================================================================
// PAGE: LOGIN
// ============================================================================

/**
 * Login page with authentication form
 */
function Login() {
  const {login} = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@mistavinya.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Handle form submission
   */
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <span>m</span>
          <b>MIST Avinya</b>
        </div>

        <h1>Welcome back</h1>
        <p>Sign in with the Atlas-seeded admin account.</p>

        <form onSubmit={submit}>
          <label>
            Work email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button
            className="primary wide"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// ROOT APP COMPONENT
// ============================================================================

/**
 * Main app component with session management and routing
 */
function App() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem('mist-session') || 'null')
  );

  const value = useMemo(
    () => ({
      ...session,
      login: async (email, password) => {
        const data = await api(
          '/auth/login',
          null,
          {
            method: 'POST',
            body: JSON.stringify({email, password})
          }
        );
        const next = {
          token: data.token,
          user: data.user
        };
        localStorage.setItem('mist-session', JSON.stringify(next));
        setSession(next);
      },
      logout: () => {
        localStorage.removeItem('mist-session');
        setSession(null);
      }
    }),
    [session]
  );

  return (
    <Auth.Provider value={value}>
      <Routes>
        {!session ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/calls" element={<Calls />} />
            <Route path="/recordings" element={<Recordings />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/settings" element={<Placeholder title="Settings" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </Auth.Provider>
  );
}

// ============================================================================
// RENDER
// ============================================================================

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
