

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Select, Row, Col, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherTimetableDataRequest, type ClassTimetable, type TimetableEntry } from '../../store/features/teacher-timetable/teacherTimetableSlice';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';

const { Title, Text } = Typography;
const { Option } = Select;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

interface PersonalPeriod extends TimetableEntry {
    class_name: string;
    section_name: string;
    time: string;
}

const PersonalTimetable: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetables, loading: timetableLoading, error: timetableError } = useSelector((state: RootState) => state.teacherTimetable);
    const { calendars, loading: dashboardLoading, error: dashboardError } = useSelector((state: RootState) => state.teacherDashboard);
    
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const academicYears = useMemo(() => calendars.filter(cal => cal.status === 'Active'), [calendars]);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchTeacherTimetableDataRequest({organizationKey: user.organization_key}));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (academicYears && academicYears.length > 0 && !selectedYear) {
            const currentYear = academicYears.find(y => y.is_current)?.academic_year;
            setSelectedYear(currentYear || academicYears[0].academic_year);
        }
    }, [academicYears, selectedYear]);

    const personalSchedule = useMemo(() => {
        if (!timetables || !user?.full_name || !selectedYear) {
            return [];
        }

        const myPeriods: PersonalPeriod[] = [];
        const dayOrder: { [key in Day]: number } = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

        const relevantTimetables = timetables.filter(tt => tt.academic_year === selectedYear);

        relevantTimetables.forEach(tt => {
            const timeSlots = tt.number_of_periods === 4 ? [
                { period: 0, time: '08:15 - 09:00' }, { period: 1, time: '09:15 - 10:45' },
                { period: 2, time: '11:00 - 12:30' }, { period: 3, time: '01:15 - 02:45' },
                { period: 4, time: '03:00 - 04:30' }, { period: 99, time: '04:30 - 05:15' }
            ] : [
                { period: 0, time: '08:15 - 09:00' }, { period: 1, time: '09:15 - 10:00' }, 
                { period: 2, time: '10:00 - 10:45' }, { period: 3, time: '11:00 - 11:45' }, 
                { period: 4, time: '11:45 - 12:30' }, { period: 5, time: '01:15 - 02:00' },
                { period: 6, time: '02:00 - 02:45' }, { period: 7, time: '03:00 - 03:45' },
                { period: 8, time: '03:45 - 04:30' }, { period: 99, time: '04:30 - 05:15' }
            ];
            const timeMap = new Map(timeSlots.map(s => [s.period, s.time]));

            tt.timetable_data.forEach(entry => {
                if (entry.teacher_name === user.full_name) {
                    myPeriods.push({
                        ...entry,
                        class_name: tt.class_name,
                        section_name: tt.section_name,
                        time: timeMap.get(entry.period) || 'N/A'
                    });
                }
            });
        });

        // Sort the periods by day and then by the period number
        return myPeriods.sort((a, b) => {
            const dayDiff = dayOrder[a.day] - dayOrder[b.day];
            if (dayDiff !== 0) return dayDiff;
            return a.period - b.period;
        });

    }, [timetables, user?.full_name, selectedYear]);

    const loading = dashboardLoading || timetableLoading;
    const error = dashboardError || timetableError;

    if (loading && timetables.length === 0) return <Spin tip="Loading your timetable..." fullscreen />;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;

    const columns: ColumnsType<PersonalPeriod> = [
        {
            title: 'Day',
            dataIndex: 'day',
            key: 'day',
            render: (day: string) => <Text strong>{day}</Text>,
            onCell: (_, index) => {
                if (!personalSchedule || index === undefined || !personalSchedule[index]) return {};
                const rowSpan = personalSchedule.filter(r => r.day === personalSchedule[index!].day).length;
                if (personalSchedule.findIndex(r => r.day === personalSchedule[index!].day) === index) {
                    return { rowSpan };
                }
                return { rowSpan: 0 };
            },
        },
        {
            title: 'Time',
            dataIndex: 'time',
            key: 'time',
             render: (time: string, record: PersonalPeriod) => {
                let label = `Period ${record.period}`;
                if (record.period === 0) label = 'Morning Extra';
                if (record.period === 99) label = 'Evening Extra';
                return (
                    <div>
                        <Text>{time}</Text><br/>
                        <Text type="secondary" style={{fontSize: 12}}>{label}</Text>
                    </div>
                )
            }
        },
        {
            title: 'Subject',
            dataIndex: 'subject_name',
            key: 'subject_name',
            render: (subject: string) => <Tag color="blue">{subject}</Tag>
        },
        {
            title: 'Class',
            key: 'class',
            render: (_: any, record: PersonalPeriod) => `${record.class_name} - ${record.section_name}`
        },
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                <Col xs={24} md={18}>
                    <Title level={4}>Handling Class Time Table</Title>
                    <Text type="secondary">A simplified view of your personal teaching schedule.</Text>
                </Col>
                <Col xs={24} md={6}>
                    <Select
                        value={selectedYear}
                        onChange={setSelectedYear}
                        placeholder="Select Academic Year"
                        style={{ width: '100%' }}
                        loading={loading}
                    >
                        {academicYears.map(year => <Option key={year.id} value={year.academic_year}>{year.academic_year}{year.is_current && " (Current)"}</Option>)}
                    </Select>
                </Col>
            </Row>

            {personalSchedule.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        columns={columns}
                        dataSource={personalSchedule}
                        rowKey={record => `${record.day}-${record.period}-${record.class_name}-${record.section_name}`}
                        bordered
                        scroll={{ x: 'max-content' }}
                        pagination={false}
                    />
                </div>
            ) : (
                <Empty description={
                    <Text>
                        You have no classes scheduled for the selected academic year.
                        <br />
                        Please check your assignments or contact an administrator.
                    </Text>
                } />
            )}
        </Card>
    );
};

export default PersonalTimetable;
