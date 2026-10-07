

import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Button, Table, message, Card, Space, Typography, Row, Col } from 'antd';
import { promoteStudentsRequest } from '../../store/features/student-promotions/studentPromotionsSlice';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { fetchStudentsRequest, type Student } from '../../store/features/students/studentsSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import type { RootState, AppDispatch } from '../../store/store';

const { Title } = Typography;
const { Option } = Select;

// Helper to extract the first number from a class string (e.g., "Class 6" -> 6)
const extractClassNumber = (className: string | undefined | null): number | null => {
    if (!className) return null;
    const match = className.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
};


const StudentPromotion: React.FC = () => {
  const [fromClass, setFromClass] = useState<string | null>(null);
  const [toClass, setToClass] = useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<React.Key[]>([]);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { students, loading } = useSelector((state: RootState) => state.students);
  const { classes } = useSelector((state: RootState) => state.classes);
  const { loading: promotionLoading } = useSelector((state: RootState) => state.studentPromotions);
  const { calendars } = useSelector((state: RootState) => state.academicCalendar);

  useEffect(() => {
    if (user?.organization_key) {
        dispatch(fetchStudentsRequest(user.organization_key));
        dispatch(fetchClassesRequest());
        dispatch(fetchAcademicCalendarsRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);
  
  const currentAcademicYear = useMemo(() => {
    return calendars.find(c => c.is_current)?.academic_year;
  }, [calendars]);

  useEffect(() => {
    if (calendars.length > 0 && !selectedYear) {
      const currentYear = calendars.find(c => c.is_current)?.academic_year;
      if (currentYear) {
        setSelectedYear(currentYear);
      }
    }
  }, [calendars, selectedYear]);

  const fromClassOptions = useMemo(() => {
    if (!students || !selectedYear) return [];
    
    return [...new Set(students
        .filter(s => s.academic_year === selectedYear)
        .map(s => s.admitted_class)
        .filter(Boolean))] as string[];
  }, [students, selectedYear]);

  const toClassOptions = useMemo(() => {
    const activeClassNames = [...new Set(classes.filter(c => c.status === 'Active').map(c => c.class_name))];

    if (!fromClass) {
        return activeClassNames;
    }
    
    const fromClassNumber = extractClassNumber(fromClass);
    if (fromClassNumber === null) return activeClassNames; // If no number, show all

    return activeClassNames.filter(className => {
        const toClassNumber = extractClassNumber(className);
        return toClassNumber !== null && toClassNumber > fromClassNumber;
    });
  }, [classes, fromClass]);
  
   useEffect(() => {
    if (fromClass && toClassOptions.length > 0) {
      const fromClassNumber = extractClassNumber(fromClass);
      if (fromClassNumber !== null) {
        // Find the class that is exactly one level higher
        const nextClass = toClassOptions.find(
          (c) => extractClassNumber(c) === fromClassNumber + 1
        );
        setToClass(nextClass || null); // Auto-select it, or reset if not found
      }
    } else {
        setToClass(null); // Reset if fromClass is cleared
    }
  }, [fromClass, toClassOptions]);


  const studentsInClass = (selectedYear && fromClass)
    ? students.filter(s => s.academic_year === selectedYear && s.admitted_class === fromClass) 
    : [];

  const handlePromote = () => {
    if (!toClass || !currentAcademicYear || selectedStudents.length === 0) {
      message.error("Please select students, a destination class, and ensure a current academic year is set.");
      return;
    }
    dispatch(promoteStudentsRequest({ studentIds: selectedStudents as string[], newClass: toClass, newAcademicYear: currentAcademicYear }));
    message.success(`${selectedStudents.length} student(s) promoted to ${toClass} for the ${currentAcademicYear} academic year.`);
    setSelectedStudents([]);
    setFromClass(null);
    setToClass(null);
  };
  
  const rowSelection = {
    selectedRowKeys: selectedStudents,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedStudents(selectedRowKeys);
    },
  };
  
  const columns = [
    { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
    { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Current Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
  ];

  return (
    <Card>
      <Title level={4}>Student Promotion</Title>
        <Row gutter={[16, 16]} align="bottom">
            <Col xs={24} md={6}>
                <Typography.Text>Academic Year</Typography.Text>
                <Select
                    placeholder="Select Year"
                    onChange={value => { setSelectedYear(value); setFromClass(null); setToClass(null); setSelectedStudents([]); }}
                    style={{ width: '100%' }}
                    value={selectedYear}
                    loading={!calendars || calendars.length === 0}
                >
                    {calendars.map(c => <Option key={c.id} value={c.academic_year}>{c.academic_year}{c.is_current ? ' (Current)' : ''}</Option>)}
                </Select>
            </Col>
            <Col xs={24} md={6}>
                <Typography.Text>Promote From</Typography.Text>
                <Select
                    placeholder="Select class"
                    onChange={value => { setFromClass(value); setToClass(null); setSelectedStudents([]); }}
                    style={{ width: '100%' }}
                    value={fromClass}
                    disabled={!selectedYear}
                    >
                    {fromClassOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            </Col>
            <Col xs={24} md={6}>
                 <Typography.Text>Promote To</Typography.Text>
                <Select
                    placeholder="Select class"
                    onChange={setToClass}
                    style={{ width: '100%' }}
                    value={toClass}
                    disabled={!fromClass}
                    >
                    {toClassOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
            </Col>
            <Col xs={24} md={6}>
                <Button
                    type="primary"
                    onClick={handlePromote}
                    disabled={selectedStudents.length === 0 || !toClass || !currentAcademicYear}
                    loading={promotionLoading}
                    block
                >
                    Promote Selected ({selectedStudents.length})
                </Button>
            </Col>
        </Row>

      {fromClass && (
        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={studentsInClass}
          rowKey="id"
          loading={loading}
          bordered
          style={{ marginTop: 24 }}
          scroll={{ x: 'max-content' }}
        />
      )}
    </Card>
  );
};

export default StudentPromotion;
