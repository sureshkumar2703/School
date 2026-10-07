
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Typography, Modal, Form, Input, Row, Col, Select, DatePicker, Upload, InputNumber, Tabs, message, Spin, Table, Avatar, Space, Popconfirm, Image, Descriptions, Switch, Tag } from 'antd';
import { PlusOutlined, UploadOutlined, UserOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { addStaffRequest, fetchStaffRequest, deleteStaffRequest, updateStaffRequest, type LibraryStaff, type UpdateStaffPayload } from '../../store/features/library-staff/libraryStaffSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { Search } = Input;

const generateStaffID = () => {
    const prefix = 'LS';
    const randomNumber = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}${randomNumber}`;
};

const LibraryStaffCreate: React.FC = () => {
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [editingStaff, setEditingStaff] = useState<LibraryStaff | null>(null);
    const [viewingStaff, setViewingStaff] = useState<LibraryStaff | null>(null);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();

    const { staff, loading } = useSelector((state: RootState) => state.libraryStaff);
    const { user } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchStaffRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
    const calculateAge = useCallback((birthday: Dayjs | null) => {
        if (birthday) {
            const age = dayjs().diff(birthday, 'year');
            form.setFieldsValue({ age });
        }
    }, [form]);
    
    useEffect(() => {
        if (isFormModalVisible) {
            if (editingStaff) {
                 form.setFieldsValue({
                    ...editingStaff,
                    dob: editingStaff.dob ? dayjs(editingStaff.dob) : null,
                    joining_date: editingStaff.joining_date ? dayjs(editingStaff.joining_date) : null,
                    password: '', // Clear password field for security
                });
                if (editingStaff.photo_url) {
                    setFileList([{ uid: '-1', name: 'photo', status: 'done', url: editingStaff.photo_url }]);
                } else {
                    setFileList([]);
                }
            } else {
                 form.resetFields();
                 form.setFieldsValue({
                    staff_id: generateStaffID(),
                    joining_date: dayjs(), // Set current date as default
                    status: 'Active',
                });
                setFileList([]);
            }
        }
    }, [editingStaff, form, isFormModalVisible]);


    const showModal = (staffMember: LibraryStaff | null = null) => {
        setEditingStaff(staffMember);
        setIsFormModalVisible(true);
    };

    const handleCancel = () => {
        setIsFormModalVisible(false);
        setEditingStaff(null);
        form.resetFields();
        setFileList([]);
    };
    
    const handleViewCancel = () => {
        setIsViewModalVisible(false);
        setViewingStaff(null);
    };

    const showViewModal = (staffMember: LibraryStaff) => {
        setViewingStaff(staffMember);
        setIsViewModalVisible(true);
    };
    
    const onFinish = (values: any) => {
         if (!user?.organization_key) {
            message.error("Organization key not found. Cannot proceed.");
            return;
        }

        const commonPayload = {
            ...values,
            organization_key: user.organization_key,
            photoFile: fileList[0]?.originFileObj,
            dob: values.dob ? dayjs(values.dob).format('YYYY-MM-DD') : undefined,
            joining_date: values.joining_date ? dayjs(values.joining_date).format('YYYY-MM-DD') : undefined,
        };
        
        if (editingStaff) {
            const updatePayload: UpdateStaffPayload = {
                details: { ...commonPayload, id: editingStaff.id, organization_key: user.organization_key },
                photoFile: fileList.length > 0 && fileList[0].originFileObj ? fileList[0].originFileObj : undefined,
                oldPhotoPath: editingStaff.photo_path,
            };
            dispatch(updateStaffRequest(updatePayload));
        } else {
             dispatch(addStaffRequest(commonPayload));
        }
       
        handleCancel();
    };

    const handleDelete = (staffId: string, photoPath?: string) => {
        if (!user?.organization_key) {
            message.error("Cannot perform deletion without organization context.");
            return;
        }
        dispatch(deleteStaffRequest({
            staffId,
            photoPath,
            organizationKey: user.organization_key
        }));
    };
    
    const handleStatusChange = (checked: boolean, record: LibraryStaff) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateStaffRequest({ details: { id: record.id, status: newStatus, organization_key: user?.organization_key } }));
    };

    const handlePhotoUpload: UploadProps['onChange'] = ({ fileList: newFileList }) => {
        setFileList(newFileList);
    };
    
    const photoUploadProps: UploadProps = {
        fileList,
        listType: 'picture-card',
        onChange: handlePhotoUpload,
        beforeUpload: () => false, // Prevent auto upload
        maxCount: 1,
    };
    
    const filteredStaff = staff.filter(item => 
        item.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.staff_id.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const columns = [
        { title: 'Staff ID', dataIndex: 'staff_id', key: 'staff_id' },
        { title: 'Photo', dataIndex: 'photo_url', key: 'photo_url', render: (url: string) => url ? <Avatar src={url} /> : <Avatar icon={<UserOutlined />} /> },
        { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Phone', dataIndex: 'phone_number', key: 'phone_number' },
        { title: 'Employment Type', dataIndex: 'employment_type', key: 'employment_type' },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string, record: LibraryStaff) => (
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
            title: 'Action', key: 'action',
            render: (_: any, record: LibraryStaff) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => showViewModal(record)} />
                    <Button icon={<EditOutlined />} onClick={() => showModal(record)} />
                    <Popconfirm title="Are you sure to delete this staff member?" onConfirm={() => handleDelete(record.id, record.photo_path)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                    <Col>
                        <Title level={4}>Library Staff Management</Title>
                    </Col>
                    <Col xs={24} md={{ span: 12, offset: 0 }} style={{ textAlign: 'right' }}>
                       <Row gutter={[16, 16]} justify="end">
                            <Col xs={24} sm={16}>
                                <Search
                                    placeholder="Search by Name or Staff ID"
                                    onSearch={setSearchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col xs={24} sm={8}>
                                <Button type="primary" icon={<PlusOutlined />} onClick={() => showModal()} block>
                                    Create Staff
                                </Button>
                            </Col>
                       </Row>
                    </Col>
                </Row>
                 <Spin spinning={loading}>
                    <div style={{overflowX: 'auto'}}>
                        <Table columns={columns} dataSource={filteredStaff} rowKey="id" bordered scroll={{ x: 'max-content' }} />
                    </div>
                </Spin>
            </Card>

            <Modal
                title={editingStaff ? "Edit Library Staff" : "Create New Library Staff"}
                open={isFormModalVisible}
                onCancel={handleCancel}
                footer={null}
                width={800}
                destroyOnClose
            >
                <Spin spinning={loading}>
                    <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                        <Tabs defaultActiveKey="1">
                            <TabPane tab="Basic Information" key="1">
                                <Row gutter={16}>
                                    <Col span={8}>
                                        <Form.Item name="staff_id" label="Staff ID">
                                            <Input disabled placeholder="Auto-generated" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={16}>
                                        <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
                                            <Input />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="gender" label="Gender" rules={[{ required: true }]}>
                                            <Select placeholder="Select gender">
                                                <Option value="Male">Male</Option>
                                                <Option value="Female">Female</Option>
                                                <Option value="Other">Other</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="dob" label="Date of Birth" rules={[{ required: true }]}>
                                            <DatePicker style={{ width: '100%' }} onChange={calculateAge} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={8}>
                                        <Form.Item name="age" label="Age">
                                            <InputNumber style={{ width: '100%' }} disabled placeholder="Calculated" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </TabPane>
                            <TabPane tab="Job Information" key="2">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="qualification" label="Qualification">
                                            <Input placeholder="e.g., Degree in Library Science" />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="experience" label="Experience (Years)">
                                            <InputNumber style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="joining_date" label="Date of Joining" rules={[{ required: true }]}>
                                            <DatePicker style={{ width: '100%' }} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="employment_type" label="Employment Type" rules={[{ required: true }]}>
                                            <Select placeholder="Select type">
                                                <Option value="Permanent">Permanent</Option>
                                                <Option value="Temporary">Temporary</Option>
                                                <Option value="Contract">Contract</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </TabPane>
                            <TabPane tab="Contact Details" key="3">
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }, { len: 10, message: "Phone number must be 10 digits" }]}>
                                            <Input maxLength={10} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="emergency_number" label="Emergency Number" rules={[{ len: 10, message: "Emergency number must be 10 digits" }]}>
                                            <Input maxLength={10} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="email" label="Email ID" rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Please enter a valid email' }]}>
                                            <Input disabled={!!editingStaff} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="password" label="Password" rules={[{ required: !editingStaff, message: 'Password is required' }]} help={editingStaff ? "Leave blank to keep the existing password." : ""}>
                                            <Input.Password placeholder={editingStaff ? "New password (optional)" : "Enter password"}/>
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
                                        <Form.Item name="address" label="Address">
                                            <Input.TextArea rows={3} />
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
                                        <Form.Item label="Photo">
                                            <Upload {...photoUploadProps}>
                                                {fileList.length === 0 && (
                                                    <div>
                                                        <PlusOutlined />
                                                        <div style={{ marginTop: 8 }}>Upload Photo</div>
                                                    </div>
                                                )}
                                            </Upload>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </TabPane>
                        </Tabs>
                        <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                {editingStaff ? 'Update Staff' : 'Create Staff'}
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
            
             {viewingStaff && (
                <Modal title="Library Staff Details" open={isViewModalVisible} onCancel={handleViewCancel} footer={null} width={800}>
                    <Descriptions bordered column={2} style={{ marginTop: 24 }} layout="vertical">
                        <Descriptions.Item label="Photo" span={2}>
                            <Avatar size={80} src={viewingStaff.photo_url} icon={<UserOutlined />} />
                        </Descriptions.Item>
                        <Descriptions.Item label="Staff ID">{viewingStaff.staff_id}</Descriptions.Item>
                        <Descriptions.Item label="Full Name">{viewingStaff.full_name}</Descriptions.Item>
                        <Descriptions.Item label="Email">{viewingStaff.email}</Descriptions.Item>
                        <Descriptions.Item label="Password">{viewingStaff.password || '******'}</Descriptions.Item>
                        <Descriptions.Item label="Phone">{viewingStaff.phone_number}</Descriptions.Item>
                        <Descriptions.Item label="Emergency Contact">{viewingStaff.emergency_number || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Gender">{viewingStaff.gender}</Descriptions.Item>
                        <Descriptions.Item label="Date of Birth">{viewingStaff.dob ? dayjs(viewingStaff.dob).format('DD MMM YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Age">{viewingStaff.age}</Descriptions.Item>
                        <Descriptions.Item label="Joining Date">{viewingStaff.joining_date ? dayjs(viewingStaff.joining_date).format('DD MMM YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Employment Type">{viewingStaff.employment_type}</Descriptions.Item>
                        <Descriptions.Item label="Experience">{viewingStaff.experience ? `${viewingStaff.experience} years` : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Qualification" span={2}>{viewingStaff.qualification || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Address" span={2}>{viewingStaff.address || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Status" span={2}>
                            <Tag color={viewingStaff.status === 'Active' ? 'green' : 'red'}>{viewingStaff.status}</Tag>
                        </Descriptions.Item>
                    </Descriptions>
                </Modal>
            )}
        </>
    );
};

export default LibraryStaffCreate;
