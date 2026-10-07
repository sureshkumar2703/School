
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Form, Button, Row, Col, Select, message, Upload, Typography, List, Alert, InputNumber } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import type { AddAssignmentPayload, AssignmentQuestion } from '../../store/features/assignments/assignmentsSlice';
import { addAssignmentRequest } from '../../store/features/assignments/assignmentsSlice';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { UploadOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Option } = Select;
const { Dragger } = Upload;
const { Title, Text, Paragraph } = Typography;

interface AssignmentFormProps {
    visible: boolean;
    onClose: () => void;
}

const AssignmentForm: React.FC<AssignmentFormProps> = ({ visible, onClose }) => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const [parsedQuestions, setParsedQuestions] = useState<Omit<AssignmentQuestion, 'id' | 'assignment_id'>[]>([]);
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);

    useEffect(() => {
        if (visible && user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, visible, user?.organization_key]);
    
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        const uniqueClasses = myAssignments.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name} (${m.academic_year})` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());
        return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [myAssignments]);

    const selectedClassKey = Form.useWatch('class_key', form);
    
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return myAssignments
            .filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map(m => m.subject_name)
            .filter((value, index, self) => self.indexOf(value) === index && value);
    }, [myAssignments, selectedClassKey]);

    const onFinish = (values: any) => {
        if (!user?.id || !user?.organization_key) {
            message.error("You must be logged in to create an assignment.");
            return;
        }
        if (parsedQuestions.length === 0) {
            message.error("Please upload a file with questions.");
            return;
        }

        const [className, sectionName, academicYear] = values.class_key.split('||');

        const payload: AddAssignmentPayload = {
            organization_key: user.organization_key,
            teacher_id: user.id,
            class_name: className,
            section_name: sectionName,
            academic_year: academicYear,
            subject: values.subject,
            questions: parsedQuestions,
            total_marks: values.total_marks,
        };
        
        dispatch(addAssignmentRequest(payload));
        handleClose();
    };
    
    const handleClose = () => {
        form.resetFields();
        setParsedQuestions([]);
        setFileList([]);
        setUploadError(null);
        onClose();
    };

    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedQuestions([]);

        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const questionsFromFile = json.map((row: any) => {
                    const questionText = row.question || row.Question;
                    const mark = row.mark || row.Mark || row.marks || row.Marks;
                    if (!questionText) {
                        return null;
                    }
                    return { 
                        question_text: String(questionText),
                        mark: mark ? parseInt(String(mark), 10) : undefined,
                     };
                }).filter(q => q !== null && q.question_text);

                if (questionsFromFile.length === 0) {
                    setUploadError("No questions found. Ensure your file has a column named 'question'.");
                    return;
                }

                setParsedQuestions(questionsFromFile as Omit<AssignmentQuestion, 'id' | 'assignment_id'>[]);

            } catch (err: any) {
                setUploadError(`Error parsing file: ${err.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            { question: 'What is the capital of France?', mark: 5 }, 
            { question: 'Explain the theory of relativity.', mark: 10 }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Questions`);
        XLSX.writeFile(wb, `assignment_template.xlsx`);
    };
    
    return (
        <Modal
            title="Create New Assignment"
            open={visible}
            onCancel={handleClose}
            footer={null}
            width={800}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                 <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="class_key" label="Class & Section" rules={[{ required: true }]}>
                            <Select showSearch placeholder="Select a class" loading={mappingsLoading}>
                                {classOptions.map(opt => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                     <Col span={12}>
                        <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
                            <Select placeholder="Select a subject" disabled={!selectedClassKey}>
                                {subjectOptions.map(sub => <Option key={sub} value={sub}>{sub}</Option>)}
                            </Select>
                        </Form.Item>
                    </Col>
                     <Col span={24}>
                        <Form.Item name="total_marks" label="Total Marks" rules={[{ required: true, message: 'Please enter the total marks for the test.' }]}>
                            <InputNumber placeholder="e.g., 100" style={{width: '100%'}} />
                        </Form.Item>
                    </Col>
                 </Row>
                
                <Title level={5}>Upload Questions</Title>
                <Paragraph type="secondary">
                    Upload an Excel or CSV file. The file must contain a header row with columns named <Text code>question</Text> and optionally <Text code>mark</Text>. Each subsequent row will become a question in the assignment.
                </Paragraph>
                <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ marginBottom: 16 }}>
                    Download Template
                </Button>
                
                <Dragger
                    name="file"
                    multiple={false}
                    accept=".xlsx, .xls, .csv"
                    fileList={fileList}
                    beforeUpload={() => false}
                    onChange={handleFileChange}
                    onRemove={() => { setFileList([]); setParsedQuestions([]); setUploadError(null); }}
                >
                    <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
                    <p className="ant-upload-text">Click or drag Excel/CSV file to this area</p>
                </Dragger>

                {uploadError && <Alert message={uploadError} type="error" showIcon style={{ marginTop: 16 }} />}

                {parsedQuestions.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                        <Title level={5}>Preview ({parsedQuestions.length} questions found)</Title>
                        <div style={{ maxHeight: 150, overflow: 'auto', border: '1px solid #f0f0f0', padding: '8px 16px', borderRadius: '4px' }}>
                            <List
                                size="small"
                                dataSource={parsedQuestions}
                                renderItem={(item, index) => (
                                    <List.Item style={{padding: '4px 0', border: 'none', display: 'flex', justifyContent: 'space-between'}}>
                                        <span>{index + 1}. {item.question_text}</span>
                                        {item.mark && <Text type="secondary">({item.mark} marks)</Text>}
                                    </List.Item>
                                )}
                            />
                        </div>
                    </div>
                )}

                <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                    <Button onClick={handleClose} style={{ marginRight: 8 }}>Cancel</Button>
                    <Button type="primary" htmlType="submit" disabled={parsedQuestions.length === 0}>Create</Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AssignmentForm;
