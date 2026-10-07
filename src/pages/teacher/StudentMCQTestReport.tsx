

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, List, Button, Empty, Row, Col, Modal, Tag, Descriptions, Select, Space, Table } from 'antd';
import { UserOutlined, CalendarOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchStudentsByClassRequest, type StudentForReport, fetchMcqResultsRequest } from '../../store/features/mcq-results/mcqResultsSlice';
import { fetchMcqTestHistoryForStudentRequest, type TestSession } from '../../store/features/mcq-test-history/mcqTestHistorySlice';
import dayjs from 'dayjs';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;
const { Option } = Select;

const StudentMCQTestReport: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: teacherDataLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { students, results: allMcqResults, loading: studentsLoading, error: studentsError } = useSelector((state: RootState) => state.mcqResults);
    const { history: studentHistory, loading: historyLoading } = useSelector((state: RootState) => state.mcqTestHistory);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    
    // Modal states
    const [studentHistoryModalVisible, setStudentHistoryModalVisible] = useState(false);
    const [detailedReportModalVisible, setDetailedReportModalVisible] = useState(false);

    // Data for modals
    const [selectedStudent, setSelectedStudent] = useState<StudentForReport | null>(null);
    const [selectedTestSession, setSelectedTestSession] = useState<TestSession | null>(null);

    const isMobile = useMediaQuery('(max-width: 768px)');


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchMcqResultsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars?.length > 0 && !selectedYear) {
            const currentYear = (calendars as { academic_year: string, is_current: boolean }[]).find(c => c.is_current)?.academic_year;
            setSelectedYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);
    
    const classOptions = useMemo(() => {
        if (!selectedYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: any, m: any) => {
            const key = `${m.class_name}||${m.section_name}`;
            if (!acc.has(key)) {
                acc.set(key, { key, label: `${m.class_name} - ${m.section_name}` });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());
        return Array.from(uniqueClasses.values()).sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedYear]);

    useEffect(() => {
        if (selectedClassKey && selectedYear && user?.organization_key) {
            const [className, sectionName] = selectedClassKey.split('||');
            dispatch(fetchStudentsByClassRequest({
                organizationKey: user.organization_key,
                academicYear: selectedYear,
                className,
                sectionName
            }));
        }
    }, [dispatch, selectedClassKey, selectedYear, user?.organization_key]);
    
    const studentsWithTestStatus = useMemo(() => {
        const studentIdsWithTests = new Set(
            allMcqResults
                .filter(result => 
                    result.academic_year === selectedYear &&
                    selectedClassKey &&
                    result.class_name === selectedClassKey.split('||')[0] &&
                    result.section_name === selectedClassKey.split('||')[1]
                )
                .map(result => result.student.student_id)
        );
        return students.map(student => ({
            ...student,
            hasTakenTest: studentIdsWithTests.has(student.id),
        }));
    }, [students, allMcqResults, selectedYear, selectedClassKey]);


    const handleViewMore = (student: StudentForReport) => {
        setSelectedStudent(student);
        dispatch(fetchMcqTestHistoryForStudentRequest(student.id));
        setStudentHistoryModalVisible(true);
    };

    const handleViewDetailedReport = (session: TestSession) => {
        setSelectedTestSession(session);
        setDetailedReportModalVisible(true);
    };

    const studentColumns = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text: string) => text || 'N/A' },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Student Name', dataIndex: 'full_name', key: 'full_name' },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: StudentForReport & { hasTakenTest: boolean }) => (
                <Button onClick={() => handleViewMore(record)} disabled={!record.hasTakenTest}>
                    View More
                </Button>
            ),
        },
    ];

    const isLoading = teacherDataLoading || studentsLoading;
    
    const DesktopLayout = () => (
        <Table
            columns={studentColumns}
            dataSource={studentsWithTestStatus}
            rowKey="id"
            bordered
            scroll={{ x: 'max-content' }}
        />
    );

    const MobileLayout = () => (
         <List
            dataSource={studentsWithTestStatus}
            renderItem={item => (
                <List.Item>
                    <Card style={{ width: '100%' }}>
                         <Row justify="space-between" align="middle">
                            <Col>
                                <Space direction="vertical">
                                    <Text strong>{item.full_name}</Text>
                                    <div>
                                        <Tag>Roll: {item.roll_no || 'N/A'}</Tag>
                                        <Tag>Reg: {item.register_no}</Tag>
                                    </div>
                                </Space>
                            </Col>
                            <Col>
                                <Button onClick={() => handleViewMore(item)} disabled={!item.hasTakenTest}>View</Button>
                            </Col>
                        </Row>
                    </Card>
                </List.Item>
            )}
        />
    );

    return (
        <>
            <Card>
                <Title level={4}>Student MCQ Test Report</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Select a class to view your students' test performances.
                </Text>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <Select
                            placeholder="Select Academic Year"
                            style={{ width: '100%' }}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            loading={teacherDataLoading}
                            allowClear
                        >
                            {(calendars || []).map((cal: any) => <Option key={cal.id} value={cal.academic_year}>{cal.academic_year}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Select
                            showSearch
                            placeholder="Select Class & Section"
                            style={{ width: '100%' }}
                            value={selectedClassKey}
                            onChange={setSelectedClassKey}
                            disabled={!selectedYear}
                            loading={teacherDataLoading}
                            allowClear
                        >
                            {classOptions.map((opt: any) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                        </Select>
                    </Col>
                </Row>
                
                <Spin spinning={isLoading}>
                    {studentsError && <Alert message="Error fetching students" description={studentsError} type="error" showIcon />}
                    
                    {selectedClassKey ? (
                        isMobile ? <MobileLayout /> : <DesktopLayout />
                    ) : (
                        <Empty description="Please select a class to view student test reports." />
                    )}
                </Spin>
            </Card>

            <Modal
                title={`Test History for ${selectedStudent?.full_name}`}
                open={studentHistoryModalVisible}
                onCancel={() => setStudentHistoryModalVisible(false)}
                footer={null}
                width={800}
            >
                <Spin spinning={historyLoading}>
                    <List
                        dataSource={studentHistory}
                        renderItem={session => (
                            <List.Item>
                                <Card style={{ width: '100%' }}>
                                    <Row align="middle" justify="space-between">
                                        <Col><Text strong>{session.subject}</Text></Col>
                                        <Col><Tag icon={<CalendarOutlined />}>{dayjs(session.test_date).format('DD MMM YYYY')}</Tag></Col>
                                        <Col><Tag icon={<CheckCircleOutlined />} color="green">Score: {session.score}/{session.totalQuestions}</Tag></Col>
                                        <Col><Button size="small" onClick={() => handleViewDetailedReport(session)}>View</Button></Col>
                                    </Row>
                                </Card>
                            </List.Item>
                        )}
                        locale={{ emptyText: "No tests found for this student in the subjects you teach." }}
                    />
                </Spin>
            </Modal>
            
             <Modal
                title="Detailed Test Report"
                open={detailedReportModalVisible}
                onCancel={() => setDetailedReportModalVisible(false)}
                footer={null}
                width="90%"
            >
                {selectedTestSession && (
                    <>
                        <Descriptions bordered size="small" column={2} style={{marginBottom: '24px'}}>
                            <Descriptions.Item label="Date">{dayjs(selectedTestSession.test_date).format('DD MMM YYYY')}</Descriptions.Item>
                            <Descriptions.Item label="Time Taken">{selectedTestSession.time_taken}</Descriptions.Item>
                            <Descriptions.Item label="Score" span={2}>
                                <Text strong style={{color: selectedTestSession.score >= selectedTestSession.totalQuestions / 2 ? 'green' : 'red' }}>
                                    {selectedTestSession.score} / {selectedTestSession.totalQuestions}
                                </Text>
                            </Descriptions.Item>
                        </Descriptions>
                        <List
                            bordered
                            dataSource={selectedTestSession.questions}
                            renderItem={(item, index) => (
                                <List.Item>
                                    <div>
                                        <Text strong>{`${index + 1}. ${item.question_text}`}</Text>
                                        <div style={{paddingLeft: '16px', marginTop: '8px'}}>
                                             <Text type="secondary">Your Answer: </Text>
                                             <Tag color={item.selected_answer === item.correct_answer ? 'success' : 'error'}>{item.selected_answer || 'Not Answered'}</Tag>
                                             {item.selected_answer !== item.correct_answer && <><br/><Text type="secondary">Correct Answer: </Text><Tag color="blue">{item.correct_answer}</Tag></>}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </>
                )}
            </Modal>
        </>
    );
};

export default StudentMCQTestReport;

