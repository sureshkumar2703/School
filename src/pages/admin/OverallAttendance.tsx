
import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Card, Typography, Row, Col, Spin, Table, Alert, DatePicker, Modal } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchAttendanceRequest, type AttendanceRecord, updateSingleAttendanceRequest } from '../../store/features/attendance/attendanceSlice';
import { fetchStudentsRequest, type Student } from '../../store/features/students/studentsSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface StudentAttendanceSummary {
    key: string;
    studentId: string;
    studentName: string;
    admittedClass?: string;
    section?: string;
    attendance: { [date: string]: string };
    presentDays: number;
    totalDays: number;
    percentage: number;
}

const OverallAttendance: React.FC = () => {
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [recordToUpdate, setRecordToUpdate] = useState<{ studentId: string; date: string; } | null>(null);

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { attendance, loading: attendanceLoading, error: attendanceError } = useSelector((state: RootState) => state.attendance);
    const { students, loading: studentsLoading } = useSelector((state: RootState) => state.students);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchStudentsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
            }
        }
    }, [calendars, selectedAcademicYear]);
    
    useEffect(() => {
        if (selectedAcademicYear && user?.organization_key) {
             dispatch(fetchAttendanceRequest({
                organizationKey: user.organization_key,
                academicYear: selectedAcademicYear,
            }));
        }
    }, [dispatch, selectedAcademicYear, user?.organization_key]);

    const studentMap = useMemo(() => {
        const map = new Map<string, Student>();
        students.forEach(s => map.set(s.id, s));
        return map;
    }, [students]);
    
    const { uniqueClasses, uniqueSectionsForClass } = useMemo(() => {
        const classes = new Set<string>();
        const sections = new Map<string, Set<string>>();

        attendance.forEach(record => {
            if (record.academic_year === selectedAcademicYear) {
                if (record.class) {
                    classes.add(record.class);
                    if (record.section) {
                        if (!sections.has(record.class)) {
                            sections.set(record.class, new Set());
                        }
                        sections.get(record.class)!.add(record.section);
                    }
                }
            }
        });

        const sectionsForSelected = selectedClass ? Array.from(sections.get(selectedClass) || []).sort() : [];
        
        return {
            uniqueClasses: Array.from(classes).sort(),
            uniqueSectionsForClass: sectionsForSelected,
        };
    }, [attendance, selectedAcademicYear, selectedClass]);

    const { tableData, dateColumns } = useMemo(() => {
        let recordsToProcess = attendance;
        
        if (dateRange && dateRange[0] && dateRange[1]) {
            const startDate = dateRange[0].startOf('day');
            const endDate = dateRange[1].endOf('day');
            recordsToProcess = recordsToProcess.filter(record => {
                const recordDate = dayjs(record.date);
                return recordDate.isSameOrAfter(startDate) && recordDate.isSameOrBefore(endDate);
            });
        }
        
        if (selectedClass) {
            recordsToProcess = recordsToProcess.filter(record => record.class === selectedClass);
        }
        if (selectedSection) {
            recordsToProcess = recordsToProcess.filter(record => record.section === selectedSection);
        }
        
        if (recordsToProcess.length === 0) {
            return { tableData: [], dateColumns: [] };
        }

        const finalDates = [...new Set(recordsToProcess.map(a => a.date))].sort();
        const summaryByStudentId: Record<string, StudentAttendanceSummary> = {};

        for (const record of recordsToProcess) {
            if (!record.student_id) continue;
            const studentId = record.student_id;
            
            if (!summaryByStudentId[studentId]) {
                const studentDetails = studentMap.get(studentId);
                summaryByStudentId[studentId] = {
                    key: studentId,
                    studentId: studentId,
                    studentName: studentDetails?.full_name || record.name || `Unknown (${studentId})`,
                    admittedClass: studentDetails?.admitted_class,
                    attendance: {},
                    presentDays: 0,
                    totalDays: 0,
                    percentage: 0,
                };
            }

            summaryByStudentId[studentId].attendance[record.date] = record.attendace_status || 'Absent';
        }

        Object.values(summaryByStudentId).forEach(studentSummary => {
            studentSummary.totalDays = finalDates.length;
            studentSummary.presentDays = finalDates.reduce((count, date) => {
                return count + (studentSummary.attendance[date] === 'Present' ? 1 : 0);
            }, 0);
            studentSummary.percentage = studentSummary.totalDays > 0 ? (studentSummary.presentDays / studentSummary.totalDays) * 100 : 0;
        });

        const newDateColumns = finalDates.map(date => ({
            title: dayjs(date).format('DD/MM/YY'),
            dataIndex: ['attendance', date],
            key: date,
            width: 80,
            align: 'center' as const,
            render: (status: string, record: StudentAttendanceSummary) => {
                if (status === 'Present') {
                    return <CheckCircleOutlined style={{ color: 'green', fontSize: '16px' }} />;
                }
                return <CloseCircleOutlined 
                            style={{ color: 'red', fontSize: '16px', cursor: 'pointer' }}
                            onClick={() => handleIconClick(record.studentId, date)}
                        />;
            },
        }));

        return { tableData: Object.values(summaryByStudentId), dateColumns: newDateColumns };
    }, [attendance, studentMap, selectedClass, selectedSection, dateRange]);
    
    const handleIconClick = (studentId: string, date: string) => {
        setRecordToUpdate({ studentId, date });
        setConfirmModalVisible(true);
    };

    const handleConfirmUpdate = () => {
        if (recordToUpdate) {
            dispatch(updateSingleAttendanceRequest({
                student_id: recordToUpdate.studentId,
                date: recordToUpdate.date,
                attendace_status: 'Present',
                forenoon_status: 'Present',
                afternoon_status: 'Present',
            }));
        }
        setConfirmModalVisible(false);
        setRecordToUpdate(null);
    };

    const handleCancelUpdate = () => {
        setConfirmModalVisible(false);
        setRecordToUpdate(null);
    };

    const baseColumns = [
        {
            title: 'S.No',
            key: 'sno',
            render: (_text: any, _record: any, index: number) => index + 1,
            width: 70,
            fixed: 'left' as const,
        },
        {
            title: 'Student Name',
            dataIndex: 'studentName',
            key: 'studentName',
            width: 200,
            fixed: 'left' as const,
        },
        {
            title: 'Attendance (%)',
            dataIndex: 'percentage',
            key: 'percentage',
            width: 120,
            fixed: 'left' as const,
            render: (percentage: number) => `${percentage.toFixed(2)}%`,
            sorter: (a: StudentAttendanceSummary, b: StudentAttendanceSummary) => a.percentage - b.percentage,
        },
    ];

    const allColumns = [...baseColumns, ...dateColumns];

    const isLoading = calendarsLoading || attendanceLoading || studentsLoading;
    
    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } as React.CSSProperties : {};

    return (
        <>
            <style>{`
                .ant-table-thead > tr > th {
                    background-color: #e6f7ff !important;
                }
                .ant-table-tbody > tr:nth-child(even) > td {
                    background-color: #fafafa;
                }
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
                <Spin spinning={isLoading}>
                     <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                            <Title level={4} style={{ margin: 0 }}>Overall Attendance Report</Title>
                        </Col>
                        <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                            <Select
                                placeholder="Select Academic Year"
                                value={selectedAcademicYear}
                                onChange={setSelectedAcademicYear}
                                style={{ width: '100%', maxWidth: 200 }}
                                loading={calendarsLoading}
                            >
                                {calendars.filter(c => c.status === 'Active').map(c => <Option key={c.id} value={c.academic_year}>{c.academic_year}</Option>)}
                            </Select>
                        </Col>
                    </Row>
                    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={24} md={8}>
                             <RangePicker onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)} style={{width: '100%'}} />
                        </Col>
                        <Col xs={24} md={8}>
                            <Select
                                showSearch
                                placeholder="Select Class"
                                value={selectedClass}
                                onChange={(value) => { setSelectedClass(value); setSelectedSection(null); }}
                                style={{ width: '100%' }}
                                allowClear
                            >
                                {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                            </Select>
                        </Col>
                         <Col xs={24} md={8}>
                            <Select
                                showSearch
                                placeholder="Select Section"
                                value={selectedSection}
                                onChange={setSelectedSection}
                                style={{ width: '100%' }}
                                disabled={!selectedClass}
                                allowClear
                            >
                                {uniqueSectionsForClass.map(s => <Option key={s} value={s}>{s}</Option>)}
                            </Select>
                        </Col>
                    </Row>
                    
                    {attendanceError && <Alert message="Error fetching attendance" description={attendanceError} type="error" showIcon closable />}

                    <div 
                        className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                        style={watermarkStyle}
                    >
                        <div style={{overflowX: 'auto'}}>
                            <Table
                                columns={allColumns}
                                dataSource={tableData}
                                bordered
                                scroll={{ x: 'max-content' }}
                                pagination={{ pageSize: 10 }}
                            />
                        </div>
                    </div>
                </Spin>
            </Card>

            <Modal
                title="Confirm Attendance Update"
                open={confirmModalVisible}
                onOk={handleConfirmUpdate}
                onCancel={handleCancelUpdate}
                okText="Yes, Mark as Present"
                cancelText="No"
            >
                <p>Are you sure you want to mark this student as Present for this day?</p>
                <p>This will set their status to 'Present' for both forenoon and afternoon sessions.</p>
            </Modal>
        </>
    );
};

export default OverallAttendance;
