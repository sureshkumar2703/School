

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, Empty, Image, Tag, Space, Row, Col, Button, Modal } from 'antd';
import type { RootState } from '../../store/store';
import dayjs from 'dayjs';
import type { Event } from '../../store/features/events/eventsSlice';

const { Title, Text, Paragraph } = Typography;

const EventCard: React.FC<{ event: Event; onPreview: (event: Event) => void; isViewed: boolean }> = ({ event, onPreview, isViewed }) => {
    const cardStyle: React.CSSProperties = {
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isViewed ? '0 2px 8px rgba(0,0,0,0.09)' : '0 8px 24px rgba(149, 157, 165, 0.2)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        background: isViewed ? '#fff' : 'linear-gradient(135deg, #e6f7ff 0%, #f0f5ff 100%)',
    };

    const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent any parent handlers from firing
        onPreview(event);
    };

    return (
        <Card
            hoverable
            style={cardStyle}
            bodyStyle={{ padding: '24px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ flexGrow: 1 }}>
                <Row justify="space-between" align="top">
                    <Col>
                        <Tag color={isViewed ? 'default' : 'blue'}>
                            {dayjs(event.event_date).format('MMM D, YYYY')}
                        </Tag>
                    </Col>
                    <Col>
                        {event.status && <Tag color={isViewed ? 'default' : 'green'}>{event.status}</Tag>}
                    </Col>
                </Row>
                <Title level={5} ellipsis={{ tooltip: event.title, rows: 2 }} style={{ marginTop: '12px', minHeight: '44px' }}>
                    {event.title}
                </Title>
                <Paragraph ellipsis={{ rows: 2, tooltip: true }} type="secondary">
                    {event.description}
                </Paragraph>
            </div>
            <Row justify="end" style={{ marginTop: '16px' }}>
                <Col>
                    <Button type="primary" onClick={handleButtonClick} ghost={isViewed}>
                        Read more
                    </Button>
                </Col>
            </Row>
        </Card>
    );
};


const TeacherEvents: React.FC = () => {
    const { events, loading, error } = useSelector((state: RootState) => state.events);
    const { user } = useSelector((state: RootState) => state.auth);
    const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
    const [viewedEvents, setViewedEvents] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user?.id) {
            const viewed = localStorage.getItem(`viewedEvents_${user.id}`);
            if (viewed) {
                setViewedEvents(new Set(JSON.parse(viewed)));
            }
        }
    }, [user?.id]);
    
    useEffect(() => {
        if (user?.id && events.length > 0) {
            const upcomingEventIds = events.filter(e => e.status === 'Upcoming').map(e => e.id);
            const viewedSet = new Set(viewedEvents);
            
            let changed = false;
            upcomingEventIds.forEach(id => {
                if (!viewedSet.has(id)) {
                    // Mark all visible as viewed upon loading the page
                    viewedSet.add(id);
                    changed = true;
                }
            });

            if (changed) {
                const newViewedArray = Array.from(viewedSet);
                setViewedEvents(new Set(newViewedArray));
                localStorage.setItem(`viewedEvents_${user.id}`, JSON.stringify(newViewedArray));
                // Dispatch a custom event that the sidebar can listen to
                window.dispatchEvent(new Event('storage'));
            }
        }
    }, [user?.id, events]);


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

    return (
        <>
            <Card>
                <Title level={4}>Upcoming Events & Notices</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Stay updated with the latest events and announcements from your organization.
                </Text>

                {loading && <Spin tip="Loading events..." fullscreen />}
                {error && <Alert message="Error Fetching Events" description={error} type="error" showIcon />}

                {!loading && !error && events.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {events.map(item => (
                            <Col xs={24} sm={12} md={8} key={item.id}>
                                <EventCard event={item} onPreview={handlePreview} isViewed={viewedEvents.has(item.id)} />
                            </Col>
                        ))}
                    </Row>
                ) : (
                   !loading && !error && <Empty description="No events or notices have been posted for your organization yet." />
                )}
            </Card>

            {viewingEvent && (
                 <Modal
                    title={<Title level={4}>{viewingEvent.title}</Title>}
                    open={!!viewingEvent}
                    onCancel={handleCloseModal}
                    footer={[
                        <Button key="close" onClick={handleCloseModal}>
                            Close
                        </Button>,
                    ]}
                    width={700}
                >
                    {viewingEvent.image_url && (
                        <Image 
                            alt={viewingEvent.title} 
                            src={viewingEvent.image_url} 
                            style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: '8px', marginBottom: '24px' }}
                        />
                    )}
                    <Space direction="vertical" size="middle" style={{width: '100%'}}>
                        <Row justify="space-between">
                            <Col>
                                <Text strong>Status: </Text>
                                <Tag color={viewingEvent.status === 'Upcoming' ? 'blue' : 'green'}>{viewingEvent.status}</Tag>
                            </Col>
                            <Col>
                                <Text strong>Date of Event: </Text>
                                <Text type="secondary">{dayjs(viewingEvent.event_date).format('MMMM D, YYYY')}</Text>
                            </Col>
                        </Row>
                        <div>
                             <Title level={5}>Description</Title>
                             <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{viewingEvent.description}</Paragraph>
                        </div>
                    </Space>
                </Modal>
            )}
        </>
    );
};

export default TeacherEvents;
