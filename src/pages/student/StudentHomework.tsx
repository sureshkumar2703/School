
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, Empty, Tag, Select, Row, Col, Button, Modal, List, Descriptions, Table, Space } from 'antd';
import { EyeOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchHomeworkRequest, type Homework } from '../../store/features/homework/homeworkSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import { fetchHomeworkReportsRequest, saveHomeworkReportRequest, updateHomeworkReportStatusRequest, type HomeworkReport } from '../../store/features/homework-report/homeworkReportSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const StudentHomework: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { homework, loading, error } = useSelector((state: RootState) => state.homework);
    const { reports, loading: reportLoading } = useSelector((state: RootState) => state.homeworkReport);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(false);
    const [viewingHomework, setViewingHomework] = useState<Homework | null>(null);

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
                } catch (err: any) {
                    console.error("Error fetching student section:", err.message);
                } finally {
                    setLoadingSection(false);
                }
            };
            fetchSection();
        }
    }, [user]);

    useEffect(() => {
        if (!user?.organization_key || !user?.id) return;

        dispatch(fetchHomeworkRequest(user.organization_key));
        dispatch(fetchHomeworkReportsRequest({ studentId: user.id }));

        const channel = supabase
            .channel('student-homework-realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'homework',
                filter: `organization_key=eq.${user.organization_key}`
            }, () => {
                dispatch(fetchHomeworkRequest(user.organization_key!));
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'homework_report',
                filter: `student_id=eq.${user.id}`
            }, () => {
                dispatch(fetchHomeworkReportsRequest({ studentId: user.id! }));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [dispatch, user]);

    const uniqueSubjects = useMemo(() => {
        if (!user || !section) return [];
        const relevantHomework = homework.filter(h =>
            h.class_name === user.admitted_class &&
            h.section_name === section &&
            h.academic_year === user.academic_year
        );
        return [...new Set(relevantHomework.map(h => h.subject))];
    }, [homework, user, section]);

    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const filteredHomework = useMemo(() => {
        if (!selectedSubject) return [];
        return homework.filter(h =>
            h.class_name === user?.admitted_class &&
            h.section_name === section &&
            h.academic_year === user?.academic_year &&
            h.subject === selectedSubject
        ).sort((a, b) => dayjs(b.homework_date).diff(dayjs(a.homework_date)));
    }, [homework, selectedSubject, user, section]);

    const reportMap = useMemo(() => {
        return new Map(reports.map(r => [r.homework_id, r]));
    }, [reports]);

    const isLoading = loading || loadingSection || reportLoading;

    const handlePreview = (hw: Homework) => {
        setViewingHomework(hw);
        const existingReport = reportMap.get(hw.id!);
        if (!existingReport && user) {
            dispatch(saveHomeworkReportRequest({
                organization_key: user.organization_key!,
                academic_year: hw.academic_year,
                class_name: hw.class_name,
                section_name: hw.section_name,
                subject: hw.subject,
                homework_date: hw.homework_date,
                questions: hw.homework_items,
                student_id: user.id,
                student_name: user.full_name,
                roll_no: user.roll_no,
                register_no: user.register_no,
                homework_id: hw.id!,
                status: 'Pending',
            }));
        }
    };

    const handleClosePreview = () => {
        setViewingHomework(null);
    };
    
    const handleConfirm = (report: HomeworkReport) => {
        dispatch(updateHomeworkReportStatusRequest({ reportId: report.id, status: 'Confirm' }));
    };

    const columns = [
        {
            title: 'Homework Date',
            dataIndex: 'homework_date',
            key: 'homework_date',
            render: (date: string) => dayjs(date).format('DD MMM YYYY')
        },
        {
            title: 'Questions',
            key: 'questions',
            render: (_: any, record: Homework) => (
                <Button icon={<EyeOutlined />} onClick={() => handlePreview(record)}>
                    View
                </Button>
            )
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, record: Homework) => {
                const report = reportMap.get(record.id!);
                if (!report) {
                    return <Tag>New</Tag>;
                }
                
                switch (report.status) {
                    case 'Confirm':
                        return <Tag color="processing">Awaiting Teacher Confirmation</Tag>;
                    case 'Completed':
                        return <Tag icon={<CheckCircleOutlined />} color="success">Completed</Tag>;
                    case 'Cancel':
                        return <Tag color="error">Cancelled</Tag>;
                    case 'Pending':
                        return (
                            <Button
                                size="small"
                                onClick={() => handleConfirm(report)}
                                style={{
                                    backgroundColor: 'transparent',
                                    borderColor: '#1890ff',
                                    color: '#1890ff',
                                    transition: 'all 0.3s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e6f7ff'; }}
                                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                                Confirm Submission
                            </Button>
                        );
                    default:
                        return <Tag>{report.status}</Tag>;
                }
            }
        }
    ];

    return (
        <>
            <Card>
                <Title level={4}>My Homework</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    View your assigned homework tasks by subject.
                </Text>

                <Spin spinning={isLoading}>
                    {error && <Alert message="Error" description={error} type="error" showIcon />}
                    <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                        <Col>
                            {user && section && (
                                <Space wrap>
                                    <Tag color="geekblue">Class: {user.admitted_class} - {section}</Tag>
                                    <Tag color="geekblue">Year: {user.academic_year}</Tag>
                                </Space>
                            )}
                        </Col>
                        <Col>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Filter by Subject"
                                style={{ width: 250 }}
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                            >
                                {uniqueSubjects.map(subject => (
                                    <Option key={subject} value={subject}>{subject}</Option>
                                ))}
                            </Select>
                        </Col>
                    </Row>
                    {selectedSubject ? (
                        <Table
                            columns={columns}
                            dataSource={filteredHomework}
                            rowKey="id"
                            bordered
                            pagination={{ pageSize: 8 }}
                        />
                    ) : (
                        <Empty description="Please select a subject to view homework." />
                    )}
                </Spin>
            </Card>

            <Modal
                title={`Homework for ${viewingHomework?.subject}`}
                open={!!viewingHomework}
                onCancel={handleClosePreview}
                footer={[<Button key="close" onClick={handleClosePreview}>Close</Button>]}
            >
                {viewingHomework && (
                    <>
                        <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Date">{dayjs(viewingHomework.homework_date).format('DD MMM YYYY')}</Descriptions.Item>
                            <Descriptions.Item label="Class">{`${viewingHomework.class_name} - ${viewingHomework.section_name}`}</Descriptions.Item>
                        </Descriptions>
                        <List
                            header={<Text strong>Tasks</Text>}
                            dataSource={viewingHomework.homework_items}
                            renderItem={(item, index) => <List.Item>{index + 1}. {item}</List.Item>}
                            bordered
                        />
                    </>
                )}
            </Modal>
        </>
    );
};

export default StudentHomework;
