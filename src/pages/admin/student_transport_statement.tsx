

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Button, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllStudentTransportDataRequest, type StudentTransportData } from '../../store/features/student-transport-data/studentTransportDataSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

interface ExportColumn {
    title: string;
    dataIndex: keyof StudentTransportData;
}

const StudentTransportStatement: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { allData: transportData, loading: transportLoading, error } = useSelector((state: RootState) => state.studentTransportData);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails, loading: schoolDetailsLoading } = useSelector((state: RootState) => state.schoolDetails);
    
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedBusNo, setSelectedBusNo] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAllStudentTransportDataRequest(user.organization_key));
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

    const academicYearOptions = useMemo(() => [...new Set(transportData.map(item => item.academic_year).filter(Boolean))], [transportData]);
    
    const busOptions = useMemo(() => {
        if (!selectedYear) return [];
        return [...new Set(transportData.filter(item => item.academic_year === selectedYear).map(item => item.bus_no).filter(Boolean))] as string[];
    }, [transportData, selectedYear]);


    const classOptions = useMemo(() => {
        if (!selectedYear) return [];
        let data = transportData.filter(item => item.academic_year === selectedYear);
        if (selectedBusNo) {
            data = data.filter(item => item.bus_no === selectedBusNo);
        }
        return [...new Set(data.map(item => item.class).filter(Boolean))] as string[];
    }, [transportData, selectedYear, selectedBusNo]);

    const sectionOptions = useMemo(() => {
        if (!selectedClass || !selectedYear) return [];
         let data = transportData.filter(item => item.academic_year === selectedYear && item.class === selectedClass);
        if (selectedBusNo) {
            data = data.filter(item => item.bus_no === selectedBusNo);
        }
        return [...new Set(data.map(item => item.section).filter(Boolean))] as string[];
    }, [transportData, selectedYear, selectedClass, selectedBusNo]);
    
    const filteredData = useMemo(() => {
        return transportData.filter(item =>
            item.status === 'Active' &&
            (!selectedYear || item.academic_year === selectedYear) &&
            (!selectedBusNo || item.bus_no === selectedBusNo) &&
            (!selectedClass || item.class === selectedClass) &&
            (!selectedSection || item.section === selectedSection)
        );
    }, [transportData, selectedYear, selectedBusNo, selectedClass, selectedSection]);
    
    const columns: ColumnsType<StudentTransportData> = [
        { title: 'Student Name', dataIndex: 'student_name', key: 'student_name' },
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no' },
        { title: 'Class', dataIndex: 'class', key: 'class' },
        { title: 'Section', dataIndex: 'section', key: 'section' },
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
        { title: 'Bus Fees (₹)', dataIndex: 'bus_fees', key: 'bus_fees', render: (fees) => fees ? fees.toLocaleString() : 'N/A' },
        { title: 'Bus No', dataIndex: 'bus_no', key: 'bus_no' },
        { title: 'Vehicle No', dataIndex: 'vehicle_no', key: 'vehicle_no' },
        { title: 'Driver Name', dataIndex: 'driver_name', key: 'driver_name' },
        { title: 'Driver Contact', dataIndex: 'driver_contact', key: 'driver_contact' },
        { title: 'Route (From)', dataIndex: 'from_address', key: 'from_address' },
        { title: 'Route (To)', dataIndex: 'to_address', key: 'to_address' },
        { title: 'Current Address', dataIndex: 'current_address', key: 'current_address' },
    ];
    
    const handleYearChange = (value: string | null) => {
        setSelectedYear(value);
        setSelectedBusNo(null);
        setSelectedClass(null);
        setSelectedSection(null);
    };

    const handleBusChange = (value: string | null) => {
        setSelectedBusNo(value);
        setSelectedClass(null);
        setSelectedSection(null);
    };

    const handleClassChange = (value: string | null) => {
        setSelectedClass(value);
        setSelectedSection(null);
    };

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
                    img.onerror = () => reject(new Error('Could not load logo image for PDF.'));
                    img.src = logoUrl;
                });
                logoImg = img;
            } catch (e) {
                console.error(e);
                message.warning("Could not load school logo for PDF. Proceeding without it.");
            }
        }

        const addWatermarkAndHeader = (docInstance: jsPDF) => {
            if (logoImg) {
                const imgWidth = 80;
                const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
                const x = (pageWidth - imgWidth) / 2;
                const y = (docInstance.internal.pageSize.getHeight() - imgHeight) / 2;
                docInstance.setGState(new (doc as any).GState({ opacity: 0.1 }));
                docInstance.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
                docInstance.setGState(new (doc as any).GState({ opacity: 1 }));
            }
            docInstance.setFontSize(16);
            docInstance.text(schoolDetails?.school_name || 'Student Transport Report', pageWidth / 2, 15, { align: 'center' });
            docInstance.setFontSize(10);
            docInstance.text(schoolDetails?.address || '', pageWidth / 2, 22, { align: 'center' });
        };
        
        const exportColumns: ExportColumn[] = columns.map(c => ({ title: c.title as string, dataIndex: (c as any).dataIndex as keyof StudentTransportData })).filter(c => c.dataIndex);

        addWatermarkAndHeader(doc);
        autoTable(doc, {
            head: [exportColumns.map(c => c.title)],
            body: filteredData.map(d => exportColumns.map(c => {
                 if (c.dataIndex === 'bus_fees') {
                    return d.bus_fees ? d.bus_fees.toLocaleString() : 'N/A';
                }
                return d[c.dataIndex] || 'N/A'
            })),
            startY: 30,
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    addWatermarkAndHeader(data.doc as jsPDF);
                }
            },
        });
        doc.save('student-transport-statement.pdf');
    };

    const handleExcelDownload = () => {
        const exportColumns: ExportColumn[] = columns.map(c => ({ title: c.title as string, dataIndex: (c as any).dataIndex as keyof StudentTransportData })).filter(c => c.dataIndex);
        const dataToExport = filteredData.map(d => {
            const row: any = {};
            exportColumns.forEach(col => {
                row[col.title] = d[col.dataIndex] || 'N/A';
            });
            return row;
        });
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transport Statement');
        XLSX.writeFile(workbook, 'student-transport-statement.xlsx');
    };

    const handleHtmlDownload = () => {
        const exportColumns: ExportColumn[] = columns.map(c => ({ title: c.title as string, dataIndex: (c as any).dataIndex as keyof StudentTransportData })).filter(c => c.dataIndex);
        let htmlString = `
            <html><head><title>Student Transport Statement</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .school-header img { max-height: 80px; margin-bottom: 10px; }
                .school-header h1 { margin: 0; }
                .school-header p { margin: 0; color: #555; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style></head><body>
            <div class="school-header">
                ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
                <h1>${schoolDetails?.school_name || 'Student Transport Statement'}</h1>
                <p>${schoolDetails?.address || ''}</p>
            </div>
            <table><thead><tr>${exportColumns.map(c => `<th>${c.title}</th>`).join('')}</tr></thead><tbody>`;

        filteredData.forEach(d => {
            htmlString += '<tr>';
            exportColumns.forEach(c => {
                 htmlString += `<td>${d[c.dataIndex] || 'N/A'}</td>`;
            });
            htmlString += '</tr>';
        });

        htmlString += `</tbody></table></body></html>`;
        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'student-transport-statement.html';
        a.click(); URL.revokeObjectURL(url);
    };

    const loading = transportLoading || calendarsLoading || schoolDetailsLoading;
    
    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } : {};

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
            <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                    <Col>
                        <Title level={4}>Student Transport Statement</Title>
                        <Text type="secondary">View all active student transport assignments.</Text>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={6}>
                        <Select
                            showSearch
                            value={selectedYear}
                            onChange={handleYearChange}
                            style={{ width: '100%' }}
                            placeholder="Select Academic Year"
                            loading={loading}
                            allowClear
                        >
                            {academicYearOptions.map(year => {
                                const isCurrent = calendars.find(c => c.academic_year === year)?.is_current;
                                return (
                                    <Option key={year} value={year!}>{year}{isCurrent && " (Current)"}</Option>
                                );
                            })}
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select
                            showSearch
                            value={selectedBusNo}
                            onChange={handleBusChange}
                            style={{ width: '100%' }}
                            placeholder="Filter by Bus No"
                            disabled={!selectedYear}
                            allowClear
                        >
                            {busOptions.map(busNo => <Option key={busNo} value={busNo}>{busNo}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                        <Select
                            showSearch
                            value={selectedClass}
                            onChange={handleClassChange}
                            style={{ width: '100%' }}
                            placeholder="Filter by Class"
                            disabled={!selectedYear}
                            allowClear
                        >
                            {classOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={6}>
                         <Select
                            showSearch
                            value={selectedSection}
                            onChange={setSelectedSection}
                            style={{ width: '100%' }}
                            placeholder="Filter by Section"
                            disabled={!selectedClass}
                            allowClear
                        >
                            {sectionOptions.map(s => <Option key={s} value={s!}>{s}</Option>)}
                        </Select>
                    </Col>
                </Row>


                {error && <Alert message="Error fetching data" description={error} type="error" showIcon closable />}
                <Spin spinning={loading}>
                    <div 
                        className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                        style={watermarkStyle}
                    >
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
                    </div>
                </Spin>
            </Card>
        </>
    );
};

export default StudentTransportStatement;
