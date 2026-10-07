
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Empty, Input, Row, Col, Button, message, Divider, Switch, Popconfirm, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { supabase } from '../../service/supabaseClient';
import { assignTransportRequest, fetchAllocationsRequest, updateAllocationStatusRequest, deleteAllocationRequest, type StudentTransportAllocation } from '../../store/features/student-transport/studentTransportSlice';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import { DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface StudentInfo {
    id: string;
    roll_no?: string;
    register_no: string;
    full_name: string;
    permanent_address?: string;
    temporary_address?: string;
}

const StudentTransportAllocate: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, loading: statsLoading, error: statsError } = useSelector((state: RootState) => state.teacherStats);
    const { loading: transportLoading, allocations: transportAllocations } = useSelector((state: RootState) => state.studentTransport);
    
    const [students, setStudents] = useState<StudentInfo[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key && user?.full_name) {
            dispatch(fetchTeacherStatsRequest({
                organizationKey: user.organization_key,
                teacherName: user.full_name,
            }));
            dispatch(fetchAllocationsRequest(user.organization_key));
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

    const myClassTeacherAssignment = useMemo(() => {
        if (!stats.allClassTeacherAssignments || !selectedYear) return null;
        return stats.allClassTeacherAssignments.find(a => a.academic_year === selectedYear);
    }, [stats.allClassTeacherAssignments, selectedYear]);


    useEffect(() => {
        const fetchStudentTransportInfo = async () => {
            if (!myClassTeacherAssignment || !user?.organization_key) {
                setStudents([]);
                return;
            }

            setLoadingStudents(true);
            setError(null);
            try {
                const { class_name, section_name, academic_year } = myClassTeacherAssignment;
                
                const { data: allocations, error: allocationError } = await supabase
                    .from('class_section_allocations')
                    .select('register_no, roll_no, full_name')
                    .eq('organization_key', user.organization_key)
                    .eq('class_name', class_name)
                    .eq('section_name', section_name)
                    .eq('academic_year', academic_year);

                if (allocationError) throw allocationError;
                if (!allocations || allocations.length === 0) {
                    setStudents([]);
                    setLoadingStudents(false);
                    return;
                }

                const registerNos = allocations.map(a => a.register_no).filter(Boolean);
                if (registerNos.length === 0) {
                    setStudents([]);
                    setLoadingStudents(false);
                    return;
                }

                const { data: studentDetails, error: studentError } = await supabase
                    .from('students')
                    .select('id, register_no, permanent_address, temporary_address')
                    .in('register_no', registerNos);
                
                if (studentError) throw studentError;

                const studentDetailsMap = new Map(studentDetails.map(s => [s.register_no, { id: s.id, permanent_address: s.permanent_address, temporary_address: s.temporary_address }]));

                const combinedData = allocations.map(alloc => {
                    const details = studentDetailsMap.get(alloc.register_no);
                    return {
                        id: details?.id || alloc.register_no,
                        roll_no: alloc.roll_no,
                        register_no: alloc.register_no,
                        full_name: alloc.full_name,
                        permanent_address: details?.permanent_address,
                        temporary_address: details?.temporary_address,
                    };
                }).sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

                setStudents(combinedData);

            } catch (err: any) {
                setError(`Failed to fetch student data: ${err.message}`);
            } finally {
                setLoadingStudents(false);
            }
        };

        if (myClassTeacherAssignment) {
            fetchStudentTransportInfo();
        } else {
            setStudents([]);
        }
    }, [myClassTeacherAssignment, user?.organization_key]);
    
    const assignedStudentsForClass = useMemo(() => {
        if (!myClassTeacherAssignment) return [];
        const baseFiltered = transportAllocations
            .filter(alloc => 
                alloc.academic_year === myClassTeacherAssignment.academic_year &&
                alloc.class_name === myClassTeacherAssignment.class_name &&
                alloc.section_name === myClassTeacherAssignment.section_name
            );
        
        if (!assignedSearchTerm) {
             return baseFiltered.sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
        }

        return baseFiltered.filter(student =>
            (student.full_name && student.full_name.toLowerCase().includes(assignedSearchTerm.toLowerCase())) ||
            (student.roll_no && student.roll_no.toLowerCase().includes(assignedSearchTerm.toLowerCase()))
        ).sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));

    }, [transportAllocations, myClassTeacherAssignment, assignedSearchTerm]);


    const assignedStudentIds = useMemo(() => {
        if (!myClassTeacherAssignment) return new Set();
        return new Set(
            transportAllocations
                .filter(alloc => alloc.status === 'Active' && alloc.academic_year === myClassTeacherAssignment.academic_year)
                .map(alloc => alloc.student_id)
        );
    }, [transportAllocations, myClassTeacherAssignment]);


    const filteredStudents = useMemo(() => {
        if (!searchTerm) {
            return students;
        }
        return students.filter(student =>
            student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student.roll_no && student.roll_no.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [students, searchTerm]);

    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const handleAssign = () => {
        if (!user?.organization_key || !myClassTeacherAssignment) {
            message.error("Cannot assign students without organization or class details.");
            return;
        }
        const selectedStudentsData = students.filter(student => selectedRowKeys.includes(student.id));
        const payload = selectedStudentsData.map(student => ({
            organization_key: user.organization_key!,
            student_id: student.id,
            academic_year: myClassTeacherAssignment.academic_year,
            class_name: myClassTeacherAssignment.class_name,
            section_name: myClassTeacherAssignment.section_name,
            register_no: student.register_no,
            roll_no: student.roll_no,
            full_name: student.full_name,
            permanent_address: student.permanent_address,
            temporary_address: student.temporary_address,
            status: 'Active',
        }));
        
        dispatch(assignTransportRequest(payload as any));
        setSelectedRowKeys([]);
    };
    
    const handleStatusToggle = (checked: boolean, record: StudentTransportAllocation) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateAllocationStatusRequest({ id: record.id, status: newStatus, organization_key: record.organization_key }));
    };

    const handleDelete = (id: string) => {
        dispatch(deleteAllocationRequest(id));
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: StudentInfo) => ({
            disabled: assignedStudentIds.has(record.id),
            name: record.full_name,
        }),
    };
    
    const hasSelected = selectedRowKeys.length > 0;
    const isLoading = statsLoading || loadingStudents || transportLoading;

    if (statsLoading || (loadingStudents && students.length === 0)) {
        return <Spin tip="Loading class and student data..." fullscreen />;
    }

    if (statsError || error) {
        return <Alert message="Error" description={statsError || error} type="error" showIcon />;
    }
    
    const unassignedColumns: ColumnsType<StudentInfo> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text) => text || 'N/A' },
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Permanent Address', dataIndex: 'permanent_address', key: 'permanent_address', render: (text) => text || 'N/A' },
        { title: 'Temporary Address', dataIndex: 'temporary_address', key: 'temporary_address', render: (text) => text || 'N/A' },
    ];
    
    const assignedColumns: ColumnsType<StudentTransportAllocation> = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (text) => text || 'N/A' },
        { title: 'Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (status, record) => (
            <Switch
                checkedChildren="Active"
                unCheckedChildren="Inactive"
                checked={status === 'Active'}
                onChange={(checked) => handleStatusToggle(checked, record)}
                loading={transportLoading}
            />
        )},
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Popconfirm
                    title="Delete the assignment?"
                    description="Are you sure you want to remove this student from transport?"
                    onConfirm={() => handleDelete(record.id)}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button icon={<DeleteOutlined />} danger />
                </Popconfirm>
            )
        }
    ];

    if (!stats.allClassTeacherAssignments || stats.allClassTeacherAssignments.length === 0) {
         return (
            <Card>
                 <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <Text>
                            This page is for Class Teachers only.
                            <br />
                            You are not currently assigned as a Class Teacher for any academic year.
                        </Text>
                    }
                />
            </Card>
        );
    }

    return (
        <Card>
            <style>{`
                .ant-table-row-disabled > td {
                    background: #f5f5f5 !important;
                    color: rgba(0, 0, 0, 0.25) !important;
                    cursor: not-allowed !important;
                }
                .ant-table-row-disabled .ant-checkbox-wrapper-disabled {
                    cursor: not-allowed !important;
                }
            `}</style>
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                <Col xs={24} md={16}>
                    <Title level={4} style={{ margin: 0 }}>Student Transport Allocation</Title>
                     {myClassTeacherAssignment ? (
                        <Text type="secondary">
                            Assign students from your class to transport: {myClassTeacherAssignment.class_name} - {myClassTeacherAssignment.section_name} ({myClassTeacherAssignment.academic_year})
                        </Text>
                    ) : (
                        <Text type="warning">You are not the class teacher for the selected academic year.</Text>
                    )}
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

            {myClassTeacherAssignment ? (
                <>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                        <Col>
                            <Title level={5}>Unassigned Students</Title>
                        </Col>
                        <Col>
                            <Search
                                placeholder="Search by Name or Roll No"
                                onSearch={setSearchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: 250 }}
                                allowClear
                            />
                        </Col>
                    </Row>
                    {hasSelected && (
                        <div style={{ marginBottom: 16 }}>
                            <Button type="primary" onClick={handleAssign} loading={transportLoading}>
                                Assign Selected ({selectedRowKeys.length})
                            </Button>
                        </div>
                    )}
                    <div style={{ overflowX: 'auto' }}>
                        <Table
                            rowSelection={rowSelection}
                            columns={unassignedColumns}
                            dataSource={filteredStudents}
                            rowKey="id"
                            bordered
                            loading={isLoading}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: 'No students found in your class to assign.' }}
                            rowClassName={(record) => assignedStudentIds.has(record.id) ? 'ant-table-row-disabled' : ''}
                        />
                    </div>
                    <Divider />
                    <Row justify="space-between" align="middle" style={{ marginBottom: 24 }} gutter={[16, 16]}>
                        <Col xs={24} md={16}>
                             <Title level={5}>Assigned Students for Transport</Title>
                        </Col>
                         <Col xs={24} md={8}>
                             <Search
                                placeholder="Search Assigned by Name or Roll No"
                                onChange={e => setAssignedSearchTerm(e.target.value)}
                                style={{ width: '100%' }}
                                allowClear
                            />
                        </Col>
                    </Row>
                    <div style={{ overflowX: 'auto' }}>
                         <Table
                            columns={assignedColumns}
                            dataSource={assignedStudentsForClass}
                            rowKey="id"
                            bordered
                            loading={isLoading}
                            scroll={{ x: 'max-content' }}
                            locale={{ emptyText: 'No students from this class have been assigned to transport yet.' }}
                        />
                    </div>
                </>
            ) : (
                 <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={<Text>Please select an academic year where you are a class teacher.</Text>}
                />
            )}
            
        </Card>
    );
};

export default StudentTransportAllocate;
