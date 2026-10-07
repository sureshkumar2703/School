

import React, { useState, useEffect } from 'react';
import { Card, Typography, Spin, Alert, Empty, Tag, Button, Modal, List, Row, Col, Space, Divider } from 'antd';
import { CalendarOutlined, EyeOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchCircularsRequest, type Circular } from '../../store/features/circulars/circularsSlice';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

const CircularCard: React.FC<{ circular: Circular; onPreview: (circular: Circular) => void; isViewed: boolean; }> = ({ circular, onPreview, isViewed }) => {
    const cardStyle: React.CSSProperties = {
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: isViewed ? '0 2px 8px rgba(0,0,0,0.09)' : '0 8px 24px rgba(149, 157, 165, 0.2)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        background: isViewed ? '#fff' : 'linear-gradient(135deg, #FE6B8B 30%, #FF8E53 90%)',
    };

     const handleButtonClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onPreview(circular);
    };

    return (
        <Card
            hoverable
            style={cardStyle}
            bodyStyle={{ padding: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ padding: '24px', zIndex: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'rgba(255,255,255,0.8)', margin: '8px', borderRadius: '12px' }}>
                <div>
                    <Title level={5} style={{ color: isViewed ? '#555' : '#000', minHeight: '44px' }} ellipsis={{ rows: 2, tooltip: circular.title }}>
                        {circular.title}
                    </Title>
                    <Space wrap style={{ marginTop: '12px', marginBottom: '12px' }}>
                        {circular.audience.map(aud => <Tag key={aud}>{aud}</Tag>)}
                    </Space>
                    <Paragraph ellipsis={{ rows: 2 }} type="secondary">
                        {circular.content || 'No description available.'}
                    </Paragraph>
                </div>
                 <Row justify="space-between" align="middle" style={{ marginTop: 'auto' }}>
                    <Col>
                        <Tag icon={<CalendarOutlined />}>
                            {dayjs(circular.issue_date).format('MMM D, YYYY')}
                        </Tag>
                    </Col>
                    <Col>
                        <Button type="primary" size="small" onClick={handleButtonClick} ghost={isViewed}>
                           View Details
                        </Button>
                    </Col>
                </Row>
            </div>
        </Card>
    );
};


const ViewCirculars: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { circulars, loading, error } = useSelector((state: RootState) => state.circulars);
    const [previewingCircular, setPreviewingCircular] = useState<Circular | null>(null);
    const [viewedCirculars, setViewedCirculars] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (user?.id) {
            const viewed = localStorage.getItem(`viewedCirculars_${user.id}`);
            if (viewed) {
                setViewedCirculars(new Set(JSON.parse(viewed)));
            }
        }
    }, [user?.id]);


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchCircularsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const handlePreview = (circular: Circular) => {
        setPreviewingCircular(circular);
        if (user?.id && !viewedCirculars.has(circular.id)) {
            const newViewed = new Set(viewedCirculars).add(circular.id);
            setViewedCirculars(newViewed);
            localStorage.setItem(`viewedCirculars_${user.id}`, JSON.stringify(Array.from(newViewed)));
            // Dispatch a custom event that the sidebar can listen to
            window.dispatchEvent(new Event('storage'));
        }
    };

    const handleClosePreview = () => {
        setPreviewingCircular(null);
    };

    const relevantCirculars = circulars.filter(c => 
        c.audience.includes('All') || 
        (user?.role && c.audience.some(aud => aud.toLowerCase().includes(user.role.toLowerCase())))
    );

    return (
        <>
            <Card>
                <Title level={4}>Circulars & Announcements</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Important notices and announcements from the school administration.
                </Text>

                <Spin spinning={loading}>
                    {error && <Alert message="Error" description={error} type="error" showIcon closable />}
                    {!loading && !error && relevantCirculars.length > 0 ? (
                        <Row gutter={[24, 24]}>
                            {relevantCirculars.map(item => (
                                <Col xs={24} sm={12} md={8} key={item.id}>
                                    <CircularCard circular={item} onPreview={handlePreview} isViewed={viewedCirculars.has(item.id)} />
                                </Col>
                            ))}
                        </Row>
                    ) : (
                        !loading && !error && <Empty description="No circulars have been published for you yet." />
                    )}
                </Spin>
            </Card>
            
            <Modal
                title={previewingCircular?.title}
                open={!!previewingCircular}
                onCancel={handleClosePreview}
                footer={[<Button key="close" onClick={handleClosePreview}>Close</Button>]}
                width="90vw"
                style={{ top: 20 }}
                bodyStyle={{ height: '80vh', overflow: 'hidden', padding: 0 }}
            >
                {previewingCircular && (
                     previewingCircular.file_url ? (
                        <object
                            data={previewingCircular.file_url}
                            type="application/pdf"
                            width="100%"
                            height="100%"
                            aria-label={previewingCircular.title}
                        >
                            <div style={{ padding: '24px' }}>
                                <Text>It appears your browser does not support embedding this file type.</Text>
                                 <br />
                                 <a href={previewingCircular.file_url} download target="_blank" rel="noopener noreferrer">
                                    <Button type="link">Click here to download the file instead.</Button>
                                </a>
                            </div>
                        </object>
                     ) : (
                        <div style={{padding: '24px'}}>
                            <Paragraph>
                                <Text strong>Issued on:</Text> {dayjs(previewingCircular.issue_date).format('dddd, MMMM D, YYYY')}
                            </Paragraph>
                             <Paragraph>
                                <Text strong>Audience:</Text> {previewingCircular.audience.map(aud => <Tag key={aud}>{aud}</Tag>)}
                            </Paragraph>
                            <Divider />
                            <Paragraph style={{ whiteSpace: 'pre-wrap', background: '#fafafa', padding: '16px', borderRadius: '4px' }}>
                                {previewingCircular.content || 'No description provided.'}
                            </Paragraph>
                        </div>
                     )
                )}
            </Modal>
        </>
    );
};

export default ViewCirculars;


