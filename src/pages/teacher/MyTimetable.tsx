

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Select, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherTimetableDataRequest } from '../../store/features/teacher-timetable/teacherTimetableSlice';
import type { Day, TimetableEntry } from '../../store/features/class-timetables/classTimetablesSlice';

const { Title, Text } = Typography;
const { Option } = Select;

interface TimetableRow {
    key: Day;
    day: Day;
    periods: (TimetableEntry | null)[];
}

const MyClassTimetable: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetables, mappings, loading, error } = useSelector((state: RootState) => state.teacherTimetable);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherTimetableDataRequest({ organizationKey: user.organization_key }));
        }
    }, [dispatch, user?.organization_key]);

    const myClassOptions = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        const myMappings = mappings.filter(m => m.teacher_name === user.full_name);
        const uniqueClasses = myMappings.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name} (${m.academic_year})` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());

        return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [mappings, user?.full_name]);
    
    const selectedTimetable = useMemo(() => {
        if (!selectedClassKey || !timetables) return null;
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return timetables.find(tt => 
            tt.class_name === className && 
            tt.section_name === sectionName && 
            tt.academic_year === academicYear
        );
    }, [selectedClassKey, timetables]);


    if (loading && timetables.length === 0) return <Spin tip="Loading your class timetables..." fullscreen />;
    if (error) return <Alert message="Error" description={error} type="error" showIcon />;

    const timeSlots = selectedTimetable?.number_of_periods === 4 ? [
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
    
    const tableData: TimetableRow[] = selectedTimetable ? 
        (['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as Day[]).map(day => ({
            key: day,
            day: day,
            periods: Array.from({ length: timeSlots.length + 2 }, (_, i) => {
                const periodNum = i === 0 ? 0 : (i === timeSlots.length + 1 ? 99 : timeSlots[i - 1]?.period);
                return selectedTimetable.timetable_data.find(entry => entry.day === day && entry.period === periodNum) || null;
            })
        })) : [];

    const renderCell = (entry: TimetableEntry | null) => {
        if (!entry || !entry.subject_name) return null;
        
        const isMyPeriod = entry.teacher_name === user?.full_name;

        return (
            <div style={{
                lineHeight: '1.4',
                textAlign: 'center',
                padding: '8px',
                background: isMyPeriod ? '#e6f7ff' : 'transparent',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxSizing: 'border-box',
            }}>
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
            render: (day: string) => <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '8px'}}><Text strong>{day}</Text></div>,
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
            <div style={{ overflowX: 'auto' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                    <Col xs={24} md={12}>
                        <Title level={4}>My Class Timetable</Title>
                        <Text type="secondary">Select one of your classes to view its complete weekly schedule.</Text>
                    </Col>
                    <Col xs={24} md={12}>
                        <Select
                            showSearch
                            placeholder="Select a class"
                            style={{ width: '100%' }}
                            value={selectedClassKey}
                            onChange={setSelectedClassKey}
                            loading={loading}
                        >
                            {myClassOptions.map(opt => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                        </Select>
                    </Col>
                </Row>
                
                {selectedClassKey ? (
                    selectedTimetable ? (
                        
                            <Table
                                columns={columns}
                                dataSource={tableData}
                                rowKey="key"
                                bordered
                                pagination={false}
                                scroll={{ x: 'max-content' }}
                            />
                        
                    ) : (
                        <Empty description={<Text>No timetable has been published for the selected class yet.</Text>} />
                    )
                ) : (
                    <Empty description={myClassOptions.length > 0 ? <Text>Please select a class to view its timetable.</Text> : <Text>You are not assigned to any classes.</Text>} />
                )}
            </div>
        </Card>
    );
};

export default MyClassTimetable;
