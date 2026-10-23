import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Spin,
    Alert,
    Empty,
    Modal,
    Select,
    Input,
    Table,
} from 'antd';
import {
    ArrowLeftOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    SearchOutlined,
    TeamOutlined,
    TrophyOutlined,
    ClockCircleOutlined,
    BookOutlined,
    FileTextOutlined,
    UserOutlined,
    CheckOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import {
    fetchStudentsByClassRequest,
    type StudentForReport,
    fetchMcqResultsRequest,
} from '../../store/features/mcq-results/mcqResultsSlice';
import {
    fetchMcqTestHistoryForStudentRequest,
    type TestSession,
} from '../../store/features/mcq-test-history/mcqTestHistorySlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';

const { Option } = Select;

interface ClassOption {
    key: string;
    label: string;
    className: string;
    sectionName: string;
}

const StudentMCQTestReport: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: teacherDataLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const {
        students,
        results: allMcqResults,
        loading: studentsLoading,
        error: studentsError,
    } = useSelector((state: RootState) => state.mcqResults);
    const { history: studentHistory, loading: historyLoading } = useSelector(
        (state: RootState) => state.mcqTestHistory
    );

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'attempted' | 'pending'>('all');

    // Modal states
    const [studentHistoryModalVisible, setStudentHistoryModalVisible] = useState(false);
    const [detailedReportModalVisible, setDetailedReportModalVisible] = useState(false);

    // Data for modals
    const [selectedStudent, setSelectedStudent] = useState<StudentForReport | null>(null);
    const [selectedTestSession, setSelectedTestSession] = useState<TestSession | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchMcqResultsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars?.length > 0 && !selectedYear) {
            const currentYear = (
                calendars as { academic_year: string; is_current: boolean }[]
            ).find(c => c.is_current)?.academic_year;
            setSelectedYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo<ClassOption[]>(() => {
        if (!selectedYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: Map<string, ClassOption>, m: any) => {
            const key = `${m.class_name}||${m.section_name}`;
            if (!acc.has(key)) {
                acc.set(key, { key, label: `Class ${m.class_name} - Section ${m.section_name}`, className: m.class_name, sectionName: m.section_name });
            }
            return acc;
        }, new Map<string, ClassOption>());
        return Array.from(uniqueClasses.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedYear]);

    // Select first class automatically once classes load
    useEffect(() => {
        if (classOptions.length > 0 && !selectedClassKey) {
            setSelectedClassKey(classOptions[0].key);
        }
    }, [classOptions, selectedClassKey]);

    useEffect(() => {
        if (selectedClassKey && selectedYear && user?.organization_key) {
            const [className, sectionName] = selectedClassKey.split('||');
            dispatch(
                fetchStudentsByClassRequest({
                    organizationKey: user.organization_key,
                    academicYear: selectedYear,
                    className,
                    sectionName,
                })
            );
        }
    }, [dispatch, selectedClassKey, selectedYear, user?.organization_key]);

    const studentsWithTestStatus = useMemo(() => {
        const studentIdsWithTests = new Set(
            allMcqResults
                .filter(
                    result =>
                        result.academic_year === selectedYear &&
                        selectedClassKey &&
                        result.class_name === selectedClassKey.split('||')[0] &&
                        result.section_name === selectedClassKey.split('||')[1]
                )
                .map(result => result.student.student_id)
        );
        return students.map(student => ({
            ...student,
            hasTakenTest: studentIdsWithTests.has(student.id),
        }));
    }, [students, allMcqResults, selectedYear, selectedClassKey]);

    // Metrics for the currently selected class
    const classMetrics = useMemo(() => {
        const total = studentsWithTestStatus.length;
        const attempted = studentsWithTestStatus.filter(s => s.hasTakenTest).length;
        const pending = total - attempted;
        const rate = total > 0 ? Math.round((attempted / total) * 100) : 0;
        return { total, attempted, pending, rate };
    }, [studentsWithTestStatus]);

    // Filtered student list
    const filteredStudents = useMemo(() => {
        return studentsWithTestStatus.filter(student => {
            const matchesSearch =
                (student.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.register_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.roll_no || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'attempted') return student.hasTakenTest;
            if (statusFilter === 'pending') return !student.hasTakenTest;

            return true;
        });
    }, [studentsWithTestStatus, searchTerm, statusFilter]);

    // Avatar background generator
    const getAvatarBg = (name: string) => {
        const gradients = [
            'linear-gradient(135deg, #2563eb, #4f46e5)',
            'linear-gradient(135deg, #059669, #0d9488)',
            'linear-gradient(135deg, #9333ea, #db2777)',
            'linear-gradient(135deg, #d97706, #ea580c)',
            'linear-gradient(135deg, #e11d48, #db2777)',
            'linear-gradient(135deg, #0891b2, #2563eb)',
        ];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
    };

    const StudentAvatar: React.FC<{ name: string; size?: number }> = ({ name, size = 38 }) => {
        const initials = (name || '')
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '10px',
                    background: getAvatarBg(name),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: size > 40 ? '15px' : '12px',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
            >
                {initials || <UserOutlined />}
            </div>
        );
    };

    const handleViewMore = (student: StudentForReport) => {
        setSelectedStudent(student);
        dispatch(fetchMcqTestHistoryForStudentRequest(student.id));
        setStudentHistoryModalVisible(true);
    };

    const handleViewDetailedReport = (session: TestSession) => {
        setSelectedTestSession(session);
        setDetailedReportModalVisible(true);
    };

    const studentColumns = [
        {
            title: 'Roll',
            dataIndex: 'roll_no',
            key: 'roll_no',
            width: 75,
            align: 'center' as const,
            render: (text: string, _: any, idx: number) => (
                <span
                    style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: '#475569',
                    }}
                >
                    {text || idx + 1}
                </span>
            ),
        },
        {
            title: 'Student Details',
            key: 'student',
            render: (_: any, record: StudentForReport) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StudentAvatar name={record.full_name} size={40} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                            {record.full_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: '#0284c7',
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    backgroundColor: '#f0f9ff',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #bae6fd',
                                }}
                            >
                                {record.register_no}
                            </span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'MCQ Assessment Status',
            key: 'status',
            width: 220,
            render: (_: any, record: StudentForReport & { hasTakenTest: boolean }) => (
                <div>
                    {record.hasTakenTest ? (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                backgroundColor: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                            }}
                        >
                            <CheckCircleOutlined /> Attempted Tests
                        </span>
                    ) : (
                        <span
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 600,
                                backgroundColor: '#f8fafc',
                                color: '#94a3b8',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            No Tests Taken
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 170,
            align: 'center' as const,
            render: (_: any, record: StudentForReport & { hasTakenTest: boolean }) => (
                <button
                    type="button"
                    onClick={() => handleViewMore(record)}
                    disabled={!record.hasTakenTest}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: record.hasTakenTest ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                        backgroundColor: record.hasTakenTest ? '#f0f9ff' : '#f8fafc',
                        color: record.hasTakenTest ? '#0284c7' : '#94a3b8',
                        cursor: record.hasTakenTest ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <EyeOutlined />
                    <span>View Test History</span>
                </button>
            ),
        },
    ];

    const isLoading = teacherDataLoading || studentsLoading;

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f8fafc',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
        >
            {/* 1. Header Card */}
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                >
                    {/* Title & Navigation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => dispatch(setCurrentPage('staffdashboard'))}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#475569',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <ArrowLeftOutlined />
                                <span>Back to Dashboard</span>
                            </button>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#0284c7',
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '8px',
                                }}
                            >
                                <FileTextOutlined style={{ color: '#0284c7' }} />
                                <span>MCQ Assessment & Test Reports</span>
                            </span>
                        </div>

                        <h1
                            style={{
                                margin: '4px 0 0 0',
                                fontSize: '22px',
                                fontWeight: 800,
                                color: '#0f172a',
                                letterSpacing: '-0.02em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <span>Student MCQ Test Report</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            View and analyze comprehensive MCQ assessment performances and test history by class.
                        </p>
                    </div>

                    {/* Class & Academic Year Selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Academic Year Selector */}
                        <div style={{ minWidth: '170px' }}>
                            <Select
                                placeholder="Select Year"
                                style={{ width: '100%' }}
                                size="middle"
                                value={selectedYear}
                                onChange={setSelectedYear}
                                loading={teacherDataLoading}
                            >
                                {(calendars || []).map((cal: any) => (
                                    <Option key={cal.id || cal.academic_year} value={cal.academic_year}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CalendarOutlined style={{ color: '#0284c7' }} />
                                            <span>{cal.academic_year}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Class & Section Selector */}
                        <div style={{ minWidth: '220px' }}>
                            <Select
                                showSearch
                                placeholder="Select Class & Section"
                                style={{ width: '100%' }}
                                size="middle"
                                value={selectedClassKey}
                                onChange={setSelectedClassKey}
                                disabled={!selectedYear}
                                loading={teacherDataLoading}
                                allowClear
                            >
                                {classOptions.map((opt: any) => (
                                    <Option key={opt.key} value={opt.key}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <BookOutlined style={{ color: '#4f46e5' }} />
                                            <span>{opt.label}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Selected Class Banner */}
                {selectedClassKey && (
                    <div
                        style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            fontSize: '13px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                                Active Class Roster:
                            </span>
                            <span
                                style={{
                                    fontWeight: 700,
                                    color: '#0369a1',
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    padding: '4px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            >
                                {classOptions.find(c => c.key === selectedClassKey)?.label || selectedClassKey}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>
                                ({selectedYear})
                            </span>
                        </div>

                        <span
                            style={{
                                color: '#15803d',
                                backgroundColor: '#dcfce7',
                                border: '1px solid #86efac',
                                padding: '3px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <CheckCircleOutlined /> Active Class Selected
                        </span>
                    </div>
                )}
            </div>

            {studentsError && (
                <Alert
                    message="Error Fetching Students"
                    description={studentsError}
                    type="error"
                    showIcon
                    style={{ borderRadius: '12px' }}
                />
            )}

            {selectedClassKey ? (
                <>
                    {/* 2. Class MCQ KPI Metric Cards */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        {/* Total Students */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Total Students
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                    {classMetrics.total} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Enrolled</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    In this class & section
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #dbeafe',
                                }}
                            >
                                <TeamOutlined />
                            </div>
                        </div>

                        {/* Attempted Tests */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Attempted Tests
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                                    {classMetrics.attempted} <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>({classMetrics.rate}%)</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Students with test submissions
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #a7f3d0',
                                }}
                            >
                                <CheckCircleOutlined />
                            </div>
                        </div>

                        {/* Pending / No Test */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    No Tests Yet
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                                    {classMetrics.pending} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Students</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Awaiting assessment attempt
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #fecaca',
                                }}
                            >
                                <CloseCircleOutlined />
                            </div>
                        </div>

                        {/* Participation Badge */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Participation Rate
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                                    {classMetrics.rate}%
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Class participation benchmark
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#fffbeb',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #fde68a',
                                }}
                            >
                                <TrophyOutlined />
                            </div>
                        </div>
                    </div>

                    {/* 3. Search & Filters Bar */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                    >
                        {/* Search Input */}
                        <div style={{ width: '280px' }}>
                            <Input
                                placeholder="Search student name, roll, reg..."
                                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                allowClear
                                style={{ borderRadius: '8px' }}
                            />
                        </div>

                        {/* Status Filter Toggle Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginRight: '4px' }}>
                                Filter:
                            </span>
                            {[
                                { key: 'all', label: `All (${classMetrics.total})` },
                                { key: 'attempted', label: `Attempted (${classMetrics.attempted})` },
                                { key: 'pending', label: `No Tests (${classMetrics.pending})` },
                            ].map(item => {
                                const isSelected = statusFilter === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setStatusFilter(item.key as any)}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: isSelected ? 700 : 500,
                                            border: isSelected ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                                            backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                                            color: isSelected ? '#0369a1' : '#64748b',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 4. Student Roster Table */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                    >
                        <Spin spinning={isLoading}>
                            <Table
                                columns={studentColumns}
                                dataSource={filteredStudents}
                                rowKey="id"
                                pagination={{
                                    pageSize: 20,
                                    showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} students`,
                                    style: { padding: '16px 20px' },
                                }}
                                scroll={{ x: 750 }}
                            />
                        </Spin>
                    </div>
                </>
            ) : (
                /* Empty state when no class is selected */
                <div
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        padding: '48px 24px',
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                >
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                    No Class Selected
                                </span>
                                <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                    Please select an Academic Year and an assigned Class & Section from the top selector to view student test performance records.
                                </span>
                            </div>
                        }
                    />
                </div>
            )}

            {/* Modal 1: Student Test History Modal */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px' }}>
                        <TrophyOutlined style={{ color: '#0284c7', fontSize: '18px' }} />
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                Test History: {selectedStudent?.full_name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                Reg No: <strong style={{ color: '#0284c7' }}>{selectedStudent?.register_no}</strong> | Roll: {selectedStudent?.roll_no || 'N/A'}
                            </div>
                        </div>
                    </div>
                }
                open={studentHistoryModalVisible}
                onCancel={() => setStudentHistoryModalVisible(false)}
                footer={null}
                width={760}
                style={{ top: 40 }}
            >
                <Spin spinning={historyLoading}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        {studentHistory && studentHistory.length > 0 ? (
                            studentHistory.map((session, idx) => {
                                const percentage =
                                    session.totalQuestions > 0
                                        ? Math.round((session.score / session.totalQuestions) * 100)
                                        : 0;
                                const isPassed = percentage >= 50;

                                return (
                                    <div
                                        key={`${session.subject}-${session.test_date}-${idx}`}
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            padding: '14px 18px',
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: '12px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                                            transition: 'border-color 0.15s ease',
                                        }}
                                    >
                                        {/* Subject & Date */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                                                {session.subject}
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px', color: '#64748b' }}>
                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <CalendarOutlined style={{ color: '#0284c7' }} />
                                                    {dayjs(session.test_date).format('DD MMM YYYY')}
                                                </span>
                                                {session.time_taken && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <ClockCircleOutlined style={{ color: '#64748b' }} />
                                                        {session.time_taken}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Score & Action Button */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {/* Score Pill */}
                                            <div
                                                style={{
                                                    padding: '5px 12px',
                                                    borderRadius: '8px',
                                                    backgroundColor: isPassed ? '#ecfdf5' : '#fef2f2',
                                                    border: isPassed ? '1px solid #a7f3d0' : '1px solid #fecaca',
                                                    color: isPassed ? '#059669' : '#dc2626',
                                                    fontWeight: 800,
                                                    fontSize: '13px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                <span>{session.score} / {session.totalQuestions}</span>
                                                <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '6px' }}>
                                                    ({percentage}%)
                                                </span>
                                            </div>

                                            {/* View Detailed Paper */}
                                            <button
                                                type="button"
                                                onClick={() => handleViewDetailedReport(session)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    backgroundColor: '#0284c7',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 1px 2px rgba(2, 132, 199, 0.25)',
                                                }}
                                            >
                                                <EyeOutlined />
                                                <span>Review Test Paper</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="No MCQ test attempts found for this student in the subjects you teach."
                                />
                            </div>
                        )}
                    </div>
                </Spin>
            </Modal>

            {/* Modal 2: Detailed Test Question Paper Review */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '6px' }}>
                        <FileTextOutlined style={{ color: '#4f46e5', fontSize: '18px' }} />
                        <div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                Detailed Test Paper Review
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                                {selectedTestSession?.subject} • Attempted on{' '}
                                {dayjs(selectedTestSession?.test_date).format('DD MMM YYYY')}
                            </div>
                        </div>
                    </div>
                }
                open={detailedReportModalVisible}
                onCancel={() => setDetailedReportModalVisible(false)}
                footer={null}
                width={840}
                style={{ top: 30 }}
            >
                {selectedTestSession && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                        {/* Score Summary Box */}
                        <div
                            style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '12px',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    Final Score
                                </span>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: selectedTestSession.score >= selectedTestSession.totalQuestions / 2 ? '#059669' : '#dc2626' }}>
                                    {selectedTestSession.score} / {selectedTestSession.totalQuestions}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    Accuracy
                                </span>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    {selectedTestSession.totalQuestions > 0
                                        ? `${Math.round((selectedTestSession.score / selectedTestSession.totalQuestions) * 100)}%`
                                        : '0%'}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    Time Taken
                                </span>
                                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>
                                    {selectedTestSession.time_taken || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                    Date
                                </span>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: '#475569', marginTop: '3px' }}>
                                    {dayjs(selectedTestSession.test_date).format('DD MMM YYYY')}
                                </div>
                            </div>
                        </div>

                        {/* Questions Breakdown List */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '550px', overflowY: 'auto', paddingRight: '4px' }}>
                            {selectedTestSession.questions?.map((item, index) => {
                                const isCorrect = item.selected_answer === item.correct_answer;
                                return (
                                    <div
                                        key={index}
                                        style={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '12px',
                                            border: isCorrect ? '1px solid #d1fae5' : '1px solid #fee2e2',
                                            padding: '16px 18px',
                                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                            <span
                                                style={{
                                                    width: '26px',
                                                    height: '26px',
                                                    borderRadius: '6px',
                                                    backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2',
                                                    color: isCorrect ? '#059669' : '#dc2626',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    flexShrink: 0,
                                                    border: isCorrect ? '1px solid #a7f3d0' : '1px solid #fecaca',
                                                }}
                                            >
                                                {index + 1}
                                            </span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', lineHeight: '1.4' }}>
                                                    {item.question_text}
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: '10px',
                                                        display: 'flex',
                                                        flexWrap: 'wrap',
                                                        alignItems: 'center',
                                                        gap: '12px',
                                                        fontSize: '12px',
                                                    }}
                                                >
                                                    {/* Student's answer */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ color: '#64748b', fontWeight: 600 }}>
                                                            Student's Answer:
                                                        </span>
                                                        <span
                                                            style={{
                                                                padding: '3px 10px',
                                                                borderRadius: '6px',
                                                                fontWeight: 700,
                                                                backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2',
                                                                color: isCorrect ? '#059669' : '#dc2626',
                                                                border: isCorrect ? '1px solid #a7f3d0' : '1px solid #fecaca',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            {isCorrect ? <CheckOutlined /> : <CloseCircleOutlined />}
                                                            {item.selected_answer || 'Not Answered'}
                                                        </span>
                                                    </div>

                                                    {/* Correct Answer if incorrect */}
                                                    {!isCorrect && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ color: '#64748b', fontWeight: 600 }}>
                                                                Correct Answer:
                                                            </span>
                                                            <span
                                                                style={{
                                                                    padding: '3px 10px',
                                                                    borderRadius: '6px',
                                                                    fontWeight: 700,
                                                                    backgroundColor: '#f0f9ff',
                                                                    color: '#0284c7',
                                                                    border: '1px solid #bae6fd',
                                                                }}
                                                            >
                                                                {item.correct_answer}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentMCQTestReport;
