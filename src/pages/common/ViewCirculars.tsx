import React, { useState, useEffect, useMemo } from 'react';
import {
    Card,
    Typography,
    Alert,
    Empty,
    Tag,
    Button,
    Modal,
    Row,
    Col,
    Space,
    Input,
    Segmented,
    Select,
    Skeleton,
    Table,
    message
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    CalendarOutlined,
    EyeOutlined,
    FileTextOutlined,
    FilePdfOutlined,
    DownloadOutlined,
    SearchOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    NotificationOutlined,
    ArrowRightOutlined,
    CopyOutlined,
    PaperClipOutlined
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchCircularsRequest, type Circular } from '../../store/features/circulars/circularsSlice';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

// Helper: Friendly relative date
const getRelativeDateInfo = (dateStr: string) => {
    if (!dateStr) return { text: '', isToday: false, diffDays: 0 };
    const today = dayjs().startOf('day');
    const target = dayjs(dateStr).startOf('day');
    const diffDays = target.diff(today, 'day');

    if (diffDays === 0) return { text: 'Today', isToday: true, diffDays: 0 };
    if (diffDays === -1) return { text: 'Yesterday', isToday: false, diffDays: -1 };
    if (diffDays > 0) return { text: `In ${diffDays} days`, isToday: false, diffDays };
    return { text: `${Math.abs(diffDays)} days ago`, isToday: false, diffDays };
};

// Gradient palette for circular card header
const HEADER_GRADIENTS = [
    'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
    'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
    'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
    'linear-gradient(135deg, #831843 0%, #db2777 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #ea580c 100%)',
];

const getGradientForCircular = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % HEADER_GRADIENTS.length;
    return HEADER_GRADIENTS[index];
};

