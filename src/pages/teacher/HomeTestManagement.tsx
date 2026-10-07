
import React, { useState, useEffect, useMemo } from 'react';
import { Button, Card, Col, Form, Modal, Row, Select, Typography, InputNumber, Divider, Spin, message, Tag, Alert, List, Empty, Table, Descriptions } from 'antd';
import { CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import type { ColumnsType } from 'antd/es/table';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchHomeTestsRequest, type HomeTest } from '../../store/features/home-test/homeTestSlice';
import { fetchHomeTestReportsRequest } from '../../store/features/home-test-report/homeTestReportSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface StudentForMarking {
    id: string; // This is the report ID
    student_id: string;
    roll_no?: string;
    register_no: string;
    student_name: string;
    get_mark: number | null;
}

const HomeTestManagement: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { savedHomeTests, loading: homeTestLoading, error: homeTestError } = useSelector((state: RootState) => state.homeTest);

    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [selectedTestForMarks, setSelectedTestForMarks] = useState<HomeTest | null>(null);
    const [studentsForMarking, setStudentsForMarking] = useState<StudentForMarking[]>([]);
    const [marks, setMarks] = useState<Record<string, number | null>>({});
    const [loadingModalData, setLoadingModalData] = useState(false);
    const [totalStudentsInClass, setTotalStudentsInClass] = useState(0);
    const [form] = Form.useForm();

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
        }
    }, [dispatch, user?.organization_key]);
    
    useEffect(() => {
        if (calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = (calendars as any[]).find((c: any) => c.is_current)?.academic_year;
            setSelectedAcademicYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedAcademicYear]);
    
     useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
             dispatch(fetchHomeTestsRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
            
            // For management, we fetch all reports for the organization
            dispatch(fetchHomeTestReportsRequest({ organizationKey: user.organization_key }));
        }
    }, [dispatch, user]);

    useEffect(() => {
        const fetchModalData = async () => {
            if (!selectedTestForMarks || !user?.organization_key) return;

            setLoadingModalData(true);
            try {
                const { count: totalCount, error: countError } = await supabase
                    .from('class_section_allocations')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_key', user.organization_key)
                    .eq('class_name', selectedTestForMarks.class_name)
                    .eq('section_name', selectedTestForMarks.section_name)
                    .eq('academic_year', selectedTestForMarks.academic_year);

                if (countError) throw countError;
                setTotalStudentsInClass(totalCount || 0);
                
                const { data: reportData, error: reportError } = await supabase
                    .from('home_test_report')
                    .select('id, student_id, roll_no, register_no, student_name, get_mark')
                    .eq('home_test_id', selectedTestForMarks.id);

                if (reportError) throw reportError;
                
                const sortedReports = (reportData || []).sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
                setStudentsForMarking(sortedReports as StudentForMarking[]);

                const initialMarks: Record<string, number | null> = {};
                const formValues: Record<string, number | null> = {};
                sortedReports.forEach(report => {
                    initialMarks[report.id] = report.get_mark;
                    formValues[report.id] = report.get_mark;
                });
                setMarks(initialMarks);
                form.setFieldsValue({ marks: formValues });
                
            } catch (err: any) {
                message.error(`Failed to load student reports: ${err.message}`);
            } finally {
                setLoadingModalData(false);
            }
        };

        if (isUploadModalVisible) {
            fetchModalData();
        }

    }, [isUploadModalVisible, selectedTestForMarks, user?.organization_key, form]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return (mappings as any[]).filter((m: any) => m.teacher_name === user.full_name);
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

    const handleYearChange = (value: string) => {
        setSelectedAcademicYear(value);
        setSelectedClassKey(null);
        setSelectedSubject(null);
    };

    const handleClassChange = (value: string) => {
        setSelectedClassKey(value);
        setSelectedSubject(null);
    };

    const handleUploadModalOpen = (test: HomeTest) => {
        setSelectedTestForMarks(test);
        setIsUploadModalVisible(true);
    };

    const handleUploadModalClose = () => {
        setIsUploadModalVisible(false);
        setSelectedTestForMarks(null);
        setStudentsForMarking([]);
        setMarks({});
        form.resetFields();
    };

    const handleMarkChange = (studentReportId: string, value: number | null) => {
        setMarks(prev => ({ ...prev, [studentReportId]: value }));
    };

    const handleSaveMarks = async () => {
        try {
            await form.validateFields();
            if (!selectedTestForMarks || Object.keys(marks).length === 0) {
                message.warning("No marks entered to save.");
                return;
            }

            const updates = Object.entries(marks)
                .filter(([_, markValue]) => markValue !== null)
                .map(([reportId, markValue]) => ({
                    id: reportId,
                    get_mark: markValue,
                }));

            if (updates.length > 0) {
                const { error } = await supabase.from('home_test_report').upsert(updates);
                if (error) {
                    message.error(`Failed to save marks: ${error.message}`);
                } else {
                    message.success(`${updates.length} students' marks saved successfully.`);
                    handleUploadModalClose();
                }
            } else {
                message.info("No marks were entered.");
            }
        } catch (errorInfo) {
            console.log('Validation Failed:', errorInfo);
            message.error('Please correct the errors before saving.');
        }
    };


    const isLoading = mappingsLoading || subjectsLoading || homeTestLoading;
    
    const filteredTests = useMemo(() => {
        if (!selectedClassKey || !selectedSubject) {
            return [];
        }
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;

        if (!subjectCode) return [];

        return savedHomeTests.filter(test =>
            test.academic_year === academicYear &&
            test.class_name === className &&
            test.section_name === sectionName &&
            test.subject_code === subjectCode
        ).sort((a,b) => dayjs(b.test_date).diff(dayjs(a.test_date)));
    }, [savedHomeTests, selectedClassKey, selectedSubject, subjects]);
    
    const studentsColumns: ColumnsType<StudentForMarking> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text) => text || 'N/A' },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no'},
        { title: 'Name', dataIndex: 'student_name', key: 'student_name' },
        {
            title: 'Enter Mark',
            key: 'mark',
            render: (_, record) => (
                <Form.Item
                    name={['marks', record.id]}
                    noStyle
                    rules={[
                        {
                            validator: (_, value) => {
                                if (value && selectedTestForMarks && value > selectedTestForMarks.total_marks) {
                                    return Promise.reject(new Error(`Mark cannot exceed ${selectedTestForMarks.total_marks}`));
                                }
                                return Promise.resolve();
                            },
                        },
                    ]}
                >
                     <InputNumber
                        placeholder="Enter marks"
                        onChange={(value) => handleMarkChange(record.id, value)}
                        min={0}
                     />
                 </Form.Item>
            )
        }
    ];

    const modalTitle = selectedTestForMarks ? 
        `Student List for ${subjects.find(s => s.subject_code === selectedTestForMarks.subject_code)?.subject_name || ''} - Unit ${selectedTestForMarks.unit}`
        : "Student List";
    
    const attendedCount = studentsForMarking.length;
    const balanceCount = totalStudentsInClass - attendedCount;


    return (
        <>
            <Card>
                <Title level={4}>Home Test Management</Title>
                <Divider />
                <Spin spinning={isLoading}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Select
                                placeholder="Select Academic Year"
                                style={{ width: '100%' }}
                                value={selectedAcademicYear}
                                onChange={handleYearChange}
                                loading={mappingsLoading}
                            >
                                {(calendars || []).map((cal: any) => (
                                    <Option key={cal.id} value={cal.academic_year}>
                                        {cal.academic_year}{cal.is_current && " (Current)"}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} md={8}>
                            <Select
                                placeholder="Select Class and Section"
                                style={{ width: '100%' }}
                                value={selectedClassKey}
                                onChange={handleClassChange}
                                disabled={!selectedAcademicYear}
                            >
                                {classOptions.map((opt: any) => (
                                    <Option key={opt.key} value={opt.key}>{opt.label}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} md={8}>
                            <Select
                                placeholder="Select Subject"
                                style={{ width: '100%' }}
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                disabled={!selectedClassKey}
                            >
                                {subjectOptions.map(subject => (
                                    <Option key={subject?.subject_code} value={subject?.subject_name}>{subject?.subject_name}</Option>
                                ))}
                            </Select>
                        </Col>
                    </Row>
                </Spin>
                 <Divider />
                {homeTestError && <Alert message="Error" description={homeTestError} type="error" showIcon />}
                {selectedSubject ? (
                     <Spin spinning={isLoading}>
                         {filteredTests.length > 0 ? (
                            <List
                                grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3 }}
                                dataSource={filteredTests}
                                renderItem={item => (
                                    <List.Item>
                                        <Card hoverable style={{ backgroundColor: '#E9F5FE', borderRadius: '12px' }}>
                                             <Row justify="space-between" align="middle" gutter={16}>
                                                <Col>
                                                    <Tag icon={<CalendarOutlined />} color="blue">
                                                        {dayjs(item.test_date).format('DD MMM, YYYY')}
                                                    </Tag>
                                                </Col>
                                                <Col>
                                                    <Tag color="cyan">Unit: {item.unit}</Tag>
                                                </Col>
                                                <Col>
                                                    <Tag icon={<CheckCircleOutlined />} color="green">
                                                        Total Marks: {item.total_marks}
                                                    </Tag>
                                                </Col>
                                                <Col>
                                                    <Button type="default" onClick={() => handleUploadModalOpen(item)}>Upload Mark</Button>
                                                </Col>
                                            </Row>
                                        </Card>
                                    </List.Item>
                                )}
                            />
                         ) : (
                            <Empty description="No home tests found for this selection." />
                         )}
                     </Spin>
                ) : (
                    <Empty description="Please select an academic year, class, and subject to manage home tests." />
                )}
            </Card>

            <Modal
                title={modalTitle}
                open={isUploadModalVisible}
                onCancel={handleUploadModalClose}
                width={800}
                footer={[
                    <Button key="back" onClick={handleUploadModalClose}>Cancel</Button>,
                    <Button key="submit" type="primary" onClick={handleSaveMarks} loading={loadingModalData}>
                        Save Marks
                    </Button>,
                ]}
            >
                <Spin spinning={loadingModalData} tip="Loading students...">
                     {selectedTestForMarks && (
                        <>
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label="Academic Year">{selectedTestForMarks.academic_year}</Descriptions.Item>
                            <Descriptions.Item label="Class">{`${selectedTestForMarks.class_name} - ${selectedTestForMarks.section_name}`}</Descriptions.Item>
                            <Descriptions.Item label="Subject">{subjects.find(s => s.subject_code === selectedTestForMarks.subject_code)?.subject_name}</Descriptions.Item>
                            <Descriptions.Item label="Unit">{selectedTestForMarks.unit}</Descriptions.Item>
                            <Descriptions.Item label="Test Date">{dayjs(selectedTestForMarks.test_date).format('DD MMM YYYY')}</Descriptions.Item>
                            <Descriptions.Item label="Total Marks">{selectedTestForMarks.total_marks}</Descriptions.Item>
                        </Descriptions>
                         <Row justify="space-around" align="middle" style={{ marginBottom: 24, background: '#fafafa', padding: '8px 12px', borderRadius: '4px' }}>
                            <Col>
                                <Text strong>Total Students:</Text> <Tag color="blue">{totalStudentsInClass}</Tag>
                            </Col>
                            <Col>
                                <Text strong>Test Attended:</Text> <Tag color="green">{attendedCount}</Tag>
                            </Col>
                             <Col>
                                <Text strong>Balance Students:</Text> <Tag color="red">{balanceCount}</Tag>
                            </Col>
                        </Row>
                        </>
                    )}
                    <Form form={form}>
                         <Table
                            columns={studentsColumns}
                            dataSource={studentsForMarking}
                            rowKey="id"
                            bordered
                            size="small"
                            pagination={false}
                            scroll={{ y: 300 }}
                        />
                    </Form>
                </Spin>
            </Modal>
        </>
    );
};

export default HomeTestManagement;
