

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Row, Col, Button, Modal, Select, Upload, Divider, List, Spin, message, Table, Space, Tag, Popconfirm, Form, Input } from 'antd';
import { UploadOutlined, DownloadOutlined, InboxOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import * as XLSX from 'xlsx';
import { 
    uploadQuestionsRequest, 
    fetchOneMarkQuestionsRequest, 
    deleteOneMarkQuestionRequest, 
    updateOneMarkQuestionRequest,
    type OneMarkQuestionBatch,
    type OneMarkQuestionItem 
} from '../../store/features/one-mark-questions/oneMarkQuestionsSlice';
import type { ColumnsType } from 'antd/es/table';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { TextArea } = Input;

const UploadOneMark: React.FC = () => {
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<{ batch: OneMarkQuestionBatch, question: OneMarkQuestionItem } | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
    const [fileList, setFileList] = useState<any[]>([]);
    const [editForm] = Form.useForm();
    const isMobile = useMediaQuery('(max-width: 768px)');


    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, calendars } = useSelector((state: RootState) => state.teacherDashboard);
    const { questions: questionBatches, loading: uploadLoading } = useSelector((state: RootState) => state.oneMarkQuestions);


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
     useEffect(() => {
        if (selectedClassKey && selectedSubject && user?.staff_code && user?.organization_key) {
             const [className, sectionName, academicYear] = selectedClassKey.split('||');
            dispatch(fetchOneMarkQuestionsRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
                academicYear,
                className,
                sectionName,
                subject: selectedSubject,
            }));
        }
    }, [dispatch, selectedClassKey, selectedSubject, user]);

    useEffect(() => {
        if (calendars && calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
            }
        }
    }, [calendars, selectedAcademicYear]);
    
    useEffect(() => {
        if (editingQuestion) {
            editForm.setFieldsValue(editingQuestion.question);
        }
    }, [editingQuestion, editForm]);


    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m) => m.academic_year === selectedAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name}` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());

        return Array.from(uniqueClasses.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedAcademicYear]);

    
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return myAssignments
            .filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map(m => m.subject_name)
            .filter((value, index, self) => self.indexOf(value) === index && value);
    }, [myAssignments, selectedClassKey]);
    
    const titleOptions = ['Choose the correct answer', 'Match the Following', 'Fill in the blanks'];


    const showUploadModal = () => setIsUploadModalVisible(true);
    const handleUploadCancel = () => {
        setIsUploadModalVisible(false);
        setFileList([]);
    };
    
    const showEditModal = (batch: OneMarkQuestionBatch, question: OneMarkQuestionItem) => {
        setEditingQuestion({ batch, question });
        setIsEditModalVisible(true);
    };

    const handleEditCancel = () => {
        setIsEditModalVisible(false);
        setEditingQuestion(null);
        editForm.resetFields();
    };

    const handleClassChange = (value: string) => {
        setSelectedClassKey(value);
        setSelectedSubject(null);
    };
    
    const handleYearChange = (value: string) => {
        setSelectedAcademicYear(value);
        setSelectedClassKey(null);
        setSelectedSubject(null);
    };

    const handleFileChange: UploadProps['onChange'] = (info) => {
        setFileList(info.fileList);
    };
    
    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.xlsx, .xls',
        fileList,
        onChange: handleFileChange,
        beforeUpload: () => false,
    };
    
    const excelInstructions = [
        "The Excel file must have a header row with specific column names.",
        "Required columns: 'questions', 'answer'.",
        "Optional columns for MCQs: 'option1', 'option2', 'option3', 'option4'.",
        "The value in the 'answer' column must exactly match the text of one of the option columns for MCQs."
    ];
    
    const handleDownloadTemplate = () => {
        const headers = [['questions', 'option1', 'option2', 'option3', 'option4', 'answer']];
        const ws = XLSX.utils.aoa_to_sheet(headers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'OneMarkTemplate');
        XLSX.writeFile(wb, 'one_mark_question_template.xlsx');
    };

    const handleUploadSubmit = () => {
        if (!fileList[0] || !user || !selectedClassKey || !selectedSubject || !selectedTitle) {
            message.error("Please select all filters and a file to upload.");
            return;
        }

        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const file = fileList[0].originFileObj;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                const headers = json[0] as string[];
                const requiredHeaders = ['questions', 'answer'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    throw new Error(`Excel file is missing required headers: ${requiredHeaders.join(', ')}`);
                }

                const questionsToUpload = (json.slice(1) as string[][]).map(row => {
                    const questionData: any = {};
                    headers.forEach((header, index) => {
                        questionData[header] = row[index];
                    });

                    if (!questionData.questions || !questionData.answer) {
                        return null;
                    }

                    return {
                        questions: questionData.questions,
                        option1: questionData.option1 || null,
                        option2: questionData.option2 || null,
                        option3: questionData.option3 || null,
                        option4: questionData.option4 || null,
                        answer: questionData.answer,
                    };
                }).filter(q => q !== null);

                if (questionsToUpload.length > 0) {
                    dispatch(uploadQuestionsRequest({
                        organization_key: user.organization_key!,
                        staff_code: user.staff_code!,
                        academic_year: academicYear,
                        class: className,
                        section: sectionName,
                        subject: selectedSubject!,
                        title: selectedTitle,
                        questions: questionsToUpload as any,
                    }));
                    handleUploadCancel();
                } else {
                    message.warning("No valid questions found in the Excel file to upload.");
                }

            } catch (error: any) {
                message.error(`Failed to process file: ${error.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
    };
    
    const handleEditSubmit = (values: any) => {
        if (!editingQuestion) return;

        const { batch, question } = editingQuestion;
        
        const updatedQuestions = batch.questions.map(q => 
            q.id === question.id ? { ...q, ...values } : q
        );
        
        const payload: OneMarkQuestionBatch = {
            ...batch,
            questions: updatedQuestions,
        };
        dispatch(updateOneMarkQuestionRequest(payload));
        handleEditCancel();
    };

    const handleDelete = (batchId: string, questionId: string) => {
        dispatch(deleteOneMarkQuestionRequest({ batchId, questionId }));
    };

    const isLoading = mappingsLoading || uploadLoading;

    const flattenedQuestions = useMemo(() => {
        return questionBatches
            .filter(batch => batch.title === selectedTitle)
            .flatMap(batch => batch.questions.map(question => ({
                ...question,
                batchId: batch.id,
            })));
    }, [questionBatches, selectedTitle]);
    
    const tableColumns: ColumnsType<OneMarkQuestionItem & { batchId: string }> = [
        { title: 'S.No', key: 'sno', render: (_: any, __: any, index: number) => index + 1 },
        { title: 'Question', dataIndex: 'questions', key: 'questions' },
        { title: 'Answer', dataIndex: 'answer', key: 'answer', render: (text: string) => <Tag color="green">{text}</Tag> },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: OneMarkQuestionItem & { batchId: string }) => {
                const batch = questionBatches.find(b => b.id === record.batchId);
                return (
                    <Space>
                        <Button icon={<EditOutlined />} onClick={() => showEditModal(batch!, record)}>Edit</Button>
                        <Popconfirm title="Are you sure?" onConfirm={() => handleDelete(record.batchId, record.id)}>
                            <Button icon={<DeleteOutlined />} danger />
                        </Popconfirm>
                    </Space>
                )
            }
        }
    ];

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Title level={4}>Upload One Mark Questions</Title>
                        <Text type="secondary">Create and upload quizzes from an Excel file.</Text>
                    </Col>
                    <Col>
                        <Button type="primary" icon={<UploadOutlined />} onClick={showUploadModal}>
                            Create New Upload
                        </Button>
                    </Col>
                </Row>

                <Spin spinning={isLoading}>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                         <Col xs={24} md={6}>
                            <Select placeholder="Filter by Year" style={{ width: '100%' }} value={selectedAcademicYear} onChange={handleYearChange} allowClear>
                                {calendars.map((c:any) => <Option key={c.id} value={c.academic_year}>{c.academic_year}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} md={6}>
                            <Select placeholder="Filter by Class" style={{ width: '100%' }} value={selectedClassKey} onChange={handleClassChange} allowClear disabled={!selectedAcademicYear}>
                               {classOptions.map(c => <Option key={c.key} value={c.key}>{c.label}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} md={6}>
                            <Select showSearch placeholder="Filter by Subject" style={{ width: '100%' }} value={selectedSubject} onChange={setSelectedSubject} allowClear disabled={!selectedClassKey}>
                               {subjectOptions.map(s => <Option key={s} value={s!}>{s}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} md={6}>
                             <Select
                                placeholder="Select Question Type"
                                style={{ width: '100%' }}
                                value={selectedTitle}
                                onChange={setSelectedTitle}
                                disabled={!selectedSubject}
                                allowClear
                            >
                                {titleOptions.map(title => <Option key={title} value={title}>{title}</Option>)}
                            </Select>
                        </Col>
                    </Row>
                    
                    <Table
                        columns={tableColumns}
                        dataSource={flattenedQuestions}
                        rowKey="id"
                        bordered
                        loading={uploadLoading}
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: 'Select all filters to see uploaded questions.' }}
                    />
                </Spin>

            </Card>

            <Modal
                title="Upload One Mark Questions"
                open={isUploadModalVisible}
                onCancel={handleUploadCancel}
                width={isMobile ? '95vw' : 800}
                footer={[
                    <Button key="back" onClick={handleUploadCancel}>
                        Cancel
                    </Button>,
                    <Button key="submit" type="primary" disabled={fileList.length === 0} onClick={handleUploadSubmit} loading={uploadLoading}>
                        Submit
                    </Button>,
                ]}
            >
                <Spin spinning={mappingsLoading} tip="Loading your classes...">
                    <Row gutter={[16, 16]} style={{ marginBottom: 24, marginTop: 24 }}>
                        <Col xs={24} sm={12}>
                            <Select placeholder="Select Academic Year" style={{ width: '100%' }} value={selectedAcademicYear} onChange={handleYearChange}>
                                {calendars.map((cal:any) => <Option key={cal.id} value={cal.academic_year}>{cal.academic_year}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12}>
                            <Select placeholder="Select a class & section" style={{ width: '100%' }} value={selectedClassKey} onChange={handleClassChange} disabled={!selectedAcademicYear}>
                                {classOptions.map((cls) => <Option key={cls.key} value={cls.key}>{cls.label}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} style={{marginTop: 16}}>
                            <Select placeholder="Select a subject" style={{ width: '100%' }} value={selectedSubject} onChange={setSelectedSubject} disabled={!selectedClassKey}>
                                {subjectOptions.map(sub => <Option key={sub} value={sub!}>{sub}</Option>)}
                            </Select>
                        </Col>
                         <Col xs={24} sm={12} style={{marginTop: 16}}>
                             <Select placeholder="Select Question Type" style={{ width: '100%' }} value={selectedTitle} onChange={setSelectedTitle} disabled={!selectedSubject}>
                                {titleOptions.map(title => <Option key={title} value={title}>{title}</Option>)}
                            </Select>
                        </Col>
                    </Row>
                </Spin>
                
                <Divider />

                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Title level={5}>Instructions & Template</Title>
                         <List size="small" dataSource={excelInstructions} renderItem={item => <List.Item>• {item}</List.Item>} style={{ marginBottom: 16 }} />
                        <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                            Download Excel Template
                        </Button>
                    </Col>
                    <Col xs={24} md={12} style={{ marginTop: isMobile ? 24 : 0 }}>
                        <Dragger {...uploadProps} height={200} disabled={!selectedSubject || !selectedTitle}>
                            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                            <p className="ant-upload-text">Click or drag Excel file to upload</p>
                            <p className="ant-upload-hint">Select class, subject, and type before uploading.</p>
                        </Dragger>
                    </Col>
                </Row>
            </Modal>

            <Modal
                title="Edit Question"
                open={isEditModalVisible}
                onCancel={handleEditCancel}
                footer={null}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} style={{marginTop: '24px'}}>
                    <Form.Item name="questions" label="Question" rules={[{ required: true }]}>
                        <TextArea rows={3} />
                    </Form.Item>
                     {editingQuestion?.batch.title === 'Choose the correct answer' && (
                        <>
                            <Form.Item name="option1" label="Option 1" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="option2" label="Option 2" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                            <Form.Item name="option3" label="Option 3">
                                <Input />
                            </Form.Item>
                            <Form.Item name="option4" label="Option 4">
                                <Input />
                            </Form.Item>
                        </>
                    )}
                    <Form.Item name="answer" label="Correct Answer" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item style={{ textAlign: 'right' }}>
                        <Button onClick={handleEditCancel} style={{ marginRight: 8 }}>
                            Cancel
                        </Button>
                        <Button type="primary" htmlType="submit" loading={uploadLoading}>
                            Update Question
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default UploadOneMark;
