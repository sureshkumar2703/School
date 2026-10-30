/**
 * Teacher Student Transport Allocation & Fleet Roster
 * Sri Gayathri SMS Portal
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Table,
    Typography,
    Spin,
    Alert,
    Empty,
    Input,
    Row,
    Col,
    Button,
    message,
    Switch,
    Popconfirm,
    Select,
    Tag,
    Tabs,
    Progress,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { supabase } from '../../service/supabaseClient';
import {
    assignTransportRequest,
    fetchAllocationsRequest,
    updateAllocationStatusRequest,
    deleteAllocationRequest,
    type StudentTransportAllocation,
} from '../../store/features/student-transport/studentTransportSlice';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import {
    DeleteOutlined,
    ArrowLeftOutlined,
    CarOutlined,
    TeamOutlined,
    SearchOutlined,
    FileExcelOutlined,
    CheckCircleOutlined,
    UserOutlined,
    CalendarOutlined,
    EnvironmentOutlined,
    SafetyCertificateOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';

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
    const [activeTab, setActiveTab] = useState<'assigned' | 'unassigned'>('assigned');

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
            (student.roll_no && student.roll_no.toLowerCase().includes(assignedSearchTerm.toLowerCase())) ||
            (student.register_no && student.register_no.toLowerCase().includes(assignedSearchTerm.toLowerCase()))
        ).sort((a, b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
    }, [transportAllocations, myClassTeacherAssignment, assignedSearchTerm]);

    const assignedStudentIds = useMemo(() => {
        if (!myClassTeacherAssignment) return new Set<string>();
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
            (student.roll_no && student.roll_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
            student.register_no.toLowerCase().includes(searchTerm.toLowerCase())
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
        message.success(`Assigned ${selectedStudentsData.length} students to transport.`);
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

    // Metrics
    const totalClassCount = students.length;
    const enrolledCount = assignedStudentsForClass.length;
    const activeTransportCount = assignedStudentsForClass.filter(s => s.status === 'Active').length;
    const selfCommuteCount = Math.max(0, totalClassCount - assignedStudentIds.size);
    const transportPercent = totalClassCount > 0 ? Math.round((enrolledCount / totalClassCount) * 100) : 0;

    // Export Transport Roster to Excel (.xlsx)
    const handleExportExcel = () => {
        if (assignedStudentsForClass.length === 0) {
            message.warning("No transport allocations to export.");
            return;
        }

        const dataToExport = assignedStudentsForClass.map((s, idx) => ({
            'S.No': idx + 1,
            'Roll No': s.roll_no || 'N/A',
            'Register No': s.register_no || 'N/A',
            'Student Name': s.full_name || 'N/A',
            'Class': `${s.class_name} - ${s.section_name}`,
            'Academic Year': s.academic_year,
            'Permanent Address': s.permanent_address || 'N/A',
            'Temporary Address': s.temporary_address || 'N/A',
            'Transport Status': s.status,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transport Roster");
        const filename = `${myClassTeacherAssignment?.class_name}_${myClassTeacherAssignment?.section_name}_Transport_Roster.xlsx`.replace(/\s+/g, '_');
        XLSX.writeFile(wb, filename);
        message.success("Transport roster exported successfully!");
    };

    const unassignedColumns: ColumnsType<StudentInfo> = [
        {
            title: 'Student Details',
            key: 'student',
            render: (_, record) => {
                const isAssigned = assignedStudentIds.has(record.id);
                return (
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-slate-200">
                            {record.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-800 text-sm">{record.full_name}</span>
                                {isAssigned && (
                                    <Tag color="cyan" className="rounded-md text-xs font-semibold m-0">
                                        ✓ Enrolled
                                    </Tag>
                                )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Reg: <strong>{record.register_no}</strong></span>
                                {record.roll_no && <span>• Roll: <strong>{record.roll_no}</strong></span>}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Permanent Address / Pickup Point',
            dataIndex: 'permanent_address',
            key: 'permanent_address',
            render: (text) => (
                <div className="flex items-start gap-1.5 text-xs text-slate-600 max-w-xs">
                    <EnvironmentOutlined className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{text || 'Not Registered'}</span>
                </div>
            ),
        },
        {
            title: 'Temporary Address',
            dataIndex: 'temporary_address',
            key: 'temporary_address',
            render: (text) => (
                <span className="text-xs text-slate-500">
                    {text || 'Same as permanent'}
                </span>
            ),
        },
        {
            title: 'Enrollment Status',
            key: 'status_col',
            width: 140,
            render: (_, record) => {
                const isAssigned = assignedStudentIds.has(record.id);
                return isAssigned ? (
                    <Tag color="success" className="rounded-md font-semibold text-xs">
                        Transport Active
                    </Tag>
                ) : (
                    <Tag color="default" className="rounded-md font-semibold text-xs text-slate-600">
                        Self Commute
                    </Tag>
                );
            },
        },
    ];

    const assignedColumns: ColumnsType<StudentTransportAllocation> = [
        {
            title: 'Student Details',
            key: 'student',
            render: (_, record) => {
                const studentName = record.full_name || 'Student';
                const initials = studentName.slice(0, 2).toUpperCase();
                return (
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-amber-200">
                            {initials}
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 text-sm">{studentName}</div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span>Reg: <strong>{record.register_no || 'N/A'}</strong></span>
                                {record.roll_no && <span>• Roll: <strong>{record.roll_no}</strong></span>}
                            </div>
                        </div>
                    </div>
                );
            }

        },
        {
            title: 'Assigned Route / Address',
            dataIndex: 'permanent_address',
            key: 'permanent_address',
            render: (text) => (
                <div className="flex items-start gap-1.5 text-xs text-slate-600 max-w-xs">
                    <EnvironmentOutlined className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{text || 'Address not registered'}</span>
                </div>
            ),
        },
        {
            title: 'Service Status',
            dataIndex: 'status',
            key: 'status',
            width: 160,
            render: (status, record) => (
                <div className="flex items-center gap-2">
                    <Switch
                        checkedChildren="Active"
                        unCheckedChildren="Inactive"
                        checked={status === 'Active'}
                        onChange={(checked) => handleStatusToggle(checked, record)}
                        loading={transportLoading}
                        className={status === 'Active' ? 'bg-emerald-600' : 'bg-slate-300'}
                    />
                    <Tag color={status === 'Active' ? 'green' : 'default'} className="rounded-md font-semibold text-xs m-0">
                        {status}
                    </Tag>
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 80,
            render: (_, record) => (
                <Popconfirm
                    title="Remove transport allocation?"
                    description={`Remove ${record.full_name || 'this student'} from the school bus roster?`}
                    onConfirm={() => handleDelete(record.id)}
                    okText="Yes, Remove"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                >
                    <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        className="hover:bg-rose-50 rounded-lg flex items-center justify-center text-rose-500"
                        title="Delete allocation"
                    />
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50/70 space-y-5">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined className="text-slate-600" />}
                            onClick={() => dispatch(setCurrentPage('staffdashboard'))}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 border-0 flex-shrink-0"
                            title="Back to Dashboard"
                        />
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm flex-shrink-0">
                            <CarOutlined className="text-2xl" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight m-0">
                                    Student Transport Allocation
                                </h1>
                                <Tag color="orange" className="rounded-full px-2.5 py-0.5 text-xs font-semibold m-0">
                                    Fleet & Route Roster
                                </Tag>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 m-0 mt-0.5">
                                {myClassTeacherAssignment ? (
                                    <span>
                                        Class Teacher Roster for <strong>{myClassTeacherAssignment.class_name} - {myClassTeacherAssignment.section_name}</strong> ({myClassTeacherAssignment.academic_year})
                                    </span>
                                ) : (
                                    <span>Manage daily school bus and van transit allocations for class cohorts</span>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                        {assignedStudentsForClass.length > 0 && (
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleExportExcel}
                                className="rounded-xl border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-300 font-medium h-9"
                            >
                                Export Manifest
                            </Button>
                        )}
                        <div className="w-44">
                            <Select
                                value={selectedYear}
                                onChange={setSelectedYear}
                                placeholder="Academic Year"
                                style={{ width: '100%' }}
                                loading={statsLoading}
                                allowClear
                                className="rounded-xl"
                            >
                                {academicYearOptions.map(year => (
                                    <Option key={year} value={year}>
                                        {year} {year === stats.activeAcademicYear && "(Current)"}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {(statsError || error) && (
                <Alert message="Error" description={statsError || error} type="error" showIcon className="rounded-xl" />
            )}

            {/* If Not Class Teacher */}
            {!myClassTeacherAssignment && !statsLoading ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-3">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="space-y-1">
                                <span className="font-semibold text-slate-700 block text-base">
                                    Class Teacher Authorization Required
                                </span>
                                <span className="text-xs text-slate-400 block max-w-md mx-auto">
                                    You are not currently designated as the Class Teacher for Academic Year {selectedYear || 'selected'}. Transport enrollment is managed by respective Class Teachers.
                                </span>
                            </div>
                        }
                    />
                </div>
            ) : (
                <>
                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Class Strength</span>
                                <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <TeamOutlined />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-800">{totalClassCount}</span>
                                <span className="text-xs text-slate-500 font-medium">Students Enrolled</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                {myClassTeacherAssignment?.class_name} - {myClassTeacherAssignment?.section_name}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Transport Riders</span>
                                <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                    <CarOutlined />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-amber-600">{enrolledCount}</span>
                                <span className="text-xs text-slate-500 font-medium">/ {totalClassCount} Allocated</span>
                            </div>
                            <div className="mt-2">
                                <Progress
                                    percent={transportPercent}
                                    size="small"
                                    strokeColor="#f59e0b"
                                    showInfo={false}
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Bus Passes</span>
                                <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <SafetyCertificateOutlined />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-emerald-600">{activeTransportCount}</span>
                                <span className="text-xs text-slate-500 font-medium">Active Passes</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                {enrolledCount - activeTransportCount} Inactive / Suspended
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Self Commuters</span>
                                <div className="h-8 w-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                                    <UserOutlined />
                                </div>
                            </div>
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-800">{selfCommuteCount}</span>
                                <span className="text-xs text-slate-500 font-medium">Own Transport</span>
                            </div>
                            <div className="mt-2 text-xs text-slate-500">
                                Eligible for transport allocation
                            </div>
                        </div>
                    </div>

                    {/* Dual Tab Content Container */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
                        <Tabs
                            activeKey={activeTab}
                            onChange={(key) => setActiveTab(key as any)}
                            items={[
                                {
                                    key: 'assigned',
                                    label: (
                                        <div className="flex items-center gap-2 px-1">
                                            <CarOutlined />
                                            <span>Active Transport Roster</span>
                                            <Tag color="orange" className="rounded-full text-xs font-bold m-0 px-2">
                                                {enrolledCount}
                                            </Tag>
                                        </div>
                                    ),
                                    children: (
                                        <div className="space-y-4 pt-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <Input
                                                    prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                                                    placeholder="Search assigned students by name, roll no, or register no..."
                                                    value={assignedSearchTerm}
                                                    onChange={(e) => setAssignedSearchTerm(e.target.value)}
                                                    className="w-full sm:w-80 rounded-xl text-xs"
                                                    allowClear
                                                />
                                                <Button
                                                    type="primary"
                                                    icon={<PlusOutlined />}
                                                    onClick={() => setActiveTab('unassigned')}
                                                    className="rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 h-9"
                                                >
                                                    Enroll More Students
                                                </Button>
                                            </div>

                                            <Spin spinning={isLoading}>
                                                <Table
                                                    columns={assignedColumns}
                                                    dataSource={assignedStudentsForClass}
                                                    rowKey="id"
                                                    pagination={{
                                                        pageSize: 15,
                                                        showSizeChanger: true,
                                                        pageSizeOptions: ['15', '25', '50'],
                                                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} passengers`,
                                                    }}
                                                    scroll={{ x: 650 }}
                                                    className="border border-slate-100 rounded-xl overflow-hidden"
                                                    locale={{
                                                        emptyText: (
                                                            <div className="p-6 text-center text-slate-400">
                                                                No students from this class are currently enrolled in transport.
                                                            </div>
                                                        ),
                                                    }}
                                                />
                                            </Spin>
                                        </div>
                                    ),
                                },
                                {
                                    key: 'unassigned',
                                    label: (
                                        <div className="flex items-center gap-2 px-1">
                                            <TeamOutlined />
                                            <span>Enroll Class Students</span>
                                            <Tag color="blue" className="rounded-full text-xs font-bold m-0 px-2">
                                                {selfCommuteCount} Available
                                            </Tag>
                                        </div>
                                    ),
                                    children: (
                                        <div className="space-y-4 pt-2">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <Input
                                                    prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                                                    placeholder="Search class students by name, roll no, or register no..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="w-full sm:w-80 rounded-xl text-xs"
                                                    allowClear
                                                />

                                                {hasSelected && (
                                                    <Button
                                                        type="primary"
                                                        icon={<CarOutlined />}
                                                        onClick={handleAssign}
                                                        loading={transportLoading}
                                                        className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 h-9"
                                                    >
                                                        Allocate Selected ({selectedRowKeys.length}) to Transport
                                                    </Button>
                                                )}
                                            </div>

                                            <Spin spinning={isLoading}>
                                                <Table
                                                    rowSelection={rowSelection}
                                                    columns={unassignedColumns}
                                                    dataSource={filteredStudents}
                                                    rowKey="id"
                                                    pagination={{
                                                        pageSize: 15,
                                                        showSizeChanger: true,
                                                        pageSizeOptions: ['15', '25', '50'],
                                                        showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} class students`,
                                                    }}
                                                    scroll={{ x: 750 }}
                                                    className="border border-slate-100 rounded-xl overflow-hidden"
                                                    locale={{
                                                        emptyText: (
                                                            <div className="p-6 text-center text-slate-400">
                                                                No students found in your class.
                                                            </div>
                                                        ),
                                                    }}
                                                />
                                            </Spin>
                                        </div>
                                    ),
                                },
                            ]}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

export default StudentTransportAllocate;
