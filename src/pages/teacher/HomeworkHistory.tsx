

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, Select, Row, Col, Empty, Divider, Table, Button, Modal, List, message, Tooltip, Popconfirm, Space, Tag } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchHomeworkRequest, type Homework } from '../../store/features/homework/homeworkSlice';
import { fetchHomeworkReportsRequest, updateHomeworkReportStatusRequest, type HomeworkReport } from '../../store/features/homework-report/homeworkReportSlice';
import { supabase } from '../../service/supabaseClient';
import { EyeOutlined, TeamOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const HomeworkHistory: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { homework, loading: homeworkLoading, error: homeworkError } = useSelector((state: RootState) => state.homework);
    const { reports: allReports, loading: reportsLoading, error: reportsError } = useSelector((state: RootState) => state.homeworkReport);

    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [isStudentsModalVisible, setIsStudentsModalVisible] = useState(false);
    const [viewingHomework, setViewingHomework] = useState<Homework | null>(null);
    const [studentsForHomework, setStudentsForHomework] = useState<HomeworkReport[]>([]);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchHomeworkRequest(user.organization_key));
            dispatch(fetchHomeworkReportsRequest({ organizationKey: user.organization_key }));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars && calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            setSelectedAcademicYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedAcademicYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: any, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name}` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());
        return Array.from(uniqueClasses.values()).sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedAcademicYear]);

    const subjectOptions = useMemo(() => {
        if (!selectedClassKey || !subjects) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectNamesForClass = myAssignments
            .filter((m: any) => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNamesForClass.includes(s.subject_name));
    }, [myAssignments, selectedClassKey, subjects]);

    const filteredHomework = useMemo(() => {
        if (!homework) return [];
        let data = homework;
        if (selectedAcademicYear) {
            data = data.filter(h => h.academic_year === selectedAcademicYear);
        }
        if (selectedClassKey) {
            const [className, sectionName] = selectedClassKey.split('||');
            data = data.filter(h => h.class_name === className && h.section_name === sectionName);
        }
        if (selectedSubject) {
            data = data.filter(h => h.subject === selectedSubject);
        }
        return [...data].sort((a,b) => dayjs(b.homework_date).diff(dayjs(a.homework_date)));
    }, [homework, selectedAcademicYear, selectedClassKey, selectedSubject]);

    const handleYearChange = (year: string | null) => {
        setSelectedAcademicYear(year);
        setSelectedClassKey(null);
        setSelectedSubject(null);
    };

    const handleClassChange = (key: string | null) => {
        setSelectedClassKey(key);
        setSelectedSubject(null);
    };

    const handleViewClick = (record: Homework) => {
        setViewingHomework(record);
        setIsViewModalVisible(true);
    };

    const handleViewStudentsClick = (record: Homework) => {
        const relatedReports = allReports.filter(report => 
            report.homework_id === record.id
        );
        setStudentsForHomework(relatedReports);
        setViewingHomework(record);
        setIsStudentsModalVisible(true);
    };
    
    const handleStatusUpdate = (reportId: string, status: 'Completed' | 'Cancel') => {
        dispatch(updateHomeworkReportStatusRequest({ reportId, status }));
        setStudentsForHomework(prev => prev.map(s => s.id === reportId ? { ...s, status } : s));
    };


    const historyColumns = [
        { title: 'Homework Date', dataIndex: 'homework_date', key: 'homework_date', render: (date: string) => dayjs(date).format('DD MMM, YYYY') },
        { title: 'View', key: 'view', render: (_: any, record: Homework) => (
            <Button icon={<EyeOutlined />} onClick={() => handleViewClick(record)}>View Questions</Button>
        )},
        { title: 'Submissions', key: 'all_students', render: (_: any, record: Homework) => (
            <Button icon={<TeamOutlined />} onClick={() => handleViewStudentsClick(record)}>View Submissions</Button>
        )},
    ];

    const studentSubmissionColumns = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text: string) => text || 'N/A' },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no', render: (text: string) => text || 'N/A' },
        { title: 'Student Name', dataIndex: 'student_name', key: 'student_name' },
        { title: 'Viewed At', dataIndex: 'created_at', key: 'created_at', render: (date: string) => dayjs(date).format('DD MMM, hh:mm A') },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: HomeworkReport) => {
                if (record.status === 'Completed') {
                    return <Tag color="success">Completed</Tag>;
                }
                if (record.status === 'Cancel') {
                    return <Tag color="error">Cancelled</Tag>;
                }
                if (record.status === 'Confirm') {
                    return (
                        <Space>
                            <Tooltip title="Mark as Completed">
                                <Popconfirm
                                    title="Confirm Completion"
                                    description="Are you sure you want to mark this homework as completed?"
                                    onConfirm={() => handleStatusUpdate(record.id, 'Completed')}
                                >
                                    <Button shape="circle" icon={<CheckOutlined />} style={{ color: 'green', borderColor: 'green' }} />
                                </Popconfirm>
                            </Tooltip>
                            <Tooltip title="Cancel Submission">
                                <Popconfirm
                                    title="Cancel Submission"
                                    description="This will mark the submission as cancelled. Are you sure?"
                                    onConfirm={() => handleStatusUpdate(record.id, 'Cancel')}
                                >
                                    <Button shape="circle" icon={<CloseOutlined />} danger />
                                </Popconfirm>
                            </Tooltip>
                        </Space>
                    );
                }
                return <Tag>{record.status}</Tag>; // Default case for 'Pending'
            },
        }
    ];

    const isLoading = mappingsLoading || subjectsLoading || homeworkLoading || reportsLoading;
    const error = homeworkError || reportsError;

    return (
        <Card>
            <Title level={4}>Homework History</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Review past homework assignments and student submission status.
            </Text>
             <Spin spinning={isLoading}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                         <Select
                            placeholder="Select Academic Year"
                            style={{ width: '100%' }}
                            value={selectedAcademicYear}
                            onChange={handleYearChange}
                            loading={mappingsLoading}
                            allowClear
                        >
                            {(calendars || []).map((cal: any) => (
                                <Option key={cal.id} value={cal.academic_year}>
                                    {cal.academic_year} {cal.is_current && "(Current)"}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={8}>
                        <Select
                            showSearch
                            placeholder="Filter by Class"
                            style={{ width: '100%' }}
                            value={selectedClassKey}
                            onChange={handleClassChange}
                            disabled={!selectedAcademicYear}
                            allowClear
                             filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {classOptions.map((opt: any) => (
                                <Option key={opt.key} value={opt.key}>{opt.label}</Option>
                            ))}
                        </Select>
                    </Col>
                     <Col xs={24} md={8}>
                        <Select
                            showSearch
                            placeholder="Filter by Subject"
                            style={{ width: '100%' }}
                            value={selectedSubject}
                            onChange={setSelectedSubject}
                            disabled={!selectedClassKey}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {subjectOptions.map(sub => (
                                <Option key={sub.subject_code} value={sub.subject_name}>{sub.subject_name}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
                 <Divider />

                 {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                {!selectedClassKey || !selectedSubject ? (
                    <Empty description="Please select a class and subject to view history." />
                ) : (
                    <Table
                        columns={historyColumns}
                        dataSource={filteredHomework}
                        rowKey="id"
                        bordered
                        scroll={{x: 'max-content'}}
                    />
                )}
            </Spin>

            <Modal
                title={`Homework for ${viewingHomework?.subject}`}
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={[<Button key="back" onClick={() => setIsViewModalVisible(false)}>Close</Button>]}
            >
                {viewingHomework && (
                    <List
                        header={<Text strong>Homework Questions/Tasks</Text>}
                        bordered
                        dataSource={viewingHomework.homework_items}
                        renderItem={(item, index) => (
                            <List.Item>
                                {index + 1}. {item}
                            </List.Item>
                        )}
                    />
                )}
            </Modal>

            <Modal
                title={`Submissions for ${viewingHomework?.subject} on ${dayjs(viewingHomework?.homework_date).format('DD MMM')}`}
                open={isStudentsModalVisible}
                onCancel={() => setIsStudentsModalVisible(false)}
                footer={[<Button key="back" onClick={() => setIsStudentsModalVisible(false)}>Close</Button>]}
                width={800}
            >
                <Table
                    columns={studentSubmissionColumns}
                    dataSource={studentsForHomework}
                    rowKey="id"
                    bordered
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: "No students have viewed this homework yet." }}
                />
            </Modal>
        </Card>
    );
};

export default HomeworkHistory;
