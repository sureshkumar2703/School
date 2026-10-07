
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, List, Button, Empty, Row, Col, Modal, Tag, Descriptions, Select, Divider, Space, Avatar } from 'antd';
import { ReadOutlined, CalendarOutlined, CheckCircleOutlined, UserOutlined, AppstoreOutlined, FormOutlined, RightOutlined, BookOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchMcqResultsRequest, type McqTestResult } from '../../store/features/mcq-results/mcqResultsSlice';
import dayjs from 'dayjs';
import type { QuestionResult } from '../../store/features/mcq-test-history/mcqTestHistorySlice';


const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// A new reusable StatCard component based on your design
const StatCard = ({ title, submissions, avgScore, onClick }: { title: string, submissions: number, avgScore: string, onClick: () => void }) => (
    <Card hoverable onClick={onClick} style={{ borderRadius: 16, border: '1px solid #e0e0e0', background: 'linear-gradient(135deg, #f0fff4 0%, #e6f7ff 100%)' }} bodyStyle={{ padding: '24px' }}>
        <Row justify="space-between" align="top">
            <Col>
                <Title level={4} style={{ margin: 0 }}>{title}</Title>
                <Text type="secondary">Class Report</Text>
            </Col>
            <Col>
                 <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <FormOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                </div>
            </Col>
        </Row>
        <Divider style={{ margin: '16px 0' }}/>
        <Row justify="space-between">
            <Col><Text>Total Submissions</Text></Col>
            <Col><Text strong>{submissions}</Text></Col>
        </Row>
        <Row justify="space-between" style={{marginTop: '8px'}}>
            <Col><Text>Average Score</Text></Col>
            <Col><Text strong>{avgScore}%</Text></Col>
        </Row>
        <Divider style={{ margin: '16px 0' }}/>
        <Row align="middle">
             <Col>
                <Text type="secondary" style={{ fontSize: 12 }}>View detailed section & subject reports</Text>
             </Col>
        </Row>
    </Card>
);


