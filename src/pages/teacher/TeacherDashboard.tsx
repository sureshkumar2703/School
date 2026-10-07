

import { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Col, Row, Typography, Spin, Space, Button, Carousel } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import { fetchEventsRequest } from '../../store/features/events/eventsSlice';
import { fetchMainImagesRequest } from '../../store/features/main-images/mainImagesSlice';
import dayjs from 'dayjs';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';

const { Title, Text, Link } = Typography;

const LaptopIcon = () => (
    <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="15" y="25" width="70" height="45" rx="5" fill="#E9F5FE"/>
        <path d="M15 70H85L80 75H20L15 70Z" fill="#B3DDFB"/>
        <rect x="20" y="30" width="60" height="35" rx="3" fill="#1E88E5"/>
    </svg>
);

const ChartIcon = () => (
     <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="25" y="55" width="10" height="20" rx="3" fill="#B3DDFB"/>
        <rect x="45" y="45" width="10" height="30" rx="3" fill="#69B5F7"/>
        <rect x="65" y="35" width="10" height="40" rx="3" fill="#1E88E5"/>
    </svg>
);

const EventsIcon = () => (
    <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="20" y="25" width="60" height="50" rx="5" fill="#E9F5FE"/>
        <path d="M20 30C20 27.2386 22.2386 25 25 25H75C77.7614 25 80 27.2386 80 30V35H20V30Z" fill="#1E88E5"/>
        <line x1="35" y1="20" x2="35" y2="35" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round"/>
        <line x1="65" y1="20" x2="65" y2="35" stroke="#1E88E5" strokeWidth="4" strokeLinecap="round"/>
    </svg>
);


