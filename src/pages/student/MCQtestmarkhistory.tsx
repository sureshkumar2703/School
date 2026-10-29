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
    Space,
    Tag,
    Modal,
    Button,
    Input,
    Select,
    Progress,
    Segmented,
    Table,
    Badge,
    Divider,
    Grid,
    Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    BookOutlined,
    FieldTimeOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    ClockCircleOutlined,
    CalendarOutlined,
    SearchOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    PrinterOutlined,
    ReloadOutlined,
    RightOutlined,
    MessageOutlined,
    TeamOutlined,
    StarFilled,
    CheckCircleFilled,
    CloseCircleFilled,
    TrophyOutlined,
    RiseOutlined,
    ThunderboltOutlined,
    HistoryOutlined,
    TagOutlined,
    QuestionCircleOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchMcqTestHistoryRequest,
    type TestSession,
    type QuestionResult,
} from '../../store/features/mcq-test-history/mcqTestHistorySlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';

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

const MCQtestmarkhistory: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { history, loading, error } = useSelector((state: RootState) => state.mcqTestHistory);

    // Modal state for viewing detailed question breakdown
    const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Filtering, Search, Sort & View Mode state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [performanceFilter, setPerformanceFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section allocation state
    const [section, setSection] = useState<string | null>(null);
    const [effectiveClass, setEffectiveClass] = useState<string | null>(user?.admitted_class || null);

    // 1. Fetch Academic Years
    useEffect(() => {
        const fetchAcademicYears = async () => {
            if (!user?.organization_key) {
                setLoadingAcademicYears(false);
                return;
            }

            try {
                const { data, error: yearError } = await supabase
                    .from('academic_year')
                    .select('*')
                    .eq('organization_key', user.organization_key)
                    .order('created_at', { ascending: false });

                if (yearError) throw yearError;

                if (data && data.length > 0) {
                    const formatted: AcademicYearOption[] = data.map((item: any) => ({
                        value: item.academic_year,
                        label: item.status === 'Active' ? `${item.academic_year} (Current)` : item.academic_year,
                        isCurrent: item.status === 'Active',
                        status: item.status,
                    }));

                    setAcademicYears(formatted);

                    const activeYear = formatted.find((y) => y.isCurrent) || formatted[0];
                    if (activeYear) {
                        setSelectedAcademicYear(activeYear.value);
                    }
                }
            } catch (err) {
                console.error('Error fetching academic years:', err);
                if (user?.academic_year) {
                    setSelectedAcademicYear(user.academic_year);
                }
            } finally {
                setLoadingAcademicYears(false);
            }
        };

        fetchAcademicYears();
    }, [user?.organization_key, user?.academic_year]);

    // 2. Fetch section allocation based on selected academic year
    useEffect(() => {
        if (!user?.organization_key || !user?.register_no || !selectedAcademicYear) return;

        const fetchSection = async () => {
            try {
                const { data, error: secError } = await supabase
                    .from('class_section_allocations')
                    .select('section_name, class_name')
                    .eq('organization_key', user.organization_key)
                    .eq('register_no', user.register_no)
                    .eq('academic_year', selectedAcademicYear)
                    .maybeSingle();

                if (secError) throw secError;

                if (data) {
                    setSection(data.section_name || null);
                    if (data.class_name) setEffectiveClass(data.class_name);
                } else {
                    setSection(null);
                    setEffectiveClass(user?.admitted_class || null);
                }
            } catch (err) {
                console.error('Error fetching student section allocation:', err);
                setSection(null);
            }
        };

        fetchSection();
    }, [user?.organization_key, user?.register_no, selectedAcademicYear, user?.admitted_class]);

    // 3. Fetch Student's MCQ Test History
    useEffect(() => {
        if (user?.id) {
            dispatch(fetchMcqTestHistoryRequest(user.id));
        }
    }, [dispatch, user?.id]);

    // Distinct list of subjects from history
    const uniqueSubjects = useMemo(() => {
        const set = new Set<string>();
        history.forEach((session) => {
            if (session.subject) set.add(session.subject);
        });
        return Array.from(set).sort();
    }, [history]);

    // KPI Metrics calculation
    const stats = useMemo(() => {
        const totalTests = history.length;
        const totalScore = history.reduce((acc, s) => acc + (s.score || 0), 0);
        const totalPossible = history.reduce((acc, s) => acc + (s.totalQuestions || 5), 0);
        const avgPercentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
        const perfectScores = history.filter((s) => s.score === s.totalQuestions && s.totalQuestions > 0).length;
        const passedTests = history.filter((s) => (s.score / (s.totalQuestions || 5)) >= 0.5).length;
        const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

        return {
            totalTests,
            avgPercentage,
            perfectScores,
            passRate,
        };
    }, [history]);

    // Filtered & Sorted Sessions
    const filteredHistory = useMemo(() => {
        return history
            .filter((session) => {
                // 1. Search Query (subject or questions)
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchSubject = session.subject.toLowerCase().includes(q);
                    const matchQuestions = session.questions?.some((item) =>
                        item.question_text?.toLowerCase().includes(q)
                    );
                    if (!matchSubject && !matchQuestions) return false;
                }

                // 2. Subject filter
                if (selectedSubject !== 'all' && session.subject !== selectedSubject) {
                    return false;
                }

                // 3. Performance filter
                const pct = session.totalQuestions > 0 ? (session.score / session.totalQuestions) * 100 : 0;
                if (performanceFilter === 'perfect' && session.score !== session.totalQuestions) {
                    return false;
                }
                if (performanceFilter === 'passed' && pct < 50) {
                    return false;
                }
                if (performanceFilter === 'needs_practice' && pct >= 50) {
                    return false;
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return dayjs(b.test_date).diff(dayjs(a.test_date));
                }
                if (sortBy === 'oldest') {
                    return dayjs(a.test_date).diff(dayjs(b.test_date));
                }
                if (sortBy === 'highest') {
                    const pctA = a.totalQuestions > 0 ? a.score / a.totalQuestions : 0;
                    const pctB = b.totalQuestions > 0 ? b.score / b.totalQuestions : 0;
                    return pctB - pctA;
                }
                if (sortBy === 'lowest') {
                    const pctA = a.totalQuestions > 0 ? a.score / a.totalQuestions : 0;
                    const pctB = b.totalQuestions > 0 ? b.score / b.totalQuestions : 0;
                    return pctA - pctB;
                }
                return 0;
            });
    }, [history, searchQuery, selectedSubject, performanceFilter, sortBy]);

    // Modal Details Handlers
    const handleDetailsClick = (session: TestSession) => {
        setSelectedSession(session);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setSelectedSession(null);
    };

    // Print Breakdown Modal
    const handlePrintDetails = () => {
        window.print();
    };

    // Navigation handlers
    const handleGoToDailyMCQ = () => {
        dispatch(setCurrentPage('dailymcqtest'));
    };

    const handleGoToChat = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    const handleGoToTeachers = () => {
        dispatch(setCurrentPage('studentmyteachers'));
    };

    // Table view columns
    const columns: ColumnsType<TestSession> = [
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
            title: 'Time Taken',
            dataIndex: 'time_taken',
            key: 'time_taken',
            width: 130,
            render: (time: string) => (
                <Tag icon={<FieldTimeOutlined />} style={{ borderRadius: '6px', fontWeight: 600 }}>
                    {time || '00:00'}
                </Tag>
            ),
        },
        {
            title: 'Score & Accuracy',
            key: 'score',
            width: 200,
            render: (_: any, session: TestSession) => {
                const pct = session.totalQuestions > 0 ? Math.round((session.score / session.totalQuestions) * 100) : 0;
                const strokeColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#ef4444';

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>
                                {session.score} / {session.totalQuestions}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: '11px', color: strokeColor }}>
                                {pct}%
                            </span>
                        </div>
                        <Progress percent={pct} showInfo={false} strokeColor={strokeColor} size={['100%', 6]} />
                    </div>
                );
            },
        },
        {
            title: 'Performance Status',
            key: 'performance',
            width: 150,
            render: (_: any, session: TestSession) => {
                const pct = session.totalQuestions > 0 ? (session.score / session.totalQuestions) * 100 : 0;
                if (pct === 100) {
                    return (
                        <Tag color="success" icon={<StarFilled />} style={{ borderRadius: '6px', fontWeight: 700 }}>
                            Perfect Score
                        </Tag>
                    );
                }
                if (pct >= 50) {
                    return (
                        <Tag color="blue" icon={<CheckCircleFilled />} style={{ borderRadius: '6px', fontWeight: 700 }}>
                            Passed
                        </Tag>
                    );
                }
                return (
                    <Tag color="error" icon={<CloseCircleFilled />} style={{ borderRadius: '6px', fontWeight: 700 }}>
                        Needs Practice
                    </Tag>
                );
            },
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            align: 'right',
            render: (_: any, session: TestSession) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => handleDetailsClick(session)}
                    style={{
                        borderRadius: '8px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        fontWeight: 600,
                    }}
                >
                    Review
                </Button>
            ),
        },
    ];

    if (loading && history.length === 0) {
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
                    Loading your MCQ test mark history and analytics...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Test History"
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
                        #printable-test-breakdown, #printable-test-breakdown * {
                            visibility: visible;
                        }
                        #printable-test-breakdown {
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
                {/* Glow decorative circles */}
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

                <Row gutter={[24, 20]} align="middle" justify="space-between">
                    <Col xs={24} md={15}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '14px',
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
                                <HistoryOutlined /> Academic Progress & Performance
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
                            MCQ Test Mark History 📊
                        </h1>

                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.92)',
                                fontSize: isMobile ? '12px' : '14px',
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {section ? (
                                <>
                                    Comprehensive daily quiz records and accuracy breakdown for{' '}
                                    <strong style={{ color: '#ffffff' }}>
                                        Class {effectiveClass || '--'} - Section {section}
                                    </strong>{' '}
                                    in academic session{' '}
                                    <strong style={{ color: '#fef08a' }}>{selectedAcademicYear || '--'}</strong>.
                                </>
                            ) : (
                                <>
                                    Track your performance scores and review answered questions for session{' '}
                                    <strong style={{ color: '#fef08a' }}>{selectedAcademicYear || '--'}</strong>.
                                </>
                            )}
                        </p>
                    </Col>

                    {/* Class Details & Overall Average Pill */}
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
                                    {section ? `- Section ${section}` : ''}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Overall Accuracy:</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#fef08a' }}>
                                    {stats.avgPercentage}% Average ({stats.totalTests} tests)
                                </span>
                            </div>

                            <Progress
                                percent={stats.avgPercentage}
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
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                                    Tests Attempted
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalTests}
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
                                <HistoryOutlined />
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
                                    Average Score
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.avgPercentage}%
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
                                <RiseOutlined />
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
                                    Perfect Scores
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#7c3aed',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.perfectScores}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <TrophyOutlined />
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
                                    Pass Rate (≥50%)
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#b45309',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.passRate}%
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
                                <ThunderboltOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CONTROL BAR: SEARCH, FILTERS, SORT & VIEW TOGGLE */}
            <Card
                className="no-print"
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
                            placeholder="Search by subject or question text..."
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
                                style={{ minWidth: isMobile ? '100%' : '150px' }}
                                popupMatchSelectWidth={false}
                                options={[
                                    { value: 'all', label: `All Subjects (${history.length})` },
                                    ...uniqueSubjects.map((s) => ({
                                        value: s,
                                        label: `${s} (${history.filter((h) => h.subject === s).length})`,
                                    })),
                                ]}
                            />

                            {/* Performance filter */}
                            <Select
                                value={performanceFilter}
                                onChange={(val) => setPerformanceFilter(val)}
                                style={{ minWidth: isMobile ? '100%' : '140px' }}
                                options={[
                                    { value: 'all', label: 'All Performance' },
                                    { value: 'perfect', label: `Perfect 100% (${stats.perfectScores})` },
                                    { value: 'passed', label: 'Passed (≥ 50%)' },
                                    { value: 'needs_practice', label: 'Needs Practice (< 50%)' },
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
                                    { value: 'highest', label: 'Highest Score' },
                                    { value: 'lowest', label: 'Lowest Score' },
                                ]}
                            />

                            {/* View Switcher */}
                            <Segmented
                                value={viewMode}
                                onChange={(val) => setViewMode(val as 'cards' | 'table')}
                                options={[
                                    { label: 'Cards', value: 'cards', icon: <AppstoreOutlined /> },
                                    { label: 'Table', value: 'table', icon: <UnorderedListOutlined /> },
                                ]}
                                style={{
                                    background: '#f1f5f9',
                                    borderRadius: '10px',
                                    padding: '3px',
                                    fontWeight: 600,
                                }}
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* 4. MAIN CONTENT AREA */}
            <Spin spinning={loading}>
                {filteredHistory.length > 0 ? (
                    viewMode === 'cards' ? (
                        /* CARD GRID VIEW */
                        <Row gutter={[16, 16]}>
                            {filteredHistory.map((session, index) => {
                                const palette = getSubjectPalette(session.subject);
                                const pct =
                                    session.totalQuestions > 0
                                        ? Math.round((session.score / session.totalQuestions) * 100)
                                        : 0;
                                const isPerfect = session.score === session.totalQuestions && session.totalQuestions > 0;
                                const isPassed = pct >= 50;

                                return (
                                    <Col xs={24} sm={12} lg={8} key={`${session.subject}-${session.test_date}-${index}`}>
                                        <Badge.Ribbon
                                            text={isPerfect ? '100% Perfect ★' : isPassed ? 'Passed' : 'Needs Practice'}
                                            color={isPerfect ? '#8b5cf6' : isPassed ? '#10b981' : '#f59e0b'}
                                            style={{ fontWeight: 700, borderRadius: '4px' }}
                                        >
                                            <Card
                                                hoverable
                                                onClick={() => handleDetailsClick(session)}
                                                style={{
                                                    borderRadius: '18px',
                                                    border: isPerfect
                                                        ? '2px solid #c4b5fd'
                                                        : `1px solid ${palette.border}`,
                                                    boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                                                    background: '#ffffff',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    transition: 'all 0.25s ease',
                                                }}
                                                bodyStyle={{
                                                    padding: isMobile ? '16px' : '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    height: '100%',
                                                }}
                                            >
                                                {/* Card Header */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                                    <div
                                                        style={{
                                                            width: '44px',
                                                            height: '44px',
                                                            borderRadius: '12px',
                                                            background: palette.badge,
                                                            color: '#ffffff',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '20px',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        <QuestionCircleOutlined />
                                                    </div>

                                                    <div style={{ minWidth: 0, flex: 1, paddingRight: '60px' }}>
                                                        <Title
                                                            level={4}
                                                            style={{
                                                                margin: 0,
                                                                fontWeight: 800,
                                                                fontSize: '16px',
                                                                color: '#0f172a',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                            }}
                                                        >
                                                            {session.subject}
                                                        </Title>
                                                        <span
                                                            style={{
                                                                fontSize: '12px',
                                                                color: '#64748b',
                                                                fontWeight: 600,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '4px',
                                                            }}
                                                        >
                                                            <CalendarOutlined style={{ fontSize: '11px' }} />
                                                            {dayjs(session.test_date).format('DD MMM YYYY')}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Metrics Box */}
                                                <div
                                                    style={{
                                                        background: '#f8fafc',
                                                        borderRadius: '14px',
                                                        padding: '12px 14px',
                                                        marginBottom: '16px',
                                                        border: '1px solid #f1f5f9',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                                            Score:
                                                        </span>
                                                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                                            {session.score} / {session.totalQuestions} Questions
                                                        </span>
                                                    </div>

                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                                            Time Taken:
                                                        </span>
                                                        <Tag
                                                            icon={<FieldTimeOutlined />}
                                                            style={{ margin: 0, borderRadius: '6px', fontWeight: 600 }}
                                                        >
                                                            {session.time_taken || '00:00'}
                                                        </Tag>
                                                    </div>

                                                    <Progress
                                                        percent={pct}
                                                        showInfo={false}
                                                        strokeColor={isPerfect ? '#8b5cf6' : isPassed ? '#10b981' : '#f59e0b'}
                                                        size={['100%', 6]}
                                                    />
                                                </div>

                                                {/* Action Button */}
                                                <div style={{ marginTop: 'auto' }}>
                                                    <Button
                                                        block
                                                        type="primary"
                                                        icon={<EyeOutlined />}
                                                        style={{
                                                            borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                            border: 'none',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        Review Question Breakdown
                                                    </Button>
                                                </div>
                                            </Card>
                                        </Badge.Ribbon>
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
                                dataSource={filteredHistory}
                                rowKey={(r, idx) => `${r.subject}-${r.test_date}-${idx}`}
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
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                                        {history.length === 0
                                            ? 'No MCQ Tests Attempted Yet'
                                            : 'No Records Match Your Filters'}
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '460px', margin: '0 auto 16px auto' }}>
                                        {history.length === 0
                                            ? 'You have not attended any daily rapid quizzes yet. Attend daily MCQ tests to boost your practice and build your marks history!'
                                            : 'Try resetting your search query or switching the performance and subject filters.'}
                                    </p>
                                </div>
                            }
                        >
                            <Space size={10} wrap>
                                {history.length > 0 ? (
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedSubject('all');
                                            setPerformanceFilter('all');
                                        }}
                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        Reset Filters
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        icon={<RightOutlined />}
                                        onClick={handleGoToDailyMCQ}
                                        style={{
                                            borderRadius: '8px',
                                            fontWeight: 700,
                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            border: 'none',
                                        }}
                                    >
                                        Attend Today's Quiz
                                    </Button>
                                )}
                            </Space>
                        </Empty>
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
                        Want to sharpen your skills? Attend the daily 5-question quiz or contact your subject teacher with questions.
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
                        icon={<RightOutlined />}
                        onClick={handleGoToDailyMCQ}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        Attend Daily Quiz
                    </Button>
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

            {/* 6. DETAILED QUESTION BREAKDOWN MODAL */}
            <Modal
                title={
                    selectedSession && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <QuestionCircleOutlined style={{ color: '#2563eb' }} />
                            <span>
                                Test Review: <strong>{selectedSession.subject}</strong>
                            </span>
                            <Tag color="blue" style={{ borderRadius: '6px', fontWeight: 700 }}>
                                {dayjs(selectedSession.test_date).format('DD MMM YYYY')}
                            </Tag>
                        </div>
                    )
                }
                open={isModalVisible}
                onCancel={handleModalClose}
                width={820}
                centered
                destroyOnClose
                footer={[
                    <Button
                        key="print"
                        icon={<PrinterOutlined />}
                        onClick={handlePrintDetails}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        Print Review
                    </Button>,
                    <Button
                        key="quiz"
                        type="primary"
                        icon={<RightOutlined />}
                        onClick={() => {
                            handleModalClose();
                            handleGoToDailyMCQ();
                        }}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            background: '#2563eb',
                        }}
                    >
                        Attend Today's Quiz
                    </Button>,
                    <Button key="close" onClick={handleModalClose} style={{ borderRadius: '8px', fontWeight: 600 }}>
                        Close
                    </Button>,
                ]}
            >
                {selectedSession && (
                    <div id="printable-test-breakdown">
                        {/* Modal Performance Banner */}
                        {(() => {
                            const pct =
                                selectedSession.totalQuestions > 0
                                    ? Math.round((selectedSession.score / selectedSession.totalQuestions) * 100)
                                    : 0;
                            const isPerfect = selectedSession.score === selectedSession.totalQuestions;
                            const isPassed = pct >= 50;

                            return (
                                <div
                                    style={{
                                        background: isPerfect
                                            ? 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)'
                                            : isPassed
                                            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                                            : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                                        border: `1px solid ${isPerfect ? '#ddd6fe' : isPassed ? '#bbf7d0' : '#fde68a'}`,
                                        borderRadius: '16px',
                                        padding: '16px 20px',
                                        marginBottom: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '12px',
                                    }}
                                >
                                    <div>
                                        <div
                                            style={{
                                                fontSize: '17px',
                                                fontWeight: 800,
                                                color: isPerfect ? '#6d28d9' : isPassed ? '#166534' : '#92400e',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            {isPerfect ? (
                                                <>
                                                    <TrophyOutlined /> Outstanding! 100% Perfect Score!
                                                </>
                                            ) : isPassed ? (
                                                <>
                                                    <CheckCircleOutlined /> Well Done! Passed with {pct}% Accuracy
                                                </>
                                            ) : (
                                                <>
                                                    <ThunderboltOutlined /> Good Effort! Review incorrect answers below
                                                </>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px' }}>
                                            Subject: <strong>{selectedSession.subject}</strong> • Completed in{' '}
                                            <strong>{selectedSession.time_taken || 'N/A'}</strong>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right' }}>
                                        <span
                                            style={{
                                                fontSize: '24px',
                                                fontWeight: 900,
                                                color: isPerfect ? '#6d28d9' : isPassed ? '#059669' : '#d97706',
                                            }}
                                        >
                                            {selectedSession.score} / {selectedSession.totalQuestions}
                                        </span>
                                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block' }}>
                                            Total Correct Answers
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Question Breakdown Cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {selectedSession.questions && selectedSession.questions.length > 0 ? (
                                selectedSession.questions.map((q: QuestionResult, idx: number) => {
                                    const isCorrect = q.selected_answer === q.correct_answer;

                                    return (
                                        <div
                                            key={q.question_id || idx}
                                            style={{
                                                background: '#ffffff',
                                                borderRadius: '14px',
                                                border: `1px solid ${isCorrect ? '#bbf7d0' : '#fecaca'}`,
                                                padding: '16px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                            }}
                                        >
                                            {/* Question Header */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'space-between',
                                                    gap: '10px',
                                                    marginBottom: '12px',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                                    <span
                                                        style={{
                                                            background: isCorrect ? '#ecfdf5' : '#fef2f2',
                                                            color: isCorrect ? '#059669' : '#dc2626',
                                                            fontWeight: 800,
                                                            fontSize: '12px',
                                                            padding: '2px 8px',
                                                            borderRadius: '6px',
                                                            border: `1px solid ${isCorrect ? '#a7f3d0' : '#fca5a5'}`,
                                                            flexShrink: 0,
                                                        }}
                                                    >
                                                        Q{idx + 1}
                                                    </span>
                                                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a', lineHeight: 1.4 }}>
                                                        {q.question_text}
                                                    </span>
                                                </div>

                                                <Tag
                                                    color={isCorrect ? 'success' : 'error'}
                                                    icon={isCorrect ? <CheckCircleFilled /> : <CloseCircleFilled />}
                                                    style={{ borderRadius: '6px', fontWeight: 700, margin: 0, flexShrink: 0 }}
                                                >
                                                    {isCorrect ? 'Correct (+1)' : 'Incorrect (0)'}
                                                </Tag>
                                            </div>

                                            {/* Answer Breakdown */}
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                                                    gap: '10px',
                                                    background: '#f8fafc',
                                                    padding: '12px',
                                                    borderRadius: '10px',
                                                }}
                                            >
                                                {/* Student Answer */}
                                                <div>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                        Your Chosen Answer:
                                                    </span>
                                                    <Tag
                                                        color={isCorrect ? 'green' : 'red'}
                                                        style={{
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            padding: '3px 10px',
                                                            borderRadius: '6px',
                                                            margin: 0,
                                                            maxWidth: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {q.selected_answer || 'Not Answered'}
                                                    </Tag>
                                                </div>

                                                {/* Correct Answer (Shown especially if student was wrong) */}
                                                <div>
                                                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                                                        Official Correct Answer:
                                                    </span>
                                                    <Tag
                                                        color="blue"
                                                        style={{
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            padding: '3px 10px',
                                                            borderRadius: '6px',
                                                            margin: 0,
                                                            maxWidth: '100%',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                        }}
                                                    >
                                                        {q.correct_answer}
                                                    </Tag>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <Empty description="No question breakdown details available for this session." />
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default MCQtestmarkhistory;
