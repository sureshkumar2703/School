

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Empty, Button, message, Input } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllClassSectionsRequest, type ClassSectionAllocation } from '../../store/features/class-sections-view/classSectionsViewSlice';
import { generateRollNosRequest } from '../../store/features/roll-no/rollNoSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title, Text, Link } = Typography;
const { Option } = Select;

const RollNoCreate: React.FC = () => {
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [rollNoState, setRollNoState] = useState<Record<string, string>>({});


  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { allocations, loading, error } = useSelector((state: RootState) => state.classSectionsView);
  const { loading: rollNoLoading } = useSelector((state: RootState) => state.rollNo);
  const { calendars: academicYears } = useSelector((state: RootState) => state.academicCalendar);
  const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);


  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchAllClassSectionsRequest(user.organization_key));
      dispatch(fetchAcademicCalendarsRequest(user.organization_key));
      dispatch(fetchSchoolDetailsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  const uniqueClasses = useMemo(() => [...new Set(allocations.map(m => m.class_name))], [allocations]);
  
  const uniqueSections = useMemo(() => {
    if (!selectedClass) return [];
    return [...new Set(allocations.filter(m => m.class_name === selectedClass).map(m => m.section_name))];
  }, [allocations, selectedClass]);

  const uniqueYears = useMemo(() => {
      if (!selectedClass || !selectedSection) return [];
      return [...new Set(allocations.filter(m => m.class_name === selectedClass && m.section_name === selectedSection).map(m => m.academic_year))];
  }, [allocations, selectedClass, selectedSection]);

  useEffect(() => {
    if (uniqueYears.length > 0) {
        const currentYear = academicYears.find(cal => cal.is_current)?.academic_year;
        if (currentYear && uniqueYears.includes(currentYear)) {
            setSelectedYear(currentYear);
        } else if (uniqueYears.length === 1) {
            // If only one year is available, select it by default
            setSelectedYear(uniqueYears[0]);
        }
    } else {
        setSelectedYear(null);
    }
  }, [uniqueYears, academicYears]);


  const filteredData = useMemo(() => {
    if (!selectedClass || !selectedSection || !selectedYear) return [];
    
    return allocations.filter(alloc => 
        alloc.class_name === selectedClass &&
        alloc.section_name === selectedSection &&
        alloc.academic_year === selectedYear
    ).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  }, [allocations, selectedClass, selectedSection, selectedYear]);
  
  const generateRollNo = (student: ClassSectionAllocation, index: number): string => {
      if (!selectedClass || !selectedSection || !selectedYear) return '';
      
      const classPartMatch = selectedClass.match(/\d+/);
      const classPart = classPartMatch ? classPartMatch[0] : 'XX';

      const sectionCode = selectedSection.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0) + 1;
      const sectionPart = isNaN(sectionCode) ? 'X' : sectionCode.toString();
      
      const yearPartMatch = selectedYear.match(/(\d{4})/);
      const yearPart = yearPartMatch ? yearPartMatch[1].substring(2, 4) : 'XX';

      const serialPart = (index + 1).toString().padStart(3, '0');

      return `${classPart}${sectionPart}${yearPart}${serialPart}`;
  };

  useEffect(() => {
      const initialRollNos: Record<string, string> = {};
      filteredData.forEach((student, index) => {
          if (student.id) {
              initialRollNos[student.id] = student.roll_no || generateRollNo(student, index);
          }
      });
      setRollNoState(initialRollNos);
  }, [filteredData]);

  const handleRollNoChange = (studentId: string, value: string) => {
      setRollNoState(prevState => ({
          ...prevState,
          [studentId]: value,
      }));
  };

  const handleGenerateClick = () => {
    const studentsToProcess = filteredData.filter(student => student.id && !student.roll_no);
    if (studentsToProcess.length === 0) {
        message.warning("No students to generate roll numbers for. They may already exist.");
        return;
    }
    
    const updates = studentsToProcess.map((student, index) => ({
        ...student,
        roll_no: rollNoState[student.id] || generateRollNo(student, index),
        status: 'Active' as const,
    }));

    dispatch(generateRollNosRequest(updates));
  };
  
  const columns: ColumnsType<ClassSectionAllocation> = [
    { 
      title: 'Generated Roll No', 
      key: 'generated_roll_no',
      render: (_text, record, index) => (
          <Input 
              value={rollNoState[record.id] || generateRollNo(record, index)}
              onChange={(e) => handleRollNoChange(record.id, e.target.value)}
          />
      )
    },
    { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
    { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
    { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
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
  
  const rollNosAlreadyExist = useMemo(() => {
    if (filteredData.length === 0) return false;
    return filteredData.every(student => student.roll_no);
  }, [filteredData]);
  
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
        <Title level={4}>Roll Number Creation</Title>
        <Typography.Paragraph>
          Select a class, section, and academic year to view the list of allocated students and preview their generated roll numbers.
        </Typography.Paragraph>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} md={8}>
                <Select showSearch allowClear placeholder="Select Class" style={{ width: '100%' }} value={selectedClass} onChange={handleClassChange} loading={loading}>
                    {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            </Col>
            <Col xs={24} md={8}>
                <Select showSearch allowClear placeholder="Select Section" style={{ width: '100%' }} value={selectedSection} onChange={handleSectionChange} disabled={!selectedClass}>
                    {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                </Select>
            </Col>
            <Col xs={24} md={8}>
                <Select showSearch allowClear placeholder="Select Academic Year" style={{ width: '100%' }} value={selectedYear} onChange={setSelectedYear} disabled={!selectedSection}>
                    {uniqueYears.map(y => <Option key={y} value={y}>{y}</Option>)}
                </Select>
            </Col>
        </Row>

        {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
        <Spin spinning={loading || rollNoLoading}>
          <div 
              className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
              style={watermarkStyle}
          >
          {showTable ? (
              rollNosAlreadyExist ? (
                  <Alert
                      message="Roll Numbers Already Exist"
                      description={
                          <span>
                              Roll numbers have already been generated for this class. To view or manage them, please go to the{' '}
                              <Link onClick={() => dispatch(setCurrentPage('rollnohistory'))}>Roll No. History</Link> page.
                          </span>
                      }
                      type="info"
                      showIcon
                  />
              ) : (
                  <>
                      <div style={{ overflowX: 'auto' }}>
                          <Table
                              columns={columns}
                              dataSource={filteredData}
                              rowKey="id"
                              bordered
                              pagination={false}
                              scroll={{ x: 'max-content' }}
                          />
                      </div>
                      <Button 
                          type="primary" 
                          onClick={handleGenerateClick} 
                          disabled={filteredData.length === 0}
                          loading={rollNoLoading}
                          style={{ marginTop: 24 }}
                      >
                          Generate & Save for All Students ({filteredData.filter(s => !s.roll_no).length})
                      </Button>
                  </>
              )
          ) : (
            <Empty description="Please make a selection to view students." />
          )}
          </div>
        </Spin>
      </Card>
    </>
  );
};

export default RollNoCreate;
