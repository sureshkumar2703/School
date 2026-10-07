
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Select, Input, InputNumber, message, Upload, Typography, Alert, DatePicker } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { uploadMarksRequest, type Mark, fetchStudentsForClassRequest } from '../../store/features/analysis/analysisSlice';
import { FileExcelOutlined, UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

interface UploadModalProps {
    visible: boolean;
    onClose: () => void;
    classKey: string;
    subject: string;
}

const AnalysisReportUploadModal: React.FC<UploadModalProps> = ({ visible, onClose, classKey, subject }) => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { students, loading } = useSelector((state: RootState) => state.analysis);

    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedMarks, setParsedMarks] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    useEffect(() => {
        if (visible && classKey && user?.organization_key) {
            const [className, sectionName, academicYear] = classKey.split('||');
            dispatch(fetchStudentsForClassRequest({
                organizationKey: user.organization_key,
                className,
                sectionName,
                academicYear,
            }));
        }
    }, [dispatch, visible, classKey, user?.organization_key]);


    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedMarks([]);

        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const requiredHeaders = ['Register No', 'Marks Obtained'];
                const fileHeaders = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                if (missingHeaders.length > 0) {
                     throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                }
                setParsedMarks(json);
            } catch (err: any) {
                setUploadError(`Error parsing file: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSubmit = (values: any) => {
        if (!user?.organization_key) {
            message.error("Cannot upload marks without organization context.");
            return;
        }
        if (parsedMarks.length === 0) {
            message.error("Please upload a file with marks.");
            return;
        }

        const [className, sectionName, academicYear] = classKey.split('||');

        const studentMap = new Map(students
            .filter(s => s.register_no && s.id)
            .map(s => [s.register_no!, s.id!])
        );

        const marksData: Omit<Mark, 'id'>[] = parsedMarks.map(row => {
            const registerNo = row['Register No'];
            const studentId = studentMap.get(registerNo);

            if (!studentId) {
                console.warn(`Skipping row: Could not find student with Register No: ${registerNo}`);
                return null;
            }

            return {
                organization_key: user.organization_key!,
                student_id: studentId,
                academic_year: academicYear,
                class_name: className,
                section_name: sectionName,
                subject: subject,
                test_type: values.test_type,
                test_name: values.test_name,
                marks_obtained: Number(row['Marks Obtained']),
                total_marks: values.total_marks,
                test_date: dayjs(values.test_date).format('YYYY-MM-DD'),
            };
        }).filter(Boolean) as Omit<Mark, 'id'>[];

        if (marksData.length === 0) {
            message.warning("No valid student marks could be processed from the file.");
            return;
        }

        dispatch(uploadMarksRequest({ marksData }));
        message.success(`${marksData.length} student marks are being uploaded.`);
        onClose();
    };
    
    const handleModalClose = () => {
        form.resetFields();
        setFileList([]);
        setParsedMarks([]);
        setUploadError(null);
        onClose();
    }

    return (
        <Modal
            title="Upload Student Marks"
            open={visible}
            onCancel={handleModalClose}
            footer={null}
            width={800}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 24 }}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="test_name" label="Test Name" rules={[{ required: true }]}>
                            <Input placeholder="e.g., Mid-Term 1, Unit Test 2" />
                        </Form.Item>
                    </Col>
                     <Col span={12}>
                        <Form.Item name="test_type" label="Test Type" rules={[{ required: true }]}>
                            <Select placeholder="Select test type">
                                <Option value="Class Test">Class Test</Option>
                                <Option value="Home Test">Home Test</Option>
                                <Option value="Mid-Term">Mid-Term</Option>
                                <Option value="Final Exam">Final Exam</Option>
                                <Option value="Other">Other</Option>
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="total_marks" label="Total Marks" rules={[{ required: true }]}>
                            <InputNumber style={{ width: '100%' }} placeholder="Total marks for this test" />
                        </Form.Item>
                    </Col>
                     <Col span={12}>
                        <Form.Item name="test_date" label="Test Date" rules={[{ required: true }]}>
                            <DatePicker style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                
                <Dragger
                    name="file"
                    multiple={false}
                    accept=".xlsx, .xls"
                    fileList={fileList}
                    beforeUpload={() => false}
                    onChange={handleFileChange}
                    onRemove={() => { setFileList([]); setParsedMarks([]); setUploadError(null); }}
                    style={{ marginTop: 16 }}
                >
                    <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
                    <p className="ant-upload-text">Click or drag Excel file here to upload marks</p>
                    <p className="ant-upload-hint">Ensure your file has 'Register No' and 'Marks Obtained' columns.</p>
                </Dragger>

                {uploadError && <Alert message={uploadError} type="error" showIcon style={{ marginTop: 16 }} />}

                {parsedMarks.length > 0 && (
                    <div style={{ marginTop: 16, maxHeight: 150, overflowY: 'auto' }}>
                        <Text strong>Found {parsedMarks.length} records. Ready to upload.</Text>
                    </div>
                )}

                 <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                    <Button onClick={handleModalClose} style={{ marginRight: 8 }}>
                        Cancel
                    </Button>
                    <Button type="primary" htmlType="submit" loading={loading} disabled={parsedMarks.length === 0}>
                        Upload Marks
                    </Button>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AnalysisReportUploadModal;
