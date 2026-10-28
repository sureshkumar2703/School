import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Alert,
    Empty,
    Image,
    Tag,
    Space,
    Row,
    Col,
    Button,
    Modal,
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
    ClockCircleOutlined,
    SearchOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    CheckCircleOutlined,
    RocketOutlined,
    ArrowRightOutlined,
    CopyOutlined,
    EyeOutlined,
    InfoCircleOutlined,
    FireOutlined
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import dayjs from 'dayjs';
import { fetchEventsRequest, type Event } from '../../store/features/events/eventsSlice';

const { Title, Text, Paragraph } = Typography;

// Helper: Calculate friendly relative day difference
const getRelativeDateInfo = (dateStr: string) => {
    if (!dateStr) return { text: '', isUpcoming: false, isToday: false, diffDays: 0 };
    const today = dayjs().startOf('day');
    const target = dayjs(dateStr).startOf('day');
    const diffDays = target.diff(today, 'day');

    if (diffDays === 0) return { text: 'Today', isUpcoming: true, isToday: true, diffDays: 0 };
    if (diffDays === 1) return { text: 'Tomorrow', isUpcoming: true, isToday: false, diffDays: 1 };
    if (diffDays > 1) return { text: `In ${diffDays} days`, isUpcoming: true, isToday: false, diffDays };
    if (diffDays === -1) return { text: 'Yesterday', isUpcoming: false, isToday: false, diffDays: -1 };
    return { text: `${Math.abs(diffDays)} days ago`, isUpcoming: false, isToday: false, diffDays };
};

// Gradient palette for fallback cards when event.image_url is not available
const CARD_GRADIENTS = [
    'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
    'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #c084fc 100%)',
    'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
    'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)',
    'linear-gradient(135deg, #7c2d12 0%, #ea580c 50%, #fb923c 100%)',
];

const getGradientForEvent = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % CARD_GRADIENTS.length;
    return CARD_GRADIENTS[index];
};

