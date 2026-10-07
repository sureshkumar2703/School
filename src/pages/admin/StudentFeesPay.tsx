
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, Typography, Select, Spin, Row, Col, Empty, Input, InputNumber, Button, Form, message, Descriptions, Divider, Modal, Table } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchStudentFeesRequest, type StudentFee } from '../../store/features/student-fees-pay/studentFeesPaySlice';
import { fetchPaymentsForStudentRequest, addPaymentRequest, clearLastPayment } from '../../store/features/student-fee-payments/studentFeePaymentsSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { fetchFeesRequest } from '../../store/features/setfees/setfeesSlice';
import { fetchAllStudentTransportDataRequest } from '../../store/features/student-transport-data/studentTransportDataSlice';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';


const { Title, Text } = Typography;
const { Option } = Select;

const StudentFeesPay: React.FC = () => {
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { fees, loading: feesLoading } = useSelector((state: RootState) => state.studentFeesPay);
    const { payments, loading: paymentsLoading, lastPayment, lastPaymentStudentFee } = useSelector((state: RootState) => state.studentFeePayments);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const { fees: schoolFeesSetup } = useSelector((state: RootState) => state.setfees);
    const { allData: transportData } = useSelector((state: RootState) => state.studentTransportData);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [receivedAmount, setReceivedAmount] = useState<number | null>(null);
    
    const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `fee-receipt-${lastPaymentStudentFee?.student_name || 'student'}`,
    });

    const handleModalClose = () => {
        setIsPrintModalVisible(false);
        dispatch(clearLastPayment());
    };

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchFeesRequest(user.organization_key));
            dispatch(fetchAllStudentTransportDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars.length > 0 && !selectedYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedYear(currentYear);
            }
        }
    }, [calendars, selectedYear]);
    
    useEffect(() => {
        if (selectedYear && user?.organization_key) {
            dispatch(fetchStudentFeesRequest({
                organizationKey: user.organization_key,
                academicYear: selectedYear
            }));
        }
    }, [dispatch, selectedYear, user?.organization_key]);
    
     useEffect(() => {
        if (lastPayment && lastPaymentStudentFee) {
            setIsPrintModalVisible(true);
        }
    }, [lastPayment, lastPaymentStudentFee]);

    const classOptions = useMemo(() => {
        if (!selectedYear) return [];
        return [...new Set(fees.filter(fee => fee.academic_year === selectedYear).map(fee => fee.class_name))];
    }, [fees, selectedYear]);

    const sectionOptions = useMemo(() => {
        if (!selectedClass) return [];
        return [...new Set(fees.filter(fee => fee.academic_year === selectedYear && fee.class_name === selectedClass).map(fee => fee.section_name))];
    }, [fees, selectedYear, selectedClass]);
    
    const studentOptions = useMemo(() => {
        if (!selectedSection) return [];
        return fees.filter(fee => fee.academic_year === selectedYear && fee.class_name === selectedClass && fee.section_name === selectedSection);
    }, [fees, selectedYear, selectedClass, selectedSection]);
    
    const selectedStudentData = useMemo(() => {
        if (!selectedStudentId) return null;
        return studentOptions.find(student => student.id === selectedStudentId);
    }, [studentOptions, selectedStudentId]);

    const totalPaidFromHistory = useMemo(() => {
        return payments.reduce((acc, payment) => acc + payment.amount_paid, 0);
    }, [payments]);

    const balanceDue = useMemo(() => {
        if (!selectedStudentData) return 0;
        return selectedStudentData.total_fees - totalPaidFromHistory;
    }, [selectedStudentData, totalPaidFromHistory]);

    const schoolFeeValue = useMemo(() => {
        if (!selectedStudentData || !schoolFeesSetup.length) return 0;
        const setup = schoolFeesSetup.find(f => 
            f.academic_year === selectedStudentData.academic_year && 
            f.class_name === selectedStudentData.class_name
        );
        return setup?.class_fees || 0;
    }, [selectedStudentData, schoolFeesSetup]);

    const busFeeValue = useMemo(() => {
        if (!selectedStudentData || !transportData.length) return 0;
        const data = transportData.find(t => 
            t.student_id === selectedStudentData.student_id && 
            t.academic_year === selectedStudentData.academic_year
        );
        return data?.bus_fees || 0;
    }, [selectedStudentData, transportData]);

    useEffect(() => {
        if (selectedStudentId) {
            dispatch(fetchPaymentsForStudentRequest(selectedStudentId));
        }
    }, [dispatch, selectedStudentId]);

    const handleYearChange = (year: string | null) => {
        setSelectedYear(year);
        setSelectedClass(null);
        setSelectedSection(null);
        setSelectedStudentId(null);
        form.resetFields(['received_amount', 'new_balance']);
    };

    const handleClassChange = (className: string | null) => {
        setSelectedClass(className);
        setSelectedSection(null);
        setSelectedStudentId(null);
        form.resetFields(['received_amount', 'new_balance']);
    };

    const handleSectionChange = (sectionName: string | null) => {
        setSelectedSection(sectionName);
        setSelectedStudentId(null);
        form.resetFields(['received_amount', 'new_balance']);
    };
    
    const handleStudentSelect = (studentId: string | null) => {
        setSelectedStudentId(studentId);
        form.resetFields(['received_amount', 'new_balance']);
    };

    const handleReceivedAmountChange = (value: number | null) => {
        setReceivedAmount(value);
        if (value !== null) {
            const newBalance = balanceDue - value;
            form.setFieldsValue({ new_balance: newBalance });
        } else {
             form.setFieldsValue({ new_balance: undefined });
        }
    };

    const handlePayNow = () => {
        if (!selectedStudentData || receivedAmount === null || receivedAmount <= 0 || !user) {
            message.error("Please select a student and enter a valid received amount.");
            return;
        }

        dispatch(addPaymentRequest({
            organization_key: user.organization_key!,
            student_fee_id: selectedStudentData.id,
            student_id: selectedStudentData.student_id,
            student_name: selectedStudentData.student_name,
            amount_paid: receivedAmount,
            payment_date: dayjs().format('YYYY-MM-DD'),
            received_by_id: user.id,
            received_by_name: user.name,
        }));
        
        handleStudentSelect(null);
    };

    const isLoading = calendarsLoading || feesLoading || paymentsLoading;
    
    const paymentHistoryColumns = [
        { title: 'Payment Date', dataIndex: 'payment_date', key: 'payment_date', render: (date: string) => dayjs(date).format('DD/MM/YYYY') },
        { title: 'Amount Paid (₹)', dataIndex: 'amount_paid', key: 'amount_paid', render: (amount: number) => amount.toLocaleString() },
        { title: 'Received By', dataIndex: 'received_by_name', key: 'received_by_name' },
    ];

    return (
        <Spin spinning={isLoading}>
            <Card>
                 <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Title level={4} style={{ margin: 0 }}>Student Fees Payment</Title>
                        <Text type="secondary">Select a student to view their fee status and record a payment.</Text>
                    </Col>
                </Row>
                
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={8}>
                        <Text>Academic Year</Text>
                        <Select
                            placeholder="Select Year"
                            value={selectedYear}
                            onChange={handleYearChange}
                            style={{ width: '100%' }}
                            loading={calendarsLoading}
                            allowClear
                        >
                            {calendars.filter(c => c.status === 'Active').map(c => (
                                <Option key={c.id} value={c.academic_year}>
                                    {c.academic_year}{c.is_current && " (Current)"}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Text>Class</Text>
                        <Select
                            showSearch
                            placeholder="Select Class"
                            style={{ width: '100%' }}
                            value={selectedClass}
                            onChange={handleClassChange}
                            disabled={!selectedYear || classOptions.length === 0}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {classOptions.map(className => (
                                <Option key={className} value={className}>{className}</Option>
                            ))}
                        </Select>
                    </Col>
                     <Col xs={24} sm={8}>
                        <Text>Section</Text>
                        <Select
                            showSearch
                            placeholder="Select Section"
                            style={{ width: '100%' }}
                            value={selectedSection}
                            onChange={handleSectionChange}
                            disabled={!selectedClass || sectionOptions.length === 0}
                            allowClear
                             filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {sectionOptions.map(sectionName => (
                                <Option key={sectionName} value={sectionName}>{sectionName}</Option>
                            ))}
                        </Select>
                    </Col>
                </Row>
                
                <Divider />

                <Row gutter={[16, 16]}>
                     <Col xs={24} sm={8}>
                        <Text>Roll No.</Text>
                        <Select
                            showSearch
                            placeholder="Select by Roll No"
                            style={{ width: '100%' }}
                            value={selectedStudentId}
                            onChange={handleStudentSelect}
                            disabled={!selectedSection || studentOptions.length === 0}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {studentOptions.map(fee => (
                                <Option key={fee.id} value={fee.id}>
                                    {fee.roll_no}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Text>Name</Text>
                        <Select
                            showSearch
                            placeholder="Select by Name"
                            style={{ width: '100%' }}
                            value={selectedStudentId}
                            onChange={handleStudentSelect}
                            disabled={!selectedSection || studentOptions.length === 0}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {studentOptions.map(fee => (
                                <Option key={fee.id} value={fee.id}>
                                    {fee.student_name}
                                </Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Text>Register No</Text>
                        <Input
                            placeholder="Register Number"
                            value={selectedStudentData?.register_no || ''}
                            disabled
                        />
                    </Col>
                </Row>

                 {selectedStudentData && (
                    <div style={{ marginTop: 24 }}>
                        <Divider>Fee Details & Payment</Divider>
                         <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }} size="small" style={{marginBottom: '24px'}}>
                            <Descriptions.Item label="School Fees">
                                <Text>₹ {schoolFeeValue.toLocaleString()}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Bus Fees">
                                <Text>₹ {busFeeValue.toLocaleString()}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label=" "></Descriptions.Item>
                            <Descriptions.Item label="Total Fees">
                                <Text strong>₹ {selectedStudentData.total_fees.toLocaleString()}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Amount Paid">
                                <Text strong style={{color: 'green'}}>₹ {totalPaidFromHistory.toLocaleString()}</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Balance Due">
                                <Text strong style={{color: 'red'}}>₹ {balanceDue.toLocaleString()}</Text>
                            </Descriptions.Item>
                        </Descriptions>
                        <Form form={form} layout="vertical">
                            <Row gutter={16} align="bottom">
                                <Col xs={24} sm={12} md={8}>
                                    <Form.Item name="received_amount" label="Enter Received Amount" rules={[{ required: true, message: 'Enter amount!' }]}>
                                        <InputNumber placeholder="e.g., 5000" style={{ width: '100%' }} min={0} max={balanceDue > 0 ? balanceDue : undefined} onChange={handleReceivedAmountChange} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => Number(value!.replace(/₹\s?|(,*)/g, ''))}/>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Form.Item name="new_balance" label="New Balance">
                                        <InputNumber disabled style={{ width: '100%', color: form.getFieldValue('new_balance') < 0 ? 'red' : 'inherit' }} formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={value => Number(value!.replace(/₹\s?|(,*)/g, ''))}/>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={24} md={8}>
                                    <Form.Item>
                                        <Button type="primary" style={{ width: '100%' }} onClick={handlePayNow} disabled={receivedAmount === null || receivedAmount <= 0 || balanceDue <= 0} loading={feesLoading}>
                                            Record Payment
                                        </Button>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>

                        <Divider>Payment History</Divider>
                        <Table
                            columns={paymentHistoryColumns}
                            dataSource={payments}
                            rowKey="id"
                            bordered
                            size="small"
                            loading={paymentsLoading}
                            pagination={false}
                        />
                    </div>
                )}
            </Card>

             {!selectedYear && (
                <Card style={{marginTop: 24}}>
                    <Empty description="Please select an academic year to get started." />
                </Card>
            )}

            {lastPayment && lastPaymentStudentFee && (
                 <Modal
                    title="Fee Payment Receipt"
                    open={isPrintModalVisible}
                    onCancel={handleModalClose}
                    footer={[
                        <Button key="close" onClick={handleModalClose}>
                            Close
                        </Button>,
                        <Button key="print" type="primary" onClick={handlePrint}>
                            Print Again
                        </Button>,
                    ]}
                    width={800}
                >
                    <div ref={printRef} style={{ padding: '24px' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                            {schoolDetails?.logo_url && (
                                <img src={schoolDetails.logo_url} alt="School Logo" style={{ maxHeight: '80px', marginBottom: '10px' }} />
                            )}
                            <h2 style={{ margin: 0, fontSize: '24px' }}>{schoolDetails?.school_name}</h2>
                            <p style={{ margin: 0, fontSize: '14px' }}>{schoolDetails?.address}</p>
                            <p style={{ margin: 0, fontSize: '14px' }}>Phone: {schoolDetails?.phone_number} | Email: {schoolDetails?.email}</p>
                        </div>
                        <h3 style={{ textAlign: 'center', textTransform: 'uppercase', marginBottom: '20px' }}>Fee Receipt</h3>
                        <Row justify="space-between" style={{ marginBottom: '10px' }}>
                            <Col>
                                <Text><strong>Receipt No:</strong> {lastPayment.id.slice(-6).toUpperCase()}</Text>
                            </Col>
                            <Col>
                                <Text><strong>Date:</strong> {dayjs(lastPayment.payment_date).format('DD/MM/YYYY')}</Text>
                            </Col>
                        </Row>
                        <Divider />
                        <Descriptions bordered column={1} size="small">
                            <Descriptions.Item label="Student Name">{lastPaymentStudentFee.student_name}</Descriptions.Item>
                            <Descriptions.Item label="Roll No">{lastPaymentStudentFee.roll_no || 'N/A'}</Descriptions.Item>
                            <Descriptions.Item label="Class">{`${lastPaymentStudentFee.class_name} - ${lastPaymentStudentFee.section_name}`}</Descriptions.Item>
                            <Descriptions.Item label="Academic Year">{lastPaymentStudentFee.academic_year}</Descriptions.Item>
                        </Descriptions>
                         <Divider />
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', background: '#f2f2f2' }}>Description</th>
                                    <th style={{ border: '1px solid #ddd', padding: '8px', background: '#f2f2f2', textAlign: 'right' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Total Fees</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>₹ {lastPaymentStudentFee.total_fees.toLocaleString() }</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Amount Paid Now</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}><strong>₹ {lastPayment.amount_paid.toLocaleString()}</strong></td>
                                </tr>
                                 <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>Previously Paid</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>₹ {(lastPaymentStudentFee.paid_amount - lastPayment.amount_paid).toLocaleString()}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}><strong>Balance Due</strong></td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}><strong>₹ {lastPaymentStudentFee.balance_amount.toLocaleString()}</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                         <div style={{ marginTop: '40px', paddingTop: '40px', borderTop: '1px dashed #ccc', textAlign: 'right' }}>
                            <p>Authorized Signatory</p>
                        </div>
                    </div>
                </Modal>
            )}
        </Spin>
    );
};

export default StudentFeesPay;
