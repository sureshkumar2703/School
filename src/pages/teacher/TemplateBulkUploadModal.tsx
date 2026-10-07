
import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Typography, Upload, message, Spin, List, Alert } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { bulkAddTemplatesRequest, type TemplatePart } from '../../store/features/question-paper-templates/questionPaperTemplatesSlice';
import { UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface TemplateBulkUploadModalProps {
    visible: boolean;
    onClose: () => void;
}

const TemplateBulkUploadModal: React.FC<TemplateBulkUploadModalProps> = ({ visible, onClose }) => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const [parsedTemplates, setParsedTemplates] = useState<any[]>([]);
    const [fileList, setFileList] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const { user } = useSelector((state: RootState) => state.auth);
    const { loading: templatesLoading } = useSelector((state: RootState) => state.questionPaperTemplates);

    const handleClose = () => {
        form.resetFields();
        setParsedTemplates([]);
        setFileList([]);
        setUploadError(null);
        onClose();
    };

    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedTemplates([]);

        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    setUploadError("The uploaded file is empty.");
                    return;
                }
                setParsedTemplates(json);
            } catch (err: any) {
                setUploadError(`Error parsing file: ${err.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                template_name: 'Science Mid-Term',
                class_name: 'Class 10',
                section_name: 'A',
                academic_year: '2023-2024',
                subject_code: 'SCI-101',
                total_marks: 50,
                part_a_questions: 5,
                part_a_marks: 2,
                part_b_questions: 4,
                part_b_marks: 5,
                part_c_questions: 2,
                part_c_marks: 10,
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Templates`);
        XLSX.writeFile(wb, `template_bulk_upload_template.xlsx`);
    };
    
    const handleSubmit = () => {
        if (!user?.organization_key || !user?.staff_code) {
            message.error("User context is missing. Cannot upload.");
            return;
        }
        if (parsedTemplates.length === 0) {
            message.error("No template data to upload. Please select a valid file.");
            return;
        }

        try {
            const templatesToUpload = parsedTemplates.map(row => {
                const template_parts: TemplatePart[] = [];
                // Look for part_a, part_b, ... up to part_e
                for (const char of ['a', 'b', 'c', 'd', 'e']) {
                    const part_questions = row[`part_${char}_questions`];
                    const part_marks = row[`part_${char}_marks`];
                    if (part_questions !== undefined && part_marks !== undefined) {
                        template_parts.push({
                            part_name: char.toUpperCase(),
                            num_questions: Number(part_questions),
                            marks_per_question: Number(part_marks),
                        });
                    }
                }
                
                return {
                    organization_key: user.organization_key!,
                    staff_code: user.staff_code!,
                    template_name: String(row.template_name),
                    academic_year: String(row.academic_year),
                    class_name: String(row.class_name),
                    section_name: String(row.section_name),
                    subject_code: String(row.subject_code),
                    total_marks: Number(row.total_marks),
                    template_parts,
                    units: [], // Add default empty units array
                };
            });
            
            dispatch(bulkAddTemplatesRequest(templatesToUpload));
            handleClose();

        } catch (error: any) {
            message.error(`An error occurred while preparing the data: ${error.message}`);
        }
    };
    
    const instructions = [
        "Required columns: template_name, class_name, section_name, academic_year, subject_code, total_marks.",
        "For each part (A-E), create two columns: `part_a_questions` and `part_a_marks`, `part_b_questions` and `part_b_marks`, etc.",
        "You can define up to 5 parts (A to E). You do not need to include columns for parts you aren't using.",
        "The sum of (questions * marks) for all parts must equal the value in the `total_marks` column.",
    ];

    return (
        <Modal
            title="Bulk Upload Templates"
            open={visible}
            onCancel={handleClose}
            width={800}
            footer={[
                <Button key="back" onClick={handleClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleSubmit} disabled={parsedTemplates.length === 0 || !!uploadError} loading={templatesLoading}>
                    Upload Templates
                </Button>,
            ]}
        >
            <Spin spinning={templatesLoading}>
                <Row gutter={24}>
                    <Col span={12}>
                        <Title level={5}>Instructions & Template</Title>
                        <List
                            size="small"
                            bordered
                            dataSource={instructions}
                            renderItem={item => <List.Item>• {item}</List.Item>}
                            style={{marginBottom: '16px'}}
                        />
                        <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                            Download Excel Template
                        </Button>
                    </Col>
                     <Col span={12}>
                        <Dragger 
                            name="file"
                            multiple={false}
                            accept=".xlsx, .xls"
                            fileList={fileList}
                            beforeUpload={() => false}
                            onChange={handleFileChange}
                            onRemove={() => { setFileList([]); setParsedTemplates([]); setUploadError(null); }}
                        >
                            <p className="ant-upload-drag-icon"><FileExcelOutlined /></p>
                            <p className="ant-upload-text">Click or drag Excel file to this area to upload</p>
                        </Dragger>
                        {uploadError && <Alert message={uploadError} type="error" showIcon style={{ marginTop: 16 }} />}
                         {parsedTemplates.length > 0 && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong>Found {parsedTemplates.length} templates in the file.</Text>
                            </div>
                         )}
                    </Col>
                </Row>
            </Spin>
        </Modal>
    );
};

export default TemplateBulkUploadModal;
