

import React, { useState, useEffect, useMemo } from 'react';
import { Select, Table, Card, Typography, Row, Col, Spin, Empty, Button, message, Switch } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTimetableMappingsRequest, type TimetableMapping } from '../../store/features/class-mappings/classMappingsSlice'; // Re-using this for subject fetching
import { fetchClassTimetableRequest, saveClassTimetableRequest, type TimetableEntry } from '../../store/features/class-timetables/classTimetablesSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';


const { Title, Text } = Typography;
const { Option } = Select;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

const SubjectTimetable: React.FC = () => {
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [numberOfPeriods, setNumberOfPeriods] = useState<number | null>(null);
    const [timetableState, setTimetableState] = useState<Record<string, Partial<TimetableEntry> | null>>({});

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading } = useSelector((state: RootState) => state.classMappings);
    const { timetable, loading: timetableLoading } = useSelector((state: RootState) => state.classTimetables);
    const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    
    useEffect(() => {
        if (user?.organization_key) {
            // This fetches the subject-teacher assignments needed for the dropdowns
            dispatch(fetchTimetableMappingsRequest({ organization_key: user.organization_key }));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (selectedClass && selectedSection && selectedAcademicYear && user?.organization_key) {
             dispatch(fetchClassTimetableRequest({
                organizationKey: user.organization_key,
                className: selectedClass,
                sectionName: selectedSection,
                academicYear: selectedAcademicYear,
            }));
        }
    }, [dispatch, selectedClass, selectedSection, selectedAcademicYear, user?.organization_key]);
    
    // Auto-select current academic year when a section is chosen
    useEffect(() => {
        if (selectedSection && academicYears.length > 0) {
            const currentYear = academicYears.find(cal => cal.is_current)?.academic_year || null;
            setSelectedAcademicYear(currentYear);
        }
    }, [selectedSection, academicYears]);

    useEffect(() => {
        const initialState: Record<string, Partial<TimetableEntry> | null> = {};
        if (timetable?.timetable_data) {
            setNumberOfPeriods(timetable.number_of_periods);
            timetable.timetable_data.forEach(entry => {
                const key = `${entry.day}-${entry.period}`;
                initialState[key] = entry;
            });
        } else {
             setNumberOfPeriods(null);
        }
        setTimetableState(initialState);
    }, [timetable]);


    const uniqueClasses = useMemo(() => [...new Set(mappings.map(m => m.class_name))], [mappings]);
    const sectionsForSelectedClass = useMemo(() => {
        if (!selectedClass) return [];
        return [...new Set(mappings.filter(m => m.class_name === selectedClass).map(m => m.section_name))];
    }, [mappings, selectedClass]);
    const subjectsForSelectedClassSection = useMemo(() => {
        if (!selectedClass || !selectedSection) return [];
        return mappings.filter(m => m.class_name === selectedClass && m.section_name === selectedSection);
    }, [mappings, selectedClass, selectedSection]);
    
    const handleSubjectChange = (day: Day, period: number, subjectName: string | null) => {
        const key = `${day}-${period}`;
        const mapping = subjectName ? subjectsForSelectedClassSection.find(m => m.subject_name === subjectName) : null;
        const currentStatus = (timetableState[key]?.status as 'Active' | 'Inactive') || 'Active';

        setTimetableState(prevState => ({
            ...prevState,
            [key]: subjectName ? {
                day: day,
                period: period,
                subject_name: subjectName,
                teacher_name: mapping?.teacher_name || '',
                status: currentStatus,
            } : null,
        }));
    };
    
    const handleStatusChange = (day: Day, checked: boolean) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        const periods = timeSlots.map(slot => slot.period).filter(p => p !== undefined);
        periods.push(0, 99); // extra classes

        const newState = {...timetableState};
        for(const period of periods) {
            const key = `${day}-${period}`;
            if (newState[key]) {
                newState[key]!.status = newStatus;
            } else {
                 newState[key] = { day, period, status: newStatus };
            }
        }
        setTimetableState(newState);
    };

    const handleSaveTimetable = () => {
        if (!selectedClass || !selectedSection || !selectedAcademicYear || !user?.organization_key || !numberOfPeriods) {
            message.error("Please select class, section, academic year and number of periods first.");
            return;
        }

        const entriesToSave = Object.values(timetableState).filter(entry => entry !== null && entry.subject_name) as TimetableEntry[];
        
        dispatch(saveClassTimetableRequest({
            organization_key: user.organization_key,
            class_name: selectedClass,
            section_name: selectedSection,
            academic_year: selectedAcademicYear,
            number_of_periods: numberOfPeriods,
            timetable_data: entriesToSave
        }));
    };

    const timeSlots8 = [
        { period: 1, time: '09:15 - 10:00' }, { period: 2, time: '10:00 - 10:45' },
        { period: -1, time: '10:45 - 11:00', label: 'Short Break' },
        { period: 3, time: '11:00 - 11:45' }, { period: 4, time: '11:45 - 12:30' },
        { period: -2, time: '12:30 - 01:15', label: 'Lunch Break' },
        { period: 5, time: '01:15 - 02:00' }, { period: 6, time: '02:00 - 02:45' },
        { period: -3, time: '02:45 - 03:00', label: 'Short Break' },
        { period: 7, time: '03:00 - 03:45' }, { period: 8, time: '03:45 - 04:30' },
    ];
     const timeSlots4 = [
        { period: 1, time: '09:15 - 10:45' },
        { period: -1, time: '10:45 - 11:00', label: 'Short Break' },
        { period: 2, time: '11:00 - 12:30' },
        { period: -2, time: '12:30 - 01:15', label: 'Lunch Break' },
        { period: 3, time: '01:15 - 02:45' },
        { period: -3, time: '02:45 - 03:00', label: 'Short Break' },
        { period: 4, time: '03:00 - 04:30' },
    ];
    
    const timeSlots = numberOfPeriods === 4 ? timeSlots4 : timeSlots8;
    const days: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const isTimetableValid = useMemo(() => {
        const daysToCheck: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        const regularPeriods = timeSlots.filter(slot => slot.period > 0).map(slot => slot.period);
    
        if (regularPeriods.length === 0) return false;
    
        for (const day of daysToCheck) {
            const dayIsActive = !Object.values(timetableState).some(entry => entry?.day === day && entry?.status === 'Inactive');
            if (dayIsActive) {
                for (const period of regularPeriods) {
                    const key = `${day}-${period}`;
                    if (!timetableState[key] || !timetableState[key]?.subject_name) {
                        return false; 
                    }
                }
            }
        }
        return true; 
    }, [timetableState, timeSlots]);


    const renderCell = (day: Day, period: number) => {
        const key = `${day}-${period}`;
        const entry = timetableState[key];
        return (
            <Select
                showSearch allowClear placeholder="Select Subject" style={{ width: '100%' }}
                value={entry?.subject_name || null}
                onChange={(value) => handleSubjectChange(day, period, value)}
                filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
            >
                {subjectsForSelectedClassSection.map(m => (
                    <Option key={m.id} value={m.subject_name}>{m.subject_name} ({m.teacher_name})</Option>
                ))}
            </Select>
        );
    };

    const columns = [
        {
            title: 'Day / Time', dataIndex: 'day', key: 'day', width: 120, 
            render: (text: string) => <Text strong>{text}</Text>,
        },
        {
            title: () => (
                <div style={{ textAlign: 'center' }}>
                    <Text strong>Morning Extra Class</Text><br />
                    <Text type="secondary">08:15 - 09:00</Text>
                </div>
            ),
            dataIndex: 'morning_extra', key: 'morning_extra', width: 200,
            render: (_: any, record: {day: Day}) => renderCell(record.day, 0)
        },
        ...timeSlots.map((slot) => ({
            title: () => (
                <div style={{ textAlign: 'center' }}>
                    <Text strong>{slot.label ? slot.label : `Period ${slot.period}`}</Text><br />
                    <Text type="secondary">{slot.time}</Text>
                </div>
            ),
            dataIndex: `period_${slot.period}`, key: `period_${slot.period}`, width: 200,
            render: (_: any, record: { day: Day }) => {
                if (slot.label) {
                    return {
                        props: { style: { background: '#f0f2f5', textAlign: 'center' as const } },
                        children: <Text strong type="secondary">{slot.label}</Text>,
                    };
                }
                return renderCell(record.day, slot.period as number);
            },
        })),
        {
            title: () => (
                <div style={{ textAlign: 'center' }}>
                    <Text strong>Evening Extra Class</Text><br />
                    <Text type="secondary">04:30 - 05:15</Text>
                </div>
            ),
            dataIndex: 'evening_extra', key: 'evening_extra', width: 200,
            render: (_: any, record: {day: Day}) => renderCell(record.day, 99)
        },
        {
            title: 'Status', key: 'status', width: 120,
            render: (_: any, record: {day: Day}) => {
                const isDayActive = !Object.values(timetableState).some(entry => entry?.day === record.day && entry?.status === 'Inactive');
                return (
                    <Switch 
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                        checked={isDayActive}
                        onChange={(checked) => handleStatusChange(record.day, checked)}
                    />
                );
            }
        }
    ];
    
    const tableData = days.map(day => ({ key: day, day: day }));
    
    const handleClassChange = (value: string | null) => {
        setSelectedClass(value);
        setSelectedSection(null);
        setSelectedAcademicYear(null);
        setNumberOfPeriods(null);
        setTimetableState({});
    }

    const handleSectionChange = (value: string | null) => {
        setSelectedSection(value);
        // Let the useEffect handle setting the academic year
        setSelectedAcademicYear(null); 
        setNumberOfPeriods(null);
        setTimetableState({});
    }

    const handleAcademicYearChange = (value: string | null) => {
        setSelectedAcademicYear(value);
        setNumberOfPeriods(null);
        setTimetableState({});
    }

    const handlePeriodsChange = (value: number | null) => {
        setNumberOfPeriods(value);
        setTimetableState({});
    }
    
    const isLoading = mappingsLoading || timetableLoading || calendarsLoading;

    return (
        <Card>
            <Title level={4}>Subject Timetable</Title>
            <Spin spinning={isLoading}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }} align="bottom">
                    <Col xs={24} sm={12} md={5}>
                        <Text>Class</Text>
                        <Select
                            showSearch placeholder="Select Class" style={{ width: '100%' }}
                            value={selectedClass} onChange={handleClassChange} allowClear
                            filterOption={(input, option) => (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())}
                        >
                            {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                        <Text>Section</Text>
                        <Select
                            placeholder="Select Section" style={{ width: '100%' }} allowClear
                            disabled={!selectedClass} value={selectedSection} onChange={handleSectionChange}
                        >
                            {sectionsForSelectedClass.map(sec => <Option key={sec} value={sec}>{sec}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={5}>
                        <Text>Academic Year</Text>
                        <Select
                            showSearch placeholder="Select Year" style={{ width: '100%' }} allowClear
                            disabled={!selectedSection} value={selectedAcademicYear} onChange={handleAcademicYearChange}
                             filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {academicYears.filter(ay => ay.status === 'Active').map(year => (
                                <Option key={year.id} value={year.academic_year}>{year.academic_year} {year.is_current && "(Current)"}</Option>
                            ))}
                        </Select>
                    </Col>
                     <Col xs={24} sm={12} md={5}>
                        <Text>Number of Periods</Text>
                        <Select
                            placeholder="Select Periods" style={{ width: '100%' }} allowClear
                            disabled={!selectedAcademicYear} value={numberOfPeriods} onChange={handlePeriodsChange}
                        >
                            <Option value={4}>4 Periods</Option>
                            <Option value={8}>8 Periods</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={24} md={4}>
                         <Button
                            type="primary" onClick={handleSaveTimetable}
                            disabled={!isTimetableValid}
                            loading={timetableLoading} style={{width: '100%'}}
                        >
                            Save Timetable
                        </Button>
                    </Col>
                </Row>
            </Spin>
            
            {selectedClass && selectedSection && selectedAcademicYear && numberOfPeriods ? (
                <Spin spinning={isLoading}>
                    <div style={{ overflowX: 'auto' }}>
                         <Table
                            columns={columns} dataSource={tableData} bordered pagination={false}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                </Spin>
            ) : (
                <Empty description="Please select class, section, academic year and number of periods to build a timetable." />
            )}
        </Card>
    );
};

export default SubjectTimetable;