const StatCard = ({ title, value, page, icon, disabled = false }: { title: string, value: string, page: string, icon: React.ReactNode, disabled?: boolean }) => {
    const dispatch: AppDispatch = useDispatch();
    const handleNavigation = () => {
        dispatch(setCurrentPage(page as any));
    };

    return (
        <Card style={{ background: '#FFF', borderRadius: '16px', border: '1px solid #f0f0f0', height: '100%' }} styles={{ body: { padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' } }}>
            <div>
                <Title level={5} style={{ margin: 0, fontWeight: '600', color: '#003A6B' }}>{title}</Title>
                <Text type="secondary" style={{ display: 'block', marginTop: '8px', fontSize: '16px', fontWeight: '500' }}>{value}</Text>
            </div>
            <Row align="middle" justify="space-between" style={{ marginTop: '24px' }}>
                <Col>
                    <Button type="primary" onClick={handleNavigation} style={{ borderRadius: '20px', padding: '0 24px' }} disabled={disabled}>View</Button>
                </Col>
                <Col>
                    {icon}
                </Col>
            </Row>
        </Card>
    );
};


const SubjectCard = ({ title, page }: { title: string, page: string }) => {
    const dispatch: AppDispatch = useDispatch();
    const handleNavigation = () => {
        dispatch(setCurrentPage(page as any));
    };
    
    return (
        <Card hoverable onClick={handleNavigation} style={{ borderRadius: '16px', border: '1px solid #f0f0f0' }} styles={{ body: { padding: '24px' } }}>
            <Row align="middle" justify="space-between">
                <Col>
                    <Title level={5} style={{ margin: 0, fontWeight: '600' }}>{title}</Title>
                </Col>
                <Col>
                    <Space align="center" size="large">
                        <LaptopIcon />
                        <Button type="text" shape="circle" icon={<RightOutlined />} style={{ color: '#1E88E5' }} />
                    </Space>
                </Col>
            </Row>
        </Card>
    )
};


const TeacherDashboard: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, loading: statsLoading } = useSelector((state: RootState) => state.teacherStats);
    const { events, loading: eventsLoading } = useSelector((state: RootState) => state.events);
    const { images: mainImages, loading: imagesLoading } = useSelector((state: RootState) => state.mainImages);
    const currentDate = dayjs().format('MMMM D, YYYY');

    useEffect(() => {
        if (user?.organization_key && user?.full_name) {
            dispatch(fetchTeacherStatsRequest({
                organizationKey: user.organization_key,
                teacherName: user.full_name,
            }));
            dispatch(fetchEventsRequest(user.organization_key));
            dispatch(fetchMainImagesRequest(user.organization_key));
        }
    }, [dispatch, user]);

    const myClassStudentCount = useMemo(() => {
        if (!stats.classTeacherAssignment) return 'Not Assigned';
        const { male_students, female_students } = stats.classTeacherAssignment;
        return `M: ${male_students} | F: ${female_students}`;
    }, [stats.classTeacherAssignment]);

    const loading = statsLoading || eventsLoading || imagesLoading;
    const eventCount = events.filter(e => e.status === 'Upcoming').length;

    return (
        <Spin spinning={loading} tip="Loading dashboard...">
             <div style={{ maxWidth: '100%', margin: '0 auto' }}>
                 {mainImages.length > 0 && (
                    <Card style={{ marginBottom: 24, borderRadius: 0, border: 'none' }} styles={{ body: {padding: 0} }}>
                        <Carousel autoplay>
                            {mainImages.map(image => (
                                <div key={image.id}>
                                    <img 
                                        src={image.image_url} 
                                        alt="Main Banner" 
                                        style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                                    />
                                </div>
                            ))}
                        </Carousel>
                    </Card>
                )}
                
                <div style={{ padding: '0 24px 24px 24px' }}>
                    <Card style={{ backgroundColor: '#E9F5FE', borderRadius: '16px', marginBottom: 24, padding: '12px', border: 'none' }}>
                        <div style={{ padding: '12px' }}>
                            <Text style={{ color: '#1E88E5', display: 'block', marginBottom: '4px', fontSize: '12px' }}>{currentDate.toLocaleUpperCase()}</Text>
                            <Title level={2} style={{ color: '#003A6B', margin: 0, fontWeight: 'bold' }}>Welcome back, {user?.full_name?.split(' ')[0] || 'Teacher'}!</Title>
                            <Text style={{ color: '#1E88E5', fontSize: '16px', opacity: 0.8 }}>
                                Always stay updated in your teacher portal
                            </Text>
                        </div>
                    </Card>

                    <Row gutter={[24, 24]}>
                        <Col xs={24} md={8}>
                            <StatCard 
                                title="My Class Students"
                                value={myClassStudentCount}
                                page="myclassstudents"
                                icon={<LaptopIcon />}
                                disabled={!stats.classTeacherAssignment}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <StatCard 
                                title="My Total Classes"
                                value={`${stats.totalClasses} classes`}
                                page="myclasses"
                                icon={<ChartIcon />}
                            />
                        </Col>
                        <Col xs={24} md={8}>
                            <StatCard 
                               title="Upcoming Events"
                               value={`${eventCount} new events`}
                               page="teacherEvents"
                               icon={<EventsIcon />}
                            />
                        </Col>
                    </Row>

                    <div style={{ marginTop: '48px' }}>
                        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                            <Col>
                                <Title level={4} style={{ margin: 0 }}>Enrolled Courses</Title>
                            </Col>
                            <Col>
                                <Link onClick={() => dispatch(setCurrentPage('myclasses'))} style={{ color: '#1E88E5' }}>See all <RightOutlined /></Link>
                            </Col>
                        </Row>
                        <Spin spinning={loading}>
                             <Row gutter={[24, 24]}>
                                {stats.subjects && stats.subjects.length > 0 ? stats.subjects.slice(0, 2).map((subject) => (
                                     <Col xs={24} md={12} key={subject}>
                                        <SubjectCard title={subject} page="classnotes" />
                                    </Col>
                                )) : (
                                    <Col span={24}>
                                        <Card style={{ borderRadius: '16px' }}>
                                            <Text type="secondary">You are not yet enrolled in any courses for the current academic year.</Text>
                                        </Card>
                                    </Col>
                                )}
                            </Row>
                        </Spin>
                    </div>
                </div>
            </div>
        </Spin>
    );
};

export default TeacherDashboard;
