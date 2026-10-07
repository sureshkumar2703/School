
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import type { Day, TimetableEntry } from '../../store/features/class-timetables/classTimetablesSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text } = Typography;

interface TimetableRow {
    key: Day;
    day: Day;
    periods: (TimetableEntry | null)[];
}

const StudentMyTimetable: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetable, loading, error } = useSelector((state: RootState) => state.studentDashboard);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    useEffect(() => {
        if (user?.organization_key && user?.register_no && user?.academic_year) {
            const fetchSection = async () => {
                setLoadingSection(true);
                try {
                    const { data, error: sectionError } = await supabase
                        .from('class_section_allocations')
                        .select('section_name')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', user.academic_year)
                        .single();
                    if (sectionError && sectionError.code !== 'PGRST116') throw sectionError;
                    if (data) setSection(data.section_name);
                } catch (err) {
                    console.error("Error fetching student section:", err);
                } finally {
                    setLoadingSection(false);
                }
            };
            fetchSection();
        } else {
            setLoadingSection(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && user?.academic_year) {
            dispatch(fetchStudentDashboardDataRequest({
                organizationKey: user.organization_key,
                className: user.admitted_class,
                sectionName: section,
                academicYear: user.academic_year,
            }));
        }
    }, [dispatch, user, section]);
    
    const isLoading = loading || loadingSection;

    if (isLoading) return <Spin tip="Loading your timetable..." fullscreen />;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;

    const timeSlots = timetable?.number_of_periods === 4 ? [
        { period: 1, time: '09:15 - 10:45' },
        { period: 2, time: '11:00 - 12:30' },
        { period: 3, time: '01:15 - 02:45' },
        { period: 4, time: '03:00 - 04:30' },
    ] : [
        { period: 1, time: '09:15 - 10:00' }, { period: 2, time: '10:00 - 10:45' },
        { period: 3, time: '11:00 - 11:45' }, { period: 4, time: '11:45 - 12:30' },
        { period: 5, time: '01:15 - 02:00' }, { period: 6, time: '02:00 - 02:45' },
        { period: 7, time: '03:00 - 03:45' }, { period: 8, time: '03:45 - 04:30' },
    ];
    
    const tableData: TimetableRow[] = timetable ? 
        (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as Day[]).map(day => ({
            key: day,
            day: day,
            periods: Array.from({ length: timeSlots.length + 2 }, (_, i) => {
                const periodNum = i === 0 ? 0 : (i === timeSlots.length + 1 ? 99 : timeSlots[i - 1]?.period);
                return timetable.timetable_data.find(entry => entry.day === day && entry.period === periodNum) || null;
            })
        })) : [];

    const renderCell = (entry: TimetableEntry | null) => {
        if (!entry || !entry.subject_name) return null;
        
        return (
            <div style={{ lineHeight: '1.4', textAlign: 'center', padding: '8px' }}>
                <Text strong style={{ display: 'block', fontSize: '14px' }}>{entry.subject_name}</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>{entry.teacher_name}</Text>
            </div>
        );
    };

    const columns: ColumnsType<TimetableRow> = [
        {
            title: 'Day',
            dataIndex: 'day',
            key: 'day',
            width: 120,
            fixed: 'left',
            render: (day: string) => <Text strong>{day}</Text>,
        },
        {
            title: () => (
                <div style={{ textAlign: 'center', lineHeight: '1.4' }}>
                    <Text strong>Morning Extra Class</Text><br />
                    <Text type="secondary">08:15 - 09:00</Text>
                </div>
            ),
            key: 'period-0',
            width: 180,
            render: (_: any, record: TimetableRow) => renderCell(record.periods.find(p => p?.period === 0) || null),
        },
        ...timeSlots.map(slot => ({
            title: () => (
                <div style={{ textAlign: 'center', lineHeight: '1.4' }}>
                    <Text strong>{`Period ${slot.period}`}</Text><br />
                    <Text type="secondary">{slot.time}</Text>
                </div>
            ),
            key: `period-${slot.period}`,
            width: 180,
            render: (_: any, record: TimetableRow) => renderCell(record.periods.find(p => p?.period === slot.period) || null),
        })),
        {
            title: () => (
                <div style={{ textAlign: 'center', lineHeight: '1.4' }}>
                    <Text strong>Evening Extra Class</Text><br />
                    <Text type="secondary">04:30 - 05:15</Text>
                </div>
            ),
            key: 'period-99',
            width: 180,
            render: (_: any, record: TimetableRow) => renderCell(record.periods.find(p => p?.period === 99) || null),
        },
    ];
    
    return (
        <Card>
            <Title level={4}>My Timetable</Title>
            <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                Your weekly class schedule for {user?.admitted_class} - Section {section} ({user?.academic_year}).
            </Text>
            
            {timetable ? (
                <div style={{ overflowX: 'auto' }}>
                    <Table
                        columns={columns}
                        dataSource={tableData}
                        rowKey="key"
                        bordered
                        pagination={false}
                        scroll={{ x: 'max-content' }}
                    />
                </div>
            ) : (
                <Empty description={<Text>Your timetable has not been published yet. Please check back later.</Text>} />
            )}
        </Card>
    );
};

export default StudentMyTimetable;
