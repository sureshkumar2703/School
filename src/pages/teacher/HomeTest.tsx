import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Typography, InputNumber, Divider, Spin, message, Tag, Alert, List, Descriptions } from 'antd';
import { PlusOutlined, PrinterOutlined, FileTextOutlined, BookOutlined, CalendarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchUnitMarksRequest } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import { generateHomeTestRequest, type GeneratedPaper, type GenerateHomeTestPayload, clearGeneratedPaper, saveHomeTestRequest, fetchHomeTestsRequest, type HomeTest as SavedHomeTest, generateHomeTestSuccess } from '../../store/features/home-test/homeTestSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useReactToPrint } from 'react-to-print';
import type { Question } from '../../store/features/question-bank/questionBankSlice';


const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const HomeTest: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const [calculatedMarks, setCalculatedMarks] = useState<number>(0);

    const printRef = useRef<HTMLDivElement>(null);

    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { unitMarks, loading: unitMarksLoading } = useSelector((state: RootState) => state.setUnitMark);
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const { loading: homeTestLoading, generatedPaper, savedHomeTests, error: homeTestError } = useSelector((state: RootState) => state.homeTest);

    const selectedAcademicYear = Form.useWatch('academic_year', form);
    const selectedClassKey = Form.useWatch('class_key', form);
    const selectedSubjectCode = Form.useWatch('subject_code', form);
    const selectedUnit = Form.useWatch('unit', form);
    const totalMarks = Form.useWatch('total_marks', form);
    
     useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(fetchHomeTestsRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
            dispatch(fetchSubjectsRequest());
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (generatedPaper) {
            setIsPaperModalVisible(true);
        }
    }, [generatedPaper]);

    useEffect(() => {
        if (homeTestError) {
            message.error(homeTestError);
            dispatch(clearGeneratedPaper());
        }
    }, [homeTestError, dispatch]);

    const onFormValuesChange = (_: any, allValues: any) => {
        const markTypes = allValues.mark_types || {};
        const total = Object.keys(markTypes).reduce((acc, mark) => {
             const numQuestions = markTypes[mark] || 0;
             return acc + (numQuestions * Number(mark));
        }, 0);
        setCalculatedMarks(total);
    };
    
    const sortedSavedTests = useMemo(() => {
        return [...savedHomeTests].sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime());
    }, [savedHomeTests]);
    

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);
    
    const academicYearOptions = useMemo(() => {
        if (!calendars) return [];
        return calendars.filter((cal: any) => cal.status === 'Active').sort((a: any,b: any) => b.academic_year.localeCompare(a.academic_year));
    }, [calendars]);

    const classOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m:any) => m.academic_year === selectedAcademicYear);
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

    const availableUnitsAndMarks = useMemo(() => {
        if (!selectedClassKey || !selectedSubjectCode) return { units: [], marks: [] };
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectName = subjects.find(s => s.subject_code === selectedSubjectCode)?.subject_name;

        const relevantUnitMarks = unitMarks.filter(um => 
            um.academic_year === academicYear &&
            um.class === className &&
            um.section === sectionName &&
            um.subject === subjectName &&
            um.status === 'Active'
        );

        const units = [...new Set(relevantUnitMarks.map(um => um.unit))];
        const marks = [...new Set(relevantUnitMarks.map(um => um.mark_type))];
        
        return { units: units.sort((a,b) => a-b), marks: marks.sort((a,b) => a-b) };
    }, [unitMarks, selectedClassKey, selectedSubjectCode, subjects]);
    
    useEffect(() => {
        if (isModalVisible && academicYearOptions.length > 0) {
            const currentYear = academicYearOptions.find((c: any) => c.is_current);
            if (currentYear) {
                form.setFieldsValue({ academic_year: currentYear.academic_year });
            } else if (academicYearOptions[0]) {
                 form.setFieldsValue({ academic_year: academicYearOptions[0].academic_year });
            }
        }
    }, [isModalVisible, academicYearOptions, form]);

    useEffect(() => {
        if (user?.organization_key && user?.staff_code && isModalVisible) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchUnitMarksRequest({ organizationKey: user.organization_key, staffCode: user.staff_code }));
            dispatch(fetchRegulationsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user, isModalVisible]);

    const showModal = () => setIsModalVisible(true);
    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handlePaperModalClose = () => {
        setIsPaperModalVisible(false);
        dispatch(clearGeneratedPaper());
    };

    const handleSaveAndPrint = () => {
        if (!generatedPaper || !user) return;
        const { template, paper } = generatedPaper;
        const [className, sectionName, academicYear] = template.class_key.split('||');

        const payload = {
            organization_key: user.organization_key!,
            staff_code: user.staff_code!,
            academic_year: academicYear,
            class_name: className,
            section_name: sectionName,
            subject_code: template.subjectCode,
            unit: String(template.unit),
            total_marks: template.totalMarks,
            test_date: dayjs().format('YYYY-MM-DD'),
            questions: paper,
        };
        
        dispatch(saveHomeTestRequest(payload));
        handlePrint();
    };
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: generatedPaper ? `${generatedPaper.template.className}_${generatedPaper.template.subjectCode}_HomeTest` : 'Home-Test-Paper',
    });
    
    const onFinish = (values: any) => {
        const [className, sectionName, academicYear] = values.class_key.split('||');
        
        const selectedMarkTypes = Object.keys(values.mark_types || {})
            .filter(key => values.mark_types[key] > 0)
            .map(Number);
            
        const payload: GenerateHomeTestPayload = {
            organizationKey: user!.organization_key!,
            staffCode: user!.staff_code!,
            academicYear: academicYear,
            className: className,
            sectionName: sectionName,
            subjectCode: values.subject_code,
            unit: values.unit,
            totalMarks: values.total_marks,
            markTypes: selectedMarkTypes,
            class_key: values.class_key,
            questionCounts: values.mark_types,
        };
        dispatch(generateHomeTestRequest(payload));
        handleCancel();
    };
    
    const handleReprint = (savedTest: SavedHomeTest) => {
        const paper = savedTest.questions as Record<string, Question[]>;
        const class_key = `${savedTest.class_name}||${savedTest.section_name}||${savedTest.academic_year}`;
        
        const template = {
            class_key: class_key,
            className: savedTest.class_name,
            sectionName: savedTest.section_name,
            academicYear: savedTest.academic_year,
            subjectCode: savedTest.subject_code,
            totalMarks: savedTest.total_marks,
        } as any;
        dispatch(generateHomeTestSuccess({ template, paper }));
    };

    const isCreateButtonDisabled = !selectedClassKey || !selectedSubjectCode || !selectedUnit || totalMarks === undefined || calculatedMarks !== totalMarks || calculatedMarks === 0;
    const isLoading = mappingsLoading || subjectsLoading || unitMarksLoading || homeTestLoading;

    return (
        <>
            <Card style={{ padding: 0 }}>
                <div style={{ textAlign: 'center', padding: '24px', background: '#fafafa' }}>
                    <Title level={4}>Home Test Paper Generator</Title>
                    <Paragraph type="secondary">Create custom test papers by selecting units and specifying the number of questions for each mark type.</Paragraph>
                </div>
                <Divider style={{ margin: 0 }} />
                <div style={{ padding: '24px', textAlign: 'right' }}>
                     <Button type="primary" icon={<PlusOutlined />} onClick={showModal}>
                        Create Home Test
                    </Button>
                </div>
            </Card>

            <Divider>My Saved Tests</Divider>
            <Spin spinning={isLoading}>
                 <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
                    dataSource={sortedSavedTests}
                    renderItem={(item, index) => {
                         const subjectName = subjects.find(s => s.subject_code === item.subject_code)?.subject_name;
                         return (
                            <List.Item>
                               <Card 
                                    hoverable 
                                    style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', position: 'relative' }}
                                    actions={[
                                        <Button type="link" onClick={() => handleReprint(item)}>View & Print</Button>
                                    ]}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        background: 'rgba(24, 144, 255, 0.1)',
                                        color: '#1890ff',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '16px',
                                    }}>
                                        {index + 1}
                                    </div>
                                    <Space direction="vertical" style={{width: '100%', paddingLeft: '30px'}}>
                                         <Row justify="space-between" align="top">
                                            <Col>
                                                <Space align="start">
                                                    <BookOutlined style={{fontSize: '24px', color: '#1890ff', paddingTop: '4px'}}/>
                                                    <div>
                                                        <Title level={5} style={{ margin: 0 }}>{item.subject_code}</Title>
                                                        <Text type="secondary">{subjectName}</Text>
                                                    </div>
                                                </Space>
                                            </Col>
                                            <Col>
                                                <Tag icon={<CalendarOutlined />} color="default">{dayjs(item.test_date).format('DD MMM YYYY')}</Tag>
                                            </Col>
                                        </Row>
                                        <Tag icon={<CheckCircleOutlined />} color="cyan">
                                            Total Marks: {item.total_marks}
                                        </Tag>
                                    </Space>
                                </Card>
                            </List.Item>
                         )
                    }}
                />
            </Spin>

            <Modal
                title="Create a New Home Test"
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()} disabled={isCreateButtonDisabled}>
                        Create
                    </Button>,
                ]}
                width={800}
                destroyOnClose
            >
                <Spin spinning={isLoading}>
                    <Row justify="end">
                        <Col>
                           <Text type="secondary">{dayjs().format('MMMM D, YYYY')}</Text>
                        </Col>
                    </Row>
                    <Divider style={{marginTop: 8}} />
                    <Form form={form} layout="vertical" onFinish={onFinish} onValuesChange={onFormValuesChange}>
                         <Row gutter={16}>
                             <Col span={8}>
                                <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                    <Select 
                                        placeholder="Select Year"
                                        onChange={() => {
                                            form.setFieldsValue({ class_key: null, subject_code: null, unit: null, mark_types: {} });
                                        }}
                                    >
                                        {academicYearOptions.map((cal: any) => (
                                            <Option key={cal.id} value={cal.academic_year}>
                                                {cal.academic_year}{cal.is_current && " (Current)"}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                             </Col>
                            <Col span={8}>
                                <Form.Item name="class_key" label="Class & Section" rules={[{ required: true }]}>
                                    <Select 
                                        placeholder="Select Class" 
                                        disabled={!selectedAcademicYear}
                                        onChange={() => {
                                            form.setFieldsValue({ subject_code: null, unit: null, mark_types: {} });
                                        }}
                                    >
                                        {classOptions.map((opt: any) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                             <Col span={8}>
                                <Form.Item name="subject_code" label="Subject" rules={[{ required: true }]}>
                                    <Select placeholder="Select Subject" disabled={!selectedClassKey} onChange={() => form.setFieldsValue({ unit: null, mark_types: {} })}>
                                         {subjectOptions.map(sub => <Option key={sub.subject_code} value={sub!.subject_code}>{sub!.subject_name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                                    <Select placeholder="Select Unit" disabled={!selectedSubjectCode} onChange={() => form.setFieldsValue({ mark_types: {} })}>
                                         <Option value="All Units">All Units</Option>
                                         {availableUnitsAndMarks.units.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                             <Form.Item label="Total Marks for Paper" required>
                                <Row gutter={8}>
                                    <Col flex="auto">
                                        <Form.Item name="total_marks" noStyle rules={[{ required: true, message: 'Total marks are required.'}]}>
                                            <InputNumber placeholder="e.g., 50" style={{width: '100%'}} disabled={!selectedUnit}/>
                                        </Form.Item>
                                    </Col>
                                    <Col flex="150px">
                                        <Tag 
                                            color={calculatedMarks === totalMarks ? 'green' : 'red'} 
                                            style={{ width: '100%', textAlign: 'center', lineHeight: '30px', fontSize: '14px' }}
                                        >
                                            Calculated: {calculatedMarks}
                                        </Tag>
                                    </Col>
                                </Row>
                            </Form.Item>
                        </Col>
                            
                            {selectedUnit && availableUnitsAndMarks.marks.length > 0 && (
                                <>
                                    <Divider orientation="left" plain>Enter Number of Questions for Each Mark Type</Divider>
                                    {availableUnitsAndMarks.marks.map(mark => (
                                        <Col span={8} key={mark}>
                                            <Form.Item name={['mark_types', String(mark)]} label={`${mark} Mark Questions`}>
                                                <InputNumber style={{width: '100%'}} placeholder="e.g., 5" min={0} />
                                            </Form.Item>
                                        </Col>
                                    ))}
                                    {calculatedMarks > totalMarks && (
                                        <Col span={24}>
                                            <Alert message="Calculated marks exceed total marks for the paper." type="warning" showIcon />
                                        </Col>
                                    )}
                                </>
                            )}
                         </Row>
                    </Form>
                </Spin>
            </Modal>

            <Modal
                title="Question Paper Preview"
                open={isPaperModalVisible}
                onCancel={handlePaperModalClose}
                width="90%"
                styles={{ body: {backgroundColor: '#fff'} }}
                style={{ top: 20 }}
                footer={[
                    <Button key="close" onClick={handlePaperModalClose}>Close</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handleSaveAndPrint} loading={homeTestLoading}>Save and Print</Button>,
                ]}
            >
                <Spin spinning={homeTestLoading}>
                    {generatedPaper && (
                        <div ref={printRef} style={{ padding: '24px' }}>
                             <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                                {schoolDetails?.logo_url && (
                                    <img src={schoolDetails.logo_url} alt="School Logo" style={{ maxHeight: '80px', marginBottom: '10px' }} />
                                )}
                                <h2 style={{ margin: 0, fontSize: '24px' }}>{schoolDetails?.school_name}</h2>
                                <h3 style={{ margin: 0, fontSize: '20px' }}>Home Test - {generatedPaper.template.academicYear}</h3>
                            </div>
                            <Row justify="space-between" style={{ marginBottom: 16 }}>
                                <Col><Text strong>Class: {generatedPaper.template.className} - {generatedPaper.template.sectionName}</Text></Col>
                                <Col><Text strong>Subject: {subjects.find(s => s.subject_code === generatedPaper.template.subjectCode)?.subject_name}</Text></Col>
                                <Col><Text strong>Total Marks: {generatedPaper.template.totalMarks}</Text></Col>
                            </Row>
                            <Divider />
                             {Object.entries(generatedPaper.paper).map(([partName, questions]) => (
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
                    )}
                </Spin>
            </Modal>
        </>
    );
};

export default HomeTest;