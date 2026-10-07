
import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, Row, Col, Select, DatePicker, message, Spin, Modal, Table, Space, Popconfirm, Switch, Descriptions, Grid } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { addBusRequest, fetchBusesRequest, updateBusRequest, deleteBusRequest, type Bus } from '../../store/features/buses/busSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const CreateBus: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { buses, loading } = useSelector((state: RootState) => state.buses);
    const screens = useBreakpoint();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [editingBus, setEditingBus] = useState<Bus | null>(null);
    const [viewingBus, setViewingBus] = useState<Bus | null>(null);


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchBusesRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
     useEffect(() => {
        if (editingBus) {
            form.setFieldsValue({
                ...editingBus,
                year_of_manufacture: editingBus.year_of_manufacture ? dayjs(editingBus.year_of_manufacture.toString()) : null,
                insurance_expiry_date: editingBus.insurance_expiry_date ? dayjs(editingBus.insurance_expiry_date) : null,
                permit_expiry_date: editingBus.permit_expiry_date ? dayjs(editingBus.permit_expiry_date) : null,
                fitness_certificate_expiry_date: editingBus.fitness_certificate_expiry_date ? dayjs(editingBus.fitness_certificate_expiry_date) : null,
            });
        } else {
            form.resetFields();
            form.setFieldsValue({ status: 'Active' });
        }
    }, [editingBus, form]);

    const showAddModal = () => {
        setEditingBus(null);
        setIsModalVisible(true);
    };
    
    const showEditModal = (bus: Bus) => {
        setEditingBus(bus);
        setIsModalVisible(true);
    };

    const showViewModal = (bus: Bus) => {
        setViewingBus(bus);
        setIsViewModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingBus(null);
        form.resetFields();
    };

    const handleViewCancel = () => {
        setIsViewModalVisible(false);
        setViewingBus(null);
    };


    const handleDelete = (busId: string) => {
        dispatch(deleteBusRequest(busId));
    };

    const handleStatusChange = (checked: boolean, record: Bus) => {
        const newStatus = checked ? 'Active' : record.status === 'Under Maintenance' ? 'Under Maintenance' : 'Inactive';
        dispatch(updateBusRequest({ ...record, status: newStatus }));
    };

    const onFinish = (values: any) => {
        if (!user?.organization_key) {
            message.error("Organization key not found.");
            return;
        }

        const payload = {
            ...values,
            organization_key: user.organization_key,
            year_of_manufacture: values.year_of_manufacture ? dayjs(values.year_of_manufacture).year() : undefined,
            insurance_expiry_date: values.insurance_expiry_date ? dayjs(values.insurance_expiry_date).format('YYYY-MM-DD') : undefined,
            permit_expiry_date: values.permit_expiry_date ? dayjs(values.permit_expiry_date).format('YYYY-MM-DD') : undefined,
            fitness_certificate_expiry_date: values.fitness_certificate_expiry_date ? dayjs(values.fitness_certificate_expiry_date).format('YYYY-MM-DD') : undefined,
        };
        
        if (editingBus) {
            dispatch(updateBusRequest({ ...payload, id: editingBus.id }));
        } else {
            dispatch(addBusRequest(payload));
        }
        
        handleCancel();
    };

    const columns = [
        { title: 'Vehicle No', dataIndex: 'vehicle_number', key: 'vehicle_number' },
        { title: 'Bus No', dataIndex: 'bus_number', key: 'bus_number' },
        { title: 'Model', dataIndex: 'bus_model', key: 'bus_model' },
        { title: 'Capacity', dataIndex: 'seating_capacity', key: 'seating_capacity' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string, record: Bus) => <Switch checked={status === 'Active'} onChange={(checked) => handleStatusChange(checked, record)} /> },
        {
            title: 'Action', key: 'action',
            render: (_: any, record: Bus) => (
                <Space>
                    <Button icon={<EyeOutlined />} onClick={() => showViewModal(record)} />
                    <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} />
                    <Popconfirm title="Sure to delete this bus?" onConfirm={() => handleDelete(record.id)}>
                        <Button icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                </Space>
            )
        },
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col><Title level={4}>Bus Management</Title></Col>
                <Col><Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>Add New Bus</Button></Col>
            </Row>

            <Spin spinning={loading}>
                <Table columns={columns} dataSource={buses} rowKey="id" bordered scroll={{ x: 'max-content' }} />
            </Spin>

            <Modal title={editingBus ? "Edit Bus Details" : "Add New Bus"} open={isModalVisible} onCancel={handleCancel} footer={null} width={800} destroyOnClose>
                <Spin spinning={loading}>
                    <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                        <Row gutter={16}>
                            <Col span={8}><Form.Item name="vehicle_number" label="Vehicle Number" rules={[{ required: true }]} normalize={(value) => value.toUpperCase()}><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="bus_number" label="Bus Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="registration_number" label="Registration Number"><Input /></Form.Item></Col>
                             <Col span={8}>
                                <Form.Item name="route_address" label="Route Address">
                                    <Input />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item name="bus_model" label="Bus Model / Make">
                                    <Select placeholder="Select a make">
                                        <Option value="Tata Motors">Tata Motors</Option>
                                        <Option value="Ashok Leyland">Ashok Leyland</Option>
                                        <Option value="Eicher">Eicher</Option>
                                        <Option value="BharatBenz">BharatBenz</Option>
                                        <Option value="Mahindra">Mahindra</Option>
                                        <Option value="Volvo">Volvo</Option>
                                        <Option value="Other">Other</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={8}><Form.Item name="seating_capacity" label="Seating Capacity"><Input type="number" /></Form.Item></Col>
                            <Col span={8}><Form.Item name="year_of_manufacture" label="Year of Manufacture"><DatePicker picker="year" style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="fuel_type" label="Fuel Type"><Select><Option value="Diesel">Diesel</Option><Option value="Petrol">Petrol</Option><Option value="CNG">CNG</Option><Option value="Electric">Electric</Option></Select></Form.Item></Col>
                            <Col span={8}><Form.Item name="chassis_number" label="Chassis Number"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="engine_number" label="Engine Number"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="color" label="Color"><Input /></Form.Item></Col>
                            <Col span={8}><Form.Item name="insurance_expiry_date" label="Insurance Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="permit_expiry_date" label="Permit Expiry Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="fitness_certificate_expiry_date" label="Fitness Certificate Expiry"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                            <Col span={8}><Form.Item name="status" label="Status"><Select><Option value="Active">Active</Option><Option value="Inactive">Inactive</Option><Option value="Under Maintenance">Under Maintenance</Option></Select></Form.Item></Col>
                        </Row>
                        <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                            <Button onClick={handleCancel} style={{ marginRight: 8 }}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={loading}>{editingBus ? 'Update Bus' : 'Create Bus'}</Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
            
            {viewingBus && (
                <Modal title="Bus Details" open={isViewModalVisible} onCancel={handleViewCancel} footer={null} width={800}>
                    <Descriptions bordered column={screens.md ? 2 : 1} style={{ marginTop: 24 }}>
                        <Descriptions.Item label="Vehicle Number" span={1}>{viewingBus.vehicle_number}</Descriptions.Item>
                        <Descriptions.Item label="Bus Number" span={1}>{viewingBus.bus_number}</Descriptions.Item>
                        <Descriptions.Item label="Registration Number" span={1}>{viewingBus.registration_number || 'N/A'}</Descriptions.Item>
                         <Descriptions.Item label="Route Address" span={1}>{viewingBus.route_address || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Bus Model / Make" span={1}>{viewingBus.bus_model || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Seating Capacity" span={1}>{viewingBus.seating_capacity || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Year of Manufacture" span={1}>{viewingBus.year_of_manufacture || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Fuel Type" span={1}>{viewingBus.fuel_type || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Chassis Number" span={1}>{viewingBus.chassis_number || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Engine Number" span={1}>{viewingBus.engine_number || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Color" span={1}>{viewingBus.color || 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Insurance Expiry" span={1}>{viewingBus.insurance_expiry_date ? dayjs(viewingBus.insurance_expiry_date).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Permit Expiry" span={1}>{viewingBus.permit_expiry_date ? dayjs(viewingBus.permit_expiry_date).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Fitness Certificate Expiry" span={1}>{viewingBus.fitness_certificate_expiry_date ? dayjs(viewingBus.fitness_certificate_expiry_date).format('DD/MM/YYYY') : 'N/A'}</Descriptions.Item>
                        <Descriptions.Item label="Status" span={1}>{viewingBus.status}</Descriptions.Item>
                    </Descriptions>
                </Modal>
            )}

        </Card>
    );
};

export default CreateBus;
