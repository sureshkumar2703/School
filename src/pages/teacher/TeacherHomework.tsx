
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Select, Row, Col, Form, Input, Button, Space, message, Divider, Modal, List, Empty, Grid, Descriptions } from 'antd';
import { PlusOutlined, MinusCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { addHomeworkRequest, fetchHomeworkRequest, type Homework } from '../../store/features/homework/homeworkSlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const TeacherHomework: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { homework, loading: homeworkLoading } = useSelector((state: RootState) => state.homework);
    const screens = useBreakpoint();
    const isMobile = !screens.md;


    // State for the creation form
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const homeworks = Form.useWatch('homeworks', form) || [];

    // State for the history table filters
    const [historyAcademicYear, setHistoryAcademicYear] = useState<string | null>(null);
    const [historyClassKey, setHistoryClassKey] = useState<string | null>(null);
    const [historySubject, setHistorySubject] = useState<string | null>(null);

    // State for view modal
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [viewingHomework, setViewingHomework] = useState<Homework | null>(null);


    const isFormComplete = selectedAcademicYear && selectedClassKey && selectedSubject && homeworks.length > 0 && homeworks.every((h: any) => h && h.task);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchHomeworkRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars && calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
                setHistoryAcademicYear(currentYear); // Set for history filter as well
            } else if (calendars.length > 0) {
                const sortedYears = [...calendars].sort((a:any, b:any) => b.academic_year.localeCompare(a.academic_year));
                setSelectedAcademicYear(sortedYears[0].academic_year);
                setHistoryAcademicYear(sortedYears[0].academic_year);
            }
        }
    }, [calendars, selectedAcademicYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);
    
    // Options for the creation form
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
    
    // Options for the history filters
    const historyClassOptions = useMemo(() => {
        if (!historyAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === historyAcademicYear);
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
    }, [myAssignments, historyAcademicYear]);

    const historySubjectOptions = useMemo(() => {
        if (!historyClassKey || !subjects) return [];
        const [className, sectionName, academicYear] = historyClassKey.split('||');
        const subjectNamesForClass = myAssignments
            .filter((m: any) => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNamesForClass.includes(s.subject_name));
    }, [myAssignments, historyClassKey, subjects]);


    const filteredHomework = useMemo(() => {
        let data = homework;
        if (historyAcademicYear) {
            data = data.filter(h => h.academic_year === historyAcademicYear);
        }
        if (historyClassKey) {
            const [className, sectionName] = historyClassKey.split('||');
            data = data.filter(h => h.class_name === className && h.section_name === sectionName);
        }
        if (historySubject) {
            data = data.filter(h => h.subject === historySubject);
        }
        return [...data].sort((a,b) => dayjs(b.homework_date).diff(dayjs(a.homework_date)));
    }, [homework, historyAcademicYear, historyClassKey, historySubject]);

    
    const handleYearChange = (year: string | null) => {
        setSelectedAcademicYear(year);
        setSelectedClassKey(null);
        setSelectedSubject(null);
        form.setFieldsValue({ class_key: null, subject: null, homeworks: [] });
    };

    const handleClassChange = (key: string | null) => {
        setSelectedClassKey(key);
        setSelectedSubject(null);
        form.setFieldsValue({ subject: null, homeworks: [] });
    };

    const handleSubjectChange = (subjectName: string | null) => {
        setSelectedSubject(subjectName);
        form.setFieldsValue({ homeworks: [] });
    }
    
    const handleHistoryYearChange = (year: string | null) => {
        setHistoryAcademicYear(year);
        setHistoryClassKey(null);
        setHistorySubject(null);
    };

    const handleHistoryClassChange = (key: string | null) => {
        setHistoryClassKey(key);
        setHistorySubject(null);
    };

    const onFinish = () => {
        if (!isFormComplete || !user) {
            message.error("Please fill all fields and add at least one homework item.");
            return;
        }

        const [className, sectionName, academicYear] = selectedClassKey!.split('||');
        const homeworkItems = homeworks.map((h: any) => h.task);
        
        dispatch(addHomeworkRequest({
            organization_key: user.organization_key!,
            staff_code: user.staff_code!,
            academic_year: academicYear,
            class_name: className,
            section_name: sectionName,
            subject: selectedSubject!,
            homework_items: homeworkItems,
            homework_date: dayjs().format('YYYY-MM-DD'),
        }));

        message.success("Homework saved successfully!");
        form.setFieldsValue({ homeworks: [] });
    };

    const showViewModal = (record: Homework) => {
        setViewingHomework(record);
        setIsViewModalVisible(true);
    };

    const handleViewModalClose = () => {
        setIsViewModalVisible(false);
        setViewingHomework(null);
    };

    const isLoading = mappingsLoading || subjectsLoading || homeworkLoading;
    
    const historyColumns = [
        { title: 'Date', dataIndex: 'homework_date', key: 'homework_date', render: (date: string) => dayjs(date).format('DD/MM/YYYY') },
        { title: 'Class/Section', key: 'class', render: (_: any, record: Homework) => `${record.class_name} - ${record.section_name}` },
        { title: 'Subject', dataIndex: 'subject', key: 'subject' },
        { title: 'Action', key: 'action', render: (_: any, record: Homework) => <Button icon={<EyeOutlined />} onClick={() => showViewModal(record)}>View</Button> }
    ];

    const DesktopLayout = () => (
         <Row gutter={[16, 16]} style={{ marginTop: 24, alignItems: 'center' }}>
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
                    placeholder="Select Class"
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
                    placeholder="Select Subject"
                    style={{ width: '100%' }}
                    value={selectedSubject}
                    onChange={handleSubjectChange}
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
    );

    const MobileLayout = () => (
        <div style={{ marginTop: 24 }}>
            <Row justify="space-between" align="middle" gutter={[16, 16]}>
                <Col flex="1">
                     <Select
                        showSearch
                        placeholder="Class & Section"
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
                <Col flex="1">
                    <Select
                        placeholder="Year"
                        style={{ width: '100%' }}
                        value={selectedAcademicYear}
                        onChange={handleYearChange}
                        loading={mappingsLoading}
                        allowClear
                    >
                        {(calendars || []).map((cal: any) => (
                            <Option key={cal.id} value={cal.academic_year}>
                                {cal.academic_year}{cal.is_current && " (Current)"}
                            </Option>
                        ))}
                    </Select>
                </Col>
            </Row>
             <Row justify="center" style={{ marginTop: 16 }}>
                <Col span={24}>
                     <Select
                        showSearch
                        placeholder="Select Subject"
                        style={{ width: '100%' }}
                        value={selectedSubject}
                        onChange={handleSubjectChange}
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
        </div>
    );

    return (
        <Card>
            <Spin spinning={isLoading} tip="Loading...">
                <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Create Homework</Title>
                        <Text type="secondary">{dayjs().format('MMMM D, YYYY')}</Text>
                    </Col>
                    {isFormComplete && (
                        <Col>
                            <Button type="primary" onClick={onFinish} loading={homeworkLoading}>
                                Save Homework
                            </Button>
                        </Col>
                    )}
                </Row>
                
                {isMobile ? <MobileLayout /> : <DesktopLayout />}
                
                 <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                    <Form.List name="homeworks">
                        {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, ...restField }) => (
                            <Row key={key} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                                <Col flex="auto">
                                <Form.Item
                                    {...restField}
                                    name={[name, 'task']}
                                    style={{ marginBottom: 0 }}
                                    rules={[{ required: true, message: 'Please enter a homework task or remove this field.' }]}
                                >
                                    <Input placeholder="Enter homework details" />
                                </Form.Item>
                                </Col>
                                <Col>
                                    <MinusCircleOutlined
                                        className="dynamic-delete-button"
                                        onClick={() => remove(name)}
                                    />
                                </Col>
                            </Row>
                            ))}
                            <Form.Item>
                            <Button
                                type="dashed"
                                onClick={() => add()}
                                block
                                icon={<PlusOutlined />}
                                disabled={!selectedAcademicYear || !selectedClassKey || !selectedSubject}
                            >
                                Add Homework Item
                            </Button>
                            </Form.Item>
                        </>
                        )}
                    </Form.List>
                 </Form>

                 <Divider />
                 <Title level={5}>Homework History</Title>
                 <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                     <Col xs={24} md={8}>
                        <Select
                            placeholder="Filter by Academic Year"
                            style={{ width: '100%' }}
                            value={historyAcademicYear}
                            onChange={handleHistoryYearChange}
                            loading={mappingsLoading}
                            allowClear
                        >
                            {(calendars || []).map((cal: any) => (
                                <Option key={`hist-${cal.id}`} value={cal.academic_year}>
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
                            value={historyClassKey}
                            onChange={handleHistoryClassChange}
                            disabled={!historyAcademicYear}
                            allowClear
                        >
                            {historyClassOptions.map((opt: any) => (
                                <Option key={`hist-${opt.key}`} value={opt.key}>{opt.label}</Option>
                            ))}
                        </Select>
                    </Col>
                     <Col xs={24} md={8}>
                        <Select
                            showSearch
                            placeholder="Filter by Subject"
                            style={{ width: '100%' }}
                            value={historySubject}
                            onChange={setHistorySubject}
                            disabled={!historyClassKey}
                            allowClear
                        >
                            {historySubjectOptions.map(sub => (
                                <Option key={`hist-${sub.subject_code}`} value={sub.subject_name}>{sub.subject_name}</Option>
                            ))}
                        </Select>
                    </Col>
                 </Row>
                 <Table
                    columns={historyColumns}
                    dataSource={filteredHomework}
                    rowKey="id"
                    bordered
                    loading={homeworkLoading}
                    scroll={{x: 'max-content', y: 400}}
                    pagination={{ pageSize: 8 }}
                 />
            </Spin>

            <Modal
                title={`Homework for ${viewingHomework?.subject}`}
                open={isViewModalVisible}
                onCancel={handleViewModalClose}
                footer={[<Button key="close" onClick={handleViewModalClose}>Close</Button>]}
            >
                {viewingHomework && (
                    <>
                        <Descriptions bordered column={1} size="small" style={{marginBottom: 16}}>
                            <Descriptions.Item label="Date">{dayjs(viewingHomework.homework_date).format('DD MMM YYYY')}</Descriptions.Item>
                            <Descriptions.Item label="Class">{`${viewingHomework.class_name} - ${viewingHomework.section_name}`}</Descriptions.Item>
                        </Descriptions>
                        <List
                            header={<Text strong>Tasks</Text>}
                            dataSource={viewingHomework.homework_items}
                            renderItem={(item, index) => <List.Item>{index + 1}. {item}</List.Item>}
                            bordered
                            size="small"
                        />
                    </>
                )}
            </Modal>
        </Card>
    );
};

export default TeacherHomework;

    