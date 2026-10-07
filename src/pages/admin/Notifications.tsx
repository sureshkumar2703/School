
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button, List, Spin, Avatar, Typography, Card, Empty, Alert, Row, Col, Space, Divider, Checkbox, Tooltip, Modal, Form, message, Input, Descriptions, Tag, Tabs } from 'antd';
import { GoogleOutlined, LogoutOutlined, UserOutlined, StarOutlined, InboxOutlined, SendOutlined, FileOutlined, ClockCircleOutlined, DownOutlined, TagOutlined, PlusOutlined, SearchOutlined, SettingOutlined, QuestionCircleOutlined, AppstoreOutlined, MenuOutlined, ArrowLeftOutlined, CloseOutlined, DeleteOutlined, StarFilled } from '@ant-design/icons';
import './Gmail.css';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import { Buffer } from 'buffer';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const { Title, Text, Paragraph } = Typography;

const CLIENT_ID = '884561258035-aogspeikpulebmumtdfvpuqbehcmkp2s.apps.googleusercontent.com';
const API_KEY = import.meta.env.VITE_GAPI_KEY;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];
const SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";

declare global {
    interface Window {
        gapi: any;
        google: any;
        tokenClient: any;
    }
}

const Gmail: React.FC = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [emails, setEmails] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFolder, setActiveFolder] = useState('INBOX');
    const [viewingEmail, setViewingEmail] = useState<any>(null);
    const [loadingEmailBody, setLoadingEmailBody] = useState(false);
    
    const [isComposeModalVisible, setIsComposeModalVisible] = useState(false);
    const [composeForm] = Form.useForm();
    const [isSending, setIsSending] = useState(false);
    const gapiInited = useRef(false);
    const gisInited = useRef(false);

    const handleAuthResult = useCallback((tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
            window.gapi.client.setToken(tokenResponse);
            setIsLoggedIn(true);
        } else {
            setError('No access token received from Google.');
            setIsLoggedIn(false);
        }
        setLoading(false);
    }, []);
    
    const initGisClient = useCallback(() => {
        try {
            window.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: handleAuthResult,
                error_callback: (err: any) => {
                    setError(`Google Auth Error: ${err?.details || 'An unknown error occurred.'}`);
                    setLoading(false);
                }
            });
            gisInited.current = true;
            // Check if both are ready to proceed
            if (gapiInited.current) {
                window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
            }
        } catch (e: any) {
            setError(`Failed to initialize GIS client: ${e.message}`);
            setLoading(false);
        }
    }, [handleAuthResult]);

    const initGapiClient = useCallback(async () => {
        try {
            await window.gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
            gapiInited.current = true;
             if (window.gapi.client.getToken() === null) {
                 setIsLoggedIn(false);
                 setLoading(false);
            } else {
                setIsLoggedIn(true);
            }
        } catch (e: any) {
            setError(`Failed to initialize GAPI client: ${e.message}`);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.async = true;
        gapiScript.defer = true;
        gapiScript.onload = () => window.gapi.load('client', initGapiClient);
        document.body.appendChild(gapiScript);

        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.async = true;
        gisScript.defer = true;
        gisScript.onload = initGisClient;
        document.body.appendChild(gisScript);

        return () => {
            document.body.removeChild(gapiScript);
            document.body.removeChild(gisScript);
        };
    }, [initGapiClient, initGisClient]);


    const fetchEmails = useCallback(async (folder = 'INBOX') => {
        setLoading(true);
        setError(null);
        setViewingEmail(null); 
        setEmails([]);
        try {
            const response = await window.gapi.client.gmail.users.messages.list({
                userId: 'me',
                labelIds: [folder],
                maxResults: 20,
            });

            const messages = response.result.messages || [];
            if (messages.length > 0) {
                const batch = window.gapi.client.newBatch();
                messages.forEach((message: any) => {
                    batch.add(window.gapi.client.gmail.users.messages.get({ 
                        userId: 'me', 
                        id: message.id,
                        format: 'full' // Fetch full details to avoid extra calls
                    }));
                });

                const batchResponse = await batch;
                const emailDetails = Object.values(batchResponse.result).map((res: any) => res.result);
                setEmails(emailDetails);

            } else {
                setEmails([]);
            }
        } catch (e: any) {
             const errorMessage = e?.result?.error?.message || e?.details || e?.message || 'An unknown error occurred.';
             setError(`Failed to fetch emails: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProfile = useCallback(async () => {
        try {
            const profileResponse = await window.gapi.client.gmail.users.getProfile({ userId: 'me' });
            setProfile(profileResponse.result);
        } catch (e) {
            console.error("Failed to fetch profile", e);
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            fetchProfile();
            fetchEmails(activeFolder);
        }
    }, [isLoggedIn, fetchProfile, fetchEmails, activeFolder]);
    
    const handleLogin = () => {
        if (!window.tokenClient) { setError("Google authentication client is not ready."); return; }
        setLoading(true);
        window.tokenClient.requestAccessToken({ prompt: '' });
    };

    const handleLogout = () => {
        const token = window.gapi.client.getToken();
        if (token) {
            window.google.accounts.oauth2.revoke(token.access_token, () => {
                window.gapi.client.setToken(null);
                setIsLoggedIn(false);
                setEmails([]);
                setProfile(null);
                setActiveFolder('INBOX');
            });
        }
    };
    
    const handleCompose = () => setIsComposeModalVisible(true);

    const handleComposeCancel = () => {
        setIsComposeModalVisible(false);
        composeForm.resetFields();
    };

    const handleSendEmail = async (values: { to: string; subject: string; body: string }) => {
        setIsSending(true);
        try {
            const rawMessage = [
                `From: ${profile.emailAddress}`,
                `To: ${values.to}`,
                `Subject: ${values.subject}`,
                `Content-Type: text/html; charset=utf-8`,
                ``,
                values.body
            ].join('\n');

            const encodedMessage = Buffer.from(rawMessage).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            
            await window.gapi.client.gmail.users.messages.send({
                userId: 'me',
                resource: { raw: encodedMessage }
            });

            message.success('Email sent successfully!');
            handleComposeCancel();
            if (activeFolder === 'SENT') {
                fetchEmails('SENT');
            }
        } catch (e: any) {
            message.error(`Failed to send email: ${e?.result?.error?.message || 'An error occurred'}`);
        } finally {
            setIsSending(false);
        }
    };

    const getHeader = (headers: any[], name: string) => {
        const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : 'N/A';
    };

    const formatDate = (dateString: string) => {
        const date = dayjs(dateString);
        if (date.isToday()) {
            return date.format('h:mm A');
        }
        return date.format('MMM D');
    };
    
    const handleEmailClick = async (email: any) => {
        setLoadingEmailBody(true);
        setViewingEmail(email); 

        try {
            await window.gapi.client.gmail.users.messages.modify({
                'userId': 'me',
                'id': email.id,
                'resource': {
                    'removeLabelIds': ['UNREAD']
                }
            });
            setEmails(prevEmails => prevEmails.map(e => 
                e.id === email.id 
                ? { ...e, labelIds: e.labelIds.filter((label: string) => label !== 'UNREAD') } 
                : e
            ));
        } catch(e) {
            console.warn("Could not mark email as read on server:", e);
        }

        try {
            const bodyData = findEmailBody(email.payload);
            setViewingEmail({ ...email, body: bodyData });
        } catch (e) {
            console.error("Failed to parse email body:", e);
        } finally {
            setLoadingEmailBody(false);
        }
    };
    
    const findEmailBody = (payload: any) => {
        let body = '';
        if (payload.body && payload.body.data) {
            body = payload.body.data;
        } else if (payload.parts) {
            const part = payload.parts.find((p: any) => p.mimeType === 'text/html') || payload.parts.find((p: any) => p.mimeType === 'text/plain');
            if (part && part.body && part.body.data) {
                body = part.body.data;
            } else if (part && part.parts) {
                 const nestedPart = part.parts.find((p: any) => p.mimeType === 'text/html') || part.parts.find((p: any) => p.mimeType === 'text/plain');
                if (nestedPart && nestedPart.body.data) {
                     body = nestedPart.body.data;
                }
            }
        }
        try {
            return Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
        } catch (e) {
            return "<p>Could not decode email body.</p>";
        }
    };

    const handleFolderChange = (folder: string) => {
        setActiveFolder(folder);
    };

    const tabItems = [
        { key: 'INBOX', label: 'Primary', children: <div/> },
        { key: 'CATEGORY_PROMOTIONS', label: 'Promotions', children: <div/> },
        { key: 'CATEGORY_SOCIAL', label: 'Social', children: <div/> },
    ];
    
    if (loading) {
        return <Spin tip="Initializing Gmail..." fullscreen />;
    }

    if (!isLoggedIn) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <Title level={3}>Connect to Gmail</Title>
                    <Text type="secondary">Sign in to view and manage your emails directly within this application.</Text>
                    <div style={{ marginTop: '24px' }}>
                        <Button type="primary" icon={<GoogleOutlined />} size="large" onClick={handleLogin}>
                            Sign in with Google
                        </Button>
                        {error && <Alert message="Login Error" description={error} type="error" showIcon style={{ marginTop: 24, textAlign: 'left' }} />}
                    </div>
                </div>
            </Card>
        );
    }
    
    return (
        <div className="gmail-layout">
            <header className="gmail-header">
                <Space size="middle" align="center">
                    <Button type="text" shape="circle" icon={<MenuOutlined />} />
                    <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/logo_gmail_lockup_default_1x_r5.png" alt="Gmail" height={24} />
                </Space>
                <div className="gmail-search">
                    <SearchOutlined />
                    <Input placeholder="Search mail" variant="borderless" />
                </div>
                 <Space size="middle" align="center">
                    <Tooltip title="Logout"><Button type="text" shape="circle" icon={<LogoutOutlined />} onClick={handleLogout} /></Tooltip>
                    <Tooltip title="Help"><QuestionCircleOutlined /></Tooltip>
                    <Tooltip title="Settings"><SettingOutlined /></Tooltip>
                    <Tooltip title="Google apps"><AppstoreOutlined /></Tooltip>
                    <Avatar src={profile?.pictureUrl} icon={<UserOutlined />}>{profile?.emailAddress?.[0]?.toUpperCase()}</Avatar>
                </Space>
            </header>
            <div className="gmail-body">
                <aside className="gmail-sidebar">
                    <Button type="primary" className="compose-btn" icon={<PlusOutlined />} onClick={handleCompose}>Compose</Button>
                    <List>
                        <List.Item onClick={() => handleFolderChange('INBOX')} className={activeFolder === 'INBOX' ? 'active' : ''}><InboxOutlined /> Inbox</List.Item>
                        <List.Item onClick={() => handleFolderChange('STARRED')} className={activeFolder === 'STARRED' ? 'active' : ''}><StarOutlined /> Starred</List.Item>
                        <List.Item onClick={() => handleFolderChange('SENT')} className={activeFolder === 'SENT' ? 'active' : ''}><SendOutlined /> Sent</List.Item>
                        <List.Item onClick={() => handleFolderChange('DRAFT')} className={activeFolder === 'DRAFT' ? 'active' : ''}><FileOutlined /> Drafts</List.Item>
                    </List>
                    <Divider />
                </aside>
                <main className="gmail-content">
                    <Spin spinning={loading}>
                        <List
                            itemLayout="horizontal"
                            dataSource={emails}
                            renderItem={email => {
                                const from = getHeader(email.payload.headers, 'From').replace(/"/g, '').replace(/<.*>/, '').trim();
                                const subject = getHeader(email.payload.headers, 'Subject');
                                const date = getHeader(email.payload.headers, 'Date');
                                const snippet = email.snippet;
                                const isUnread = email.labelIds.includes('UNREAD');
                                const isStarred = email.labelIds.includes('STARRED');
                                
                                return (
                                    <List.Item
                                        key={email.id}
                                        onClick={() => handleEmailClick(email)}
                                        style={{
                                            backgroundColor: isUnread ? '#eaf1fb' : 'transparent',
                                            fontWeight: isUnread ? 'bold' : 'normal',
                                            cursor: 'pointer',
                                        }}
                                        className="email-row-list-item"
                                    >
                                        <div className="email-row-content">
                                            <div className="email-actions">
                                                <Checkbox onClick={e => e.stopPropagation()} />
                                                <Tooltip title="Star">
                                                    <Button type="text" shape="circle" icon={isStarred ? <StarFilled style={{color: '#fadb14'}} /> : <StarOutlined />} />
                                                </Tooltip>
                                            </div>
                                            <div className="email-sender">{from}</div>
                                            <div className="email-subject">
                                                <Text strong={isUnread}>{subject}</Text>
                                                <Text type="secondary" style={{ marginLeft: 8 }}>- {snippet}</Text>
                                            </div>
                                            <div className="email-date">{formatDate(date)}</div>
                                        </div>
                                    </List.Item>
                                );
                            }}
                             locale={{
                                emptyText: <Empty description={`No emails in ${activeFolder}`} />
                            }}
                        />
                         {error && <Alert message="Error" description={error} type="error" showIcon style={{ margin: 24 }} />}
                    </Spin>
                </main>
                 <aside className="gmail-right-sidebar">
                    <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/calendar_2020q4_2x.png" alt="Calendar" width={20} />
                    <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/keep_2020q4_2x.png" alt="Keep" width={20} />
                    <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/tasks2_2020q4_2x.png" alt="Tasks" width={20} />
                    <img src="https://ssl.gstatic.com/ui/v1/icons/mail/rfr/contacts_2022_2x.png" alt="Contacts" width={20} />
                    <Divider style={{ margin: '8px 0' }}/>
                    <PlusOutlined />
                </aside>
            </div>

            <Modal
                open={!!viewingEmail}
                onCancel={() => setViewingEmail(null)}
                destroyOnHidden
                title={viewingEmail ? getHeader(viewingEmail.payload.headers, 'Subject') : ''}
                width="80vw"
                footer={null}
            >
                {viewingEmail && (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        <Descriptions bordered size="small" column={1}>
                            <Descriptions.Item label="From">{getHeader(viewingEmail.payload.headers, 'From')}</Descriptions.Item>
                            <Descriptions.Item label="To">{getHeader(viewingEmail.payload.headers, 'To')}</Descriptions.Item>
                            <Descriptions.Item label="Date">{formatDate(getHeader(viewingEmail.payload.headers, 'Date'))}</Descriptions.Item>
                        </Descriptions>
                        <Divider />
                        {loadingEmailBody ? <Spin /> : (
                             <div dangerouslySetInnerHTML={{ __html: viewingEmail.body || '<p>No content to display.</p>' }} />
                        )}
                    </div>
                )}
            </Modal>
            
            <Modal
                open={isComposeModalVisible}
                onCancel={handleComposeCancel}
                title="New Message"
                footer={null}
                width={600}
                destroyOnHidden
            >
                <Form form={composeForm} layout="vertical" onFinish={handleSendEmail}>
                    <Form.Item name="to" rules={[{ required: true, type: 'email', message: 'Please enter a valid recipient email.' }]}>
                        <Input placeholder="To" />
                    </Form.Item>
                    <Form.Item name="subject" rules={[{ required: true, message: 'Please enter a subject.' }]}>
                        <Input placeholder="Subject" />
                    </Form.Item>
                     <Form.Item name="body" rules={[{ required: true, message: 'Please enter a message body.' }]}>
                        <Input.TextArea rows={10} />
                    </Form.Item>
                     <Row justify="end">
                        <Space>
                            <Button onClick={handleComposeCancel} icon={<DeleteOutlined />}>Discard</Button>
                            <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={isSending}>Send</Button>
                        </Space>
                     </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default Gmail;
