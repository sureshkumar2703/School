
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Empty, Button, Space, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllClassSectionsRequest, type ClassSectionAllocation } from '../../store/features/class-sections-view/classSectionsViewSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

const RollNoHistory: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { allocations, loading, error } = useSelector((state: RootState) => state.classSectionsView);
  const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
  const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchAllClassSectionsRequest(user.organization_key));
      dispatch(fetchAcademicCalendarsRequest(user.organization_key));
      dispatch(fetchSchoolDetailsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  const activeRollNoAllocations = useMemo(() => {
    return allocations.filter(alloc => alloc.roll_no && alloc.status === 'Active');
  }, [allocations]);

  const uniqueClasses = useMemo(() => [...new Set(activeRollNoAllocations.map(m => m.class_name))], [activeRollNoAllocations]);
  const uniqueSections = useMemo(() => {
    if (!selectedClass) return [];
    return [...new Set(activeRollNoAllocations.filter(m => m.class_name === selectedClass).map(m => m.section_name))];
  }, [activeRollNoAllocations, selectedClass]);
  const uniqueYears = useMemo(() => {
    if (!selectedClass || !selectedSection) return [];
    return [...new Set(activeRollNoAllocations.filter(m => m.class_name === selectedClass && m.section_name === selectedSection).map(m => m.academic_year))];
  }, [activeRollNoAllocations, selectedClass, selectedSection]);

  useEffect(() => {
    if (academicYears.length > 0 && uniqueYears.includes(academicYears.find(cal => cal.is_current)?.academic_year || '')) {
        const currentYear = academicYears.find(cal => cal.is_current)?.academic_year;
        if (currentYear) {
            setSelectedYear(currentYear);
        }
    } else if (uniqueYears.length > 0 && selectedYear === null) {
        setSelectedYear(uniqueYears[0]);
    }
  }, [academicYears, uniqueYears, selectedYear]);

  const filteredData = useMemo(() => {
    if (!selectedClass || !selectedSection || !selectedYear) {
      return [];
    }
    return activeRollNoAllocations.filter(alloc => 
        alloc.class_name === selectedClass &&
        alloc.section_name === selectedSection &&
        alloc.academic_year === selectedYear
    );
  }, [activeRollNoAllocations, selectedClass, selectedSection, selectedYear]);

  const handlePdfDownload = async () => {
    const doc = new jsPDF();
    const tableData = filteredData.map(d => [d.roll_no ?? 'N/A', d.register_no ?? 'N/A', d.full_name ?? 'N/A']);
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

    const addWatermarkAndHeader = () => {
      // Watermark
      if (logoImg) {
        const imgWidth = 80;
        const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
        const x = (pageWidth - imgWidth) / 2;
        const y = (doc.internal.pageSize.getHeight() - imgHeight) / 2;
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
      }
      // Header
      doc.setFontSize(18);
      doc.text(schoolDetails?.school_name || 'School Report', pageWidth / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text(schoolDetails?.address || '', pageWidth / 2, 28, { align: 'center' });
      doc.setFontSize(14);
      doc.text('Roll Number Report', pageWidth / 2, 40, { align: 'center' });
    };

    addWatermarkAndHeader();
    
    doc.setFontSize(10);
    doc.text(`Class: ${selectedClass} - ${selectedSection}`, 14, 55);
    doc.text(`Academic Year: ${selectedYear}`, pageWidth - 14, 55, { align: 'right' });
    doc.text(`Total Students: ${filteredData.length}`, 14, 60);

    autoTable(doc, {
        startY: 65,
        head: [['Roll No', 'Register No', 'Full Name']],
        body: tableData,
    });
    doc.save('roll-no-history.pdf');
  };

  const handleExcelDownload = () => {
    const header = [
        [`Class: ${selectedClass}`, `Section: ${selectedSection}`, `Academic Year: ${selectedYear}`],
        [`Total Students: ${filteredData.length}`],
        [], // Empty row for spacing
        ['Roll No', 'Register No', 'Full Name']
    ];
    const body = filteredData.map(d => ({
        'Roll No': d.roll_no ?? 'N/A',
        'Register No': d.register_no ?? 'N/A',
        'Full Name': d.full_name ?? 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(body, { skipHeader: true });
    XLSX.utils.sheet_add_aoa(ws, header, { origin: 'A1' });
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Roll No History");
    XLSX.writeFile(wb, "roll-no-history.xlsx");
  };

  const handleHtmlDownload = () => {
    let htmlString = `
        <html><head><title>Roll No History</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .school-header img { max-height: 80px; margin-bottom: 10px; }
            .school-header h1 { margin: 0; }
            .school-header p { margin: 0; color: #555; }
            .report-title { text-align: center; font-size: 1.5em; margin-bottom: 20px; }
            .meta-info { display: flex; justify-content: space-between; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style></head><body>
        <div class="school-header">
            ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
            <h1>${schoolDetails?.school_name || 'School Report'}</h1>
            <p>${schoolDetails?.address || ''}</p>
        </div>
        <div class="report-title">Roll Number Report</div>
        <div class="meta-info">
            <span><b>Class:</b> ${selectedClass} - ${selectedSection}</span>
            <span><b>Academic Year:</b> ${selectedYear}</span>
        </div>
        <div><b>Total Students:</b> ${filteredData.length}</div>
        <br/>
        <table><thead><tr><th>Roll No</th><th>Register No</th><th>Full Name</th></tr></thead>
        <tbody>`;

    filteredData.forEach(d => {
        htmlString += `<tr><td>${d.roll_no}</td><td>${d.register_no}</td><td>${d.full_name}</td></tr>`;
    });

    htmlString += `</tbody></table></body></html>`;
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roll-no-history.html';
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const columns: ColumnsType<ClassSectionAllocation> = [
    { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', sorter: (a, b) => (a.roll_no || '').localeCompare(b.roll_no || '') },
    { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
    { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
    { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
    { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
  ];
  
  const handleClassChange = (value: string | null) => {
      setSelectedClass(value);
      setSelectedSection(null);
      setSelectedYear(null);
  };

  const handleSectionChange = (value: string | null) => {
      setSelectedSection(value);
      setSelectedYear(null);
  };
  
  const showTable = selectedClass && selectedSection && selectedYear;

  const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
    position: 'relative',
    '--watermark-url': `url('${schoolDetails.logo_url}')`
  } as React.CSSProperties : {};


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
        <Title level={4}>Roll Number History</Title>
        <Typography.Paragraph>
          View all students with actively assigned roll numbers. Use the filters to narrow down the results.
        </Typography.Paragraph>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}>
                <Select showSearch allowClear placeholder="Filter by Class" style={{ width: '100%' }} value={selectedClass} onChange={handleClassChange} loading={loading}>
                    {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            </Col>
            <Col xs={24} sm={8}>
                <Select showSearch allowClear placeholder="Filter by Section" style={{ width: '100%' }} value={selectedSection} onChange={handleSectionChange} disabled={!selectedClass}>
                    {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
            </Col>
            <Col xs={24} sm={8}>
                <Select showSearch allowClear placeholder="Filter by Academic Year" style={{ width: '100%' }} value={selectedYear} onChange={setSelectedYear} disabled={!selectedSection}>
                    {uniqueYears.map(y => <Option key={y} value={y}>{y}</Option>)}
                </Select>
            </Col>
        </Row>

        {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
        <Spin spinning={loading || calendarsLoading}>
          <div 
            className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
            style={watermarkStyle}
          >
            {showTable ? (
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
            ) : (
              <Empty description="Please select a class, section, and academic year to view the roll number history." />
            )}
          </div>
        </Spin>
      </Card>
    </>
  );
};

export default RollNoHistory;
