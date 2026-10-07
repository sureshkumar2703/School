

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Card, Typography, Spin, Alert, Empty, Row, Col, Button, Space, Modal, message, List, Tag, Badge } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { supabase } from '../../service/supabaseClient';
import { BookOutlined, ArrowRightOutlined, CalendarOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { fetchStudentHomeTestsRequest, type HomeTest } from '../../store/features/home-test/homeTestSlice';
import dayjs from 'dayjs';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import type { Question } from '../../store/features/question-bank/questionBankSlice';
import { saveHomeTestReportRequest, fetchHomeTestReportsRequest } from '../../store/features/home-test-report/homeTestReportSlice';


const { Title, Text } = Typography;

const StudentHomeTest: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading, error } = useSelector((state: RootState) => state.studentDashboard);
    const { studentHomeTests, loading: homeTestLoading } = useSelector((state: RootState) => state.homeTest);
    const { reports: homeTestReports } = useSelector((state: RootState) => state.homeTestReport);
    const { subjects } = useSelector((state: RootState) => state.subjects);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedSubjectTests, setSelectedSubjectTests] = useState<HomeTest[]>([]);
    const [selectedSubjectName, setSelectedSubjectName] = useState<string | null>(null);
    const [isQuestionModalVisible, setIsQuestionModalVisible] = useState(false);
    const [selectedTestForQuestions, setSelectedTestForQuestions] = useState<HomeTest | null>(null);


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
                    if (data) {
                        setSection(data.section_name);
                    }
                } catch (err: any) {
                    console.error("Error fetching student section:", err.message);
                    message.error("Could not determine your class section.");
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
        if (user?.organization_key) {
            dispatch(fetchSubjectsRequest());
            dispatch(fetchStudentHomeTestsRequest({
                organizationKey: user.organization_key,
            }));
            dispatch(fetchHomeTestReportsRequest({ studentId: user.id! }));
            
            // Real-time subscription
            const channel = supabase
                .channel('home-tests-realtime')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'home_test', 
                    filter: `organization_key=eq.${user.organization_key}` 
                }, 
                (payload) => {
                    console.log('Real-time change received!', payload);
                    // Re-fetch tests and reports on any change
                    dispatch(fetchStudentHomeTestsRequest({ organizationKey: user.organization_key! }));
                    dispatch(fetchHomeTestReportsRequest({ studentId: user.id! }));
                })
                .subscribe();

            // Cleanup subscription on component unmount
            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [dispatch, user?.organization_key, user?.id]);
    
    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && user?.academic_year) {
            dispatch(fetchStudentDashboardDataRequest({
                organizationKey: user.organization_key,
                className: user.admitted_class,
                sectionName: section,
                academicYear: user.academic_year,
            }));
        }
    }, [dispatch, user, section]);

    const subjectsForClass = useMemo(() => {
        if (!mappings || mappings.length === 0) return [];
        const subjectNames = [...new Set(mappings.map(m => m.subject_name))];
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [mappings, subjects]);
    
    const viewedTestIds = useMemo(() => {
        return new Set(homeTestReports.map(r => r.home_test_id));
    }, [homeTestReports]);

    const isLoading = loading || loadingSection || homeTestLoading;

    const gradients = [
        'linear-gradient(135deg, #E9F5FE 0%, #D4E9F7 100%)',
        'linear-gradient(135deg, #E8F5E9 0%, #D0E9D1 100%)',
        'linear-gradient(135deg, #FFF8E1 0%, #FFEFCA 100%)',
        'linear-gradient(135deg, #F3E5F5 0%, #EAD6ED 100%)',
    ];

    const cardStyle = (index: number): React.CSSProperties => ({
        background: gradients[index % gradients.length],
        borderRadius: '20px',
        padding: '24px',
        color: '#333',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
        position: 'relative',
        overflow: 'hidden',
    });
    
    const cardPseudoElementStyle: React.CSSProperties = {
        content: '""',
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '150px',
        height: '150px',
        background: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '50%',
    };

    const handleViewTests = (subjectName: string, subjectCode: string) => {
        if (!user?.admitted_class || !section || !user?.academic_year) {
            message.error("Your class details are not available.");
            return;
        }

        const testsForSubject = studentHomeTests.filter(test =>
            test.subject_code === subjectCode &&
            test.class_name === user.admitted_class &&
            test.section_name === section &&
            test.academic_year === user.academic_year
        );
        
        if (testsForSubject.length > 0) {
            const sortedTests = testsForSubject.sort((a, b) => dayjs(b.test_date).diff(dayjs(a.test_date)));
            setSelectedSubjectTests(sortedTests);
            setSelectedSubjectName(subjectName);
            setIsModalVisible(true);
        } else {
            message.info('No home tests are available for this subject at the moment.');
        }
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setSelectedSubjectTests([]);
        setSelectedSubjectName(null);
    };

    const handleQuestionModalClose = () => {
        setIsQuestionModalVisible(false);
        setSelectedTestForQuestions(null);
    };
    
    const handleViewQuestionClick = (test: HomeTest) => {
        setSelectedTestForQuestions(test);
        setIsQuestionModalVisible(true);
        
        const alreadyViewed = homeTestReports.some(report => report.home_test_id === test.id);
        
        if (!alreadyViewed && user) {
            const reportPayload = {
                organization_key: user.organization_key!,
                academic_year: test.academic_year,
                class_name: test.class_name,
                section_name: test.section_name,
                subject: test.subject_code,
                unit: test.unit,
                total_marks: test.total_marks,
                questions: test.questions,
                student_id: user.id,
                student_name: user.full_name,
                roll_no: user.roll_no,
                register_no: user.register_no,
                get_mark: null,
                home_test_id: test.id,
            };
            dispatch(saveHomeTestReportRequest(reportPayload as any));
        }
    };


    if (isLoading) {
        return <Spin tip="Loading subjects and tests..." fullscreen />;
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    return (
        <>
            <Card>
                <Title level={4}>Home Tests</Title>
                <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                    Select a subject to view available home tests.
                </Text>

                {subjectsForClass.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {subjectsForClass.map((subject, index) => {
                            const testsForSubject = studentHomeTests.filter(test =>
                                test.subject_code === subject.subject_code &&
                                test.class_name === user?.admitted_class &&
                                test.section_name === section &&
                                test.academic_year === user?.academic_year
                            );
                            
                            const newTestCount = testsForSubject.filter(t => !viewedTestIds.has(t.id)).length;

                            return (
                                <Col xs={24} sm={12} key={subject.id}>
                                    <Badge count={newTestCount} style={{ right: 20, top: 20 }}>
                                        <div style={cardStyle(index)}>
                                        <div style={cardPseudoElementStyle}></div>
                                            <div>
                                                <Space direction="vertical">
                                                    <BookOutlined style={{ fontSize: '24px', color: '#00000080' }} />
                                                    <Title level={4} style={{ color: '#333', margin: 0 }}>{subject.subject_name}</Title>
                                                </Space>
                                            </div>
                                            <Row justify="end" align="bottom" style={{marginTop: '24px'}}>
                                                <Col>
                                                <Button 
                                                        type="primary" 
                                                        ghost 
                                                        style={{ borderRadius: '16px', borderColor: '#33333380', color: '#333' }}
                                                        onClick={() => handleViewTests(subject.subject_name, subject.subject_code)}
                                                    >
                                                        View Tests <ArrowRightOutlined />
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </div>
                                    </Badge>
                                </Col>
                            );
                        })}
                    </Row>
                ) : (
                    <Empty description="No subjects found for your class." />
                )}
            </Card>
            
            <Modal
                title={`Available Home Tests for ${selectedSubjectName}`}
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={[
                    <Button key="close" onClick={handleModalClose}>
                        Close
                    </Button>
                ]}
                width={800}
            >
                <List
                    itemLayout="vertical"
                    dataSource={selectedSubjectTests}
                    renderItem={item => {
                         const hasViewed = viewedTestIds.has(item.id);
                         const cardBackground = hasViewed ? '#f5f5f5' : '#e6f7ff';
                         const cardBorder = hasViewed ? '1px solid #d9d9d9' : '1px solid #91d5ff';
                        return (
                             <List.Item>
                                <Card style={{ backgroundColor: cardBackground, borderRadius: '8px', border: cardBorder }}>
                                    <Row justify="space-between" align="middle" gutter={16}>
                                        <Col>
                                            <Tag icon={<CalendarOutlined />}>
                                                {dayjs(item.test_date).format('DD MMM YYYY')}
                                            </Tag>
                                        </Col>
                                        <Col>
                                            <Text strong>Unit: {item.unit}</Text>
                                        </Col>
                                        <Col>
                                            <Tag icon={<CheckCircleOutlined />} color="green">
                                                Marks: {item.total_marks}
                                            </Tag>
                                        </Col>
                                         <Col>
                                            <Button type="default" icon={<EyeOutlined />} onClick={() => handleViewQuestionClick(item)}>View Question</Button>
                                        </Col>
                                    </Row>
                                </Card>
                            </List.Item>
                        )
                    }}
                />
            </Modal>
             <Modal
                title="Question Paper"
                open={isQuestionModalVisible}
                onCancel={handleQuestionModalClose}
                footer={[<Button key="close" onClick={handleQuestionModalClose}>Close</Button>]}
                width="90%"
                style={{ top: 20 }}
            >
                {selectedTestForQuestions && (
                    <div>
                        <Row justify="space-between" style={{ marginBottom: 16 }}>
                            <Col><Text strong>Subject: {subjects.find(s => s.subject_code === selectedTestForQuestions.subject_code)?.subject_name}</Text></Col>
                            <Col><Text strong>Unit: {selectedTestForQuestions.unit}</Text></Col>
                            <Col><Text strong>Total Marks: {selectedTestForQuestions.total_marks}</Text></Col>
                        </Row>
                        <div style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px', background: '#f5f5f5', borderRadius: '4px' }}>
                            {Object.entries(selectedTestForQuestions.questions).map(([partName, questions]) => (
                                <div key={partName} style={{ marginBottom: 24 }}>
                                    <Title level={5}>Part {partName}</Title>
                                    {(questions as Question[]).map((q, index) => (
                                        <div key={q.id} style={{ marginBottom: 12 }}>
                                            <Text>{index + 1}. {q.question}</Text>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default StudentHomeTest;