const MCQTestReport: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { results, loading, error } = useSelector((state: RootState) => state.mcqResults);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [modalState, setModalState] = useState({
        sectionVisible: false,
        subjectVisible: false,
        studentListVisible: false,
        studentReportVisible: false,
        questionDetailVisible: false,
    });
    const [selectedData, setSelectedData] = useState<{
        className: string;
        sectionName: string;
        subject: string;
        student: McqTestResult['student'] | null;
        session: McqTestResult | null;
    }>({
        className: '',
        sectionName: '',
        subject: '',
        student: null,
        session: null,
    });

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchMcqResultsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const academicYears = useMemo(() => {
        if (!results) return [];
        return [...new Set(results.map(s => s.academic_year))].sort((a, b) => b.localeCompare(a));
    }, [results]);

    useEffect(() => {
        if (academicYears.length > 0 && !selectedYear) {
            setSelectedYear(academicYears[0]);
        }
    }, [academicYears, selectedYear]);

    const classesForYear = useMemo(() => {
        if (!selectedYear) return [];
        const filtered = results.filter(s => s.academic_year === selectedYear);
        const classStats = new Map<string, { submissions: number, totalScore: number, count: number }>();
        
        filtered.forEach(res => {
            if (!classStats.has(res.class_name)) {
                classStats.set(res.class_name, { submissions: 0, totalScore: 0, count: 0 });
            }
            const stats = classStats.get(res.class_name)!;
            stats.submissions += 1;
            stats.totalScore += (res.score / res.total_questions);
            stats.count += 1;
        });

        return Array.from(classStats.entries()).map(([className, stats]) => ({
            name: className,
            submissions: stats.submissions,
            avgScore: (stats.count > 0 ? (stats.totalScore / stats.count) * 100 : 0).toFixed(2),
        }));

    }, [results, selectedYear]);

    const sectionsForClass = useMemo(() => {
        if (!selectedData.className) return [];
        const filtered = results.filter(s => s.academic_year === selectedYear && s.class_name === selectedData.className);
        return [...new Set(filtered.map(s => s.section_name))].sort();
    }, [results, selectedYear, selectedData.className]);
    
    const subjectsForSection = useMemo(() => {
        if (!selectedData.sectionName) return [];
        const filtered = results.filter(s => s.academic_year === selectedYear && s.class_name === selectedData.className && s.section_name === selectedData.sectionName);
        return [...new Set(filtered.map(s => s.subject))].sort();
    }, [results, selectedYear, selectedData.className, selectedData.sectionName]);
    
    const studentsForSubject = useMemo(() => {
        if (!selectedData.subject) return [];
        const uniqueStudents = new Map<string, McqTestResult['student']>();
        results
            .filter(s => 
                s.academic_year === selectedYear &&
                s.class_name === selectedData.className &&
                s.section_name === selectedData.sectionName &&
                s.subject === selectedData.subject
            )
            .forEach(session => {
                if (session.student && !uniqueStudents.has(session.student.student_id)) {
                    uniqueStudents.set(session.student.student_id, session.student);
                }
            });
        return Array.from(uniqueStudents.values());
    }, [results, selectedYear, selectedData]);

    const studentTestSessions = useMemo(() => {
        if (!selectedData.student) return [];
        const studentId = selectedData.student.student_id;
        return results
            .filter(session =>
                session.academic_year === selectedYear &&
                session.class_name === selectedData.className &&
                session.section_name === selectedData.sectionName &&
                session.subject === selectedData.subject &&
                session.student?.student_id === studentId
            )
            .sort((a, b) => dayjs(b.test_date).diff(dayjs(a.test_date)));
    }, [results, selectedData, selectedYear]);

    const openModal = (modal: keyof typeof modalState, data?: Partial<typeof selectedData>) => {
        setModalState(prev => ({ ...prev, [modal]: true }));
        if (data) {
            setSelectedData(prev => ({ ...prev, ...data }));
        }
    };

    const closeModal = (modal: keyof typeof modalState) => {
        setModalState(prev => ({ ...prev, [modal]: false }));
        if (modal === 'sectionVisible') setSelectedData(prev => ({...prev, className: ''}));
        if (modal === 'subjectVisible') setSelectedData(prev => ({...prev, sectionName: ''}));
        if (modal === 'studentListVisible') setSelectedData(prev => ({...prev, subject: ''}));
        if (modal === 'studentReportVisible') setSelectedData(prev => ({...prev, student: null}));
        if (modal === 'questionDetailVisible') setSelectedData(prev => ({...prev, session: null}));
    };

    return (
        <>
            <Card>
                <Title level={4}>MCQ Test Report</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Drill down from academic year to individual student reports.
                </Text>
                <Select
                    showSearch
                    placeholder="Select Academic Year"
                    style={{ width: '100%', maxWidth: '300px', marginBottom: '24px' }}
                    value={selectedYear}
                    onChange={setSelectedYear}
                    loading={loading}
                    options={academicYears.map(year => ({ label: year, value: year }))}
                />

                <Spin spinning={loading}>
                    {error && <Alert message="Error fetching test data" description={error} type="error" showIcon />}
                    {selectedYear && !loading ? (
                        <Row gutter={[24, 24]}>
                            {classesForYear.length > 0 ? classesForYear.map(classInfo => (
                                <Col xs={24} sm={12} md={8} key={classInfo.name}>
                                    <StatCard 
                                        title={classInfo.name} 
                                        submissions={classInfo.submissions}
                                        avgScore={classInfo.avgScore}
                                        onClick={() => openModal('sectionVisible', { className: classInfo.name })}
                                    />
                                </Col>
                            )) : <Col span={24}><Empty description="No test data found for the selected academic year." /></Col>}
                        </Row>
                    ) : <Empty description="Please select an academic year to view classes." />}
                </Spin>
            </Card>

            <Modal title={`Sections for ${selectedData.className}`} open={modalState.sectionVisible} onCancel={() => closeModal('sectionVisible')} footer={null}>
                <List
                    dataSource={sectionsForClass}
                    renderItem={sectionName => (
                        <List.Item style={{padding: '8px 0', borderBlockEnd: '1px solid #f0f0f0'}}>
                            <Card hoverable onClick={() => openModal('subjectVisible', { sectionName })} bodyStyle={{ padding: '16px', width: '100%' }}>
                                <Row justify="space-between" align="middle">
                                    <Col>
                                        <Space>
                                            <AppstoreOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
                                            <Text strong>{sectionName}</Text>
                                        </Space>
                                    </Col>
                                    <Col>
                                        <RightOutlined style={{ color: '#ccc' }} />
                                    </Col>
                                </Row>
                            </Card>
                        </List.Item>
                    )}
                    style={{paddingTop: '16px'}}
                />
            </Modal>
            
            <Modal title={`Subjects for ${selectedData.className} - ${selectedData.sectionName}`} open={modalState.subjectVisible} onCancel={() => closeModal('subjectVisible')} footer={null}>
                 <List
                    dataSource={subjectsForSection}
                    renderItem={subject => (
                        <List.Item style={{padding: '8px 0', borderBlockEnd: '1px solid #f0f0f0'}}>
                            <Card hoverable onClick={() => openModal('studentListVisible', { subject })} bodyStyle={{ padding: '16px', width: '100%' }}>
                                <Row justify="space-between" align="middle">
                                    <Col>
                                        <Space>
                                            <BookOutlined style={{fontSize: '20px', color: '#52c41a'}}/>
                                            <Text strong>{subject}</Text>
                                        </Space>
                                    </Col>
                                     <Col>
                                        <RightOutlined style={{ color: '#ccc' }} />
                                    </Col>
                                </Row>
                            </Card>
                        </List.Item>
                    )}
                    style={{paddingTop: '16px'}}
                />
            </Modal>
            
            <Modal title={`Student Submissions for ${selectedData.subject}`} open={modalState.studentListVisible} onCancel={() => closeModal('studentListVisible')} footer={null} width={800}>
                <List
                    dataSource={studentsForSubject}
                    renderItem={student => (
                         <List.Item actions={[<Button onClick={() => openModal('studentReportVisible', { student })}>View Tests</Button>]}>
                            <List.Item.Meta
                                avatar={<Avatar icon={<UserOutlined />} />}
                                title={student.student_name}
                                description={`Roll No: ${student.roll_no || 'N/A'}`}
                            />
                        </List.Item>
                    )}
                />
            </Modal>
            
            <Modal title={`Test History for ${selectedData.student?.student_name}`} open={modalState.studentReportVisible} onCancel={() => closeModal('studentReportVisible')} footer={null} width="90%">
                <List
                    dataSource={studentTestSessions}
                    renderItem={session => (
                        <List.Item>
                            <Card style={{width: '100%'}}>
                                <Row align="middle" justify="space-between">
                                    <Col><Tag icon={<CalendarOutlined />}>{dayjs(session.test_date).format('DD MMM YYYY')}</Tag></Col>
                                    <Col><Tag icon={<CheckCircleOutlined />} color="green">Score: {session.score}/{session.total_questions}</Tag></Col>
                                    <Col><Button size="small" onClick={() => openModal('questionDetailVisible', { session })}>View Questions</Button></Col>
                                </Row>
                            </Card>
                        </List.Item>
                    )}
                />
            </Modal>
            
             <Modal title="Detailed Test Report" open={modalState.questionDetailVisible} onCancel={() => closeModal('questionDetailVisible')} footer={null} width="90%">
                {selectedData.session && (
                    <>
                        <Descriptions bordered size="small" column={2} style={{marginBottom: '24px'}}>
                            <Descriptions.Item label="Date">{dayjs(selectedData.session.test_date).format('DD MMM YYYY')}</Descriptions.Item>
                            <Descriptions.Item label="Time Taken">{selectedData.session.time_taken}</Descriptions.Item>
                            <Descriptions.Item label="Score" span={2}>
                                <Text strong style={{color: selectedData.session.score >= selectedData.session.total_questions / 2 ? 'green' : 'red' }}>
                                    {selectedData.session.score} / {selectedData.session.total_questions}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                        <List
                            bordered
                            dataSource={selectedData.session.questions}
                            renderItem={(item: QuestionResult, index) => {
                                const isCorrect = item.selected_answer === item.correct_answer;
                                return (
                                    <List.Item>
                                        <div>
                                            <Text strong>{`${index + 1}. ${item.question_text}`}</Text>
                                            <div style={{paddingLeft: '16px', marginTop: '8px'}}>
                                                 <Text type="secondary">Your Answer: </Text>
                                                 <Tag color={isCorrect ? 'success' : 'error'}>{item.selected_answer || 'Not Answered'}</Tag>
                                                 {!isCorrect && <><br/><Text type="secondary">Correct Answer: </Text><Tag color="blue">{item.correct_answer}</Tag></>}
                                            </div>
                                        </div>
                                    </List.Item>
                                )
                            }}
                        />
                    </>
                )}
            </Modal>
        </>
    );
};

export default MCQTestReport;
