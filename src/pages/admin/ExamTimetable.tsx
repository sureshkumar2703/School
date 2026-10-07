import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Col, Row, Typography, Modal, Form, Select, TimePicker, InputNumber, Table, DatePicker, Spin, Descriptions, List, Space } from 'antd';
import { PlusOutlined, EyeOutlined, PrinterOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { fetchExamTitlesRequest } from '../../store/features/exam-title/examTitleSlice';
import { fetchMappingsRequest } from '../../store/features/class-mappings/classMappingsSlice';
import { createExamTimetableRequest, fetchExamTimetablesRequest, updateExamTimetableRequest, type ExamTimetable } from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title, Text } = Typography;
const { Option } = Select;

const ExamTimetable: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [editingTimetable, setEditingTimetable] = useState<ExamTimetable | null>(null);
    const [viewingTimetable, setViewingTimetable] = useState<ExamTimetable | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const printRef = useRef<HTMLDivElement>(null);

    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { titles: examTitles, loading: titlesLoading } = useSelector((state: RootState) => state.examTitle);
    const { mappings, loading: mappingsLoading } = useSelector((state: RootState) => state.classMappings);
    const { timetables, loading: timetableLoading } = useSelector((state: RootState) => state.examTimetableAdmin);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    
    const modalSelectedAcademicYear = Form.useWatch('academic_year', form);
    const modalSelectedClass = Form.useWatch('class_name', form);
    const modalSelectedSection = Form.useWatch('section_name', form);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchClassesRequest());
            dispatch(fetchExamTitlesRequest(user.organization_key));
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
     useEffect(() => {
        if (calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
            }
        }
    }, [calendars, selectedAcademicYear]);

    useEffect(() => {
        if (modalSelectedClass && modalSelectedSection && modalSelectedAcademicYear && user?.organization_key) {
            dispatch(fetchMappingsRequest({ organizationKey: user!.organization_key!, className: modalSelectedClass, sectionName: modalSelectedSection, academicYear: modalSelectedAcademicYear }));
        }
    }, [modalSelectedClass, modalSelectedSection, modalSelectedAcademicYear, dispatch, user]);

    const subjectsForClass = useMemo(() => {
        if (!mappings) return [];
        return [...new Set(mappings.map(m => m.subject_name))].filter(subject => subject && !subject.toLowerCase().includes('pt'));
    }, [mappings]);
    
    const showModal = (record: ExamTimetable | null = null) => {
        setEditingTimetable(record);
        if (record) {
            const subjectValues = record.exam_days.reduce((acc, day) => {
                acc[day.subject] = {
                    exam_date: dayjs(day.examdate),
                    exam_session: day.examsession,
                };
                return acc;
            }, {} as any);
            
            form.setFieldsValue({
                ...record,
                exam_total_mark: record.exam_total_mark,
                time: dayjs(record.exam_time, 'HH:mm:ss'),
                subjects: subjectValues,
            });
        } else {
            const currentYear = calendars.find(cal => cal.is_current)?.academic_year;
            form.resetFields();
            form.setFieldsValue({ academic_year: currentYear });
        }
        setIsModalVisible(true);
    };

    const handleViewDetails = (record: ExamTimetable) => {
        setViewingTimetable(record);
        setIsViewModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingTimetable(null);
        form.resetFields();
    };

    const handleViewModalClose = () => {
        setIsViewModalVisible(false);
        setViewingTimetable(null);
    };

    const onFinish = () => {
        form.validateFields().then(values => {
            if (!user) return;

            const examDays = Object.entries(values.subjects || {}).map(([subject, details]: [string, any]) => ({
                subject: subject,
                examdate: dayjs(details.exam_date).format('YYYY-MM-DD'),
                examsession: details.exam_session,
            }));

            const payload: Partial<ExamTimetable> = {
                organization_key: user.organization_key!,
                academic_year: values.academic_year,
                class_name: values.class_name,
                section_name: values.section_name,
                exam_title: values.exam_title,
                exam_time: dayjs(values.time).format('HH:mm:ss'),
                exam_total_mark: values.exam_total_mark,
                exam_days: examDays,
                created_by: user.name || user.email,
            };

            if (editingTimetable) {
                dispatch(updateExamTimetableRequest({ ...payload, id: editingTimetable.id } as ExamTimetable));
            } else {
                 dispatch(createExamTimetableRequest(payload as any));
            }
            
            handleCancel();
        });
    };
    
    const activeClasses = useMemo(() => {
        return [...new Set(classes.filter(c => c.status === 'Active' && c.organization_key === user?.organization_key).map(c => c.class_name))];
    }, [classes, user?.organization_key]);

    const sectionsForClass = useMemo(() => {
        if (!modalSelectedClass) return [];
        return [...new Set(classes.filter(c => c.class_name === modalSelectedClass && c.status === 'Active' && c.organization_key === user?.organization_key).map(c => c.section).filter(Boolean))] as string[];
    }, [classes, modalSelectedClass, user?.organization_key]);

    const activeExamTitles = useMemo(() => {
        return examTitles.filter(title => title.status === 'Active');
    }, [examTitles]);
    
    const filteredTimetables = useMemo(() => {
        return timetables.filter(tt => 
            (!selectedAcademicYear || tt.academic_year === selectedAcademicYear) &&
            (!selectedClass || tt.class_name === selectedClass)
        );
    }, [timetables, selectedAcademicYear, selectedClass]);

    const filterClassOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        return [...new Set(timetables.filter(t => t.academic_year === selectedAcademicYear).map(t => t.class_name))];
    }, [timetables, selectedAcademicYear]);


    const subjectTableColumns = [
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
        },
        {
            title: 'Exam Date',
            key: 'exam_date',
            render: (_: any, record: { subject: string }) => (
                <Form.Item name={['subjects', record.subject, 'exam_date']} noStyle rules={[{ required: true, message: 'Please select a date!' }]}>
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
            ),
        },
        {
            title: 'Exam Session',
            key: 'exam_session',
            render: (_: any, record: { subject: string }) => (
                <Form.Item name={['subjects', record.subject, 'exam_session']} initialValue="FN" noStyle rules={[{ required: true, message: 'Please select a session!' }]}>
                    <Select style={{ width: '100%' }}>
                        <Option value="FN">FN (Forenoon)</Option>
                        <Option value="AN">AN (Afternoon)</Option>
                    </Select>
                </Form.Item>
            ),
        },
    ];

    const mainTableColumns = [
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Exam Title', dataIndex: 'exam_title', key: 'exam_title' },
        { title: 'Total Mark', dataIndex: 'exam_total_mark', key: 'exam_total_mark' },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: ExamTimetable) => (
                 <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>
                        View
                    </Button>
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)}>
                        Edit
                    </Button>
                </Space>
            ),
        },
    ];
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `exam-timetable-${viewingTimetable?.class_name}-${viewingTimetable?.section_name}`,
    });

    const isLoading = calendarsLoading || classesLoading || titlesLoading || mappingsLoading || timetableLoading;

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={4} style={{ margin: 0 }}>Exam Timetable Management</Title>
                </Col>
                <Col>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                        Create Timetable
                    </Button>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={24} sm={12}>
                    <Select
                        showSearch
                        allowClear
                        placeholder="Filter by Academic Year"
                        style={{ width: '100%' }}
                        value={selectedAcademicYear}
                        onChange={(value) => { setSelectedAcademicYear(value); setSelectedClass(null); }}
                        loading={calendarsLoading}
                    >
                        {calendars.filter(c => c.status === 'Active').map(c => (
                            <Option key={c.id} value={c.academic_year}>
                                {c.academic_year}{c.is_current && " (Current)"}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={12}>
                     <Select
                        showSearch
                        allowClear
                        placeholder="Filter by Class"
                        style={{ width: '100%' }}
                        value={selectedClass}
                        onChange={setSelectedClass}
                        disabled={!selectedAcademicYear}
                    >
                        {filterClassOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                </Col>
            </Row>


            <Spin spinning={isLoading}>
                <Table
                    columns={mainTableColumns}
                    dataSource={filteredTimetables}
                    rowKey="id"
                    bordered
                    scroll={{ x: 'max-content' }}
                />
            </Spin>

            <Modal
                title={editingTimetable ? 'Edit Exam Timetable' : 'Create Exam Timetable'}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" onClick={onFinish} loading={timetableLoading}>
                        {editingTimetable ? 'Update' : 'Create'}
                    </Button>,
                ]}
                width={800}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                <Select placeholder="Select year" loading={calendarsLoading} disabled={!!editingTimetable}>
                                    {calendars.filter(c => c.status === 'Active').map(cal => (
                                        <Option key={cal.id} value={cal.academic_year}>
                                            {cal.academic_year}{cal.is_current && " (Current)"}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                             <Form.Item name="class_name" label="Class" rules={[{ required: true }]}>
                                <Select placeholder="Select class" loading={classesLoading} disabled={!modalSelectedAcademicYear || !!editingTimetable} onChange={() => form.setFieldsValue({ section_name: null })}>
                                    {activeClasses.map(className => (
                                        <Option key={className} value={className}>{className}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                             <Form.Item name="section_name" label="Section" rules={[{ required: true }]}>
                                <Select placeholder="Select section" loading={classesLoading} disabled={!modalSelectedClass || !!editingTimetable}>
                                    {sectionsForClass.map(section => (
                                        <Option key={section} value={section}>{section}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="exam_title" label="Exam Title" rules={[{ required: true }]}>
                                <Select placeholder="Select exam title" loading={titlesLoading}>
                                    {activeExamTitles.map(title => (
                                        <Option key={title.id} value={title.exam_title}>{title.exam_title}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="time" label="Time" rules={[{ required: true }]}>
                               <TimePicker format="HH:mm" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="exam_total_mark" label="Total Mark" rules={[{ required: true }]}>
                                <InputNumber placeholder="Enter total marks" style={{ width: '100%' }} min={1} />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    {modalSelectedClass && modalSelectedSection && modalSelectedAcademicYear && (
                        <Spin spinning={mappingsLoading}>
                             <Table
                                dataSource={subjectsForClass.map(s => ({ key: s, subject: s }))}
                                columns={subjectTableColumns}
                                pagination={false}
                                bordered
                                size="small"
                                style={{ marginTop: 24 }}
                            />
                        </Spin>
                    )}
                </Form>
            </Modal>

             <Modal
                title="Exam Timetable Details"
                open={isViewModalVisible}
                onCancel={handleViewModalClose}
                footer={[
                    <Button key="back" onClick={handleViewModalClose}>
                        Close
                    </Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>
                        Print
                    </Button>,
                ]}
                width={800}
            >
                <div ref={printRef} style={{ padding: '20px' }}>
                    {viewingTimetable && (
                        <>
                             <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                {schoolDetails?.logo_url && <img src={schoolDetails.logo_url} alt="School Logo" style={{ maxHeight: 80, marginBottom: 10 }} />}
                                <Title level={3} style={{ margin: 0 }}>{schoolDetails?.school_name}</Title>
                                <Text>{schoolDetails?.address}</Text>
                                <Title level={4} style={{ margin: '12px 0 0 0' }}>{viewingTimetable.exam_title}</Title>
                            </div>
                            <Descriptions bordered column={2} size="small" style={{ marginBottom: 20 }}>
                                <Descriptions.Item label="Class">{`${viewingTimetable.class_name} - ${viewingTimetable.section_name}`}</Descriptions.Item>
                                <Descriptions.Item label="Academic Year">{viewingTimetable.academic_year}</Descriptions.Item>
                                <Descriptions.Item label="Total Mark">{viewingTimetable.exam_total_mark}</Descriptions.Item>
                                <Descriptions.Item label="Exam Time">{dayjs(viewingTimetable.exam_time, 'HH:mm:ss').format('h:mm A')}</Descriptions.Item>
                                <Descriptions.Item label="Created By" span={2}>{viewingTimetable.created_by}</Descriptions.Item>
                            </Descriptions>
                            
                            <Title level={5} style={{marginTop: 20}}>Schedule</Title>
                            <List
                                size="small"
                                bordered
                                dataSource={viewingTimetable.exam_days}
                                renderItem={(item: any) => (
                                    <List.Item>
                                        <Text strong>{item.subject}:</Text> {dayjs(item.examdate).format('dddd, MMMM D, YYYY')} ({item.examsession})
                                    </List.Item>
                                )}
                            />
                            <div style={{ marginTop: 40, paddingTop: 40, borderTop: '1px dashed #ccc', textAlign: 'right' }}>
                                <p>Principal / Authorized Signatory</p>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </Card>
    );
};

export default ExamTimetable;
