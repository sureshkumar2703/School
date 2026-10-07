
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Input, Select, Button, Space, message, Modal, Descriptions, Divider } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchFeesPendingHistoryRequest, type StudentFee } from '../../store/features/fees-pending-history/feesPendingHistorySlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { fetchPaymentsForStudentRequest, type StudentFeePayment } from '../../store/features/student-fee-payments/studentFeePaymentsSlice';
import { EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const FeesPendingHistory: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { pendingFees, loading, error } = useSelector((state: RootState) => state.feesPendingHistory);
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
        documentTitle: `fee-statement-${viewingStudent?.student_name || 'student'}`,
    });


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchFeesPendingHistoryRequest(user.organization_key));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
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

    const yearFilteredFees = useMemo(() => {
        if (!selectedYear) return [];
        return pendingFees.filter(fee => fee.academic_year === selectedYear);
    }, [pendingFees, selectedYear]);

    const classOptions = useMemo(() => [...new Set(yearFilteredFees.map(fee => fee.class_name))], [yearFilteredFees]);
    const sectionOptions = useMemo(() => {
        if (!selectedClass) return [];
        return [...new Set(yearFilteredFees.filter(fee => fee.class_name === selectedClass).map(fee => fee.section_name))];
    }, [yearFilteredFees, selectedClass]);


    const filteredData = useMemo(() => {
        let data = pendingFees;

        if (selectedYear) {
            data = data.filter(fee => fee.academic_year === selectedYear);
        }
        if (selectedClass) {
            data = data.filter(fee => fee.class_name === selectedClass);
        }
        if (selectedSection) {
            data = data.filter(fee => fee.section_name === selectedSection);
        }
        if (searchTerm) {
            data = data.filter(fee =>
                fee.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fee.roll_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                fee.register_no?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        return data;
    }, [pendingFees, searchTerm, selectedYear, selectedClass, selectedSection]);

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

    const handleModalClose = () => {
        setIsViewModalVisible(false);
        setViewingStudent(null);
    };

    const columns: ColumnsType<StudentFee> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', sorter: (a, b) => (a.roll_no || '').localeCompare(b.roll_no || '') },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Name', dataIndex: 'student_name', key: 'student_name' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Total Fees (₹)', dataIndex: 'total_fees', key: 'total_fees', render: (amount) => amount.toLocaleString() },
        { title: 'Paid Amount (₹)', dataIndex: 'paid_amount', key: 'paid_amount', render: (amount) => amount.toLocaleString() },
        { title: 'Balance Amount (₹)', dataIndex: 'balance_amount', key: 'balance_amount', render: (amount) => <Text strong style={{ color: 'red' }}>{amount.toLocaleString()}</Text> },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => handleViewDetails(record)}>View</Button>,
        },
    ];

    const paymentHistoryColumns: ColumnsType<StudentFeePayment> = [
        { title: 'Payment Date', dataIndex: 'payment_date', key: 'payment_date', render: (date: string) => dayjs(date).format('DD/MM/YYYY') },
        { title: 'Amount Paid (₹)', dataIndex: 'amount_paid', key: 'amount_paid', render: (amount: number) => amount.toLocaleString() },
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
                message.warning("Could not load school logo for watermark. Proceeding without it.");
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
            docInstance.text(schoolDetails?.school_name || 'Fees Pending Report', pageWidth / 2, 15, { align: 'center' });
            docInstance.setFontSize(10);
            docInstance.text(schoolDetails?.address || '', pageWidth / 2, 22, { align: 'center' });
        };

        const tableColumns = ["Roll No", "Register No", "Name", "Class", "Section", "Total Fees", "Paid Amount", "Balance Amount"];
        const tableRows = filteredData.map(d => [
            d.roll_no ?? 'N/A',
            d.register_no ?? 'N/A',
            d.student_name ?? 'N/A',
            d.class_name,
            d.section_name,
            d.total_fees.toLocaleString(),
            d.paid_amount.toLocaleString(),
            d.balance_amount.toLocaleString()
        ]);

        autoTable(doc, {
            head: [tableColumns],
            body: tableRows,
            startY: 30,
            didDrawPage: (data) => addWatermarkAndHeader(data.doc as jsPDF),
        });
        
        doc.save('fees_pending_history.pdf');
    };

    const handleExcelDownload = () => {
        const dataToExport = filteredData.map(d => ({
            "Roll No": d.roll_no,
            "Register No": d.register_no,
            "Name": d.student_name,
            "Class": d.class_name,
            "Section": d.section_name,
            "Total Fees": d.total_fees,
            "Paid Amount": d.paid_amount,
            "Balance Amount": d.balance_amount
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Fees Pending");
        XLSX.writeFile(workbook, "fees_pending_history.xlsx");
    };

    const handleHtmlDownload = () => {
        let htmlString = `
            <html><head><title>Fees Pending History</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .school-header img { max-height: 80px; margin-bottom: 10px; }
                .school-header h1 { margin: 0; }
                .school-header p { margin: 0; color: #555; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style></head><body>
            <div class="school-header">
                ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
                <h1>${schoolDetails?.school_name || 'Fees Pending Report'}</h1>
                <p>${schoolDetails?.address || ''}</p>
            </div>
            <table><thead><tr><th>Roll No</th><th>Register No</th><th>Name</th><th>Class</th><th>Section</th><th>Total Fees</th><th>Paid Amount</th><th>Balance Amount</th></tr></thead>
            <tbody>${filteredData.map(d => `
                <tr>
                    <td>${d.roll_no || 'N/A'}</td><td>${d.register_no || 'N/A'}</td><td>${d.student_name || 'N/A'}</td>
                    <td>${d.class_name}</td><td>${d.section_name}</td><td>${d.total_fees.toLocaleString()}</td>
                    <td>${d.paid_amount.toLocaleString()}</td><td>${d.balance_amount.toLocaleString()}</td>
                </tr>`).join('')}
            </tbody></table></body></html>
        `;
        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fees-pending-history.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <Card>
                <Title level={4}>Fees Pending History</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    This report shows all students with an outstanding fee balance for the selected academic year.
                </Text>

                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                     <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Filter by Academic Year"
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
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="Filter by Class"
                            value={selectedClass}
                            onChange={handleClassChange}
                            style={{ width: '100%' }}
                            disabled={!selectedYear}
                            allowClear
                        >
                          {classOptions.map(c => (
                              <Option key={c} value={c}>{c}</Option>
                          ))}
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
                          {sectionOptions.map(s => (
                              <Option key={s} value={s}>{s}</Option>
                          ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Search
                            placeholder="Search by Name, Roll, etc."
                            onChange={(e) => setSearchTerm(e.target.value)}
                            allowClear
                        />
                    </Col>
                </Row>

                {error && <Alert message="Error fetching data" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                <Spin spinning={loading || calendarsLoading}>
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
                                            <Text strong>Download Report:</Text>
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
                title="Student Payment History"
                open={isViewModalVisible}
                onCancel={handleModalClose}
                footer={[
                    <Button key="back" onClick={handleModalClose}>Close</Button>,
                    <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint} loading={paymentsLoading}>Print</Button>
                ]}
                width={800}
                destroyOnClose
            >
                <div ref={printRef} style={{ padding: '20px' }}>
                    <Spin spinning={paymentsLoading}>
                        {viewingStudent && (
                            <>
                                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                                    {schoolDetails?.logo_url && <img src={schoolDetails.logo_url} alt="School Logo" style={{ maxHeight: 80, marginBottom: 10 }} />}
                                    <Title level={3} style={{ margin: 0 }}>{schoolDetails?.school_name}</Title>
                                    <Text>{schoolDetails?.address}</Text>
                                    <Divider style={{margin: '12px 0'}}/>
                                    <Title level={4} style={{ margin: 0 }}>Fee Payment Statement</Title>
                                </div>

                                <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small" style={{ marginBottom: 20 }}>
                                    <Descriptions.Item label="Student Name">{viewingStudent.student_name}</Descriptions.Item>
                                    <Descriptions.Item label="Roll No">{viewingStudent.roll_no || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Class">{`${viewingStudent.class_name} - ${viewingStudent.section_name}`}</Descriptions.Item>
                                    <Descriptions.Item label="Academic Year">{viewingStudent.academic_year}</Descriptions.Item>
                                    <Descriptions.Item label="Total Fees" span={2}><Text strong>₹{viewingStudent.total_fees.toLocaleString()}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Total Paid" span={2}><Text strong style={{ color: 'green' }}>₹{viewingStudent.paid_amount.toLocaleString()}</Text></Descriptions.Item>
                                    <Descriptions.Item label="Balance Due" span={2}><Text strong style={{ color: 'red' }}>₹{viewingStudent.balance_amount.toLocaleString()}</Text></Descriptions.Item>
                                </Descriptions>
                                
                                <Title level={5} style={{marginTop: 20}}>Payment History</Title>
                                <Table
                                    columns={paymentHistoryColumns}
                                    dataSource={payments}
                                    rowKey="id"
                                    pagination={false}
                                    size="small"
                                />
                                <div style={{ marginTop: 40, paddingTop: 40, borderTop: '1px dashed #ccc', textAlign: 'right' }}>
                                    <p>Authorized Signatory</p>
                                </div>
                            </>
                        )}
                    </Spin>
                </div>
            </Modal>
        </>
    );
};

export default FeesPendingHistory;
