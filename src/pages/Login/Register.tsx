import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Modal, message } from 'antd';
import { supabase } from '../../service/supabaseClient';
import './Register.css';

// Clean vector icons
const Icons = {
  BookMarked: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 2v20" />
    </svg>
  ),
  Key: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  Info: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  User: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Phone: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Mail: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  Lock: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
  ArrowLeft: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  Check: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
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

const Register: React.FC = () => {
  const history = useHistory();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields state
  const [organizationKey, setOrganizationKey] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Step 1: Verify Organization Key
  const handleKeyCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationKey.trim()) {
      setError('Please input your organization key.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('organizations')
        .select('id, status')
        .eq('organization_key', organizationKey.trim())
        .single();

      if (dbError || !data) {
        throw new Error('Invalid or non-existent organization key.');
      }
      if (data.status !== 'Active') {
        throw new Error('This organization is not currently active.');
      }

      setCurrentStep(1);
    } catch (err: any) {
      setError(err.message || 'Could not verify organization key.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Complete Admin Account Creation
  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!phone.trim() || phone.trim().length !== 10) {
      setError('Phone number must be exactly 10 digits.');
      return;
    }
    if (!email.trim()) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from('admin_data').insert({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password: password,
        organization_key: organizationKey.trim(),
        status: 'Inactive',
      });

      if (insertError) {
        if (insertError.message.includes('unique constraint')) {
          throw new Error('An administrator account with this email already exists.');
        }
        throw insertError;
      }

      message.success('Registration successful! Your account is pending activation by a superadmin.', 5);
      history.push('/login');
    } catch (err: any) {
      setError(err.message || 'Failed to complete registration.');
    } finally {
      setLoading(false);
    }
  };

  const goBackToKeyCheck = () => {
    setCurrentStep(0);
    setError(null);
  };

  const handleSupportFAQ = () => {
    Modal.info({
      title: 'Institutional Support & FAQ',
      content: (
        <div style={{ marginTop: 12, fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
          <p>
            For institution key generation, registration issues, or administrator provisioning assistance:
          </p>
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, marginTop: 10 }}>
            <div><strong>IT Help Desk Tel:</strong> (+91) 7845800644</div>
            <div style={{ marginTop: 4 }}><strong>Official Registry Email:</strong> algojaxon@gmail.com</div>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
            New organization onboarding keys are issued solely to authorized institutional directors and deans.
          </p>
        </div>
      ),
      okText: 'Close',
    });
  };

  const handleTerms = () => {
    Modal.info({
      title: 'Institutional Terms & Privacy Policy',
      content: (
        <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.6, color: '#334155' }}>
          <p>
            EduPulse School Management operates under strict academic privacy protocols compliant with <strong>FERPA</strong>, <strong>COPPA</strong>, and institutional security directives.
          </p>
          <p style={{ marginTop: 8 }}>
            All administrative credentials and pupil records are encrypted in transit and at rest using 256-bit TLS/SSL encryption.
          </p>
        </div>
      ),
      okText: 'Understood',
    });
  };

  return (
    <div className="ep-register-page">
      {/* Top Navigation Bar */}
      <header className="ep-reg-navbar">
        <Link to="/login" className="ep-reg-brand-group">
          <div className="ep-reg-brand-icon">
            <Icons.BookMarked />
          </div>
          <div className="ep-reg-brand-text">
            <span className="ep-reg-brand-name">EduPulse</span>
            <span className="ep-reg-brand-sub">SCHOOL MANAGEMENT PORTAL</span>
          </div>
        </Link>

        <div className="ep-reg-nav-right">
          <div className="ep-reg-session-pill">
            <span className="ep-reg-status-dot" />
            <span>Academic Session 2024–2025</span>
          </div>
          <button type="button" className="ep-reg-faq-link" onClick={handleSupportFAQ}>
            Support &amp; FAQ
          </button>
        </div>
      </header>

      {/* Main Center Content */}
      <main className="ep-reg-content-container">
        <div className="ep-reg-card">
          <div className="ep-reg-card-accent-bar" />

          <div className="ep-reg-card-body">
            <h1 className="ep-reg-title">Create Your Account</h1>
            <p className="ep-reg-subtitle">Join the verified EduPulse academic network</p>

            {/* Stepper Progress */}
            <div className="ep-reg-stepper">
              {/* Step 1 Indicator */}
              <div className="ep-reg-step-item">
                <div className={`ep-reg-step-number ${currentStep === 0 ? 'active' : 'completed'}`}>
                  {currentStep > 0 ? <Icons.Check /> : '1'}
                </div>
                <span className={`ep-reg-step-label ${currentStep === 0 ? 'active' : ''}`}>
                  Verify Key
                </span>
              </div>

              <div className="ep-reg-step-divider" />

              {/* Step 2 Indicator */}
              <div className="ep-reg-step-item">
                <div className={`ep-reg-step-number ${currentStep === 1 ? 'active' : 'inactive'}`}>
                  2
                </div>
                <span className={`ep-reg-step-label ${currentStep === 1 ? 'active' : ''}`}>
                  Register
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="ep-reg-alert">
                <Icons.AlertCircle />
                <span>{error}</span>
              </div>
            )}

            {/* STEP 1: Verify Key Form */}
            {currentStep === 0 && (
              <form onSubmit={handleKeyCheck}>
                <div className="ep-reg-form-group">
                  <label className="ep-reg-label" htmlFor="organization-key">
                    <span className="ep-reg-req-star">*</span> Organization Key
                  </label>
                  <div className="ep-reg-input-box">
                    <span className="ep-reg-input-prefix">
                      <Icons.Key />
                    </span>
                    <input
                      id="organization-key"
                      type="text"
                      className="ep-reg-input-field"
                      placeholder="EDU-HARV-8820"
                      value={organizationKey}
                      onChange={(e) => setOrganizationKey(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  <div className="ep-reg-hint-row">
                    <Icons.Info />
                    <span>Contact your institutional administrator if you do not have a key.</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="ep-reg-btn-primary"
                  disabled={loading}
                >
                  <span>{loading ? 'Verifying Key...' : 'Next'}</span>
                  {!loading && <Icons.ArrowRight />}
                </button>
              </form>
            )}

            {/* STEP 2: Registration Details Form */}
            {currentStep === 1 && (
              <form onSubmit={handleRegistration}>
                <button
                  type="button"
                  className="ep-reg-btn-back"
                  onClick={goBackToKeyCheck}
                >
                  <Icons.ArrowLeft />
                  <span>Back to Key Verification</span>
                </button>

                <div className="ep-reg-org-verified-tag">
                  <Icons.ShieldCheck />
                  <span>Verified Key: <strong>{organizationKey}</strong></span>
                </div>

                {/* Full Name */}
                <div className="ep-reg-form-group">
                  <label className="ep-reg-label" htmlFor="reg-fullname">
                    <span className="ep-reg-req-star">*</span> Full Name
                  </label>
                  <div className="ep-reg-input-box">
                    <span className="ep-reg-input-prefix">
                      <Icons.User />
                    </span>
                    <input
                      id="reg-fullname"
                      type="text"
                      className="ep-reg-input-field"
                      placeholder="e.g. Dr. Jane Smith"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="ep-reg-form-group">
                  <label className="ep-reg-label" htmlFor="reg-phone">
                    <span className="ep-reg-req-star">*</span> Phone Number (10 digits)
                  </label>
                  <div className="ep-reg-input-box">
                    <span className="ep-reg-input-prefix">
                      <Icons.Phone />
                    </span>
                    <input
                      id="reg-phone"
                      type="tel"
                      maxLength={10}
                      className="ep-reg-input-field"
                      placeholder="10-digit mobile number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="ep-reg-form-group">
                  <label className="ep-reg-label" htmlFor="reg-email">
                    <span className="ep-reg-req-star">*</span> Email Address
                  </label>
                  <div className="ep-reg-input-box">
                    <span className="ep-reg-input-prefix">
                      <Icons.Mail />
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      className="ep-reg-input-field"
                      placeholder="admin@institution.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="ep-reg-form-group">
                  <label className="ep-reg-label" htmlFor="reg-password">
                    <span className="ep-reg-req-star">*</span> Security Password (min 6 characters)
                  </label>
                  <div className="ep-reg-input-box">
                    <span className="ep-reg-input-prefix">
                      <Icons.Lock />
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      className="ep-reg-input-field"
                      placeholder="Create secure passphrase"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="ep-reg-input-suffix"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="ep-reg-btn-primary"
                  disabled={loading}
                >
                  <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
                  {!loading && <Icons.ArrowRight />}
                </button>
              </form>
            )}

            {/* Already have an account row */}
            <div className="ep-reg-login-row">
              <span>Already have an account?</span>
              <Link to="/login">Log in</Link>
            </div>

            {/* Card Security Footer */}
            <div className="ep-reg-security-footer">
              <span className="ep-reg-security-item">
                <Icons.ShieldCheck />
                <span>256-Bit SSL Encrypted</span>
              </span>
              <span className="ep-reg-security-sep">•</span>
              <span>FERPA Compliant</span>
              <span className="ep-reg-security-sep">•</span>
              <span>Identity Verified</span>
            </div>
          </div>
        </div>
      </main>

      {/* Page Bottom Footer */}
      <footer className="ep-reg-page-footer">
        <div>© 2025 EduPulse Academic Network. All rights reserved.</div>
        <div className="ep-reg-footer-links">
          <button type="button" onClick={handleTerms}>Privacy Policy</button>
          <button type="button" onClick={handleTerms}>Institutional Terms</button>
          <button type="button" onClick={handleSupportFAQ}>Contact Registrar</button>
        </div>
      </footer>
    </div>
  );
};

export default Register;
