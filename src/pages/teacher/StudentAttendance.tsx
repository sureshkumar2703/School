import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Table, message, Card, Space, Typography, Spin, Empty, Select, Row, Col, Alert } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import { 
    fetchAttendanceRequest,
    markForenoonAttendanceRequest,
    markAfternoonAttendanceRequest,
    type AttendanceRecord
} from '../../store/features/attendance/attendanceSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

type Status = 'Present' | 'Absent' | 'OD' | 'Late';

interface Student {
    id: string; 
    register_no: string;
    full_name: string;
    roll_no?: string;
}

interface AttendanceState {
    [studentId: string]: {
        fn: Status;
        an: Status;
    };
}

const StudentAttendance: React.FC = () => {
  const [attendanceDate] = useState(dayjs());
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
  const [isAfternoon, setIsAfternoon] = useState(dayjs().hour() >= 12);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { stats, loading: statsLoading, error: statsError } = useSelector((state: RootState) => state.teacherStats);
  const { attendance, loading: attendanceLoading } = useSelector((state: RootState) => state.attendance);

  useEffect(() => {
    const timer = setInterval(() => {
        const now = dayjs();
        setCurrentTime(now.format('hh:mm:ss A'));
        setIsAfternoon(now.hour() >= 12);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.organization_key && user?.full_name) {
        dispatch(fetchTeacherStatsRequest({
            organizationKey: user.organization_key,
            teacherName: user.full_name,
        }));
    }
  }, [dispatch, user]);

  const academicYearOptions = useMemo(() => stats.academicYears || [], [stats.academicYears]);

  useEffect(() => {
    if (academicYearOptions.length > 0 && !selectedYear) {
        const activeYear = stats.activeAcademicYear;
        if (activeYear && academicYearOptions.includes(activeYear)) {
            setSelectedYear(activeYear);
        } else {
            const sortedYears = [...academicYearOptions].sort((a, b) => b.localeCompare(a));
            setSelectedYear(sortedYears[0]);
        }
    }
  }, [academicYearOptions, stats.activeAcademicYear, selectedYear]);

  const classTeacherAssignment = useMemo(() => {
    if (!stats.allClassTeacherAssignments || !selectedYear) return null;
    return stats.allClassTeacherAssignments.find(a => a.academic_year === selectedYear);
  }, [stats.allClassTeacherAssignments, selectedYear]);
  
  useEffect(() => {
    const fetchStudentsAndAttendance = async () => {
      if (!classTeacherAssignment || !user?.organization_key) {
        setStudents([]);
        return;
      }
      
      const { class_name, section_name, academic_year } = classTeacherAssignment;

      setStudentsLoading(true);
      
      try {
        const { data: allocations, error: allocationError } = await supabase
            .from('class_section_allocations')
            .select('register_no, full_name, roll_no')
            .eq('organization_key', user.organization_key)
            .eq('class_name', class_name)
            .eq('section_name', section_name)
            .eq('academic_year', academic_year);

        if (allocationError) throw allocationError;
        const registerNumbers = allocations?.map(a => a.register_no).filter(Boolean) || [];
        let fetchedStudents: Student[] = [];
        if (registerNumbers.length > 0) {
             const { data: studentRecords, error: studentError } = await supabase
                .from('students')
                .select('id, register_no')
                .in('register_no', registerNumbers);
            if (studentError) throw studentError;
            const studentIdMap = new Map(studentRecords?.map(s => [s.register_no, s.id]));
            fetchedStudents = (allocations || []).map(alloc => ({
                id: studentIdMap.get(alloc.register_no) || '',
                register_no: alloc.register_no,
                full_name: alloc.full_name,
                roll_no: alloc.roll_no,
            })).filter(s => s.id);
        }
        fetchedStudents.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
        setStudents(fetchedStudents);

        if (fetchedStudents.length > 0) {
            const studentIds = fetchedStudents.map(s => s.id);
            dispatch(fetchAttendanceRequest({ date: attendanceDate.format('YYYY-MM-DD'), studentIds: studentIds }));
        } else {
            dispatch(fetchAttendanceRequest({ date: attendanceDate.format('YYYY-MM-DD'), studentIds: [] }));
        }
      } catch (error: any) {
        message.error(`Failed to fetch students: ${error.message}`);
        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    };
    fetchStudentsAndAttendance();
  }, [dispatch, classTeacherAssignment, attendanceDate, user?.organization_key]);

  useEffect(() => {
      const newAttendanceState: AttendanceState = {};
      students.forEach(student => {
        const record = attendance.find(att => att.student_id === student.id && att.date === attendanceDate.format('YYYY-MM-DD'));
        newAttendanceState[student.id] = {
            fn: (record?.forenoon_status as Status) || 'Present',
            an: (record?.afternoon_status as Status) || 'Present',
        };
      });
      setAttendanceState(newAttendanceState);
  }, [attendance, students, attendanceDate]);
  
  const handleStatusChange = (studentId: string, session: 'fn' | 'an', status: Status) => {
    setAttendanceState(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { fn: 'Present', an: 'Present' }), [session]: status }
    }));
  };

  const isDayComplete = useMemo(() => {
    if (students.length === 0 || attendance.length === 0) return false;
    return students.every(student => {
        const record = attendance.find(att => att.student_id === student.id);
        return record && record.forenoon_status && record.afternoon_status;
    });
  }, [students, attendance]);

  const handleSubmitForenoon = () => {
    if (!classTeacherAssignment || !user?.organization_key) return;
    
    const attendanceData = students.map(student => ({
      student_id: student.id,
      organization_key: user.organization_key!,
      date: attendanceDate.format('YYYY-MM-DD'),
      class: classTeacherAssignment.class_name,
      section: classTeacherAssignment.section_name,
      academic_year: classTeacherAssignment.academic_year,
      roll_no: student.roll_no,
      register_no: student.register_no,
      name: student.full_name,
      forenoon_status: attendanceState[student.id]?.fn || 'Present',
    }));
    dispatch(markForenoonAttendanceRequest(attendanceData));
  };

  const handleSubmitAfternoon = () => {
    if (!classTeacherAssignment || !user?.organization_key) return;

    const attendanceData = students.map(student => ({
      student_id: student.id,
      organization_key: user.organization_key!,
      date: attendanceDate.format('YYYY-MM-DD'),
      class: classTeacherAssignment.class_name,
      section: classTeacherAssignment.section_name,
      academic_year: classTeacherAssignment.academic_year,
      roll_no: student.roll_no,
      register_no: student.register_no,
      name: student.full_name,
      afternoon_status: attendanceState[student.id]?.an || 'Present',
    }));
    dispatch(markAfternoonAttendanceRequest(attendanceData));
  };

  const statusOptions = [
    { label: 'Present', value: 'Present' },
    { label: 'Absent', value: 'Absent' },
    { label: 'OD (On Duty)', value: 'OD' },
    { label: 'Late', value: 'Late' },
  ];

  const columns = [
    { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', width: 100, render: (text: string) => text || 'N/A' },
    { title: 'Register No', dataIndex: 'register_no', key: 'register_no', width: 120 },
    { title: 'Full Name', dataIndex: 'full_name', key: 'full_name', width: 180 },
    {
      title: 'Forenoon (FN)', key: 'fn', width: 150,
      render: (_: any, record: Student) => (
        <Select
            value={attendanceState[record.id]?.fn || 'Present'}
            onChange={(value) => handleStatusChange(record.id, 'fn', value as Status)}
            style={{ width: '100%' }}
            disabled={isAfternoon || isDayComplete}
        >
            {statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
        </Select>
      ),
    },
    {
      title: 'Afternoon (AN)', key: 'an', width: 150,
      render: (_: any, record: Student) => (
        <Select
            value={attendanceState[record.id]?.an || 'Present'}
            onChange={(value) => handleStatusChange(record.id, 'an', value as Status)}
            style={{ width: '100%' }}
            disabled={!isAfternoon || isDayComplete}
        >
            {statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
        </Select>
      ),
    },
  ];

  const isLoading = statsLoading || studentsLoading || attendanceLoading;
  const finalError = statsError;

  if (statsLoading) {
      return <Spin tip="Checking your assignments..." fullscreen />;
  }

  if (finalError) {
      return <Alert message="Error" description={finalError} type="error" showIcon />;
  }

  return (
    <Card>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col xs={24} md={12}>
                 <Title level={4} style={{ margin: 0 }}>Take Student Attendance</Title>
                 <Text type="secondary" style={{fontSize: 16}}>Date: {attendanceDate.format('MMMM D, YYYY')}</Text>
            </Col>
             <Col xs={24} md={12} style={{textAlign: 'right'}}>
                <Space direction="vertical" align="end">
                    {currentTime && <Text strong style={{ fontSize: '16px' }}>{currentTime}</Text>}
                     <Select
                        value={selectedYear}
                        onChange={setSelectedYear}
                        placeholder="Select Academic Year"
                        style={{ minWidth: 200 }}
                        loading={statsLoading}
                        allowClear
                    >
                        {academicYearOptions.map(year => (
                            <Option key={year} value={year}>
                                {year}{year === stats.activeAcademicYear && " (Current)"}
                            </Option>
                        ))}
                    </Select>
                </Space>
            </Col>
        </Row>
        
        {classTeacherAssignment ? (
            <>
                <Row justify="space-between" align="middle" style={{ marginTop: 8, marginBottom: 24 }}>
                    <Col>
                        <Text strong style={{fontSize: 16}}>
                            Class: {classTeacherAssignment.class_name} - {classTeacherAssignment.section_name} ({classTeacherAssignment.academic_year})
                        </Text>
                    </Col>
                </Row>
                <Spin spinning={isLoading}>
                    <>
                        {isDayComplete && (
                            <Alert
                                message="Attendance Complete"
                                description="Attendance for today has already been fully submitted. You can view the records in the attendance report."
                                type="success"
                                showIcon
                                style={{ marginBottom: 16 }}
                            />
                        )}
                        <div style={{ overflowX: 'auto' }}>
                            <Table columns={columns} dataSource={students} rowKey="id" pagination={false} bordered scroll={{ x: 'max-content' }} />
                        </div>
                        <Space style={{ marginTop: 16 }}>
                            <Button type="primary" onClick={handleSubmitForenoon} loading={attendanceLoading} disabled={isAfternoon || isDayComplete}>Submit Forenoon</Button>
                            <Button type="primary" onClick={handleSubmitAfternoon} loading={attendanceLoading} disabled={!isAfternoon || isDayComplete}>Submit Afternoon</Button>
                        </Space>
                    </>
                </Spin>
            </>
        ) : (
            <Empty description={
                <Text>
                    This page is for Class Teachers only.
                    <br/>
                    You are not assigned as a Class Teacher for the selected academic year ({selectedYear || 'N/A'}).
                </Text>
            } style={{marginTop: '40px'}}/>
        )}
    </Card>
  );
};

export default StudentAttendance;