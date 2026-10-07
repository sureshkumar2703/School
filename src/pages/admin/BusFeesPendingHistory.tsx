import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Input, Select, Button, Space, message, Modal, Descriptions, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchFeesPendingHistoryRequest, type StudentFee } from '../../store/features/fees-pending-history/feesPendingHistorySlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { fetchAllStudentTransportDataRequest } from '../../store/features/student-transport-data/studentTransportDataSlice';
import { fetchPaymentsForStudentRequest, type StudentFeePayment } from '../../store/features/student-fee-payments/studentFeePaymentsSlice';
import { fetchFeesRequest } from '../../store/features/setfees/setfeesSlice';
import { EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const BusFeesPendingHistory: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { pendingFees, loading, error } = useSelector((state: RootState) => state.feesPendingHistory);
    const { transportData, loading: transportLoading } = useSelector((state: RootState) => ({
        transportData: state.studentTransportData.allData,
        loading: state.studentTransportData.loading
    }));
    const { fees: schoolFeesSetup, loading: schoolFeesLoading } = useSelector((state: RootState) => state.setfees);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const { payments, loading: paymentsLoading } = useSelector((state: RootState) => state.studentFeePayments);

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentFee | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `bus-fee-statement-${viewingStudent?.student_name || 'student'}`,
    });

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchFeesPendingHistoryRequest(user.organization_key));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchAllStudentTransportDataRequest(user.organization_key));
            dispatch(fetchFeesRequest(user.organization_key));
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
        if (viewingStudent) {
            dispatch(fetchPaymentsForStudentRequest(viewingStudent.id));
        }
    }, [viewingStudent, dispatch]);

    const busStudentIds = useMemo(() => {
        if (!selectedYear) return new Set();
        return new Set(
            transportData
                .filter(t => t.academic_year === selectedYear && t.status === 'Active')
                .map(t => t.student_id)
        );
    }, [transportData, selectedYear]);

    const filteredData = useMemo(() => {
        let data = pendingFees.filter(fee => busStudentIds.has(fee.student_id));

        if (selectedYear) data = data.filter(fee => fee.academic_year === selectedYear);
        if (selectedClass) data = data.filter(fee => fee.class_name === selectedClass);
        if (selectedSection) data = data.filter(fee => fee.section_name === selectedSection);
        if (searchTerm) {
            data = data.filter(fee =>
                fee.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fee.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fee.register_no?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return data;
    }, [pendingFees, busStudentIds, searchTerm, selectedYear, selectedClass, selectedSection]);

    const classOptions = useMemo(() => [...new Set(filteredData.map(fee => fee.class_name))], [filteredData]);
    const sectionOptions = useMemo(() => {
        if (!selectedClass) return [];
        return [...new Set(filteredData.filter(fee => fee.class_name === selectedClass).map(fee => fee.section_name))];
    }, [filteredData, selectedClass]);

    const handleYearChange = (value: string | null) => {
        setSelectedYear(value);
        setSelectedClass(null);
        setSelectedSection(null);
    };

    const handleClassChange = (value: string | null) => {
        setSelectedClass(value);
        setSelectedSection(null);
    };

    const handleViewDetails = (record: StudentFee) => {
        setViewingStudent(record);
        setIsViewModalVisible(true);
    };

    const columns: ColumnsType<StudentFee> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', sorter: (a, b) => (a.roll_no || '').localeCompare(b.roll_no || '') },
        { title: 'Name', dataIndex: 'student_name', key: 'student_name' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        {
            title: 'School Fees (₹)',
            key: 'school_fees',
            render: (_, record) => {
                const setup = schoolFeesSetup.find(f => f.academic_year === record.academic_year && f.class_name === record.class_name);
                return (setup?.class_fees || 0).toLocaleString();
            }
        },
        {
            title: 'Bus Fees (₹)',
            key: 'bus_fees',
            render: (_, record) => {
                const data = transportData.find(t => t.student_id === record.student_id && t.academic_year === record.academic_year);
                return (data?.bus_fees || 0).toLocaleString();
            }
        },
        {
            title: 'Bus No',
            key: 'bus_no',
            render: (_, record) => {
                const data = transportData.find(t => t.student_id === record.student_id && t.academic_year === record.academic_year);
                return data?.bus_no || 'N/A';
            }
        },
        {
            title: 'Driver Name',
            key: 'driver_name',
            render: (_, record) => {
                const data = transportData.find(t => t.student_id === record.student_id && t.academic_year === record.academic_year);
                return data?.driver_name || 'N/A';
            }
        },
        { title: 'Total Fees (₹)', dataIndex: 'total_fees', key: 'total_fees', render: (amount) => amount.toLocaleString() },
        { title: 'Paid (₹)', dataIndex: 'paid_amount', key: 'paid_amount', render: (amount) => amount.toLocaleString() },
        { title: 'Balance (₹)', dataIndex: 'balance_amount', key: 'balance_amount', render: (amount) => <Text strong style={{ color: 'red' }}>{amount.toLocaleString()}</Text> },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>View</Button>,
        },
    ];

    const paymentHistoryColumns: ColumnsType<StudentFeePayment> = [
        { title: 'Date', dataIndex: 'payment_date', key: 'payment_date', render: (date: string) => dayjs(date).format('DD/MM/YYYY') },
        { title: 'Amount (₹)', dataIndex: 'amount_paid', key: 'amount_paid', render: (amount: number) => amount.toLocaleString() },
        { title: 'Received By', dataIndex: 'received_by_name', key: 'received_by_name' },
    ];

    const handlePdfDownload = async () => {
        const doc = new jsPDF({ orientation: 'landscape' });
        const pageWidth = doc.internal.pageSize.getWidth();
        const logoUrl = schoolDetails?.logo_url;
        let logoImg: HTMLImageElement | null = null;
        
        if (logoUrl) {
            try {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                await new Promise<void>((resolve, reject) => {
                    img.onload = () => resolve();
                    img.onerror = () => reject(new Error('Could not load logo image.'));
                    img.src = logoUrl;
                });
                logoImg = img;
            } catch (e) {
                console.error(e);
            }
        }

        const addWatermarkAndHeader = (docInstance: jsPDF) => {
            if (logoImg) {
                const imgWidth = 80;
                const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
                const x = (pageWidth - imgWidth) / 2;
                const y = (docInstance.internal.pageSize.getHeight() - imgHeight) / 2;
                docInstance.setGState(new (docInstance as any).GState({ opacity: 0.1 }));
                docInstance.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
                docInstance.setGState(new (docInstance as any).GState({ opacity: 1 }));
            }
            docInstance.setFontSize(16);
            docInstance.text(schoolDetails?.school_name || 'Bus Fees Pending Report', pageWidth / 2, 15, { align: 'center' });
            docInstance.setFontSize(10);
            docInstance.text(schoolDetails?.address || '', pageWidth / 2, 22, { align: 'center' });
        };

        const tableColumns = ["Roll No", "Name", "Class", "Section", "School Fees", "Bus Fees", "Bus No", "Driver", "Total Fees", "Paid Amount", "Balance Amount"];
        const tableRows = filteredData.map(d => {
            const setup = schoolFeesSetup.find(f => f.academic_year === d.academic_year && f.class_name === d.class_name);
            const transport = transportData.find(t => t.student_id === d.student_id && t.academic_year === d.academic_year);
            return [
                d.roll_no || 'N/A',
                d.student_name || 'N/A',
                d.class_name,
                d.section_name,
                (setup?.class_fees || 0).toLocaleString(),
                (transport?.bus_fees || 0).toLocaleString(),
                transport?.bus_no || 'N/A',
                transport?.driver_name || 'N/A',
                d.total_fees.toLocaleString(),
                d.paid_amount.toLocaleString(),
                d.balance_amount.toLocaleString()
            ];
        });

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 30,
            didDrawPage: (data) => addWatermarkAndHeader(data.doc as jsPDF),
        });
        
        doc.save('bus_fees_pending_history.pdf');
    };

    const handleExcelDownload = () => {
        const dataToExport = filteredData.map(d => {
            const setup = schoolFeesSetup.find(f => f.academic_year === d.academic_year && f.class_name === d.class_name);
            const transport = transportData.find(t => t.student_id === d.student_id && t.academic_year === d.academic_year);
            return {
                "Roll No": d.roll_no,
                "Name": d.student_name,
                "Class": d.class_name,
                "Section": d.section_name,
                "School Fees": setup?.class_fees || 0,
                "Bus Fees": transport?.bus_fees || 0,
                "Bus No": transport?.bus_no || 'N/A',
                "Driver Name": transport?.driver_name || 'N/A',
                "Total Fees": d.total_fees,
                "Paid Amount": d.paid_amount,
                "Balance Amount": d.balance_amount
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bus Fees Pending");
        XLSX.writeFile(workbook, "bus_fees_pending_history.xlsx");
    };

    const handleHtmlDownload = () => {
        let htmlString = `
            <html><head><title>Bus Fees Pending History</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style></head><body>
            <div class="header">
                <h1>${schoolDetails?.school_name || 'Bus Fees Pending Report'}</h1>
                <p>${schoolDetails?.address || ''}</p>
            </div>
            <table><thead><tr><th>Roll No</th><th>Name</th><th>Class</th><th>Section</th><th>School Fees</th><th>Bus Fees</th><th>Bus No</th><th>Driver Name</th><th>Total Fees</th><th>Paid</th><th>Balance</th></tr></thead>
            <tbody>${filteredData.map(d => {
                const setup = schoolFeesSetup.find(f => f.academic_year === d.academic_year && f.class_name === d.class_name);
                const transport = transportData.find(t => t.student_id === d.student_id && t.academic_year === d.academic_year);
                return `
                <tr><td>${d.roll_no || 'N/A'}</td><td>${d.student_name}</td><td>${d.class_name}</td><td>${d.section_name}</td><td>${setup?.class_fees || 0}</td><td>${transport?.bus_fees || 0}</td><td>${transport?.bus_no || 'N/A'}</td><td>${transport?.driver_name || 'N/A'}</td><td>${d.total_fees}</td><td>${d.paid_amount}</td><td>${d.balance_amount}</td></tr>`;
            }).join('')}
            </tbody></table></body></html>
        `;
        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bus-fees-pending-history.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    const isLoading = loading || calendarsLoading || transportLoading || schoolFeesLoading;

    return (
        <>
            <Card>
                <Title level={4}>Bus Fees Pending Students</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    List of students using transport with outstanding bus fee balances.
                </Text>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Academic Year"
                            value={selectedYear}
                            onChange={handleYearChange}
                            style={{ width: '100%' }}
                            loading={calendarsLoading}
                            allowClear
                        >
                          {calendars.filter(c => c.status === 'Active').map(c => (
                              <Option key={c.id} value={c.academic_year}>{c.academic_year}</Option>
                          ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Filter by Class"
                            value={selectedClass}
                            onChange={handleClassChange}
                            style={{ width: '100%' }}
                            disabled={!selectedYear}
                            allowClear
                        >
                          {classOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Filter by Section"
                            value={selectedSection}
                            onChange={setSelectedSection}
                            style={{ width: '100%' }}
                            disabled={!selectedClass}
                            allowClear
                        >
                          {sectionOptions.map(s => <Option key={s} value={s}>{s}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Search
                            placeholder="Search Name/Roll"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                        />
                    </Col>
                </Row>

                <Spin spinning={isLoading}>
                    <div style={{ overflowX: 'auto' }}>
                        <Table
                            columns={columns}
                            dataSource={filteredData}
                            rowKey="id"
                            bordered
                            scroll={{ x: 'max-content' }}
                            footer={() => (
                                <Row justify="end">
                                    <Col>
                                        <Space wrap>
                                            <Button onClick={handlePdfDownload} disabled={filteredData.length === 0}>PDF</Button>
                                            <Button onClick={handleExcelDownload} disabled={filteredData.length === 0}>Excel</Button>
                                            <Button onClick={handleHtmlDownload} disabled={filteredData.length === 0}>HTML</Button>
                                        </Space>
                                    </Col>
                                </Row>
                            )}
                        />
                    </div>
                </Spin>
            </Card>

            <Modal
                title="Payment History"
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setIsViewModalVisible(false)}>Close</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint} loading={paymentsLoading}>Print</Button>
                ]}
                width={800}
            >
                <div ref={printRef} style={{ padding: '20px' }}>
                    {viewingStudent && (
                        <>
                            <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                <Title level={3}>{schoolDetails?.school_name}</Title>
                                <Text>{schoolDetails?.address}</Text>
                                <Divider style={{margin: '12px 0'}}/>
                                <Title level={4}>Bus Fee Payment Statement</Title>
                            </div>
                            <Descriptions bordered column={2} size="small">
                                <Descriptions.Item label="Name">{viewingStudent.student_name}</Descriptions.Item>
                                <Descriptions.Item label="Roll No">{viewingStudent.roll_no || 'N/A'}</Descriptions.Item>
                                <Descriptions.Item label="Class">{`${viewingStudent.class_name} - ${viewingStudent.section_name}`}</Descriptions.Item>
                                <Descriptions.Item label="Year">{viewingStudent.academic_year}</Descriptions.Item>
                                <Descriptions.Item label="Bus No">
                                    {transportData.find(t => t.student_id === viewingStudent.student_id && t.academic_year === viewingStudent.academic_year)?.bus_no || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Driver Name">
                                    {transportData.find(t => t.student_id === viewingStudent.student_id && t.academic_year === viewingStudent.academic_year)?.driver_name || 'N/A'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Total Fees" span={2}>₹{viewingStudent.total_fees.toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Total Paid" span={2}>₹{viewingStudent.paid_amount.toLocaleString()}</Descriptions.Item>
                                <Descriptions.Item label="Balance Due" span={2}><Text strong style={{color: 'red'}}>₹{viewingStudent.balance_amount.toLocaleString()}</Text></Descriptions.Item>
                            </Descriptions>
                            <Divider orientation="left">History</Divider>
                            <Table columns={paymentHistoryColumns} dataSource={payments} rowKey="id" pagination={false} size="small" />
                        </>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default BusFeesPendingHistory;