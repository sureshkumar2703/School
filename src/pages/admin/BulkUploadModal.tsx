
import { useState } from 'react';
import { Modal, Upload, Button, message, Typography, List, Alert, Row, Col } from 'antd';
import { UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Dragger } = Upload;
const { Title, Text, Link } = Typography;

interface BulkUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => void;
  userType: 'student' | 'teacher';
}

const studentTemplate = [
    {
        full_name: 'Amit Kumar',
        email: 'amit.k@example.com',
        password: 'password123',
        gender: 'Male',
        dob: '2015-04-22',
        mother_tongue: 'Hindi',
        birth_place: 'Delhi',
        nationality: 'Indian',
        religion: 'Hindu',
        caste: 'General',
        permanent_address: '123, Main Street, Delhi',
        temporary_address: '123, Main Street, Delhi',
        city: 'Delhi',
        district: 'Central Delhi',
        state: 'Delhi',
        pin_code: '110001',
        parent_email: 'rajesh.k@example.com',
        parent_contact: '9876543210',
        alternate_contact: '9876543211',
        father_name: 'Rajesh Kumar',
        father_occupation: 'Businessman',
        father_contact: '9876543210',
        mother_name: 'Sunita Kumar',
        mother_occupation: 'Homemaker',
        mother_contact: '9876543212',
        guardian_name: '',
        guardian_contact: '',
        family_income: '500000',
        previous_school_name: 'Little Flowers School',
        last_class_studied: 'Class 4',
        board: 'CBSE',
        medium: 'English',
        result: 'Pass',
        reason_for_leaving: 'Relocation',
        blood_group: 'O+',
        height: '140',
        weight: '35',
        vision_test: 'Normal',
        disability: 'None',
        known_allergies: 'None',
        medical_history: 'None',
        register_no: 'REG-STU-001',
        admission_no: 'ADM-STU-001',
        admission_date: '2024-04-01',
        admission_class: 'Class 5',
        admitted_class: 'Class 5',
        academic_year: '2024-2025',
        admission_type: 'New',
        fee_concession: '0',
        status: 'Active',
        extracurricular_skills: 'Painting',
        special_remarks: 'None'
    }
];

const teacherTemplate = [
    { full_name: 'Dr. Ramesh Gupta', email: 'ramesh.g@example.com', password: 'password123', mobile_number: '7654321098', designation: 'Senior Teacher', staff_code: 'STF-001', department: 'Science', subjects_handled: 'Physics,Chemistry' },
    { full_name: 'Mrs. Sunita Singh', email: 'sunita.s@example.com', password: 'password123', mobile_number: '6543210987', designation: 'Junior Teacher', staff_code: 'STF-002', department: 'Arts', subjects_handled: 'History,Geography' },
];

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({ visible, onClose, onUpload, userType }) => {
    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setError(null);
        setParsedData([]);

        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // Use { raw: true } to prevent type conversion. All values will be read as strings.
                const json = XLSX.utils.sheet_to_json(worksheet, { raw: true });
                setParsedData(json);
            } catch (err: any) {
                setError(`Error parsing file: ${err.message}`);
            }
        };
        
        reader.onerror = () => {
             setError("Failed to read the file.");
        }

        reader.readAsArrayBuffer(file);
    };
    
    const handleRemove = () => {
        setFileList([]);
        setParsedData([]);
        setError(null);
    };

    const handleUploadClick = () => {
        if (parsedData.length === 0) {
            message.error("No data to upload. Please select a valid file.");
            return;
        }
        onUpload(parsedData);
    };

    const handleDownloadTemplate = () => {
        const templateData = userType === 'student' ? studentTemplate : teacherTemplate;
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `${userType}s`);
        XLSX.writeFile(wb, `${userType}_template.xlsx`);
    };

    const props = {
        name: 'file',
        multiple: false,
        accept: '.xlsx, .xls',
        fileList: fileList,
        beforeUpload: () => false, // Prevent automatic upload
        onChange: handleFileChange,
        onRemove: handleRemove,
    };

    const studentInstructions = [
        "Required columns: full_name, email, password, admitted_class, gender.",
        "register_no will be auto-generated if left blank.",
        "dob and admission_date should be in YYYY-MM-DD format.",
        "All other columns from the template are optional but recommended for complete profiles.",
        "The password will be used for the student's initial login.",
        "Ensure all emails are unique.",
    ];

    const teacherInstructions = [
        "Required columns: full_name, email, password, mobile_number, designation, staff_code, department.",
        "For 'subjects_handled', list subjects separated by a comma (e.g., 'Physics,Chemistry').",
        "The password will be used for the teacher's initial login.",
        "Ensure all emails and staff codes are unique.",
    ];

    return (
        <Modal
            title={<Title level={4}>Bulk Upload {userType === 'student' ? 'Students' : 'Teachers'}</Title>}
            open={visible}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleUploadClick} disabled={parsedData.length === 0 || !!error}>
                    Upload Data
                </Button>,
            ]}
        >
            <Row gutter={24}>
                <Col span={12}>
                    <Title level={5}>Instructions</Title>
                    <List
                        size="small"
                        dataSource={userType === 'student' ? studentInstructions : teacherInstructions}
                        renderItem={item => <List.Item>• {item}</List.Item>}
                    />
                    <Button type="link" onClick={handleDownloadTemplate} style={{ paddingLeft: 0, marginTop: 16 }}>
                        Download Excel Template
                    </Button>
                </Col>
                <Col span={12}>
                     <Dragger {...props}>
                        <p className="ant-upload-drag-icon">
                            <FileExcelOutlined />
                        </p>
                        <p className="ant-upload-text">Click or drag Excel file to this area to upload</p>
                        <p className="ant-upload-hint">
                            Supports .xlsx and .xls files. Please use the provided template for best results.
                        </p>
                    </Dragger>
                </Col>
            </Row>

            {error && <Alert message={error} type="error" showIcon style={{ marginTop: 16 }} />}

            {parsedData.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <Title level={5}>Preview ({parsedData.length} records found)</Title>
                    <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid #f0f0f0', padding: 8 }}>
                         <List
                            size="small"
                            dataSource={parsedData.slice(0, 10)} // Preview first 10 records
                            renderItem={(item: any) => (
                                <List.Item>
                                    <Text strong>{item.full_name || 'N/A'}</Text> - <Text>{item.email || 'N/A'}</Text>
                                </List.Item>
                            )}
                        />
                        {parsedData.length > 10 && <Text strong style={{display: 'block', textAlign: 'center', marginTop: 8}}>... and {parsedData.length - 10} more records.</Text>}
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default BulkUploadModal;

    