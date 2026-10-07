
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Row, Col, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text } = Typography;
const { Option } = Select;

interface Student {
    id: string;
    roll_no?: string;
    register_no: string;
    full_name: string;
    class_name: string;
    section_name: string;
    academic_year: string;
}

const MyClassStudents: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, loading: statsLoading, error: statsError } = useSelector((state: RootState) => state.teacherStats);
    
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    
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
        // Set default selected year to the active one if available, otherwise the latest one.
        if (academicYearOptions.length > 0 && !selectedYear) {
            const activeYear = stats.activeAcademicYear;
            if (activeYear && academicYearOptions.includes(activeYear)) {
                setSelectedYear(activeYear);
            } else {
                // Fallback to the most recent year if current is not in the options
                const sortedYears = [...academicYearOptions].sort((a, b) => b.localeCompare(a));
                setSelectedYear(sortedYears[0]);
            }
        }
    }, [academicYearOptions, stats.activeAcademicYear, selectedYear]);


    const myClassTeacherAssignment = useMemo(() => {
        if (!stats.classTeacherAssignment || !selectedYear) return null;
        // We need to find the assignment for the SELECTED year, not just the one returned by stats
        // The stats slice might be returning only the current year's assignment.
        // A better approach is to have a list of all assignments and filter here.
        // For now, let's assume the teacher is class teacher for one class per year.
        if(stats.classTeacherAssignment.academic_year === selectedYear) {
            return stats.classTeacherAssignment;
        }
        // This part is tricky if the teacher was a class teacher in a different year.
        // A full solution would involve fetching all of the teacher's assignments.
        // Let's proceed with a warning for now if the data seems mismatched.
        return null; // For simplicity, only show if the stats match the selected year
    }, [stats.classTeacherAssignment, selectedYear]);

    useEffect(() => {
        const fetchStudents = async () => {
            // Find the class teacher assignment specific to the *selected* year
            const assignmentForSelectedYear = stats.allClassTeacherAssignments?.find(a => a.academic_year === selectedYear);

            if (!assignmentForSelectedYear || !user?.organization_key) {
                setStudents([]);
                return;
            }

            setLoadingStudents(true);
            setError(null);
            try {
                const { data, error: fetchError } = await supabase
                    .from('class_section_allocations')
                    .select('id, roll_no, register_no, full_name, class_name, section_name, academic_year')
                    .eq('organization_key', user.organization_key)
                    .eq('class_name', assignmentForSelectedYear.class_name)
                    .eq('section_name', assignmentForSelectedYear.section_name)
                    .eq('academic_year', assignmentForSelectedYear.academic_year)
                    .order('roll_no', { ascending: true, nullsFirst: false });

                if (fetchError) {
                    throw new Error(`Failed to fetch students: ${fetchError.message}`);
                }
                setStudents(data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoadingStudents(false);
            }
        };
        
        if (selectedYear) {
            fetchStudents();
        } else {
            setStudents([]); 
        }
    }, [selectedYear, stats.allClassTeacherAssignments, user?.organization_key]);
    
    const isLoading = statsLoading || loadingStudents;
    const finalError = statsError || error;

    if (isLoading && students.length === 0) {
        return <Spin tip="Loading your class information..." fullscreen />;
    }

    if (finalError) {
        return <Alert message="Error" description={finalError} type="error" showIcon />;
    }
    
    const assignmentForSelectedYear = stats.allClassTeacherAssignments?.find(a => a.academic_year === selectedYear);

    const columns: ColumnsType<Student> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text) => text || 'N/A' },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    ];

    return (
        <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16,16]}>
                <Col xs={24} md={16}>
                    <Title level={4} style={{ margin: 0 }}>My Class Students</Title>
                    <Text type="secondary">This page is for Class Teachers only. View students from your assigned class.</Text>
                </Col>
                <Col xs={24} md={8}>
                     <Select
                        value={selectedYear}
                        onChange={setSelectedYear}
                        placeholder="Select Academic Year"
                        style={{ width: '100%' }}
                        loading={statsLoading}
                        allowClear
                    >
                        {academicYearOptions.map(year => (
                            <Option key={year} value={year}>
                                {year}{year === stats.activeAcademicYear && " (Current)"}
                            </Option>
                        ))}
                    </Select>
                </Col>
            </Row>

            {selectedYear && assignmentForSelectedYear ? (
                 <>
                    <Text strong style={{ marginBottom: 24, display: 'block' }}>
                        Showing students for your assigned class: {assignmentForSelectedYear.class_name} - {assignmentForSelectedYear.section_name} ({assignmentForSelectedYear.academic_year})
                    </Text>
                    <Table
                        columns={columns}
                        dataSource={students}
                        rowKey="id"
                        bordered
                        loading={isLoading}
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: 'No students found for this class in the selected year.' }}
                    />
                </>
            ) : (
                 <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Text>
                           {selectedYear ? `You were not assigned as a Class Teacher for the ${selectedYear} academic year.` : 'Please select an academic year.'}
                        </Text>
                    }
                />
            )}
        </Card>
    );
};

export default MyClassStudents;
