import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Table, Card, Typography, Tag, Row, Col, Empty, Spin, message, Alert } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllClassSectionsRequest, type ClassSectionAllocation } from '../../store/features/class-sections-view/classSectionsViewSlice';
import { fetchAttendanceRequest, updateSingleAttendanceRequest, type AttendanceRecord } from '../../store/features/attendance/attendanceSlice';
import dayjs from 'dayjs';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text } = Typography;
const { Option } = Select;

const PresentDayAttendance: React.FC = () => {
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [today] = useState(dayjs());

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { allocations, loading: allocationsLoading } = useSelector((state: RootState) => state.classSectionsView);
    const { attendance, loading: attendanceLoading } = useSelector((state: RootState) => state.attendance);
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
    
    useEffect(() => {
        if (selectedClass && selectedSection && selectedYear && user?.organization_key) {
            dispatch(fetchAttendanceRequest({
                organizationKey: user.organization_key,
                date: today.format('YYYY-MM-DD'),
                className: selectedClass,
                sectionName: selectedSection,
                academicYear: selectedYear,
            }));
        }
    }, [dispatch, selectedClass, selectedSection, selectedYear, user?.organization_key, today]);

    useEffect(() => {
        if (!selectedClass || !selectedSection || !selectedYear || !user?.organization_key) {
            return;
        }

        const channel = supabase
            .channel('student-attendance-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'student_attendance',
                    filter: `organization_key=eq.${user.organization_key}`
                },
                () => {
                     dispatch(fetchAttendanceRequest({
                        organizationKey: user.organization_key!,
                        date: today.format('YYYY-MM-DD'),
                        className: selectedClass,
                        sectionName: selectedSection,
                        academicYear: selectedYear,
                    }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [dispatch, selectedClass, selectedSection, selectedYear, user?.organization_key, today]);

    const uniqueYears = useMemo(() => [...new Set(allocations.map(a => a.academic_year))], [allocations]);
    
    const uniqueClasses = useMemo(() => {
        if (!selectedYear) return [];
        return [...new Set(allocations.filter(a => a.academic_year === selectedYear).map(a => a.class_name))];
    }, [allocations, selectedYear]);

    const uniqueSections = useMemo(() => {
        if (!selectedClass || !selectedYear) return [];
        return [...new Set(allocations.filter(a => a.academic_year === selectedYear && a.class_name === selectedClass).map(a => a.section_name))];
    }, [allocations, selectedYear, selectedClass]);
    
    const studentsForSelectedClass = useMemo(() => {
        if (!selectedClass || !selectedSection || !selectedYear) return [];
        return allocations.filter(a => 
            a.class_name === selectedClass && 
            a.section_name === selectedSection && 
            a.academic_year === selectedYear
        ).sort((a,b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
    }, [allocations, selectedClass, selectedSection, selectedYear]);

    const attendanceMap = useMemo(() => {
        const map = new Map<string, AttendanceRecord>();
        attendance.forEach(record => {
            if (record.student_id) {
                map.set(record.student_id, record);
            }
        });
        return map;
    }, [attendance]);
    
    const handleStatusChange = (student: ClassSectionAllocation, session: 'forenoon_status' | 'afternoon_status', value: string) => {
        if (!student.student_id) {
            message.error("Cannot update attendance: Student ID is missing.");
            return;
        }

        const existingRecord = attendanceMap.get(student.student_id);
        const forenoonStatus = session === 'forenoon_status' ? value : (existingRecord?.forenoon_status || 'Present');
        const afternoonStatus = session === 'afternoon_status' ? value : (existingRecord?.afternoon_status || 'Present');
        
        const negativeStatuses = ['Absent', 'Cancel'];
        let finalStatus: 'Present' | 'Absent' = 'Present';
        if (negativeStatuses.includes(forenoonStatus as string) || negativeStatuses.includes(afternoonStatus as string)) {
            finalStatus = 'Absent';
        }
        
        dispatch(updateSingleAttendanceRequest({
            student_id: student.student_id,
            date: today.format('YYYY-MM-DD'),
            attendace_status: finalStatus,
            forenoon_status: forenoonStatus,
            afternoon_status: afternoonStatus,
        }));
    };

    const statusOptions = [
        { label: 'Present', value: 'Present' },
        { label: 'Absent', value: 'Absent' },
        { label: 'OD', value: 'OD' },
        { label: 'Late', value: 'Late' },
    ];

    const columns = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', width: 100, render: (text: string) => text || 'N/A' },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no', width: 150 },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name', width: 200 },
        { 
            title: 'Forenoon', 
            key: 'forenoon',
            width: 150,
            render: (_: any, record: ClassSectionAllocation) => {
                const attRecord = record.student_id ? attendanceMap.get(record.student_id) : undefined;
                return (
                    <Select
                        value={attRecord?.forenoon_status || 'Present'}
                        onChange={(val) => handleStatusChange(record, 'forenoon_status', val)}
                        style={{ width: '100%' }}
                        loading={attendanceLoading}
                    >
                        {statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                    </Select>
                );
            },
        },
        { 
            title: 'Afternoon', 
            key: 'afternoon',
            width: 150,
            render: (_: any, record: ClassSectionAllocation) => {
                const attRecord = record.student_id ? attendanceMap.get(record.student_id) : undefined;
                 return (
                    <Select
                        value={attRecord?.afternoon_status || 'Present'}
                        onChange={(val) => handleStatusChange(record, 'afternoon_status', val)}
                        style={{ width: '100%' }}
                        loading={attendanceLoading}
                    >
                        {statusOptions.map(opt => <Option key={opt.value} value={opt.value}>{opt.label}</Option>)}
                    </Select>
                );
            },
        },
        { 
            title: 'Overall Status', 
            key: 'overall',
            width: 120,
            render: (_: any, record: ClassSectionAllocation) => {
                const attRecord = record.student_id ? attendanceMap.get(record.student_id) : undefined;
                if (!attRecord || !attRecord.attendace_status) return <Tag>Pending</Tag>;
                const color = attRecord.attendace_status === 'Present' ? 'success' : 'error';
                return <Tag color={color}>{attRecord.attendace_status}</Tag>;
            },
        },
    ];
    
    const isLoading = allocationsLoading || attendanceLoading || calendarsLoading;
    const showTable = selectedClass && selectedSection && selectedYear;

    const watermarkStyle: React.CSSProperties = {
      position: 'relative',
      '--watermark-url': schoolDetails?.logo_url ? `url('${schoolDetails.logo_url}')` : '',
    } as React.CSSProperties;

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
                <Title level={4}>Present Day Attendance</Title>
                <Text type="secondary" style={{display: 'block', marginBottom: 24}}>Date: {today.format('MMMM D, YYYY')}</Text>
                
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                        <Select showSearch allowClear placeholder="Select Academic Year" style={{ width: '100%' }} value={selectedYear} onChange={(val) => { setSelectedYear(val); setSelectedClass(null); setSelectedSection(null); }}>
                            {uniqueYears.map(y => <Option key={y} value={y}>{y}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={8}>
                        <Select showSearch allowClear placeholder="Select Class" style={{ width: '100%' }} value={selectedClass} onChange={(val) => { setSelectedClass(val); setSelectedSection(null); }} disabled={!selectedYear}>
                            {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={8}>
                        <Select showSearch allowClear placeholder="Select Section" style={{ width: '100%' }} value={selectedSection} onChange={setSelectedSection} disabled={!selectedClass}>
                            {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                        </Select>
                    </Col>
                </Row>

                <Spin spinning={isLoading}>
                    <div 
                        className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                        style={watermarkStyle}
                    >
                        {showTable ? (
                            <Table
                                columns={columns}
                                dataSource={studentsForSelectedClass}
                                rowKey="id"
                                bordered
                                scroll={{ x: 'max-content' }}
                            />
                        ) : (
                            <Empty description="Please select an academic year, class, and section to view today's attendance." />
                        )}
                    </div>
                </Spin>
            </Card>
        </>
    );
};

export default PresentDayAttendance;