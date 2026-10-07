
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Row, Col, Select, DatePicker, Upload, message, Spin, Modal, Table, Space, Popconfirm, Switch, Image, Avatar, Descriptions } from 'antd';
import { UploadOutlined, UserOutlined, PhoneOutlined, MailOutlined, HomeOutlined, IdcardOutlined, SafetyCertificateOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined, FileImageOutlined, LinkOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { addDriverRequest, fetchDriversRequest, updateDriverRequest, deleteDriverRequest, type AddDriverPayload, type Driver } from '../../store/features/drivers/driversSlice';
import dayjs from 'dayjs';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const getBase64 = (file: RcFile): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });


const CreateDriver: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { drivers, loading } = useSelector((state: RootState) => state.drivers);

    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [viewingDriver, setViewingDriver] = useState<Driver | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [profilePhotoList, setProfilePhotoList] = useState<UploadFile[]>([]);
    const [idProofList, setIdProofList] = useState<UploadFile[]>([]);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchDriversRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (editingDriver) {
            form.setFieldsValue({
                ...editingDriver,
                dob: editingDriver.dob ? dayjs(editingDriver.dob) : null,
                license_expiry_date: editingDriver.license_expiry_date ? dayjs(editingDriver.license_expiry_date) : null,
            });
            if (editingDriver.profile_photo_url) {
                setProfilePhotoList([{ uid: '-1', name: 'photo', status: 'done', url: editingDriver.profile_photo_url }]);
            } else {
                setProfilePhotoList([]);
            }
            if (editingDriver.id_proof_url) {
                setIdProofList([{ uid: '-2', name: 'id_proof', status: 'done', url: editingDriver.id_proof_url }]);
            } else {
                setIdProofList([]);
            }
        } else {
            form.resetFields();
            setProfilePhotoList([]);
            setIdProofList([]);
        }
    }, [editingDriver, form]);
    

    const showAddModal = () => {
        setEditingDriver(null);
        setIsFormModalVisible(true);
    };

    const showEditModal = (driver: Driver) => {
        setEditingDriver(driver);
        setIsFormModalVisible(true);
    };

    const showViewModal = (driver: Driver) => {
        setViewingDriver(driver);
        setIsViewModalVisible(true);
    };

    const handleFormCancel = () => {
        setIsFormModalVisible(false);
        setEditingDriver(null);
        form.resetFields();
        setProfilePhotoList([]);
        setIdProofList([]);
    };
    
    const handleViewCancel = () => {
        setIsViewModalVisible(false);
        setViewingDriver(null);
    }

    const handleDelete = (driverId: string, photoPath?: string, idProofPath?: string) => {
        dispatch(deleteDriverRequest({ driverId, photoPath, idProofPath }));
    };

    const handleStatusChange = (checked: boolean, driver: Driver) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateDriverRequest({ ...driver, status: newStatus }));
    };

    const onFinish = (values: Omit<AddDriverPayload, 'organization_key' | 'profile_photo_file' | 'id_proof_file'>) => {
        if (!user?.organization_key) {
            message.error("Organization key not found. Cannot proceed.");
            return;
        }

        const payload: Partial<AddDriverPayload> & { id?: string } = {
            ...values,
            dob: values.dob ? dayjs(values.dob).format('YYYY-MM-DD') : undefined,
            license_expiry_date: values.license_expiry_date ? dayjs(values.license_expiry_date).format('YYYY-MM-DD') : undefined,
            organization_key: user.organization_key,
            profile_photo_file: profilePhotoList[0]?.originFileObj,
            id_proof_file: idProofList[0]?.originFileObj,
        };
        
        if (editingDriver) {
            payload.id = editingDriver.id;
            (payload as any).profile_photo_path = editingDriver.profile_photo_path;
            (payload as any).id_proof_path = editingDriver.id_proof_path;
            dispatch(updateDriverRequest(payload as Driver));
        } else {
            dispatch(addDriverRequest(payload as AddDriverPayload));
        }
        
        handleFormCancel();
    };
    
    const createUploadProps = (fileList: UploadFile[], setFileList: React.Dispatch<React.SetStateAction<UploadFile[]>>): UploadProps => ({
        fileList,
        listType: 'picture-card',
        onRemove: () => {
            setFileList([]);
            return true;
        },
        beforeUpload: async (file) => {
            const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
            const isPdf = file.type === 'application/pdf';
            if (!isJpgOrPng && !isPdf) {
                message.error('You can only upload JPG, PNG, or PDF files!');
                return Upload.LIST_IGNORE;
            }
            const isLt2M = file.size / 1024 / 1024 < 2;
            if (!isLt2M) {
                message.error('File must be smaller than 2MB!');
                return Upload.LIST_IGNORE;
            }
            const preview = await getBase64(file as RcFile);
            setFileList([{
                ...file,
                uid: file.uid,
                name: file.name,
                status: 'done',
                url: preview,
                originFileObj: file,
            }]);
            return false;
        },
        maxCount: 1,
        showUploadList: {
            showPreviewIcon: true,
            showRemoveIcon: true,
            showDownloadIcon: false,
        },
    });

    const filteredDrivers = drivers.filter(driver =>
        driver.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.phone_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const columns = [
        { title: 'S.No', key: 'sno', render: (_: any, __: any, index: number) => index + 1 },
        { title: 'Profile', dataIndex: 'profile_photo_url', key: 'profile_photo_url', render: (url: string) => <Avatar src={url} icon={<UserOutlined />} /> },
        { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Contact', dataIndex: 'phone_number', key: 'phone_number' },
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'License Number', dataIndex: 'license_number', key: 'license_number' },
        { title: 'ID Proof', dataIndex: 'id_proof_url', key: 'id_proof_url', render: (url: string) => url ? <a href={url} target="_blank" rel="noopener noreferrer"><LinkOutlined /> View Document</a> : 'Not Uploaded' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string, record: Driver) => <Switch checked={status === 'Active'} onChange={(checked) => handleStatusChange(checked, record)} loading={loading} /> },
        {
            title: 'Action', key: 'action',
            render: (_: any, record: Driver) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => showViewModal(record)} />
                    <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
                    <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id, record.profile_photo_path, record.id_proof_path)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <>
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Title level={4} style={{ margin: 0 }}>Driver Management</Title>
                    </Col>
                    <Col xs={24} md={12}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                             <Input.Search
                                placeholder="Search by Name or Phone"
                                onSearch={setSearchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%' }}
                                allowClear
                            />
                            <Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} block>
                                Add New Driver
                            </Button>
                        </Space>
                    </Col>
                </Row>

                <Spin spinning={loading}>
                    <div style={{ overflowX: 'auto' }}>
                        <Table columns={columns} dataSource={filteredDrivers} rowKey="id" bordered scroll={{ x: 'max-content' }} />
                    </div>
                </Spin>

                <Modal
                    title={editingDriver ? "Edit Driver" : "Add New Driver"}
                    open={isFormModalVisible}
                    onCancel={handleFormCancel}
                    footer={null}
                    width={1000}
                    destroyOnClose
                >
                    <Spin spinning={loading} tip="Saving driver...">
                        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                            <Row gutter={24}>
                                <Col xs={24} md={8}>
                                    <Form.Item name="full_name" label="Full Name" rules={[{ required: true }]}>
                                        <Input prefix={<UserOutlined />} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} md={8}><Form.Item name="dob" label="Date of Birth"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="gender" label="Gender"><Select><Option value="Male">Male</Option><Option value="Female">Female</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="phone_number" label="Phone Number" rules={[{ required: true }, { len: 10, message: "Phone number must be 10 digits" }]}><Input prefix={<PhoneOutlined />} maxLength={10} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="email" label="Email Address" rules={[{ type: 'email' }]}><Input prefix={<MailOutlined />} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="address" label="Address"><TextArea rows={1} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="license_number" label="License Number" rules={[{ required: true }]}><Input prefix={<IdcardOutlined />} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="license_expiry_date" label="License Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="driving_experience" label="Driving Experience (Years)"><Input type="number" prefix={<SafetyCertificateOutlined />} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="vehicle_type" label="Vehicle Type"><Select mode="multiple" allowClear placeholder="e.g., Bus, Van"><Option value="Bus">Bus</Option><Option value="Van">Van</Option><Option value="Car">Car</Option><Option value="Truck">Truck</Option><Option value="Other">Other</Option></Select></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="emergency_contact_name" label="Emergency Contact Name"><Input prefix={<UserOutlined />} /></Form.Item></Col>
                                <Col xs={24} md={8}><Form.Item name="emergency_contact_phone" label="Emergency Contact Phone" rules={[{ len: 10, message: "Phone number must be 10 digits" }]}><Input prefix={<PhoneOutlined />} maxLength={10} /></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item label="Profile Photo"><Upload {...createUploadProps(profilePhotoList, setProfilePhotoList)}>{profilePhotoList.length === 0 && (<div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload Photo</div></div>)}</Upload></Form.Item></Col>
                                <Col xs={24} md={12}><Form.Item label="ID Proof Document (PDF, JPG, PNG)"><Upload {...createUploadProps(idProofList, setIdProofList)}>{idProofList.length === 0 && (<div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload ID</div></div>)}</Upload></Form.Item></Col>
                            </Row>
                            <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                                <Button onClick={handleFormCancel} style={{ marginRight: 8 }}>Cancel</Button>
                                <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={loading}>{editingDriver ? 'Update Driver' : 'Create Driver'}</Button>
                            </Form.Item>
                        </Form>
                    </Spin>
                </Modal>
                
                {viewingDriver && (
                    <Modal title="Driver Details" open={isViewModalVisible} onCancel={handleViewCancel} footer={null} width={800}>
                        <Descriptions bordered column={2} style={{ marginTop: 24 }}>
                            <Descriptions.Item label="Profile Photo" span={2}>
                                <Avatar size={64} src={viewingDriver.profile_photo_url} icon={<UserOutlined />} />
                            </Descriptions.Item>
                            <Descriptions.Item label="Full Name">{viewingDriver.full_name}</Descriptions.Item>
                            <Descriptions.Item label="Phone">{viewingDriver.phone_number}</Descriptions.Item>
                            <Descriptions.Item label="Email">{viewingDriver.email || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Gender">{viewingDriver.gender || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="D.O.B">{viewingDriver.dob ? dayjs(viewingDriver.dob).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Address" span={2}>{viewingDriver.address || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="License Number">{viewingDriver.license_number}</Descriptions.Item>
                            <Descriptions.Item label="License Expiry">{viewingDriver.license_expiry_date ? dayjs(viewingDriver.license_expiry_date).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Experience">{viewingDriver.driving_experience ? `${viewingDriver.driving_experience} years` : 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Vehicle Types">{viewingDriver.vehicle_type?.join(', ') || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Emergency Contact">{viewingDriver.emergency_contact_name || 'N/A'} ({viewingDriver.emergency_contact_phone || 'N/A'})</Descriptions.Item>
                            <Descriptions.Item label="ID Proof">
                                {viewingDriver.id_proof_url ? (
                                    <a href={viewingDriver.id_proof_url} target="_blank" rel="noopener noreferrer">View Document</a>
                                ) : 'N/A'}
                            </Descriptions.Item>
                        </Descriptions>
                    </Modal>
                )}

            </Card>
        </>
    );
};

export default CreateDriver;
