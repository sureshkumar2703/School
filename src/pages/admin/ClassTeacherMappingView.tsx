

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Button, Space, message } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllMappingsRequest } from '../../store/features/class-mappings-view/classMappingsViewSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;

interface GroupedMapping {
  key: string;
  academic_year: string;
  class_name: string;
  section_name: string;
  children: RawMapping[];
}

interface RawMapping {
  id: string;
  subject_name: string;
  teacher_name: string;
  role: string;
}

const ClassTeacherMappingView: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { mappings, loading, error } = useSelector((state: RootState) => state.classMappingsView);
  const { calendars: academicYears } = useSelector((state: RootState) => state.academicCalendar);
  const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchAllMappingsRequest(user.organization_key));
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

  const uniqueYears = useMemo(() => [...new Set(mappings.map(m => m.academic_year))], [mappings]);
  const uniqueClasses = useMemo(() => {
    if (!selectedYear) return [];
    return [...new Set(mappings.filter(m => m.academic_year === selectedYear).map(m => m.class_name))];
  }, [mappings, selectedYear]);
  const uniqueSections = useMemo(() => {
    if (!selectedYear || !selectedClass) return [];
    return [...new Set(mappings.filter(m => m.academic_year === selectedYear && m.class_name === selectedClass).map(m => m.section_name))];
  }, [mappings, selectedYear, selectedClass]);


  const groupedData = useMemo(() => {
    const filtered = mappings.filter(mapping => 
        (!selectedYear || mapping.academic_year === selectedYear) &&
        (!selectedClass || mapping.class_name === selectedClass) &&
        (!selectedSection || mapping.section_name === selectedSection)
    );

    const groups: { [key: string]: GroupedMapping } = {};
    filtered.forEach(mapping => {
      const key = `${mapping.academic_year}-${mapping.class_name}-${mapping.section_name}`;
      if (!groups[key]) {
        groups[key] = {
          key: key,
          academic_year: mapping.academic_year,
          class_name: mapping.class_name,
          section_name: mapping.section_name,
          children: [],
        };
      }
      groups[key].children.push({
        id: mapping.id,
        subject_name: mapping.subject_name,
        teacher_name: mapping.teacher_name,
        role: mapping.role || 'N/A',
      });
    });

    return Object.values(groups);
  }, [mappings, selectedYear, selectedClass, selectedSection]);

  const handlePdfDownload = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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
        const y = (pageHeight - imgHeight) / 2;
        doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
        doc.addImage(logoImg, 'PNG', x, y, imgWidth, imgHeight);
        doc.setGState(new (doc as any).GState({ opacity: 1 }));
    };

    const addHeader = () => {
        doc.setFontSize(18);
        doc.text(schoolDetails?.school_name || 'School Report', pageWidth / 2, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.text(schoolDetails?.address || '', pageWidth / 2, 28, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Class & Teacher Report', pageWidth / 2, 40, { align: 'center' });
    };

    let lastY = 45;

    groupedData.forEach((group, index) => {
        if (index > 0) doc.addPage();
        
        addWatermark();
        addHeader();
        
        const headerText = `Academic Year: ${group.academic_year} | Class: ${group.class_name} | Section: ${group.section_name}`;
        
        autoTable(doc, {
            startY: index === 0 ? 50 : 45,
            head: [[{ content: headerText, colSpan: 3, styles: { halign: 'center', fillColor: [240, 240, 240], textColor: 0 }}]],
            body: group.children.map(child => [child.subject_name, child.teacher_name, child.role]),
            columns: [
              { header: 'Subject', dataKey: 'subject' },
              { header: 'Assigned Teacher', dataKey: 'teacher' },
              { header: 'Role', dataKey: 'role' },
            ],
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133], textColor: 255 },
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    addWatermark();
                    addHeader();
                }
            },
        });
        lastY = (doc as any).lastAutoTable.finalY;
    });

    if (groupedData.length === 0) {
        addHeader();
        addWatermark();
        doc.setFontSize(12);
        doc.text("No data available for the selected filters.", 14, 60);
    }
    
    doc.save('class-teacher-report.pdf');
  };

  const handleExcelDownload = () => {
    const wb = XLSX.utils.book_new();

    groupedData.forEach(group => {
        const sheetData = group.children.map(child => ({
            'Subject': child.subject_name,
            'Assigned Teacher': child.teacher_name,
            'Role': child.role,
        }));
        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.sheet_add_aoa(ws, [[`Academic Year: ${group.academic_year}`, `Class: ${group.class_name}`, `Section: ${group.section_name}`]], { origin: 'A1' });
        XLSX.utils.book_append_sheet(wb, ws, `${group.class_name}-${group.section_name}`.slice(0, 31));
    });

    XLSX.writeFile(wb, 'class-teacher-report.xlsx');
  };
  
  const handleHtmlDownload = () => {
    let htmlString = `
        <html>
            <head>
                <title>Class & Teacher Report</title>
                <style>
                    body { font-family: sans-serif; margin: 20px; }
                    .school-header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                    .school-header img { max-height: 80px; margin-bottom: 10px; }
                    .school-header h1 { margin: 0; }
                    .school-header p { margin: 0; color: #555; }
                    .report-title { text-align: center; font-size: 1.5em; margin-bottom: 20px; }
                    .report-container { margin-bottom: 20px; border: 1px solid #ccc; padding: 15px; page-break-inside: avoid; border-radius: 8px; }
                    .group-header { font-weight: bold; margin-bottom: 10px; background-color: #f2f2f2; padding: 8px; border-radius: 4px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #e9ecef; }
                </style>
            </head>
            <body>
                <div class="school-header">
                    ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo">` : ''}
                    <h1>${schoolDetails?.school_name || 'School Report'}</h1>
                    <p>${schoolDetails?.address || ''}</p>
                </div>
                <div class="report-title">Class & Teacher Report</div>`;

    groupedData.forEach(group => {
        htmlString += `
            <div class="report-container">
                <div class="group-header">
                    <span>Year: ${group.academic_year} | Class: ${group.class_name} | Section: ${group.section_name}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Subject</th>
                            <th>Assigned Teacher</th>
                            <th>Role</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.children.map(child => `
                            <tr>
                                <td>${child.subject_name}</td>
                                <td>${child.teacher_name}</td>
                                <td>${child.role}</td>
                            </tr>
                        `).join('')}
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
    a.download = 'class-teacher-report.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  const mainColumns = [
    {
      title: 'Academic Year',
      dataIndex: 'academic_year',
      key: 'academic_year',
    },
    {
      title: 'Class',
      dataIndex: 'class_name',
      key: 'class_name',
    },
    {
      title: 'Section',
      dataIndex: 'section_name',
      key: 'section_name',
    },
  ];

    const watermarkStyle: React.CSSProperties = {
        position: 'relative',
        ['--watermark-url' as any]: schoolDetails?.logo_url ? `url('${schoolDetails.logo_url}')` : '',
    };
    
    const watermarkBeforeStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'var(--watermark-url)',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: 'contain',
        opacity: 0.05,
        pointerEvents: 'none',
        zIndex: 1,
    } : {};


  const expandedRowRender = (record: GroupedMapping) => {
    const nestedColumns = [
      { title: 'Subject', dataIndex: 'subject_name', key: 'subject_name' },
      { title: 'Assigned Teacher', dataIndex: 'teacher_name', key: 'teacher_name' },
      { title: 'Role', dataIndex: 'role', key: 'role' },
    ];

    return (
        <div style={watermarkStyle}>
             <div style={watermarkBeforeStyle} />
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
      <Card>
        <Title level={4}>Class &amp; Teacher Report</Title>
        <Typography.Paragraph>
          This report shows all the subjects and their assigned teachers, grouped by class and section. Use the filters below to narrow down the results.
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
                  >
                      {uniqueYears.map(y => <Option key={y} value={y}>{y}</Option>)}
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
                      onChange={(value) => setSelectedSection(value)}
                      disabled={!selectedClass}
                  >
                      {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                  </Select>
              </Col>
          </Row>

        {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
        <Spin spinning={loading}>
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={mainColumns}
              dataSource={groupedData}
              rowKey="key"
              expandable={{
                expandedRowRender,
                rowExpandable: record => record.children && record.children.length > 0,
              }}
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
  );
};

export default ClassTeacherMappingView;


