import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Form, Select, InputNumber, Button, Row, Col, Table, Space, Popconfirm, Tag, Switch, message, Spin, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchBusesRequest } from '../../store/features/buses/busSlice';
import { saveBusFeeRequest, fetchBusFeesRequest, deleteBusFeeRequest, updateBusFeeStatusRequest } from '../../store/features/bus-fees/busFeesSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const BusFeesSetup: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { buses, loading: busesLoading } = useSelector((state: RootState) => state.buses);
    const { busFees, loading: feesLoading } = useSelector((state: RootState) => state.busFees);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchBusesRequest(user.organization_key));
            dispatch(fetchBusFeesRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars.length > 0 && !selectedYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedYear(currentYear);
                form.setFieldsValue({ academic_year: currentYear });
            }
        }
    }, [calendars, selectedYear, form]);

    const activeBuses = buses.filter(b => b.status === 'Active');

    const filteredBusFees = useMemo(() => {
        if (!selectedYear) return busFees;
        return busFees.filter(fee => fee.academic_year === selectedYear);
    }, [busFees, selectedYear]);

    const onFinish = (values: any) => {
        if (!user?.organization_key) {
            message.error("Organization context missing.");
            return;
        }

        const selectedBus = buses.find(b => b.id === values.bus_id);
        if (!selectedBus) return;

        const payload = {
            organization_key: user.organization_key,
            academic_year: values.academic_year,
            bus_id: values.bus_id,
            bus_number: selectedBus.bus_number,
            fees: values.fees,
            status: 'Active' as const,
        };

        dispatch(saveBusFeeRequest(payload));
        form.setFieldsValue({ bus_id: undefined, fees: undefined });
    };

    const handleDelete = (id: string) => {
        dispatch(deleteBusFeeRequest(id));
    };

    const handleStatusChange = (checked: boolean, id: string) => {
        const status = checked ? 'Active' : 'Inactive';
        dispatch(updateBusFeeStatusRequest({ id, status }));
        if(user?.organization_key) dispatch(fetchBusFeesRequest(user.organization_key));
    };

    const columns = [
        { title: 'Bus Number', dataIndex: 'bus_number', key: 'bus_number' },
        { title: 'Fees (₹)', dataIndex: 'fees', key: 'fees', render: (val: number) => `₹ ${val.toLocaleString()}` },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string, record: any) => (
                <Switch 
                    checked={status === 'Active'} 
                    onChange={(checked) => handleStatusChange(checked, record.id)}
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                />
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_: any, record: any) => (
                <Popconfirm title="Delete this fee setup?" onConfirm={() => handleDelete(record.id)}>
                    <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            ),
        },
    ];

    const isLoading = calendarsLoading || busesLoading || feesLoading;

    return (
        <Card>
            <Title level={4}>Bus Fees Setup</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Define fees for each bus route per academic year.
            </Text>

            <Spin spinning={isLoading}>
                <Form form={form} layout="vertical" onFinish={onFinish}>
                    <Row gutter={16}>
                        <Col xs={24} md={8}>
                            <Form.Item name="academic_year" label="Academic Year" rules={[{ required: true }]}>
                                <Select 
                                    placeholder="Select Year" 
                                    onChange={setSelectedYear}
                                    loading={calendarsLoading}
                                >
                                    {calendars.filter(c => c.status === 'Active').map(cal => (
                                        <Option key={cal.id} value={cal.academic_year}>
                                            {cal.academic_year}{cal.is_current && " (Current)"}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={8}>
                            <Form.Item name="bus_id" label="Select Bus" rules={[{ required: true }]}>
                                <Select 
                                    showSearch 
                                    placeholder="Select Bus" 
                                    loading={busesLoading}
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {activeBuses.map(bus => (
                                        <Option key={bus.id} value={bus.id}>{bus.bus_number} ({bus.vehicle_number})</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={4}>
                            <Form.Item name="fees" label="Bus Fees (₹)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="e.g., 1500" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={4} style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <Form.Item style={{ width: '100%' }}>
                                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} block>
                                    Save Setup
                                </Button>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>

                <Divider />

                <Title level={5}>Fee Structure for {selectedYear || 'Selected Year'}</Title>
                <div style={{ overflowX: 'auto' }}>
                    <Table 
                        columns={columns} 
                        dataSource={filteredBusFees} 
                        rowKey="id" 
                        bordered
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: "No fee setup found for this year." }}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            </Spin>
        </Card>
    );
};

export default BusFeesSetup;
