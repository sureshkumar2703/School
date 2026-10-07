

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Button, Space, Breadcrumb, Modal, Form, InputNumber, Descriptions, Row, Col, message, Input } from 'antd';
import { DollarOutlined, HomeOutlined, UserOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeachersRequest, type Teacher } from '../../store/features/teachers/teachersSlice';
import { saveSalaryDetailRequest, fetchSalaryHistoryRequest, fetchMonthSalaryDetailsRequest } from '../../store/features/staff-salary/staffSalarySlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;

const StaffSalaryDetails: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { teachers, loading: teachersLoading, error } = useSelector((state: RootState) => state.teachers);
    const { history: salaryHistory, monthlyPayments, loading: salaryLoading } = useSelector((state: RootState) => state.staffSalary);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const today = dayjs().format('DD/MM/YYYY');
    
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [isPayAmountEntered, setIsPayAmountEntered] = useState(false);
    const [remainingSalary, setRemainingSalary] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [form] = Form.useForm();


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeachersRequest(user.organization_key));
            dispatch(fetchMonthSalaryDetailsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (selectedTeacher) {
            const totalPaid = salaryHistory.reduce((acc, record) => acc + record.payment, 0);
            const fullSalary = selectedTeacher.total_salary ? parseFloat(String(selectedTeacher.total_salary)) : 0;
            const remaining = fullSalary - totalPaid;

            setRemainingSalary(remaining);
            form.setFieldsValue({
                salary: remaining,
                pay: null,
                balance: remaining,
            });
        }
    }, [salaryHistory, selectedTeacher, form]);

    const activeTeachers = useMemo(() => {
        const baseActive = teachers.filter(teacher => teacher.status === 'Active');
        if (!searchTerm) {
            return baseActive;
        }
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        return baseActive.filter(teacher =>
            teacher.full_name?.toLowerCase().includes(lowercasedSearchTerm) ||
            teacher.staff_code?.toLowerCase().includes(lowercasedSearchTerm) ||
            teacher.mobile_number?.includes(lowercasedSearchTerm)
        );
    }, [teachers, searchTerm]);
    
    const monthlyPaidAmounts = useMemo(() => {
        const paidMap = new Map<string, number>();
        monthlyPayments.forEach(payment => {
            const currentPaid = paidMap.get(payment.staff_code) || 0;
            paidMap.set(payment.staff_code, currentPaid + payment.payment);
        });
        return paidMap;
    }, [monthlyPayments]);

    const handlePay = (record: Teacher) => {
        if (user?.organization_key && record.staff_code) {
            dispatch(fetchSalaryHistoryRequest({ organizationKey: user.organization_key, staffCode: record.staff_code }));
        }
        setSelectedTeacher(record);
        setIsPayAmountEntered(false);
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setSelectedTeacher(null);
        form.resetFields();
    };

    const handlePayAmountChange = (value: number | null) => {
        const payAmount = value || 0;
        const newBalance = remainingSalary - payAmount;
        form.setFieldsValue({ balance: newBalance });
        setIsPayAmountEntered(payAmount > 0);
    };
    
    const handleModalOk = () => {
        if (!user?.organization_key || !selectedTeacher) {
            message.error("Cannot process payment without organization or teacher details.");
            return;
        }

        form.validateFields().then(values => {
            const { pay, balance } = values;

            // Check if any payment exists for this staff member in the current month.
            const isFirstPaymentOfMonth = salaryHistory.length === 0;

            const payload = {
                organization_key: user.organization_key!,
                staff_name: selectedTeacher.full_name || '',
                staff_code: selectedTeacher.staff_code || '',
                phone: selectedTeacher.mobile_number || '',
                total_salary: selectedTeacher.total_salary ? parseFloat(String(selectedTeacher.total_salary)) : 0,
                pf_salary: isFirstPaymentOfMonth 
                    ? (selectedTeacher.pf_salary ? parseFloat(String(selectedTeacher.pf_salary)) : 0) 
                    : 0,
                payment: pay,
                balance: balance,
                payment_date: dayjs().format('YYYY-MM-DD'),
                status: balance === 0 ? 'Complete' : 'Pending' as 'Complete' | 'Pending',
                created_by_name: user.name,
                created_by_phone: user.phone,
            };

            dispatch(saveSalaryDetailRequest(payload as any));
            handleModalCancel();
        }).catch(info => {
            console.log('Validate Failed:', info);
        });
    };

    const columns = [
        {
            title: 'S.No',
            key: 'sno',
            render: (_: any, __: any, index: number) => index + 1,
            width: 70,
        },
        {
            title: 'Staff Code',
            dataIndex: 'staff_code',
            key: 'staff_code',
            width: 120,
        },
        {
            title: 'Staff Name',
            dataIndex: 'full_name',
            key: 'full_name',
        },
        {
            title: 'Phone',
            dataIndex: 'mobile_number',
            key: 'mobile_number',
        },
        {
            title: 'Salary',
            dataIndex: 'total_salary',
            key: 'total_salary',
            render: (salary: string) => salary ? `₹${parseFloat(salary).toLocaleString()}` : 'N/A',
        },
        {
            title: 'Action',
            key: 'action',
            width: 120,
            render: (_: any, record: Teacher) => {
                const totalPaid = monthlyPaidAmounts.get(record.staff_code || '') || 0;
                const fullSalary = record.total_salary ? parseFloat(String(record.total_salary)) : 0;
                const isPaid = totalPaid >= fullSalary;
                return (
                    <Button 
                        type="primary"
                        icon={<DollarOutlined />} 
                        onClick={() => handlePay(record)}
                        disabled={isPaid}
                    >
                        {isPaid ? 'Paid' : 'Pay'}
                    </Button>
                )
            },
        },
    ];

    const watermarkStyle: React.CSSProperties = {
        position: 'relative',
        ...schoolDetails?.logo_url && { '--watermark-url': `url('${schoolDetails.logo_url}')` }
    };

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
            <div>
                <Breadcrumb style={{ marginBottom: 16 }}>
                    <Breadcrumb.Item href="">
                        <HomeOutlined />
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        <UserOutlined />
                        <span>Admin</span>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>Staff Salary Details</Breadcrumb.Item>
                </Breadcrumb>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <Title level={4} style={{ margin: 0 }}>Staff Salary Details</Title>
                        <Text strong>{today}</Text>
                    </div>
                    <Row justify="end" style={{ marginBottom: 24 }}>
                        <Col xs={24} sm={12} md={8}>
                            <Search
                                placeholder="Search by Name, Code, or Phone"
                                onSearch={setSearchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%' }}
                                allowClear
                            />
                        </Col>
                    </Row>
                    {error && <Alert message="Error fetching data" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                    <Spin spinning={teachersLoading || salaryLoading}>
                        <div 
                            className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                            style={watermarkStyle}
                        >
                            <Table
                                columns={columns}
                                dataSource={activeTeachers}
                                rowKey="id"
                                bordered
                                scroll={{ x: 'max-content' }}
                            />
                        </div>
                    </Spin>
                </Card>

                <Modal
                    title={`Salary Payment for ${selectedTeacher?.full_name}`}
                    open={isModalVisible}
                    onOk={handleModalOk}
                    onCancel={handleModalCancel}
                    okText="Confirm Payment"
                    cancelText="Cancel"
                    okButtonProps={{ disabled: !isPayAmountEntered, loading: salaryLoading }}
                    confirmLoading={salaryLoading}
                >
                    <Spin spinning={salaryLoading && isModalVisible} tip="Fetching payment history...">
                        {selectedTeacher && (
                            <Form form={form} layout="vertical">
                                <Descriptions bordered column={1} size="small" style={{marginBottom: 24}}>
                                    <Descriptions.Item label="Staff Name">{selectedTeacher.full_name}</Descriptions.Item>
                                    <Descriptions.Item label="Staff Code">{selectedTeacher.staff_code}</Descriptions.Item>
                                    <Descriptions.Item label="Phone">{selectedTeacher.mobile_number}</Descriptions.Item>
                                </Descriptions>
                                <Row gutter={16}>
                                    <Col span={12}>
                                        <Form.Item name="salary" label="Remaining Salary (₹)">
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                                                disabled
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={12}>
                                        <Form.Item name="pay" label="Enter Pay (₹)" rules={[{ required: true, message: 'Please enter pay amount!' }]}>
                                            <InputNumber
                                                style={{ width: '100%' }}
                                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                                                onChange={handlePayAmountChange}
                                                min={0}
                                            />
                                        </Form.Item>
                                    </Col>
                                    <Col span={24}>
                                        <Form.Item name="balance" label="Balance (₹)">
                                            <InputNumber
                                                style={{ width: '100%', color: form.getFieldValue('balance') < 0 ? 'red' : 'green' }}
                                                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                                parser={(value) => Number(value!.replace(/\$\s?|(,*)/g, '')) as any}
                                                disabled
                                            />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Form>
                        )}
                    </Spin>
                </Modal>
            </div>
        </>
    );
};

export default StaffSalaryDetails;
