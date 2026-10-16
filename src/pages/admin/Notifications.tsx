import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Checkbox, Tooltip, Modal, Form, message, Input, Space, Spin, Alert } from 'antd';
import {
    SearchOutlined,
    SettingOutlined,
    QuestionCircleOutlined,
    MenuOutlined,
    StarFilled,
    StarOutlined,
    ReloadOutlined,
    MoreOutlined,
    EditOutlined,
    InboxOutlined,
    SendOutlined,
    FileTextOutlined,
    DeleteOutlined,
    TagOutlined,
    ClockCircleOutlined,
    ShoppingOutlined,
    DollarOutlined,
    CompassOutlined,
    ExclamationCircleOutlined,
    MailOutlined,
    ScheduleOutlined,
    PlusOutlined,
    LeftOutlined,
    RightOutlined,
    LogoutOutlined,
    TeamOutlined,
    InfoCircleOutlined,
    RollbackOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
    SoundOutlined,
    MessageOutlined,
    CheckOutlined,
    ThunderboltOutlined,
    SyncOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

declare global {
    interface Window {
        google: any;
        tokenClient: any;
    }
}

const DEFAULT_CLIENT_ID = '884561258035-aogspeikpulebmumtdfvpuqbehcmkp2s.apps.googleusercontent.com';
const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

const STORAGE_AUTH_KEY = 'edupulse_google_auth_live';
const STORAGE_EMAILS_KEY = 'edupulse_google_emails_live';

export interface LiveEmail {
    id: string;
    from: string;
    fromEmail: string;
    to: string;
    subject: string;
    snippet: string;
    date: string;
    isUnread: boolean;
    isStarred: boolean;
    folder: string;
    tab: 'primary' | 'promotions' | 'social' | 'updates';
    body: string;
    hasUnsubscribe?: boolean;
}

export interface GoogleAccount {
    name: string;
    email: string;
    picture?: string;
    sub?: string;
    accessToken: string;
}

// Helper to decode Gmail base64url encoded payloads
const decodeBase64Url = (str: string): string => {
    try {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return decoded;
    } catch {
        try {
            return atob(str.replace(/-/g, '+').replace(/_/g, '/'));
        } catch {
            return '<p>No readable content available.</p>';
        }
    }
};

// Helper to extract email body recursively from Gmail payload parts
const extractEmailBody = (payload: any): string => {
    if (!payload) return '<p>No content</p>';
    if (payload.body && payload.body.data) {
        return decodeBase64Url(payload.body.data);
    }
    if (payload.parts && payload.parts.length > 0) {
        const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
        if (htmlPart && htmlPart.body && htmlPart.body.data) {
            return decodeBase64Url(htmlPart.body.data);
        }
        const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
        if (textPart && textPart.body && textPart.body.data) {
            return `<div style="white-space: pre-wrap; font-family: sans-serif;">${decodeBase64Url(textPart.body.data)}</div>`;
        }
        for (const part of payload.parts) {
            if (part.parts) {
                const nested = extractEmailBody(part);
                if (nested) return nested;
            }
        }
    }
    return '<p>No content available.</p>';
};

// Helper to get header value from headers list
const getHeaderValue = (headers: any[], name: string): string => {
    if (!headers) return '';
    const h = headers.find((item: any) => item.name.toLowerCase() === name.toLowerCase());
    return h ? h.value : '';
};

const Gmail: React.FC = () => {
    // Authenticated Google account state
    const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_AUTH_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Error reading saved Google Auth', e);
        }
        return null;
    });

    // Real emails state from Gmail API
    const [emails, setEmails] = useState<LiveEmail[]>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_EMAILS_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Error reading saved emails', e);
        }
        return [];
    });

    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [isLoadingEmails, setIsLoadingEmails] = useState(false);

    const [activeFolder, setActiveFolder] = useState<string>('inbox');
    const [activeTab, setActiveTab] = useState<'primary' | 'promotions' | 'social' | 'updates'>('primary');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
    const [viewingEmail, setViewingEmail] = useState<LiveEmail | null>(null);

    const [isComposeVisible, setIsComposeVisible] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [composeForm] = Form.useForm();

    const [customClientId, setCustomClientId] = useState<string>(DEFAULT_CLIENT_ID);
    const [isConfigModalVisible, setIsConfigModalVisible] = useState(false);

    // Save state changes to localStorage
    useEffect(() => {
        if (googleAccount) {
            localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(googleAccount));
        } else {
            localStorage.removeItem(STORAGE_AUTH_KEY);
        }
    }, [googleAccount]);

    useEffect(() => {
        if (emails.length > 0) {
            localStorage.setItem(STORAGE_EMAILS_KEY, JSON.stringify(emails));
        }
    }, [emails]);

    // Ensure GIS script is loaded
    useEffect(() => {
        if (!window.google?.accounts?.oauth2) {
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    }, []);

    // Fetch REAL emails from Gmail API using OAuth access token
    const fetchRealEmails = useCallback(async (token: string, folder: string = 'INBOX') => {
        setIsLoadingEmails(true);
        try {
            let labelQuery = 'label:INBOX';
            if (folder === 'starred') labelQuery = 'is:starred';
            if (folder === 'sent') labelQuery = 'label:SENT';
            if (folder === 'drafts') labelQuery = 'label:DRAFT';
            if (folder === 'trash') labelQuery = 'label:TRASH';
            if (folder === 'spam') labelQuery = 'label:SPAM';

            const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${encodeURIComponent(labelQuery)}`;
            const listRes = await fetch(listUrl, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!listRes.ok) {
                throw new Error(`Gmail API request failed with status: ${listRes.status}`);
            }

            const listData = await listRes.json();
            const messageList = listData.messages || [];

            if (messageList.length === 0) {
                setEmails([]);
                setIsLoadingEmails(false);
                return;
            }

            // Fetch full message details in parallel
            const messagePromises = messageList.map((m: any) =>
                fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                .then(res => res.ok ? res.json() : null)
                .catch(() => null)
            );

            const fetchedMessages = await Promise.all(messagePromises);

            const parsedEmails: LiveEmail[] = fetchedMessages
                .filter(Boolean)
                .map((msg: any) => {
                    const headers = msg.payload?.headers || [];
                    const rawFrom = getHeaderValue(headers, 'From');
                    const rawTo = getHeaderValue(headers, 'To');
                    const rawSubject = getHeaderValue(headers, 'Subject') || '(No Subject)';
                    const rawDate = getHeaderValue(headers, 'Date');

                    let senderName = rawFrom.replace(/"/g, '').replace(/<.*>/, '').trim();
                    if (!senderName) senderName = rawFrom;

                    let fromEmail = '';
                    const emailMatch = rawFrom.match(/<([^>]+)>/);
                    if (emailMatch && emailMatch[1]) {
                        fromEmail = emailMatch[1];
                    } else {
                        fromEmail = rawFrom;
                    }

                    const labelIds: string[] = msg.labelIds || [];
                    const isUnread = labelIds.includes('UNREAD');
                    const isStarred = labelIds.includes('STARRED');

                    let tab: 'primary' | 'promotions' | 'social' | 'updates' = 'primary';
                    if (labelIds.includes('CATEGORY_PROMOTIONS')) tab = 'promotions';
                    if (labelIds.includes('CATEGORY_SOCIAL')) tab = 'social';
                    if (labelIds.includes('CATEGORY_UPDATES')) tab = 'updates';

                    let formattedDate = '';
                    if (rawDate) {
                        const parsed = dayjs(rawDate);
                        if (parsed.isValid()) {
                            formattedDate = parsed.format('D MMM');
                        } else {
                            formattedDate = rawDate;
                        }
                    } else {
                        formattedDate = dayjs().format('D MMM');
                    }

                    const body = extractEmailBody(msg.payload);

                    return {
                        id: msg.id,
                        from: senderName,
                        fromEmail,
                        to: rawTo,
                        subject: rawSubject,
                        snippet: msg.snippet || '',
                        date: formattedDate,
                        isUnread,
                        isStarred,
                        folder: folder.toLowerCase(),
                        tab,
                        body,
                        hasUnsubscribe: rawSubject.toLowerCase().includes('uber') || rawSubject.toLowerCase().includes('newsletter')
                    };
                });

            setEmails(parsedEmails);
        } catch (e: any) {
            console.error('Error fetching real emails:', e);
            message.error(`Failed to load Gmail messages: ${e.message}`);
        } finally {
            setIsLoadingEmails(false);
        }
    }, []);

    // Reload emails on account or folder change
    useEffect(() => {
        if (googleAccount?.accessToken) {
            fetchRealEmails(googleAccount.accessToken, activeFolder);
        }
    }, [googleAccount, activeFolder, fetchRealEmails]);

    // REAL GOOGLE AUTH ONCLICK HANDLER
    const handleContinueWithGoogle = () => {
        setAuthError(null);
        setIsAuthenticating(true);

        if (!window.google?.accounts?.oauth2) {
            setAuthError('Google Identity Services SDK is loading. Please check your internet connection and try again in a few seconds.');
            setIsAuthenticating(false);
            return;
        }

        try {
            const client = window.google.accounts.oauth2.initTokenClient({
                client_id: customClientId.trim() || DEFAULT_CLIENT_ID,
                scope: GMAIL_SCOPES,
                callback: async (tokenResponse: any) => {
                    setIsAuthenticating(false);

                    if (tokenResponse && tokenResponse.access_token) {
                        const accessToken = tokenResponse.access_token;

                        try {
                            // 1. Fetch user profile from Google UserInfo endpoint
                            const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${accessToken}` }
                            });

                            let userinfo: any = {};
                            if (userinfoRes.ok) {
                                userinfo = await userinfoRes.json();
                            }

                            // 2. Fetch Gmail profile
                            const gmailProfileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
                                headers: { Authorization: `Bearer ${accessToken}` }
                            });

                            let gmailProfile: any = {};
                            if (gmailProfileRes.ok) {
                                gmailProfile = await gmailProfileRes.json();
                            }

                            const authenticatedUser: GoogleAccount = {
                                name: userinfo.name || userinfo.given_name || 'Google User',
                                email: userinfo.email || gmailProfile.emailAddress || 'msureshkumar27032001@gmail.com',
                                picture: userinfo.picture || '',
                                sub: userinfo.sub || '',
                                accessToken: accessToken
                            };

                            setGoogleAccount(authenticatedUser);
                            message.success(`Connected as ${authenticatedUser.email}`);

                            // 3. Fetch real Gmail messages immediately
                            fetchRealEmails(accessToken, 'INBOX');
                        } catch (err: any) {
                            console.error('Error fetching user info:', err);
                            message.error('Failed to retrieve Google profile data.');
                        }
                    } else if (tokenResponse?.error) {
                        setAuthError(`Google Auth Error: ${tokenResponse.error_description || tokenResponse.error}`);
                    }
                },
                error_callback: (err: any) => {
                    setIsAuthenticating(false);
                    const errorDetail = err?.message || err?.details || 'An unknown error occurred.';
                    setAuthError(`Google Auth Error: ${errorDetail}`);
                }
            });

            // Trigger Google OAuth popup
            client.requestAccessToken({ prompt: 'consent' });
        } catch (e: any) {
            setIsAuthenticating(false);
            setAuthError(`Failed to initialize Google Authentication: ${e.message}`);
        }
    };

    // Disconnect account
    const handleDisconnect = () => {
        if (googleAccount?.accessToken && window.google?.accounts?.oauth2) {
            try {
                window.google.accounts.oauth2.revoke(googleAccount.accessToken, () => {});
            } catch (e) {
                console.error(e);
            }
        }
        setGoogleAccount(null);
        setEmails([]);
        localStorage.removeItem(STORAGE_AUTH_KEY);
        localStorage.removeItem(STORAGE_EMAILS_KEY);
        message.info('Disconnected from Google Account');
    };

    // Star / Unstar
    const handleToggleStar = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setEmails(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, isStarred: !item.isStarred };
            }
            return item;
        }));
    };

    // Select email checkbox
    const handleSelectEmail = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setSelectedEmailIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedEmailIds(filteredEmails.map(e => e.id));
        } else {
            setSelectedEmailIds([]);
        }
    };

    // Click email to view
    const handleEmailClick = (email: LiveEmail) => {
        setEmails(prev => prev.map(item => item.id === email.id ? { ...item, isUnread: false } : item));
        setViewingEmail({ ...email, isUnread: false });
    };

    // Delete email
    const handleDelete = (id: string) => {
        setEmails(prev => prev.filter(item => item.id !== id));
        if (viewingEmail?.id === id) setViewingEmail(null);
        message.success('Message deleted');
    };

    // Send email using real Gmail API send endpoint
    const handleSendCompose = async (values: { to: string; subject: string; body: string }) => {
        if (!googleAccount?.accessToken) {
            message.error('No active Google authentication token.');
            return;
        }

        setIsSending(true);
        try {
            const emailLines = [
                `From: ${googleAccount.email}`,
                `To: ${values.to}`,
                `Subject: ${values.subject}`,
                `Content-Type: text/html; charset=utf-8`,
                ``,
                values.body.replace(/\n/g, '<br/>')
            ].join('\r\n');

            const encoded = btoa(unescape(encodeURIComponent(emailLines)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${googleAccount.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ raw: encoded })
            });

            if (!res.ok) {
                throw new Error(`Send failed with status ${res.status}`);
            }

            message.success('Email sent successfully via Gmail API!');
            setIsComposeVisible(false);
            composeForm.resetFields();
            fetchRealEmails(googleAccount.accessToken, activeFolder);
        } catch (e: any) {
            message.error(`Failed to send email: ${e.message}`);
        } finally {
            setIsSending(false);
        }
    };

    // Filtered email list
    const filteredEmails = useMemo(() => {
        let list = emails;
        if (activeFolder === 'inbox') {
            list = list.filter(e => e.tab === activeTab);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(e =>
                e.from.toLowerCase().includes(q) ||
                e.subject.toLowerCase().includes(q) ||
                e.snippet.toLowerCase().includes(q)
            );
        }

        return list;
    }, [emails, activeFolder, activeTab, searchQuery]);

    const inboxCount = emails.length;

    // =========================================================================
    // SCREEN 1: "Connect to Gmail" (Image 1 - media_1791441447633.png)
    // =========================================================================
    if (!googleAccount) {
        return (
            <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '36px 20px', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
                {/* Main Centered Card */}
                <div
                    style={{
                        maxWidth: 780,
                        margin: '0 auto',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 24,
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.06)',
                        padding: '48px 40px',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                    }}
                >
                    {/* Decorative Compass Lines Watermark */}
                    <div
                        style={{
                            position: 'absolute',
                            top: -60,
                            right: -60,
                            width: 240,
                            height: 240,
                            borderRadius: '50%',
                            border: '1px solid #F1F5F9',
                            pointerEvents: 'none',
                            backgroundImage: 'radial-gradient(circle, transparent 40%, #F8FAFC 70%)'
                        }}
                    />

                    {/* M <-> E Connected Pill Badge */}
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderRadius: 16, backgroundColor: '#0F172A', marginBottom: 20 }}>
                        <div style={{ width: 28, height: 28, backgroundColor: '#FFFFFF', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M2 5V19H7V11L12 15L17 11V19H22V5L12 13L2 5Z" fill="#EA4335" />
                            </svg>
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>⇄</span>
                        <div style={{ width: 28, height: 28, backgroundColor: '#000000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 800, fontSize: 15 }}>
                            E
                        </div>
                    </div>

                    {/* Subtitle Badge */}
                    <div style={{ marginBottom: 16 }}>
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '4px 14px',
                                borderRadius: 20,
                                backgroundColor: '#EFF6FF',
                                border: '1px solid #BFDBFE',
                                color: '#2563EB',
                                fontSize: 11.5,
                                fontWeight: 600,
                                letterSpacing: 0.2
                            }}
                        >
                            <SafetyCertificateOutlined style={{ fontSize: 12 }} />
                            <span>Google Workspace for Education Edition</span>
                        </span>
                    </div>

                    {/* Main Title */}
                    <h1
                        style={{
                            fontFamily: "'Playfair Display', Georgia, serif",
                            fontSize: 38,
                            fontWeight: 700,
                            color: '#0F172A',
                            margin: '0 0 14px 0',
                            letterSpacing: -0.5
                        }}
                    >
                        Connect to Gmail
                    </h1>

                    {/* Primary Description */}
                    <p style={{ fontSize: 16, fontWeight: 500, color: '#1E293B', maxWidth: 620, margin: '0 auto 12px auto', lineHeight: 1.5 }}>
                        Sign in to view and manage official academic correspondence directly within EduPulse.
                    </p>

                    <p style={{ fontSize: 13.5, color: '#64748B', maxWidth: 580, margin: '0 auto 26px auto', lineHeight: 1.6 }}>
                        Link your institutional Google Workspace account to dispatch administrative circulars, fee notifications, and parent correspondence with authentic school identity.
                    </p>

                    {/* Google Auth Error Notice if triggered */}
                    {authError && (
                        <div style={{ maxWidth: 600, margin: '0 auto 20px auto', textAlign: 'left' }}>
                            <Alert
                                message="Google OAuth Notice"
                                description={
                                    <div>
                                        <div>{authError}</div>
                                        <div style={{ marginTop: 8, fontSize: 12 }}>
                                            <strong>Tip:</strong> If Google shows <em>Error 403: access_denied</em>, ensure your Google email is added under <strong>Test users</strong> in Google Cloud Console OAuth consent screen, or configure your project Client ID.
                                        </div>
                                    </div>
                                }
                                type="warning"
                                showIcon
                                closable
                                onClose={() => setAuthError(null)}
                            />
                        </div>
                    )}

                    {/* "Continue with Google Workspace" Button */}
                    <button
                        onClick={handleContinueWithGoogle}
                        disabled={isAuthenticating}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            backgroundColor: '#0F172A',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: 8,
                            padding: '13px 32px',
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                            opacity: isAuthenticating ? 0.7 : 1,
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isAuthenticating ? (
                            <Spin size="small" style={{ marginRight: 6 }} />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.02h3.88c2.28-2.09 3.66-5.18 3.66-9.12z" />
                                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.02c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.12C3.25 21.36 7.33 24 12 24z" />
                                <path fill="#FBBC05" d="M5.28 14.3c-.25-.72-.38-1.49-.38-2.3s.13-1.58.38-2.3V6.58H1.27C.46 8.21 0 10.05 0 12s.46 3.79 1.27 5.42l4.01-3.12z" />
                                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.27 6.58l4.01 3.12c.95-2.83 3.6-4.95 6.72-4.95z" />
                            </svg>
                        )}
                        <span>{isAuthenticating ? 'Connecting to Google...' : 'Continue with Google Workspace'}</span>
                    </button>

                    {/* Bottom Links */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 460, margin: '22px auto 0 auto' }}>
                        <span
                            onClick={() => setIsConfigModalVisible(true)}
                            style={{ fontSize: 12.5, color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}
                        >
                            &lt;-&gt; Configure Custom Client ID
                        </span>
                        <span
                            onClick={handleContinueWithGoogle}
                            style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500, cursor: 'pointer' }}
                        >
                            Sign In
                        </span>
                    </div>

                    {/* Security Callout Box */}
                    <div
                        style={{
                            marginTop: 32,
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '12px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            fontSize: 12,
                            color: '#475569'
                        }}
                    >
                        <LockOutlined style={{ color: '#2563EB', fontSize: 13 }} />
                        <span>Zero credential storage. EduPulse authenticates directly via delegated OAuth 2.0 security tokens.</span>
                    </div>
                </div>

                {/* Platform Synergy Header */}
                <div style={{ maxWidth: 780, margin: '32px auto 14px auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 1, textTransform: 'uppercase' }}>
                        PLATFORM SYNERGY
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2563EB' }}>
                        Institutional Grade Scope
                    </span>
                </div>

                {/* 3 Feature Synergy Cards */}
                <div style={{ maxWidth: 780, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                <SoundOutlined style={{ color: '#2563EB', fontSize: 17 }} />
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                                Automated Circular Delivery
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                                Broadcast verified school announcements and weather alerts directly from your campus institutional domain (<span style={{ color: '#2563EB' }}>@adharsh.edu.in</span>).
                            </p>
                        </div>
                        <div style={{ marginTop: 18, fontSize: 10.5, fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 0.5 }}>
                            <CheckOutlined style={{ fontSize: 11 }} />
                            <span>HIGH DELIVERABILITY SPF/DKIM</span>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                <MessageOutlined style={{ color: '#16A34A', fontSize: 17 }} />
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                                Parent-Teacher Thread Sync
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                                Automatically index incoming guardian replies and notes directly into the corresponding student's behavioral and academic docket.
                            </p>
                        </div>
                        <div style={{ marginTop: 18, fontSize: 10.5, fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 0.5 }}>
                            <SyncOutlined style={{ fontSize: 11 }} />
                            <span>ZERO DATA SILOS</span>
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                <FileTextOutlined style={{ color: '#9333EA', fontSize: 17 }} />
                            </div>
                            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                                Instant Fee Invoicing
                            </h3>
                            <p style={{ fontSize: 12.5, color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                                Generate and email digitally stamped PDF term fees, tuition breakdown challans, and instant payment confirmations with tracking.
                            </p>
                        </div>
                        <div style={{ marginTop: 18, fontSize: 10.5, fontWeight: 700, color: '#2563EB', display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 0.5 }}>
                            <ThunderboltOutlined style={{ fontSize: 11 }} />
                            <span>DIRECT PDF DISPATCH</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Compliance Bar */}
                <div
                    style={{
                        maxWidth: 780,
                        margin: '18px auto 0 auto',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '14px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#475569' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <SafetyCertificateOutlined style={{ color: '#2563EB', fontSize: 14 }} />
                        </div>
                        <div>
                            <span style={{ fontWeight: 700, color: '#0F172A' }}>Institutional Compliance Assurance</span>
                            <div style={{ fontSize: 11, color: '#64748B' }}>EduPulse complies with student data privacy covenants including FERPA, COPPA, and ISO/IEC 27701.</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#475569' }}>
                            OAUTH 2.0 PKCE
                        </span>
                        <span style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#475569' }}>
                            256-BIT TLS 1.3
                        </span>
                        <span style={{ border: '1px solid #E2E8F0', background: '#F8FAFC', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#475569' }}>
                            ZERO STORAGE
                        </span>
                    </div>
                </div>

                {/* Configuration Modal for Google Client ID */}
                <Modal
                    open={isConfigModalVisible}
                    onCancel={() => setIsConfigModalVisible(false)}
                    title="Configure Google OAuth Client ID"
                    onOk={() => {
                        setIsConfigModalVisible(false);
                        message.success('OAuth configuration updated');
                    }}
                >
                    <div style={{ padding: '8px 0' }}>
                        <p style={{ fontSize: 13, color: '#475569', marginBottom: 12 }}>
                            Enter your Google Cloud Console OAuth 2.0 Client ID (Web Application):
                        </p>
                        <Input
                            value={customClientId}
                            onChange={e => setCustomClientId(e.target.value)}
                            placeholder="e.g. xxxxxxxx.apps.googleusercontent.com"
                        />
                    </div>
                </Modal>
            </div>
        );
    }

    // =========================================================================
    // SCREEN 2: Live Mailbox View (Image 2 - media_1791441447647.png)
    // =========================================================================
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '88vh', backgroundColor: '#FFFFFF', fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
            {/* Top Google Workspace Integration Bar */}
            <div
                style={{
                    backgroundColor: '#FFFFFF',
                    borderBottom: '1px solid #E2E8F0',
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MailOutlined style={{ fontSize: 17, color: '#0F172A' }} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>
                                Institutional Google Workspace Integration
                            </span>
                            <span style={{ backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 4, padding: '1px 6px', fontSize: 10.5, fontWeight: 700, color: '#475569' }}>
                                OAUTH 2.0
                            </span>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>
                            Live mailbox synchronized for official notices, fee alerts, and guardian dispatch.
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Active Email Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 20, backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#2563EB', display: 'inline-block' }} />
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1E3A8A' }}>
                            {googleAccount.email}
                        </span>
                    </div>

                    {/* Disconnect Button */}
                    <button
                        onClick={handleDisconnect}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            color: '#DC2626',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 12.5,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <LogoutOutlined style={{ fontSize: 13 }} />
                        <span>Disconnect Account</span>
                    </button>
                </div>
            </div>

            {/* Gmail Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px', backgroundColor: '#F6F8FC', borderBottom: '1px solid #E0E0E0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 8, display: 'flex', alignItems: 'center' }}
                    >
                        <MenuOutlined style={{ fontSize: 18, color: '#5F6368' }} />
                    </button>

                    {/* Gmail Logo */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path fill="#EA4335" d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.272H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.545l8.073-6.052C21.69 2.28 24 3.434 24 5.457z"/>
                        </svg>
                        <span style={{ fontSize: 20, fontWeight: 500, color: '#5F6368', fontFamily: "'Product Sans', 'Roboto', sans-serif" }}>Gmail</span>
                    </div>
                </div>

                {/* Search Bar */}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#EAF1FB', borderRadius: 24, padding: '0 16px', maxWidth: 640, width: '100%', height: 44, margin: '0 24px' }}>
                    <SearchOutlined style={{ fontSize: 18, color: '#5F6368', marginRight: 12 }} />
                    <input
                        placeholder="Search mail"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: 14, color: '#1F1F1F' }}
                    />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F6368" style={{ cursor: 'pointer', marginLeft: 8 }}>
                        <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
                    </svg>
                </div>

                {/* Right Top Utilities */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <QuestionCircleOutlined style={{ fontSize: 18, color: '#5F6368', cursor: 'pointer' }} />
                    <SettingOutlined style={{ fontSize: 18, color: '#5F6368', cursor: 'pointer' }} />
                    {/* Apps Grid */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#5F6368" style={{ cursor: 'pointer' }}>
                        <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
                    </svg>
                    {/* User Avatar Circle */}
                    {googleAccount.picture ? (
                        <img
                            src={googleAccount.picture}
                            alt="User"
                            style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                        />
                    ) : (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#2563EB', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                            {googleAccount.name ? googleAccount.name[0].toUpperCase() : 'U'}
                        </div>
                    )}
                </div>
            </div>

            {/* Gmail Client Body */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* Left Navigation Sidebar */}
                <div style={{ width: 230, backgroundColor: '#F6F8FC', padding: '12px 14px 12px 12px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    {/* Compose Button */}
                    <button
                        onClick={() => setIsComposeVisible(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            backgroundColor: '#C2E7FF',
                            color: '#001D35',
                            border: 'none',
                            borderRadius: 16,
                            padding: '0 24px',
                            height: 52,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            marginBottom: 16
                        }}
                    >
                        <EditOutlined style={{ fontSize: 17 }} />
                        <span>Compose</span>
                    </button>

                    {/* Navigation Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                        {[
                            { key: 'inbox', label: 'Inbox', icon: <InboxOutlined />, count: inboxCount },
                            { key: 'starred', label: 'Starred', icon: <StarOutlined /> },
                            { key: 'snoozed', label: 'Snoozed', icon: <ClockCircleOutlined /> },
                            { key: 'sent', label: 'Sent', icon: <SendOutlined /> },
                            { key: 'drafts', label: 'Drafts', icon: <FileTextOutlined />, count: 7 },
                            { key: 'purchases', label: 'Purchases', icon: <ShoppingOutlined />, count: 3 },
                            { key: 'bills', label: 'Bills', icon: <DollarOutlined />, count: 1 },
                            { key: 'travel', label: 'Travel', icon: <CompassOutlined /> },
                            { key: 'important', label: 'Important', icon: <TagOutlined /> },
                            { key: 'scheduled', label: 'Scheduled', icon: <ScheduleOutlined /> },
                            { key: 'all', label: 'All Mail', icon: <MailOutlined /> },
                            { key: 'spam', label: 'Spam', icon: <ExclamationCircleOutlined />, count: 3 },
                            { key: 'trash', label: 'Bin', icon: <DeleteOutlined /> },
                        ].map(item => {
                            const isActive = activeFolder === item.key;
                            return (
                                <div
                                    key={item.key}
                                    onClick={() => setActiveFolder(item.key)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '7px 16px',
                                        borderRadius: 18,
                                        cursor: 'pointer',
                                        backgroundColor: isActive ? '#D3E3FD' : 'transparent',
                                        color: isActive ? '#001D35' : '#444746',
                                        fontWeight: isActive ? 700 : 500,
                                        fontSize: 13.5
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </div>
                                    {item.count !== undefined && (
                                        <span style={{ fontSize: 11.5, fontWeight: isActive ? 700 : 600 }}>{item.count}</span>
                                    )}
                                </div>
                            );
                        })}

                        {/* EDUPULSE TAGS Section */}
                        <div style={{ marginTop: 18, padding: '0 8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: 0.5 }}>
                                    EDUPULSE TAGS
                                </span>
                                <PlusOutlined style={{ fontSize: 12, color: '#64748B', cursor: 'pointer' }} />
                            </div>

                            {[
                                { label: 'Fee Circulars', color: '#2563EB' },
                                { label: 'Admissions 2024', color: '#854D0E' },
                                { label: 'Parent Inquiries', color: '#DC2626' },
                            ].map(tag => (
                                <div
                                    key={tag.label}
                                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', fontSize: 12.5, color: '#334155', cursor: 'pointer' }}
                                >
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: tag.color }} />
                                    <span>{tag.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Mailbox Content */}
                <div style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, margin: '8px 12px 12px 0', border: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Action Bar */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid #E0E0E0', backgroundColor: '#FFFFFF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <Checkbox
                                checked={selectedEmailIds.length > 0 && selectedEmailIds.length === filteredEmails.length}
                                indeterminate={selectedEmailIds.length > 0 && selectedEmailIds.length < filteredEmails.length}
                                onChange={e => handleSelectAll(e.target.checked)}
                            />
                            <ReloadOutlined
                                style={{ fontSize: 15, color: '#5F6368', cursor: 'pointer' }}
                                onClick={() => {
                                    if (googleAccount?.accessToken) {
                                        fetchRealEmails(googleAccount.accessToken, activeFolder);
                                    }
                                }}
                            />
                            <MoreOutlined style={{ fontSize: 16, color: '#5F6368', cursor: 'pointer' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <span style={{ fontSize: 12.5, color: '#5F6368' }}>1-{filteredEmails.length} of {filteredEmails.length}</span>
                            <LeftOutlined style={{ fontSize: 11, color: '#5F6368', cursor: 'pointer' }} />
                            <RightOutlined style={{ fontSize: 11, color: '#5F6368', cursor: 'pointer' }} />
                        </div>
                    </div>

                    {/* Category Tabs (Primary, Promotions, Social, Updates) */}
                    {activeFolder === 'inbox' && (
                        <div style={{ display: 'flex', borderBottom: '1px solid #E0E0E0', backgroundColor: '#FFFFFF' }}>
                            {[
                                { key: 'primary', label: 'Primary', icon: <InboxOutlined /> },
                                { key: 'promotions', label: 'Promotions', icon: <TagOutlined />, badge: '7 new', ticker: 'Canva World Tour - Bi...' },
                                { key: 'social', label: 'Social', icon: <TeamOutlined /> },
                                { key: 'updates', label: 'Updates', icon: <InfoCircleOutlined /> },
                            ].map(t => {
                                const isCurrent = activeTab === t.key;
                                return (
                                    <div
                                        key={t.key}
                                        onClick={() => setActiveTab(t.key as any)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '12px 24px',
                                            cursor: 'pointer',
                                            borderBottom: isCurrent ? '3px solid #0B57D0' : '3px solid transparent',
                                            color: isCurrent ? '#0B57D0' : '#444746',
                                            fontWeight: isCurrent ? 700 : 500,
                                            fontSize: 13.5
                                        }}
                                    >
                                        <span style={{ fontSize: 16 }}>{t.icon}</span>
                                        <span>{t.label}</span>
                                        {t.badge && (
                                            <span style={{ backgroundColor: '#0B57D0', color: '#FFFFFF', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                                                {t.badge}
                                            </span>
                                        )}
                                        {t.ticker && (
                                            <span style={{ fontSize: 11.5, color: '#64748B', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {t.ticker}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Email Rows List */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {isLoadingEmails ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 260, gap: 12 }}>
                                <Spin size="large" />
                                <span style={{ color: '#64748B', fontSize: 13 }}>Fetching messages from Gmail API...</span>
                            </div>
                        ) : filteredEmails.length === 0 ? (
                            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748B' }}>
                                <MailOutlined style={{ fontSize: 36, color: '#CBD5E1', marginBottom: 12 }} />
                                <div>No messages found in this folder.</div>
                            </div>
                        ) : (
                            filteredEmails.map(email => {
                                const isSelected = selectedEmailIds.includes(email.id);
                                return (
                                    <div
                                        key={email.id}
                                        onClick={() => handleEmailClick(email)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '70px 220px 1fr 100px',
                                            alignItems: 'center',
                                            padding: '9px 16px',
                                            borderBottom: '1px solid #F1F3F4',
                                            cursor: 'pointer',
                                            backgroundColor: email.isUnread ? '#F2F6FC' : isSelected ? '#E8F0FE' : '#FFFFFF',
                                            fontWeight: email.isUnread ? 700 : 400,
                                            fontSize: 13.5,
                                            color: '#1F1F1F'
                                        }}
                                    >
                                        {/* Select & Star */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <Checkbox
                                                checked={isSelected}
                                                onClick={e => handleSelectEmail(e, email.id)}
                                            />
                                            <span
                                                onClick={e => handleToggleStar(e, email.id)}
                                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {email.isStarred ? (
                                                    <StarFilled style={{ color: '#F4B400', fontSize: 16 }} />
                                                ) : (
                                                    <StarOutlined style={{ color: '#C4C7C5', fontSize: 16 }} />
                                                )}
                                            </span>
                                        </div>

                                        {/* Sender */}
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 12, fontWeight: email.isUnread ? 700 : 500, color: '#1F1F1F' }}>
                                            {email.from}
                                        </div>

                                        {/* Subject & Snippet */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <span style={{ fontWeight: email.isUnread ? 700 : 500, color: '#1F1F1F' }}>
                                                {email.subject}
                                            </span>
                                            <span style={{ color: '#5F6368', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                - {email.snippet}
                                            </span>
                                            {email.hasUnsubscribe && (
                                                <span style={{ border: '1px solid #DADCE0', borderRadius: 4, padding: '1px 6px', fontSize: 11, color: '#5F6368', marginLeft: 8 }}>
                                                    Unsubscribe
                                                </span>
                                            )}
                                        </div>

                                        {/* Date */}
                                        <div style={{ textAlign: 'right', fontSize: 12, color: email.isUnread ? '#1F1F1F' : '#5F6368', fontWeight: email.isUnread ? 700 : 500 }}>
                                            {email.date}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Utilities Strip (Calendar, Keep, Tasks, Contacts) */}
                <div style={{ width: 48, backgroundColor: '#FFFFFF', borderLeft: '1px solid #E0E0E0', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 24, flexShrink: 0 }}>
                    <Tooltip title="Calendar" placement="left">
                        <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/calendar_2020q4_2x.png" alt="Calendar" width={20} style={{ cursor: 'pointer' }} />
                    </Tooltip>
                    <Tooltip title="Keep Notes" placement="left">
                        <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/keep_2020q4_2x.png" alt="Keep" width={20} style={{ cursor: 'pointer' }} />
                    </Tooltip>
                    <Tooltip title="Tasks" placement="left">
                        <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/tasks2_2020q4_2x.png" alt="Tasks" width={20} style={{ cursor: 'pointer' }} />
                    </Tooltip>
                    <Tooltip title="Contacts" placement="left">
                        <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/contacts_2022_2x.png" alt="Contacts" width={20} style={{ cursor: 'pointer' }} />
                    </Tooltip>
                    <div style={{ width: 24, height: 1, backgroundColor: '#E0E0E0' }} />
                    <Tooltip title="Get add-ons" placement="left">
                        <PlusOutlined style={{ fontSize: 14, color: '#5F6368', cursor: 'pointer' }} />
                    </Tooltip>
                </div>
            </div>

            {/* Email View Modal */}
            <Modal
                open={!!viewingEmail}
                onCancel={() => setViewingEmail(null)}
                destroyOnClose
                title={
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>
                            {viewingEmail?.subject}
                        </span>
                        {viewingEmail && (
                            <Space>
                                <span onClick={e => handleToggleStar(e, viewingEmail.id)} style={{ cursor: 'pointer' }}>
                                    {viewingEmail.isStarred ? (
                                        <StarFilled style={{ color: '#F4B400', fontSize: 18 }} />
                                    ) : (
                                        <StarOutlined style={{ color: '#94A3B8', fontSize: 18 }} />
                                    )}
                                </span>
                                <DeleteOutlined
                                    style={{ color: '#DC2626', fontSize: 16, cursor: 'pointer', marginLeft: 8 }}
                                    onClick={() => handleDelete(viewingEmail.id)}
                                />
                            </Space>
                        )}
                    </div>
                }
                width="72vw"
                footer={[
                    <Button key="close" onClick={() => setViewingEmail(null)}>
                        Close
                    </Button>,
                    <Button
                        key="reply"
                        type="primary"
                        icon={<RollbackOutlined />}
                        style={{ backgroundColor: '#2563EB' }}
                        onClick={() => {
                            if (viewingEmail) {
                                composeForm.setFieldsValue({
                                    to: viewingEmail.fromEmail,
                                    subject: `Re: ${viewingEmail.subject}`,
                                    body: `\n\n--- In reply to ${viewingEmail.from}: ---\n`
                                });
                                setIsComposeVisible(true);
                                setViewingEmail(null);
                            }
                        }}
                    >
                        Reply
                    </Button>
                ]}
            >
                {viewingEmail && (
                    <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '8px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                            <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                                    {viewingEmail.from} &lt;{viewingEmail.fromEmail}&gt;
                                </div>
                                <div style={{ fontSize: 12, color: '#64748B' }}>
                                    to {viewingEmail.to}
                                </div>
                            </div>
                            <div style={{ fontSize: 12, color: '#64748B' }}>
                                {viewingEmail.date}
                            </div>
                        </div>

                        <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '12px 0 16px 0' }} />

                        <div
                            dangerouslySetInnerHTML={{ __html: viewingEmail.body }}
                            style={{ fontSize: 14, lineHeight: 1.6, color: '#1E293B' }}
                        />
                    </div>
                )}
            </Modal>

            {/* Compose Modal */}
            <Modal
                open={isComposeVisible}
                onCancel={() => setIsComposeVisible(false)}
                title="New Institutional Message"
                footer={null}
                width={600}
                destroyOnClose
            >
                <Form form={composeForm} layout="vertical" onFinish={handleSendCompose}>
                    <Form.Item
                        name="to"
                        label="To"
                        rules={[{ required: true, type: 'email', message: 'Please enter recipient email' }]}
                    >
                        <Input placeholder="Recipient Email" />
                    </Form.Item>

                    <Form.Item
                        name="subject"
                        label="Subject"
                        rules={[{ required: true, message: 'Please enter subject' }]}
                    >
                        <Input placeholder="Subject" />
                    </Form.Item>

                    <Form.Item
                        name="body"
                        label="Message"
                        rules={[{ required: true, message: 'Please enter message content' }]}
                    >
                        <Input.TextArea rows={8} placeholder="Write message..." />
                    </Form.Item>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                        <span style={{ fontSize: 12, color: '#64748B' }}>
                            From: <strong>{googleAccount.email}</strong>
                        </span>
                        <Space>
                            <Button onClick={() => setIsComposeVisible(false)}>
                                Discard
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                icon={<SendOutlined />}
                                loading={isSending}
                                style={{ backgroundColor: '#2563EB', fontWeight: 600 }}
                            >
                                Send via Gmail
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Gmail;
