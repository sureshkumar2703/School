import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Modal, Form, Input, Select, Switch, message, Popconfirm, Tooltip } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchOrganizationsRequest, type Organization } from '../../store/features/organizations/organizationsSlice';
import {
  fetchAdminsRequest,
  updateAdminStatusRequest,
  type AdminData,
} from '../../store/features/organizations-admins/organizationsAdminsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import './OrganizationsAdmins.css';

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
  Download: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  UserPlus: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Shield: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Mail: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Users: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Filter: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  Calendar: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  GraduationCap: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  RefreshCw: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  ),
  Eye: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  Copy: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
};

// Generates avatar background color based on name string
const getAvatarColor = (name: string, index: number) => {
  const colors = [
    '#0f172a', // Dark Navy
    '#2563eb', // Royal Blue
    '#475569', // Slate
    '#ea580c', // Peach / Amber
    '#7c3aed', // Purple
    '#059669', // Emerald
  ];
  if (!name) return colors[index % colors.length];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Formats initials from full name
const getInitials = (name?: string) => {
  if (!name) return 'AD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const OrganizationsAdmins: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { organizations } = useSelector((state: RootState) => state.organizations);
  const { admins, loading: adminsLoading } = useSelector((state: RootState) => state.organizationsAdmins);
  const { user } = useSelector((state: RootState) => state.auth);

  // Filters & State
  const [selectedOrgKey, setSelectedOrgKey] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Inactive'>('ALL');
  const [activeTab, setActiveTab] = useState<'roster' | 'unassigned' | 'preview'>('roster');
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());

  // Pagination
  const [currentPage, setCurrentPageNum] = useState<number>(1);
  const pageSize = 10;

  // Modals
  const [isAddModalVisible, setIsAddModalVisible] = useState<boolean>(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminData | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Initial load
  useEffect(() => {
    dispatch(fetchOrganizationsRequest());
  }, [dispatch]);

  // Fetch admins whenever selected organization changes
  useEffect(() => {
    dispatch(fetchAdminsRequest(selectedOrgKey));
    setCurrentPageNum(1);
  }, [dispatch, selectedOrgKey]);

  // Active organization details
  const activeOrg = useMemo(() => {
    if (selectedOrgKey === 'ALL') return null;
    return organizations.find((o) => o.organization_key === selectedOrgKey) || null;
  }, [selectedOrgKey, organizations]);

  // Filtered admins list
  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      // Status filter
      if (statusFilter !== 'ALL' && admin.status !== statusFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = (admin.name || '').toLowerCase().includes(q);
        const matchesPhone = (admin.phone || '').toLowerCase().includes(q);
        const matchesEmail = (admin.email || '').toLowerCase().includes(q);
        const matchesOrg = (admin.organization_key || '').toLowerCase().includes(q);
        const matchesId = (admin.id || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesOrg && !matchesId) {
          return false;
        }
      }
      return true;
    });
  }, [admins, statusFilter, searchTerm]);

  // Paginated records
  const paginatedAdmins = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAdmins.slice(startIndex, startIndex + pageSize);
  }, [filteredAdmins, currentPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / pageSize));

  // Metrics
  const activeAdminsCount = useMemo(() => {
    return admins.filter((a) => a.status === 'Active').length;
  }, [admins]);

  const pendingSetupCount = useMemo(() => {
    return admins.filter((a) => a.status !== 'Active').length;
  }, [admins]);

  // Password toggle helper
  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyPassword = (password?: string) => {
    if (!password) {
      message.info('No password registered for this administrator.');
      return;
    }
    navigator.clipboard.writeText(password);
    message.success('Password copied to clipboard.');
  };

  // Toggle status (Active / Inactive)
  const handleToggleStatus = (record: AdminData) => {
    const newStatus = record.status === 'Active' ? 'Inactive' : 'Active';
    dispatch(updateAdminStatusRequest({ ...record, status: newStatus }));
    message.success(`Administrator ${record.name || record.email} status set to ${newStatus}.`);
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    const headers = 'S.No,ID,Name,Phone,Email,OrganizationKey,Status,CreatedAt\n';
    const rows = filteredAdmins
      .map(
        (a, i) =>
          `${i + 1},${a.id},"${a.name || ''}","${a.phone || ''}","${a.email || ''}",${a.organization_key},${a.status},"${a.created_at || ''}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `organization-admins-${selectedOrgKey}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Administrators CSV exported successfully.');
  };

  // Quick Action Modal
  const handleQuickAction = () => {
    Modal.info({
      title: 'Executive Administration Actions',
      content: (
        <div style={{ marginTop: 12, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <p>Select an administrative operational action:</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <button
              type="button"
              className="oa-btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                Modal.destroyAll();
                dispatch(setCurrentPage('organizations'));
              }}
            >
              🏢 Provision New Campus Organization
            </button>
            <button
              type="button"
              className="oa-btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                Modal.destroyAll();
                setIsAddModalVisible(true);
              }}
            >
              👤 Add Campus Administrator
            </button>
            <button
              type="button"
              className="oa-btn-outline"
              style={{ justifyContent: 'flex-start' }}
              onClick={() => {
                Modal.destroyAll();
                message.success('Core Identity Vault synchronized across all campus nodes.');
              }}
            >
              🔄 Synchronize Directory Credentials
            </button>
          </div>
        </div>
      ),
      okText: 'Close',
    });
  };

  // Create Admin Submission
  const handleCreateAdmin = async (values: any) => {
    setSubmitting(true);
    try {
      const targetOrgKey = values.organization_key || selectedOrgKey;
      if (!targetOrgKey || targetOrgKey === 'ALL') {
        message.error('Please select a specific campus organization.');
        setSubmitting(false);
        return;
      }

      const newAdminPayload = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        password: values.password.trim(),
        organization_key: targetOrgKey,
        status: values.status ? 'Active' : 'Inactive',
      };

      const { error: insertErr } = await supabase.from('admin_data').insert([newAdminPayload]);
      if (insertErr) {
        if (insertErr.message.includes('unique')) {
          throw new Error('An administrator with this email address already exists.');
        }
        throw insertErr;
      }

      message.success(`Administrator ${values.name} successfully registered.`);
      setIsAddModalVisible(false);
      form.resetFields();
      dispatch(fetchAdminsRequest(selectedOrgKey));
    } catch (err: any) {
      console.error('Error creating admin:', err);
      message.error(`Failed to register administrator: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Edit Admin Submission
  const handleUpdateAdmin = async (values: any) => {
    if (!editingAdmin) return;
    setSubmitting(true);
    try {
      const updatePayload: any = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim(),
        status: values.status ? 'Active' : 'Inactive',
      };
      if (values.password && values.password.trim()) {
        updatePayload.password = values.password.trim();
      }

      const { error: updateErr } = await supabase
        .from('admin_data')
        .update(updatePayload)
        .eq('id', editingAdmin.id);

      if (updateErr) throw updateErr;

      message.success(`Administrator ${values.name} updated successfully.`);
      setIsEditModalVisible(false);
      setEditingAdmin(null);
      editForm.resetFields();
      dispatch(fetchAdminsRequest(selectedOrgKey));
    } catch (err: any) {
      console.error('Error updating admin:', err);
      message.error(`Failed to update administrator: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Admin
  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    try {
      const { error: delErr } = await supabase.from('admin_data').delete().eq('id', adminId);
      if (delErr) throw delErr;
      message.success(`Administrator ${adminName} removed from roster.`);
      dispatch(fetchAdminsRequest(selectedOrgKey));
    } catch (err: any) {
      console.error('Error deleting admin:', err);
      message.error(`Failed to delete administrator: ${err.message}`);
    }
  };

  const openEditModal = (admin: AdminData) => {
    setEditingAdmin(admin);
    editForm.setFieldsValue({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      password: admin.password,
      status: admin.status === 'Active',
    });
    setIsEditModalVisible(true);
  };

  return (
    <div className="oa-wrapper">
      {/* ====================================================================
          TOPBAR COMPONENT
          ==================================================================== */}
      <div className="oa-topbar">
        <div className="oa-topbar-left">
          {/* Organization Selector */}
          <div className="oa-topbar-select-wrapper">
            <select
              className="oa-topbar-select"
              value={selectedOrgKey}
              onChange={(e) => setSelectedOrgKey(e.target.value)}
              aria-label="Select Organization"
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
          <div className="oa-topbar-search">
            <span className="oa-topbar-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="oa-topbar-right">
          {/* Quick Action */}
          <button type="button" className="oa-btn-outline" onClick={handleQuickAction}>
            <Icons.Lightning />
            <span>Quick Action</span>
          </button>

          {/* New Org Button */}
          <button
            type="button"
            className="oa-btn-outline"
            onClick={() => dispatch(setCurrentPage('organizations'))}
          >
            <Icons.Building />
            <span>+ New Org</span>
          </button>

          {/* Notification Bell */}
          <div
            className="oa-bell-btn"
            onClick={() => message.info('Zero pending credential security alerts.')}
            role="button"
            tabIndex={0}
          >
            <Icons.Bell />
            <span className="oa-bell-dot" />
          </div>

          {/* User Profile Chip */}
          <div className="oa-profile-chip">
            <div className="oa-avatar-circle">
              {user?.name ? getInitials(user.name) : 'AP'}
            </div>
            <div className="oa-profile-info">
              <span className="oa-profile-name">{user?.name || user?.email || 'Arthur Pendelton'}</span>
              <span className="oa-profile-role">Super Admin</span>
            </div>
            <span className="oa-root-badge">ROOT MASTER</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          PAGE HEADER (TITLE & PRIMARY ACTIONS)
          ==================================================================== */}
      <div className="oa-header-row">
        <div className="oa-title-group">
          <div className="oa-eyebrow">
            <span className="oa-eyebrow-pill" />
            <span>MULTI-CAMPUS ROSTER</span>
          </div>
          <h1 className="oa-page-title">Organization Admins</h1>
          <p className="oa-page-desc">
            Manage credentialed campus leadership, delegate system authorities, and audit access credentials
            across registered institutional branches.
          </p>
        </div>

        <div className="oa-header-actions">
          {/* Export CSV */}
          <button type="button" className="oa-btn-export" onClick={handleExportCSV}>
            <Icons.Download />
            <span>Export CSV</span>
          </button>

          {/* Add Organization Admin */}
          <button
            type="button"
            className="oa-btn-primary"
            onClick={() => {
              form.resetFields();
              if (selectedOrgKey !== 'ALL') {
                form.setFieldsValue({ organization_key: selectedOrgKey });
              }
              setIsAddModalVisible(true);
            }}
          >
            <Icons.UserPlus />
            <span>+ Add Organization Admin</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          METRICS 4-CARD ROW
          ==================================================================== */}
      <div className="oa-metrics-grid">
        {/* Card 1: ACTIVE ADMINS */}
        <div className="oa-metric-card">
          <div className="oa-metric-header">
            <span className="oa-metric-title">ACTIVE ADMINS</span>
            <div className="oa-metric-icon-box blue">
              <Icons.ShieldCheck />
            </div>
          </div>
          <div className="oa-metric-value">{activeAdminsCount}</div>
          <div className="oa-metric-subtext trend">
            <span>↗ 100% 2FA Enforcement</span>
          </div>
        </div>

        {/* Card 2: MANAGED TENANTS */}
        <div className="oa-metric-card">
          <div className="oa-metric-header">
            <span className="oa-metric-title">MANAGED TENANTS</span>
            <div className="oa-metric-icon-box slate">
              <Icons.Building />
            </div>
          </div>
          <div className="oa-metric-value">{organizations.length}</div>
          <div className="oa-metric-subtext">
            <span>Across {Math.max(1, Math.ceil(organizations.length / 3))} regional zones</span>
          </div>
        </div>

        {/* Card 3: PENDING SETUP */}
        <div className="oa-metric-card">
          <div className="oa-metric-header">
            <span className="oa-metric-title">PENDING SETUP</span>
            <div className="oa-metric-icon-box peach">
              <Icons.Mail />
            </div>
          </div>
          <div className="oa-metric-value peach">
            {pendingSetupCount < 10 ? `0${pendingSetupCount}` : pendingSetupCount}
          </div>
          <div className="oa-metric-subtext">
            <span>Activation invites awaiting</span>
          </div>
        </div>

        {/* Card 4: SECURITY AUDITS */}
        <div className="oa-metric-card">
          <div className="oa-metric-header">
            <span className="oa-metric-title">SECURITY AUDITS</span>
            <div className="oa-metric-icon-box slate">
              <Icons.Shield />
            </div>
          </div>
          <div className="oa-metric-value">0 Flagged</div>
          <div className="oa-metric-subtext">
            <span>Zero credential leaks</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          TABS & DIRECTORY SYNC STATUS BAR
          ==================================================================== */}
      <div className="oa-tabs-row">
        <div className="oa-tabs-group">
          <button
            type="button"
            className={`oa-tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <Icons.Users />
            <span>Credentialed Roster ({filteredAdmins.length})</span>
          </button>
          <button
            type="button"
            className={`oa-tab-btn ${activeTab === 'unassigned' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('unassigned');
              message.info('All campus leadership credentials are currently assigned.');
            }}
          >
            <Icons.Filter />
            <span>Unassigned Filter State</span>
          </button>
          <button
            type="button"
            className={`oa-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('preview');
              message.info('Reference preview mode enabled.');
            }}
          >
            <Icons.Calendar />
            <span>Reference Preview</span>
          </button>
        </div>

        <div className="oa-sync-pill">
          <span className="oa-sync-dot" />
          <span>Directory auto-synchronized with Core Identity Vault</span>
        </div>
      </div>

      {/* ====================================================================
          MAIN DATA CARD & FILTERS CONTAINER
          ==================================================================== */}
      <div className="oa-card-container">
        {/* Filter Panel */}
        <div className="oa-filter-panel">
          <div className="oa-filter-left">
            {/* Campus Select */}
            <div className="oa-campus-select-wrapper">
              <select
                className="oa-campus-select"
                value={selectedOrgKey}
                onChange={(e) => setSelectedOrgKey(e.target.value)}
                aria-label="Filter by Campus"
              >
                <option value="ALL">🎓 All Organizations (Consolidated)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.organization_key}>
                    🎓 {org.name} ({org.organization_key})
                  </option>
                ))}
              </select>
            </div>

            {/* Status Pills */}
            <div className="oa-status-pills">
              <button
                type="button"
                className={`oa-status-pill-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                ALL STATUSES
              </button>
              <button
                type="button"
                className={`oa-status-pill-btn ${statusFilter === 'Active' ? 'active' : ''}`}
                onClick={() => setStatusFilter('Active')}
              >
                ACTIVE
              </button>
              <button
                type="button"
                className={`oa-status-pill-btn ${statusFilter === 'Inactive' ? 'active' : ''}`}
                onClick={() => setStatusFilter('Inactive')}
              >
                SUSPENDED
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="oa-filter-search">
            <span className="oa-filter-search-icon">
              <Icons.Search />
            </span>
            <input
              type="text"
              placeholder="Search by Name, Phone, Email, or Org Key..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Administrators Table */}
        <div className="oa-mobile-scroll-hint">
          👉 Swipe horizontally to view all admin records and actions
        </div>
        <div className="oa-table-wrapper">
          <table className="oa-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>S.NO</th>
                <th style={{ width: 110 }}>ID</th>
                <th>ADMIN NAME</th>
                <th>PHONE</th>
                <th>EMAIL</th>
                <th style={{ minWidth: 220 }}>PASSWORD / SECURITY</th>
                <th style={{ width: 90, textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {adminsLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                    Loading credentialed administrators...
                  </td>
                </tr>
              ) : paginatedAdmins.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: '#64748b' }}>
                    No administrators found matching the criteria. Click "+ Add Organization Admin" to register leadership.
                  </td>
                </tr>
              ) : (
                paginatedAdmins.map((admin, idx) => {
                  const sNo = (currentPage - 1) * pageSize + idx + 1;
                  const adminIdFormatted = `ADM-${(admin.id || `${1000 + idx}`).slice(-4).toUpperCase()}`;
                  const isPasswordRevealed = revealedPasswords.has(admin.id);
                  const is2FAActive = admin.status === 'Active';

                  return (
                    <tr key={admin.id || idx}>
                      {/* S.No */}
                      <td className="oa-sno-col">{sNo}</td>

                      {/* ID Badge */}
                      <td>
                        <span className="oa-id-badge">{adminIdFormatted}</span>
                      </td>

                      {/* Admin Name & Role */}
                      <td>
                        <div className="oa-name-cell">
                          <div
                            className="oa-name-avatar"
                            style={{ backgroundColor: getAvatarColor(admin.name || '', idx) }}
                          >
                            {getInitials(admin.name)}
                          </div>
                          <div className="oa-name-info">
                            <span className="oa-name-text">{admin.name || 'Unnamed Administrator'}</span>
                            <span className="oa-role-text">
                              {admin.organization_key ? `Campus: ${admin.organization_key}` : 'Institutional Leadership'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td>
                        <span className="oa-phone-text">{admin.phone || '+1 (555) 000-0000'}</span>
                      </td>

                      {/* Email */}
                      <td>
                        <a href={`mailto:${admin.email}`} className="oa-email-link">
                          {admin.email}
                        </a>
                      </td>

                      {/* Password / Security */}
                      <td>
                        <div className="oa-security-cell">
                          <span className="oa-password-dots">
                            {isPasswordRevealed ? admin.password || '•••••••••' : '•••••••••'}
                          </span>

                          {/* Reveal/Hide Password */}
                          <Tooltip title={isPasswordRevealed ? 'Hide Password' : 'Show Password'}>
                            <button
                              type="button"
                              className="oa-security-icon-btn"
                              onClick={() => togglePasswordVisibility(admin.id)}
                              aria-label="Toggle password visibility"
                            >
                              {isPasswordRevealed ? <Icons.EyeOff /> : <Icons.Eye />}
                            </button>
                          </Tooltip>

                          {/* Copy Password */}
                          <Tooltip title="Copy Password">
                            <button
                              type="button"
                              className="oa-security-icon-btn"
                              onClick={() => handleCopyPassword(admin.password)}
                              aria-label="Copy password"
                            >
                              <Icons.Copy />
                            </button>
                          </Tooltip>

                          {/* 2FA Badge & Status Toggle */}
                          <Tooltip title={`Status: ${admin.status}. Click to toggle.`}>
                            <span
                              className={`oa-2fa-badge ${is2FAActive ? 'on' : 'pending'}`}
                              onClick={() => handleToggleStatus(admin)}
                              role="button"
                              tabIndex={0}
                            >
                              {is2FAActive ? '2FA ON' : 'PENDING 2FA'}
                            </span>
                          </Tooltip>
                        </div>
                      </td>

                      {/* Row Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="oa-row-actions" style={{ justifyContent: 'flex-end' }}>
                          <Tooltip title="Edit Admin">
                            <button
                              type="button"
                              className="oa-action-icon-btn"
                              onClick={() => openEditModal(admin)}
                              aria-label="Edit admin"
                            >
                              <Icons.Edit />
                            </button>
                          </Tooltip>

                          <Popconfirm
                            title="Remove Administrator"
                            description={`Are you sure you want to remove ${admin.name}?`}
                            okText="Yes, Remove"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDeleteAdmin(admin.id, admin.name)}
                          >
                            <button
                              type="button"
                              className="oa-action-icon-btn danger"
                              aria-label="Delete admin"
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

        {/* Table Footer */}
        <div className="oa-table-footer">
          <div className="oa-footer-count">
            Total Admins: <strong>{filteredAdmins.length}</strong> &nbsp;•&nbsp; Showing{' '}
            {filteredAdmins.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredAdmins.length)} of {filteredAdmins.length} entries
          </div>

          <div className="oa-pagination">
            <button
              type="button"
              className="oa-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPageNum((p) => Math.max(1, p - 1))}
            >
              &lt; Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <span
                key={pageNum}
                className={`oa-page-number ${pageNum === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPageNum(pageNum)}
                role="button"
                tabIndex={0}
              >
                {pageNum}
              </span>
            ))}

            <button
              type="button"
              className="oa-page-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPageNum((p) => Math.min(totalPages, p + 1))}
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MODAL: ADD ORGANIZATION ADMIN
          ==================================================================== */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 700 }}>
            <Icons.UserPlus />
            <span>Register Organization Administrator</span>
          </div>
        }
        open={isAddModalVisible}
        onCancel={() => {
          setIsAddModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        destroyOnClose
        centered
        width={540}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAdmin} style={{ marginTop: 16 }}>
          <Form.Item
            name="organization_key"
            label="Campus Organization"
            rules={[{ required: true, message: 'Please select an organization' }]}
            initialValue={selectedOrgKey !== 'ALL' ? selectedOrgKey : undefined}
          >
            <Select placeholder="Select campus organization" showSearch>
              {organizations.map((org) => (
                <Option key={org.id} value={org.organization_key}>
                  {org.name} ({org.organization_key})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Administrator Full Name"
            rules={[{ required: true, message: 'Please enter administrator full name' }]}
          >
            <Input placeholder="e.g. Dr. Arthur Pendelton" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Official Email Address"
            rules={[
              { required: true, message: 'Please enter a valid email address' },
              { type: 'email', message: 'Invalid email address' },
            ]}
          >
            <Input placeholder="e.g. a.pendelton@msk.academy.edu" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Contact Phone"
            rules={[{ required: true, message: 'Please enter phone number' }]}
          >
            <Input placeholder="e.g. +1 (555) 234-8891" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Initial Access Password"
            rules={[{ required: true, message: 'Please provide an access password' }]}
          >
            <Input.Password placeholder="Enter a secure password (min 6 characters)" />
          </Form.Item>

          <Form.Item name="status" label="Active Authorization Status" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Active (2FA On)" unCheckedChildren="Pending" defaultChecked />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              className="oa-btn-outline"
              onClick={() => {
                setIsAddModalVisible(false);
                form.resetFields();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="oa-btn-primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Create Admin & Issue Credentials'}
            </button>
          </div>
        </Form>
      </Modal>

      {/* ====================================================================
          MODAL: EDIT ORGANIZATION ADMIN
          ==================================================================== */}
      <Modal
        title="Edit Administrator Credentials"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingAdmin(null);
        }}
        footer={null}
        destroyOnClose
        centered
        width={500}
      >
        <Form form={editForm} layout="vertical" onFinish={handleUpdateAdmin} style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Administrator Name"
            rules={[{ required: true, message: 'Please enter name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email Address"
            rules={[
              { required: true, message: 'Please enter email' },
              { type: 'email', message: 'Invalid email' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Contact Phone"
            rules={[{ required: true, message: 'Please enter phone' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="password" label="Update Password (Optional)">
            <Input.Password placeholder="Leave blank to keep existing password" />
          </Form.Item>

          <Form.Item name="status" label="2FA / Active Status" valuePropName="checked">
            <Switch checkedChildren="Active (2FA On)" unCheckedChildren="Suspended / Pending" />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button
              type="button"
              className="oa-btn-outline"
              onClick={() => {
                setIsEditModalVisible(false);
                setEditingAdmin(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="oa-btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Administrator'}
            </button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default OrganizationsAdmins;
