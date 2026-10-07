

import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, Space, Popconfirm, message, Spin, Alert, Card, Typography, Avatar, Row, Col, Tag, Switch, Modal, Input, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, EyeOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeachersRequest, deleteTeacherRequest, bulkDeleteTeachersRequest, updateTeacherRequest, type Teacher, bulkAddTeachersRequest } from '../../store/features/teachers/teachersSlice';
import TeacherForm from './TeacherForm';
import TeacherBulkUploadModal from './TeacherBulkUploadModal';
import dayjs from 'dayjs';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const Teachers: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const dispatch: AppDispatch = useDispatch();
  const { students, loading, error } = useSelector((state: RootState) => state.students);
  const { teachers } = useSelector((state: RootState) => state.teachers);
  const { user } = useSelector((state: RootState) => state.auth);
  const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchTeachersRequest(user.organization_key));
      dispatch(fetchSchoolDetailsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);
  
  const uniqueClasses = useMemo(() => {
    const classSet = new Set(students.map(s => s.admitted_class).filter(Boolean));
    return Array.from(classSet).sort();
  }, [students]);


  const filteredTeachers = useMemo(() => {
    return teachers.filter(teacher => {
        const searchMatch = !searchTerm ||
            (teacher.full_name && teacher.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (teacher.mobile_number && teacher.mobile_number.includes(searchTerm));
        return searchMatch;
    });
  }, [teachers, searchTerm]);


  const handleDelete = (id: string) => {
    dispatch(deleteTeacherRequest(id));
  };

  const handleBulkDelete = () => {
    dispatch(bulkDeleteTeachersRequest(selectedRowKeys as string[]));
    message.success(`${selectedRowKeys.length} teachers deleted successfully`);
    setSelectedRowKeys([]);
  };

  
  const handleStatusChange = (checked: boolean, record: Teacher) => {
    const newStatus = checked ? 'Active' : 'Inactive';
    dispatch(updateTeacherRequest({ ...record, status: newStatus } as Teacher));
    message.success(`Teacher status updated to ${newStatus}`);
  };

  const showAddModal = () => {
    setEditingTeacher(null);
    setIsModalVisible(true);
  };

  const showEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setIsModalVisible(true);
  };
  
  const handleViewTeacher = (teacher: Teacher) => {
    setViewingTeacher(teacher);
    setIsProfileModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setEditingTeacher(null);
  };

  const handleProfileModalClose = () => {
      setViewingTeacher(null);
      setIsProfileModalVisible(false);
  }
  
  const handleBulkUploadClick = () => {
    setIsUploadModalVisible(true);
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const columns = [
    { 
        title: 'Photo', 
        dataIndex: 'photo_url', 
        key: 'photo_url', 
        width: 80,
        render: (url: string, record: Teacher) => <Avatar src={url} icon={<UserOutlined />} onClick={() => handleViewTeacher(record)} style={{cursor: 'pointer'}} /> 
    },
    { title: 'Staff Code', dataIndex: 'staff_code', key: 'staff_code', width: 120 },
    { title: 'Name', dataIndex: 'full_name', key: 'full_name', width: 150 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Mobile Number', dataIndex: 'mobile_number', key: 'mobile_number', width: 150 },
    { title: 'Designation', dataIndex: 'designation', key: 'designation', width: 150 },
    { 
      title: 'Subjects Handled', 
      dataIndex: 'subjects_handled', 
      key: 'subjects_handled',
      width: 200,
      render: (subjects: string[]) => (
        <>
          {subjects?.map(subject => <Tag key={subject}>{subject}</Tag>)}
        </>
      ),
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      width: 120,
      render: (status: string, record: Teacher) => (
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
      render: (_: unknown, record: Teacher) => (
        <Space size="middle">
          <Button icon={<EyeOutlined />} onClick={() => handleViewTeacher(record)} />
          <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
          <Popconfirm
            title="Are you sure to delete this teacher?"
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
    '--watermark-url': `url('${schoolDetails.logo_url}')`
  } as React.CSSProperties : {};
  
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
        <Title level={4} style={{ margin: 0 }}>Teacher Management</Title>

        <Row justify="space-between" align="middle" style={{ margin: '24px 0' }} gutter={[16, 16]}>
            <Col xs={24} md={16}>
                <Space wrap>
                  <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>Add Teacher</Button>
                  <Button icon={<UploadOutlined />} onClick={handleBulkUploadClick}>Bulk Upload</Button>
                  <Popconfirm
                    title={`Are you sure to delete ${selectedRowKeys.length} teachers?`}
                    onConfirm={handleBulkDelete}
                    okText="Yes"
                    cancelText="No"
                    disabled={!hasSelected}
                  >
                    <Button danger icon={<DeleteOutlined />} disabled={!hasSelected} loading={loading}>
                      Delete Selected ({selectedRowKeys.length})
                    </Button>
                  </Popconfirm>
                </Space>
            </Col>
             <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                <Search
                    placeholder="Search by Name or Phone"
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%' }}
                    allowClear
                />
            </Col>
        </Row>
        
        {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
        <Spin spinning={loading}>
          <div 
            className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
            style={watermarkStyle}
          >
            <Table 
                rowSelection={rowSelection} 
                columns={columns} 
                dataSource={filteredTeachers} 
                rowKey="id" 
                scroll={{ x: 'max-content', y: 500 }}
                pagination={{
                    showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} teachers`,
                    style: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', width: '100%' },
                }}
                 footer={(currentPageData) => {
                    if (currentPageData.length === 0) return null;
                    return (
                        <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                             <Col>
                                <Text strong>
                                    Total Teachers: {filteredTeachers.length}
                                </Text>
                             </Col>
                        </Row>
                    )
                }}
            />
          </div>
        </Spin>
        <TeacherForm
          visible={isModalVisible}
          onClose={handleModalClose}
          teacher={editingTeacher}
        />
        <TeacherBulkUploadModal 
            visible={isUploadModalVisible}
            onClose={() => setIsUploadModalVisible(false)}
            organizationKey={user?.organization_key}
        />
      </Card>
      
      {viewingTeacher && (
         <Modal
            open={isProfileModalVisible}
            onCancel={handleProfileModalClose}
            footer={null}
            width={900}
            title={<Title level={4} style={{margin: 0}}>Teacher Profile</Title>}
        >
            <Row align="middle" style={{ backgroundColor: '#f0f5ff', padding: '24px', borderRadius: '8px', margin: '24px 0' }}>
                <Col>
                     <Avatar size={80} src={viewingTeacher.photo_url} icon={<UserOutlined />} style={{ border: '4px solid white' }}/>
                </Col>
                <Col style={{ marginLeft: 24 }}>
                    <Title level={3} style={{ margin: 0 }}>{viewingTeacher.full_name}</Title>
                    <Text style={{ fontSize: 16 }}>{viewingTeacher.designation} | Staff Code: {viewingTeacher.staff_code}</Text>
                </Col>
            </Row>

            <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '16px' }}>
                <Title level={5}>Personal Information</Title>
                <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                    <Col span={8}><Text strong>Email:</Text> {viewingTeacher.email || 'N/A'}</Col>
                    <Col span={8}><Text strong>Mobile:</Text> {viewingTeacher.mobile_number || 'N/A'}</Col>
                    <Col span={8}><Text strong>Alternate:</Text> {viewingTeacher.alternate_number || 'N/A'}</Col>
                    <Col span={8}><Text strong>Gender:</Text> {viewingTeacher.gender || 'N/A'}</Col>
                    <Col span={8}><Text strong>D.O.B:</Text> {viewingTeacher.dob ? dayjs(viewingTeacher.dob).format('DD MMM YYYY') : 'N/A'}</Col>
                    <Col span={8}><Text strong>Marital Status:</Text> {viewingTeacher.marital_status || 'N/A'}</Col>
                    <Col span={8}><Text strong>Blood Group:</Text> {viewingTeacher.blood_group || 'N/A'}</Col>
                    <Col span={8}><Text strong>Religion:</Text> {viewingTeacher.religion || 'N/A'}</Col>
                    <Col span={8}><Text strong>Nationality:</Text> {viewingTeacher.nationality || 'N/A'}</Col>
                    <Col span={24}><Text strong>Permanent Address:</Text> {viewingTeacher.permanent_address || 'N/A'}</Col>
                    <Col span={24}><Text strong>Temporary Address:</Text> {viewingTeacher.temporary_address || 'N/A'}</Col>
                </Row>

                <Title level={5} style={{marginTop: 24}}>Professional Details</Title>
                <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                    <Col span={12}><Text strong>Department:</Text> {viewingTeacher.department || 'N/A'}</Col>
                    <Col span={12}><Text strong>Joining Date:</Text> {viewingTeacher.joining_date ? dayjs(viewingTeacher.joining_date).format('DD MMM YYYY') : 'N/A'}</Col>
                    <Col span={12}><Text strong>Experience:</Text> {viewingTeacher.experience_years ? `${viewingTeacher.experience_years} years` : 'N/A'}</Col>
                    <Col span={12}><Text strong>Status:</Text> <Tag color={viewingTeacher.status === 'Active' ? 'green' : 'red'}>{viewingTeacher.status}</Tag></Col>
                    <Col span={24}><Text strong>Highest Qualification:</Text> {viewingTeacher.highest_qualification || 'N/A'}</Col>
                    <Col span={24}><Text strong>Graduation Details:</Text> {viewingTeacher.graduation_details || 'N/A'}</Col>
                </Row>

                 <Title level={5} style={{marginTop: 24}}>Subjects Handled</Title>
                 <div style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                     {viewingTeacher.subjects_handled && viewingTeacher.subjects_handled.length > 0 ? (
                        <Space wrap>
                            {viewingTeacher.subjects_handled.map(item => <Tag key={item} color="blue">{item}</Tag>)}
                        </Space>
                     ) : <Text type="secondary">No subjects assigned</Text>}
                 </div>

                <Title level={5} style={{marginTop: 24}}>Bank & Statutory</Title>
                <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                    <Col span={8}><Text strong>Salary:</Text> {viewingTeacher.salary ? `₹${viewingTeacher.salary}` : 'N/A'}</Col>
                    <Col span={8}><Text strong>PF Amount:</Text> {viewingTeacher.pf_salary ? `₹${viewingTeacher.pf_salary}` : 'N/A'}</Col>
                    <Col span={8}><Text strong>Total Salary:</Text> {viewingTeacher.total_salary ? `₹${viewingTeacher.total_salary}` : 'N/A'}</Col>
                    <Col span={12}><Text strong>Bank Name:</Text> {viewingTeacher.bank_name || 'N/A'}</Col>
                    <Col span={12}><Text strong>Branch:</Text> {viewingTeacher.branch || 'N/A'}</Col>
                    <Col span={12}><Text strong>Account No.:</Text> {viewingTeacher.bank_account_no || 'N/A'}</Col>
                    <Col span={12}><Text strong>PF Number:</Text> {viewingTeacher.pf_number || 'N/A'}</Col>
                    <Col span={12}><Text strong>UAN Number:</Text> {viewingTeacher.uan_no || 'N/A'}</Col>
                    <Col span={12}><Text strong>PAN Number:</Text> {viewingTeacher.pan_number || 'N/A'}</Col>
                    <Col span={12}><Text strong>Aadhar:</Text> {viewingTeacher.aadhar_number || 'N/A'}</Col>
                </Row>
                
                <Title level={5} style={{marginTop: 24}}>Remarks</Title>
                <div style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                  <Text>{viewingTeacher.remarks || 'No remarks added.'}</Text>
                </div>
            </div>
        </Modal>
      )}
    </>
  );
};

export default Teachers;




