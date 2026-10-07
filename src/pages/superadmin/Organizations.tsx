import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Form, Input, DatePicker, Select, Switch, message, Popconfirm, Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import {
  fetchOrganizationsRequest,
  deleteOrganizationRequest,
  addOrganizationRequest,
  updateOrganizationRequest,
  type Organization,
} from '../../store/features/organizations/organizationsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import './Organizations.css';

const { Option } = Select;

// Vector icons matching Executive Operations Portal design
const Icons = {
  Search: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Lightning: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  Building: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  ),
  Bell: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  ),
  Globe: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  BuildingCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v8h4" />
      <path d="M18 12h2a2 2 0 0 1 2 2v8h-4" />
      <path d="M10 7h4" />
      <path d="M10 11h4" />
      <path d="M10 15h4" />
    </svg>
  ),
  ClockAlert: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  GraduationCap: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  FileText: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Copy: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  ),
  Edit: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  Trash: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  Table: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18" />
    </svg>
  ),
  Grid: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  Refresh: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

// Generates 8-character alphanumeric key
const generateOrgKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generates avatar background color based on name string
const getAvatarColor = (name: string, index: number) => {
  const colors = [
    '#0f172a', // Navy
    '#2563eb', // Royal Blue
    '#475569', // Slate
    '#ea580c', // Orange/Amber
    '#7c3aed', // Purple
    '#059669', // Emerald
    '#0891b2', // Cyan
  ];
  if (!name) return colors[index % colors.length];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Formats initials from full organization name
const getInitials = (name?: string) => {
  if (!name) return 'OR';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Organizations: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { organizations } = useSelector((state: RootState) => state.organizations);

  // Filter & Search states
  const [selectedOrgKeyFilter, setSelectedOrgKeyFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [validityFilter, setValidityFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPageNum] = useState<number>(1);
  const pageSize = 10;

  // Dynamic Scholars state
  const [totalScholarsCount, setTotalScholarsCount] = useState<number>(0);
  const [orgScholarsMap, setOrgScholarsMap] = useState<Record<string, number>>({});

  // Modal states
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);
  const [isGuidelinesModalVisible, setIsGuidelinesModalVisible] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  // Antd Forms
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Load organizations on mount
  useEffect(() => {
    dispatch(fetchOrganizationsRequest());
  }, [dispatch]);

  // Fetch dynamic scholar count from Supabase `students` table
  const fetchScholarCounts = async () => {
    try {
      const { data: studentRows, error } = await supabase
        .from('students')
        .select('id, organization_key');

      if (!error && studentRows) {
        setTotalScholarsCount(studentRows.length);
        const map: Record<string, number> = {};
        studentRows.forEach((st) => {
          if (st.organization_key) {
            map[st.organization_key] = (map[st.organization_key] || 0) + 1;
          }
        });
        setOrgScholarsMap(map);
      }
    } catch (err) {
      console.warn('Failed to fetch dynamic student census:', err);
    }
  };

  useEffect(() => {
    fetchScholarCounts();
  }, [organizations]);

  // Copy helper
  const handleCopy = (text: string, label: string = 'Content') => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  // Helper for expiry calculation
  const getExpiryInfo = (expireDate?: string) => {
    if (!expireDate) return { daysLeft: 0, isExpiringSoon: false, isExpired: false };
    const daysLeft = dayjs(expireDate).diff(dayjs(), 'day');
    return {
      daysLeft,
      isExpiringSoon: daysLeft > 0 && daysLeft <= 60,
      isExpired: daysLeft <= 0,
    };
  };

  // Metrics Calculations
  const totalOrgs = organizations.length;
  const activeOrgs = useMemo(
    () => organizations.filter((o) => o.status === 'Active').length,
    [organizations]
  );
  const pausedOrgs = totalOrgs - activeOrgs;
  const activePercent = totalOrgs > 0 ? ((activeOrgs / totalOrgs) * 100).toFixed(1) : '0';

  const expiringOrgsCount = useMemo(() => {
    return organizations.filter((o) => getExpiryInfo(o.expire_date).isExpiringSoon).length;
  }, [organizations]);

  // Filtered Organizations List
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // Topbar tenant select filter
      if (selectedOrgKeyFilter !== 'ALL' && org.organization_key !== selectedOrgKeyFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && org.status !== statusFilter) {
        return false;
      }

      // Validity filter
      if (validityFilter === 'EXPIRING') {
        const { isExpiringSoon } = getExpiryInfo(org.expire_date);
        if (!isExpiringSoon) return false;
      } else if (validityFilter === 'VALID') {
        const { isExpiringSoon, isExpired } = getExpiryInfo(org.expire_date);
        if (isExpiringSoon || isExpired) return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (org.name || '').toLowerCase().includes(q);
        const matchesKey = (org.organization_key || '').toLowerCase().includes(q);
        const matchesId = (org.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesKey && !matchesId) return false;
      }

      return true;
    });
  }, [organizations, selectedOrgKeyFilter, statusFilter, validityFilter, searchTerm]);

  // Paginated list
  const paginatedOrgs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrganizations.slice(startIndex, startIndex + pageSize);
  }, [filteredOrganizations, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredOrganizations.length / pageSize));

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allCurrentIds = new Set(paginatedOrgs.map((o) => o.id));
      setSelectedIds(allCurrentIds);
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isAllSelected =
    paginatedOrgs.length > 0 && paginatedOrgs.every((o) => selectedIds.has(o.id));

  // Toggle status
  const handleStatusToggle = (org: Organization, checked: boolean) => {
    const newStatus = checked ? 'Active' : 'Inactive';
    dispatch(updateOrganizationRequest({ ...org, status: newStatus }));
    message.success(`${org.name} status updated to ${newStatus}.`);
  };

  // Delete organization
  const handleDeleteOrg = (id: string, name: string) => {
    dispatch(deleteOrganizationRequest(id));
    message.success(`Organization ${name} deleted.`);
  };

  // Add Organization Submit
  const handleAddSubmit = (values: any) => {
    const newOrganization = {
      name: values.name.trim(),
      organization_key: values.organization_key || generateOrgKey(),
      start_date: dayjs(values.start_date).format('YYYY-MM-DD'),
      expire_date: dayjs(values.expire_date).format('YYYY-MM-DD'),
      status: values.status ? 'Active' : 'Inactive',
    };
    dispatch(addOrganizationRequest(newOrganization as Omit<Organization, 'id' | 'created_at'>));
    message.success(`Organization ${values.name} successfully provisioned.`);
    setIsAddModalVisible(false);
    addForm.resetFields();
  };

  // Edit Organization Submit
  const handleEditSubmit = (values: any) => {
    if (!editingOrg) return;
    dispatch(
      updateOrganizationRequest({
        ...editingOrg,
        name: values.name.trim(),
        start_date: dayjs(values.start_date).format('YYYY-MM-DD'),
        expire_date: dayjs(values.expire_date).format('YYYY-MM-DD'),
        status: values.status ? 'Active' : 'Inactive',
      })
    );
    message.success(`Organization ${values.name} updated successfully.`);
    setIsEditModalVisible(false);
    setEditingOrg(null);
    editForm.resetFields();
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    editForm.setFieldsValue({
      id: org.id,
      organization_key: org.organization_key,
      name: org.name,
      start_date: dayjs(org.start_date),
      expire_date: dayjs(org.expire_date),
      status: org.status === 'Active',
    });
    setIsEditModalVisible(true);
  };

  const openAddModal = () => {
    addForm.setFieldsValue({
      organization_key: generateOrgKey(),
      name: '',
      start_date: dayjs(),
      expire_date: dayjs().add(1, 'year'),
      status: true,
    });
    setIsAddModalVisible(true);
  };

  // Export Directory CSV
  const handleExportCSV = () => {
    const headers = 'S.No,Org ID,Org Key,Name,Scholars,Start Date,Expire Date,Days Left,Status\n';
    const rows = filteredOrganizations
      .map((org, i) => {
        const scholars = orgScholarsMap[org.organization_key] || 0;
        const daysLeft = dayjs(org.expire_date).diff(dayjs(), 'day');
        return `${i + 1},"${org.id}","${org.organization_key}","${org.name}",${scholars},"${dayjs(org.start_date).format('DD/MM/YYYY')}","${dayjs(org.expire_date).format('DD/MM/YYYY')}",${daysLeft},"${org.status}"`;
      })
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `organizations-directory-${dayjs().format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Organization directory exported successfully.');
  };

  // Bulk CSV Import
  const handleImportSubmit = async () => {
    if (!importCsvText.trim()) {
      message.error('Please paste or upload CSV content.');
      return;
    }

    try {
      const lines = importCsvText.trim().split(/\r?\n/);
      let importedCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Ignore header if present
        if (i === 0 && line.toLowerCase().includes('name')) continue;

        const parts = line.split(',').map((p) => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 1) {
          const orgName = parts[0];
          const startDate = parts[1] ? dayjs(parts[1]).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
          const expireDate = parts[2] ? dayjs(parts[2]).format('YYYY-MM-DD') : dayjs().add(1, 'year').format('YYYY-MM-DD');
          const status = parts[3]?.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

          const newOrgPayload = {
            name: orgName,
            organization_key: generateOrgKey(),
            start_date: startDate,
            expire_date: expireDate,
            status,
          };
          dispatch(addOrganizationRequest(newOrgPayload as Omit<Organization, 'id' | 'created_at'>));
          importedCount++;
        }
      }

      message.success(`Successfully imported ${importedCount} organizations.`);
      setIsImportModalVisible(false);
      setImportCsvText('');
    } catch (err: any) {
      message.error(`Import failed: ${err.message}`);
    }
  };

  // Quick Action Modal
  const handleQuickAction = () => {
    Modal.info({
      title: 'Executive Institutional Actions',
      content: (
        <div style={{ marginTop: 12, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <p>Select an operational Institutional control action:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="org-btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                Modal.destroyAll();
                openAddModal();
              }}
            >
              🏢 Provision New Academy Organization
            </button>
            <button
              type="button"
              className="org-btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                Modal.destroyAll();
                dispatch(setCurrentPage('organizationsadmins'));
              }}
            >
              🛡️ Manage Campus Administrators
            </button>
            <button
              type="button"
              className="org-btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                Modal.destroyAll();
                dispatch(setCurrentPage('superadmindashboard'));
              }}
            >
              📊 Executive Matrix Dashboard
            </button>
          </div>
        </div>
      ),
      okText: 'Close',
      width: 440,
    });
  };

  return (
    <div className="org-wrapper">
      {/* ====================================================================
          TOPBAR COMPONENT
          ==================================================================== */}
      <div className="org-topbar">
        <div className="org-topbar-left">
          {/* Tenant Consolidated Selector */}
          <div className="org-topbar-select-wrapper">
            <select
              className="org-topbar-select"
              value={selectedOrgKeyFilter}
              onChange={(e) => {
                setSelectedOrgKeyFilter(e.target.value);
                setCurrentPageNum(1);
              }}
              aria-label="Select Campus Organization"
            >
              <option value="ALL">All Organizations (Consolidated)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.organization_key}>
                  {org.name} ({org.organization_key})
                </option>
              ))}
            </select>
          </div>

          {/* Quick Search */}
          <div className="org-topbar-search">
            <span className="org-topbar-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search matrix, logs,..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPageNum(1);
              }}
            />
          </div>
        </div>

        <div className="org-topbar-right">
          <button type="button" className="org-btn-outline" onClick={handleQuickAction}>
            <Icons.Lightning />
            <span>Quick Action</span>
          </button>

          <button type="button" className="org-btn-outline" onClick={openAddModal}>
            <Icons.Building />
            <span>+ New Org</span>
          </button>

          <button
            type="button"
            className="org-bell-btn"
            title="Notifications"
            onClick={() => message.info('System notification queue is currently up to date.')}
          >
            <Icons.Bell />
            <span className="org-bell-dot" />
          </button>

          {/* Root Master Profile */}
          <div className="org-profile-chip">
            <div className="org-avatar-circle" style={{ background: '#0f172a' }}>
              R
            </div>
            <div className="org-profile-info">
              <span className="org-profile-name">ROOT MASTER</span>
              <span className="org-profile-role">Superadmin</span>
            </div>
            <span className="org-root-badge">SUPERADMIN</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          BREADCRUMB & PAGE HEADER
          ==================================================================== */}
      <div className="org-breadcrumb">
        SUPERADMIN MATRIX &gt; INSTITUTIONAL CONTROL &gt; ORGANIZATIONS
      </div>

      <div className="org-header-row">
        <div className="org-title-group">
          <h1 className="org-page-title">Organization Management</h1>
          <p className="org-page-desc">
            Provision, govern, and monitor multi-academy tenancies across the unified enterprise network.
          </p>
        </div>

        <div className="org-header-actions">
          <button type="button" className="org-btn-action-outline" onClick={handleExportCSV}>
            <Icons.Download />
            <span>Export Directory</span>
          </button>

          <button
            type="button"
            className="org-btn-action-outline"
            onClick={() => setIsImportModalVisible(true)}
          >
            <Icons.FileText />
            <span>Import CSV</span>
          </button>

          <button type="button" className="org-btn-primary-blue" onClick={openAddModal}>
            <Icons.Plus />
            <span>Add Organization</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          METRICS 4-CARD ROW
          ==================================================================== */}
      <div className="org-metrics-grid">
        {/* Total Organizations */}
        <div className="org-metric-card">
          <div className="org-metric-header">
            <span className="org-metric-title">TOTAL ORGANIZATIONS</span>
            <div className="org-metric-icon-box blue">
              <Icons.Globe />
            </div>
          </div>
          <div className="org-metric-value-row">
            <span className="org-metric-value">{totalOrgs}</span>
          </div>
          <div className="org-metric-subtext">across 4 regional zones</div>
        </div>

        {/* Active Tenancies */}
        <div className="org-metric-card">
          <div className="org-metric-header">
            <span className="org-metric-title">ACTIVE TENANCIES</span>
            <div className="org-metric-icon-box slate">
              <Icons.BuildingCheck />
            </div>
          </div>
          <div className="org-metric-value-row">
            <span className="org-metric-value">{activeOrgs}</span>
            <span
              className="org-metric-pill-badge"
              style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}
            >
              +{activePercent}%
            </span>
          </div>
          <div className="org-metric-subtext">
            {pausedOrgs} paused or pending setup
          </div>
        </div>

        {/* Expiring Soon (< 60 Days) */}
        <div className="org-metric-card">
          <div className="org-metric-header">
            <span className="org-metric-title">EXPIRING SOON (&lt; 60 DAYS)</span>
            <div className="org-metric-icon-box peach">
              <Icons.ClockAlert />
            </div>
          </div>
          <div className="org-metric-value-row">
            <span className="org-metric-value">{expiringOrgsCount}</span>
            {expiringOrgsCount > 0 && (
              <span
                className="org-metric-pill-badge"
                style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}
              >
                ALERT
              </span>
            )}
          </div>
          <div className="org-metric-subtext" style={{ color: '#ea580c' }}>
            renewal notices queued
          </div>
        </div>

        {/* Consolidated Scholars */}
        <div className="org-metric-card">
          <div className="org-metric-header">
            <span className="org-metric-title">CONSOLIDATED SCHOLARS</span>
            <div className="org-metric-icon-box blue">
              <Icons.GraduationCap />
            </div>
          </div>
          <div className="org-metric-value-row">
            <span className="org-metric-value">
              {totalScholarsCount.toLocaleString()}
            </span>
          </div>
          <div className="org-metric-subtext trend">
            ↑ 8.4% census increase
          </div>
        </div>
      </div>

      {/* ====================================================================
          SEARCH, FILTER & CONTROLS BAR
          ==================================================================== */}
      <div className="org-filter-bar">
        <div className="org-filter-left">
          {/* Search Input */}
          <div className="org-search-input-box">
            <span className="org-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search by Org Name, Org ID, or Org Key..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPageNum(1);
              }}
            />
          </div>

          {/* Status Dropdown */}
          <select
            className="org-dropdown-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPageNum(1);
            }}
          >
            <option value="ALL">Status: All Statuses</option>
            <option value="Active">Status: Active</option>
            <option value="Inactive">Status: Inactive / Paused</option>
          </select>

          {/* Validity Dropdown */}
          <select
            className="org-dropdown-select"
            value={validityFilter}
            onChange={(e) => {
              setValidityFilter(e.target.value);
              setCurrentPageNum(1);
            }}
          >
            <option value="ALL">Validity: Any Period</option>
            <option value="EXPIRING">Expiring Soon (&lt; 60 Days)</option>
            <option value="VALID">Valid / Long Term</option>
          </select>
        </div>

        <div className="org-filter-right">
          {/* View Toggle */}
          <div className="org-view-toggle-group">
            <button
              type="button"
              className={`org-view-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <Icons.Table />
              <span>Table</span>
            </button>
            <button
              type="button"
              className={`org-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Icons.Grid />
              <span>Grid</span>
            </button>
          </div>

          {/* Reset / Refresh */}
          <button
            type="button"
            className="org-filter-action-btn"
            title="Refresh Data"
            onClick={() => {
              dispatch(fetchOrganizationsRequest());
              fetchScholarCounts();
              message.success('Organization directory refreshed.');
            }}
          >
            <Icons.Refresh />
          </button>
        </div>
      </div>

      {/* ====================================================================
          ORGANIZATIONS VIEW: TABLE OR GRID
          ==================================================================== */}
      {viewMode === 'table' ? (
        <div className="org-table-container">
          <div className="org-mobile-scroll-hint">
            👉 Swipe horizontally to view full table columns, or switch to <strong>Grid</strong> view above
          </div>
          <div className="org-table-wrapper">
            <table className="org-table">
              <thead>
                <tr>
                  <th className="org-checkbox-col">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </th>
                  <th>ORG ID</th>
                  <th>ORG KEY</th>
                  <th>NAME</th>
                  <th>START DATE</th>
                  <th>EXPIRE DATE</th>
                  <th>STATUS</th>
                  <th style={{ textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="org-empty-state">
                        <div className="org-empty-icon">🏢</div>
                        <div style={{ fontWeight: 600, color: '#334155' }}>
                          No organizations match your filters
                        </div>
                        <div style={{ fontSize: 12 }}>
                          Try adjusting your search criteria or add a new organization.
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrgs.map((org, idx) => {
                    const isChecked = selectedIds.has(org.id);
                    const { daysLeft, isExpiringSoon } = getExpiryInfo(org.expire_date);
                    const scholarsCount = orgScholarsMap[org.organization_key] || 0;
                    const avatarColor = getAvatarColor(org.name, idx);
                    const initials = getInitials(org.name);

                    // Truncate org id for clean table display like screenshot "org_71092a..."
                    const displayOrgId =
                      org.id.length > 12 ? `${org.id.slice(0, 10)}...` : org.id;

                    return (
                      <tr key={org.id} style={{ background: isChecked ? '#f8fafc' : undefined }}>
                        <td className="org-checkbox-col">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSelectRow(org.id)}
                            aria-label={`Select ${org.name}`}
                          />
                        </td>

                        {/* ORG ID */}
                        <td>
                          <div className="org-id-cell">
                            <Tooltip title={org.id}>
                              <span>{displayOrgId}</span>
                            </Tooltip>
                            <button
                              type="button"
                              className="org-copy-btn"
                              title="Copy Full ID"
                              onClick={() => handleCopy(org.id, 'Organization ID')}
                            >
                              <Icons.Copy />
                            </button>
                          </div>
                        </td>

                        {/* ORG KEY */}
                        <td>
                          <span className="org-key-badge">
                            {org.organization_key}
                            <button
                              type="button"
                              className="org-copy-btn"
                              title="Copy Key"
                              onClick={() => handleCopy(org.organization_key, 'Organization Key')}
                            >
                              <Icons.Copy />
                            </button>
                          </span>
                        </td>

                        {/* NAME + SCHOLARS */}
                        <td>
                          <div className="org-name-cell">
                            <div
                              className="org-avatar-circle"
                              style={{ backgroundColor: avatarColor }}
                            >
                              {initials}
                            </div>
                            <div className="org-name-info">
                              <span className="org-name-title">{org.name}</span>
                              <span className="org-name-sub">
                                {scholarsCount.toLocaleString()} Scholars
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* START DATE */}
                        <td>
                          <span className="org-date-text">
                            {org.start_date ? dayjs(org.start_date).format('DD/MM/YYYY') : '-'}
                          </span>
                        </td>

                        {/* EXPIRE DATE + DAYS BADGE */}
                        <td>
                          <div className="org-expire-cell">
                            <span className="org-date-text">
                              {org.expire_date ? dayjs(org.expire_date).format('DD/MM/YYYY') : '-'}
                            </span>
                            {isExpiringSoon && (
                              <span className="org-days-badge">{daysLeft} DAYS</span>
                            )}
                          </div>
                        </td>

                        {/* STATUS TOGGLE */}
                        <td>
                          <div className="org-status-toggle-cell">
                            <Switch
                              size="small"
                              checked={org.status === 'Active'}
                              onChange={(checked) => handleStatusToggle(org, checked)}
                            />
                            <span
                              className={`org-status-label ${
                                org.status === 'Active' ? 'active' : 'inactive'
                              }`}
                            >
                              {org.status === 'Active' ? 'Active' : 'Paused'}
                            </span>
                          </div>
                        </td>

                        {/* ACTIONS */}
                        <td>
                          <div className="org-row-actions">
                            <button
                              type="button"
                              className="org-action-icon-btn"
                              title="Edit Organization"
                              onClick={() => openEditModal(org)}
                            >
                              <Icons.Edit />
                            </button>

                            <Popconfirm
                              title="Delete Organization"
                              description={`Are you sure you want to permanently delete "${org.name}"? This action cannot be undone.`}
                              onConfirm={() => handleDeleteOrg(org.id, org.name)}
                              okText="Delete"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <button
                                type="button"
                                className="org-action-icon-btn danger"
                                title="Delete Organization"
                              >
                                <Icons.Trash />
                              </button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer & Pagination */}
          <div className="org-table-footer">
            <div className="org-footer-count">
              Showing{' '}
              <strong>
                {filteredOrganizations.length === 0
                  ? 0
                  : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong>
                {Math.min(currentPage * pageSize, filteredOrganizations.length)}
              </strong>{' '}
              of <strong>{filteredOrganizations.length}</strong> organizations
            </div>

            <div className="org-pagination">
              <button
                type="button"
                className="org-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  type="button"
                  key={pageNum}
                  className={`org-page-number ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPageNum(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="org-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div>
          <div className="org-cards-grid">
            {paginatedOrgs.length === 0 ? (
              <div
                className="org-empty-state"
                style={{ gridColumn: '1 / -1', background: '#ffffff', borderRadius: 12 }}
              >
                <div className="org-empty-icon">🏢</div>
                <div style={{ fontWeight: 600, color: '#334155' }}>
                  No organizations found matching current criteria
                </div>
              </div>
            ) : (
              paginatedOrgs.map((org, idx) => {
                const { daysLeft, isExpiringSoon } = getExpiryInfo(org.expire_date);
                const scholarsCount = orgScholarsMap[org.organization_key] || 0;
                const avatarColor = getAvatarColor(org.name, idx);
                const initials = getInitials(org.name);

                return (
                  <div key={org.id} className="org-card-item">
                    <div className="org-card-header">
                      <div className="org-name-cell">
                        <div
                          className="org-avatar-circle"
                          style={{ backgroundColor: avatarColor }}
                        >
                          {initials}
                        </div>
                        <div className="org-name-info">
                          <span className="org-name-title">{org.name}</span>
                          <span className="org-name-sub">
                            {scholarsCount.toLocaleString()} Scholars
                          </span>
                        </div>
                      </div>

                      <Switch
                        size="small"
                        checked={org.status === 'Active'}
                        onChange={(checked) => handleStatusToggle(org, checked)}
                      />
                    </div>

                    <div className="org-card-body">
                      <div className="org-card-row">
                        <span style={{ color: '#64748b' }}>Organization Key:</span>
                        <span className="org-key-badge">
                          {org.organization_key}
                          <button
                            type="button"
                            className="org-copy-btn"
                            onClick={() => handleCopy(org.organization_key, 'Key')}
                          >
                            <Icons.Copy />
                          </button>
                        </span>
                      </div>

                      <div className="org-card-row">
                        <span style={{ color: '#64748b' }}>Validity Period:</span>
                        <span>
                          {org.start_date ? dayjs(org.start_date).format('DD/MM/YYYY') : '-'} →{' '}
                          {org.expire_date ? dayjs(org.expire_date).format('DD/MM/YYYY') : '-'}
                        </span>
                      </div>

                      {isExpiringSoon && (
                        <div className="org-card-row">
                          <span style={{ color: '#ea580c', fontWeight: 600 }}>Expires in:</span>
                          <span className="org-days-badge">{daysLeft} DAYS REMAINING</span>
                        </div>
                      )}
                    </div>

                    <div className="org-card-footer">
                      <span
                        className={`org-status-label ${
                          org.status === 'Active' ? 'active' : 'inactive'
                        }`}
                      >
                        {org.status === 'Active' ? '● Active Tenancy' : '○ Paused / Inactive'}
                      </span>

                      <div className="org-row-actions">
                        <button
                          type="button"
                          className="org-action-icon-btn"
                          title="Edit"
                          onClick={() => openEditModal(org)}
                        >
                          <Icons.Edit />
                        </button>
                        <Popconfirm
                          title="Delete Organization"
                          description={`Delete "${org.name}" permanently?`}
                          onConfirm={() => handleDeleteOrg(org.id, org.name)}
                          okText="Delete"
                          cancelText="Cancel"
                          okButtonProps={{ danger: true }}
                        >
                          <button
                            type="button"
                            className="org-action-icon-btn danger"
                            title="Delete"
                          >
                            <Icons.Trash />
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Grid View Pagination Footer */}
          <div className="org-table-footer" style={{ borderRadius: 12, marginBottom: 24 }}>
            <div className="org-footer-count">
              Showing <strong>{paginatedOrgs.length}</strong> of{' '}
              <strong>{filteredOrganizations.length}</strong> organizations
            </div>

            <div className="org-pagination">
              <button
                type="button"
                className="org-page-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
              >
                &lt;
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  type="button"
                  key={pageNum}
                  className={`org-page-number ${currentPage === pageNum ? 'active' : ''}`}
                  onClick={() => setCurrentPageNum(pageNum)}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                className="org-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          GOVERNANCE PROTOCOL BANNER (BOTTOM)
          ==================================================================== */}
      <div className="org-governance-card">
        <div className="org-gov-left">
          <div className="org-gov-icon-box">
            <Icons.ShieldCheck />
          </div>
          <div className="org-gov-info">
            <span className="org-gov-title">
              Multi-Academy Tenancy Governance Protocol
            </span>
            <p className="org-gov-desc">
              All organizations are provisioned in strict isolation adhering to ISO-27001 data isolation standards. Revoking status immediately restricts tenant administrator access.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="org-gov-btn"
          onClick={() => setIsGuidelinesModalVisible(true)}
        >
          TENANCY GUIDELINES
        </button>
      </div>

      {/* ====================================================================
          MODAL: ADD ORGANIZATION
          ==================================================================== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.Building />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Provision New Organization
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Establish a new educational tenant campus in the enterprise matrix
              </div>
            </div>
          </div>
        }
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          addForm.resetFields();
        }}
        footer={null}
        width={540}
        destroyOnClose
      >
        <Form
          form={addForm}
          layout="vertical"
          onFinish={handleAddSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>Organization / Academy Name</span>}
            rules={[{ required: true, message: 'Please enter academy name' }]}
          >
            <Input placeholder="e.g. Apex Secondary Academy" size="large" />
          </Form.Item>

          <Form.Item
            name="organization_key"
            label={
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontWeight: 600 }}>Unique Organization Key</span>
                <button
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onClick={() => addForm.setFieldsValue({ organization_key: generateOrgKey() })}
                >
                  ⚡ Generate New Key
                </button>
              </div>
            }
            rules={[{ required: true, message: 'Organization key is required' }]}
          >
            <Input
              style={{ fontFamily: 'monospace', fontWeight: 700 }}
              size="large"
              placeholder="e.g. 11986422"
            />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="start_date"
              label={<span style={{ fontWeight: 600 }}>License Start Date</span>}
              rules={[{ required: true, message: 'Select start date' }]}
            >
              <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              name="expire_date"
              label={<span style={{ fontWeight: 600 }}>License Expire Date</span>}
              rules={[{ required: true, message: 'Select expiration date' }]}
            >
              <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label={<span style={{ fontWeight: 600 }}>Initial Status</span>}
            valuePropName="checked"
          >
            <Switch checkedChildren="Active Tenancy" unCheckedChildren="Paused" />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24,
              borderTop: '1px solid #f1f5f9',
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              className="org-btn-outline"
              onClick={() => {
                setIsAddModalVisible(false);
                addForm.resetFields();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="org-btn-primary-blue">
              Provision Organization
            </button>
          </div>
        </Form>
      </Modal>

      {/* ====================================================================
          MODAL: EDIT ORGANIZATION
          ==================================================================== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.Edit />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Edit Organization
              </div>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
                Update institutional details and licensing status
              </div>
            </div>
          </div>
        }
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingOrg(null);
          editForm.resetFields();
        }}
        footer={null}
        width={540}
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditSubmit}
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="id"
            label={<span style={{ fontWeight: 600 }}>Organization ID (System Assigned)</span>}
          >
            <Input disabled size="large" style={{ fontFamily: 'monospace' }} />
          </Form.Item>

          <Form.Item
            name="organization_key"
            label={<span style={{ fontWeight: 600 }}>Organization Key (Fixed)</span>}
          >
            <Input disabled size="large" style={{ fontFamily: 'monospace', fontWeight: 700 }} />
          </Form.Item>

          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>Organization Name</span>}
            rules={[{ required: true, message: 'Please enter academy name' }]}
          >
            <Input size="large" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="start_date"
              label={<span style={{ fontWeight: 600 }}>Start Date</span>}
              rules={[{ required: true, message: 'Select start date' }]}
            >
              <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
            </Form.Item>

            <Form.Item
              name="expire_date"
              label={<span style={{ fontWeight: 600 }}>Expire Date</span>}
              rules={[{ required: true, message: 'Select expire date' }]}
            >
              <DatePicker style={{ width: '100%' }} size="large" format="DD/MM/YYYY" />
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label={<span style={{ fontWeight: 600 }}>Status</span>}
            valuePropName="checked"
          >
            <Switch checkedChildren="Active Tenancy" unCheckedChildren="Paused" />
          </Form.Item>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 24,
              borderTop: '1px solid #f1f5f9',
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              className="org-btn-outline"
              onClick={() => {
                setIsEditModalVisible(false);
                setEditingOrg(null);
                editForm.resetFields();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="org-btn-primary-blue">
              Save Changes
            </button>
          </div>
        </Form>
      </Modal>

      {/* ====================================================================
          MODAL: IMPORT CSV
          ==================================================================== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.FileText />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Batch Import Organizations (CSV)
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Paste CSV content or enter comma-separated tenant records
              </div>
            </div>
          </div>
        }
        open={isImportModalVisible}
        onCancel={() => {
          setIsImportModalVisible(false);
          setImportCsvText('');
        }}
        footer={null}
        width={560}
      >
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 12,
              color: '#475569',
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            <strong>Supported Header / Columns:</strong>
            <br />
            <code>Name, StartDate (YYYY-MM-DD), ExpireDate (YYYY-MM-DD), Status (Active/Inactive)</code>
            <br />
            <em>Unique keys are generated automatically for each new academy.</em>
          </div>

          <textarea
            rows={8}
            style={{
              width: '100%',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: 12,
              fontFamily: 'monospace',
              fontSize: 12,
              outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder={`Name,StartDate,ExpireDate,Status\nGreenwood High School,2024-01-01,2026-12-31,Active\nSt. Xavier International,2024-06-01,2025-06-01,Active`}
            value={importCsvText}
            onChange={(e) => setImportCsvText(e.target.value)}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 18,
              borderTop: '1px solid #f1f5f9',
              paddingTop: 14,
            }}
          >
            <button
              type="button"
              className="org-btn-outline"
              onClick={() => {
                setIsImportModalVisible(false);
                setImportCsvText('');
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="org-btn-primary-blue"
              onClick={handleImportSubmit}
            >
              Import Organizations
            </button>
          </div>
        </div>
      </Modal>

      {/* ====================================================================
          MODAL: TENANCY GUIDELINES
          ==================================================================== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icons.ShieldCheck />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Multi-Academy Tenancy Governance Protocol
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Executive Compliance Standards &amp; Isolation Policy
              </div>
            </div>
          </div>
        }
        open={isGuidelinesModalVisible}
        onCancel={() => setIsGuidelinesModalVisible(false)}
        footer={[
          <button
            key="close"
            type="button"
            className="org-btn-primary-blue"
            onClick={() => setIsGuidelinesModalVisible(false)}
          >
            I Acknowledge Guidelines
          </button>,
        ]}
        width={620}
      >
        <div style={{ marginTop: 16, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <p>
            The Multi-Academy Governance architecture guarantees cryptographic and operational isolation between school tenancies in compliance with <strong>ISO-27001</strong> and <strong>FERPA/GDPR</strong> standards:
          </p>

          <ul style={{ paddingLeft: 20, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li>
              <strong>Data Boundary Isolation:</strong> Each organization operates strictly isolated records filtered by <code>organization_key</code>. Cross-tenant leakage is prevented at the database and application levels.
            </li>
            <li>
              <strong>Status Revocation:</strong> Marking an organization as <em>Paused</em> or <em>Inactive</em> instantly restricts tenant staff, teacher, and administrator logins while preserving historical audit logs.
            </li>
            <li>
              <strong>License Lifecycles:</strong> Organizations with licenses expiring within 60 days are flagged with the orange alert badge. Renewal notices are automatically queued for the governance board.
            </li>
            <li>
              <strong>Census Auditing:</strong> The student body counts reflect live consolidated scholar enrolments directly synchronized with the unified registry.
            </li>
          </ul>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: 12,
              marginTop: 14,
              fontSize: 12,
              color: '#64748b',
            }}
          >
            For tenant provisioning exceptions or enterprise license extensions, contact the Root Security Operations Team.
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Organizations;
