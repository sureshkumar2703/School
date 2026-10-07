

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Typography, InputNumber, TimePicker, Checkbox, Divider, Alert, Spin, message, List, Switch, Tooltip, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, MinusCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchExamTimetablesRequest } from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import { fetchUnitMarksRequest } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { generatePaperRequest, clearGeneratedPaper, fetchQuestionsRequest } from '../../store/features/question-bank/questionBankSlice';
import { saveQuestionPaperRequest, fetchQuestionPapersRequest } from '../../store/features/question-paper/questionPaperSlice';
import dayjs from 'dayjs';
import type { Question } from '../../store/features/question-bank/questionBankSlice';
import { useReactToPrint } from 'react-to-print';


const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const unitColors = ['#e6f7ff', '#f6ffed', '#fffbe6', '#fff1f0', '#f9f0ff', '#e6fffb', '#fff0f6', '#fff7e6', '#f0fff0', '#e6e6fa'];
const getUnitColor = (unit: number) => unitColors[unit % unitColors.length];

// Helper to split answers by newline
const splitAnswers = (raw: string | undefined | null): string[] => {
    if (!raw) return [];
    return raw
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean);
};

// Standard Fisher-Yates shuffle algorithm
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shuffleArray = (array: any[]): any[] => {
    let currentIndex = array.length,  randomIndex;
    const newArray = [...array]; // Create a copy to avoid modifying the original array
  
    // While there remain elements to shuffle.
    while (currentIndex > 0) {
  
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [newArray[currentIndex], newArray[randomIndex]] = [
        newArray[randomIndex], newArray[currentIndex]];
    }
  
    return newArray;
};

const ShuffledAnswerBank: React.FC<{ questionIds: string[]; allQuestions: Question[] }> = ({ questionIds, allQuestions }) => {
    const answerBank = useMemo(() => {
        if (!questionIds || !Array.isArray(questionIds) || questionIds.some(id => !id) || !allQuestions || allQuestions.length === 0) {
            return [];
        }
        
        const allAnswers = questionIds.flatMap(id => {
            const question = allQuestions.find(q => q.id === id);
            return splitAnswers(question?.answer);
        });

        return shuffleArray(allAnswers);
    }, [questionIds, allQuestions]);

    if (answerBank.length === 0) {
        return null;
    }

    return (
        <Form.Item label="Shuffled Answer Bank (for student reference)">
            <Select
                style={{ width: '100%' }}
                placeholder="Shuffled answers will appear here"
            >
                {answerBank.map((answer, index) => (
                    <Option key={`${answer}-${index}`} value={answer}>{answer}</Option>
                ))}
            </Select>
        </Form.Item>
    );
};


