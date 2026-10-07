

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Select, Spin, Alert, Row, Col, Table, Button, message } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { fetchAllClassSectionsRequest } from '../../store/features/class-sections-view/classSectionsViewSlice';
import { fetchFeesRequest } from '../../store/features/setfees/setfeesSlice';
import { saveStudentFeesRequest } from '../../store/features/student-fees/studentFeesSlice';
import type { StudentFee } from '../../store/features/student-fees/studentFeesSlice';
import { fetchAllStudentTransportDataRequest } from '../../store/features/student-transport-data/studentTransportDataSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const SchoolFeesStudent: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { allocations, loading: allocationsLoading, error: allocationsError } = useSelector((state: RootState) => state.classSectionsView);
    const { fees, loading: feesLoading } = useSelector((state: RootState) => state.setfees);
    const { allData: transportData, loading: transportLoading } = useSelector((state: RootState) => state.studentTransportData);
    const { loading: studentFeesLoading } = useSelector((state: RootState) => state.studentFees);


    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchClassesRequest());
            dispatch(fetchAllClassSectionsRequest(user.organization_key));
            dispatch(fetchFeesRequest(user.organization_key));
            dispatch(fetchAllStudentTransportDataRequest(user.organization_key));
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

    const classOptions = useMemo(() => {
        return [...new Set(classes.filter(c => c.organization_key === user?.organization_key && c.status === 'Active').map(c => c.class_name))];
    }, [classes, user?.organization_key]);
    
    const filteredStudents = useMemo(() => {
        if (!selectedYear || !selectedClass) return [];
        return allocations.filter(alloc => 
            alloc.academic_year === selectedYear &&
            alloc.class_name === selectedClass &&
            alloc.status === 'Active'
        );
    }, [allocations, selectedYear, selectedClass]);
    
    const feeForSelectedClass = useMemo(() => {
        if (!selectedYear || !selectedClass) return null;
        return fees.find(fee => 
            fee.academic_year === selectedYear &&
            fee.class_name === selectedClass
        );
    }, [fees, selectedYear, selectedClass]);

    const transportDataMap = useMemo(() => {
        const map = new Map<string, number>();
        if (selectedYear) {
            transportData
                .filter(td => td.academic_year === selectedYear && td.student_id && td.bus_fees)
                .forEach(td => {
                    map.set(td.student_id!, td.bus_fees!);
                });
        }
        return map;
    }, [transportData, selectedYear]);


    const handleSaveFees = () => {
        if (!user || !filteredStudents.length || !feeForSelectedClass) {
            message.error("Cannot save fees. Ensure students are listed and a fee structure is set.");
            return;
        }

        const studentFeesData: Omit<StudentFee, 'id' | 'balance_amount'>[] = filteredStudents.map(student => {
            const busFee = student.student_id ? transportDataMap.get(student.student_id) || 0 : 0;
            const totalFees = (feeForSelectedClass?.class_fees || 0) + busFee;
            
            return {
                organization_key: user.organization_key!,
                student_id: student.student_id!,
                academic_year: student.academic_year,
                class_name: student.class_name,
                section_name: student.section_name,
                register_no: student.register_no,
                roll_no: student.roll_no,
                student_name: student.full_name,
                total_fees: totalFees,
                paid_amount: 0,
                status: 'Unpaid',
            };
        });
        
        dispatch(saveStudentFeesRequest(studentFeesData as any));
    };
    
    const isLoading = calendarsLoading || classesLoading || allocationsLoading || feesLoading || studentFeesLoading || transportLoading;
    const error = allocationsError;

    const columns = [
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text: string) => text || 'N/A' },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { 
            title: 'School Fees', 
            key: 'school_fees',
            render: () => {
                if (feeForSelectedClass) {
                    return `₹ ${feeForSelectedClass.class_fees.toLocaleString()}`;
                }
                return <Text type="secondary">Not Set</Text>;
            }
        },
        {
            title: 'Bus Fees',
            key: 'bus_fees',
            render: (_: any, record: { student_id?: string }) => {
                const busFee = record.student_id ? transportDataMap.get(record.student_id) : 0;
                return `₹ ${(busFee || 0).toLocaleString()}`;
            }
        },
         {
            title: 'Total Fees',
            key: 'total_fees',
            render: (_: any, record: { student_id?: string }) => {
                const classFee = feeForSelectedClass?.class_fees || 0;
                const busFee = record.student_id ? transportDataMap.get(record.student_id) || 0 : 0;
                const total = classFee + busFee;
                return <Text strong>₹ {total.toLocaleString()}</Text>;
            }
        },
    ];

    return (
        <Card>
            <Title level={4}>Student Fee Status</Title>
             <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Select an academic year and class to view student fee details.
            </Text>
            <Spin spinning={isLoading}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                        <Select
                            placeholder="Select Academic Year"
                            value={selectedYear}
                            onChange={setSelectedYear}
                            style={{ width: '100%' }}
                            loading={calendarsLoading}
                            allowClear
                        >
                            {calendars.filter(c => c.status === 'Active').map(c => <Option key={c.id} value={c.academic_year}>{c.academic_year}{c.is_current && " (Current)"}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={8}>
                         <Select
                            showSearch
                            placeholder="Select Class"
                            value={selectedClass}
                            onChange={setSelectedClass}
                            style={{ width: '100%' }}
                            loading={classesLoading}
                            disabled={!selectedYear}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {classOptions.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Col>
                </Row>
                 {error && <Alert message="Error fetching student data" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                 {selectedYear && selectedClass && (
                    <div style={{overflowX: 'auto'}}>
                        <Table
                            columns={columns}
                            dataSource={filteredStudents}
                            rowKey="id"
                            bordered
                            loading={isLoading}
                            scroll={{ x: 'max-content' }}
                            footer={() => (
                                <Row justify="end">
                                    <Col>
                                        <Button
                                            type="primary"
                                            onClick={handleSaveFees}
                                            loading={studentFeesLoading}
                                            disabled={!filteredStudents.length || !feeForSelectedClass}
                                        >
                                            Save Fees Data for {filteredStudents.length} Students
                                        </Button>
                                    </Col>
                                </Row>
                            )}
                        />
                    </div>
                 )}
            </Spin>
        </Card>
    );
};

export default SchoolFeesStudent;
