
import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Select, Spin, Alert, Table, Row, Col, DatePicker, Button, Space, message, Modal, Form, InputNumber, Descriptions } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchUniqueStaffRequest, fetchPfHistoryForStaffRequest } from '../../store/features/pf-salary-history/pfSalaryHistorySlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const PfSalaryHistory: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { uniqueStaff, history, loading, error } = useSelector((state: RootState) => state.pfSalaryHistory);
    const [selectedStaffCode, setSelectedStaffCode] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchUniqueStaffRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);
    
    useEffect(() => {
        if (selectedStaffCode && user?.organization_key) {
            dispatch(fetchPfHistoryForStaffRequest({
                organizationKey: user.organization_key,
                staffCode: selectedStaffCode,
            }));
        }
    }, [dispatch, selectedStaffCode, user?.organization_key]);

    const handleStaffChange = (value: string | null) => {
        setSelectedStaffCode(value);
        setDateRange(null); // Reset date range when staff changes
    };

    const filteredHistory = useMemo(() => {
        if (!dateRange) {
            return history;
        }
        const [start, end] = dateRange;
        return history.filter(item => {
            const paymentDate = dayjs(item.payment_date);
            return paymentDate.isAfter(start.startOf('day')) && paymentDate.isBefore(end.endOf('day'));
        });
    }, [history, dateRange]);

    const totalPfAmount = useMemo(() => {
        return filteredHistory.reduce((sum, item) => sum + item.pf_salary, 0);
    }, [filteredHistory]);
    
    const selectedStaff = useMemo(() => {
        return uniqueStaff.find(staff => staff.staff_code === selectedStaffCode);
    }, [uniqueStaff, selectedStaffCode]);

    const showConfirmModal = () => {
        form.setFieldsValue({
            total_pf: totalPfAmount,
            sent_pf: null,
            balance_pf: totalPfAmount,
        });
        setIsModalVisible(true);
    };
    
    const handleModalCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
    };

    const handleModalOk = () => {
        // Handle the logic for confirming the PF payment here.
        // For now, it just closes the modal.
        handleModalCancel();
    };

    const handleSentPfChange = (value: number | null) => {
        const sentAmount = value || 0;
        const newBalance = totalPfAmount - sentAmount;
        form.setFieldsValue({ balance_pf: newBalance });
    };

    const columns = [
        {
            title: 'S.No',
            key: 'sno',
            render: (_: any, __: any, index: number) => index + 1,
            width: 80,
        },
        {
            title: 'Payment Date',
            dataIndex: 'payment_date',
            key: 'payment_date',
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'PF Salary (₹)',
            dataIndex: 'pf_salary',
            key: 'pf_salary',
            align: 'right' as const,
            render: (pf: number) => pf ? pf.toLocaleString() : '0',
        },
    ];

    return (
        <>
        <style>{`
            .ant-table-thead > tr > th {
                background-color: #f0f5ff !important;
            }
            .ant-table-tbody > tr:nth-child(even) {
                background-color: #fafafa;
            }
        `}</style>
        <Card>
            <Title level={4}>PF Salary History</Title>
            <Spin spinning={loading}>
                 {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }} justify="space-between" align="middle">
                    <Col xs={24} md={12}>
                        <Select
                            showSearch
                            placeholder="Select a staff member"
                            style={{ width: '100%' }}
                            onChange={handleStaffChange}
                            allowClear
                            filterOption={(input, option) =>
                              (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                            value={selectedStaffCode}
                        >
                            {uniqueStaff.map(staff => (
                                <Option key={staff.staff_code} value={staff.staff_code}>
                                    {`${staff.staff_name} (${staff.staff_code})`}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} md={12}>
                        <RangePicker 
                            style={{ width: '100%' }}
                            value={dateRange}
                            onChange={(dates) => setDateRange(dates as any)}
                            disabled={!selectedStaffCode}
                        />
                    </Col>
                </Row>


                {selectedStaffCode && (
                    <Table
                        columns={columns}
                        dataSource={filteredHistory}
                        rowKey="id"
                        bordered
                        loading={loading}
                        locale={{ emptyText: 'No PF salary history found for this staff member in the selected range.' }}
                        footer={() => (
                            <Row justify="end" align="middle">
                                <Col>
                                    <Space size="large">
                                        <Text strong>Total PF Amount: ₹{totalPfAmount.toLocaleString()}</Text>
                                        <Button type="primary" onClick={showConfirmModal}>Confirm</Button>
                                    </Space>
                                </Col>
                            </Row>
                        )}
                    />
                )}
            </Spin>
        </Card>
        
        <Modal
            title="Confirm PF Salary Payment"
            open={isModalVisible}
            onCancel={handleModalCancel}
            footer={[
                <Button key="back" onClick={handleModalCancel}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleModalOk}>
                    Submit Payment
                </Button>,
            ]}
        >
            {selectedStaff && (
                <Form form={form} layout="vertical" style={{marginTop: 24}}>
                    <Descriptions bordered size="small" style={{ marginBottom: 24 }}>
                        <Descriptions.Item label="Staff Name">{selectedStaff.staff_name}</Descriptions.Item>
                        <Descriptions.Item label="Staff Code">{selectedStaff.staff_code}</Descriptions.Item>
                    </Descriptions>
                     <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="total_pf" label="Total PF Amount (₹)">
                                <InputNumber
                                    style={{ width: '100%' }}
                                    formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={(value) => Number(value!.replace(/₹\s?|(,*)/g, '')) as any}
                                    disabled
                                />
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="sent_pf" label="Sent PF Salary (₹)" rules={[{ required: true, message: 'Please enter amount!' }]}>
                                <InputNumber
                                    style={{ width: '100%' }}
                                    formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={(value) => Number(value!.replace(/₹\s?|(,*)/g, '')) as any}
                                    onChange={handleSentPfChange}
                                    min={0}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="balance_pf" label="Balance PF Salary (₹)">
                                <InputNumber
                                    style={{ width: '100%', color: form.getFieldValue('balance_pf') < 0 ? 'red' : 'inherit' }}
                                    formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={(value) => Number(value!.replace(/₹\s?|(,*)/g, '')) as any}
                                    disabled
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            )}
        </Modal>
        </>
    );
};

export default PfSalaryHistory;
