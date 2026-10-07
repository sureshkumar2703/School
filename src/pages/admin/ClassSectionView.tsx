
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Button, Space, message } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllClassSectionsRequest } from '../../store/features/class-sections-view/classSectionsViewSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

interface GroupedAllocation {
  key: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  children: { id: string; register_no: string; full_name: string; }[];
}

const ClassSectionView: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

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
  
  useEffect(() => {
    if (academicYears.length > 0 && !selectedYear) {
        const currentYear = academicYears.find(cal => cal.is_current)?.academic_year;
        if (currentYear) {
            setSelectedYear(currentYear);
        }
    }
  }, [academicYears, selectedYear]);

  const uniqueYears = useMemo(() => [...new Set(allocations.map(m => m.academic_year))], [allocations]);

  const uniqueClasses = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(allocations.filter(m => m.academic_year === selectedYear).map(m => m.class_name))];
  }, [allocations, selectedYear]);

  const uniqueSections = useMemo(() => {
    if (!selectedYear || !selectedClass) return [];
    return [...new Set(allocations.filter(m => m.academic_year === selectedYear && m.class_name === selectedClass).map(m => m.section_name))];
  }, [allocations, selectedYear, selectedClass]);

  const groupedData = useMemo(() => {
    const groups: { [key: string]: GroupedAllocation } = {};
    const filtered = allocations.filter(alloc => 
        (!selectedYear || alloc.academic_year === selectedYear) &&
        (!selectedClass || alloc.class_name === selectedClass) &&
        (!selectedSection || alloc.section_name === selectedSection)
    );

    filtered.forEach(alloc => {
      const key = `${alloc.academic_year}-${alloc.class_name}-${alloc.section_name}`;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          class_name: alloc.class_name,
          section_name: alloc.section_name,
          academic_year: alloc.academic_year,
          children: [],
        };
      }
      groups[key].children.push({
        id: alloc.id,
        register_no: alloc.register_no,
        full_name: alloc.full_name,
      });
    });

    return Object.values(groups);
  }, [allocations, selectedYear, selectedClass, selectedSection]);

  const handlePdfDownload = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoUrl = schoolDetails?.logo_url;
    let logoImg: HTMLImageElement | null = null;

    if (logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Could not load logo image for PDF watermark.'));
          img.src = logoUrl;
        });
        logoImg = img;
      } catch (e) {
        console.error(e);
        message.warning("Could not load school logo for watermark. Proceeding without it.");
      }
    }

    const addWatermark = () => {
        if (!logoImg) return;
        const imgWidth = 100;
        const imgHeight = (logoImg.height * imgWidth) / logoImg.width;
        const x = (pageWidth - imgWidth) / 2;
        const y = (doc.internal.pageSize.getHeight() - imgHeight) / 2;
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
    };

    const addHeader = (isFirstPage: boolean) => {
        doc.setFontSize(18);
        doc.text(schoolDetails?.school_name || 'School Report', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(schoolDetails?.address || '', pageWidth / 2, 28, { align: 'center' });
        if (isFirstPage) {
            doc.setFontSize(14);
            doc.text('Class Section Report', pageWidth / 2, 40, { align: 'center' });
        }
    };

    if (groupedData.length === 0) {
        addHeader(true);
        addWatermark();
        doc.setFontSize(12);
        doc.text("No data available for the selected filters.", 14, 60);
    } else {
        groupedData.forEach((group, index) => {
            if (index > 0) doc.addPage();
            
            addHeader(index === 0);
            addWatermark();
            
            const headerText = `Academic Year: ${group.academic_year} | Class: ${group.class_name} | Section: ${group.section_name}`;
            
            autoTable(doc, {
                startY: index === 0 ? 50 : 45, // Adjust startY for subsequent pages
                head: [[{ content: headerText, colSpan: 2, styles: { halign: 'center', fillColor: [240, 240, 240], textColor: 0 }}]],
                body: group.children.map(child => [child.register_no, child.full_name]),
                columns: [
                  { header: 'Register No', dataKey: 'register_no' },
                  { header: 'Full Name', dataKey: 'full_name' },
                ],
                theme: 'grid',
                headStyles: { fillColor: [22, 160, 133], textColor: 255 },
                didDrawPage: (data) => {
                    const pageNumber = (doc as any).internal.getNumberOfPages();
                    if (pageNumber > 1) { // Add header and watermark to new pages created by autoTable
                        addHeader(false);
                        addWatermark();
                    }
                },
            });
        });
    }

    doc.save('class-section-report.pdf');
  };

  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();
    groupedData.forEach(group => {
        const sheetData = group.children.map(child => ({
            'Register No': child.register_no,
            'Full Name': child.full_name,
        }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.sheet_add_aoa(ws, [[`Academic Year: ${group.academic_year}`, `Class: ${group.class_name}`, `Section: ${group.section_name}`]], { origin: 'A1' });
        XLSX.utils.book_append_sheet(wb, ws, `${group.class_name}-${group.section_name}`.slice(0, 31));
    });
    XLSX.writeFile(wb, 'class-section-report.xlsx');
  };
  
  const handleHtmlDownload = () => {
    let htmlString = `
        <html><head><title>Class Section Report</title>
        <style>
            body { font-family: sans-serif; margin: 20px; }
            .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .school-header img { max-height: 80px; margin-bottom: 10px; }
            .school-header h1 { margin: 0; }
            .school-header p { margin: 0; color: #555; }
            .report-title { text-align: center; font-size: 1.5em; margin-bottom: 20px; }
            .report-container { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; page-break-inside: avoid; border-radius: 8px; }
            .group-header { font-weight: bold; margin-bottom: 10px; background-color: #f2f2f2; padding: 8px; border-radius: 4px; }
            table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #e9ecef; }
        </style></head><body>
        <div class="school-header">
            ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
            <h1>${schoolDetails?.school_name || 'School Report'}</h1>
            <p>${schoolDetails?.address || ''}</p>
        </div>
        <div class="report-title">Class Section Report</div>`;
        
    groupedData.forEach(group => {
        htmlString += `
            <div class="report-container">
                <div class="group-header"><span>Year: ${group.academic_year} | Class: ${group.class_name} | Section: ${group.section_name}</span></div>
                <table><thead><tr><th>Register No</th><th>Full Name</th></tr></thead>
                <tbody>${group.children.map(child => `<tr><td>${child.register_no}</td><td>${child.full_name}</td></tr>`).join('')}</tbody>
                </table></div>`;
    });
    htmlString += `</body></html>`;
    const blob = new Blob([htmlString], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'class-section-report.html';
    a.click(); URL.revokeObjectURL(url);
  };

  const mainColumns = [
    { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
    { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
  ];

  const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
    position: 'relative',
    ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
  } : {};

  const expandedRowRender = (record: GroupedAllocation) => {
    const nestedColumns = [
      { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
      { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
    ];
    return (
        <div 
            className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
            style={{...watermarkStyle, padding: '16px', background: '#fff' }}
        >
            <Table columns={nestedColumns} dataSource={record.children} pagination={false} rowKey="id" />
        </div>
    );
  };
  
  const handleYearChange = (value: string | null) => {
      setSelectedYear(value);
      setSelectedClass(null);
      setSelectedSection(null);
  };

  const handleClassChange = (value: string | null) => {
      setSelectedClass(value);
      setSelectedSection(null);
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
        <Title level={4}>Class Section Allocation Report</Title>
        <Typography.Paragraph>
          This report shows all students allocated to specific class sections for each academic year.
        </Typography.Paragraph>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} md={8}>
                  <Select showSearch allowClear placeholder="Filter by Year" style={{ width: '100%' }} value={selectedYear} onChange={handleYearChange} loading={calendarsLoading}>
                      {uniqueYears.map(y => <Option key={y} value={y}>{y}</Option>)}
                  </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                  <Select showSearch allowClear placeholder="Filter by Class" style={{ width: '100%' }} value={selectedClass} onChange={handleClassChange} disabled={!selectedYear}>
                      {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                  </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                   <Select showSearch allowClear placeholder="Filter by Section" style={{ width: '100%' }} value={selectedSection} onChange={setSelectedSection} disabled={!selectedClass}>
                      {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
              </Col>
          </Row>

        {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
        <Spin spinning={loading || calendarsLoading}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={mainColumns} dataSource={groupedData} rowKey="key"
              expandable={{ expandedRowRender, rowExpandable: record => record.children && record.children.length > 0 }}
              bordered
              footer={() => (
                <Row justify="start">
                    <Col>
                        <Space wrap>
                            <Text strong>Download Report:</Text>
                            <Button onClick={handlePdfDownload} disabled={groupedData.length === 0}>PDF</Button>
                            <Button onClick={handleExcelDownload} disabled={groupedData.length === 0}>Excel</Button>
                            <Button onClick={handleHtmlDownload} disabled={groupedData.length === 0}>HTML</Button>
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

export default ClassSectionView;
