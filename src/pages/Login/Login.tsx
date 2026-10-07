import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Modal, message } from 'antd';
import { loginRequest } from '../../store/features/auth/authSlice';
import type { RootState } from '../../store/store';
import './Login.css';

// Clean vector icons
const Icons = {
  GraduationCap: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  ),
  Megaphone: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </svg>
  ),
  Bookmark: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Users: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Flask: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.31L4.14 20.3A2 2 0 0 0 5.86 23h12.28a2 2 0 0 0 1.72-2.7L14 9.31V2" />
      <line x1="8.5" y1="2" x2="15.5" y2="2" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  ),
  Chart: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Calendar: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Message: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  IdBadge: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <line x1="15" y1="8" x2="17" y2="8" />
      <line x1="15" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  ),
  Lock: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Eye: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Headset: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Temple: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 20H4v-8h16v8zM4 10l8-6 8 6H4z" />
    </svg>
  ),
  HelpCircle: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  UserCircle: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Mail: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Phone: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  AlertCircle: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

const Login: React.FC = () => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setValidationError('Please enter your Institutional ID or Directory Email.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your confidential passphrase / password.');
      return;
    }

    setValidationError(null);
    dispatch(loginRequest({ email: identifier.trim(), password }));
  };

  const handleForgotPassword = () => {
    Modal.info({
      title: 'Credential Recovery Assistance',
      content: (
        <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
          <p>
            To recover or reset your portal credentials, access pass code, or password,
            please reach out directly to the Registrar &amp; IT Helpdesk:
          </p>
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>
            <div><strong>Telephone:</strong> (+91) 7845800644</div>
            <div style={{ marginTop: 4 }}><strong>Official Email:</strong> algojaxon@gmail.com</div>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
            Identity verification and institutional authorization are required before credentials can be reissued.
          </p>
        </div>
      ),
      okText: 'Close',
    });
  };

  const handleSSO = () => {
    message.info('Campus Single Sign-On (SSO) with Google Workspace / Microsoft Entra ID is active for registered campus domains.');
  };

  return (
    <div className="ep-login-container">
      {/* ====================================================================
          DESKTOP SCREEN LAYOUT - Visible on >= 1024px
          ==================================================================== */}
      <div className="ep-desktop-view">
        {/* Left Hero Panel */}
        <div className="ep-hero-panel">
          <div>
            {/* Top Operational Pill & Term */}
            <div className="ep-hero-top">
              <div className="ep-operational-pill">
                <span className="ep-status-dot" />
                <span>ALL CAMPUS SERVICES OPERATIONAL</span>
              </div>
              <div className="ep-term-tag">TERM 2024-2025</div>
            </div>

            {/* Main Headline Group */}
            <div className="ep-hero-headline-group">
              <div className="ep-hero-overline">EXCELLENCE IN GOVERNANCE &amp; SCHOLARSHIP</div>
              <h1 className="ep-hero-title">
                Empowering Academic Excellence &amp; Vibrant Campus Life.
              </h1>
              <p className="ep-hero-description">
                The unified digital nerve-center for St. Jude Preparatory Academy.
                Connecting faculty, scholars, and guardians in a rigorous, synchronized collegiate ecosystem.
              </p>
            </div>

            {/* Live Campus Notices Box */}
            <div className="ep-notices-container">
              <div className="ep-notices-header">
                <div className="ep-notices-title">
                  <Icons.Megaphone />
                  <span>LIVE CAMPUS NOTICES</span>
                </div>
                <span className="ep-notices-updated">Updated 12m ago</span>
              </div>

              {/* Notice 1 */}
              <div className="ep-notice-item">
                <span className="ep-notice-icon yellow">
                  <Icons.Bookmark />
                </span>
                <div className="ep-notice-content">
                  <div className="ep-notice-headline">
                    Spring Semester Final Examination schedules published
                  </div>
                  <div className="ep-notice-subtext">
                    Upper School departments 10-12 • Download registry PDF
                  </div>
                </div>
              </div>

              {/* Notice 2 */}
              <div className="ep-notice-item">
                <span className="ep-notice-icon blue">
                  <Icons.Users />
                </span>
                <div className="ep-notice-content">
                  <div className="ep-notice-headline">
                    Parent-Teacher Conferences booking open for Grade 9–12
                  </div>
                  <div className="ep-notice-subtext">
                    Select preferred academic advisory slots via portal dashboard
                  </div>
                </div>
              </div>

              {/* Notice 3 */}
              <div className="ep-notice-item">
                <span className="ep-notice-icon green">
                  <Icons.Flask />
                </span>
                <div className="ep-notice-content">
                  <div className="ep-notice-headline">
                    Upcoming STEM Fair registration deadline: Oct 28
                  </div>
                  <div className="ep-notice-subtext">
                    Faculty mentorship sessions available every weekday afternoon
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3-Grid */}
            <div className="ep-features-grid">
              <div className="ep-feature-card">
                <div className="ep-feature-icon-wrapper">
                  <Icons.Chart />
                </div>
                <div className="ep-feature-title">Real-time Gradebook</div>
                <div className="ep-feature-desc">
                  Official transcripts, weighted GPAs, and course progress tracking.
                </div>
              </div>

              <div className="ep-feature-card">
                <div className="ep-feature-icon-wrapper">
                  <Icons.Calendar />
                </div>
                <div className="ep-feature-title">Smart Schedules</div>
                <div className="ep-feature-desc">
                  Conflict-free timetables, rotation tracking, and instant alerts.
                </div>
              </div>

              <div className="ep-feature-card">
                <div className="ep-feature-icon-wrapper">
                  <Icons.Message />
                </div>
                <div className="ep-feature-title">Direct Messaging</div>
                <div className="ep-feature-desc">
                  Encrypted channels between professors, advisors, and families.
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Dean Quote Card */}
          <div className="ep-dean-card">
            <div className="ep-dean-avatar">
              <div className="ep-dean-avatar-fallback">
                <Icons.UserCircle />
              </div>
            </div>
            <div>
              <div className="ep-dean-quote-text">
                &ldquo;Precision in institutional governance fosters unbounded clarity in student scholarship.&rdquo;
              </div>
              <div className="ep-dean-quote-author">
                DR. ELEANOR VANCE — HEAD OF SCHOOL &amp; DEAN OF FACULTY
              </div>
            </div>
          </div>
        </div>

        {/* Right Auth Panel (Desktop Sign-In Form) */}
        <div className="ep-auth-panel">
          <div className="ep-auth-inner">
            {/* Header Brand Row */}
            <div className="ep-auth-brand-row">
              <div className="ep-brand-logo-group">
                <div className="ep-brand-icon-box">
                  <Icons.GraduationCap />
                </div>
                <div className="ep-brand-text-col">
                  <span className="ep-brand-name">EduPulse</span>
                  <span className="ep-brand-sub">SCHOOL MANAGEMENT</span>
                </div>
              </div>
              <span className="ep-portal-version-pill">PORTAL V4.8</span>
            </div>

            {/* Title & Subtitle */}
            <h2 className="ep-auth-title">Sign in to EduPulse Portal</h2>
            <p className="ep-auth-subtitle">
              Authenticate with your institutional credentials to access your campus dashboard.
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
              {/* Validation or Redux Error */}
              {(error || validationError) && (
                <div className="ep-alert-box">
                  <Icons.AlertCircle />
                  <span>{validationError || error}</span>
                </div>
              )}

              {/* Identifier Input */}
              <div className="ep-form-group">
                <div className="ep-label-row">
                  <label className="ep-form-label" htmlFor="desktop-identifier">
                    Master ID or Directory Email
                  </label>
                </div>
                <div className="ep-input-wrapper">
                  <span className="ep-input-prefix">
                    <Icons.IdBadge />
                  </span>
                  <input
                    id="desktop-identifier"
                    type="text"
                    className="ep-input-field"
                    placeholder="e.g. SA-ROOT-01 or sysadmin@edupulse.edu"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="ep-form-group">
                <div className="ep-label-row">
                  <label className="ep-form-label" htmlFor="desktop-password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="ep-forgot-link"
                    onClick={handleForgotPassword}
                  >
                    Forgot password or ID?
                  </button>
                </div>
                <div className="ep-input-wrapper">
                  <span className="ep-input-prefix">
                    <Icons.Lock />
                  </span>
                  <input
                    id="desktop-password"
                    type={showPassword ? 'text' : 'password'}
                    className="ep-input-field"
                    placeholder="Enter your confidential passphrase"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="ep-input-suffix-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="ep-btn-desktop-primary"
                disabled={loading}
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to School Portal'}</span>
                {!loading && <Icons.ArrowRight />}
              </button>
            </form>

            {/* SSO Divider */}
            <div className="ep-sso-divider">
              <span onClick={handleSSO}>OR CONTINUE WITH INSTITUTIONAL SSO</span>
            </div>

            {/* Register Row */}
            <div className="ep-register-row">
              <span>Don&apos;t have an account?</span>
              <Link to="/register">Register now</Link>
            </div>

            {/* Institutional Help Desk Box */}
            <div className="ep-helpdesk-card">
              <div className="ep-helpdesk-icon-box">
                <Icons.Headset />
              </div>
              <div>
                <div className="ep-helpdesk-title">INSTITUTIONAL HELP DESK</div>
                <div className="ep-helpdesk-text">
                  Need help logging in? Tel:{' '}
                  <a href="tel:+917845800644">(+91) 7845800644</a> •{' '}
                  <a href="mailto:algojaxon@gmail.com">algojaxon@gmail.com</a>
                </div>
              </div>
            </div>

            {/* Compliance Footer */}
            <div className="ep-compliance-footer">
              <div className="ep-compliance-item">
                <Icons.ShieldCheck />
                <span>256-Bit SSL Encrypted</span>
              </div>
              <div className="ep-compliance-item">
                <span className="ep-compliance-dot" />
                <span>FERPA &amp; COPPA Compliant</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MOBILE SCREEN LAYOUT - Visible on < 1024px
          ==================================================================== */}
      <div className="ep-mobile-view">
        <div className="ep-mobile-inner">
          {/* Top Mobile App Bar */}
          <div className="ep-mobile-appbar">
            <div className="ep-mobile-appbar-left">
              <div className="ep-brand-icon-box" style={{ width: 32, height: 32, fontSize: 18 }}>
                <Icons.GraduationCap />
              </div>
              <div className="ep-brand-text-col">
                <span className="ep-brand-name" style={{ fontSize: 15 }}>EduPulse</span>
                <span className="ep-brand-sub" style={{ fontSize: 8 }}>SCHOOL MANAGEMENT</span>
              </div>
            </div>

            <div className="ep-mobile-appbar-center">
              <span className="ep-mobile-appbar-title">EduPulse</span>
              <span className="ep-mobile-appbar-sub">PORTAL LOGIN</span>
            </div>

            <div className="ep-mobile-appbar-actions">
              <button
                type="button"
                className="ep-mobile-icon-btn"
                onClick={handleForgotPassword}
                aria-label="Help"
              >
                <Icons.HelpCircle />
              </button>
              <button
                type="button"
                className="ep-mobile-icon-btn dark"
                aria-label="User profile"
              >
                <Icons.UserCircle />
              </button>
            </div>
          </div>

          {/* Card 1: Welcome Back Card */}
          <div className="ep-mobile-welcome-card">
            <div className="ep-mobile-academic-pill">
              <Icons.Temple />
              <span>ACADEMIC YEAR 2024–2025</span>
            </div>

            <h2 className="ep-mobile-welcome-title">Welcome back!</h2>
            <p className="ep-mobile-welcome-sub">
              Sign in to access your academic records &amp; timetable
            </p>

            <div className="ep-mobile-cap-graphic">
              <Icons.GraduationCap />
            </div>
          </div>

          {/* Card 2: Main Login Form Card */}
          <div className="ep-mobile-form-card">
            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Validation or Redux Error */}
              {(error || validationError) && (
                <div className="ep-alert-box">
                  <Icons.AlertCircle />
                  <span>{validationError || error}</span>
                </div>
              )}

              {/* ID / Key Input */}
              <div className="ep-form-group">
                <div className="ep-label-row">
                  <label className="ep-form-label" htmlFor="mobile-identifier">
                    Institutional ID / Key
                  </label>
                  <span className="ep-input-hint-right">Official Identifier</span>
                </div>
                <div className="ep-mobile-input-box">
                  <span className="ep-input-prefix">
                    <Icons.IdBadge />
                  </span>
                  <input
                    id="mobile-identifier"
                    type="text"
                    className="ep-input-field"
                    placeholder="e.g. SA-88001 or sysadmin@edupulse.edu"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Security Password Input */}
              <div className="ep-form-group">
                <div className="ep-label-row">
                  <label className="ep-form-label" htmlFor="mobile-password">
                    Security Password
                  </label>
                  <button
                    type="button"
                    className="ep-forgot-link"
                    onClick={handleForgotPassword}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="ep-mobile-input-box">
                  <span className="ep-input-prefix">
                    <Icons.Lock />
                  </span>
                  <input
                    id="mobile-password"
                    type={showPassword ? 'text' : 'password'}
                    className="ep-input-field"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="ep-input-suffix-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                  </button>
                </div>
              </div>

              {/* Primary Mobile Button */}
              <button
                type="submit"
                className="ep-btn-mobile-primary"
                disabled={loading}
              >
                <span>{loading ? 'Signing In...' : 'Sign In to Portal'}</span>
                {!loading && <Icons.ArrowRight />}
              </button>
            </form>

            {/* Campus SSO Divider */}
            <div className="ep-sso-divider" style={{ margin: '18px 0 12px 0' }}>
              <span onClick={handleSSO}>CAMPUS SSO</span>
            </div>

            {/* Registration link */}
            <div className="ep-register-row" style={{ marginBottom: 0 }}>
              <span>Don&apos;t have an account?</span>
              <Link to="/register">Register now</Link>
            </div>
          </div>

          {/* Card 3: Academic Bulletin Card */}
          <div className="ep-bulletin-card">
            <div className="ep-bulletin-header">
              <div className="ep-bulletin-left">
                <div className="ep-bulletin-badge">
                  <Icons.Megaphone />
                </div>
                <span className="ep-bulletin-title">Academic Bulletin</span>
              </div>
              <span className="ep-bulletin-date">Today</span>
            </div>
            <p className="ep-bulletin-text">
              Term 2 Exam Schedules &amp; Official Report Cards have been released.
              Please report any portal authentication errors directly to IT Helpdesk.
            </p>
          </div>

          {/* Card 4: Registrar & Records Division Card */}
          <div className="ep-registrar-card">
            <div className="ep-registrar-title">REGISTRAR &amp; RECORDS DIVISION</div>
            <div className="ep-registrar-subtitle">
              Need an activation pass code or forgot your Student ID?
            </div>
            <div className="ep-registrar-contacts">
              <a href="mailto:algojaxon@gmail.com" className="ep-registrar-item">
                <Icons.Mail />
                <span>algojaxon@gmail.com</span>
              </a>
              <span className="ep-registrar-sep">•</span>
              <a href="tel:+917845800644" className="ep-registrar-item">
                <Icons.Phone />
                <span>(+91) 7845800644</span>
              </a>
            </div>
          </div>

          {/* Mobile Footer Security & Compliance */}
          <div className="ep-mobile-footer">
            <div className="ep-mobile-security-note">
              <Icons.ShieldCheck />
              <span>256-bit Institutional TLS Security</span>
            </div>
            <div className="ep-mobile-footer-links">
              <a href="#" onClick={(e) => { e.preventDefault(); handleForgotPassword(); }}>
                IT Help Desk
              </a>
              <span> • </span>
              <span>Authorized Scholars &amp; Faculty Only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