// --- Modern Event Card Component ---
const EventCard: React.FC<{
    event: Event;
    onPreview: (event: Event) => void;
    isViewed: boolean;
}> = ({ event, onPreview, isViewed }) => {
    const [hovered, setHovered] = useState(false);
    const dateObj = dayjs(event.event_date);
    const month = dateObj.isValid() ? dateObj.format('MMM').toUpperCase() : 'EVT';
    const day = dateObj.isValid() ? dateObj.format('DD') : '--';
    const relativeInfo = getRelativeDateInfo(event.event_date);

    const isUpcoming = event.status === 'Upcoming' || relativeInfo.diffDays >= 0;
    const isCompleted = event.status === 'Completed' || (!isUpcoming && relativeInfo.diffDays < 0);

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onPreview(event)}
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
            {/* Top Media / Banner */}
            <div
                style={{
                    height: '170px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: event.image_url ? '#0f172a' : getGradientForEvent(event.id),
                }}
            >
                {event.image_url ? (
                    <img
                        src={event.image_url}
                        alt={event.title}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transition: 'transform 0.5s ease',
                            transform: hovered ? 'scale(1.08)' : 'scale(1)',
                        }}
                    />
                ) : (
                    <div
                        style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            color: '#ffffff',
                            textAlign: 'center',
                        }}
                    >
                        <CalendarOutlined style={{ fontSize: '42px', opacity: 0.35, marginBottom: '8px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '1px', opacity: 0.9 }}>
                            {event.status || 'EVENT NOTICE'}
                        </span>
                    </div>
                )}

                {/* Subtle dark gradient overlay at bottom of image for contrast */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 60%)',
                        pointerEvents: 'none',
                    }}
                />

                {/* Floating Calendar Date Stamp (Top-Left) */}
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                        textAlign: 'center',
                        minWidth: '52px',
                        background: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                    }}
                >
                    <div
                        style={{
                            background: isUpcoming ? '#3b82f6' : '#64748b',
                            color: '#ffffff',
                            fontSize: '10px',
                            fontWeight: 800,
                            letterSpacing: '0.8px',
                            padding: '3px 6px',
                        }}
                    >
                        {month}
                    </div>
                    <div
                        style={{
                            padding: '4px 6px',
                            fontSize: '18px',
                            fontWeight: 800,
                            color: '#0f172a',
                            lineHeight: 1.1,
                        }}
                    >
                        {day}
                    </div>
                </div>

                {/* Floating Status & Countdown Badge (Top-Right) */}
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: '6px',
                    }}
                >
                    {relativeInfo.text && (
                        <span
                            style={{
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                background: relativeInfo.isToday
                                    ? 'rgba(239, 68, 68, 0.92)'
                                    : relativeInfo.isUpcoming
                                    ? 'rgba(15, 23, 42, 0.75)'
                                    : 'rgba(71, 85, 105, 0.75)',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 9px',
                                borderRadius: '20px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                            }}
                        >
                            {relativeInfo.isToday ? <FireOutlined /> : <ClockCircleOutlined />}
                            {relativeInfo.text}
                        </span>
                    )}
                </div>

                {/* Unviewed "NEW" glow chip if not viewed yet */}
                {!isViewed && (
                    <div
                        style={{
                            position: 'absolute',
                            bottom: '12px',
                            left: '12px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '10px',
                            letterSpacing: '0.8px',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)',
                            textTransform: 'uppercase',
                        }}
                    >
                        New
                    </div>
                )}
            </div>

            {/* Card Content */}
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
                    {/* Status & Category Tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <Tag
                            color={isUpcoming ? 'processing' : isCompleted ? 'success' : 'default'}
                            style={{
                                borderRadius: '12px',
                                padding: '1px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                margin: 0,
                                border: 'none',
                            }}
                        >
                            {event.status || (isUpcoming ? 'Upcoming' : 'Past Event')}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarOutlined /> {dateObj.isValid() ? dateObj.format('ddd, MMM D') : ''}
                        </Text>
                    </div>

                    {/* Title */}
                    <Title
                        level={5}
                        ellipsis={{ rows: 2, tooltip: event.title }}
                        style={{
                            margin: '4px 0 8px 0',
                            fontSize: '16px',
                            fontWeight: 700,
                            lineHeight: 1.35,
                            color: hovered ? '#2563eb' : '#0f172a',
                            transition: 'color 0.2s ease',
                            minHeight: '42px',
                        }}
                    >
                        {event.title}
                    </Title>

                    {/* Description excerpt */}
                    <Paragraph
                        ellipsis={{ rows: 2, tooltip: event.description }}
                        type="secondary"
                        style={{
                            fontSize: '13px',
                            lineHeight: 1.5,
                            color: '#64748b',
                            marginBottom: '16px',
                            minHeight: '40px',
                        }}
                    >
                        {event.description || 'No description provided.'}
                    </Paragraph>
                </div>

                {/* Footer with Read More CTA */}
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
                        Read Details <ArrowRightOutlined style={{ fontSize: '11px' }} />
                    </span>

                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        style={{
                            color: '#94a3b8',
                            borderRadius: '8px',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(event);
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

// --- Main TeacherEvents Component ---
const TeacherEvents: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { events, loading, error } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.auth);

    const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
    const [viewedEvents, setViewedEvents] = useState<Set<string>>(new Set());

    // Search and filter controls
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('All');
    const [sortOrder, setSortOrder] = useState<string>('nearest');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Fetch events if not yet loaded
    useEffect(() => {
        if (user?.organization_key && events.length === 0) {
            dispatch(fetchEventsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key, events.length]);

    // Read viewed events from localStorage
    useEffect(() => {
        if (user?.id) {
            const viewed = localStorage.getItem(`viewedEvents_${user.id}`);
            if (viewed) {
                try {
                    setViewedEvents(new Set(JSON.parse(viewed)));
                } catch {
                    setViewedEvents(new Set());
                }
            }
        }
    }, [user?.id]);

    // Automatically mark visible upcoming events as viewed so the Sidebar unread badge synchronizes
    useEffect(() => {
        if (user?.id && events.length > 0) {
            const upcomingEventIds = events.filter((e) => e.status === 'Upcoming').map((e) => e.id);
            const viewedSet = new Set(viewedEvents);

            let changed = false;
            upcomingEventIds.forEach((id) => {
                if (!viewedSet.has(id)) {
                    viewedSet.add(id);
                    changed = true;
                }
            });

            if (changed) {
                const newViewedArray = Array.from(viewedSet);
                setViewedEvents(new Set(newViewedArray));
                localStorage.setItem(`viewedEvents_${user.id}`, JSON.stringify(newViewedArray));
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, [user?.id, events]);

    const handleRefresh = () => {
        if (user?.organization_key) {
            dispatch(fetchEventsRequest(user.organization_key));
            message.info('Refreshing events and announcements...');
        }
    };

    const handlePreview = (event: Event) => {
        setViewingEvent(event);
        if (user?.id && !viewedEvents.has(event.id)) {
            const newViewed = new Set(viewedEvents).add(event.id);
            setViewedEvents(newViewed);
            localStorage.setItem(`viewedEvents_${user.id}`, JSON.stringify(Array.from(newViewed)));
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleCloseModal = () => {
        setViewingEvent(null);
    };

    const handleCopyDetails = (event: Event) => {
        const dateStr = dayjs(event.event_date).format('dddd, MMMM D, YYYY');
        const textToCopy = `📌 ${event.title}\n📅 Date: ${dateStr}\n🏷️ Status: ${event.status || 'Active'}\n\n📝 Details:\n${event.description}`;
        navigator.clipboard.writeText(textToCopy);
        message.success('Event details copied to clipboard!');
    };

    // Calculate Counts & Metrics
    const stats = useMemo(() => {
        const total = events.length;
        const upcomingList = events.filter((e) => {
            if (e.status === 'Upcoming') return true;
            const diff = dayjs(e.event_date).diff(dayjs().startOf('day'), 'day');
            return diff >= 0;
        });
        const completedList = events.filter((e) => {
            if (e.status === 'Completed') return true;
            const diff = dayjs(e.event_date).diff(dayjs().startOf('day'), 'day');
            return diff < 0 && e.status !== 'Upcoming';
        });

        // Find nearest future event for countdown card
        const sortedUpcoming = [...upcomingList].sort(
            (a, b) => dayjs(a.event_date).valueOf() - dayjs(b.event_date).valueOf()
        );
        const nextEvent = sortedUpcoming[0] || null;
        const nextRelative = nextEvent ? getRelativeDateInfo(nextEvent.event_date) : null;

        return {
            total,
            upcomingCount: upcomingList.length,
            completedCount: completedList.length,
            nextEvent,
            nextCountdown: nextRelative ? nextRelative.text : 'None pending',
        };
    }, [events]);

    // Filter & Sort Events
    const filteredEvents = useMemo(() => {
        return events
            .filter((item) => {
                // Search filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const titleMatch = item.title?.toLowerCase().includes(q);
                    const descMatch = item.description?.toLowerCase().includes(q);
                    if (!titleMatch && !descMatch) return false;
                }

                // Status tab filter
                if (statusFilter === 'Upcoming') {
                    if (item.status === 'Upcoming') return true;
                    return dayjs(item.event_date).diff(dayjs().startOf('day'), 'day') >= 0;
                }
                if (statusFilter === 'Completed') {
                    if (item.status === 'Completed') return true;
                    return dayjs(item.event_date).diff(dayjs().startOf('day'), 'day') < 0;
                }
                return true; // 'All'
            })
            .sort((a, b) => {
                const dateA = dayjs(a.event_date).valueOf();
                const dateB = dayjs(b.event_date).valueOf();

                if (sortOrder === 'nearest') {
                    return dateA - dateB;
                }
                if (sortOrder === 'furthest') {
                    return dateB - dateA;
                }
                // newest created
                return dayjs(b.created_at || b.event_date).valueOf() - dayjs(a.created_at || a.event_date).valueOf();
            });
    }, [events, searchQuery, statusFilter, sortOrder]);

    // Table Columns Configuration with Responsive widths
    const tableColumns: ColumnsType<Event> = useMemo(
        () => [
            {
                title: 'Event Details',
                dataIndex: 'title',
                key: 'title',
                minWidth: 240,
                render: (_text, record) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {record.image_url ? (
                            <img
                                src={record.image_url}
                                alt={record.title}
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    objectFit: 'cover',
                                    border: '1px solid #e2e8f0',
                                    flexShrink: 0,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    background: getGradientForEvent(record.id),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    flexShrink: 0,
                                    fontSize: '17px',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                                }}
                            >
                                <CalendarOutlined />
                            </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                                    {record.title}
                                </span>
                                {!viewedEvents.has(record.id) && (
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
                                ellipsis={{ rows: 1, tooltip: record.description }}
                                type="secondary"
                                style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748b' }}
                            >
                                {record.description || 'No description provided.'}
                            </Paragraph>
                        </div>
                    </div>
                ),
            },
            {
                title: 'Event Date',
                dataIndex: 'event_date',
                key: 'event_date',
                width: 140,
                render: (dateStr) => {
                    const dateObj = dayjs(dateStr);
                    const relativeInfo = getRelativeDateInfo(dateStr);
                    return (
                        <div>
                            <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                {dateObj.isValid() ? dateObj.format('MMM DD, YYYY') : '-'}
                            </div>
                            {relativeInfo.text && (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: relativeInfo.isToday
                                            ? '#ef4444'
                                            : relativeInfo.isUpcoming
                                            ? '#2563eb'
                                            : '#64748b',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {relativeInfo.text}
                                </span>
                            )}
                        </div>
                    );
                },
            },
            {
                title: 'Status',
                dataIndex: 'status',
                key: 'status',
                width: 110,
                render: (status, record) => {
                    const relativeInfo = getRelativeDateInfo(record.event_date);
                    const isUpcoming = status === 'Upcoming' || relativeInfo.diffDays >= 0;
                    const isCompleted = status === 'Completed' || (!isUpcoming && relativeInfo.diffDays < 0);

                    const color = isUpcoming ? 'processing' : isCompleted ? 'success' : 'default';
                    const displayStatus = status || (isUpcoming ? 'Upcoming' : 'Completed');

                    return (
                        <Tag
                            color={color}
                            style={{
                                borderRadius: '10px',
                                padding: '1px 8px',
                                fontWeight: 600,
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {displayStatus}
                        </Tag>
                    );
                },
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
                        <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyDetails(record)}
                            style={{ borderRadius: '6px' }}
                        />
                    </Space>
                ),
            },
        ],
        [viewedEvents]
    );

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: '40px' }}>
            {/* HERO BANNER SECTION */}
            <div
                style={{
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #312e81 100%)',
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
                        background: 'radial-gradient(circle, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0) 70%)',
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
                                    <RocketOutlined style={{ color: '#38bdf8' }} /> Campus Events & Notices
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
                                School Events & Notices
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
                                Stay informed about upcoming academic schedules, celebrations, examinations, and official notifications issued by your school administration.
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
                            Refresh Notices
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
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Total Events</Text>
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
                                <CalendarOutlined />
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
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Upcoming</Text>
                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#059669', marginTop: '2px', lineHeight: 1.1 }}>
                                    {stats.upcomingCount}
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
                                <RocketOutlined />
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
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Completed</Text>
                                <div style={{ fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: 800, color: '#475569', marginTop: '2px', lineHeight: 1.1 }}>
                                    {stats.completedCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#f1f5f9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#64748b',
                                    fontSize: '18px',
                                    flexShrink: 0,
                                }}
                            >
                                <CheckCircleOutlined />
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
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>Next Event</Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(14px, 3.5vw, 17px)',
                                        fontWeight: 800,
                                        color: '#d97706',
                                        marginTop: '3px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={stats.nextEvent?.title || 'None pending'}
                                >
                                    {stats.nextCountdown}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '12px',
                                    background: '#fffbeb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#d97706',
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
                    {/* Left: Status Filter Segmented */}
                    <Col xs={24} md={10}>
                        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
                            <Segmented
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val as string)}
                                options={[
                                    { label: `All (${stats.total})`, value: 'All' },
                                    { label: `Upcoming (${stats.upcomingCount})`, value: 'Upcoming' },
                                    { label: `Completed (${stats.completedCount})`, value: 'Completed' },
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
                                    placeholder="Search events, topics..."
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
                                        { label: 'Nearest First', value: 'nearest' },
                                        { label: 'Furthest First', value: 'furthest' },
                                        { label: 'Newest Added', value: 'created' },
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
                    message="Error Fetching Events"
                    description={error}
                    type="error"
                    showIcon
                    style={{ borderRadius: '16px', marginBottom: '20px' }}
                />
            )}

            {/* SKELETON LOADING STATE */}
            {loading && events.length === 0 && (
                <Row gutter={[20, 20]}>
                    {[1, 2, 3, 4, 5, 6].map((k) => (
                        <Col xs={24} sm={12} lg={8} key={k}>
                            <Card style={{ borderRadius: '20px', overflow: 'hidden' }}>
                                <Skeleton.Image style={{ width: '100%', height: 160 }} active />
                                <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 16 }} />
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* EMPTY STATE */}
            {!loading && filteredEvents.length === 0 && (
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
                                    {searchQuery ? 'No matching events found' : 'No events available'}
                                </Title>
                                <Text type="secondary" style={{ fontSize: '13px' }}>
                                    {searchQuery
                                        ? `No notices match "${searchQuery}". Try clearing filters.`
                                        : 'There are currently no events or notices posted for your organization.'}
                                </Text>
                            </div>
                        }
                    >
                        {searchQuery && (
                            <Button
                                type="primary"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('All');
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
            {!loading && filteredEvents.length > 0 && viewMode === 'grid' && (
                <Row gutter={[20, 20]}>
                    {filteredEvents.map((item) => (
                        <Col xs={24} sm={12} lg={8} key={item.id}>
                            <EventCard
                                event={item}
                                onPreview={handlePreview}
                                isViewed={viewedEvents.has(item.id)}
                            />
                        </Col>
                    ))}
                </Row>
            )}

            {/* TABLE VIEW - FULLY RESPONSIVE WITH HORIZONTAL TOUCH SCROLL */}
            {!loading && filteredEvents.length > 0 && viewMode === 'table' && (
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
                            dataSource={filteredEvents}
                            rowKey="id"
                            scroll={{ x: 620 }}
                            size="middle"
                            pagination={{
                                pageSize: 8,
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} events`,
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

            {/* EVENT DETAIL MODAL */}
            {viewingEvent && (
                <Modal
                    open={!!viewingEvent}
                    onCancel={handleCloseModal}
                    footer={null}
                    width={700}
                    centered
                    bodyStyle={{ padding: 0, borderRadius: '24px', overflow: 'hidden' }}
                    style={{ borderRadius: '24px', overflow: 'hidden' }}
                >
                    {/* Modal Banner Header */}
                    <div
                        style={{
                            height: viewingEvent.image_url ? '240px' : '140px',
                            position: 'relative',
                            background: viewingEvent.image_url
                                ? '#0f172a'
                                : getGradientForEvent(viewingEvent.id),
                            overflow: 'hidden',
                        }}
                    >
                        {viewingEvent.image_url ? (
                            <Image
                                alt={viewingEvent.title}
                                src={viewingEvent.image_url}
                                style={{
                                    width: '100%',
                                    height: '240px',
                                    objectFit: 'cover',
                                }}
                                preview={{
                                    mask: <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><EyeOutlined /> Expand Photo</div>,
                                }}
                            />
                        ) : (
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#ffffff',
                                    flexDirection: 'column',
                                }}
                            >
                                <CalendarOutlined style={{ fontSize: '44px', opacity: 0.35, marginBottom: '8px' }} />
                                <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>
                                    CAMPUS EVENT
                                </span>
                            </div>
                        )}

                        {/* Floating Date Badge on Modal Banner */}
                        <div
                            style={{
                                position: 'absolute',
                                top: '14px',
                                left: '14px',
                                background: 'rgba(15, 23, 42, 0.75)',
                                backdropFilter: 'blur(8px)',
                                color: '#ffffff',
                                padding: '5px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                zIndex: 10,
                            }}
                        >
                            <CalendarOutlined style={{ color: '#38bdf8' }} />
                            {dayjs(viewingEvent.event_date).format('dddd, MMMM D, YYYY')}
                        </div>
                    </div>

                    {/* Modal Body */}
                    <div style={{ padding: '24px' }}>
                        {/* Status & Relative Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <Space size={8}>
                                <Tag
                                    color={viewingEvent.status === 'Upcoming' ? 'processing' : 'success'}
                                    style={{
                                        borderRadius: '12px',
                                        padding: '2px 10px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        margin: 0,
                                    }}
                                >
                                    {viewingEvent.status || 'Active Notice'}
                                </Tag>

                                {getRelativeDateInfo(viewingEvent.event_date).text && (
                                    <Tag
                                        color="gold"
                                        style={{
                                            borderRadius: '12px',
                                            padding: '2px 10px',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            margin: 0,
                                        }}
                                    >
                                        <ClockCircleOutlined style={{ marginRight: 4 }} />
                                        {getRelativeDateInfo(viewingEvent.event_date).text}
                                    </Tag>
                                )}
                            </Space>

                            <Button
                                icon={<CopyOutlined />}
                                size="small"
                                onClick={() => handleCopyDetails(viewingEvent)}
                                style={{ borderRadius: '8px' }}
                            >
                                Copy Info
                            </Button>
                        </div>

                        {/* Event Title */}
                        <Title level={4} style={{ marginTop: 0, marginBottom: '14px', fontWeight: 800, color: '#0f172a' }}>
                            {viewingEvent.title}
                        </Title>

                        {/* Description Box */}
                        <div
                            style={{
                                background: '#f8fafc',
                                borderRadius: '14px',
                                padding: '16px',
                                border: '1px solid #e2e8f0',
                                marginBottom: '20px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                <InfoCircleOutlined style={{ color: '#3b82f6' }} />
                                <Text strong style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569' }}>
                                    Notice Description & Details
                                </Text>
                            </div>
                            <Paragraph
                                style={{
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '14px',
                                    lineHeight: 1.65,
                                    color: '#334155',
                                    margin: 0,
                                }}
                            >
                                {viewingEvent.description || 'No detailed description provided.'}
                            </Paragraph>
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <Button
                                onClick={handleCloseModal}
                                style={{
                                    borderRadius: '10px',
                                    height: '38px',
                                    padding: '0 20px',
                                    fontWeight: 600,
                                }}
                            >
                                Close
                            </Button>
                            <Button
                                type="primary"
                                onClick={() => handleCopyDetails(viewingEvent)}
                                icon={<CopyOutlined />}
                                style={{
                                    borderRadius: '10px',
                                    height: '38px',
                                    padding: '0 18px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    border: 'none',
                                }}
                            >
                                Copy Details
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TeacherEvents;
