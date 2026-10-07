

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Select, Space, Typography, Upload, message, Table, Spin, Popconfirm, Switch, Tag, InputNumber, List, Divider, Alert, Descriptions } from 'antd';
import { DownloadOutlined, PlusOutlined, UploadOutlined, FileExcelOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import * as XLSX from 'xlsx';
import {
    addQuestionRequest,
    fetchQuestionsRequest,
    updateQuestionRequest,
    deleteQuestionRequest,
    bulkAddQuestionsRequest,
    type Question,
    type AddQuestionPayload,
} from '../../store/features/question-bank/questionBankSlice';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest, type Subject } from '../../store/features/subjects/subjectsSlice';
import { fetchUnitMarksRequest } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

const QuestionBank: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
    const [form] = Form.useForm();
    const [bulkUploadForm] = Form.useForm();
    
    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);
    
    // States for new filters
    const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string | null>(null);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | null>(null);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
    
    const dispatch: AppDispatch = useDispatch();

    const { questions, loading: questionBankLoading, error: questionBankError } = useSelector((state: RootState) => state.questionBank);
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, calendars } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { unitMarks } = useSelector((state: RootState) => state.setUnitMark);
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


    const selectedClassKey = Form.useWatch('class_key', form);
    const selectedMarkType = Form.useWatch('question_type', form);
    const selectedTitle = Form.useWatch('title', form);
    
    const bulkSelectedClassKey = Form.useWatch('class_key', bulkUploadForm);
    const bulkSelectedSubjectCode = Form.useWatch('subject_code', bulkUploadForm);


    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(fetchQuestionsRequest({ 
                organizationKey: user.organization_key, 
                staffCode: user.staff_code 
            }));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
             dispatch(fetchUnitMarksRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
             dispatch(fetchRegulationsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    const academicYearOptions = useMemo(() => {
        const fromMappings = [...new Set(mappings.map((m: any) => m.academic_year))];
        const fromQuestions = [...new Set(questions.map(q => q.academic_year))];
        return [...new Set([...fromMappings, ...fromQuestions])].sort((a,b) => b.localeCompare(a));
    }, [mappings, questions]);
    
    useEffect(() => {
        if (!selectedAcademicYearFilter && academicYearOptions.length > 0) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            if (currentYear && academicYearOptions.includes(currentYear)) {
                setSelectedAcademicYearFilter(currentYear);
            } else {
                setSelectedAcademicYearFilter(academicYearOptions[0]);
            }
        }
    }, [academicYearOptions, calendars, selectedAcademicYearFilter]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);
    
    const classOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter) return [];
        const filteredAssignments = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYearFilter);
        return [...new Set(filteredAssignments.map((q: any) => q.class_name))];
    }, [myAssignments, selectedAcademicYearFilter]);

    const sectionOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter || !selectedClassFilter) return [];
        const filteredAssignments = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYearFilter && m.class_name === selectedClassFilter);
        return [...new Set(filteredAssignments.map((q: any) => q.section_name))];
    }, [myAssignments, selectedAcademicYearFilter, selectedClassFilter]);

    const subjectOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter || !selectedClassFilter || !selectedSectionFilter) return [];
        const subjectNames = myAssignments
            .filter((m: any) => m.academic_year === selectedAcademicYearFilter && m.class_name === selectedClassFilter && m.section_name === selectedSectionFilter)
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [myAssignments, subjects, selectedAcademicYearFilter, selectedClassFilter, selectedSectionFilter]);

    const getAcademicYearFromForm = (targetForm: typeof form | typeof bulkUploadForm) => {
        return targetForm.getFieldValue('academic_year');
    }
    
    const formAcademicYear = Form.useWatch('academic_year', form);

    const classOptions = useMemo(() => {
        if (!formAcademicYear) return [];
        
        const assignmentsForYear = myAssignments.filter((m:any) => m.academic_year === formAcademicYear);
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
    }, [myAssignments, formAcademicYear]);
    
    const bulkClassOptions = useMemo(() => {
        const academicYearToFilter = getAcademicYearFromForm(bulkUploadForm);
        if (!academicYearToFilter) return [];

        const assignmentsForYear = myAssignments.filter((m:any) => m.academic_year === academicYearToFilter);
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
    }, [myAssignments, bulkUploadForm, calendars]);


    const subjectOptions = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        if (!key || !subjects) return [];
        const [className, sectionName, academicYear] = key.split('||');
        
        const subjectNamesForClass = myAssignments
            .filter((m: any) => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map((m: any) => m.subject_name);

        return subjectNamesForClass
            .map(name => subjects.find(s => s.subject_name === name))
            .filter(subject => subject && subject.subject_code);
    }, [myAssignments, selectedClassKey, bulkSelectedClassKey, subjects]);
    
    const selectedSubjectCode = Form.useWatch('subject_code', form);

    const availableUnitsAndMarks = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        const subjectCode = selectedSubjectCode || bulkSelectedSubjectCode;
        if (!key || !subjectCode) return { units: [], marks: [] };

        const [className, sectionName, academicYear] = key.split('||');
        
        const relevantUnitMarks = unitMarks.filter(um => 
            um.academic_year === academicYear &&
            um.class === className &&
            um.section === sectionName &&
            um.subject === subjects.find(s => s.subject_code === subjectCode)?.subject_name &&
            um.status === 'Active'
        );

        const units = [...new Set(relevantUnitMarks.map(um => um.unit))];
        const marks = [...new Set(relevantUnitMarks.map(um => um.mark_type))];
        
        return { units: units.sort((a,b) => a-b), marks: marks.sort((a,b) => a-b) };
    }, [unitMarks, selectedClassKey, bulkSelectedClassKey, selectedSubjectCode, bulkSelectedSubjectCode, subjects]);

    const regulationForClass = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        if (!key) return null;
        const [className, , academicYear] = key.split('||');
        return regulations.find(r => r.academic_year === academicYear && r.class === className)?.regulation || 'No regulation set';
    }, [regulations, selectedClassKey, bulkSelectedClassKey]);
    
    useEffect(() => {
        form.setFieldsValue({ regulation: regulationForClass });
        bulkUploadForm.setFieldsValue({ regulation: regulationForClass });
    }, [regulationForClass, form, bulkUploadForm]);

    const showModal = (question: Question | null = null) => {
        setEditingQuestion(question);
        if (question) {
             form.setFieldsValue({
                ...question,
                class_key: `${question.class}||${question.section}||${question.academic_year}`
            });
        } else {
             const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
             form.resetFields();
             form.setFieldsValue({ academic_year: currentYear, status: 'Active' });
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingQuestion(null);
        form.resetFields();
    };

    const showBulkModal = () => setIsBulkModalVisible(true);
    const handleBulkCancel = () => {
        setIsBulkModalVisible(false);
        setFileList([]);
        setParsedData([]);
        setUploadError(null);
        bulkUploadForm.resetFields();
    };

    const handleViewQuestion = (question: Question) => {
        setViewingQuestion(question);
        setIsViewModalVisible(true);
    };
    
    const handleViewCancel = () => {
        setIsViewModalVisible(false);
        setViewingQuestion(null);
    };

    const onFinish = (values: any) => {
        if (!user?.organization_key || !user?.staff_code) {
            message.error("Cannot save question without user context.");
            return;
        }
        
        const [className, sectionName, academicYear] = values.class_key.split('||');
        
        const payload: Omit<Question, 'id' | 'created_at'> = {
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            unit: values.unit,
            question: values.question,
            level: values.level,
            question_type: values.question_type,
            subject_code: values.subject_code,
            regulation: values.regulation,
            status: values.status || 'Active',
            academic_year: academicYear,
            class: className,
            section: sectionName,
            title: values.title,
            option1: values.option1,
            option2: values.option2,
            option3: values.option3,
            option4: values.option4,
            answer: values.answer,
        };

        if (editingQuestion) {
            dispatch(updateQuestionRequest({ ...payload, id: editingQuestion.id }));
        } else {
            dispatch(addQuestionRequest(payload as AddQuestionPayload));
        }
        handleCancel();
    };

    const handleDownloadTemplate = () => {
        const headers = ["unit", "question_type", "level", "question", "answer", "title", "option1", "option2", "option3", "option4"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'QuestionTemplate');
        XLSX.writeFile(wb, 'question_bank_template.xlsx');
    };
    
    const handleDelete = (id: string) => {
        dispatch(deleteQuestionRequest(id));
    };

    const loading = questionBankLoading || mappingsLoading;

    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedData([]);
        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

        const formValues = bulkUploadForm.getFieldsValue();
        if (!formValues.class_key || !formValues.subject_code) {
            setUploadError("Please select class, section, academic year, and subject before uploading.");
            setFileList([]);
            return;
        }

        const [className, sectionName, academicYear] = (formValues.class_key || '').split('||');
        const subjectCode = formValues.subject_code;

        reader.onload = (e) => {
            if (!e.target) {
                setUploadError("Could not read the file.");
                return;
            }
            try {
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const requiredHeaders = ["unit", "question_type", "question", "answer"];
                const fileHeaders = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));
                if (missingHeaders.length > 0) throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                
                const subjectName = subjects.find(s => s.subject_code === subjectCode)?.subject_name;

                for (const row of json as any[]) {
                    const isUnitMarkValid = unitMarks.some(um =>
                        um.academic_year === academicYear &&
                        um.class === className &&
                        um.section === sectionName &&
                        um.subject === subjectName &&
                        um.unit === row.unit &&
                        um.mark_type === row.question_type
                    );
                    if (!isUnitMarkValid) {
                        throw new Error(`Invalid combination in row with question "${row.question}": Unit ${row.unit} with mark type ${row.question_type} is not configured for this subject. Please create it in 'Set Unit Mark' first.`);
                    }

                    if (row.title === 'Choose the correct answer' && (!row.option1 || !row.option2)) {
                        throw new Error(`Row with question "${row.question}" is a 'Choose the correct answer' question but is missing 'option1' or 'option2'.`);
                    }
                }
                
                setParsedData(json);
            } catch (err) {
                setUploadError(`${(err as Error).message}`);
                setFileList([]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleBulkSubmit = () => {
        if (!user?.organization_key || !user.staff_code) {
            message.error("User details are missing. Cannot upload.");
            return;
        }

        const formValues = bulkUploadForm.getFieldsValue();
        const [className, sectionName, academicYear] = formValues.class_key.split('||');
        const subjectCode = formValues.subject_code;

        const questionsToUpload: AddQuestionPayload[] = parsedData.map(row => ({
            organization_key: user.organization_key!,
            staff_code: user.staff_code!,
            class: className,
            section: sectionName,
            academic_year: academicYear,
            subject_code: subjectCode,
            regulation: formValues.regulation,
            unit: row.unit,
            question_type: row.question_type,
            level: row.level,
            question: row.question,
            answer: row.answer,
            title: row.title || null,
            option1: row.option1 || null,
            option2: row.option2 || null,
            option3: row.option3 || null,
            option4: row.option4 || null,
            status: 'Active',
        }));

        dispatch(bulkAddQuestionsRequest(questionsToUpload));
        handleBulkCancel();
    };

    const handleHtmlDownload = () => {
        const subjectName = subjects.find(s => s.subject_code === selectedSubjectFilter)?.subject_name;
        
        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Question Bank</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .header h1 { margin: 0; }
                    .header p { margin: 2px 0; color: #555; }
                    .question-list { list-style-type: none; padding-left: 0; }
                    .question-item { margin-bottom: 20px; page-break-inside: avoid; }
                    .question-text { font-weight: bold; }
                    .options { padding-left: 20px; list-style-type: lower-alpha; }
                    .answer { color: green; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo" style="max-height: 80px;">` : ''}
                    <h1>${schoolDetails?.school_name || 'Question Bank'}</h1>
                    <p>Class: ${selectedClassFilter} - ${selectedSectionFilter} | Year: ${selectedAcademicYearFilter}</p>
                    <p>Subject: ${subjectName || selectedSubjectFilter}</p>
                </div>
                <ul class="question-list">
        `;

        filteredQuestions.forEach((q, index) => {
            htmlContent += `
                <li class="question-item">
                    <p class="question-text">${index + 1}. ${q.question} (${q.question_type} marks)</p>
            `;
             if (q.title === 'Choose the correct answer') {
                htmlContent += `<ol class="options">`;
                if (q.option1) htmlContent += `<li>${q.option1}</li>`;
                if (q.option2) htmlContent += `<li>${q.option2}</li>`;
                if (q.option3) htmlContent += `<li>${q.option3}</li>`;
                if (q.option4) htmlContent += `<li>${q.option4}</li>`;
                htmlContent += `</ol>`;
            }
            htmlContent += `<p><span class="answer">Answer:</span> ${q.answer}</p>`;
            htmlContent += `</li>`;
        });

        htmlContent += `
                </ul>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=UTF-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `QuestionBank_${selectedSubjectFilter}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };


    const columns = [
        { title: 'Unit', dataIndex: 'unit', key: 'unit', sorter: (a: Question, b: Question) => a.unit - b.unit, width: 80 },
        { title: 'Class', dataIndex: 'class', key: 'class', width: 100 },
        { title: 'Section', dataIndex: 'section', key: 'section', width: 100 },
        { title: 'Question', dataIndex: 'question', key: 'question', ellipsis: true },
        { title: 'Mark', dataIndex: 'question_type', key: 'question_type', render: (marks: number) => `${marks}`, width: 80 },
        {
            title: 'Action', key: 'action',
            render: (_: any, record: Question) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => handleViewQuestion(record)} size="small" />
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} size="small" />
                    <Popconfirm title="Are you sure to delete this question?" onConfirm={() => handleDelete(record.id!)}>
                        <Button icon={<DeleteOutlined />} danger size="small" />
                    </Popconfirm>
                </Space>
            )
        }
    ];
    
    const filteredQuestions = useMemo(() => {
        return questions.filter(q => 
            (!selectedAcademicYearFilter || q.academic_year === selectedAcademicYearFilter) &&
            (!selectedClassFilter || q.class === selectedClassFilter) &&
            (!selectedSectionFilter || q.section === selectedSectionFilter) &&
            (!selectedSubjectFilter || q.subject_code === selectedSubjectFilter)
        );
    }, [questions, selectedAcademicYearFilter, selectedClassFilter, selectedSectionFilter, selectedSubjectFilter]);


    const getLevelColor = (level: string) => {
        if (level === 'Easy') return 'green';
        if (level === 'Medium') return 'orange';
        if (level === 'Hard') return 'red';
        return 'default';
    };


    return (
        <>
            <Card>
                <Title level={4} style={{ textAlign: 'center', marginBottom: '24px' }}>Question Bank</Title>
                
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Button icon={<UploadOutlined />} onClick={showBulkModal}>
                            Bulk Upload
                        </Button>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()}>
                            Add New Question
                        </Button>
                    </Col>
                </Row>
                
                <Divider />

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <Select placeholder="Filter by Year" style={{ width: '100%' }} value={selectedAcademicYearFilter} onChange={(value) => {setSelectedAcademicYearFilter(value); setSelectedClassFilter(null); setSelectedSectionFilter(null); setSelectedSubjectFilter(null);}} allowClear>
                            {academicYearOptions.map(year => <Option key={year} value={year}>{year}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Select placeholder="Filter by Class" style={{ width: '100%' }} value={selectedClassFilter} onChange={(value) => { setSelectedClassFilter(value); setSelectedSectionFilter(null); setSelectedSubjectFilter(null); }} allowClear disabled={!selectedAcademicYearFilter}>
                           {classOptionsForFilter.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Select placeholder="Filter by Section" style={{ width: '100%' }} value={selectedSectionFilter} onChange={(value) => { setSelectedSectionFilter(value); setSelectedSubjectFilter(null); }} allowClear disabled={!selectedClassFilter}>
                           {sectionOptionsForFilter.map(s => <Option key={s} value={s}>{s}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <Select showSearch placeholder="Filter by Subject" style={{ width: '100%' }} value={selectedSubjectFilter} onChange={setSelectedSubjectFilter} allowClear disabled={!selectedSectionFilter}
                         filterOption={(input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                         }>
                           {subjectOptionsForFilter.map(s => <Option key={s.subject_code} value={s.subject_code}>{s.subject_name}</Option>)}
                        </Select>
                    </Col>
                     <Col xs={24} style={{ textAlign: 'right', marginTop: '16px' }}>
                        <Button 
                            icon={<DownloadOutlined />} 
                            onClick={handleHtmlDownload} 
                            disabled={!selectedAcademicYearFilter || !selectedClassFilter || !selectedSectionFilter || !selectedSubjectFilter || filteredQuestions.length === 0}
                        >
                            Download All (HTML)
                        </Button>
                    </Col>
                </Row>

                {questionBankError && <Alert message={questionBankError} type="error" showIcon closable />}
                
                <Spin spinning={loading || subjectsLoading}>
                    <Table columns={columns} dataSource={filteredQuestions} rowKey="id" bordered scroll={{ x: 'max-content' }} />
                </Spin>
            </Card>

            <Modal
                title={editingQuestion ? "Edit Question" : "Add New Question"}
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
                width={800}
            >
                <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                     <Row justify="end" style={{ marginBottom: 16 }}>
                        <Col>
                             <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>Download Format</Button>
                        </Col>
                    </Row>
                    <Title level={5}>Question Details</Title>
                    <Row gutter={16}>
                         <Col span={8}>
                            <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                <Select placeholder="Select year" loading={mappingsLoading} onChange={() => form.setFieldsValue({ class_key: null, subject_code: null, unit: null, question_type: null })}>
                                    {(calendars || []).filter((c: any) => c.status === 'Active').map((cal: any) => (
                                        <Option key={cal.id} value={cal.academic_year}>
                                            {cal.academic_year}{cal.is_current && " (Current)"}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="class_key" label="Class &amp; Section" rules={[{ required: true }]}>
                                <Select showSearch placeholder="Select a class" disabled={!form.getFieldValue('academic_year')}>
                                    {classOptions.map((opt: any) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                             <Form.Item name="subject_code" label="Subject" rules={[{ required: true }]}>
                                <Select showSearch placeholder="Select a subject" loading={mappingsLoading} disabled={!selectedClassKey}>
                                    {subjectOptions.map(subject => (
                                        <Option key={subject?.subject_code} value={subject!.subject_code}>
                                            {subject!.subject_name} ({subject!.subject_code})
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="unit" label="Unit" rules={[{ required: true }]}>
                                <Select placeholder="Unit" disabled={!form.getFieldValue('subject_code')}>
                                    {availableUnitsAndMarks.units.map(unit => <Option key={unit} value={unit}>{unit}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="question_type" label="Marks" rules={[{ required: true }]}>
                                <Select placeholder="Marks" disabled={!form.getFieldValue('subject_code')}>
                                     {availableUnitsAndMarks.marks.map(mark => <Option key={mark} value={mark}>{mark}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="regulation" label="Regulation">
                                <Input disabled />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    {selectedMarkType === 1 && (
                        <Row gutter={16}>
                             <Col span={24}>
                                <Form.Item name="title" label="Question Title" rules={[{ required: true }]}>
                                    <Select placeholder="Select a title format for this 1-mark question">
                                        <Option value="Choose the correct answer">Choose the correct answer</Option>
                                        <Option value="Match the following">Match the following</Option>
                                        <Option value="Fill in the blanks">Fill in the blanks</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Row gutter={16}>
                         <Col span={24}><Form.Item name="question" label="Question" rules={[{ required: true }]}><TextArea rows={3} /></Form.Item></Col>
                    </Row>

                    {selectedMarkType === 1 && selectedTitle === 'Choose the correct answer' && (
                         <Row gutter={16}>
                            <Col span={12}><Form.Item name="option1" label="Option 1" rules={[{ required: true }]}><Input/></Form.Item></Col>
                            <Col span={12}><Form.Item name="option2" label="Option 2" rules={[{ required: true }]}><Input/></Form.Item></Col>
                            <Col span={12}><Form.Item name="option3" label="Option 3"><Input/></Form.Item></Col>
                            <Col span={12}><Form.Item name="option4" label="Option 4"><Input/></Form.Item></Col>
                         </Row>
                    )}

                    <Row gutter={16}>
                        <Col span={12}>
                           <Form.Item name="answer" label="Answer" rules={[{ required: true }]}>
                             <Input placeholder="Enter the correct answer"/>
                           </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="level" label="Difficulty Level" rules={[{ required: true }]}>
                                <Select><Option value="Easy">Easy</Option><Option value="Medium">Medium</Option><Option value="Hard">Hard</Option></Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
                        <Button onClick={handleCancel} style={{ marginRight: 8 }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={loading}>{editingQuestion ? 'Update' : 'Add Question'}</Button>
                    </Form.Item>
                </Form>
            </Modal>
            
            <Modal
                title="Bulk Upload Questions"
                open={isBulkModalVisible}
                onCancel={handleBulkCancel}
                destroyOnClose
                width={800}
                footer={[
                    <Button key="back" onClick={handleBulkCancel}>Cancel</Button>,
                    <Button key="submit" type="primary" disabled={!fileList.length} loading={loading} onClick={() => bulkUploadForm.submit()}>
                        Upload Questions
                    </Button>
                ]}
            >
                <Form form={bulkUploadForm} layout="vertical" onFinish={handleBulkSubmit} style={{ marginTop: 24 }}>
                    <Spin spinning={mappingsLoading}>
                         <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                    <Select placeholder="Select year" onChange={() => bulkUploadForm.setFieldsValue({ class_key: null, subject_code: null })}>
                                        {calendars.filter((c: any) => c.is_current).map((cal: any) => (
                                            <Option key={cal.id} value={cal.academic_year}>
                                                {cal.academic_year} (Current)
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="class_key" label="Class &amp; Section" rules={[{ required: true, message: 'Please select a class.' }]}>
                                    <Select showSearch placeholder="Select a class" disabled={!bulkUploadForm.getFieldValue('academic_year')}>
                                        {bulkClassOptions.map((opt: any) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="subject_code" label="Subject" rules={[{ required: true, message: 'Please select a subject.' }]}>
                                    <Select showSearch placeholder="Select a subject" disabled={!bulkSelectedClassKey}>
                                        {subjectOptions.map(subject => (
                                            <Option key={subject?.subject_code} value={subject!.subject_code}>
                                                {subject!.subject_name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                             <Col span={12}>
                                <Form.Item name="regulation" label="Regulation">
                                    <Input disabled />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Spin>
                    
                    <Divider>Upload File</Divider>
                    
                     <Dragger
                        name="file"
                        multiple={false}
                        accept=".xlsx, .xls, .csv"
                        fileList={fileList}
                        beforeUpload={() => false}
                        onChange={handleFileChange}
                        onRemove={() => { setFileList([]); setParsedData([]); setUploadError(null); }}
                        disabled={!bulkSelectedSubjectCode}
                    >
                        <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
                        <p className="ant-upload-text">Click or drag Excel file to this area to upload</p>
                        <p className="ant-upload-hint">Please select class and subject before uploading. <a onClick={(e) => { e.stopPropagation(); handleDownloadTemplate(); }}>Download template.</a></p>
                    </Dragger>

                    {uploadError && <Alert message={uploadError} type="error" showIcon style={{ marginTop: 16 }} />}

                    {parsedData.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <Text strong>Found {parsedData.length} questions. Ready to upload.</Text>
                        </div>
                    )}
                </Form>
            </Modal>
            <Modal
                title="View Question Details"
                open={isViewModalVisible}
                onCancel={handleViewCancel}
                footer={[
                    <Button key="close" onClick={handleViewCancel}>
                        Close
                    </Button>,
                ]}
                width={600}
            >
                {viewingQuestion && (
                    <Descriptions bordered column={1} size="small">
                        <Descriptions.Item label="Class">{`${viewingQuestion.class} - ${viewingQuestion.section}`}</Descriptions.Item>
                        <Descriptions.Item label="Academic Year">{viewingQuestion.academic_year}</Descriptions.Item>
                        <Descriptions.Item label="Subject">{subjects.find(s => s.subject_code === viewingQuestion.subject_code)?.subject_name || viewingQuestion.subject_code}</Descriptions.Item>
                        <Descriptions.Item label="Unit">{viewingQuestion.unit}</Descriptions.Item>
                        <Descriptions.Item label="Mark">{viewingQuestion.question_type}</Descriptions.Item>
                        <Descriptions.Item label="Difficulty"><Tag color={getLevelColor(viewingQuestion.level)}>{viewingQuestion.level}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Regulation">{viewingQuestion.regulation}</Descriptions.Item>
                        <Descriptions.Item label="Question">{viewingQuestion.question}</Descriptions.Item>
                        {viewingQuestion.question_type === 1 && viewingQuestion.title === 'Choose the correct answer' && (
                            <>
                                <Descriptions.Item label="Option 1">{viewingQuestion.option1}</Descriptions.Item>
                                <Descriptions.Item label="Option 2">{viewingQuestion.option2}</Descriptions.Item>
                                <Descriptions.Item label="Option 3">{viewingQuestion.option3 || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Option 4">{viewingQuestion.option4 || 'N/A'}</Descriptions.Item>
                            </>
                        )}
                         <Descriptions.Item label="Correct Answer"><Text strong>{viewingQuestion.answer}</Text></Descriptions.Item>
                    </Descriptions>
                )}
            </Modal>
        </>
    );
};

export default QuestionBank;

