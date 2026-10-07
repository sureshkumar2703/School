
import React, { useState } from 'react';
import { Modal, Upload, Button, message, Typography, List, Alert, Row, Col } from 'antd';
import { UploadOutlined, FileExcelOutlined, DownloadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Dragger } = Upload;
const { Title, Text } = Typography;

interface BookBulkUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (data: any[]) => void;
}

// Changed to an empty array to generate a template with only headers.
const bookTemplateHeaders = [
    "book_code",
    "book_name",
    "author_name",
    "description",
    "no_of_books",
    "status"
];


const BookBulkUploadModal: React.FC<BookBulkUploadModalProps> = ({ visible, onClose, onUpload }) => {
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
                const json = XLSX.utils.sheet_to_json(worksheet);
                
                const requiredHeaders = ['book_name', 'author_name'];
                const fileHeaders = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));

                if (missingHeaders.length > 0) {
                     throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                }

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
        // Create a worksheet with only the headers
        const ws = XLSX.utils.aoa_to_sheet([bookTemplateHeaders]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Books`);
        XLSX.writeFile(wb, `book_upload_template.xlsx`);
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

    const instructions = [
        "Required columns: book_name, author_name.",
        "Optional columns: book_code, description, no_of_books, status.",
        "If 'book_code' is left empty, a unique code will be auto-generated.",
        "If 'status' is not provided, it will default to 'Active'.",
    ];

    return (
        <Modal
            title={<Title level={4}>Bulk Upload Books</Title>}
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
                        dataSource={instructions}
                        renderItem={item => <List.Item>• {item}</List.Item>}
                    />
                    <Button type="link" icon={<DownloadOutlined />} onClick={handleDownloadTemplate} style={{ paddingLeft: 0, marginTop: 16 }}>
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
                                    <Text strong>{item.book_name || 'N/A'}</Text> - <Text>{item.author_name || 'N/A'}</Text>
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

export default BookBulkUploadModal;
