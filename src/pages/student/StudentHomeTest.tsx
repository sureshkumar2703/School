import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Spin,
    Alert,
    Empty,
    Row,
    Col,
    Button,
    Space,
    Modal,
    Tag,
    Badge,
    Input,
    Select,
    Segmented,
    Grid,
    Progress,
    Tooltip,
    Divider,
    Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    BookOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    PrinterOutlined,
    SearchOutlined,
    ClockCircleOutlined,
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
    StarFilled,
    ArrowRightOutlined,
    FolderOpenOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { fetchStudentHomeTestsRequest, type HomeTest } from '../../store/features/home-test/homeTestSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import type { Question } from '../../store/features/question-bank/questionBankSlice';
import {
    saveHomeTestReportRequest,
    fetchHomeTestReportsRequest,
} from '../../store/features/home-test-report/homeTestReportSlice';
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
const SUBJECT_COLORS: { [key: string]: { bg: string; border: string; text: string; badge: string; iconBg: string } } = {
    math: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#3b82f6', iconBg: '#dbeafe' },
    science: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', badge: '#10b981', iconBg: '#d1fae5' },
    physics: { bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', badge: '#14b8a6', iconBg: '#ccfbf1' },
    chemistry: { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', badge: '#8b5cf6', iconBg: '#ede9fe' },
    biology: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badge: '#22c55e', iconBg: '#dcfce7' },
    english: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', badge: '#f97316', iconBg: '#ffedd5' },
    social: { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', badge: '#f43f5e', iconBg: '#ffe4e6' },
    history: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badge: '#ef4444', iconBg: '#fee2e2' },
    geography: { bg: '#ecfeff', border: '#a5f3fc', text: '#155e75', badge: '#06b6d4', iconBg: '#cffafe' },
    computer: { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', badge: '#0284c7', iconBg: '#e0f2fe' },
    language: { bg: '#fdf4ff', border: '#f5d0fe', text: '#86198f', badge: '#d946ef', iconBg: '#fae8ff' },
    default: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', badge: '#64748b', iconBg: '#f1f5f9' },
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

const StudentHomeTest: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: dashboardLoading, error } = useSelector((state: RootState) => state.studentDashboard);
    const { studentHomeTests, loading: homeTestLoading } = useSelector((state: RootState) => state.homeTest);
    const { reports: homeTestReports, loading: reportLoading } = useSelector((state: RootState) => state.homeTestReport);
    const { subjects } = useSelector((state: RootState) => state.subjects);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section and Class allocated for selected academic year
    const [studentClass, setStudentClass] = useState<string | null>(null);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    // UI View and Filter state
    const [viewMode, setViewMode] = useState<'subject_cards' | 'all_tests' | 'table'>('subject_cards');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'viewed'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'marks'>('newest');

    // Modals state
    const [isSubjectTestsModalVisible, setIsSubjectTestsModalVisible] = useState(false);
    const [modalSubjectTests, setModalSubjectTests] = useState<HomeTest[]>([]);
    const [modalSubjectName, setModalSubjectName] = useState<string>('');
    const [selectedTestForQuestions, setSelectedTestForQuestions] = useState<HomeTest | null>(null);

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

    // 3. Fetch Home Tests, Reports & Realtime Subscriptions
    useEffect(() => {
        if (!user?.organization_key) return;

        dispatch(fetchSubjectsRequest());
        dispatch(
            fetchStudentHomeTestsRequest({
                organizationKey: user.organization_key,
            })
        );
        if (user.id) {
            dispatch(fetchHomeTestReportsRequest({ studentId: user.id }));
        }

        const channel = supabase
            .channel('home-tests-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'home_test',
                    filter: `organization_key=eq.${user.organization_key}`,
                },
                () => {
                    dispatch(fetchStudentHomeTestsRequest({ organizationKey: user.organization_key! }));
                    if (user.id) {
                        dispatch(fetchHomeTestReportsRequest({ studentId: user.id }));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [dispatch, user?.organization_key, user?.id]);

    // 4. Fetch Dashboard Mappings for Subject allocations
    useEffect(() => {
        const effectiveClass = studentClass || user?.admitted_class;
        if (user?.organization_key && effectiveClass && section && selectedAcademicYear) {
            dispatch(
                fetchStudentDashboardDataRequest({
                    organizationKey: user.organization_key,
                    className: effectiveClass,
                    sectionName: section,
                    academicYear: selectedAcademicYear,
                })
            );
        }
    }, [dispatch, user?.organization_key, studentClass, user?.admitted_class, section, selectedAcademicYear]);

    const effectiveClass = studentClass || user?.admitted_class;
    const isLoading = loadingAcademicYears || loadingSection || dashboardLoading || homeTestLoading || reportLoading;

    // Helper: Map subject code to Subject Name
    const getSubjectName = (code: string) => {
        const s = subjects.find((sub) => sub.subject_code === code);
        return s ? s.subject_name : code;
    };

    // Viewed Test IDs Set
    const viewedTestIds = useMemo(() => {
        return new Set(homeTestReports.map((r) => r.home_test_id));
    }, [homeTestReports]);

    // Relevant Home Tests for this student's allocated class, section & selected academic year
    const relevantHomeTests = useMemo(() => {
        if (!effectiveClass || !section || !selectedAcademicYear) return [];
        return studentHomeTests.filter(
            (test) =>
                test.class_name === effectiveClass &&
                test.section_name === section &&
                test.academic_year === selectedAcademicYear
        );
    }, [studentHomeTests, effectiveClass, section, selectedAcademicYear]);

    // List of subjects for this student's class
    const subjectsForClass = useMemo(() => {
        if (!mappings || mappings.length === 0) return [];
        const subjectNames = [...new Set(mappings.map((m) => m.subject_name))];
        return subjects.filter((s) => subjectNames.includes(s.subject_name));
    }, [mappings, subjects]);

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
        const total = relevantHomeTests.length;
        let viewedCount = 0;
        let totalMarksSum = 0;

        relevantHomeTests.forEach((t) => {
            if (viewedTestIds.has(t.id)) viewedCount++;
            totalMarksSum += t.total_marks || 0;
        });

        const pendingCount = total - viewedCount;
        const completionRate = total > 0 ? Math.round((viewedCount / total) * 100) : 0;

        return {
            total,
            viewedCount,
            pendingCount,
            totalMarksSum,
            completionRate,
        };
    }, [relevantHomeTests, viewedTestIds]);

    // Filtered & Sorted Home Tests list
    const filteredHomeTests = useMemo(() => {
        return relevantHomeTests
            .filter((test) => {
                const subName = getSubjectName(test.subject_code);

                // Subject filter
                if (selectedSubjectFilter !== 'all' && test.subject_code !== selectedSubjectFilter) {
                    return false;
                }

                // Status filter
                const hasViewed = viewedTestIds.has(test.id);
                if (statusFilter === 'new' && hasViewed) return false;
                if (statusFilter === 'viewed' && !hasViewed) return false;

                // Search query filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchSubject = subName.toLowerCase().includes(q);
                    const matchUnit = (test.unit || '').toLowerCase().includes(q);
                    const matchDate = dayjs(test.test_date).format('DD MMM YYYY').toLowerCase().includes(q);
                    if (!matchSubject && !matchUnit && !matchDate) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return dayjs(b.test_date).valueOf() - dayjs(a.test_date).valueOf();
                }
                if (sortBy === 'oldest') {
                    return dayjs(a.test_date).valueOf() - dayjs(b.test_date).valueOf();
                }
                if (sortBy === 'marks') {
                    return (b.total_marks || 0) - (a.total_marks || 0);
                }
                return 0;
            });
    }, [relevantHomeTests, selectedSubjectFilter, statusFilter, searchQuery, sortBy, viewedTestIds, subjects]);

    // Open questions modal & record view report
    const handleViewQuestionClick = (test: HomeTest) => {
        setSelectedTestForQuestions(test);

        const alreadyViewed = homeTestReports.some((report) => report.home_test_id === test.id);
        if (isCurrentYear && !alreadyViewed && user) {
            const reportPayload = {
                organization_key: user.organization_key!,
                academic_year: test.academic_year,
                class_name: test.class_name,
                section_name: test.section_name,
                subject: test.subject_code,
                unit: test.unit,
                total_marks: test.total_marks,
                questions: test.questions,
                student_id: user.id,
                student_name: user.full_name,
                roll_no: user.roll_no,
                register_no: user.register_no,
                get_mark: null,
                home_test_id: test.id,
            };
            dispatch(saveHomeTestReportRequest(reportPayload as any));
        }
    };

    // Open subject tests modal
    const handleOpenSubjectTests = (subjectName: string, subjectCode: string) => {
        const testsForSubject = relevantHomeTests
            .filter((t) => t.subject_code === subjectCode)
            .sort((a, b) => dayjs(b.test_date).diff(dayjs(a.test_date)));

        setModalSubjectName(subjectName);
        setModalSubjectTests(testsForSubject);
        setIsSubjectTestsModalVisible(true);
    };

    // Print Question Paper
    const handlePrintPaper = () => {
        window.print();
    };

    // Navigation handlers
    const handleGoToChat = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    const handleGoToTeachers = () => {
        dispatch(setCurrentPage('studentmyteachers'));
    };

    // Table view columns definition
    const columns: ColumnsType<HomeTest> = [
        {
            title: 'Test Date',
            dataIndex: 'test_date',
            key: 'test_date',
            width: 140,
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
            dataIndex: 'subject_code',
            key: 'subject_code',
            width: 170,
            render: (code: string) => {
                const subName = getSubjectName(code);
                const palette = getSubjectPalette(subName);
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
                        {subName}
                    </span>
                );
            },
        },
        {
            title: 'Unit / Topic',
            dataIndex: 'unit',
            key: 'unit',
            render: (unit: string) => (
                <span style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>
                    {unit || 'General Curriculum'}
                </span>
            ),
        },
        {
            title: 'Total Marks',
            dataIndex: 'total_marks',
            key: 'total_marks',
            width: 130,
            render: (marks: number) => (
                <Tag
                    color="gold"
                    style={{
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        padding: '1px 8px',
                    }}
                >
                    {marks} Marks
                </Tag>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            width: 140,
            render: (_: any, record: HomeTest) => {
                const hasViewed = viewedTestIds.has(record.id);
                return hasViewed ? (
                    <Tag
                        icon={<CheckCircleFilled />}
                        color="success"
                        style={{ borderRadius: '6px', fontWeight: 700 }}
                    >
                        Viewed
                    </Tag>
                ) : (
                    <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 700 }}>
                        ● New Test
                    </Tag>
                );
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 140,
            align: 'right',
            render: (_: any, record: HomeTest) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewQuestionClick(record)}
                    style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        fontWeight: 600,
                    }}
                >
                    View Paper
                </Button>
            ),
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
                    Loading home test assessments and curriculum records...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Home Tests"
                    description={error}
                    type="error"
                    showIcon
                    style={{ borderRadius: '14px' }}
                />
            </div>
        );
    }

    return (
        <div
            style={{
                padding: isMobile ? '12px' : '24px',
                maxWidth: '1440px',
                margin: '0 auto',
                overflowX: 'hidden',
                boxSizing: 'border-box',
                width: '100%',
            }}
        >
            {/* Embedded Print Styling */}
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-paper, #printable-paper * {
                            visibility: visible;
                        }
                        #printable-paper {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 20px;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>

            {/* 1. HERO BANNER WITH DYNAMIC ACADEMIC YEAR SELECTOR */}
            <div
                className="no-print"
                style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)',
                    borderRadius: isMobile ? '16px' : '22px',
                    padding: isMobile ? '18px 16px' : '26px 30px',
                    color: '#ffffff',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                    width: '100%',
                    boxSizing: 'border-box',
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

                <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={15}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '12px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <span
                                style={{
                                    background: 'rgba(255, 255, 255, 0.18)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    padding: '5px 12px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                    color: '#e0f2fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <BookOutlined /> Academic Assessment & Home Tests
                            </span>

                            {/* DYNAMIC ACADEMIC YEAR SELECTOR */}
                            <div
                                style={{
                                    background: '#ffffff',
                                    borderRadius: '20px',
                                    padding: '2px 8px 2px 10px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                                    border: '1px solid rgba(255, 255, 255, 0.85)',
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                }}
                            >
                                <ClockCircleOutlined style={{ color: '#2563eb', fontSize: '13px', flexShrink: 0 }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', flexShrink: 0 }}>Session:</span>
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
                                        maxWidth: isMobile ? '160px' : '220px',
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
                            My Class Home Tests 📚
                        </h1>

                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.92)',
                                fontSize: isMobile ? '12px' : '14px',
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {isLoading ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <Spin size="small" /> Loading home tests for {selectedAcademicYear}...
                                </span>
                            ) : section ? (
                                <>
                                    Unit test question papers and practice assessments for{' '}
                                    <strong style={{ color: '#ffffff' }}>
                                        Class {effectiveClass || '--'} - Section {section}
                                    </strong>{' '}
                                    in session{' '}
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

                    {/* Class Details & Test Progress Pill */}
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
                                width: '100%',
                                boxSizing: 'border-box',
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
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Tests Attempted:</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#fef08a' }}>
                                    {stats.completionRate}% Done ({stats.viewedCount}/{stats.total})
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
            <Row gutter={[12, 12]} className="no-print" style={{ marginBottom: '20px' }}>
                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 600, display: 'block' }}>
                                    Total Tests
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '22px',
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
                                    width: isMobile ? '34px' : '42px',
                                    height: isMobile ? '34px' : '42px',
                                    borderRadius: '10px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '16px' : '20px',
                                    flexShrink: 0,
                                }}
                            >
                                <BookOutlined />
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
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 600, display: 'block' }}>
                                    Viewed
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '22px',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.viewedCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '34px' : '42px',
                                    height: isMobile ? '34px' : '42px',
                                    borderRadius: '10px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '16px' : '20px',
                                    flexShrink: 0,
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
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: '#92400e', display: 'block' }}>
                                    New / Pending
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '22px',
                                        fontWeight: 800,
                                        color: '#b45309',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.pendingCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '34px' : '42px',
                                    height: isMobile ? '34px' : '42px',
                                    borderRadius: '10px',
                                    background: '#fef3c7',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '16px' : '20px',
                                    flexShrink: 0,
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
                            height: '100%',
                        }}
                        bodyStyle={{ padding: isMobile ? '12px 14px' : '18px 20px' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text ellipsis style={{ fontSize: isMobile ? '11px' : '12px', fontWeight: 700, color: '#6d28d9', display: 'block' }}>
                                    Total Marks
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '22px',
                                        fontWeight: 800,
                                        color: '#5b21b6',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalMarksSum} pts
                                </div>
                            </div>
                            <div
                                style={{
                                    width: isMobile ? '34px' : '42px',
                                    height: isMobile ? '34px' : '42px',
                                    borderRadius: '10px',
                                    background: '#ede9fe',
                                    color: '#7c3aed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: isMobile ? '16px' : '20px',
                                    flexShrink: 0,
                                }}
                            >
                                <StarFilled />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CONTROL BAR: SEARCH, FILTERS, STATUS & VIEW TOGGLE */}
            <Card
                className="no-print"
                style={{
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    marginBottom: '20px',
                    background: '#ffffff',
                }}
                bodyStyle={{ padding: isMobile ? '12px' : '14px 18px' }}
            >
                <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={8} lg={7}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search tests, subject, unit..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            allowClear
                            style={{
                                borderRadius: '10px',
                                padding: '8px 12px',
                                fontSize: '13px',
                                border: '1px solid #cbd5e1',
                                width: '100%',
                            }}
                        />
                    </Col>

                    <Col xs={24} md={16} lg={17}>
                        <Row gutter={[8, 8]} align="middle" justify={isMobile ? 'start' : 'end'}>
                            <Col xs={12} sm={8} md={6}>
                                <Select
                                    value={selectedSubjectFilter}
                                    onChange={(val) => setSelectedSubjectFilter(val)}
                                    style={{ width: '100%' }}
                                    popupMatchSelectWidth={false}
                                    options={[
                                        { value: 'all', label: `All Subjects (${relevantHomeTests.length})` },
                                        ...subjectsForClass.map((s) => ({
                                            value: s.subject_code,
                                            label: `${s.subject_name} (${relevantHomeTests.filter((t) => t.subject_code === s.subject_code).length})`,
                                        })),
                                    ]}
                                />
                            </Col>

                            <Col xs={12} sm={8} md={5}>
                                <Select
                                    value={statusFilter}
                                    onChange={(val) => setStatusFilter(val)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'all', label: 'All Status' },
                                        { value: 'new', label: `New (${stats.pendingCount})` },
                                        { value: 'viewed', label: `Viewed (${stats.viewedCount})` },
                                    ]}
                                />
                            </Col>

                            <Col xs={12} sm={8} md={5}>
                                <Select
                                    value={sortBy}
                                    onChange={(val) => setSortBy(val)}
                                    style={{ width: '100%' }}
                                    options={[
                                        { value: 'newest', label: 'Newest Date' },
                                        { value: 'oldest', label: 'Oldest Date' },
                                        { value: 'marks', label: 'Highest Marks' },
                                    ]}
                                />
                            </Col>

                            <Col xs={12} sm={24} md={8}>
                                <Segmented
                                    block
                                    value={viewMode}
                                    onChange={(val) => setViewMode(val as 'subject_cards' | 'all_tests' | 'table')}
                                    options={[
                                        {
                                            value: 'subject_cards',
                                            icon: <AppstoreOutlined />,
                                            label: isMobile ? 'Subjects' : 'Subjects',
                                        },
                                        {
                                            value: 'all_tests',
                                            icon: <FileTextOutlined />,
                                            label: isMobile ? 'Papers' : 'All Papers',
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
                                        width: '100%',
                                    }}
                                />
                            </Col>
                        </Row>
                    </Col>
                </Row>
            </Card>

            {/* Historical Session Banner Alert */}
            {!isCurrentYear && (
                <Alert
                    message="Archived Academic Session — View Only Mode"
                    description={`You are viewing home test papers and assessments for past session ${selectedAcademicYear}. Assessments are available for revision and view-only.`}
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

            {/* 4. MAIN CONTENT AREA */}
            <Spin spinning={isLoading}>
                {/* VIEW 1: SUBJECT CARDS OVERVIEW */}
                {viewMode === 'subject_cards' && (
                    <>
                        {subjectsForClass.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {subjectsForClass.map((subject) => {
                                    const testsForSubject = relevantHomeTests.filter(
                                        (test) => test.subject_code === subject.subject_code
                                    );
                                    const newTestCount = testsForSubject.filter((t) => !viewedTestIds.has(t.id)).length;
                                    const palette = getSubjectPalette(subject.subject_name);

                                    return (
                                        <Col xs={24} sm={12} lg={8} key={subject.id}>
                                            <Badge.Ribbon
                                                text={newTestCount > 0 ? `${newTestCount} New Test${newTestCount > 1 ? 's' : ''}` : undefined}
                                                color="#2563eb"
                                                style={{ display: newTestCount > 0 ? 'block' : 'none', fontWeight: 700 }}
                                            >
                                                <Card
                                                    hoverable
                                                    onClick={() => handleOpenSubjectTests(subject.subject_name, subject.subject_code)}
                                                    style={{
                                                        borderRadius: '18px',
                                                        border: `1px solid ${palette.border}`,
                                                        background: palette.bg,
                                                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                                        transition: 'all 0.25s ease',
                                                        position: 'relative',
                                                        overflow: 'hidden',
                                                    }}
                                                    bodyStyle={{ padding: isMobile ? '16px' : '22px' }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                                        <div
                                                            style={{
                                                                width: isMobile ? '46px' : '52px',
                                                                height: isMobile ? '46px' : '52px',
                                                                borderRadius: '14px',
                                                                background: palette.badge,
                                                                color: '#ffffff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: isMobile ? '20px' : '22px',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <BookOutlined />
                                                        </div>

                                                        <div>
                                                            <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 800, fontSize: isMobile ? '16px' : '18px' }}>
                                                                {subject.subject_name}
                                                            </Title>
                                                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                                                Code: {subject.subject_code}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            background: 'rgba(255, 255, 255, 0.75)',
                                                            borderRadius: '12px',
                                                            padding: '10px 14px',
                                                            marginBottom: '16px',
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Available Tests</div>
                                                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                                                {testsForSubject.length}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Attempted</div>
                                                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#059669' }}>
                                                                {testsForSubject.length - newTestCount} / {testsForSubject.length}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <Button
                                                            block={isMobile}
                                                            type="primary"
                                                            style={{
                                                                borderRadius: '10px',
                                                                background: palette.badge,
                                                                borderColor: palette.badge,
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            View Tests <ArrowRightOutlined />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            </Badge.Ribbon>
                                        </Col>
                                    );
                                })}
                            </Row>
                        ) : (
                            <Card style={{ borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                                <Empty description="No subjects found for your class." />
                            </Card>
                        )}
                    </>
                )}

                {/* VIEW 2: ALL PAPERS GRID */}
                {viewMode === 'all_tests' && (
                    <>
                        {filteredHomeTests.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {filteredHomeTests.map((test) => {
                                    const subName = getSubjectName(test.subject_code);
                                    const palette = getSubjectPalette(subName);
                                    const hasViewed = viewedTestIds.has(test.id);

                                    return (
                                        <Col xs={24} sm={12} lg={8} key={test.id}>
                                            <Card
                                                hoverable
                                                onClick={() => handleViewQuestionClick(test)}
                                                style={{
                                                    borderRadius: '16px',
                                                    border: hasViewed ? '1px solid #e2e8f0' : `1px solid ${palette.border}`,
                                                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                                    background: '#ffffff',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                }}
                                                bodyStyle={{
                                                    padding: '16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    height: '100%',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        marginBottom: '12px',
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
                                                        }}
                                                    >
                                                        {subName}
                                                    </span>

                                                    {hasViewed ? (
                                                        <Tag
                                                            icon={<CheckCircleFilled />}
                                                            color="success"
                                                            style={{ borderRadius: '6px', fontWeight: 700 }}
                                                        >
                                                            Viewed
                                                        </Tag>
                                                    ) : (
                                                        <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 700 }}>
                                                            ● New Test
                                                        </Tag>
                                                    )}
                                                </div>

                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                                        Unit: {test.unit || 'Assessment Paper'}
                                                    </div>

                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            fontSize: '12px',
                                                            color: '#64748b',
                                                            marginTop: '6px',
                                                        }}
                                                    >
                                                        <CalendarOutlined style={{ color: '#2563eb' }} />
                                                        <span>Test Date: {dayjs(test.test_date).format('DD MMM YYYY')}</span>
                                                    </div>

                                                    <div style={{ marginTop: '10px' }}>
                                                        <Tag color="gold" style={{ borderRadius: '6px', fontWeight: 700 }}>
                                                            Total Marks: {test.total_marks}
                                                        </Tag>
                                                    </div>
                                                </div>

                                                <Divider style={{ margin: '14px 0 10px 0' }} />

                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <Button
                                                        block={isMobile}
                                                        size="small"
                                                        type="primary"
                                                        icon={<EyeOutlined />}
                                                        style={{
                                                            borderRadius: '8px',
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                            border: 'none',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        View Paper
                                                    </Button>
                                                </div>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>
                        ) : (
                            <Card style={{ borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                                <Empty description="No home tests match your filters." />
                            </Card>
                        )}
                    </>
                )}

                {/* VIEW 3: TABLE LIST */}
                {viewMode === 'table' && (
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
                            dataSource={filteredHomeTests}
                            rowKey="id"
                            pagination={{ pageSize: 8, showSizeChanger: true }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Card>
                )}
            </Spin>

            {/* 5. HELPER ACTION FOOTER - FULLY RESPONSIVE */}
            <div
                className="no-print"
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
                        Need clarification on any home test questions or marking scheme? Contact your subject teacher.
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

            {/* 6. SUBJECT SPECIFIC TESTS MODAL - FULLY RESPONSIVE */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderOpenOutlined style={{ color: '#2563eb' }} />
                        <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                            Available Tests: <strong>{modalSubjectName}</strong>
                        </span>
                    </div>
                }
                open={isSubjectTestsModalVisible}
                onCancel={() => setIsSubjectTestsModalVisible(false)}
                footer={[
                    <Button key="close" block={isMobile} onClick={() => setIsSubjectTestsModalVisible(false)} style={{ borderRadius: '8px' }}>
                        Close
                    </Button>,
                ]}
                width={isMobile ? '95vw' : 720}
                style={{ top: isMobile ? 12 : 30 }}
                centered={!isMobile}
            >
                <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: isMobile ? '4px 0' : '10px 4px' }}>
                    {modalSubjectTests.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {modalSubjectTests.map((test) => {
                                const hasViewed = viewedTestIds.has(test.id);
                                return (
                                    <Card
                                        key={test.id}
                                        style={{
                                            borderRadius: '14px',
                                            border: hasViewed ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
                                            background: hasViewed ? '#f8fafc' : '#eff6ff',
                                        }}
                                        bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                                    >
                                        <Row justify="space-between" align="middle" gutter={[10, 10]}>
                                            <Col xs={24} sm={16}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                                    <Tag icon={<CalendarOutlined />} color="blue" style={{ borderRadius: '6px' }}>
                                                        {dayjs(test.test_date).format('DD MMM YYYY')}
                                                    </Tag>
                                                    <Tag color="gold" style={{ borderRadius: '6px', fontWeight: 700 }}>
                                                        Marks: {test.total_marks}
                                                    </Tag>
                                                    {hasViewed ? (
                                                        <Tag color="success" style={{ borderRadius: '6px' }}>
                                                            Viewed ✓
                                                        </Tag>
                                                    ) : (
                                                        <Tag color="cyan" style={{ borderRadius: '6px' }}>
                                                            ● New
                                                        </Tag>
                                                    )}
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: isMobile ? '14px' : '15px', color: '#0f172a' }}>
                                                    Unit: {test.unit || 'Assessment'}
                                                </div>
                                            </Col>

                                            <Col xs={24} sm={8} style={{ textAlign: isMobile ? 'left' : 'right' }}>
                                                <Button
                                                    block={isMobile}
                                                    type="primary"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handleViewQuestionClick(test)}
                                                    style={{
                                                        borderRadius: '8px',
                                                        background: '#2563eb',
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    View Paper
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <Empty description="No home tests found for this subject." />
                    )}
                </div>
            </Modal>

            {/* 7. QUESTION PAPER MODAL - FULLY RESPONSIVE */}
            <Modal
                title={
                    selectedTestForQuestions && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '92%' }}>
                            <FileTextOutlined style={{ color: '#2563eb', flexShrink: 0 }} />
                            <span
                                style={{
                                    fontSize: isMobile ? '13px' : '15px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {getSubjectName(selectedTestForQuestions.subject_code)} — Unit: {selectedTestForQuestions.unit}
                            </span>
                        </div>
                    )
                }
                open={!!selectedTestForQuestions}
                onCancel={() => setSelectedTestForQuestions(null)}
                footer={
                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            flexDirection: isMobile ? 'column' : 'row',
                            justifyContent: isMobile ? 'stretch' : 'flex-end',
                            width: '100%',
                        }}
                    >
                        <Button
                            key="chat"
                            block={isMobile}
                            icon={<MessageOutlined />}
                            onClick={() => {
                                setSelectedTestForQuestions(null);
                                handleGoToChat();
                            }}
                            style={{ borderRadius: '8px' }}
                        >
                            Ask Teacher
                        </Button>
                        <Button
                            key="print"
                            block={isMobile}
                            icon={<PrinterOutlined />}
                            onClick={handlePrintPaper}
                            style={{ borderRadius: '8px' }}
                        >
                            Print Paper
                        </Button>
                        <Button
                            key="close"
                            block={isMobile}
                            type="primary"
                            onClick={() => setSelectedTestForQuestions(null)}
                            style={{ borderRadius: '8px', background: '#2563eb' }}
                        >
                            Close
                        </Button>
                    </div>
                }
                width={isMobile ? '96vw' : '84vw'}
                style={{ top: isMobile ? 10 : 20, maxWidth: '100vw' }}
                styles={{
                    body: {
                        maxHeight: isMobile ? '70vh' : '75vh',
                        overflowY: 'auto',
                        padding: isMobile ? '14px' : '24px',
                    },
                }}
            >
                {selectedTestForQuestions && (
                    <div id="printable-paper">
                        {/* Printable Header */}
                        <div
                            style={{
                                textAlign: 'center',
                                borderBottom: '2px solid #0f172a',
                                paddingBottom: '16px',
                                marginBottom: '20px',
                            }}
                        >
                            <h2 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '17px' : '20px', fontWeight: 800, color: '#0f172a' }}>
                                HOME TEST ASSESSMENT
                            </h2>
                            <div style={{ fontSize: isMobile ? '13px' : '14px', fontWeight: 700, color: '#2563eb' }}>
                                {getSubjectName(selectedTestForQuestions.subject_code)} — Unit: {selectedTestForQuestions.unit}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px' }}>
                                Class: Grade {selectedTestForQuestions.class_name} - Section {selectedTestForQuestions.section_name} | Session: {selectedTestForQuestions.academic_year} | Test Date: {dayjs(selectedTestForQuestions.test_date).format('DD MMM YYYY')}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#b45309', marginTop: '4px' }}>
                                Maximum Marks: {selectedTestForQuestions.total_marks}
                            </div>
                        </div>

                        {/* Questions Rendering by Part */}
                        <div>
                            {Object.entries(selectedTestForQuestions.questions || {}).map(([partName, questions], pIdx) => {
                                const qList = (questions as Question[]) || [];
                                const marksPerQuestion = qList.length > 0 && qList[0].question_type ? qList[0].question_type : partName;

                                return (
                                    <div
                                        key={partName}
                                        style={{
                                            marginBottom: '22px',
                                            background: '#ffffff',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            padding: isMobile ? '12px' : '18px',
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                borderBottom: '1px solid #f1f5f9',
                                                paddingBottom: '10px',
                                                marginBottom: '14px',
                                                flexWrap: 'wrap',
                                                gap: '6px',
                                            }}
                                        >
                                            <h4 style={{ margin: 0, fontWeight: 800, color: '#1e3a8a', fontSize: isMobile ? '13px' : '15px' }}>
                                                PART {String.fromCharCode(65 + pIdx)} ({partName}-Mark Questions)
                                            </h4>
                                            <Tag color="blue" style={{ fontWeight: 700, borderRadius: '6px', margin: 0 }}>
                                                {qList.length} Questions • {marksPerQuestion} Mark(s) each
                                            </Tag>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {qList.map((q, index) => (
                                                <div
                                                    key={q.id || index}
                                                    style={{
                                                        display: 'flex',
                                                        gap: '10px',
                                                        alignItems: 'flex-start',
                                                        padding: '10px',
                                                        borderRadius: '8px',
                                                        background: '#f8fafc',
                                                    }}
                                                >
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

                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#0f172a', lineHeight: 1.5, wordBreak: 'break-word' }}>
                                                            {q.question}
                                                        </div>
                                                        {q.unit && (
                                                            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                                                Unit / Subtopic: {q.unit}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div style={{ fontWeight: 700, fontSize: '11px', color: '#64748b', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                        [{q.question_type || partName} M]
                                                    </div>
                                                </div>
                                            ))}
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

export default StudentHomeTest;
