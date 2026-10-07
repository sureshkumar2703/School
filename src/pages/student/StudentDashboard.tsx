import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Col, Row, Typography, Spin, Avatar, Carousel } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { fetchMainImagesRequest } from '../../store/features/main-images/mainImagesSlice';
import dayjs from 'dayjs';
import { supabase } from '../../service/supabaseClient';

const { Title, Text } = Typography;

const StudentDashboard: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetable, mappings, loading } = useSelector((state: RootState) => state.studentDashboard);
    const { images: mainImages, loading: imagesLoading } = useSelector((state: RootState) => state.mainImages);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);
    const currentDate = dayjs().format('MMMM D, YYYY');
    
    useEffect(() => {
        if (user?.organization_key && user?.register_no && user?.academic_year) {
            const fetchSection = async () => {
                setLoadingSection(true);
                try {
                    const { data, error: sectionError } = await supabase
                        .from('class_section_allocations')
                        .select('section_name')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', user.academic_year)
                        .single();
                    if (sectionError && sectionError.code !== 'PGRST116') throw sectionError;
                    if (data) setSection(data.section_name);
                } catch (err) {
                    console.error("Error fetching student section:", err);
                } finally {
                    setLoadingSection(false);
                }
            };
            fetchSection();
        } else {
            setLoadingSection(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && user?.academic_year) {
            dispatch(fetchStudentDashboardDataRequest({
                organizationKey: user.organization_key,
                className: user.admitted_class,
                sectionName: section,
                academicYear: user.academic_year,
            }));
             dispatch(fetchMainImagesRequest(user.organization_key));
        }
    }, [dispatch, user, section]);

    const isLoading = loading || imagesLoading || loadingSection;

    return (
        <Spin spinning={isLoading} tip="Loading dashboard...">
             <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                 {mainImages.length > 0 && (
                    <Card style={{ marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} bodyStyle={{padding: 0}}>
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
                <Card style={{ backgroundColor: '#E9F5FE', borderRadius: '16px', color: '#1E88E5', marginBottom: 24, padding: '12px' }}>
                    <Row align="middle" justify="space-between">
                        <Col xs={24}>
                            <div style={{ padding: '12px' }}>
                                <Text style={{ color: '#1E88E5', display: 'block', marginBottom: '16px' }}>{currentDate}</Text>
                                <Title level={2} style={{ color: '#003A6B', margin: 0 }}>Welcome back, {user?.full_name || 'Student'}!</Title>
                                <Text style={{ color: '#1E88E5', fontSize: '16px', opacity: 0.8 }}>
                                    Always stay updated in your student portal
                                </Text>
                            </div>
                        </Col>
                    </Row>
                </Card>

                <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                        <Card title="My Class Teacher">
                            <Text>{mappings.find(m => m.role === 'Class Teacher')?.teacher_name || 'Not Assigned'}</Text>
                        </Card>
                    </Col>
                    <Col xs={24} md={12}>
                        <Card title="Today's Timetable">
                            <Text>{timetable ? `You have ${timetable?.timetable_data?.length} periods today.` : 'No timetable available.'}</Text>
                        </Card>
                    </Col>
                </Row>
            </div>
        </Spin>
    );
};

export default StudentDashboard;
