
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Button, Upload, Popconfirm, message, Space, Card, Typography, Row, Col, Empty, Spin } from 'antd';
import { UploadOutlined, DeleteOutlined, FilePdfOutlined, FileImageOutlined, CloseOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { fetchStudentsRequest } from '../../store/features/students/studentsSlice';
import {
  fetchDocumentsRequest,
  addDocumentRequest,
  deleteDocumentRequest,
  type StudentDocument,
} from '../../store/features/student-documents/studentDocumentsSlice';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

const docTypes = [
  'Birth Certificate',
  'Transfer Certificate',
  'Previous Marksheet',
  'Aadhar Card',
  'Community Certificate',
  'Passport Size Photo',
  'Parent/Guardian ID Proof',
  'Address Proof',
  'Medical Fitness Certificate',
  'Migration Certificate',
];

const StudentDocumentPage: React.FC = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students } = useSelector((state: RootState) => state.students);
  const { documents, loading } = useSelector((state: RootState) => state.studentDocuments);
  const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchStudentsRequest(user.organization_key));
      dispatch(fetchSchoolDetailsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  useEffect(() => {
    if (selectedStudent && user?.organization_key) {
      dispatch(fetchDocumentsRequest({ studentId: selectedStudent, organizationKey: user.organization_key }));
    }
  }, [dispatch, selectedStudent, user?.organization_key]);

  const handleDelete = (doc: StudentDocument) => {
    if (user?.organization_key) {
        dispatch(deleteDocumentRequest({ docId: doc.id, filePath: doc.file_path, organizationKey: user.organization_key }));
    } else {
        message.error("Cannot delete document without organization context.");
    }
  };
  
  const getUploadProps = (docType: string): UploadProps => ({
    name: 'file',
    multiple: false,
    showUploadList: false,
    customRequest: ({ file }) => {
        if (!selectedStudent) return;
        if (!user?.organization_key) {
            message.error('Cannot upload document without organization context.');
            return;
        }
        dispatch(addDocumentRequest({
            studentId: selectedStudent,
            docType: docType,
            file: file as File,
            organizationKey: user.organization_key,
        }));
    },
    beforeUpload: (file) => {
        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        if (!isImage && !isPdf) {
            message.error('You can only upload image or PDF files!');
        }
        const isLt2M = file.size / 1024 / 1024 < 2;
        if (!isLt2M) {
            message.error('File must be smaller than 2MB!');
        }
        return (isImage || isPdf) && isLt2M;
    }
  });

  const renderDocumentSlot = (docType: string) => {
    const uploadedDoc = documents.find(doc => doc.doc_type === docType);

    const isImage = uploadedDoc?.public_url && /\.(jpeg|jpg|png|gif|jfif)$/i.test(uploadedDoc.public_url);
    const isPdf = uploadedDoc?.public_url && /\.pdf$/i.test(uploadedDoc.public_url);


    return (
        <Col xs={24} sm={12} md={8} key={docType}>
            <div className="document-card">
                <Text strong className="document-card-title">{docType}</Text>
                <div className="document-card-body">
                    <Spin spinning={loading && !uploadedDoc}>
                        <div className="document-upload-area">
                            {uploadedDoc ? (
                                <div className="document-preview">
                                    <Popconfirm title={`Sure to delete ${docType}?`} onConfirm={() => handleDelete(uploadedDoc)} okText="Delete" cancelText="Cancel">
                                        <Button 
                                            shape="circle" 
                                            icon={<CloseOutlined />} 
                                            danger 
                                            size='small'
                                            className="document-delete-btn"
                                        />
                                    </Popconfirm>
                                    <a href={uploadedDoc.public_url} target="_blank" rel="noopener noreferrer" className="document-preview-link">
                                        {isImage ? (
                                            <img src={uploadedDoc.public_url} alt={docType} className="document-image-preview" />
                                        ) : (
                                            <div className="document-file-preview">
                                                {isPdf ? <FilePdfOutlined style={{ fontSize: '48px', color: '#1890ff' }} /> : <FileImageOutlined style={{ fontSize: '48px', color: '#1890ff' }} />}
                                                <Text ellipsis={{ tooltip: uploadedDoc.file_path.split('/').pop() }} className="document-file-name">
                                                    {uploadedDoc.file_path.split('/').pop()}
                                                </Text>
                                            </div>
                                        )}
                                    </a>
                                </div>
                            ) : (
                                <Dragger {...getUploadProps(docType)} className="document-uploader-dragger">
                                    <p className="ant-upload-drag-icon">
                                      <UploadOutlined />
                                    </p>
                                    <p className="ant-upload-text">Click to Upload</p>
                                </Dragger>
                            )}
                        </div>
                    </Spin>
                </div>
            </div>
        </Col>
    );
};

  const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
    position: 'relative',
    '--watermark-url': `url('${schoolDetails.logo_url}')`
  } as React.CSSProperties : {};

  return (
    <>
      <style>{`
        .page-background-watermark::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: var(--watermark-url);
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            opacity: 0.05;
            pointer-events: none;
            z-index: 0;
        }
        .document-card {
            border: 1px solid #e8e8e8;
            border-radius: 8px;
            background: #fff;
            transition: box-shadow 0.3s;
            overflow: hidden;
            position: relative;
            z-index: 1;
        }
        .document-card:hover {
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .document-card-title {
            display: block;
            padding: 12px 16px;
            border-bottom: 1px solid #e8e8e8;
            text-align: center;
        }
        .document-card-body {
            padding: 16px;
        }
        .document-upload-area {
            height: 200px;
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
        }
        .document-uploader-dragger, .document-uploader-dragger .ant-upload {
            width: 100%;
            height: 200px;
        }
        .document-uploader-dragger .ant-upload-drag-icon .anticon {
            font-size: 48px;
            color: #1890ff;
        }
        .document-uploader-dragger .ant-upload-text {
            font-size: 16px;
        }
        .document-preview {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 8px;
            box-sizing: border-box;
            cursor: default;
        }
        .document-delete-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 10;
        }
        .document-preview-link {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            height: 100%;
            cursor: pointer;
        }
        .document-image-preview {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
            border-radius: 4px;
        }
        .document-file-preview {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            width: 100%;
        }
        .document-file-name {
            margin-top: 12px;
            padding: 0 8px;
        }
      `}</style>
    <Card>
      <Title level={4}>Student Document Management</Title>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          showSearch
          allowClear
          placeholder="Select a student to manage their documents"
          value={selectedStudent}
          onChange={(value) => setSelectedStudent(value)}
          style={{ width: '100%', maxWidth: 400 }}
          filterOption={(input, option) =>
            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
          }
        >
          {students.map(student => <Option key={student.id} value={student.id}>{student.full_name} (Reg: {student.register_no})</Option>)}
        </Select>
        
        <div 
            className={schoolDetails?.logo_url ? 'page-background-watermark' : ''}
            style={watermarkStyle}
        >
            {selectedStudent ? (
              <div style={{ marginTop: '24px' }}>
                <Row gutter={[24, 24]}>
                  {docTypes.map(docType => renderDocumentSlot(docType))}
                </Row>
              </div>
            ) : (
                <div style={{ padding: '48px 0' }}>
                    <Empty
                        image="https://gw.alipayobjects.com/zos/antfincdn/ZHrcdLPrvN/empty.svg"
                        imageStyle={{ height: 60 }}
                        description={
                            <Text type="secondary">Please select a student to view and upload documents.</Text>
                        }
                    />
                </div>
            )}
        </div>
      </Space>
    </Card>
    </>
  );
};

export default StudentDocumentPage;
