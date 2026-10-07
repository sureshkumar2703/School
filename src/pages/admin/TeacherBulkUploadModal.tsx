
import { useState } from 'react';
import { Modal, Row, Col, Typography, Button, Upload, message, Spin, List } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import * as XLSX from 'xlsx';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { bulkAddTeachersRequest } from '../../store/features/teachers/teachersSlice';
import type { Teacher } from '../../store/features/teachers/teachersSlice';

const { Title, Text, Paragraph } = Typography;

interface TeacherBulkUploadModalProps {
  visible: boolean;
  onClose: () => void;
  organizationKey?: string;
}

const CSV_HEADERS = [
    "Name", "Date of Birth", "Gender", "Blood Group", "Nationality", "Religion", "Marital Status", "Aadhar Number", "Mobile Number", "Alternate Number", "Permanent Address", "Temporary Address",
    "Designation", "Department", "Years of Experience", "Joining Date", "Highest Qualification", "Graduation Details (Degree, University, Year)", "Subjects Handled",
    "Bank Name", "Branch", "Bank Account Number", "Salary", "PF Salary Amount", "PF Number", "UAN Number", "PAN Number",
    "Email", "Password", "Status", "Remarks"
];

// This maps the CSV header to the database column name in your Teacher interface.
// It's crucial for correctly parsing the CSV data.
const HEADER_TO_KEY_MAP: { [key: string]: keyof Omit<Teacher, 'id' | 'staff_code' | 'total_salary'> } = {
    "Name": "full_name",
    "Date of Birth": "dob",
    "Gender": "gender",
    "Blood Group": "blood_group",
    "Nationality": "nationality",
    "Religion": "religion",
    "Marital Status": "marital_status",
    "Aadhar Number": "aadhar_number",
    "Mobile Number": "mobile_number",
    "Alternate Number": "alternate_number",
    "Permanent Address": "permanent_address",
    "Temporary Address": "temporary_address",
    "Designation": "designation",
    "Department": "department",
    "Years of Experience": "experience_years",
    "Joining Date": "joining_date",
    "Highest Qualification": "highest_qualification",
    "Graduation Details (Degree, University, Year)": "graduation_details",
    "Subjects Handled": "subjects_handled",
    "Bank Name": "bank_name",
    "Branch": "branch",
    "Bank Account Number": "bank_account_no",
    "Salary": "salary",
    "PF Salary Amount": "pf_salary",
    "PF Number": "pf_number",
    "UAN Number": "uan_no",
    "PAN Number": "pan_number",
    "Email": "email",
    "Password": "password",
    "Status": "status",
    "Remarks": "remarks"
};


const TeacherBulkUploadModal: React.FC<TeacherBulkUploadModalProps> = ({ visible, onClose, organizationKey }) => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploadingFile, setUploadingFile] = useState<File | null>(null);
    const dispatch: AppDispatch = useDispatch();
    const { loading } = useSelector((state: RootState) => state.teachers);
    
    const handleDownloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([CSV_HEADERS]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Teachers Template');
        XLSX.writeFile(wb, 'teacher_upload_template.csv');
    };

    const handleUpload = () => {
        if (!uploadingFile) {
            message.error('File not found. Please select a file again.');
            return;
        }
        if (!organizationKey) {
            message.error('Could not identify your organization. Please ensure you are logged in correctly.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const json: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false }); // Use raw: false to get strings

                if(json.length === 0) {
                    message.error("The uploaded CSV file is empty or invalid.");
                    return;
                }

                const teachersToUpload: Omit<Teacher, 'id'>[] = json.map(row => {
                    const teacher: Partial<Teacher> = {};
                    for (const header of CSV_HEADERS) {
                        const key = HEADER_TO_KEY_MAP[header];
                        if (key && row[header] !== undefined) {
                            const value = row[header];
                            if (key === 'subjects_handled') {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (teacher as any)[key] = String(value).split(',').map(s => s.trim());
                            } else {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                (teacher as any)[key] = String(value);
                            }
                        }
                    }
                    const salary = parseFloat(teacher.salary || '0');
                    const pf_salary = parseFloat(String(teacher.pf_salary) || '0');
                    teacher.total_salary = salary - pf_salary;
                    return teacher as Omit<Teacher, 'id'>;
                });
                
                dispatch(bulkAddTeachersRequest({ teachers: teachersToUpload, organizationKey: organizationKey }));
                setFileList([]);
                setUploadingFile(null);
                
            } catch (error) {
                message.error('Failed to parse the file. Please ensure it is a valid CSV.');
                console.error(error);
            }
        };
        reader.readAsBinaryString(uploadingFile);
    };

    const props: UploadProps = {
        fileList,
        onRemove: () => {
            setUploadingFile(null);
            setFileList([]);
        },
        beforeUpload: (file) => {
            const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
            if (!isCSV) {
                message.error(`${file.name} is not a CSV file`);
                return Upload.LIST_IGNORE;
            }
            setUploadingFile(file);
            setFileList([file]);
            return false;
        },
        maxCount: 1,
    };

    return (
        <Modal
            title="Bulk Upload Teachers"
            open={visible}
            onCancel={onClose}
            width={800}
            footer={[
                <Button key="back" onClick={onClose} disabled={loading}>
                    Close
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleUpload} disabled={!uploadingFile}>
                    Start Upload
                </Button>,
            ]}
        >
            <Spin spinning={loading} tip="Uploading and processing teachers... Please wait.">
                <Row gutter={24}>
                    <Col xs={24} md={12}>
                        <Title level={5}>Upload Process</Title>
                        <Paragraph>
                            Follow these steps to bulk upload teacher data into the system.
                        </Paragraph>
                        <List size="small" bordered>
                            <List.Item>
                                1. Download the CSV template using the button below.
                            </List.Item>
                             <List.Item>
                                2. Fill in the teacher details. <Text strong>Name, Email, and Password</Text> are mandatory fields for each record.
                            </List.Item>
                             <List.Item>
                                3. For the <Text code>Subjects Handled</Text> column, enter subject names separated by commas (e.g., "Math,Science,English").
                            </List.Item>
                             <List.Item>
                                4. Save the file and upload it using the upload box on the right.
                            </List.Item>
                             <List.Item>
                               <Text strong type="danger">Note:</Text> If an email already exists in the system, that entire row will be skipped to prevent duplicates.
                            </List.Item>
                        </List>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadTemplate}
                            style={{ marginTop: 16 }}
                        >
                            Download CSV Template
                        </Button>
                    </Col>
                    <Col xs={24} md={12} style={{ borderLeft: '1px solid #f0f0f0', paddingLeft: '24px' }}>
                         <Title level={5}>Upload File</Title>
                        <Upload.Dragger {...props} height={200}>
                            <p className="ant-upload-drag-icon">
                                <UploadOutlined />
                            </p>
                            <p className="ant-upload-text">Click or drag CSV file to this area to upload</p>
                            <p className="ant-upload-hint">
                                Please upload a single CSV file. Any existing file will be replaced.
                            </p>
                        </Upload.Dragger>
                    </Col>
                </Row>
            </Spin>
        </Modal>
    );
};

export default TeacherBulkUploadModal;