// --- Modern Circular Card Component ---
const CircularCard: React.FC<{
    circular: Circular;
    onPreview: (circular: Circular) => void;
    isViewed: boolean;
}> = ({ circular, onPreview, isViewed }) => {
    const [hovered, setHovered] = useState(false);
    const dateObj = dayjs(circular.issue_date);
    const relativeInfo = getRelativeDateInfo(circular.issue_date);
    const hasPdf = Boolean(circular.file_url);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onPreview(circular)}
            style={{
                borderRadius: '20px',
                background: '#ffffff',
                border: '1px solid rgba(226, 232, 240, 0.85)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                cursor: 'pointer',
                transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
                boxShadow: hovered
                    ? '0 20px 30px -10px rgba(30, 58, 138, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    : isViewed
                    ? '0 2px 8px rgba(0, 0, 0, 0.04)'
                    : '0 8px 20px rgba(59, 130, 246, 0.08)',
                position: 'relative',
            }}
        >
            {/* Top Header Strip */}
            <div
                style={{
                    background: getGradientForCircular(circular.id),
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {hasPdf ? (
                        <div
                            style={{
                                background: 'rgba(239, 68, 68, 0.9)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <FilePdfOutlined /> PDF Document
                        </div>
                    ) : (
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <FileTextOutlined /> Circular Notice
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!isViewed && (
                        <span
                            style={{
                                background: '#f59e0b',
                                color: '#ffffff',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '8px',
                                letterSpacing: '0.5px',
                            }}
                        >
                            NEW
                        </span>
                    )}
                    <span style={{ fontSize: '12px', opacity: 0.9 }}>
                        {dateObj.isValid() ? dateObj.format('MMM D, YYYY') : ''}
                    </span>
                </div>
            </div>

            {/* Card Body */}
            <div
                style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    flexGrow: 1,
                    justifyContent: 'space-between',
                }}
            >
                <div>
                    {/* Audience Tags */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {circular.audience && circular.audience.length > 0 ? (
                            circular.audience.map((aud) => (
                                <Tag
                                    key={aud}
                                    style={{
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        background: '#f1f5f9',
                                        color: '#334155',
                                        border: '1px solid #e2e8f0',
                                        margin: 0,
                                    }}
                                >
                                    {aud}
                                </Tag>
                            ))
                        ) : (
                            <Tag style={{ borderRadius: '8px', fontSize: '11px', margin: 0 }}>All</Tag>
                        )}
                    </div>

                    {/* Title */}
                    <Title
                        level={5}
                        ellipsis={{ rows: 2, tooltip: circular.title }}
                        style={{
                            margin: '0 0 8px 0',
                            fontSize: '16px',
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: hovered ? '#2563eb' : '#0f172a',
                            transition: 'color 0.2s ease',
                            minHeight: '44px',
                        }}
                    >
                        {circular.title}
                    </Title>

                    {/* Excerpt */}
                    <Paragraph
                        ellipsis={{ rows: 2, tooltip: circular.content }}
                        type="secondary"
                        style={{
                            fontSize: '13px',
                            lineHeight: 1.5,
                            color: '#64748b',
                            marginBottom: '16px',
                            minHeight: '40px',
                        }}
                    >
                        {circular.content || 'Official circular issued by school administration. Click to view full document.'}
                    </Paragraph>
                </div>

                {/* Footer Action */}
                <div
                    style={{
                        paddingTop: '12px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span
                        style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: hovered ? '#2563eb' : '#475569',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            transform: hovered ? 'translateX(3px)' : 'translateX(0)',
                        }}
                    >
                        {hasPdf ? 'View PDF Circular' : 'Read Notice'} <ArrowRightOutlined style={{ fontSize: '11px' }} />
                    </span>

                    <Button
                        type="text"
                        size="small"
                        icon={hasPdf ? <DownloadOutlined /> : <EyeOutlined />}
                        style={{ color: '#94a3b8', borderRadius: '8px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(circular);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Main ViewCirculars Component ---
const ViewCirculars: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { circulars, loading, error } = useSelector((state: RootState) => state.circulars);

    const [previewingCircular, setPreviewingCircular] = useState<Circular | null>(null);
    const [viewedCirculars, setViewedCirculars] = useState<Set<string>>(new Set());

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [audienceFilter, setAudienceFilter] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<string>('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Load viewed circulars from localStorage
    useEffect(() => {
        if (user?.id) {
            const viewed = localStorage.getItem(`viewedCirculars_${user.id}`);
            if (viewed) {
                try {
                    setViewedCirculars(new Set(JSON.parse(viewed)));
                } catch {
                    setViewedCirculars(new Set());
                }
            }
        }
    }, [user?.id]);

    // Fetch circulars on mount
    useEffect(() => {
        if (user?.organization_key && circulars.length === 0) {
            dispatch(fetchCircularsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key, circulars.length]);

    const handleRefresh = () => {
        if (user?.organization_key) {
            dispatch(fetchCircularsRequest(user.organization_key));
            message.info('Refreshing circulars & announcements...');
        }
    };

    const handlePreview = (circular: Circular) => {
        setPreviewingCircular(circular);
        if (user?.id && !viewedCirculars.has(circular.id)) {
            const newViewed = new Set(viewedCirculars).add(circular.id);
            setViewedCirculars(newViewed);
            localStorage.setItem(`viewedCirculars_${user.id}`, JSON.stringify(Array.from(newViewed)));
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleClosePreview = () => {
        setPreviewingCircular(null);
    };

    const handleCopyDetails = (circular: Circular) => {
        const dateStr = dayjs(circular.issue_date).format('dddd, MMMM D, YYYY');
        const textToCopy = `📋 ${circular.title}\n📅 Issued: ${dateStr}\n👥 Audience: ${circular.audience?.join(', ') || 'All'}\n\n📝 Details:\n${circular.content || 'Please refer to attached circular.'}`;
        navigator.clipboard.writeText(textToCopy);
        message.success('Circular details copied to clipboard!');
    };

    // Filter relevant circulars by user role (or All)
    const relevantCirculars = useMemo(() => {
        return circulars.filter(
            (c) =>
                c.audience?.includes('All') ||
                (user?.role && c.audience?.some((aud) => aud.toLowerCase().includes(user.role.toLowerCase())))
        );
    }, [circulars, user?.role]);

    // Calculate Summary Statistics
    const stats = useMemo(() => {
        const total = relevantCirculars.length;
        const pdfCount = relevantCirculars.filter((c) => Boolean(c.file_url)).length;
        const unreadCount = relevantCirculars.filter((c) => !viewedCirculars.has(c.id)).length;

        // Latest circular
        const sorted = [...relevantCirculars].sort(
            (a, b) => dayjs(b.issue_date).valueOf() - dayjs(a.issue_date).valueOf()
        );
        const latest = sorted[0] || null;
        const latestDate = latest ? dayjs(latest.issue_date).format('MMM D, YYYY') : 'None';

        return {
            total,
            pdfCount,
            unreadCount,
            latestDate,
        };
    }, [relevantCirculars, viewedCirculars]);

    // Filter & Sort Circulars
    const filteredCirculars = useMemo(() => {
        return relevantCirculars
            .filter((item) => {
                // Search query
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const titleMatch = item.title?.toLowerCase().includes(q);
                    const contentMatch = item.content?.toLowerCase().includes(q);
                    const audienceMatch = item.audience?.some((a) => a.toLowerCase().includes(q));
                    if (!titleMatch && !contentMatch && !audienceMatch) return false;
                }

                // Audience tab filter
                if (audienceFilter !== 'All') {
                    if (audienceFilter === 'With PDF') {
                        return Boolean(item.file_url);
                    }
                    if (audienceFilter === 'Unread') {
                        return !viewedCirculars.has(item.id);
                    }
                }

                return true;
            })
            .sort((a, b) => {
                const dateA = dayjs(a.issue_date).valueOf();
                const dateB = dayjs(b.issue_date).valueOf();
                if (sortOrder === 'oldest') return dateA - dateB;
                return dateB - dateA; // newest
            });
    }, [relevantCirculars, searchQuery, audienceFilter, sortOrder, viewedCirculars]);

    // Table Columns Configuration with Responsive Scrolling
    const tableColumns: ColumnsType<Circular> = useMemo(
        () => [
            {
                title: 'Circular Details',
                dataIndex: 'title',
                key: 'title',
                minWidth: 240,
                render: (_text, record) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: record.file_url
                                    ? '#fee2e2'
                                    : getGradientForCircular(record.id),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: record.file_url ? '#ef4444' : '#ffffff',
                                flexShrink: 0,
                                fontSize: '18px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            }}
                        >
                            {record.file_url ? <FilePdfOutlined /> : <FileTextOutlined />}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                                    {record.title}
                                </span>
                                {!viewedCirculars.has(record.id) && (
                                    <Tag
                                        color="gold"
                                        style={{
                                            fontSize: '10px',
                                            borderRadius: '6px',
                                            lineHeight: '16px',
                                            padding: '0 5px',
                                            fontWeight: 700,
                                            margin: 0,
                                        }}
                                    >
                                        NEW
                                    </Tag>
                                )}
                            </div>
                            <Paragraph
                                ellipsis={{ rows: 1, tooltip: record.content }}
                                type="secondary"
                                style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}
                            >
                                {record.content || 'Click to view circular document details.'}
                            </Paragraph>
                        </div>
                    </div>
                ),
            },
            {
                title: 'Audience',
                dataIndex: 'audience',
                key: 'audience',
                width: 140,
                render: (audience: string[]) => (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {audience && audience.length > 0 ? (
                            audience.map((aud) => (
                                <Tag
                                    key={aud}
                                    style={{
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        padding: '1px 6px',
                                        margin: 0,
                                    }}
                                >
                                    {aud}
                                </Tag>
                            ))
                        ) : (
                            <Tag style={{ borderRadius: '6px', fontSize: '11px', margin: 0 }}>All</Tag>
                        )}
                    </div>
                ),
            },
            {
                title: 'Issued Date',
                dataIndex: 'issue_date',
                key: 'issue_date',
                width: 140,
                render: (dateStr) => {
                    const dateObj = dayjs(dateStr);
                    const relativeInfo = getRelativeDateInfo(dateStr);
                    return (
                        <div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {dateObj.isValid() ? dateObj.format('MMM DD, YYYY') : '-'}
                            </div>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                {relativeInfo.text}
                            </span>
                        </div>
                    );
                },
            },
            {
                title: 'Attachment',
                dataIndex: 'file_url',
                key: 'file_url',
                width: 120,
                render: (fileUrl) =>
                    fileUrl ? (
                        <Tag
                            color="red"
                            icon={<FilePdfOutlined />}
                            style={{ borderRadius: '8px', padding: '1px 8px', fontWeight: 600, fontSize: '11px' }}
                        >
                            PDF
                        </Tag>
                    ) : (
                        <Tag style={{ borderRadius: '8px', padding: '1px 8px', fontSize: '11px', color: '#64748b' }}>
                            Notice
                        </Tag>
                    ),
            },
            {
                title: 'Actions',
                key: 'actions',
                width: 130,
                align: 'right',
                render: (_text, record) => (
                    <Space size={6} onClick={(e) => e.stopPropagation()}>
                        <Button
                            type="primary"
                            size="small"
                            ghost
                            icon={<EyeOutlined />}
                            onClick={() => handlePreview(record)}
                            style={{ borderRadius: '6px', fontWeight: 600, fontSize: '12px' }}
                        >
                            View
                        </Button>
                        {record.file_url && (
                            <a href={record.file_url} download target="_blank" rel="noopener noreferrer">
                                <Button
                                    size="small"
                                    icon={<DownloadOutlined />}
                                    style={{ borderRadius: '6px' }}
                                />
                            </a>
                        )}
                    </Space>
                ),
            },
        ],
        [viewedCirculars]
    );

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '40px' }}>
            {/* HERO BANNER SECTION */}
            <div
                style={{
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #1e1b4b 100%)',
                    padding: 'clamp(20px, 4vw, 32px) clamp(16px, 3vw, 28px)',
                    color: '#ffffff',
                    marginBottom: '20px',
                    boxShadow: '0 20px 35px -10px rgba(15, 23, 42, 0.3)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Ambient glow circles */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-60px',
                        right: '-40px',
                        width: '260px',
                        height: '260px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, rgba(99, 102, 241, 0) 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-50px',
                        left: '20%',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(244, 63, 94, 0.2) 0%, rgba(244, 63, 94, 0) 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <Row justify="space-between" align="middle" gutter={[20, 20]}>
                    <Col xs={24} md={16}>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.15)',
                                        backdropFilter: 'blur(8px)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        letterSpacing: '0.5px',
                                        color: '#cbd5e1',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <NotificationOutlined style={{ color: '#f43f5e' }} /> School Administration
                                </span>
                            </div>

                            <h1
                                style={{
                                    fontSize: 'clamp(22px, 3.5vw, 30px)',
                                    fontWeight: 800,
                                    margin: 0,
                                    letterSpacing: '-0.5px',
                                    color: '#ffffff',
                                    lineHeight: 1.25,
                                }}
                            >
                                Circulars & Announcements
                            </h1>

                            <p
                                style={{
                                    color: '#94a3b8',
                                    fontSize: '14px',
                                    maxWidth: '650px',
                                    margin: 0,
                                    lineHeight: 1.5,
                                }}
                            >
                                Official administrative circulars, guidelines, academic notices, and institutional announcements published for your role.
                            </p>
                        </Space>
                    </Col>

                    <Col xs={24} md={8} style={{ display: 'flex', justifyContent: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <Button
                            type="primary"
                            icon={<ReloadOutlined spin={loading} />}
                            onClick={handleRefresh}
                            style={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                height: '40px',
                                padding: '0 18px',
                                fontWeight: 600,
                                boxShadow: '0 8px 16px rgba(37, 99, 235, 0.3)',
                            }}
                        >
                            Refresh Circulars
                        </Button>
                    </Col>
                </Row>
            </div>

            {/* QUICK STATS CARDS - FULLY RESPONSIVE */}
            <Row gutter={[12, 12]} style={{ marginBottom: '20px' }}>
                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                        bodyStyle={{ padding: '14px 16px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Total Circulars</Text>
                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.1 }}>
                                    {stats.total}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563eb',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}
                            >
                                <FileTextOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                        bodyStyle={{ padding: '14px 16px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>With Attachment</Text>
                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#ef4444', marginTop: '2px', lineHeight: 1.1 }}>
                                    {stats.pdfCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#fee2e2',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ef4444',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}
                            >
                                <PaperClipOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                        bodyStyle={{ padding: '14px 16px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Unread</Text>
                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#d97706', marginTop: '2px', lineHeight: 1.1 }}>
                                    {stats.unreadCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#fef3c7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#d97706',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}
                            >
                                <NotificationOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                        bodyStyle={{ padding: '14px 16px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Latest Issue</Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(13px, 3.5vw, 16px)',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '3px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {stats.latestDate}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#ecfdf5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#059669',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}
                            >
                                <ClockCircleOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* CONTROLS BAR: SEARCH, TABS, SORT, VIEW MODE */}
            <Card
                style={{
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                }}
                bodyStyle={{ padding: '14px 18px' }}
            >
                <Row gutter={[12, 12]} align="middle" justify="space-between">
                    {/* Left: Filter Segmented */}
                    <Col xs={24} md={10}>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
                            <Segmented
                                value={audienceFilter}
                                onChange={(val) => setAudienceFilter(val as string)}
                                options={[
                                    { label: `All (${stats.total})`, value: 'All' },
                                    { label: `With PDF (${stats.pdfCount})`, value: 'With PDF' },
                                    { label: `Unread (${stats.unreadCount})`, value: 'Unread' },
                                ]}
                                style={{
                                    padding: '4px',
                                    borderRadius: '12px',
                                    background: '#f1f5f9',
                                    fontWeight: 600,
                                }}
                            />
                        </div>
                    </Col>

                    {/* Right: Search + Sort + View Mode */}
                    <Col xs={24} md={14}>
                        <Row gutter={[10, 10]} justify="end" align="middle">
                            <Col xs={24} sm={12} md={12}>
                                <Input
                                    placeholder="Search circulars, topics..."
                                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    allowClear
                                    style={{
                                        borderRadius: '10px',
                                        padding: '6px 12px',
                                    }}
                                />
                            </Col>

                            <Col xs={14} sm={8} md={8}>
                                <Select
                                    value={sortOrder}
                                    onChange={(val) => setSortOrder(val)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { label: 'Newest First', value: 'newest' },
                                        { label: 'Oldest First', value: 'oldest' },
                                    ]}
                                />
                            </Col>

                            <Col xs={10} sm={4} md={4} style={{ textAlign: 'right' }}>
                                <Segmented
                                    value={viewMode}
                                    onChange={(val) => setViewMode(val as 'grid' | 'table')}
                                    options={[
                                        { value: 'grid', icon: <AppstoreOutlined title="Card Grid View" /> },
                                        { value: 'table', icon: <UnorderedListOutlined title="Table View" /> },
                                    ]}
                                    style={{
                                        borderRadius: '10px',
                                        background: '#f1f5f9',
                                    }}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

            {/* ERROR ALERT */}
            {error && (
                <Alert
                    message="Error Fetching Circulars"
                    description={error}
                    type="error"
                    showIcon
                    style={{ borderRadius: '16px', marginBottom: '20px' }}
                />
            )}

            {/* SKELETON LOADING STATE */}
            {loading && circulars.length === 0 && (
                <Row gutter={[20, 20]}>
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                        <Col xs={24} sm={12} lg={8} key={k}>
                            <Card style={{ borderRadius: '20px', overflow: 'hidden' }}>
                                <Skeleton active paragraph={{ rows: 4 }} style={{ padding: 16 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* EMPTY STATE */}
            {!loading && filteredCirculars.length === 0 && (
                <Card
                    style={{
                        borderRadius: '20px',
                        border: '1px dashed #cbd5e1',
                        padding: '40px 20px',
                        textAlign: 'center',
                        background: '#ffffff',
                    }}
                >
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div style={{ marginTop: '12px' }}>
                                <Title level={5} style={{ color: '#334155', margin: 0 }}>
                                    {searchQuery ? 'No matching circulars found' : 'No circulars available'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: '13px' }}>
                                    {searchQuery
                                        ? `No circulars match "${searchQuery}". Try clearing filters.`
                                        : 'No circulars or administrative notices have been posted for your role yet.'}
                                </Text>
                            </div>
                        }
                    >
                        {searchQuery && (
                            <Button
                                type="primary"
                                onClick={() => {
                                    setSearchQuery('');
                                    setAudienceFilter('All');
                                }}
                                style={{ borderRadius: '10px', marginTop: '12px' }}
                            >
                                Reset Search Filters
                            </Button>
                        )}
                    </Empty>
                </Card>
            )}

            {/* GRID VIEW */}
            {!loading && filteredCirculars.length > 0 && viewMode === 'grid' && (
                <Row gutter={[20, 20]}>
                    {filteredCirculars.map((item) => (
                        <Col xs={24} sm={12} lg={8} key={item.id}>
                            <CircularCard
                                circular={item}
                                onPreview={handlePreview}
                                isViewed={viewedCirculars.has(item.id)}
                            />
                        </Col>
                    ))}
                </Row>
            )}

            {/* TABLE VIEW - FULLY RESPONSIVE WITH HORIZONTAL TOUCH SCROLL */}
            {!loading && filteredCirculars.length > 0 && viewMode === 'table' && (
                <Card
                    style={{
                        borderRadius: '18px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                        overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: 0 }}
                >
                    <div style={{ width: '100%', overflowX: 'auto' }}>
                        <Table
                            columns={tableColumns}
                            dataSource={filteredCirculars}
                            rowKey="id"
                            scroll={{ x: 650 }}
                            size="middle"
                            pagination={{
                                pageSize: 8,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} circulars`,
                                style: { padding: '12px 18px', margin: 0 },
                                responsive: true,
                            }}
                            onRow={(record) => ({
                                onClick: () => handlePreview(record),
                                style: { cursor: 'pointer' },
                            })}
                        />
                    </div>
                </Card>
            )}

            {/* CIRCULAR DETAIL & PDF PREVIEW MODAL */}
            {previewingCircular && (
                <Modal
                    open={!!previewingCircular}
                    onCancel={handleClosePreview}
                    footer={null}
                    width={previewingCircular.file_url ? '92vw' : 720}
                    centered
                    bodyStyle={{
                        padding: 0,
                        borderRadius: '24px',
                        overflow: 'hidden',
                        height: previewingCircular.file_url ? '84vh' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    style={{ top: 20, borderRadius: '24px', overflow: 'hidden' }}
                >
                    {/* Header Strip */}
                    <div
                        style={{
                            background: getGradientForCircular(previewingCircular.id),
                            padding: '20px 24px',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                <span
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.2)',
                                        padding: '2px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                    }}
                                >
                                    Issued: {dayjs(previewingCircular.issue_date).format('MMMM D, YYYY')}
                                </span>
                                {previewingCircular.file_url && (
                                    <span
                                        style={{
                                            background: '#ef4444',
                                            padding: '2px 8px',
                                            borderRadius: '6px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                        }}
                                    >
                                        PDF Document
                                    </span>
                                )}
                            </div>
                            <h2 style={{ color: '#ffffff', margin: 0, fontSize: '18px', fontWeight: 800 }}>
                                {previewingCircular.title}
                            </h2>
                        </div>

                        <Space size={8}>
                            {previewingCircular.file_url && (
                                <a href={previewingCircular.file_url} download target="_blank" rel="noopener noreferrer">
                                    <Button
                                        icon={<DownloadOutlined />}
                                        style={{
                                            background: '#ffffff',
                                            color: '#0f172a',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                        }}
                                    >
                                        Download PDF
                                    </Button>
                                </a>
                            )}
                            <Button
                                onClick={() => handleCopyDetails(previewingCircular)}
                                icon={<CopyOutlined />}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                }}
                            >
                                Copy
                            </Button>
                            <Button
                                onClick={handleClosePreview}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                }}
                            >
                                Close
                            </Button>
                        </Space>
                    </div>

                    {/* Modal Content */}
                    {previewingCircular.file_url ? (
                        <div style={{ flex: 1, height: '100%', background: '#334155' }}>
                            <object
                                data={previewingCircular.file_url}
                                type="application/pdf"
                                width="100%"
                                height="100%"
                                aria-label={previewingCircular.title}
                            >
                                <div style={{ padding: '32px', textAlign: 'center', background: '#ffffff', height: '100%' }}>
                                    <FilePdfOutlined style={{ fontSize: '48px', color: '#ef4444', marginBottom: '16px' }} />
                                    <Title level={4}>Preview not directly supported in this browser</Title>
                                    <Paragraph type="secondary">
                                        You can view or download the circular file directly using the button below.
                                    </Paragraph>
                                    <a href={previewingCircular.file_url} download target="_blank" rel="noopener noreferrer">
                                        <Button type="primary" icon={<DownloadOutlined />} style={{ borderRadius: '10px', height: '40px', padding: '0 24px' }}>
                                            Open / Download PDF Document
                                        </Button>
                                    </a>
                                </div>
                            </object>
                        </div>
                    ) : (
                        <div style={{ padding: '28px', background: '#ffffff' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                <Text strong style={{ color: '#475569', fontSize: '13px' }}>Target Audience:</Text>
                                {previewingCircular.audience && previewingCircular.audience.length > 0 ? (
                                    previewingCircular.audience.map((aud) => (
                                        <Tag key={aud} color="blue" style={{ borderRadius: '6px' }}>
                                            {aud}
                                        </Tag>
                                    ))
                                ) : (
                                    <Tag color="blue" style={{ borderRadius: '6px' }}>All</Tag>
                                )}
                            </div>

                            <div
                                style={{
                                    background: '#f8fafc',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    border: '1px solid #e2e8f0',
                                    marginBottom: '20px',
                                }}
                            >
                                <Text strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                                    Circular Content & Directives
                                </Text>
                                <Paragraph
                                    style={{
                                        whiteSpace: 'pre-wrap',
                                        fontSize: '14px',
                                        lineHeight: 1.7,
                                        color: '#1e293b',
                                        margin: 0,
                                    }}
                                >
                                    {previewingCircular.content || 'No detailed content description provided.'}
                                </Paragraph>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                <Button
                                    onClick={handleClosePreview}
                                    style={{
                                        borderRadius: '10px',
                                        height: '38px',
                                        padding: '0 22px',
                                        fontWeight: 600,
                                    }}
                                >
                                    Close
                                </Button>
                                <Button
                                    type="primary"
                                    onClick={() => handleCopyDetails(previewingCircular)}
                                    icon={<CopyOutlined />}
                                    style={{
                                        borderRadius: '10px',
                                        height: '38px',
                                        padding: '0 20px',
                                        fontWeight: 600,
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        border: 'none',
                                    }}
                                >
                                    Copy Details
                                </Button>
                            </div>
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
};

export default ViewCirculars;
