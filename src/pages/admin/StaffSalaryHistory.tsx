
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, DatePicker, Breadcrumb, Tag } from 'antd';
import { HomeOutlined, UserOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllSalaryHistoryRequest, type StaffSalaryDetail } from '../../store/features/staff-salary-history/staffSalaryHistorySlice';
import { fetchTeachersRequest, type Teacher } from '../../store/features/teachers/teachersSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const StaffSalaryHistory: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { history, loading: historyLoading, error: historyError } = useSelector((state: RootState) => state.staffSalaryHistory);
    const { teachers, loading: teachersLoading } = useSelector((state: RootState) => state.teachers);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [selectedStaffCode, setSelectedStaffCode] = useState<string | null>(null);


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAllSalaryHistoryRequest(user.organization_key));
            dispatch(fetchTeachersRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const filteredHistory = useMemo(() => {
        let data = history;

        if (dateRange) {
            const [start, end] = dateRange;
            data = data.filter(item => {
                const paymentDate = dayjs(item.payment_date);
                return paymentDate.isAfter(start.startOf('day')) && paymentDate.isBefore(end.endOf('day'));
            });
        }
        
        if (selectedStaffCode) {
            data = data.filter(item => item.staff_code === selectedStaffCode);
        }

        return data;
    }, [history, dateRange, selectedStaffCode]);

    const columns = [
        { title: 'S.No', key: 'sno', render: (_: any, __: any, index: number) => index + 1 },
        { title: 'Staff Code', dataIndex: 'staff_code', key: 'staff_code' },
        { title: 'Staff Name', dataIndex: 'staff_name', key: 'staff_name' },
        { title: 'Payment Date', dataIndex: 'payment_date', key: 'payment_date', render: (date: string) => dayjs(date).format('DD/MM/YYYY') },
        { title: 'Total Salary (₹)', dataIndex: 'total_salary', key: 'total_salary', render: (val: number) => val.toLocaleString() },
        { title: 'Paid Amount (₹)', dataIndex: 'payment', key: 'payment', render: (val: number) => val.toLocaleString() },
        { title: 'Balance (₹)', dataIndex: 'balance', key: 'balance', render: (val: number) => val.toLocaleString() },
        { 
            title: 'Status', 
            dataIndex: 'status', 
            key: 'status',
            render: (status: string) => {
                const color = status === 'Complete' ? 'green' : status === 'Pending' ? 'gold' : 'default';
                return <Tag color={color}>{status}</Tag>;
            }
        },
        { title: 'Paid By', dataIndex: 'created_by_name', key: 'created_by_name' },
    ];
    
    const loading = historyLoading || teachersLoading;
    const error = historyError;

    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
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
            <div>
                 <Breadcrumb style={{ marginBottom: 16 }}>
                    <Breadcrumb.Item href="">
                        <HomeOutlined />
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        <UserOutlined />
                        <span>Admin</span>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>Staff Salary History</Breadcrumb.Item>
                </Breadcrumb>
                <Card>
                    <Title level={4}>Staff Salary Payment History</Title>
                     <Row gutter={[16, 16]} style={{ marginBottom: 24 }} justify="space-between">
                        <Col xs={24} md={12}>
                             <Select
                                showSearch
                                allowClear
                                placeholder="Filter by Staff Member"
                                style={{ width: '100%' }}
                                value={selectedStaffCode}
                                onChange={setSelectedStaffCode}
                                loading={teachersLoading}
                                filterOption={(input, option) =>
                                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {teachers.map(teacher => (
                                    <Option key={teacher.staff_code} value={teacher.staff_code!}>
                                        {`${teacher.full_name} (${teacher.staff_code})`}
                                    </Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} md={12}>
                            <RangePicker 
                                onChange={(dates) => setDateRange(dates as any)} 
                                style={{ width: '100%' }} 
                            />
                        </Col>
                    </Row>
                    {error && <Alert message="Error fetching history" description={error} type="error" showIcon closable />}
                    <Spin spinning={loading}>
                        <div 
                            className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                            style={watermarkStyle}
                        >
                            <Table
                                columns={columns}
                                dataSource={filteredHistory}
                                rowKey="id"
                                bordered
                                scroll={{ x: 'max-content' }}
                            />
                        </div>
                    </Spin>
                </Card>
            </div>
        </>
    );
};

export default StaffSalaryHistory;
