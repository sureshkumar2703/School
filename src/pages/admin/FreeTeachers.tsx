
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Tag, Space, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeachersRequest, type Teacher } from '../../store/features/teachers/teachersSlice';
import { fetchTimetablesHistoryRequest } from '../../store/features/timetable-history/timetableHistorySlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

const FreeTeachers: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { teachers, loading: teachersLoading } = useSelector((state: RootState) => state.teachers);
    const { timetables, loading: timetablesLoading } = useSelector((state: RootState) => state.timetableHistory);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedDay, setSelectedDay] = useState<Day>('Monday');
    const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

    // Effect to set the default day to the system current day on mount
    useEffect(() => {
        const todayName = dayjs().format('dddd');
        const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        if (days.includes(todayName as Day)) {
            setSelectedDay(todayName as Day);
        } else {
            setSelectedDay('Monday'); // Default to Monday if Sunday
        }
    }, []);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeachersRequest(user.organization_key));
            dispatch(fetchTimetablesHistoryRequest(user.organization_key));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
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

    const freeTeachers = useMemo(() => {
        if (!selectedYear || !selectedDay || selectedPeriod === undefined) return [];

        // 1. Get names of all teachers assigned to any class during the selected day/period
        const assignedTeacherNames = new Set<string>();
        
        // Ensure strictly comparable types by casting to Number
        const targetPeriod = Number(selectedPeriod);

        timetables
            .filter(tt => tt.academic_year === selectedYear)
            .forEach(tt => {
                if (tt.timetable_data && Array.isArray(tt.timetable_data)) {
                    tt.timetable_data.forEach(entry => {
                        if (entry.day === selectedDay && Number(entry.period) === targetPeriod && entry.teacher_name) {
                            assignedTeacherNames.add(entry.teacher_name.trim());
                        }
                    });
                }
            });

        // 2. Identify teachers who are NOT in that set
        return teachers.filter(teacher => 
            teacher.status === 'Active' && 
            teacher.full_name && 
            !assignedTeacherNames.has(teacher.full_name.trim())
        );
    }, [teachers, timetables, selectedYear, selectedDay, selectedPeriod]);

    const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Comprehensive list of periods including extra classes
    const periodOptions = [
        { label: 'Morning Extra (0)', value: 0 },
        { label: 'Period 1', value: 1 },
        { label: 'Period 2', value: 2 },
        { label: 'Period 3', value: 3 },
        { label: 'Period 4', value: 4 },
        { label: 'Period 5', value: 5 },
        { label: 'Period 6', value: 6 },
        { label: 'Period 7', value: 7 },
        { label: 'Period 8', value: 8 },
        { label: 'Evening Extra (99)', value: 99 },
    ];

    const columns: ColumnsType<Teacher> = [
        {
            title: 'Staff Code',
            dataIndex: 'staff_code',
            key: 'staff_code',
            width: 120,
        },
        {
            title: 'Teacher Name',
            dataIndex: 'full_name',
            key: 'full_name',
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: 'Subjects Handled',
            dataIndex: 'subjects_handled',
            key: 'subjects_handled',
            render: (subjects: string[]) => (
                <Space wrap>
                    {subjects && Array.isArray(subjects) && subjects.length > 0 ? 
                        subjects.map(s => <Tag key={s} color="blue">{s}</Tag>) : 
                        <Text type="secondary">N/A</Text>
                    }
                </Space>
            ),
        },
    ];

    const isLoading = teachersLoading || timetablesLoading || calendarsLoading;

    return (
        <Card>
            <Title level={4}>Free Teachers Report</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Identify which teachers are available during a specific day and time slot.
            </Text>

            <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
                <Col xs={24} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Academic Year</Text>
                    <Select
                        placeholder="Select Year"
                        style={{ width: '100%' }}
                        value={selectedYear}
                        onChange={setSelectedYear}
                        loading={calendarsLoading}
                        allowClear
                    >
                        {calendars.map(c => (
                            <Option key={c.id} value={c.academic_year}>
                                {c.academic_year}{c.is_current && " (Current)"}
                            </Option>
                        ))}
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Day</Text>
                    <Select
                        style={{ width: '100%' }}
                        value={selectedDay}
                        onChange={setSelectedDay}
                    >
                        {days.map(day => <Option key={day} value={day}>{day}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} sm={12} md={8}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Period</Text>
                    <Select
                        style={{ width: '100%' }}
                        value={selectedPeriod}
                        onChange={(val) => setSelectedPeriod(val)}
                    >
                        {periodOptions.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
                    </Select>
                </Col>
            </Row>

            <Spin spinning={isLoading}>
                {selectedYear ? (
                    <>
                        <div style={{ marginBottom: 16 }}>
                            <Text strong>Found {freeTeachers.length} free teachers</Text>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <Table
                                columns={columns}
                                dataSource={freeTeachers}
                                rowKey="id"
                                bordered
                                pagination={{ pageSize: 10 }}
                                locale={{
                                    emptyText: <Empty description="No free teachers found for this slot or data not available." />
                                }}
                            />
                        </div>
                    </>
                ) : (
                    <Empty description="Please select an academic year to view the report." />
                )}
            </Spin>
        </Card>
    );
};

export default FreeTeachers;