const ExamQuestionPaper: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [form] = Form.useForm();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { timetables: examTimetables, loading: timetablesLoading } = useSelector((state: RootState) => state.examTimetableAdmin);
    const { unitMarks, loading: unitMarksLoading } = useSelector((state: RootState) => state.setUnitMark);
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const { loading: questionBankLoading, generatedPaper, error: questionBankError, questions: allQuestions } = useSelector((state: RootState) => state.questionBank);
    const { loading: questionPaperLoading, questionPapers } = useSelector((state: RootState) => state.questionPaper);
    
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [calculatedMarks, setCalculatedMarks] = useState(0);
    const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
    
    const printRef = useRef<HTMLDivElement>(null);
    
    const allFormValues = Form.useWatch([], form);
    const selectedUnit = Form.useWatch('unit', form) || [];
    const selectedMarkTypes = Form.useWatch('mark_types', form) || [];
    const totalMarksForPaper = Form.useWatch('total_mark', form);
    const selectedClassKey = Form.useWatch('class_key', form);
    const selectedSubject = Form.useWatch('subject', form);
    
    const allSelectedQuestionIds = useMemo(() => {
        const selected = new Set<string>();
        const parts = allFormValues?.parts || [];
        parts.forEach((part: any) => {
            if (!part) return;
    
            if (part.is_choice && part.manual_choice_questions) {
                Object.values(part.manual_choice_questions).forEach((choicePair: any) => {
                    if (choicePair?.a) selected.add(choicePair.a);
                    if (choicePair?.b) selected.add(choicePair.b);
                });
            } else if (part.manual_questions) {
                if (part.mark_type === 1) {
                    Object.values(part.manual_questions).forEach((questionTypeGroup: any) => {
                        if (questionTypeGroup) {
                            Object.values(questionTypeGroup).forEach((id: any) => {
                                if (id) selected.add(id);
                            });
                        }
                    });
                } else {
                    const questionGroup = part.manual_questions[part.mark_type];
                    if (Array.isArray(questionGroup)) {
                        questionGroup.forEach((id: string) => {
                            if (id) selected.add(id);
                        });
                    }
                }
            }
        });
        return selected;
    }, [allFormValues]);
    
    const areAllQuestionsSelected = useMemo(() => {
        const parts = allFormValues?.parts || [];
        if (parts.length === 0) return false;

        return parts.every((part: any) => {
            if (!part || !part.mark_type) return false;
            
            if (part.is_choice && part.manual_choice_questions) {
                const numToProvide = part.total_questions || 0;
                for (let i = 0; i < numToProvide; i++) {
                    const choicePair = part.manual_choice_questions[i];
                    if (!choicePair || !choicePair.a || !choicePair.b) {
                        return false;
                    }
                }
            } else if (part.manual_questions) {
                if (part.mark_type === 1) {
                    const oneMarkTypesInForm = allFormValues.one_mark_question_types || [];
                    if (oneMarkTypesInForm.length === 0 && Object.keys(part.one_mark_counts || {}).length === 0) return true;
                    
                    for (const type of oneMarkTypesInForm) {
                        const numToProvide = part.one_mark_counts?.[type] || 0;
                        for (let i = 0; i < numToProvide; i++) {
                            if (!part.manual_questions[type] || !part.manual_questions[type][i]) {
                                return false;
                            }
                        }
                    }
                } else {
                    const numToProvide = part.total_questions || 0;
                    const questionGroup = part.manual_questions[part.mark_type];
                    if (!questionGroup || questionGroup.length < numToProvide) {
                        return false;
                    }
                    for (let i = 0; i < numToProvide; i++) {
                        if (!questionGroup[i]) {
                            return false;
                        }
                    }
                }
            } else {
                 if ((part.mark_type === 1 && (part.one_mark_counts && Object.values(part.one_mark_counts).some((v: any) => v > 0))) || (part.mark_type > 1 && part.total_questions > 0)) {
                    return false;
                }
            }
            return true;
        });
    }, [allFormValues]);

    const oneMarkTypes = [
        'Choose the correct answer',
        'Match the Following',
        'Fill in the blanks'
    ];
    
    useEffect(() => {
        if (generatedPaper) {
            setIsPaperModalVisible(true);
        }
    }, [generatedPaper]);

    useEffect(() => {
        if (questionBankError) {
            message.error(questionBankError);
            dispatch(clearGeneratedPaper());
        }
    }, [questionBankError, dispatch]);


    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchUnitMarksRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
            dispatch(fetchRegulationsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchQuestionsRequest({ 
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
            dispatch(fetchQuestionPapersRequest(user.organization_key));
        }
    }, [dispatch, user]);
    
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

    const matchingTimetable = useMemo(() => {
        if (!selectedClassKey || !selectedSubject || !examTimetables) return null;
        
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        
        return examTimetables.find(tt => 
            tt.class_name === className && 
            tt.section_name === sectionName && 
            tt.academic_year === academicYear &&
            tt.exam_days.some(day => day.subject === selectedSubject)
        );
    }, [selectedClassKey, selectedSubject, examTimetables]);
    
    const availableUnitsAndMarks = useMemo(() => {
        if (allQuestions.length === 0) return { units: [], marks: [] };
        const units = [...new Set(allQuestions.map(q => q.unit))].sort((a, b) => a - b);
        
        let marks: number[] = [];
        if (selectedUnit.length > 0) {
            const questionsInSelectedUnits = allQuestions.filter(q => selectedUnit.includes(q.unit));
            marks = [...new Set(questionsInSelectedUnits.map(q => q.question_type))].sort((a, b) => a - b);
        }
        
        return { units, marks };
    }, [allQuestions, selectedUnit]);
    
    const availableOneMarkTypes = useMemo(() => {
        if (!selectedMarkTypes.includes(1) || selectedUnit.length === 0) return [];
        const oneMarkQuestions = allQuestions.filter(q => 
            q.question_type === 1 && 
            selectedUnit.includes(q.unit) &&
            q.title
        );
        return [...new Set(oneMarkQuestions.map(q => q.title!))];
    }, [allQuestions, selectedUnit, selectedMarkTypes]);


    useEffect(() => {
        if (matchingTimetable) {
            const examDay = matchingTimetable.exam_days.find(d => d.subject === selectedSubject);
            form.setFieldsValue({
                exam_title: matchingTimetable.exam_title,
                total_mark: matchingTimetable.exam_total_mark,
                time: dayjs(matchingTimetable.exam_time, 'HH:mm:ss'),
                exam_date: examDay ? dayjs(examDay.examdate).format('YYYY-MM-DD') : null,
            });
        } else {
             form.resetFields(['exam_title', 'total_mark', 'time', 'exam_date']);
        }
    }, [matchingTimetable, selectedSubject, form]);

    const handleYearChange = (year: string | null) => {
        setSelectedAcademicYear(year);
        form.setFieldsValue({ class_key: null, subject: null, unit: [], mark_types: [], parts: [] });
    };

    const handleClassChange = (key: string | null) => {
        form.setFieldsValue({
            class_key: key,
            subject: null,
            unit: [],
            mark_types: [],
            parts: [],
        });
    };
    
    const handleSubjectChange = (subject: string | null) => {
         form.setFieldsValue({
            subject: subject,
            unit: [],
            mark_types: [],
            parts: [],
        });
    };

    const handleUnitChange = () => {
        form.setFieldsValue({ mark_types: [], parts: [] });
    };

    const onFormValuesChange = (_: any, allValues: any) => {
        const parts = allValues.parts || [];
        const total = parts.reduce((acc: number, part: any) => {
            if (!part) return acc;
            const marksPerQuestion = part.mark_type || 0;
            if (marksPerQuestion === 1) {
                const oneMarkCounts = part.one_mark_counts || {};
                const oneMarkTotal = Object.entries(oneMarkCounts)
                    .filter(([key]) => key.endsWith('_answer'))
                    .reduce((sum: number, [, value]: [string, any]) => sum + (Number(value) || 0), 0);
                return acc + oneMarkTotal;
            } else {
                const numToAnswer = part.questions_to_answer || 0;
                return acc + (numToAnswer * marksPerQuestion);
            }
        }, 0);
        setCalculatedMarks(total);
    };
    
    const onFinish = () => {
        const values = form.getFieldsValue();
        if (!values.class_key) {
            message.error("Class information is missing. Cannot generate paper.");
            return;
        }
        const [className, sectionName, academicYear] = values.class_key.split('||');

        const payload = {
            ...values,
            organizationKey: user!.organization_key,
            staffCode: user!.staff_code,
            className,
            sectionName,
            academicYear,
            subject: selectedSubject,
        };
        dispatch(generatePaperRequest(payload));
    };
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        pageStyle: `@page { size: A4; margin: 20mm; } @media print { body { -webkit-print-color-adjust: exact; } .printable-area .ant-row { display: block; width: 100%; } .printable-area .ant-col { display: block; width: 100% !important; max-width: 100% !important; flex: 0 0 100% !important; } }`,
    });

    const handlePaperModalClose = () => {
        setIsPaperModalVisible(false);
        dispatch(clearGeneratedPaper());
    };
    
    const handleConfirmAndSave = () => {
        if (!generatedPaper || !user || !printRef.current) return;
        
        const { template } = generatedPaper;
        if (!template.class_key) {
            message.error("Cannot save paper: Class information is missing in the template.");
            return;
        }

        const [className, sectionName, academicYear] = template.class_key.split('||');
        
        // Get the full HTML content of the preview modal
        const paperContent = printRef.current.innerHTML;
        
        const payload = {
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            academic_year: academicYear,
            class_name: className,
            section_name: sectionName,
            subject: template.subject,
            exam_title: template.exam_title,
            exam_date: template.exam_date,
            exam_time: template.time ? dayjs(template.time).format('HH:mm:ss') : null,
            total_mark: template.total_mark,
            school_details: schoolDetails, // This will be JSON
            paper_content: paperContent, // Save the HTML content
        };

        dispatch(saveQuestionPaperRequest(payload as any));
        handlePaperModalClose();
        form.resetFields();
    };

    const isCreateButtonDisabled = calculatedMarks !== totalMarksForPaper || calculatedMarks === 0 || !areAllQuestionsSelected;
    const isLoading = mappingsLoading || subjectsLoading || timetablesLoading || unitMarksLoading || questionBankLoading;
    
    const examDate = matchingTimetable?.exam_days.find(d => d.subject === selectedSubject)?.examdate;
    
    const paperAlreadyExists = useMemo(() => {
        if (!selectedClassKey || !selectedSubject || !selectedAcademicYear) return false;
        const [className, sectionName] = selectedClassKey.split('||');
        return questionPapers.some(p =>
            p.academic_year === selectedAcademicYear &&
            p.class_name === className &&
            p.section_name === sectionName &&
            p.subject === selectedSubject
        );
    }, [questionPapers, selectedAcademicYear, selectedClassKey, selectedSubject]);

    const isUnitDisabled = !selectedSubject || !form.getFieldValue('exam_date') || !form.getFieldValue('exam_title') || !form.getFieldValue('time') || paperAlreadyExists;


    return (
        <>
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        padding: 20px;
                        margin: 0;
                    }
                     .printable-area .ant-row {
                        display: block;
                        width: 100%;
                    }
                    .printable-area .ant-col {
                        display: block;
                        width: 100% !important;
                        max-width: 100% !important;
                        flex: 0 0 100% !important;
                    }
                }
                .scrollable-select .ant-select-selection-overflow {
                    flex-wrap: nowrap;
                    overflow-x: auto;
                }
                .scrollable-select .ant-select-selection-item {
                    white-space: nowrap;
                }
                .scrollable-select-dropdown .ant-select-item-option-content {
                     white-space: normal;
                }
                 .choice-select .ant-select-selector {
                    overflow-x: auto;
                    white-space: nowrap;
                }

                .choice-select .ant-select-selection-item-content {
                    white-space: normal;
                    overflow: visible;
                }
                .scrollable-dropdown .ant-select-item-option-content {
                    white-space: normal;
                }
            `}</style>
            <Card>
                <Title level={4} style={{ textAlign: 'center', marginBottom: '24px' }}>Exam Question Paper</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Select the academic year, class, and subject to generate or view question papers.
                </Text>
                <Spin spinning={isLoading}>
                    <Form form={form} layout="vertical" onValuesChange={onFormValuesChange} onFinish={onFinish}>
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={8}>
                                <Form.Item name="academic_year" label="Academic Year">
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
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="class_key" label="Class & Section" rules={[{ required: true }]}>
                                    <Select
                                        showSearch
                                        placeholder="Select Class & Section"
                                        style={{ width: '100%' }}
                                        onChange={handleClassChange}
                                        disabled={!selectedAcademicYear}
                                        allowClear
                                    >
                                        {classOptions.map((opt: any) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={8}>
                                <Form.Item name="subject" label="Subject">
                                    <Select
                                        showSearch
                                        placeholder="Select Subject"
                                        style={{ width: '100%' }}
                                        onChange={handleSubjectChange}
                                        disabled={!selectedClassKey}
                                        allowClear
                                    >
                                        {subjectOptions.map(sub => <Option key={sub.subject_code} value={sub.subject_name}>{sub.subject_name}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item name="exam_date" label="Exam Date">
                                    <Input placeholder="Auto-filled" disabled />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item name="exam_title" label="Exam Title">
                                    <Input placeholder="Auto-filled from timetable" disabled />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item name="time" label="Time">
                                    <TimePicker format="HH:mm" style={{ width: '100%' }} disabled />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={6}>
                                <Form.Item name="total_mark" label="Total Mark">
                                    <InputNumber placeholder="Auto-filled from timetable" style={{ width: '100%' }} min={1} disabled />
                                </Form.Item>
                            </Col>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="unit"
                                    label="Unit"
                                    help={isUnitDisabled && paperAlreadyExists ? "A paper for this class/subject already exists." : null}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select Unit(s)"
                                        disabled={isUnitDisabled}
                                        onChange={handleUnitChange}
                                    >
                                        {availableUnitsAndMarks.units.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            {selectedUnit && selectedUnit.length > 0 && (
                                <Col xs={24} md={12}>
                                    <Form.Item name="mark_types" label="Available Mark Types for this Unit">
                                        <Checkbox.Group options={availableUnitsAndMarks.marks.map(m => ({ label: `${m} Mark`, value: m }))} />
                                    </Form.Item>
                                </Col>
                            )}
                            {selectedMarkTypes?.includes(1) && (
                                <Col xs={24}>
                                    <Form.Item name="one_mark_question_types" label="1 Mark Question Types">
                                        <Checkbox.Group options={oneMarkTypes.map(type => ({ label: type, value: type }))} />
                                    </Form.Item>
                                </Col>
                            )}
                        </Row>
                        
                        {selectedMarkTypes && selectedMarkTypes.length > 0 && (
                            <>
                                <Divider>Question Paper Parts</Divider>
                                <Form.List name="parts">
                                    {(fields, { add, remove }) => {
                                        return (
                                        <>
                                            {fields.map(({ key, name, ...restField }) => {
                                                const partMarkType = form.getFieldValue(['parts', name, 'mark_type']);
                                                const numToProvide = form.getFieldValue(['parts', name, 'total_questions']) || 0;
                                                const isChoiceActive = form.getFieldValue(['parts', name, 'is_choice']) || false;


                                                
                                                return (
                                                    <Card key={key} size="small" style={{ marginBottom: 16 }}
                                                        styles={{ body: { padding: '16px' } }}
                                                        title={`Part ${String.fromCharCode(65 + name)}`}
                                                        extra={
                                                            <Space>
                                                                {partMarkType >= 10 && (
                                                                    <Form.Item {...restField} name={[name, 'is_choice']} valuePropName="checked" noStyle>
                                                                        <Switch size="small" checkedChildren="Choice" unCheckedChildren="Choice" />
                                                                    </Form.Item>
                                                                )}
                                                                <Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />
                                                            </Space>
                                                        }
                                                    >
                                                        <Row gutter={16}>
                                                             <Col xs={24} md={8}>
                                                                 <Form.Item
                                                                    {...restField}
                                                                    name={[name, 'partName']}
                                                                    label="Part Name/Letter"
                                                                    rules={[{ required: true, message: 'Part Name is required' }]}
                                                                    initialValue={String.fromCharCode(65 + name)}
                                                                >
                                                                    <Input placeholder="e.g., A" />
                                                                </Form.Item>
                                                            </Col>
                                                            <Col xs={24} md={8}>
                                                                <Form.Item
                                                                    {...restField}
                                                                    name={[name, 'mark_type']}
                                                                    label="Mark Type for this Part"
                                                                    rules={[{ required: true, message: 'Select mark type' }]}
                                                                >
                                                                    <Select
                                                                        placeholder="Select mark"
                                                                        onChange={(value) => {
                                                                            const currentParts = form.getFieldValue('parts') || [];
                                                                            const isUsed = currentParts.some((part: any, index: number) => index !== name && part && part.mark_type === value);
                                                                            if (isUsed) {
                                                                                message.error('This mark type is already used in another part.');
                                                                                // Reset the value
                                                                                const updatedParts = [...currentParts];
                                                                                updatedParts[name] = { ...updatedParts[name], mark_type: null };
                                                                                form.setFieldsValue({ parts: updatedParts });
                                                                            }
                                                                        }}
                                                                    >
                                                                        {selectedMarkTypes.map((mark: number) => (
                                                                            <Option key={mark} value={mark}>{mark} Mark</Option>
                                                                        ))}
                                                                    </Select>
                                                                </Form.Item>
                                                            </Col>
                                                            
                                                            {partMarkType === 1 && (form.getFieldValue(['one_mark_question_types']) || []).map((questionsampletype: string) => {
                                                                const numOneMarkToProvide = form.getFieldValue(['parts', name, 'one_mark_counts', questionsampletype]) || 0;
                                                                
                                                                return (
                                                                    <Col xs={24} md={8} key={questionsampletype}>
                                                                        <Form.Item
                                                                            {...restField}
                                                                            label={`# of "${questionsampletype}"`}
                                                                            style={{ marginBottom: 0 }}
                                                                        >
                                                                            <Row gutter={8}>
                                                                                <Col span={12}>
                                                                                    <Form.Item
                                                                                        name={[name, 'one_mark_counts', questionsampletype]}
                                                                                        help="Provide"
                                                                                        rules={[{ required: true, message: 'Required' }]}
                                                                                    >
                                                                                        <InputNumber 
                                                                                            style={{ width: '100%' }} 
                                                                                            min={0} 
                                                                                            placeholder="Provide" 
                                                                                            onChange={(value) => {
                                                                                                const currentParts = form.getFieldValue('parts');
                                                                                                currentParts[name].one_mark_counts[`${questionsampletype}_answer`] = value;
                                                                                                form.setFieldsValue({ parts: currentParts });
                                                                                                // Manually trigger re-calculation
                                                                                                onFormValuesChange(null, form.getFieldsValue());
                                                                                            }}
                                                                                        />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                                <Col span={12}>
                                                                                    <Form.Item
                                                                                        name={[name, 'one_mark_counts', `${questionsampletype}_answer`]}
                                                                                        help="Answer"
                                                                                    >
                                                                                        <InputNumber style={{ width: '100%' }} placeholder="Answer" disabled />
                                                                                    </Form.Item>
                                                                                </Col>
                                                                            </Row>
                                                                        </Form.Item>
                                                                        <Form.Item
                                                                            shouldUpdate={(prevValues, currentValues) =>
                                                                                prevValues.parts?.[name]?.manual_questions?.[questionsampletype] !== currentValues.parts?.[name]?.manual_questions?.[questionsampletype]
                                                                            }
                                                                            noStyle
                                                                        >
                                                                            {({ getFieldValue }) => {
                                                                                const selectedQuestionIds = getFieldValue(['parts', name, 'manual_questions', questionsampletype]) || [];

                                                                                return (
                                                                                    <>
                                                                                    <Row gutter={[16, 8]}>
                                                                                        {Array.from({ length: numOneMarkToProvide || 0 }).map((_, index) => {
                                                                                            const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;
                                                                                            const matchingQuestions = allQuestions.filter(sq =>
                                                                                                sq.question_type === 1 &&
                                                                                                sq.subject_code === subjectCode &&
                                                                                                sq.title?.trim().toLowerCase() === questionsampletype.trim().toLowerCase() &&
                                                                                                selectedUnit.includes(sq.unit)
                                                                                            );
                                                                                            
                                                                                            const currentQuestionId = getFieldValue(['parts', name, 'manual_questions', questionsampletype, index]);
                                                                                            
                                                                                            const questionsGroupedByUnit = matchingQuestions.reduce((acc, q) => {
                                                                                                const unit = q.unit || 0;
                                                                                                if (!acc[unit]) {
                                                                                                    acc[unit] = [];
                                                                                                }
                                                                                                acc[unit].push(q);
                                                                                                return acc;
                                                                                            }, {} as Record<number, Question[]>);


                                                                                            return (
                                                                                                <Col key={index} xs={24} md={12}>
                                                                                                    <Form.Item
                                                                                                        {...restField}
                                                                                                        name={[name, 'manual_questions', questionsampletype, index]}
                                                                                                        label={`Q ${index + 1}`}
                                                                                                        style={{marginBottom: '8px'}}
                                                                                                    >
                                                                                                        <Select
                                                                                                            showSearch
                                                                                                            placeholder={`Select Q ${index + 1}`}
                                                                                                            dropdownClassName="scrollable-dropdown"
                                                                                                            filterOption={(input, option) =>
                                                                                                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                                                                                            }
                                                                                                        >
                                                                                                            {Object.entries(questionsGroupedByUnit).map(([unit, questions]) => (
                                                                                                                <Select.OptGroup key={unit} label={`Unit ${unit}`}>
                                                                                                                    {(questions as Question[]).map(sq => (
                                                                                                                        <Option
                                                                                                                            key={sq.id}
                                                                                                                            value={sq.id}
                                                                                                                            disabled={(allSelectedQuestionIds as Set<string>).has(sq.id) && sq.id !== currentQuestionId}
                                                                                                                            style={{ 
                                                                                                                                backgroundColor: getUnitColor(Number(unit)),
                                                                                                                                color: (allSelectedQuestionIds as Set<string>).has(sq.id) && sq.id !== currentQuestionId ? '#999' : '#000',
                                                                                                                            }}
                                                                                                                        >
                                                                                                                            {sq.question}
                                                                                                                        </Option>
                                                                                                                    ))}
                                                                                                                </Select.OptGroup>
                                                                                                            ))}
                                                                                                        </Select>
                                                                                                    </Form.Item>
                                                                                                    {questionsampletype === 'Choose the correct answer' && currentQuestionId && (
                                                                                                        <Form.Item>
                                                                                                            <List
                                                                                                                size="small"
                                                                                                                bordered
                                                                                                                dataSource={[
                                                                                                                    allQuestions.find(q => q.id === currentQuestionId)?.option1,
                                                                                                                    allQuestions.find(q => q.id === currentQuestionId)?.option2,
                                                                                                                    allQuestions.find(q => q.id === currentQuestionId)?.option3,
                                                                                                                    allQuestions.find(q => q.id === currentQuestionId)?.option4,
                                                                                                                ].filter(Boolean)}
                                                                                                                renderItem={(item, idx) => (
                                                                                                                    <List.Item style={{padding: '4px 8px'}}>
                                                                                                                        <Text type="secondary">{String.fromCharCode(97 + idx)}) {item}</Text>
                                                                                                                    </List.Item>
                                                                                                                )}
                                                                                                            />
                                                                                                        </Form.Item>
                                                                                                    )}
                                                                                                    {
                                                                                                        questionsampletype === 'Match the Following' &&
                                                                                                        <ShuffledAnswerBank questionIds={selectedQuestionIds as any} allQuestions={allQuestions} />
                                                                                                    }
                                                                                                </Col>
                                                                                            );
                                                                                        })}
                                                                                    </Row>
                                                                                    </>
                                                                                );
                                                                            }}
                                                                        </Form.Item>
                                                                    </Col>
                                                                )
                                                            })}

                                                            {!isChoiceActive && partMarkType > 1 && (
                                                                <>
                                                                    <Col xs={24} md={8}>
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'total_questions']}
                                                                            label="Number of Questions"
                                                                            rules={[{ required: true }]}
                                                                        >
                                                                            <InputNumber style={{width: '100%'}} min={1} placeholder="e.g., 5"/>
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col xs={24} md={8}>
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'questions_to_answer']}
                                                                            label="Questions to Answer"
                                                                            rules={[
                                                                                { required: true },
                                                                                ({ getFieldValue }) => ({
                                                                                    validator(_, value) {
                                                                                        const total = getFieldValue(['parts', name, 'total_questions']);
                                                                                        if (!value || !total || value <= total) {
                                                                                            return Promise.resolve();
                                                                                        }
                                                                                        return Promise.reject(new Error("Cannot be more than 'Number of Questions'"));
                                                                                    },
                                                                                }),
                                                                            ]}
                                                                        >
                                                                            <InputNumber style={{width: '100%'}} min={1} placeholder="e.g., 3"/>
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={24}>
                                                                        <Row gutter={[16, 8]}>
                                                                            {Array.from({ length: numToProvide || 0 }).map((_, index) => {
                                                                                const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;
                                                                                const matchingQuestions = allQuestions.filter(q =>
                                                                                    q.question_type === partMarkType &&
                                                                                    q.subject_code === subjectCode &&
                                                                                    selectedUnit.includes(q.unit)
                                                                                );
                                                                                const currentQuestionId = form.getFieldValue(['parts', name, 'manual_questions', partMarkType, index]);

                                                                                return (
                                                                                    <Col key={index} xs={24} md={12}>
                                                                                        <Form.Item
                                                                                            {...restField}
                                                                                            name={[name, 'manual_questions', partMarkType, index]}
                                                                                            label={`Q ${index + 1}`}
                                                                                            style={{ marginBottom: 0 }}
                                                                                        >
                                                                                            <Select
                                                                                                showSearch
                                                                                                placeholder={`Select Question ${index + 1}`}
                                                                                                dropdownClassName="scrollable-dropdown"
                                                                                                filterOption={(input, option) =>
                                                                                                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                                                                                }
                                                                                            >
                                                                                                {matchingQuestions.map(q => (
                                                                                                    <Option
                                                                                                        key={q.id}
                                                                                                        value={q.id}
                                                                                                        disabled={(allSelectedQuestionIds as Set<string>).has(q.id) && q.id !== currentQuestionId}
                                                                                                        style={{
                                                                                                            backgroundColor: getUnitColor(q.unit),
                                                                                                            color: (allSelectedQuestionIds as Set<string>).has(q.id) && q.id !== currentQuestionId ? '#999' : '#000',
                                                                                                            whiteSpace: 'normal',
                                                                                                        }}
                                                                                                    >
                                                                                                        {q.question}
                                                                                                    </Option>
                                                                                                ))}
                                                                                            </Select>
                                                                                        </Form.Item>
                                                                                    </Col>
                                                                                );
                                                                            })}
                                                                        </Row>
                                                                    </Col>
                                                                </>
                                                            )}
                                                            {isChoiceActive && (
                                                                <>
                                                                    <Col xs={12} md={8}>
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'total_questions']}
                                                                            label="Questions to Provide"
                                                                            rules={[{ required: true }]}
                                                                        >
                                                                            <InputNumber style={{width: '100%'}} min={1} placeholder="e.g., 2"/>
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col xs={12} md={8}>
                                                                        <Form.Item
                                                                            {...restField}
                                                                            name={[name, 'questions_to_answer']}
                                                                            label="Questions to Answer"
                                                                            rules={[{ required: true }]}
                                                                        >
                                                                            <InputNumber style={{width: '100%'}} min={1} placeholder="e.g., 1"/>
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col span={24}>
                                                                        <Row gutter={[16, 16]}>
                                                                            {Array.from({ length: numToProvide || 0 }).map((_, index) => {
                                                                                const questionA_id = form.getFieldValue(['parts', name, 'manual_choice_questions', index, 'a']);
                                                                                const questionB_id = form.getFieldValue(['parts', name, 'manual_choice_questions', index, 'b']);
                                                                                const questionA = allQuestions.find(q => q.id === questionA_id);
                                                                                const questionB = allQuestions.find(q => q.id === questionB_id);
                                                                                const pairTotal = (questionA?.question_type || 0) + (questionB?.question_type || 0);
                                                                                
                                                                                const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;
                                                                                
                                                                                const questionsGroupedByUnit = allQuestions
                                                                                    .filter(q => 
                                                                                        q.question_type < partMarkType && 
                                                                                        q.question_type >= 2 &&
                                                                                        q.subject_code === subjectCode &&
                                                                                        selectedUnit.includes(q.unit)
                                                                                    )
                                                                                    .reduce((acc, q) => {
                                                                                        const unit = q.unit || 0;
                                                                                        if (!acc[unit]) acc[unit] = [];
                                                                                        acc[unit].push(q);
                                                                                        return acc;
                                                                                    }, {} as Record<number, Question[]>);


                                                                                return (
                                                                                    <Col xs={24} lg={12} key={index}>
                                                                                        <Card size="small" style={{ background: '#f0f5ff' }}
                                                                                            title={
                                                                                                <Row justify="space-between" align="middle">
                                                                                                    <Col><Text strong>Question {index + 1}</Text></Col>
                                                                                                    <Col>
                                                                                                        <Tag color={pairTotal < partMarkType ? 'red' : 'green'}>
                                                                                                            Total: {pairTotal} / {partMarkType} Marks
                                                                                                        </Tag>
                                                                                                    </Col>
                                                                                                </Row>
                                                                                            }
                                                                                        >
                                                                                            <Row gutter={[16, 8]} align="top">
                                                                                                <Col span={24}>
                                                                                                    <Form.Item
                                                                                                        {...restField}
                                                                                                        name={[name, 'manual_choice_questions', index, 'a']}
                                                                                                        label={`(a)`}
                                                                                                        rules={[{ required: true }]}
                                                                                                    >
                                                                                                        <Select
                                                                                                            showSearch
                                                                                                            placeholder="Select first choice"
                                                                                                            allowClear
                                                                                                            className="choice-select"
                                                                                                            optionLabelProp="label"
                                                                                                        >
                                                                                                            {Object.entries(questionsGroupedByUnit).map(([unit, questions]) => (
                                                                                                                <Select.OptGroup key={`a-${unit}`} label={`Unit ${unit}`}>
                                                                                                                    {(questions as Question[]).map(q => (
                                                                                                                        <Option key={q.id} value={q.id} label={q.question} disabled={((allSelectedQuestionIds as Set<string>).has(q.id) && q.id !== questionA_id) || q.question_type >= partMarkType}>
                                                                                                                            <div style={{ whiteSpace: 'normal' }}>{q.question} ({q.question_type} marks)</div>
                                                                                                                        </Option>
                                                                                                                    ))}
                                                                                                                </Select.OptGroup>
                                                                                                            ))}
                                                                                                        </Select>
                                                                                                    </Form.Item>
                                                                                                </Col>
                                                                                                <Col span={24} style={{ textAlign: 'center', lineHeight: '32px' }}><Text strong>OR</Text></Col>
                                                                                                <Col span={24}>
                                                                                                    <Form.Item
                                                                                                        {...restField}
                                                                                                        name={[name, 'manual_choice_questions', index, 'b']}
                                                                                                        label={`(b)`}
                                                                                                        rules={[{ required: true }]}
                                                                                                    >
                                                                                                    <Select
                                                                                                        showSearch
                                                                                                        placeholder="Select second choice"
                                                                                                        allowClear
                                                                                                        className="choice-select"
                                                                                                        optionLabelProp="label"
                                                                                                    >
                                                                                                            {Object.entries(questionsGroupedByUnit).map(([unit, questions]) => (
                                                                                                                <Select.OptGroup key={`b-${unit}`} label={`Unit ${unit}`}>
                                                                                                                    {(questions as Question[]).map(sq => (
                                                                                                                        <Option key={sq.id} value={sq.id} label={sq.question} disabled={((allSelectedQuestionIds as Set<string>).has(sq.id) && sq.id !== questionB_id) || sq.question_type >= partMarkType}>
                                                                                                                            <div style={{ whiteSpace: 'normal' }}>{sq.question} ({sq.question_type} marks)</div>
                                                                                                                        </Option>
                                                                                                                    ))}
                                                                                                                </Select.OptGroup>
                                                                                                            ))}
                                                                                                        </Select>
                                                                                                    </Form.Item>
                                                                                                </Col>
                                                                                            </Row>
                                                                                        </Card>
                                                                                    </Col>
                                                                                );
                                                                            })}
                                                                        </Row>
                                                                    </Col>
                                                                </>
                                                            )}
                                                        </Row>
                                                    </Card>
                                                );
                                            })}
                                            <Row gutter={16}>
                                                <Col span={24}>
                                                    <Form.Item>
                                                        <Button 
                                                            type="dashed" 
                                                            onClick={() => add()} 
                                                            block 
                                                            icon={<PlusOutlined />}
                                                        >
                                                            Add Part
                                                        </Button>
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                            <Row justify="center" style={{ marginTop: 16 }}>
                                                <Col>
                                                    <Text type="secondary">
                                                        Remaining Marks to Assign: <Text strong>{(totalMarksForPaper || 0) - calculatedMarks}</Text>
                                                    </Text>
                                                </Col>
                                            </Row>
                                            {isCreateButtonDisabled === false && (
                                                <Row justify="center" style={{ marginTop: 24 }}>
                                                    <Col>
                                                        <Button type="primary" size="large" htmlType="submit">
                                                            Generate Question Paper
                                                        </Button>
                                                    </Col>
                                                </Row>
                                            )}
                                        </>
                                        )
                                    }}
                                </Form.List>
                            </>
                        )}
                    </Form>
                </Spin>
                <Modal
                    title="Question Paper Preview"
                    open={isPaperModalVisible}
                    onCancel={handlePaperModalClose}
                    width="90%"
                    style={{ top: 20 }}
                    styles={{ body: { backgroundColor: '#fff' } }}
                    footer={[
                        <Button key="back" onClick={() => setIsPaperModalVisible(false)}>
                            Back to Edit
                        </Button>,
                        <Button key="close" onClick={handlePaperModalClose}>
                            Close
                        </Button>,
                        <Button key="confirm" type="primary" icon={<SaveOutlined />} onClick={handleConfirmAndSave} loading={questionPaperLoading}>
                            Confirm & Save
                        </Button>,
                    ]}
                >
                    <Spin spinning={questionBankLoading}>
                       {generatedPaper && (
                            <div ref={printRef} className="printable-area" style={{ padding: '24px', background: 'white', color: 'black' }}>
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    {schoolDetails?.logo_url && <img src={schoolDetails.logo_url} alt="School Logo" style={{ maxHeight: 80, marginBottom: 10 }} />}
                                    <Title level={3} style={{ margin: 0, color: 'black' }}>{schoolDetails?.school_name}</Title>
                                    <Paragraph style={{ margin: 0, color: 'black' }}>{schoolDetails?.address}</Paragraph>
                                    <Title level={4} style={{ margin: '12px 0 0 0', color: 'black' }}>{generatedPaper.template.exam_title}</Title>
                                </div>
                                <Row justify="space-between" style={{ marginBottom: 4, color: 'black' }}>
                                    <Col><Text strong style={{color: 'black'}}>Class: {generatedPaper.template.className} - {generatedPaper.template.sectionName}</Text></Col>
                                    <Col><Text strong style={{color: 'black'}}>Subject: {subjects.find(s => s.subject_name === generatedPaper.template.subject)?.subject_name || generatedPaper.template.subject}</Text></Col>
                                    <Col><Text strong style={{color: 'black'}}>Mark: {generatedPaper.template.total_mark} / Time: {dayjs(generatedPaper.template.time).format('H [hr] m [min]')}</Text></Col>
                                </Row>
                                <Row justify="space-between" style={{ marginBottom: 16, borderBottom: '1px solid #000', paddingBottom: '8px', color: 'black' }}>
                                    <Col><Text strong style={{color: 'black'}}>Roll No: ..........................</Text></Col>
                                    <Col><Text strong style={{color: 'black'}}>Date: {examDate ? dayjs(examDate).format('DD-MM-YYYY') : 'N/A'}</Text></Col>
                                </Row>
                                
                                {Object.entries(generatedPaper.paper).map(([partKey, questions]) => {
                                    if (!questions || questions.length === 0) return null;
                                    const partInfo = generatedPaper.template.parts.find((p: any) => `Part ${p.partName}` === partKey);
                                    if (!partInfo) return null;
                                
                                    const partTitle = `Part ${partInfo.partName}`;
                                
                                    const oneMarkGroups = partInfo.mark_type === 1
                                        ? questions.reduce((acc: Record<string, Question[]>, q: Question) => {
                                            const title = q.title || 'Other 1-Mark Questions';
                                            if (!acc[title]) acc[title] = [];
                                            acc[title].push(q);
                                            return acc;
                                        }, {})
                                        : null;
                                
                                    return (
                                        <div key={partKey} style={{ marginBottom: 24, color: 'black' }}>
                                            <Title level={5} style={{ textAlign: 'center', textTransform: 'uppercase', fontWeight: 'bold', color: 'black' }}>{partTitle}</Title>
                                            
                                            {partInfo.mark_type === 1 && oneMarkGroups ? (
                                                Object.entries(oneMarkGroups).map(([title, subQuestions], subIndex) => {
                                                    const numToAnswer = partInfo.one_mark_counts?.[`${title}_answer`] || subQuestions.length;
                                                    
                                                     const matchAnswers = title === 'Match the Following' ? shuffleArray(subQuestions.flatMap(q => splitAnswers(q.answer))) : [];

                                                    return (
                                                        <div key={title} style={{ marginBottom: 16 }}>
                                                            <Row justify="space-between" align="middle" style={{ color: 'black' }}>
                                                                <Col><Text strong style={{ color: 'black' }}>{String.fromCharCode(65 + subIndex)}. {title}</Text></Col>
                                                                <Col><Text strong style={{ color: 'black' }}>{numToAnswer} x 1 = {numToAnswer}</Text></Col>
                                                            </Row>
                                                            {title === 'Match the Following' ? (
                                                                <Row gutter={16}>
                                                                    <Col span={12}>
                                                                        <ol style={{ paddingLeft: 20 }}>
                                                                            {subQuestions.map((sq, qIndex) => (
                                                                                <li key={sq.id} style={{ marginTop: 8, color: 'black' }}>
                                                                                    <pre style={{ fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap', color: 'black' }}>{sq.question}</pre>
                                                                                </li>
                                                                            ))}
                                                                        </ol>
                                                                    </Col>
                                                                    <Col span={12}>
                                                                        <ol type="A" style={{ paddingLeft: 20, listStylePosition: 'inside' }}>
                                                                            {matchAnswers.map((ans, ansIndex) => (
                                                                                 <li key={ansIndex} style={{ marginTop: 8, color: 'black' }}>
                                                                                     <pre style={{ fontFamily: 'inherit', margin: 0, whiteSpace: 'pre-wrap', display: 'inline', color: 'black' }}>{ans}</pre>
                                                                                 </li>
                                                                            ))}
                                                                        </ol>
                                                                    </Col>
                                                                </Row>
                                                            ) : (
                                                                 subQuestions.map((sq, qIndex) => (
                                                                    <div key={sq.id} style={{ marginLeft: 20, marginTop: 8 }}>
                                                                        <Text style={{ color: 'black' }}>{qIndex + 1}. {sq.question}</Text>
                                                                        {sq.title === 'Choose the correct answer' && (
                                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', paddingLeft: '20px', marginTop: '4px' }}>
                                                                                <Text style={{ color: 'black' }}>{sq.option1 && `a) ${sq.option1}`}</Text>
                                                                                <Text style={{ color: 'black' }}>{sq.option2 && `b) ${sq.option2}`}</Text>
                                                                                <Text style={{ color: 'black' }}>{sq.option3 && `c) ${sq.option3}`}</Text>
                                                                                <Text style={{ color: 'black' }}>{sq.option4 && `d) ${sq.option4}`}</Text>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            ) : partInfo.is_choice ? (
                                                <>
                                                    <Row justify="space-between" align="middle" style={{ color: 'black' }}>
                                                        <Col><Text strong style={{ color: 'black' }}>Answer any {partInfo.questions_to_answer} of the following</Text></Col>
                                                        <Col><Text strong style={{ color: 'black' }}>{partInfo.questions_to_answer} x {partInfo.mark_type} = {partInfo.questions_to_answer * partInfo.mark_type}</Text></Col>
                                                    </Row>
                                                     {questions.reduce((acc, q, index) => {
                                                        if (index % 2 === 0) {
                                                            const pairB = questions[index + 1];
                                                            acc.push(
                                                                <div key={q.id} style={{ marginTop: 8 }}>
                                                                    <p style={{ color: 'black' }}>{Math.floor(index / 2) + 1}. (a) {q.question}</p>
                                                                    {pairB && (
                                                                        <>
                                                                            <p style={{ textAlign: 'center', fontWeight: 'bold', color: 'black' }}>OR</p>
                                                                            <p style={{ color: 'black' }}>(b) {pairB.question}</p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            );
                                                        }
                                                        return acc;
                                                    }, [] as React.ReactNode[])}
                                                </>
                                            ) : (
                                                <>
                                                    <Row justify="space-between" align="middle" style={{ color: 'black' }}>
                                                        <Col><Text strong style={{ color: 'black' }}>Answer any {partInfo.questions_to_answer} of the following</Text></Col>
                                                        <Col><Text strong style={{ color: 'black' }}>{partInfo.questions_to_answer} x {partInfo.mark_type} = {partInfo.questions_to_answer * partInfo.mark_type}</Text></Col>
                                                    </Row>
                                                    {questions.map((q, index) => (
                                                        <div key={q.id} style={{ marginTop: 8 }}>
                                                            <Text style={{ color: 'black' }}>{index + 1}. {q.question}</Text>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    );
                                })}

                            </div>
                        )}
                    </Spin>
                </Modal>
            </Card>
        </>
    );
};

export default ExamQuestionPaper;





