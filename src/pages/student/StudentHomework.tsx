import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Spin,
    Alert,
    Empty,
    Tag,
    Select,
    Row,
    Col,
    Button,
    Modal,
    List,
    Descriptions,
    Table,
    Space,
    Input,
    Segmented,
    Grid,
    Progress,
    Tooltip,
    Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    BookOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    EyeOutlined,
    SearchOutlined,
    CalendarOutlined,
    CheckCircleFilled,
    SyncOutlined,
    MessageOutlined,
    TeamOutlined,
    ReloadOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    TagOutlined,
    FileTextOutlined,
    SendOutlined,
    CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchHomeworkRequest, type Homework } from '../../store/features/homework/homeworkSlice';
import {
    fetchHomeworkReportsRequest,
    saveHomeworkReportRequest,
    updateHomeworkReportStatusRequest,
    type HomeworkReport,
} from '../../store/features/homework-report/homeworkReportSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text, Paragraph } = Typography;

export interface AcademicYearOption {
    value: string;
    label: string;
    isCurrent: boolean;
    status?: string;
}

// Subject color mapping presets
const SUBJECT_COLORS: { [key: string]: { bg: string; border: string; text: string; badge: string } } = {
    math: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#3b82f6' },
    science: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', badge: '#10b981' },
    physics: { bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', badge: '#14b8a6' },
    chemistry: { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', badge: '#8b5cf6' },
    biology: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badge: '#22c55e' },
    english: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', badge: '#f97316' },
    social: { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', badge: '#f43f5e' },
    history: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badge: '#ef4444' },
    geography: { bg: '#ecfeff', border: '#a5f3fc', text: '#155e75', badge: '#06b6d4' },
    computer: { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', badge: '#0284c7' },
    language: { bg: '#fdf4ff', border: '#f5d0fe', text: '#86198f', badge: '#d946ef' },
    default: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', badge: '#64748b' },
};

const getSubjectPalette = (subjectName?: string) => {
    if (!subjectName) return SUBJECT_COLORS.default;
    const lower = subjectName.toLowerCase();
    if (lower.includes('math')) return SUBJECT_COLORS.math;
    if (lower.includes('physics')) return SUBJECT_COLORS.physics;
    if (lower.includes('chem')) return SUBJECT_COLORS.chemistry;
    if (lower.includes('bio')) return SUBJECT_COLORS.biology;
    if (lower.includes('sci')) return SUBJECT_COLORS.science;
    if (lower.includes('eng')) return SUBJECT_COLORS.english;
    if (lower.includes('soc') || lower.includes('civic') || lower.includes('pol')) return SUBJECT_COLORS.social;
    if (lower.includes('hist')) return SUBJECT_COLORS.history;
    if (lower.includes('geo')) return SUBJECT_COLORS.geography;
    if (lower.includes('comp') || lower.includes('it') || lower.includes('code') || lower.includes('tech')) return SUBJECT_COLORS.computer;
    if (lower.includes('hindi') || lower.includes('tamil') || lower.includes('french') || lower.includes('lang') || lower.includes('sans')) {
        return SUBJECT_COLORS.language;
    }
    return SUBJECT_COLORS.default;
};

const StudentHomework: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { homework, loading: homeworkLoading, error: homeworkError } = useSelector((state: RootState) => state.homework);
    const { reports, loading: reportLoading } = useSelector((state: RootState) => state.homeworkReport);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section and Class allocated for selected academic year
    const [studentClass, setStudentClass] = useState<string | null>(null);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    // UI state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirm' | 'completed' | 'cancel'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
    const [viewingHomework, setViewingHomework] = useState<Homework | null>(null);

    // 1. Fetch Academic Years from database and default to active/current
    useEffect(() => {
        let isMounted = true;
        if (!user?.organization_key) {
            setLoadingAcademicYears(false);
            return;
        }

        const fetchAcademicYears = async () => {
            setLoadingAcademicYears(true);
            try {
                const { data, error: yearError } = await supabase
                    .from('academic_year')
                    .select('academic_year, is_current, status')
                    .eq('organization_key', user.organization_key)
                    .order('created_at', { ascending: false });

                if (yearError) {
                    console.warn('Academic year fetch warning:', yearError.message);
                    return;
                }

                const rawList = data || [];
                const yearMap = new Map<string, AcademicYearOption>();

                rawList.forEach((row: any) => {
                    const y = (row.academic_year || '').trim();
                    if (y && !yearMap.has(y)) {
                        const isCur = row.is_current === true || row.is_current === 'true' || row.status === 'Active';
                        yearMap.set(y, {
                            value: y,
                            label: isCur ? `${y} (Current)` : y,
                            isCurrent: isCur,
                            status: row.status,
                        });
                    }
                });

                if (user?.academic_year && !yearMap.has(user.academic_year)) {
                    yearMap.set(user.academic_year, {
                        value: user.academic_year,
                        label: `${user.academic_year} (Current)`,
                        isCurrent: true,
                    });
                }

                const options = Array.from(yearMap.values()).sort((a, b) => {
                    if (a.isCurrent && !b.isCurrent) return -1;
                    if (!a.isCurrent && b.isCurrent) return 1;
                    return b.value.localeCompare(a.value);
                });

                if (isMounted) {
                    setAcademicYears(options);
                    const currentOption =
                        options.find((opt) => opt.isCurrent) ||
                        options.find((opt) => opt.status === 'Active') ||
                        options[0];
                    const defaultYear = currentOption?.value || user?.academic_year || '';
                    setSelectedAcademicYear((prev) => (prev ? prev : defaultYear));
                }
            } catch (err) {
                console.error('Error fetching academic years:', err);
                if (isMounted && user?.academic_year) {
                    setSelectedAcademicYear(user.academic_year);
                }
            } finally {
                if (isMounted) setLoadingAcademicYears(false);
            }
        };

        fetchAcademicYears();
        return () => {
            isMounted = false;
        };
    }, [user?.organization_key, user?.academic_year]);

    // 2. Fetch Student's Class & Section based on SELECTED academic year
    useEffect(() => {
        let isMounted = true;
        if (!user?.organization_key || !selectedAcademicYear) {
            setLoadingSection(false);
            return;
        }

        const fetchAllocationForYear = async () => {
            setLoadingSection(true);
            try {
                let foundClass: string | null = null;
                let foundSection: string | null = null;

                if (user?.register_no) {
                    const { data, error: allocError } = await supabase
                        .from('class_section_allocations')
                        .select('class_name, section_name')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', selectedAcademicYear)
                        .maybeSingle();

                    if (!allocError && data) {
                        foundClass = data.class_name;
                        foundSection = data.section_name;
                    }
                }

                if (!foundClass && user?.admitted_class) {
                    foundClass = user.admitted_class;
                }

                if (isMounted) {
                    setStudentClass(foundClass);
                    setSection(foundSection);
                }
            } catch (err) {
                console.error('Error fetching student allocation for academic year:', err);
                if (isMounted) {
                    setSection(null);
                }
            } finally {
                if (isMounted) setLoadingSection(false);
            }
        };

        fetchAllocationForYear();
        return () => {
            isMounted = false;
        };
    }, [user?.organization_key, user?.register_no, user?.admitted_class, selectedAcademicYear]);

    // 3. Fetch Homework and Reports with Realtime Subscriptions
    useEffect(() => {
        if (!user?.organization_key || !user?.id) return;

        dispatch(fetchHomeworkRequest(user.organization_key));
        dispatch(fetchHomeworkReportsRequest({ studentId: user.id }));

        const channel = supabase
            .channel('student-homework-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'homework',
                    filter: `organization_key=eq.${user.organization_key}`,
                },
                () => {
                    dispatch(fetchHomeworkRequest(user.organization_key!));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'homework_report',
                    filter: `student_id=eq.${user.id}`,
                },
                () => {
                    dispatch(fetchHomeworkReportsRequest({ studentId: user.id! }));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [dispatch, user?.organization_key, user?.id]);

    const effectiveClass = studentClass || user?.admitted_class;
    const isUpdating = loadingSection || homeworkLoading || reportLoading;

    // Report mapping: homework_id -> HomeworkReport
    const reportMap = useMemo(() => {
        return new Map(reports.map((r) => [r.homework_id, r]));
    }, [reports]);

    // Relevant homework for this student's allocated class, section & selected academic year
    const relevantHomework = useMemo(() => {
        if (!effectiveClass || !section || !selectedAcademicYear) return [];
        return homework.filter(
            (h) =>
                h.class_name === effectiveClass &&
                h.section_name === section &&
                h.academic_year === selectedAcademicYear
        );
    }, [homework, effectiveClass, section, selectedAcademicYear]);

    // Unique subjects list for filtering
    const uniqueSubjects = useMemo(() => {
        const set = new Set<string>();
        relevantHomework.forEach((h) => {
            if (h.subject) set.add(h.subject.trim());
        });
        return Array.from(set).sort();
    }, [relevantHomework]);

    // Check if the selected academic year is the current/active year
    const isCurrentYear = useMemo(() => {
        if (!selectedAcademicYear) return true;
        const currentOption = academicYears.find((y) => y.value === selectedAcademicYear);
        if (currentOption) {
            return currentOption.isCurrent === true || currentOption.status === 'Active';
        }
        return user?.academic_year ? selectedAcademicYear === user.academic_year : true;
    }, [academicYears, selectedAcademicYear, user?.academic_year]);

    // Summary Statistics
    const stats = useMemo(() => {
        const total = relevantHomework.length;
        let completed = 0;
        let awaitingConfirm = 0;
        let pending = 0;

        relevantHomework.forEach((h) => {
            const report = reportMap.get(h.id);
            if (report) {
                if (report.status === 'Completed') completed++;
                else if (report.status === 'Confirm') awaitingConfirm++;
                else if (report.status === 'Pending') pending++;
            } else {
                pending++; // New / unviewed homework is also pending action
            }
        });

        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            total,
            completed,
            awaitingConfirm,
            pending,
            completionRate,
        };
    }, [relevantHomework, reportMap]);

    // Filtered and Sorted Homework list
    const filteredHomework = useMemo(() => {
        return relevantHomework
            .filter((h) => {
                // Subject filter
                if (selectedSubject !== 'all' && h.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
                    return false;
                }

                const report = reportMap.get(h.id);
                const currentStatus = report?.status || 'Pending';

                // Status filter
                if (statusFilter === 'pending' && currentStatus !== 'Pending') {
                    return false;
                }
                if (statusFilter === 'confirm' && currentStatus !== 'Confirm') {
                    return false;
                }
                if (statusFilter === 'completed' && currentStatus !== 'Completed') {
                    return false;
                }
                if (statusFilter === 'cancel' && currentStatus !== 'Cancel') {
                    return false;
                }

                // Search query filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchSubject = h.subject.toLowerCase().includes(q);
                    const matchDate = dayjs(h.homework_date).format('DD MMM YYYY').toLowerCase().includes(q);
                    const matchTasks = h.homework_items?.some((item) => item.toLowerCase().includes(q));
                    if (!matchSubject && !matchDate && !matchTasks) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return dayjs(b.homework_date).valueOf() - dayjs(a.homework_date).valueOf();
                }
                return dayjs(a.homework_date).valueOf() - dayjs(b.homework_date).valueOf();
            });
    }, [relevantHomework, selectedSubject, statusFilter, searchQuery, sortBy, reportMap]);

    // Handlers
    const handlePreview = (hw: Homework) => {
        setViewingHomework(hw);
        const existingReport = reportMap.get(hw.id);
        if (isCurrentYear && !existingReport && user) {
            dispatch(
                saveHomeworkReportRequest({
                    organization_key: user.organization_key!,
                    academic_year: hw.academic_year,
                    class_name: hw.class_name,
                    section_name: hw.section_name,
                    subject: hw.subject,
                    homework_date: hw.homework_date,
                    questions: hw.homework_items,
                    student_id: user.id,
                    student_name: user.full_name,
                    roll_no: user.roll_no,
                    register_no: user.register_no,
                    homework_id: hw.id,
                    status: 'Pending',
                })
            );
        }
    };

    const handleConfirmSubmission = (hw: Homework) => {
        if (!isCurrentYear) {
            return;
        }
        const existingReport = reportMap.get(hw.id);
        if (existingReport) {
            dispatch(updateHomeworkReportStatusRequest({ reportId: existingReport.id, status: 'Confirm' }));
        } else if (user) {
            dispatch(
                saveHomeworkReportRequest({
                    organization_key: user.organization_key!,
                    academic_year: hw.academic_year,
                    class_name: hw.class_name,
                    section_name: hw.section_name,
                    subject: hw.subject,
                    homework_date: hw.homework_date,
                    questions: hw.homework_items,
                    student_id: user.id,
                    student_name: user.full_name,
                    roll_no: user.roll_no,
                    register_no: user.register_no,
                    homework_id: hw.id,
                    status: 'Confirm',
                })
            );
        }
    };

    // Navigation handlers
    const handleGoToChat = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    const handleGoToTeachers = () => {
        dispatch(setCurrentPage('studentmyteachers'));
    };

    // Status Tag Renderer
    const renderStatusBadge = (report?: HomeworkReport | null) => {
        if (!report) {
            return (
                <Tag
                    color="blue"
                    style={{
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '11px',
                        padding: '1px 8px',
                    }}
                >
                    New Assignment
                </Tag>
            );
        }

        switch (report.status) {
            case 'Completed':
                return (
                    <Tag
                        icon={<CheckCircleFilled />}
                        color="success"
                        style={{
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '1px 8px',
                        }}
                    >
                        Completed
                    </Tag>
                );
            case 'Confirm':
                return (
                    <Tag
                        icon={<SyncOutlined spin />}
                        color="processing"
                        style={{
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '1px 8px',
                        }}
                    >
                        Awaiting Teacher Approval
                    </Tag>
                );
            case 'Cancel':
                return (
                    <Tag
                        icon={<CloseCircleOutlined />}
                        color="error"
                        style={{
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '1px 8px',
                        }}
                    >
                        Cancelled
                    </Tag>
                );
            case 'Pending':
            default:
                return (
                    <Tag
                        color="warning"
                        style={{
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            padding: '1px 8px',
                        }}
                    >
                        Pending Submission
                    </Tag>
                );
        }
    };

    // Table view columns definition
    const columns: ColumnsType<Homework> = [
        {
            title: 'Assigned Date',
            dataIndex: 'homework_date',
            key: 'homework_date',
            width: 150,
            render: (date: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarOutlined style={{ color: '#2563eb' }} />
                    <span style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                        {dayjs(date).format('DD MMM YYYY')}
                    </span>
                </div>
            ),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            width: 170,
            render: (subject: string) => {
                const palette = getSubjectPalette(subject);
                return (
                    <span
                        style={{
                            background: palette.bg,
                            color: palette.text,
                            border: `1px solid ${palette.border}`,
                            borderRadius: '8px',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        <TagOutlined style={{ fontSize: '11px' }} />
                        {subject}
                    </span>
                );
            },
        },
        {
            title: 'Tasks / Questions',
            dataIndex: 'homework_items',
            key: 'homework_items',
            render: (items: string[]) => (
                <div style={{ maxWidth: '380px' }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                        {items?.length || 0} Task{items?.length === 1 ? '' : 's'} Assigned
                    </div>
                    {items && items.length > 0 && (
                        <div
                            style={{
                                fontSize: '11.5px',
                                color: '#64748b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                marginTop: '2px',
                            }}
                        >
                            1. {items[0]} {items.length > 1 && `(+${items.length - 1} more)`}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 210,
            render: (_: any, record: Homework) => {
                const report = reportMap.get(record.id);
                return renderStatusBadge(report);
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 180,
            align: 'right',
            render: (_: any, record: Homework) => {
                const report = reportMap.get(record.id);
                const isPending = !report || report.status === 'Pending';

                return (
                    <Space size={8}>
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handlePreview(record)}
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                            View
                        </Button>
                        {isCurrentYear && isPending && (
                            <Button
                                size="small"
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={() => handleConfirmSubmission(record)}
                                style={{
                                    borderRadius: '8px',
                                    background: '#10b981',
                                    borderColor: '#10b981',
                                    fontWeight: 600,
                                    fontSize: '11.5px',
                                }}
                            >
                                Submit
                            </Button>
                        )}
                        {!isCurrentYear && (
                            <Tag color="default" style={{ borderRadius: '6px' }}>
                                View Only
                            </Tag>
                        )}
                    </Space>
                );
            },
        },
    ];

    if (loadingAcademicYears && !selectedAcademicYear) {
        return (
            <div
                style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '32px',
                }}
            >
                <Spin size="large" />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                    Loading homework assignments and academic records...
                </div>
            </div>
        );
    }

    if (homeworkError) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Homework"
                    description={homeworkError}
                    type="error"
                    showIcon
                    style={{ borderRadius: '14px' }}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1440px', margin: '0 auto' }}>
            {/* 1. HERO BANNER WITH DYNAMIC ACADEMIC YEAR SELECTOR */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)',
                    borderRadius: isMobile ? '16px' : '22px',
                    padding: isMobile ? '18px' : '26px 30px',
                    color: '#ffffff',
                    marginBottom: '22px',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Glow effects */}
                <div
                    style={{
                        position: 'absolute',
                        right: '-50px',
                        top: '-50px',
                        width: '220px',
                        height: '220px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        right: '80px',
                        bottom: '-60px',
                        width: '160px',
                        height: '160px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        pointerEvents: 'none',
                    }}
                />

                <Row gutter={[20, 20]} align="middle">
                    <Col xs={24} md={15}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '10px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <span
                                style={{
                                    background: 'rgba(255, 255, 255, 0.18)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    padding: '5px 14px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                    color: '#e0f2fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <BookOutlined /> Homework & Assignments Tracker
                            </span>

                            {/* DYNAMIC ACADEMIC YEAR SELECTOR */}
                            <div
                                style={{
                                    background: '#ffffff',
                                    borderRadius: '20px',
                                    padding: '2px 8px 2px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                                    border: '1px solid rgba(255, 255, 255, 0.85)',
                                }}
                            >
                                <ClockCircleOutlined style={{ color: '#2563eb', fontSize: '13px' }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Session:</span>
                                <Select
                                    value={selectedAcademicYear}
                                    onChange={(val) => setSelectedAcademicYear(val)}
                                    options={academicYears}
                                    loading={loadingAcademicYears}
                                    bordered={false}
                                    popupMatchSelectWidth={false}
                                    dropdownStyle={{
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    }}
                                    style={{
                                        minWidth: isMobile ? '135px' : '180px',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                    }}
                                />
                            </div>
                        </div>

                        <h1
                            style={{
                                fontSize: isMobile ? '22px' : '28px',
                                fontWeight: 800,
                                margin: '0 0 6px 0',
                                color: '#ffffff',
                                letterSpacing: '-0.5px',
                                lineHeight: 1.25,
                            }}
                        >
                            My Class Homework & Tasks 📝
                        </h1>

                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.92)',
                                fontSize: isMobile ? '12px' : '14px',
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {isUpdating ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <Spin size="small" /> Loading assignments for {selectedAcademicYear}...
                                </span>
                            ) : section ? (
                                <>
                                    Assigned curriculum homework for{' '}
                                    <strong style={{ color: '#ffffff' }}>
                                        Class {effectiveClass || '--'} - Section {section}
                                    </strong>{' '}
                                    in academic session{' '}
                                    <strong style={{ color: '#fef08a' }}>{selectedAcademicYear || '--'}</strong>.
                                </>
                            ) : (
                                <>
                                    No section allocation found for{' '}
                                    <strong style={{ color: '#fef08a' }}>{selectedAcademicYear || '--'}</strong>.
                                    {user?.admitted_class ? ` (Admitted Class: Grade ${user.admitted_class})` : ''}
                                </>
                            )}
                        </p>
                    </Col>

                    {/* Class Details & Completion Progress Pill */}
                    <Col xs={24} md={9}>
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.14)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                padding: isMobile ? '12px 14px' : '14px 18px',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Class & Section:</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff' }}>
                                    {effectiveClass ? `Grade ${effectiveClass}` : 'Class'}{' '}
                                    {section ? `- Section ${section}` : '(Not Allocated)'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Completion Rate:</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#fef08a' }}>
                                    {stats.completionRate}% Done ({stats.completed}/{stats.total})
                                </span>
                            </div>

                            <Progress
                                percent={stats.completionRate}
                                showInfo={false}
                                strokeColor="#10b981"
                                trailColor="rgba(255, 255, 255, 0.25)"
                                size={['100%', 7]}
                            />
                        </div>
                    </Col>
                </Row>
            </div>

            {/* 2. STATS SUMMARY CARDS */}
            <Row gutter={[16, 16]} style={{ marginBottom: '22px' }}>
                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                                    Total Assigned
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.total}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <FileTextOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                                    Completed
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.completed}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <CheckCircleFilled />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #fed7aa',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                                    Pending Action
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#b45309',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.pending}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#fef3c7',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <ClockCircleOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #ddd6fe',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#f5f3ff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text style={{ fontSize: '12px', fontWeight: 700, color: '#6d28d9' }}>
                                    Awaiting Approval
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#5b21b6',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.awaitingConfirm}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#ede9fe',
                                    color: '#7c3aed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <SyncOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CONTROL BAR: SEARCH, FILTERS, STATUS & VIEW TOGGLE */}
            <Card
                style={{
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    marginBottom: '20px',
                    background: '#ffffff',
                }}
                bodyStyle={{ padding: '14px 18px' }}
            >
                <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={8} lg={7}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search tasks, subject, or date..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            allowClear
                            style={{
                                borderRadius: '10px',
                                padding: '8px 12px',
                                fontSize: '13px',
                                border: '1px solid #cbd5e1',
                            }}
                        />
                    </Col>

                    <Col xs={24} md={16} lg={17}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                gap: '10px',
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* Subject filter */}
                            <Select
                                value={selectedSubject}
                                onChange={(val) => setSelectedSubject(val)}
                                style={{ minWidth: isMobile ? '100%' : '160px' }}
                                popupMatchSelectWidth={false}
                                options={[
                                    { value: 'all', label: `All Subjects (${relevantHomework.length})` },
                                    ...uniqueSubjects.map((s) => ({
                                        value: s,
                                        label: `${s} (${relevantHomework.filter((h) => h.subject === s).length})`,
                                    })),
                                ]}
                            />

                            {/* Status filter */}
                            <Select
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val)}
                                style={{ minWidth: isMobile ? '100%' : '150px' }}
                                options={[
                                    { value: 'all', label: 'All Statuses' },
                                    { value: 'pending', label: `Pending (${stats.pending})` },
                                    { value: 'confirm', label: `Awaiting Approval (${stats.awaitingConfirm})` },
                                    { value: 'completed', label: `Completed (${stats.completed})` },
                                ]}
                            />

                            {/* Sort by */}
                            <Select
                                value={sortBy}
                                onChange={(val) => setSortBy(val)}
                                style={{ minWidth: isMobile ? '100%' : '135px' }}
                                options={[
                                    { value: 'newest', label: 'Newest Date' },
                                    { value: 'oldest', label: 'Oldest Date' },
                                ]}
                            />

                            {/* View Mode Toggle */}
                            <Segmented
                                value={viewMode}
                                onChange={(val) => setViewMode(val as 'grid' | 'table')}
                                options={[
                                    {
                                        value: 'grid',
                                        icon: <AppstoreOutlined />,
                                        label: 'Cards',
                                    },
                                    {
                                        value: 'table',
                                        icon: <UnorderedListOutlined />,
                                        label: 'List',
                                    },
                                ]}
                                style={{
                                    background: '#f1f5f9',
                                    padding: '3px',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                }}
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* Historical Session Banner Alert */}
            {!isCurrentYear && (
                <Alert
                    message="Archived Academic Session — View Only Mode"
                    description={`You are viewing homework tasks for academic session ${selectedAcademicYear}. Submissions can only be made in the active academic session (${academicYears.find((y) => y.isCurrent)?.value || 'Current Session'}). In this session, assignments are view-only.`}
                    type="warning"
                    showIcon
                    style={{
                        marginBottom: '20px',
                        borderRadius: '14px',
                        border: '1px solid #fed7aa',
                        background: '#fffbeb',
                    }}
                />
            )}

            {/* 4. MAIN HOMEWORK LIST / GRID */}
            <Spin spinning={isUpdating}>
                {filteredHomework.length > 0 ? (
                    viewMode === 'grid' ? (
                        /* GRID / CARD VIEW */
                        <Row gutter={[18, 18]}>
                            {filteredHomework.map((hw) => {
                                const palette = getSubjectPalette(hw.subject);
                                const report = reportMap.get(hw.id);
                                const isPending = !report || report.status === 'Pending';
                                const isCompleted = report?.status === 'Completed';

                                return (
                                    <Col xs={24} sm={12} lg={8} key={hw.id}>
                                        <Card
                                            hoverable
                                            style={{
                                                borderRadius: '16px',
                                                border: isCompleted
                                                    ? '1px solid #bbf7d0'
                                                    : isPending
                                                    ? '1px solid #fde68a'
                                                    : '1px solid #e2e8f0',
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                                background: '#ffffff',
                                                transition: 'all 0.25s ease',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                            bodyStyle={{
                                                padding: '18px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                            }}
                                        >
                                            {/* Card Top: Subject & Status */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '14px',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        background: palette.bg,
                                                        color: palette.text,
                                                        border: `1px solid ${palette.border}`,
                                                        borderRadius: '8px',
                                                        padding: '3px 10px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <TagOutlined style={{ fontSize: '11px' }} />
                                                    {hw.subject}
                                                </span>

                                                {renderStatusBadge(report)}
                                            </div>

                                            {/* Card Body: Date & Task Preview */}
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        fontSize: '13px',
                                                        color: '#64748b',
                                                        marginBottom: '10px',
                                                    }}
                                                >
                                                    <CalendarOutlined style={{ color: '#2563eb' }} />
                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                        Assigned: {dayjs(hw.homework_date).format('dddd, MMM D, YYYY')}
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        background: '#f8fafc',
                                                        border: '1px solid #f1f5f9',
                                                        borderRadius: '10px',
                                                        padding: '12px',
                                                        marginBottom: '12px',
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize: '11.5px',
                                                            fontWeight: 700,
                                                            color: '#475569',
                                                            marginBottom: '6px',
                                                        }}
                                                    >
                                                        Tasks ({hw.homework_items?.length || 0}):
                                                    </div>
                                                    <ul
                                                        style={{
                                                            margin: 0,
                                                            paddingLeft: '18px',
                                                            fontSize: '12.5px',
                                                            color: '#1e293b',
                                                            lineHeight: 1.5,
                                                        }}
                                                    >
                                                        {hw.homework_items?.slice(0, 2).map((item, index) => (
                                                            <li
                                                                key={index}
                                                                style={{
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                }}
                                                            >
                                                                {item}
                                                            </li>
                                                        ))}
                                                        {(hw.homework_items?.length || 0) > 2 && (
                                                            <li style={{ color: '#2563eb', fontWeight: 600 }}>
                                                                +{hw.homework_items.length - 2} more question(s)...
                                                            </li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>

                                            <Divider style={{ margin: '10px 0 14px 0' }} />

                                            {/* Card Footer: Action Buttons */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '8px',
                                                }}
                                            >
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handlePreview(hw)}
                                                    style={{
                                                        borderRadius: '8px',
                                                        fontWeight: 600,
                                                        fontSize: '11.5px',
                                                    }}
                                                >
                                                    View Tasks
                                                </Button>

                                                {!isCurrentYear ? (
                                                    <Tag color="default" style={{ borderRadius: '6px', fontWeight: 600, margin: 0 }}>
                                                        Archived (View Only)
                                                    </Tag>
                                                ) : isPending ? (
                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        icon={<SendOutlined />}
                                                        onClick={() => handleConfirmSubmission(hw)}
                                                        style={{
                                                            borderRadius: '8px',
                                                            background: '#10b981',
                                                            borderColor: '#10b981',
                                                            fontWeight: 600,
                                                            fontSize: '11.5px',
                                                        }}
                                                    >
                                                        Confirm Submission
                                                    </Button>
                                                ) : report?.status === 'Confirm' ? (
                                                    <span style={{ fontSize: '11.5px', color: '#6d28d9', fontWeight: 600 }}>
                                                        Submitted ⏳
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                                                        Verified & Checked ✓
                                                    </span>
                                                )}
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    ) : (
                        /* TABLE / LIST VIEW */
                        <Card
                            style={{
                                borderRadius: '18px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                                overflow: 'hidden',
                                background: '#ffffff',
                            }}
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                columns={columns}
                                dataSource={filteredHomework}
                                rowKey="id"
                                pagination={{ pageSize: 8, showSizeChanger: true }}
                                scroll={{ x: 'max-content' }}
                            />
                        </Card>
                    )
                ) : (
                    /* EMPTY STATE */
                    <Card
                        style={{
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            padding: '40px 20px',
                            textAlign: 'center',
                            background: '#ffffff',
                        }}
                    >
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <h3
                                        style={{
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            margin: '0 0 6px 0',
                                        }}
                                    >
                                        {relevantHomework.length === 0
                                            ? 'No Homework Assigned Yet'
                                            : 'No Homework Matches Your Filters'}
                                    </h3>
                                    <p
                                        style={{
                                            color: '#64748b',
                                            fontSize: '13px',
                                            maxWidth: '460px',
                                            margin: '0 auto 16px auto',
                                        }}
                                    >
                                        {relevantHomework.length === 0
                                            ? `Teachers haven't posted homework tasks for Class ${
                                                  effectiveClass || '--'
                                              } - Section ${section || '--'} in session ${
                                                  selectedAcademicYear || '--'
                                              } yet. Check back later!`
                                            : 'Try clearing the search query or switching subject and status filters.'}
                                    </p>
                                </div>
                            }
                        >
                            <Space size={10}>
                                {relevantHomework.length > 0 ? (
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedSubject('all');
                                            setStatusFilter('all');
                                        }}
                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        Clear Filters
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        icon={<ReloadOutlined />}
                                        onClick={() => {
                                            if (user?.organization_key) {
                                                dispatch(fetchHomeworkRequest(user.organization_key));
                                            }
                                        }}
                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        Refresh Tasks
                                    </Button>
                                )}
                                <Button
                                    icon={<TeamOutlined />}
                                    onClick={handleGoToTeachers}
                                    style={{ borderRadius: '8px', fontWeight: 600 }}
                                >
                                    Contact Teachers
                                </Button>
                            </Space>
                        </Empty>
                    </Card>
                )}
            </Spin>

            {/* 5. HELPER ACTION FOOTER */}
            <div
                style={{
                    marginTop: '22px',
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '14px',
                    background: '#f8fafc',
                    padding: isMobile ? '14px' : '14px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: isMobile ? '1 1 100%' : '1 1 280px', minWidth: 0 }}>
                    <BookOutlined style={{ color: '#2563eb', fontSize: '15px', marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        Need help with homework problems or assignment questions? Chat directly with your subject teacher.
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        width: isMobile ? '100%' : 'auto',
                        flexDirection: isMobile ? 'column' : 'row',
                        flexWrap: 'wrap',
                        flexShrink: 0,
                    }}
                >
                    <Button
                        size={isMobile ? 'middle' : 'small'}
                        block={isMobile}
                        icon={<TeamOutlined />}
                        onClick={handleGoToTeachers}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        Faculty Directory
                    </Button>
                    <Button
                        size={isMobile ? 'middle' : 'small'}
                        block={isMobile}
                        type="primary"
                        icon={<MessageOutlined />}
                        onClick={handleGoToChat}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            background: '#2563eb',
                        }}
                    >
                        Ask in Student Chat
                    </Button>
                </div>
            </div>

            {/* 6. HOMEWORK DETAIL MODAL */}
            <Modal
                title={
                    viewingHomework && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOutlined style={{ color: '#2563eb' }} />
                            <span>
                                Homework: <strong>{viewingHomework.subject}</strong>
                            </span>
                        </div>
                    )
                }
                open={!!viewingHomework}
                onCancel={() => setViewingHomework(null)}
                width={560}
                centered
                footer={[
                    <Button key="chat" icon={<MessageOutlined />} onClick={handleGoToChat} style={{ borderRadius: '8px' }}>
                        Ask Teacher
                    </Button>,
                    viewingHomework &&
                        isCurrentYear &&
                        (!reportMap.get(viewingHomework.id) ||
                            reportMap.get(viewingHomework.id)?.status === 'Pending') && (
                            <Button
                                key="confirm"
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={() => {
                                    handleConfirmSubmission(viewingHomework);
                                    setViewingHomework(null);
                                }}
                                style={{
                                    borderRadius: '8px',
                                    background: '#10b981',
                                    borderColor: '#10b981',
                                    fontWeight: 600,
                                }}
                            >
                                Confirm Submission
                            </Button>
                        ),
                    <Button key="close" onClick={() => setViewingHomework(null)} style={{ borderRadius: '8px' }}>
                        Close
                    </Button>,
                ]}
            >
                {viewingHomework && (
                    <div style={{ marginTop: '12px' }}>
                        <Descriptions bordered column={1} size="small" style={{ marginBottom: 18 }}>
                            <Descriptions.Item label="Subject">
                                <strong>{viewingHomework.subject}</strong>
                            </Descriptions.Item>
                            <Descriptions.Item label="Assigned Date">
                                {dayjs(viewingHomework.homework_date).format('dddd, MMMM D, YYYY')}
                            </Descriptions.Item>
                            <Descriptions.Item label="Class & Section">
                                Grade {viewingHomework.class_name} - Section {viewingHomework.section_name}
                            </Descriptions.Item>
                            <Descriptions.Item label="Status">
                                {renderStatusBadge(reportMap.get(viewingHomework.id))}
                            </Descriptions.Item>
                        </Descriptions>

                        <div style={{ marginBottom: '8px', fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                            Questions & Assigned Tasks:
                        </div>

                        <List
                            dataSource={viewingHomework.homework_items}
                            bordered
                            style={{ borderRadius: '10px', background: '#f8fafc' }}
                            renderItem={(item, index) => (
                                <List.Item style={{ padding: '12px 16px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <span
                                            style={{
                                                background: '#2563eb',
                                                color: '#ffffff',
                                                borderRadius: '50%',
                                                width: '22px',
                                                height: '22px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                flexShrink: 0,
                                                marginTop: '2px',
                                            }}
                                        >
                                            {index + 1}
                                        </span>
                                        <span style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                                            {item}
                                        </span>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentHomework;
