

import { useEffect, useState, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Space, Popconfirm, message, Spin, Alert, Card, Typography, Avatar, Row, Col, Tag, Switch, Modal, Input, Select, Descriptions, Divider, List } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, EyeOutlined, UserOutlined, PrinterOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentsRequest, deleteStudentRequest, bulkDeleteStudentsRequest, updateStudentRequest, type Student, bulkAddStudentsRequest, Sibling } from '../../store/features/students/studentsSlice';
import StudentForm from './StudentForm';
import dayjs from 'dayjs';
import BulkUploadModal from './BulkUploadModal';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { useReactToPrint } from 'react-to-print';


const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const Students: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const dispatch: AppDispatch = useDispatch();
  const printRef = useRef<HTMLDivElement>(null);

  const { students, loading, error } = useSelector((state: RootState) => state.students);
  const { user } = useSelector((state: RootState) => state.auth);
  const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchStudentsRequest(user.organization_key));
      dispatch(fetchSchoolDetailsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);
  
  const uniqueClasses = useMemo(() => {
    const classSet = new Set(students.map(s => s.admitted_class).filter(Boolean));
    return Array.from(classSet).sort();
  }, [students]);


  const filteredStudents = useMemo(() => {
    return students.filter(student => {
        const classMatch = !selectedClass || student.admitted_class === selectedClass;
        const searchMatch = !searchTerm ||
            (student.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (student.parent_contact?.toLowerCase().includes(searchTerm.toLowerCase()));
        return classMatch && searchMatch;
    });
  }, [students, searchTerm, selectedClass]);


  const handleDelete = (id: string) => {
    dispatch(deleteStudentRequest(id));
  };

  const handleBulkDelete = () => {
    dispatch(bulkDeleteStudentsRequest(selectedRowKeys as string[]));
    message.success(`${selectedRowKeys.length} students deleted successfully`);
    setSelectedRowKeys([]);
  };

  
  const handleStatusChange = (checked: boolean, record: Student) => {
    const newStatus = checked ? 'Active' : 'Inactive';
    dispatch(updateStudentRequest({ id: record.id, organization_key: record.organization_key, status: newStatus }));
  };

  const showAddModal = () => {
    setEditingStudent(null);
    setIsModalVisible(true);
  };

  const showEditModal = (student: Student) => {
    setEditingStudent(student);
    setIsModalVisible(true);
  };
  
  const handleViewStudent = (student: Student) => {
    setViewingStudent(student);
    setIsProfileModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingStudent(null);
  };

  const handleProfileModalClose = () => {
      setViewingStudent(null);
      setIsProfileModalVisible(false);
  }
  
  const handleBulkUpload = (data: any[]) => {
    if (user?.organization_key) {
        const studentsToUpload = data.map(item => ({
            ...item,
            organization_key: user.organization_key,
        }));
        dispatch(bulkAddStudentsRequest(studentsToUpload as any));
    } else {
        message.error("Cannot upload students without an organization context.");
    }
    setIsUploadModalVisible(false);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `student-profile-${viewingStudent?.register_no || 'N/A'}`,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
        }
        .printable-area {
            font-family: sans-serif;
            -webkit-print-color-adjust: exact;
        }
        .print-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        .ant-typography {
            color: black !important;
        }
        .watermark-container {
            position: relative;
        }
        .watermark-container::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: var(--watermark-url);
            background-repeat: no-repeat;
            background-position: center;
            background-size: 250px;
            opacity: 0.1;
            z-index: -1;
        }
      }
    `
  });

  const columns = [
    { 
        title: 'Photo', 
        dataIndex: 'photo_url', 
        key: 'photo_url', 
        width: 80,
        render: (url: string, record: Student) => <Avatar src={url} icon={<UserOutlined />} onClick={() => handleViewStudent(record)} style={{cursor: 'pointer'}} /> 
    },
    { title: 'Reg No', dataIndex: 'register_no', key: 'register_no', width: 120 },
    { title: 'Full Name', dataIndex: 'full_name', key: 'full_name', width: 150 },
    { title: 'Admission Class', dataIndex: 'admission_class', key: 'admission_class', width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Gender', dataIndex: 'gender', key: 'gender', width: 100 },
    { title: 'Parent Contact', dataIndex: 'parent_contact', key: 'parent_contact', width: 150 },
    { title: 'Admitted Class', dataIndex: 'admitted_class', key: 'admitted_class', width: 120 },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status', 
      width: 120,
      render: (status: string, record: Student) => (
          <Switch
              checkedChildren="Active"
              unCheckedChildren="Inactive"
              checked={status === 'Active'}
              onChange={(checked) => handleStatusChange(checked, record)}
              loading={loading}
          />
      ) 
    },
    {
      title: 'Action',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Student) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => handleViewStudent(record)} />
          <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Popconfirm
            title="Are you sure to delete this student?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];
  
  const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
    position: 'relative',
    ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
  } : {};
  
  return (
    <>
    <style>{`
        .ant-table-thead > tr > th {
            background-color: #e6f7ff !important;
        }
        .ant-table-tbody > tr:nth-child(even) > td {
            background-color: #fafafa;
        }
        .table-background-watermark::before {
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
            z-index: 1;
        }
    `}</style>
    <Card>
      <Title level={4} style={{ margin: 0 }}>Student Management</Title>
        <Row justify="space-between" align="middle" style={{ margin: '24px 0' }} gutter={[16, 16]}>
            <Col xs={24} md={8}>
                <Search
                    placeholder="Search by Name or Parent Phone"
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%' }}
                    allowClear
                />
            </Col>
            <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                <Select
                    placeholder="Filter by Class"
                    onChange={value => setSelectedClass(value)}
                    style={{ width: '100%' }}
                    allowClear
                >
                    {uniqueClasses.map(c => <Option key={c} value={c!}>{c}</Option>)}
                </Select>
            </Col>
        </Row>
      <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
        <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={showAddModal}
            >
              Add Student
            </Button>
            <Button
                type="default"
                icon={<UploadOutlined />}
                onClick={() => setIsUploadModalVisible(true)}
            >
                Bulk Upload
            </Button>
            <Popconfirm
              title={`Are you sure to delete ${selectedRowKeys.length} students?`}
              onConfirm={handleBulkDelete}
              okText="Yes"
              cancelText="No"
              disabled={!hasSelected}
            >
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={!hasSelected}
                loading={loading}
              >
                Delete Selected ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
        </Space>
      </Space>
      
      {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        <div 
          className='table-background-watermark'
          style={watermarkStyle}
        >
            <Table 
                rowSelection={rowSelection} 
                columns={columns} 
                dataSource={filteredStudents} 
                rowKey="id" 
                scroll={{ x: 'max-content', y: 500 }} 
                pagination={{
                    showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} students`,
                    style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
                }}
                footer={(currentPageData) => {
                    if (currentPageData.length === 0) return null;
                    return (
                        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                             <Col>
                                <Text strong>
                                    Total Students: {filteredStudents.length}
                                </Text>
                             </Col>
                        </Row>
                    )
                }}
            />
        </div>
      </Spin>
      {isModalVisible && (
        <StudentForm
          visible={isModalVisible}
          onClose={handleModalClose}
          student={editingStudent}
        />
      )}
      <BulkUploadModal
        visible={isUploadModalVisible}
        onClose={() => setIsUploadModalVisible(false)}
        onUpload={handleBulkUpload}
        userType="student"
      />
    </Card>
    
    {viewingStudent && (
        <Modal
            open={isProfileModalVisible}
            onCancel={handleProfileModalClose}
            footer={[
              <Button key="back" onClick={handleProfileModalClose}>Close</Button>,
              <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
            ]}
            width={900}
            title={<Title level={4} style={{margin: 0}}>Student Profile</Title>}
            bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
            <div ref={printRef} className="printable-area watermark-container" style={watermarkStyle}>
                <div className="print-header">
                    <Title level={3}>{schoolDetails?.school_name}</Title>
                    <Text>{schoolDetails?.address}</Text>
                </div>
                <Row align="middle" style={{ backgroundColor: '#f0f5ff', padding: '24px', borderRadius: '8px', margin: '24px 0' }}>
                    <Col>
                        <Avatar size={80} src={viewingStudent.photo_url} icon={<UserOutlined />} style={{ border: '4px solid white' }}/>
                    </Col>
                    <Col style={{ marginLeft: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>{viewingStudent.full_name}</Title>
                        <Text style={{ fontSize: 16 }}>Register No: {viewingStudent.register_no}</Text>
                    </Col>
                </Row>

                <div style={{ paddingRight: '16px' }}>
                    <Title level={5}>Personal Information</Title>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Gender">{viewingStudent.gender || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="D.O.B">{viewingStudent.dob ? dayjs(viewingStudent.dob).format('DD MMM YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Mother Tongue">{viewingStudent.mother_tongue || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Birth Place">{viewingStudent.birth_place || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Nationality">{viewingStudent.nationality || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Religion">{viewingStudent.religion || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Caste">{viewingStudent.caste || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Blood Group">{viewingStudent.blood_group || 'N/A'}</Descriptions.Item>
                    </Descriptions>
                    
                    <Title level={5} style={{marginTop: 24}}>Contact & Parent Information</Title>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Student Email">{viewingStudent.email || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Parent Contact">{viewingStudent.parent_contact || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Parent Email">{viewingStudent.parent_email || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Alternate Contact">{viewingStudent.alternate_contact || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Permanent Address" span={2}>{viewingStudent.permanent_address || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Temporary Address" span={2}>{viewingStudent.temporary_address || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="City">{viewingStudent.city || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="State">{viewingStudent.state || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="District">{viewingStudent.district || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Pin Code">{viewingStudent.pin_code || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Father's Name">{viewingStudent.father_name || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Father's Occupation">{viewingStudent.father_occupation || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Mother's Name">{viewingStudent.mother_name || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Mother's Occupation">{viewingStudent.mother_occupation || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Guardian's Name">{viewingStudent.guardian_name || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Guardian's Contact">{viewingStudent.guardian_contact || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Family Income">{viewingStudent.family_income ? `₹${viewingStudent.family_income}` : 'N/A'}</Descriptions.Item>
                    </Descriptions>

                    {viewingStudent.siblings && viewingStudent.siblings.length > 0 && (
                        <>
                            <Title level={5} style={{marginTop: 24}}>Sibling Details</Title>
                            <List
                                size="small"
                                bordered
                                dataSource={viewingStudent.siblings}
                                renderItem={(sibling: Sibling) => (
                                    <List.Item>
                                        <Row style={{width: '100%'}}>
                                            <Col span={8}><Text strong>{sibling.name}</Text> ({sibling.relation})</Col>
                                            <Col span={8}><Text>Age: {sibling.age}</Text></Col>
                                            <Col span={8}><Text>Status: {sibling.status}</Text></Col>
                                        </Row>
                                    </List.Item>
                                )}
                            />
                        </>
                    )}

                    <Title level={5} style={{marginTop: 24}}>Admission Details</Title>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Admission No">{viewingStudent.admission_no || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Admission Date">{viewingStudent.admission_date ? dayjs(viewingStudent.admission_date).format('DD MMM YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Admission Class">{viewingStudent.admission_class || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Admitted Class">{viewingStudent.admitted_class || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Academic Year">{viewingStudent.academic_year || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Admission Type">{viewingStudent.admission_type || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Fee Concession">{viewingStudent.fee_concession ? `${viewingStudent.fee_concession}%` : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={viewingStudent.status === 'Active' ? 'green' : 'red'}>{viewingStudent.status}</Tag></Descriptions.Item>
                    </Descriptions>
                    
                    <Title level={5} style={{marginTop: 24}}>Previous Academic Details</Title>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Previous School">{viewingStudent.previous_school_name || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Last Class">{viewingStudent.last_class_studied || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Board">{viewingStudent.board || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Medium">{viewingStudent.medium || 'N/A'}</Descriptions.Item>
                         <Descriptions.Item label="Result">{viewingStudent.result || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Reason for Leaving">{viewingStudent.reason_for_leaving || 'N/A'}</Descriptions.Item>
                    </Descriptions>

                    <Title level={5} style={{marginTop: 24}}>Health Information</Title>
                    <Descriptions bordered column={2} size="small">
                        <Descriptions.Item label="Height">{viewingStudent.height ? `${viewingStudent.height} cm` : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Weight">{viewingStudent.weight ? `${viewingStudent.weight} kg` : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Vision Test">{viewingStudent.vision_test || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Disability">{viewingStudent.disability || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Known Allergies" span={2}>{viewingStudent.known_allergies || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Medical History" span={2}>{viewingStudent.medical_history || 'N/A'}</Descriptions.Item>
                    </Descriptions>

                    <Title level={5} style={{marginTop: 24}}>Other Information</Title>
                    <Descriptions bordered column={1} size="small">
                         <Descriptions.Item label="Extracurricular / Special Skills">{viewingStudent.extracurricular_skills || 'N/A'}</Descriptions.Item>
                         <Descriptions.Item label="Special Remarks">{viewingStudent.special_remarks || 'N/A'}</Descriptions.Item>
                         <Descriptions.Item label="Notes">{viewingStudent.notes || 'N/A'}</Descriptions.Item>
                    </Descriptions>
                </div>
            </div>
        </Modal>
      )}
    </>
  );
};

export default Students;

    
