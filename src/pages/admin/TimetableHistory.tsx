
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Button, Space, message } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTimetablesHistoryRequest, type ClassTimetable } from '../../store/features/timetable-history/timetableHistorySlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import type { Day, TimetableEntry } from '../../store/features/class-timetables/classTimetablesSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';


const { Title, Text } = Typography;
const { Option } = Select;

const TimetableHistory: React.FC = () => {
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetables, loading, error } = useSelector((state: RootState) => state.timetableHistory);
    const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTimetablesHistoryRequest(user.organization_key));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (academicYears.length > 0 && selectedYear === null) {
            const currentYear = academicYears.find(cal => cal.is_current)?.academic_year;
            if (currentYear) {
                setSelectedYear(currentYear);
            }
        }
    }, [academicYears, selectedYear]);

    const uniqueClasses = useMemo(() => {
        if (!timetables || !selectedYear) return [];
        return [...new Set(timetables.filter(t => t.academic_year === selectedYear).map(t => t.class_name))];
    }, [timetables, selectedYear]);

    const uniqueSections = useMemo(() => {
        if (!timetables || !selectedYear || !selectedClass) return [];
        return [...new Set(timetables.filter(t => t.academic_year === selectedYear && t.class_name === selectedClass).map(t => t.section_name))];
    }, [timetables, selectedYear, selectedClass]);


    const filteredTimetables = useMemo(() => {
        if (!timetables) {
            return [];
        }
        return timetables.filter(timetable => {
            const yearMatch = !selectedYear || timetable.academic_year === selectedYear;
            const classMatch = !selectedClass || timetable.class_name === selectedClass;
            const sectionMatch = !selectedSection || timetable.section_name === selectedSection;
            return yearMatch && classMatch && sectionMatch;
        });
    }, [timetables, selectedYear, selectedClass, selectedSection]);
    
    const handleYearChange = (value: string | null) => {
        setSelectedYear(value);
        setSelectedClass(null);
        setSelectedSection(null);
    };

    const handleClassChange = (value: string | null) => {
        setSelectedClass(value);
        setSelectedSection(null);
    };
    
    const getTimeSlots = (numberOfPeriods: number) => {
        const timeSlots8 = [
            { period: 1, time: '09:15 - 10:00' }, { period: 2, time: '10:00 - 10:45' },
            { period: -1, time: '10:45 - 11:00', label: 'Short Break' },
            { period: 3, time: '11:00 - 11:45' }, { period: 4, time: '11:45 - 12:30' },
            { period: -2, time: '12:30 - 01:15', label: 'Lunch Break' },
            { period: 5, time: '01:15 - 02:00' }, { period: 6, time: '02:00 - 02:45' },
            { period: -3, time: '02:45 - 03:00', label: 'Short Break' },
            { period: 7, time: '03:00 - 03:45' }, { period: 8, time: '03:45 - 04:30' },
        ];
         const timeSlots4 = [
            { period: 1, time: '09:15 - 10:45' },
            { period: -1, time: '10:45 - 11:00', label: 'Short Break' },
            { period: 2, time: '11:00 - 12:30' },
            { period: -2, time: '12:30 - 01:15', label: 'Lunch Break' },
            { period: 3, time: '01:15 - 02:45' },
            { period: -3, time: '02:45 - 03:00', label: 'Short Break' },
            { period: 4, time: '03:00 - 04:30' },
        ];
        return numberOfPeriods === 4 ? timeSlots4 : timeSlots8;
    };


    const generateTimetableBody = (record: ClassTimetable) => {
        if (!record.timetable_data) return [];
        const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSlots = getTimeSlots(record.number_of_periods);
        const data: string[][] = [];

        days.forEach(day => {
            const row: string[] = [day];
            // Morning Extra Class
            const morningExtra = record.timetable_data.find(e => e.day === day && e.period === 0);
            row.push(morningExtra ? `${morningExtra.subject_name}\n(${morningExtra.teacher_name})` : '');
            
            // Regular periods and breaks
            timeSlots.forEach(slot => {
                 if (slot.label) {
                     row.push(slot.label);
                 } else {
                    const entry = record.timetable_data.find(e => e.day === day && e.period === slot.period);
                    row.push(entry ? `${entry.subject_name}\n(${entry.teacher_name})` : '');
                 }
            });

            // Evening Extra Class
            const eveningExtra = record.timetable_data.find(e => e.day === day && e.period === 99);
            row.push(eveningExtra ? `${eveningExtra.subject_name}\n(${eveningExtra.teacher_name})` : '');
            
            data.push(row);
        });

        return data;
    }
    
    const mainColumns = [
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Number of Periods', dataIndex: 'number_of_periods', key: 'number_of_periods', align: 'center' as const },
        {
            title: 'Last Updated',
            dataIndex: 'updated_at',
            key: 'updated_at',
            render: (date: string) => new Date(date).toLocaleString(),
            sorter: (a: ClassTimetable, b: ClassTimetable) => new Date(a.updated_at || 0).getTime() - new Date(b.updated_at || 0).getTime(),
        },
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
                    img.onerror = () => reject(new Error('Could not load school logo for PDF watermark.'));
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
            docInstance.text(schoolDetails?.school_name || 'Timetable Report', pageWidth / 2, 15, { align: 'center' });
            docInstance.setFontSize(10);
            docInstance.text(schoolDetails?.address || '', pageWidth / 2, 22, { align: 'center' });
        };
        
        let firstPage = true;
        
        for (const record of filteredTimetables) {
            if (!firstPage) {
                doc.addPage();
            }
            
            addWatermarkAndHeader(doc);
            
            doc.setFontSize(12);
            doc.text(`Timetable for Class: ${record.class_name} - ${record.section_name} (${record.academic_year})`, 14, 35);

            const timeSlots = getTimeSlots(record.number_of_periods);
            const head = [['Day', 'Extra (AM)', ...timeSlots.map(s => `${s.label || `Period ${s.period}`}\n${s.time}`), 'Extra (PM)']];
            const body = generateTimetableBody(record);

            autoTable(doc, {
                head,
                body,
                startY: 40,
                theme: 'grid',
                styles: {
                    halign: 'center',
                    valign: 'middle',
                    cellPadding: 2,
                    fontSize: 8,
                },
                headStyles: {
                    fillColor: [22, 160, 133],
                    textColor: 255,
                    fontStyle: 'bold',
                },
                didDrawPage: (data) => {
                    // This function is called after a page is drawn by autoTable
                    if (data.pageNumber > 1 && firstPage === false) { // Add header for pages added by autoTable itself
                        addWatermarkAndHeader(doc);
                    }
                },
            });
            
            firstPage = false;
        }
    
        if (filteredTimetables.length === 0) {
            addWatermarkAndHeader(doc);
            doc.setFontSize(12);
            doc.text("No timetables found for the selected filters.", 14, 40);
        }

        doc.save('timetable-history.pdf');
    };

    const handleExcelDownload = () => {
        const wb = XLSX.utils.book_new();
        filteredTimetables.forEach(record => {
            const timeSlots = getTimeSlots(record.number_of_periods);
            const body = generateTimetableBody(record);
            const wsData = [
                [`Timetable for Class: ${record.class_name} - Section: ${record.section_name} (${record.academic_year})`],
                [], // Empty row
                ['Day', 'Extra (AM)', ...timeSlots.map(s => `${s.label || 'Period ' + s.period} (${s.time})`), 'Extra (PM)'],
                ...body.map(row => row.map(cell => cell.replace(/\n/g, ' ')))
            ];
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, `${record.class_name}-${record.section_name}`.slice(0, 31));
        });
        XLSX.writeFile(wb, 'timetable-history.xlsx');
    };

    const handleHtmlDownload = () => {
        let htmlString = `
            <html><head><title>Timetable History</title>
            <style>
                body { font-family: sans-serif; margin: 20px; }
                 .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                .school-header img { max-height: 80px; margin-bottom: 10px; }
                .school-header h1 { margin: 0; }
                .school-header p { margin: 0; color: #555; }
                .report-container { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; page-break-inside: avoid; border-radius: 8px; }
                .group-header { font-weight: bold; margin-bottom: 10px; background-color: #f2f2f2; padding: 8px; border-radius: 4px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
                th { background-color: #e9ecef; }
            </style></head><body>
            <div class="school-header">
                ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
                <h1>${schoolDetails?.school_name || 'Timetable Report'}</h1>
                <p>${schoolDetails?.address || ''}</p>
            </div>
            `;
        
        filteredTimetables.forEach(record => {
             const timeSlots = getTimeSlots(record.number_of_periods);
             const body = generateTimetableBody(record);
             htmlString += `
                <div class="report-container">
                    <div class="group-header">Class: ${record.class_name} | Section: ${record.section_name} | Year: ${record.academic_year}</div>
                    <table>
                        <thead>
                           <tr><th>Day</th><th>Extra (AM)</th>${timeSlots.map(s => `<th>${s.label || 'Period ' + s.period}<br><small>${s.time}</small></th>`).join('')}<th>Extra (PM)</th></tr>
                        </thead>
                        <tbody>
                            ${body.map(row => `<tr>${row.map(cell => `<td>${cell.replace(/\n/g, '<br>')}</td>`).join('')}</tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });

        htmlString += `</body></html>`;
        const blob = new Blob([htmlString], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'timetable-history.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } : {};

    const expandedRowRender = (record: ClassTimetable) => {
        if (!record.timetable_data) return <p>No detailed data available.</p>;

        const timeSlots = getTimeSlots(record.number_of_periods);
        const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        const renderCell = (day: Day, period: number) => {
            const entry = record.timetable_data.find(e => e.day === day && e.period === period);
            if (!entry || !entry.subject_name) return null;
            return (
                 <div style={{ lineHeight: '1.4', textAlign: 'center', padding: '8px' }}>
                    <Text strong style={{ display: 'block', fontSize: '16px' }}>{entry.subject_name}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{entry.teacher_name}</Text>
                </div>
            );
        };

        const nestedColumns = [
            {
                title: <Text strong>Day</Text>,
                dataIndex: 'day', key: 'day', width: 120, fixed: 'left' as const,
                render: (text: string) => <Text strong>{text}</Text>,
            },
            {
                title: () => (<div style={{ textAlign: 'center', lineHeight: '1.4' }}><Text strong>Morning Extra</Text><br /><Text type="secondary">08:15 - 09:00</Text></div>),
                dataIndex: 'morning_extra', key: 'morning_extra', width: 180,
                render: (_: any, row: { day: Day }) => renderCell(row.day, 0)
            },
            ...timeSlots.map((slot) => ({
                title: () => (<div style={{ textAlign: 'center', lineHeight: '1.4' }}><Text strong>{slot.label ? slot.label : `Period ${slot.period}`}</Text><br/><Text type="secondary">{slot.time}</Text></div>),
                dataIndex: `period_${slot.period}`, key: `period_${slot.period}`, width: 180,
                render: (_: any, row: { day: Day }) => {
                    if (slot.label) {
                        return {
                            props: { style: { background: '#fafafa', textAlign: 'center' as const, verticalAlign: 'middle' } },
                            children: <Text strong type="secondary">{slot.label}</Text>,
                        };
                    }
                    return renderCell(row.day, slot.period as number);
                },
            })),
            {
                title: () => (<div style={{ textAlign: 'center', lineHeight: '1.4' }}><Text strong>Evening Extra</Text><br /><Text type="secondary">04:30 - 05:15</Text></div>),
                dataIndex: 'evening_extra', key: 'evening_extra', width: 180,
                render: (_: any, row: { day: Day }) => renderCell(row.day, 99)
            },
        ];

        const tableData = days.map(day => ({ key: day, day: day }));

        return (
            <div 
                className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                style={{ overflowX: 'auto', padding: '16px', backgroundColor: '#fff', ...watermarkStyle }}
            >
                <Table columns={nestedColumns} dataSource={tableData} pagination={false} bordered scroll={{ x: 'max-content' }} />
            </div>
        );
    };
    
    return (
        <>
            <style>{`
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
                <Title level={4}>Timetable History</Title>
                <Typography.Paragraph>
                    This report shows all the saved timetables for your organization. Expand each row to see the detailed schedule.
                </Typography.Paragraph>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            showSearch
                            allowClear
                            placeholder="Filter by Academic Year"
                            style={{ width: '100%' }}
                            value={selectedYear}
                            onChange={handleYearChange}
                            loading={calendarsLoading}
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {academicYears.map((y: any) => <Option key={y.id} value={y.academic_year}>{y.academic_year}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            showSearch
                            allowClear
                            placeholder="Filter by Class"
                            style={{ width: '100%' }}
                            value={selectedClass}
                            onChange={handleClassChange}
                            disabled={!selectedYear}
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Select
                            showSearch
                            allowClear
                            placeholder="Filter by Section"
                            style={{ width: '100%' }}
                            value={selectedSection}
                            onChange={setSelectedSection}
                            disabled={!selectedClass}
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                        </Select>
                    </Col>
                </Row>

                {error && <Alert message="Error fetching timetables" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}

                <Spin spinning={loading || calendarsLoading}>
                    <div style={{ overflowX: 'auto' }}>
                        <Table
                            columns={mainColumns}
                            dataSource={filteredTimetables}
                            rowKey="id"
                            expandable={{
                                expandedRowRender,
                                rowExpandable: record => record.timetable_data && record.timetable_data.length > 0,
                            }}
                            bordered
                            locale={{ emptyText: timetables.length > 0 ? 'No results match your filters.' : 'No timetable history found.' }}
                            footer={() => (
                            <Row justify="start">
                                    <Col>
                                        <Space wrap>
                                            <Text strong>Download Report:</Text>
                                            <Button onClick={handlePdfDownload} disabled={filteredTimetables.length === 0}>PDF</Button>
                                            <Button onClick={handleExcelDownload} disabled={filteredTimetables.length === 0}>Excel</Button>
                                            <Button onClick={handleHtmlDownload} disabled={filteredTimetables.length === 0}>HTML</Button>
                                        </Space>
                                    </Col>
                                </Row>
                            )}
                        />
                    </div>
                </Spin>
            </Card>
        </>
    );
};

export default TimetableHistory;
