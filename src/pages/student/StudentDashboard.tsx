import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Card,
    Col,
    Row,
    Typography,
    Avatar,
    Carousel,
    Tag,
    Button,
    Badge,
    Empty,
    Skeleton,
    Select,
    Modal,
    Image,
    Space,
    Tooltip,
    Segmented,
    Progress,
    Spin,
    Grid
} from 'antd';
import {
    UserOutlined,
    BookOutlined,
    CalendarOutlined,
    TeamOutlined,
    FormOutlined,
    QuestionCircleOutlined,
    NotificationOutlined,
    WechatOutlined,
    FileTextOutlined,
    ArrowRightOutlined,
    ClockCircleOutlined,
    RocketOutlined,
    ReadOutlined,
    BankOutlined,
    EnvironmentOutlined,
    PhoneOutlined,
    MailOutlined,
    GlobalOutlined,
    SafetyCertificateOutlined,
    EyeOutlined,
    BarChartOutlined,
    CheckCircleOutlined,
    ThunderboltOutlined,
    TrophyOutlined,
    FundOutlined,
    AuditOutlined,
    PieChartOutlined,
    RiseOutlined
} from '@ant-design/icons';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title as ChartTitle,
    Tooltip as ChartTooltip,
    Legend,
    ArcElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    ChartTitle,
    ChartTooltip,
    Legend,
    ArcElement
);
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { fetchMainImagesRequest } from '../../store/features/main-images/mainImagesSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';
import { supabase } from '../../service/supabaseClient';

const { Title, Text, Paragraph } = Typography;

interface AcademicYearOption {
    value: string;
    label: string;
    isCurrent: boolean;
    status?: string;
}

interface AttendanceMetric {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    attendanceRate: number;
    monthlyTrend: { month: string; present: number; total: number; rate: number }[];
}

interface HomeworkMetric {
    totalAssigned: number;
    completed: number;
    pending: number;
    completionRate: number;
    subjectWise: { subject: string; assigned: number; completed: number; pending: number }[];
}

interface HomeTestMetric {
    totalTests: number;
    completedTests: number;
    averageScore: number;
    subjectWise: { subject: string; testsCount: number; avgScore: number }[];
}

interface QuizMetric {
    totalQuizzes: number;
    averageScore: number;
    recentScores: { date: string; subject: string; score: number; total: number; percentage: number }[];
    subjectWise: { subject: string; quizCount: number; avgPercentage: number }[];
}

const getAcademicYearDateRange = (ay: string) => {
    if (!ay) return { start: null, end: null };
    const m = ay.match(/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{4})/);
    if (m) {
        const start = `${m[2]}-${m[1].padStart(2, '0')}-01`;
        const endMonth = parseInt(m[3], 10);
        const endYear = parseInt(m[4], 10);
        const lastDay = new Date(endYear, endMonth, 0).getDate();
        const end = `${endYear}-${m[3].padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        return { start, end };
    }
    const y = ay.match(/(\d{4})\s*-\s*(\d{4})/);
    if (y) {
        return { start: `${y[1]}-04-01`, end: `${y[2]}-03-31` };
    }
    return { start: null, end: null };
};

// Color gradients for periods
const PERIOD_COLORS = [
    { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8', badge: '#3b82f6' },
    { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9', badge: '#8b5cf6' },
    { bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', badge: '#10b981' },
    { bg: '#fff7ed', border: '#fed7aa', text: '#c2410c', badge: '#f97316' },
    { bg: '#fdf2f8', border: '#fbcfe8', text: '#be185d', badge: '#ec4899' },
    { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', badge: '#22c55e' },
    { bg: '#fefce8', border: '#fef08a', text: '#a16207', badge: '#eab308' },
    { bg: '#e0f2fe', border: '#bae6fd', text: '#0369a1', badge: '#0284c7' },
];

const StudentDashboard: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetable, mappings, loading } = useSelector((state: RootState) => state.studentDashboard);
    const { images: mainImages, loading: imagesLoading } = useSelector((state: RootState) => state.mainImages);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');

    // Section and Student Photo
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);
    const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // Organization Logo resolution state
    const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string | null>(null);
    const [logoLoadError, setLogoLoadError] = useState(false);

    // Organization fallback info
    const [orgName, setOrgName] = useState<string>('');

    // Academic Year Analytics State (Attendance, Homework, Home Test, Quiz)
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsTab, setAnalyticsTab] = useState<'all' | 'attendance' | 'homework' | 'hometest' | 'quiz'>('all');
    const [attendanceMetric, setAttendanceMetric] = useState<AttendanceMetric>({
        totalDays: 0,
        presentDays: 0,
        absentDays: 0,
        halfDays: 0,
        attendanceRate: 0,
        monthlyTrend: [],
    });
    const [homeworkMetric, setHomeworkMetric] = useState<HomeworkMetric>({
        totalAssigned: 0,
        completed: 0,
        pending: 0,
        completionRate: 0,
        subjectWise: [],
    });
    const [homeTestMetric, setHomeTestMetric] = useState<HomeTestMetric>({
        totalTests: 0,
        completedTests: 0,
        averageScore: 0,
        subjectWise: [],
    });
    const [quizMetric, setQuizMetric] = useState<QuizMetric>({
        totalQuizzes: 0,
        averageScore: 0,
        recentScores: [],
        subjectWise: [],
    });

    const currentDate = dayjs().format('dddd, MMMM D, YYYY');
    const dayOfWeek = dayjs().format('dddd');

    // 1. Fetch Academic Years from database and default to the current active one
    useEffect(() => {
        if (!user?.organization_key) return;

        const fetchAcademicYears = async () => {
            try {
                const { data, error } = await supabase
                    .from('academic_year')
                    .select('academic_year, is_current, status')
                    .eq('organization_key', user.organization_key)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.warn('Academic year fetch warning:', error.message);
                    return;
                }

                const rawList = data || [];
                const yearMap = new Map<string, AcademicYearOption>();

                rawList.forEach((row: any) => {
                    const y = (row.academic_year || '').trim();
                    if (y && !yearMap.has(y)) {
                        const isCur = row.is_current === true || row.is_current === 'true';
                        yearMap.set(y, {
                            value: y,
                            label: isCur ? `${y} (Current)` : y,
                            isCurrent: isCur,
                            status: row.status,
                        });
                    }
                });

                // Ensure user's assigned academic_year is present
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

                setAcademicYears(options);

                // Default select current academic year
                const currentOption = options.find((opt) => opt.isCurrent) || options[0];
                const defaultYear = currentOption?.value || user?.academic_year || '';
                setSelectedAcademicYear((prev) => (prev ? prev : defaultYear));
            } catch (err) {
                console.error('Error fetching academic years:', err);
                if (user?.academic_year) {
                    setSelectedAcademicYear(user.academic_year);
                }
            }
        };

        fetchAcademicYears();
    }, [user?.organization_key, user?.academic_year]);

    // 2. Fetch Organization basic details and school details
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchMainImagesRequest(user.organization_key));

            const fetchOrgInfo = async () => {
                try {
                    const { data } = await supabase
                        .from('organizations')
                        .select('name')
                        .eq('organization_key', user.organization_key)
                        .maybeSingle();
                    if (data?.name) {
                        setOrgName(data.name);
                    }
                } catch (err) {
                    console.error('Error fetching org name:', err);
                }
            };
            fetchOrgInfo();
        }
    }, [dispatch, user?.organization_key]);

    // 3. Resolve School Logo via logo_path (bucket: schooldetails_documents) or logo_url
    useEffect(() => {
        let isMounted = true;
        setLogoLoadError(false);

        const resolveLogo = async () => {
            if (!schoolDetails) {
                if (isMounted) setResolvedLogoUrl(null);
                return;
            }

            // 1. If logo_path is stored, derive fresh public URL or signed URL from Supabase storage
            if (schoolDetails.logo_path) {
                try {
                    const { data: pubData } = supabase.storage
                        .from('schooldetails_documents')
                        .getPublicUrl(schoolDetails.logo_path);

                    if (pubData?.publicUrl) {
                        if (isMounted) setResolvedLogoUrl(pubData.publicUrl);
                        return;
                    }
                } catch (e) {
                    console.warn('Storage getPublicUrl warning for logo:', e);
                }

                // Try signed URL if storage bucket is private
                try {
                    const { data: signData } = await supabase.storage
                        .from('schooldetails_documents')
                        .createSignedUrl(schoolDetails.logo_path, 86400);

                    if (signData?.signedUrl) {
                        if (isMounted) setResolvedLogoUrl(signData.signedUrl);
                        return;
                    }
                } catch (e) {
                    console.warn('Storage createSignedUrl warning for logo:', e);
                }
            }

            // 2. Fall back to direct logo_url
            if (schoolDetails.logo_url) {
                if (isMounted) setResolvedLogoUrl(schoolDetails.logo_url);
                return;
            }

            if (isMounted) setResolvedLogoUrl(null);
        };

        resolveLogo();

        return () => {
            isMounted = false;
        };
    }, [schoolDetails?.logo_url, schoolDetails?.logo_path]);

    // 4. Fetch real passport photo from student_documents or students table
    useEffect(() => {
        let isMounted = true;

        const fetchPhoto = async () => {
            try {
                let studentId = user?.id;
                let foundPhoto: string | null = user?.photo_url || null;

                // Step A: If register_no is available, check students table to get student id and photo_url
                if (user?.register_no) {
                    let stQuery = supabase
                        .from('students')
                        .select('id, photo_url')
                        .eq('register_no', user.register_no);

                    if (user.organization_key) {
                        stQuery = stQuery.eq('organization_key', user.organization_key);
                    }

                    const { data: stData } = await stQuery.maybeSingle();
                    if (stData) {
                        if (stData.id) studentId = stData.id;
                        if (stData.photo_url) foundPhoto = stData.photo_url;
                    }
                }

                // Step B: Query student_documents for the official Passport Size Photo
                if (studentId) {
                    let docQuery = supabase
                        .from('student_documents')
                        .select('public_url, file_path, doc_type')
                        .eq('student_id', studentId);

                    if (user?.organization_key) {
                        docQuery = docQuery.eq('organization_key', user.organization_key);
                    }

                    const { data: docs } = await docQuery;

                    if (docs && docs.length > 0) {
                        const passportDoc = docs.find((d: any) => d.doc_type === 'Passport Size Photo') || docs[0];

                        if (passportDoc?.public_url) {
                            foundPhoto = passportDoc.public_url;
                        } else if (passportDoc?.file_path) {
                            const { data: pubData } = supabase.storage
                                .from('student-documents')
                                .getPublicUrl(passportDoc.file_path);

                            if (pubData?.publicUrl) {
                                foundPhoto = pubData.publicUrl;
                            } else {
                                const { data: signData } = await supabase.storage
                                    .from('student-documents')
                                    .createSignedUrl(passportDoc.file_path, 86400);

                                if (signData?.signedUrl) {
                                    foundPhoto = signData.signedUrl;
                                }
                            }
                        }
                    }
                }

                if (isMounted && foundPhoto) {
                    setStudentPhoto(foundPhoto);
                }
            } catch (err) {
                console.error('Error fetching student photo:', err);
                if (isMounted && user?.photo_url) {
                    setStudentPhoto(user.photo_url);
                }
            }
        };

        if (user?.register_no || user?.id) {
            fetchPhoto();
        }

        return () => {
            isMounted = false;
        };
    }, [user?.id, user?.register_no, user?.organization_key, user?.photo_url]);

    // 4. Fetch student section based on SELECTED academic year
    useEffect(() => {
        if (!user?.organization_key || !user?.register_no || !selectedAcademicYear) {
            setLoadingSection(false);
            return;
        }

        const fetchSectionForYear = async () => {
            setLoadingSection(true);
            try {
                const { data, error: sectionError } = await supabase
                    .from('class_section_allocations')
                    .select('section_name')
                    .eq('organization_key', user.organization_key)
                    .eq('register_no', user.register_no)
                    .eq('academic_year', selectedAcademicYear)
                    .maybeSingle();

                if (sectionError) throw sectionError;
                setSection(data?.section_name || null);
            } catch (err) {
                console.error('Error fetching student section for year:', err);
                setSection(null);
            } finally {
                setLoadingSection(false);
            }
        };

        fetchSectionForYear();
    }, [user?.organization_key, user?.register_no, selectedAcademicYear]);

    // 5. Fetch dashboard data (Timetable & Mappings) based on SELECTED academic year
    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && selectedAcademicYear) {
            dispatch(
                fetchStudentDashboardDataRequest({
                    organizationKey: user.organization_key,
                    className: user.admitted_class,
                    sectionName: section,
                    academicYear: selectedAcademicYear,
                })
            );
        }
    }, [dispatch, user?.organization_key, user?.admitted_class, section, selectedAcademicYear]);

    // 6. Fetch Comprehensive Analytics (Attendance, Homework, Home Test, Quiz) for SELECTED academic year
    useEffect(() => {
        if (!user?.organization_key || !selectedAcademicYear) return;

        let isMounted = true;

        const fetchAnalyticsData = async () => {
            setAnalyticsLoading(true);
            try {
                // A. Attendance for this student in selected academic year
                let attQuery = supabase
                    .from('student_attendance')
                    .select('date, forenoon_status, afternoon_status, attendace_status')
                    .eq('organization_key', user.organization_key)
                    .eq('academic_year', selectedAcademicYear);

                if (user.register_no) {
                    attQuery = attQuery.eq('register_no', user.register_no);
                } else if (user.id) {
                    attQuery = attQuery.eq('student_id', user.id);
                }

                const { data: rawAtt } = await attQuery.order('date', { ascending: true });

                if (rawAtt && rawAtt.length > 0) {
                    let pCount = 0;
                    let aCount = 0;
                    let hCount = 0;
                    const monthMap: Record<string, { present: number; total: number }> = {};

                    rawAtt.forEach((r: any) => {
                        const status = (r.attendace_status || r.forenoon_status || '').toLowerCase();
                        const isHalf = status.includes('half');
                        const isAbsent = status.includes('absent');
                        const isPresent = status.includes('present') || (!isHalf && !isAbsent);

                        if (isHalf) {
                            hCount++;
                            pCount += 0.5;
                        } else if (isAbsent) {
                            aCount++;
                        } else {
                            pCount++;
                        }

                        if (r.date) {
                            const monthKey = dayjs(r.date).format('MMM YYYY');
                            if (!monthMap[monthKey]) monthMap[monthKey] = { present: 0, total: 0 };
                            monthMap[monthKey].total++;
                            if (isHalf) monthMap[monthKey].present += 0.5;
                            else if (!isAbsent) monthMap[monthKey].present++;
                        }
                    });

                    const total = rawAtt.length;
                    const rate = total > 0 ? Math.round((pCount / total) * 100) : 0;
                    const monthly = Object.entries(monthMap).map(([month, val]) => ({
                        month,
                        present: val.present,
                        total: val.total,
                        rate: val.total > 0 ? Math.round((val.present / val.total) * 100) : 0,
                    }));

                    if (isMounted) {
                        setAttendanceMetric({
                            totalDays: total,
                            presentDays: Math.floor(pCount),
                            absentDays: aCount,
                            halfDays: hCount,
                            attendanceRate: rate,
                            monthlyTrend: monthly,
                        });
                    }
                } else if (isMounted) {
                    setAttendanceMetric({
                        totalDays: 0,
                        presentDays: 0,
                        absentDays: 0,
                        halfDays: 0,
                        attendanceRate: 0,
                        monthlyTrend: [],
                    });
                }

                // B. Homework & Student Reports for selected academic year
                let hwQuery = supabase
                    .from('homework')
                    .select('id, subject, homework_date, class_name, section_name, academic_year')
                    .eq('organization_key', user.organization_key)
                    .eq('academic_year', selectedAcademicYear);

                if (user.admitted_class) hwQuery = hwQuery.eq('class_name', user.admitted_class);
                if (section) hwQuery = hwQuery.eq('section_name', section);

                const { data: hwList } = await hwQuery;

                let hwReportQuery = supabase
                    .from('homework_report')
                    .select('id, homework_id, subject, status, get_mark, academic_year')
                    .eq('organization_key', user.organization_key)
                    .eq('academic_year', selectedAcademicYear);

                if (user.id) {
                    hwReportQuery = hwReportQuery.eq('student_id', user.id);
                }

                const { data: hwReports } = await hwReportQuery;

                const assignedHw = hwList || [];
                const reports = hwReports || [];
                const completedHwIds = new Set(
                    reports
                        .filter((r: any) => r.status === 'Completed' || r.status === 'Confirm' || (r.get_mark !== null && r.get_mark !== undefined))
                        .map((r: any) => r.homework_id)
                );

                const subjectHwMap: Record<string, { assigned: number; completed: number; pending: number }> = {};
                assignedHw.forEach((hw: any) => {
                    const sub = hw.subject || 'General';
                    if (!subjectHwMap[sub]) subjectHwMap[sub] = { assigned: 0, completed: 0, pending: 0 };
                    subjectHwMap[sub].assigned++;
                    if (completedHwIds.has(hw.id)) {
                        subjectHwMap[sub].completed++;
                    } else {
                        subjectHwMap[sub].pending++;
                    }
                });

                const totalHw = assignedHw.length;
                const completedCount = completedHwIds.size;
                const pendingCount = Math.max(0, totalHw - completedCount);
                const hwRate = totalHw > 0 ? Math.round((completedCount / totalHw) * 100) : 0;

                if (isMounted) {
                    setHomeworkMetric({
                        totalAssigned: totalHw,
                        completed: completedCount,
                        pending: pendingCount,
                        completionRate: hwRate,
                        subjectWise: Object.entries(subjectHwMap).map(([sub, val]) => ({
                            subject: sub,
                            assigned: val.assigned,
                            completed: val.completed,
                            pending: val.pending,
                        })),
                    });
                }

                // C. Home Tests & Reports for selected academic year
                let htQuery = supabase
                    .from('home_test')
                    .select('id, subject, total_marks, class_name, section_name, academic_year')
                    .eq('organization_key', user.organization_key)
                    .eq('academic_year', selectedAcademicYear);

                if (user.admitted_class) htQuery = htQuery.eq('class_name', user.admitted_class);
                if (section) htQuery = htQuery.eq('section_name', section);

                const { data: htList } = await htQuery;

                let htReportQuery = supabase
                    .from('home_test_report')
                    .select('id, home_test_id, subject, total_marks, get_mark, status, academic_year')
                    .eq('organization_key', user.organization_key)
                    .eq('academic_year', selectedAcademicYear);

                if (user.id) {
                    htReportQuery = htReportQuery.eq('student_id', user.id);
                }

                const { data: htReports } = await htReportQuery;

                const assignedTests = htList || [];
                const testReports = htReports || [];

                let totalScoreSum = 0;
                let scoredCount = 0;
                const subScoreMap: Record<string, { totalPct: number; count: number }> = {};

                testReports.forEach((tr: any) => {
                    if (tr.get_mark !== null && tr.get_mark !== undefined && tr.total_marks > 0) {
                        const pct = Math.round((tr.get_mark / tr.total_marks) * 100);
                        totalScoreSum += pct;
                        scoredCount++;

                        const sub = tr.subject || 'General';
                        if (!subScoreMap[sub]) subScoreMap[sub] = { totalPct: 0, count: 0 };
                        subScoreMap[sub].totalPct += pct;
                        subScoreMap[sub].count++;
                    }
                });

                const avgScore = scoredCount > 0 ? Math.round(totalScoreSum / scoredCount) : 0;

                if (isMounted) {
                    setHomeTestMetric({
                        totalTests: assignedTests.length || testReports.length,
                        completedTests: scoredCount,
                        averageScore: avgScore,
                        subjectWise: Object.entries(subScoreMap).map(([sub, val]) => ({
                            subject: sub,
                            testsCount: val.count,
                            avgScore: Math.round(val.totalPct / val.count),
                        })),
                    });
                }

                // D. Quiz (Daily MCQ) history for this student in selected academic year
                const { data: rawMcq } = await supabase
                    .from('mcqtestdata')
                    .select('id, test_date, subject, student_results')
                    .order('test_date', { ascending: true });

                const dateRange = getAcademicYearDateRange(selectedAcademicYear);
                const quizSessions: any[] = [];
                let quizScoreSum = 0;
                const quizSubMap: Record<string, { totalPct: number; count: number }> = {};

                (rawMcq || []).forEach((session: any) => {
                    if (dateRange.start && dateRange.end && session.test_date) {
                        const d = session.test_date;
                        if (d < dateRange.start || d > dateRange.end) return;
                    }

                    const studentResult = session.student_results?.find((res: any) => res.student_id === user.id);
                    if (studentResult && studentResult.total_questions > 0) {
                        const pct = Math.round((studentResult.score / studentResult.total_questions) * 100);
                        quizScoreSum += pct;
                        quizSessions.push({
                            date: session.test_date || '',
                            subject: session.subject || 'General',
                            score: studentResult.score,
                            total: studentResult.total_questions,
                            percentage: pct,
                        });

                        const sub = session.subject || 'General';
                        if (!quizSubMap[sub]) quizSubMap[sub] = { totalPct: 0, count: 0 };
                        quizSubMap[sub].totalPct += pct;
                        quizSubMap[sub].count++;
                    }
                });

                const avgQuizScore = quizSessions.length > 0 ? Math.round(quizScoreSum / quizSessions.length) : 0;

                if (isMounted) {
                    setQuizMetric({
                        totalQuizzes: quizSessions.length,
                        averageScore: avgQuizScore,
                        recentScores: quizSessions.slice(-8),
                        subjectWise: Object.entries(quizSubMap).map(([sub, val]) => ({
                            subject: sub,
                            quizCount: val.count,
                            avgPercentage: Math.round(val.totalPct / val.count),
                        })),
                    });
                }
            } catch (err) {
                console.error('Error fetching student analytics:', err);
            } finally {
                if (isMounted) setAnalyticsLoading(false);
            }
        };

        fetchAnalyticsData();

        return () => {
            isMounted = false;
        };
    }, [user?.id, user?.register_no, user?.organization_key, user?.admitted_class, section, selectedAcademicYear]);

    const handleNavigate = (page: string) => {
        dispatch(setCurrentPage(page as any));
    };

    // Class Teacher
    const classTeacher = useMemo(() => {
        return mappings.find((m) => m.role === 'Class Teacher') || null;
    }, [mappings]);

    // Subject Teachers
    const subjectTeachers = useMemo(() => {
        return mappings.filter((m) => m.role !== 'Class Teacher');
    }, [mappings]);

    // Today's Timetable Periods
    const todayPeriods = useMemo(() => {
        if (!timetable?.timetable_data) return [];
        const filtered = timetable.timetable_data.filter((entry) => entry.day === dayOfWeek);
        if (filtered.length > 0) return [...filtered].sort((a, b) => a.period - b.period);

        // If weekend or empty, fallback to Monday
        const mondayFiltered = timetable.timetable_data.filter((entry) => entry.day === 'Monday');
        return [...mondayFiltered].sort((a, b) => a.period - b.period);
    }, [timetable, dayOfWeek]);

    const isWeekend = dayOfWeek === 'Sunday' || (todayPeriods.length > 0 && todayPeriods[0]?.day !== dayOfWeek);
    const isLoading = loading || imagesLoading || loadingSection;

    // Resolved School / Organization Info
    const displaySchoolName = schoolDetails?.school_name || orgName || 'School Organization';
    const displayAffiliation = schoolDetails?.affiliation ? `Affiliation: ${schoolDetails.affiliation}` : schoolDetails?.tagline || 'Excellence in Education';
    const displayAddress = schoolDetails?.address || '';
    const displayPhone = schoolDetails?.phone_number || '';
    const displayEmail = schoolDetails?.email || '';
    const displayWebsite = schoolDetails?.website || '';
    const displaySchoolType = schoolDetails?.school_type || 'Institution';

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: isMobile ? '0 10px 30px 10px' : '0 16px 40px 16px' }}>
            {/* 1. CAMPUS BANNER CAROUSEL */}
            {mainImages && mainImages.length > 0 && (
                <div
                    style={{
                        marginBottom: '24px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                    }}
                >
                    <Carousel autoplay effect="fade">
                        {mainImages.map((image) => (
                            <div key={image.id}>
                                <div
                                    style={{
                                        position: 'relative',
                                        height: 'clamp(180px, 28vw, 320px)',
                                        width: '100%',
                                        overflow: 'hidden',
                                        background: '#0f172a',
                                    }}
                                >
                                    <img
                                        src={image.image_url}
                                        alt="Campus Announcement Banner"
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                        }}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            background: 'linear-gradient(to top, rgba(15, 23, 42, 0.6) 0%, rgba(0,0,0,0) 60%)',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </Carousel>
                </div>
            )}

            {/* 2. SCHOOL / ORGANIZATION BANNER */}
            <Card
                style={{
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    marginBottom: '20px',
                    boxShadow: '0 4px 16px rgba(15, 23, 42, 0.03)',
                }}
                bodyStyle={{ padding: isMobile ? '16px' : '20px 24px' }}
            >
                <Row align="middle" justify="space-between" gutter={[16, 12]}>
                    <Col xs={24} md={15}>
                        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '12px' : '16px', width: '100%' }}>
                            {!logoLoadError && resolvedLogoUrl ? (
                                <img
                                    src={resolvedLogoUrl}
                                    alt={displaySchoolName}
                                    onError={async () => {
                                        // If public URL fails and logo_path exists, try signed URL
                                        if (schoolDetails?.logo_path && !resolvedLogoUrl.includes('token=')) {
                                            try {
                                                const { data: signData } = await supabase.storage
                                                    .from('schooldetails_documents')
                                                    .createSignedUrl(schoolDetails.logo_path, 86400);
                                                if (signData?.signedUrl) {
                                                    setResolvedLogoUrl(signData.signedUrl);
                                                    return;
                                                }
                                            } catch {
                                                // ignore
                                            }
                                        }
                                        setLogoLoadError(true);
                                    }}
                                    style={{
                                        width: isMobile ? '46px' : '54px',
                                        height: isMobile ? '46px' : '54px',
                                        borderRadius: isMobile ? '12px' : '14px',
                                        objectFit: 'contain',
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                        flexShrink: 0,
                                        padding: '4px',
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: isMobile ? '46px' : '54px',
                                        height: isMobile ? '46px' : '54px',
                                        borderRadius: isMobile ? '12px' : '14px',
                                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: isMobile ? '20px' : '24px',
                                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                        flexShrink: 0,
                                    }}
                                >
                                    <BankOutlined />
                                </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <Title
                                        level={4}
                                        style={{
                                            margin: 0,
                                            fontWeight: 800,
                                            color: '#0f172a',
                                            fontSize: isMobile ? '16px' : '20px',
                                            lineHeight: 1.3,
                                        }}
                                    >
                                        {displaySchoolName}
                                    </Title>
                                    <Tag color="blue" style={{ borderRadius: '8px', fontWeight: 700, fontSize: '11px', margin: 0 }}>
                                        {displaySchoolType}
                                    </Tag>
                                </div>
                                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '2px', lineHeight: 1.4 }}>
                                    {displayAffiliation} {displayAddress ? `• ${displayAddress}` : ''}
                                </Text>
                            </div>
                        </div>
                    </Col>

                    {/* Academic Year Selector */}
                    <Col xs={24} md={9}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: isMobile ? 'space-between' : 'flex-end',
                                alignItems: 'center',
                                width: '100%',
                                marginTop: isMobile ? '10px' : 0,
                                paddingTop: isMobile ? '10px' : 0,
                                borderTop: isMobile ? '1px solid #f1f5f9' : 'none',
                            }}
                        >
                            <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, marginRight: '8px' }}>
                                Academic Session:
                            </Text>
                            <Select
                                value={selectedAcademicYear}
                                onChange={(val) => setSelectedAcademicYear(val)}
                                options={academicYears}
                                style={{ width: isMobile ? '60%' : '100%', maxWidth: 200, fontWeight: 700 }}
                                placeholder="Select Year"
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* 3. STUDENT HERO & PROFILE BANNER */}
            <div
                style={{
                    borderRadius: isMobile ? '20px' : '24px',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)',
                    padding: isMobile ? '16px 14px' : '24px 30px',
                    color: '#ffffff',
                    marginBottom: '20px',
                    boxShadow: '0 20px 35px -10px rgba(37, 99, 235, 0.35)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Ambient glow mesh */}
                <div
                    style={{
                        position: 'absolute',
                        top: '-60px',
                        right: '-40px',
                        width: '260px',
                        height: '260px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(147, 197, 253, 0.35) 0%, rgba(147, 197, 253) 70%)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        bottom: '-50px',
                        left: '20%',
                        width: '200px',
                        height: '200px',
                        borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(199, 210, 254, 0.25) 0%, rgba(199, 210, 254) 70%)',
                        pointerEvents: 'none',
                    }}
                />

                <Row justify="space-between" align="middle" gutter={[16, 14]}>
                    <Col xs={24} md={15}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '16px', width: '100%' }}>
                            {/* Profile Image with Click to Zoom */}
                            <Tooltip title="Click to view full photo">
                                <div
                                    onClick={() => setIsProfileModalOpen(true)}
                                    style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}
                                >
                                    <Badge dot status="success" offset={[-4, isMobile ? 48 : 56]}>
                                        <Avatar
                                            size={isMobile ? 62 : 74}
                                            src={studentPhoto || user?.photo_url}
                                            icon={<UserOutlined />}
                                            onError={() => {
                                                setStudentPhoto(null);
                                                return false;
                                            }}
                                            style={{
                                                border: '3px solid rgba(255, 255, 255, 0.95)',
                                                boxShadow: '0 8px 18px rgba(0, 0, 0, 0.25)',
                                                background: '#3b82f6',
                                                cursor: 'pointer',
                                            }}
                                        />
                                    </Badge>
                                </div>
                            </Tooltip>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            backdropFilter: 'blur(8px)',
                                            WebkitBackdropFilter: 'blur(8px)',
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            letterSpacing: '0.5px',
                                            color: '#e0f2fe',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}
                                    >
                                        <CalendarOutlined /> {currentDate}
                                    </span>
                                </div>

                                <h1
                                    style={{
                                        fontSize: isMobile ? '20px' : '26px',
                                        fontWeight: 800,
                                        margin: '0 0 4px 0',
                                        letterSpacing: '-0.5px',
                                        color: '#ffffff',
                                        lineHeight: 1.25,
                                    }}
                                >
                                    Welcome back, {user?.full_name || user?.name || 'Student'}! 👋
                                </h1>

                                <p
                                    style={{
                                        color: 'rgba(255, 255, 255, 0.9)',
                                        fontSize: isMobile ? '12px' : '14px',
                                        margin: 0,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    Showing timetable and academic records for{' '}
                                    <strong style={{ color: '#ffffff' }}>{selectedAcademicYear || 'current academic year'}</strong>.
                                </p>
                            </div>
                        </div>
                    </Col>

                    {/* Student Identity Chips */}
                    <Col xs={24} md={9}>
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.14)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: isMobile ? '14px' : '18px',
                                padding: isMobile ? '10px 14px' : '14px 18px',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Class & Section:</span>
                                <span style={{ fontWeight: 800, fontSize: '12px', color: '#ffffff' }}>
                                    {user?.admitted_class ? `Grade ${user.admitted_class}` : 'Class'} {section ? `- Section ${section}` : ''}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Register No:</span>
                                <span style={{ fontWeight: 800, fontSize: '12px', color: '#ffffff' }}>
                                    {user?.register_no || '--'}
                                </span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Academic Year:</span>
                                <Tag color="geekblue" style={{ margin: 0, fontWeight: 700, borderRadius: '8px', fontSize: '11px' }}>
                                    {selectedAcademicYear || user?.academic_year || '--'}
                                </Tag>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* 4. QUICK STATS CARDS */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                    Class Section
                                </Text>
                                <div style={{ fontSize: 'clamp(17px, 3.5vw, 22px)', fontWeight: 800, color: '#0f172a', marginTop: '2px', lineHeight: 1.2 }}>
                                    {user?.admitted_class || '-'}{section ? ` / ${section}` : ''}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563eb',
                                    fontSize: '20px',
                                    flexShrink: 0,
                                }}
                            >
                                <ReadOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                    Class Teacher
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(14px, 3vw, 17px)',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                    title={classTeacher?.teacher_name || 'Not Assigned'}
                                >
                                    {classTeacher?.teacher_name || 'Assigned Soon'}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#ecfdf5',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#059669',
                                    fontSize: '20px',
                                    flexShrink: 0,
                                }}
                            >
                                <TeamOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                    Today's Schedule
                                </Text>
                                <div style={{ fontSize: 'clamp(17px, 3.5vw, 22px)', fontWeight: 800, color: '#d97706', marginTop: '2px', lineHeight: 1.2 }}>
                                    {todayPeriods.length} Periods
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#fffbeb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#d97706',
                                    fontSize: '20px',
                                    flexShrink: 0,
                                }}
                            >
                                <ClockCircleOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={12} lg={6}>
                    <Card
                        style={{
                            borderRadius: '18px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600, display: 'block' }}>
                                    Enrolled Subjects
                                </Text>
                                <div style={{ fontSize: 'clamp(17px, 3.5vw, 22px)', fontWeight: 800, color: '#7c3aed', marginTop: '2px', lineHeight: 1.2 }}>
                                    {mappings.length > 0 ? `${mappings.length} Subjects` : 'Active'}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#f5f3ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#7c3aed',
                                    fontSize: '20px',
                                    flexShrink: 0,
                                }}
                            >
                                <BookOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 4.5. ACADEMIC PERFORMANCE & ANALYTICS SECTION (ATTENDANCE, HOMEWORK, HOME TEST, QUIZ) */}
            <div style={{ marginBottom: '28px' }}>
                <Card
                    style={{
                        borderRadius: '24px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 8px 30px rgba(15, 23, 42, 0.04)',
                        background: '#ffffff',
                        overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: 'clamp(18px, 3vw, 28px)' }}
                >
                    {/* Analytics Section Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: isMobile ? 'flex-start' : 'center',
                            justifyContent: 'space-between',
                            flexDirection: isMobile ? 'column' : 'row',
                            gap: '14px',
                            marginBottom: '20px',
                            borderBottom: '1px solid #f1f5f9',
                            paddingBottom: '16px',
                            width: '100%',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                                    flexShrink: 0,
                                }}
                            >
                                <BarChartOutlined />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                                        Academic Performance & Analytics
                                    </Title>
                                    <Tag color="blue" style={{ borderRadius: '8px', fontWeight: 700, fontSize: '11px' }}>
                                        Year: {selectedAcademicYear || 'Current'}
                                    </Tag>
                                </div>
                                <Text type="secondary" style={{ fontSize: '13px' }}>
                                    Track your attendance, homework submissions, home tests, and daily quizzes
                                </Text>
                            </div>
                        </div>

                        {/* Interactive Tab Switcher */}
                        <div
                            style={{
                                width: isMobile ? '100%' : 'auto',
                                maxWidth: '100%',
                                overflowX: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                paddingBottom: '4px',
                                display: 'flex',
                            }}
                        >
                            <Segmented
                                value={analyticsTab}
                                onChange={(val) => setAnalyticsTab(val as any)}
                                options={[
                                    { label: 'All Analytics', value: 'all', icon: <FundOutlined /> },
                                    { label: 'Attendance', value: 'attendance', icon: <CalendarOutlined /> },
                                    { label: 'Homework', value: 'homework', icon: <BookOutlined /> },
                                    { label: 'Home Test', value: 'hometest', icon: <AuditOutlined /> },
                                    { label: 'Quiz (MCQ)', value: 'quiz', icon: <ThunderboltOutlined /> },
                                ]}
                                style={{
                                    background: '#f1f5f9',
                                    padding: '4px',
                                    fontWeight: 600,
                                    borderRadius: '12px',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            />
                        </div>
                    </div>

                    {/* Top KPI Metrics Row */}
                    <Row gutter={[16, 16]} style={{ marginBottom: '22px' }}>
                        {/* 1. Attendance Metric */}
                        <Col xs={12} sm={12} lg={6}>
                            <div
                                style={{
                                    background: '#f0fdf4',
                                    border: '1px solid #bbf7d0',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <Text style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>Attendance Rate</Text>
                                    <CheckCircleOutlined style={{ color: '#16a34a', fontSize: '16px' }} />
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#14532d', lineHeight: 1.1 }}>
                                    {attendanceMetric.attendanceRate}%
                                </div>
                                <Progress
                                    percent={attendanceMetric.attendanceRate}
                                    showInfo={false}
                                    strokeColor="#16a34a"
                                    trailColor="#dcfce7"
                                    size="small"
                                    style={{ margin: '8px 0 6px 0' }}
                                />
                                <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600 }}>
                                    {attendanceMetric.presentDays} Present / {attendanceMetric.totalDays} Total Days
                                </div>
                            </div>
                        </Col>

                        {/* 2. Homework Metric */}
                        <Col xs={12} sm={12} lg={6}>
                            <div
                                style={{
                                    background: '#eff6ff',
                                    border: '1px solid #bfdbfe',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <Text style={{ fontSize: '12px', fontWeight: 700, color: '#1e40af' }}>Homework Done</Text>
                                    <BookOutlined style={{ color: '#2563eb', fontSize: '16px' }} />
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e3a8a', lineHeight: 1.1 }}>
                                    {homeworkMetric.completionRate}%
                                </div>
                                <Progress
                                    percent={homeworkMetric.completionRate}
                                    showInfo={false}
                                    strokeColor="#2563eb"
                                    trailColor="#dbeafe"
                                    size="small"
                                    style={{ margin: '8px 0 6px 0' }}
                                />
                                <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 600 }}>
                                    {homeworkMetric.completed} / {homeworkMetric.totalAssigned} Completed ({homeworkMetric.pending} Pending)
                                </div>
                            </div>
                        </Col>

                        {/* 3. Home Test Metric */}
                        <Col xs={12} sm={12} lg={6}>
                            <div
                                style={{
                                    background: '#faf5ff',
                                    border: '1px solid #e9d5ff',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <Text style={{ fontSize: '12px', fontWeight: 700, color: '#6b21a8' }}>Home Test Average</Text>
                                    <TrophyOutlined style={{ color: '#9333ea', fontSize: '16px' }} />
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#581c87', lineHeight: 1.1 }}>
                                    {homeTestMetric.averageScore}%
                                </div>
                                <Progress
                                    percent={homeTestMetric.averageScore}
                                    showInfo={false}
                                    strokeColor="#9333ea"
                                    trailColor="#f3e8ff"
                                    size="small"
                                    style={{ margin: '8px 0 6px 0' }}
                                />
                                <div style={{ fontSize: '11px', color: '#7e22ce', fontWeight: 600 }}>
                                    {homeTestMetric.completedTests} Tests Scored ({homeTestMetric.totalTests} Assigned)
                                </div>
                            </div>
                        </Col>

                        {/* 4. Quiz Metric */}
                        <Col xs={12} sm={12} lg={6}>
                            <div
                                style={{
                                    background: '#fff7ed',
                                    border: '1px solid #fed7aa',
                                    borderRadius: '16px',
                                    padding: '16px',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <Text style={{ fontSize: '12px', fontWeight: 700, color: '#9a3412' }}>Quiz (MCQ) Score</Text>
                                    <ThunderboltOutlined style={{ color: '#ea580c', fontSize: '16px' }} />
                                </div>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c2d12', lineHeight: 1.1 }}>
                                    {quizMetric.averageScore}%
                                </div>
                                <Progress
                                    percent={quizMetric.averageScore}
                                    showInfo={false}
                                    strokeColor="#ea580c"
                                    trailColor="#ffedd5"
                                    size="small"
                                    style={{ margin: '8px 0 6px 0' }}
                                />
                                <div style={{ fontSize: '11px', color: '#c2410c', fontWeight: 600 }}>
                                    {quizMetric.totalQuizzes} Daily Quizzes Attempted
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* Chart Container / Skeleton */}
                    {analyticsLoading ? (
                        <div style={{ padding: '24px 0' }}>
                            <Skeleton active paragraph={{ rows: 6 }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                            {/* GRAPH SECTION 1: ATTENDANCE */}
                            {(analyticsTab === 'all' || analyticsTab === 'attendance') && (
                                <Row gutter={[20, 20]} align="stretch">
                                    <Col xs={24} lg={10}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                                <PieChartOutlined style={{ color: '#16a34a', fontSize: '18px' }} />
                                                <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                    Attendance Distribution
                                                </span>
                                            </div>

                                            {attendanceMetric.totalDays > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Doughnut
                                                        data={{
                                                            labels: ['Present', 'Absent', 'Half Day'],
                                                            datasets: [
                                                                {
                                                                    data: [
                                                                        attendanceMetric.presentDays,
                                                                        attendanceMetric.absentDays,
                                                                        attendanceMetric.halfDays,
                                                                    ],
                                                                    backgroundColor: ['#10b981', '#f43f5e', '#f59e0b'],
                                                                    borderColor: ['#ffffff', '#ffffff', '#ffffff'],
                                                                    borderWidth: 2,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            cutout: '70%',
                                                            plugins: {
                                                                legend: {
                                                                    position: 'bottom',
                                                                    labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } },
                                                                },
                                                            },
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: '42%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            textAlign: 'center',
                                                            pointerEvents: 'none',
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                                                            {attendanceMetric.attendanceRate}%
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>PRESENT</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>No attendance logged for {selectedAcademicYear}</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>

                                    <Col xs={24} lg={14}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <CalendarOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                        Monthly Attendance Trend
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>Rate per Month (%)</span>
                                            </div>

                                            {attendanceMetric.monthlyTrend.length > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Bar
                                                        data={{
                                                            labels: attendanceMetric.monthlyTrend.map((m) => m.month),
                                                            datasets: [
                                                                {
                                                                    label: 'Attendance %',
                                                                    data: attendanceMetric.monthlyTrend.map((m) => m.rate),
                                                                    backgroundColor: '#3b82f6',
                                                                    borderRadius: 8,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                                                                y: {
                                                                    beginAtZero: true,
                                                                    max: 100,
                                                                    ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
                                                                },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>Monthly breakdown available once records are recorded</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                            )}

                            {/* GRAPH SECTION 2: HOMEWORK */}
                            {(analyticsTab === 'all' || analyticsTab === 'homework') && (
                                <Row gutter={[20, 20]} align="stretch">
                                    <Col xs={24} lg={15}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <BookOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                        Homework Completion by Subject
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>Completed vs Pending</span>
                                            </div>

                                            {homeworkMetric.subjectWise.length > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Bar
                                                        data={{
                                                            labels: homeworkMetric.subjectWise.map((s) => s.subject),
                                                            datasets: [
                                                                {
                                                                    label: 'Completed',
                                                                    data: homeworkMetric.subjectWise.map((s) => s.completed),
                                                                    backgroundColor: '#10b981',
                                                                    borderRadius: 6,
                                                                },
                                                                {
                                                                    label: 'Pending',
                                                                    data: homeworkMetric.subjectWise.map((s) => s.pending),
                                                                    backgroundColor: '#f97316',
                                                                    borderRadius: 6,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: {
                                                                legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                                                            },
                                                            scales: {
                                                                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                                                                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>No homework assigned yet for {selectedAcademicYear}</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>

                                    <Col xs={24} lg={9}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                                <PieChartOutlined style={{ color: '#2563eb', fontSize: '18px' }} />
                                                <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                    Homework Status
                                                </span>
                                            </div>

                                            {homeworkMetric.totalAssigned > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Doughnut
                                                        data={{
                                                            labels: ['Completed', 'Pending'],
                                                            datasets: [
                                                                {
                                                                    data: [homeworkMetric.completed, homeworkMetric.pending],
                                                                    backgroundColor: ['#10b981', '#f97316'],
                                                                    borderColor: ['#ffffff', '#ffffff'],
                                                                    borderWidth: 2,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            cutout: '70%',
                                                            plugins: {
                                                                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11, weight: 'bold' } } },
                                                            },
                                                        }}
                                                    />
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            top: '42%',
                                                            left: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                            textAlign: 'center',
                                                            pointerEvents: 'none',
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>
                                                            {homeworkMetric.completionRate}%
                                                        </div>
                                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>DONE</div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>No homework submissions logged</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                            )}

                            {/* GRAPH SECTION 3: HOME TEST */}
                            {(analyticsTab === 'all' || analyticsTab === 'hometest') && (
                                <Row gutter={[20, 20]} align="stretch">
                                    <Col xs={24} lg={16}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <AuditOutlined style={{ color: '#9333ea', fontSize: '18px' }} />
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                        Home Test Average Marks % by Subject
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>Scored Tests</span>
                                            </div>

                                            {homeTestMetric.subjectWise.length > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Bar
                                                        data={{
                                                            labels: homeTestMetric.subjectWise.map((s) => s.subject),
                                                            datasets: [
                                                                {
                                                                    label: 'Average Score %',
                                                                    data: homeTestMetric.subjectWise.map((s) => s.avgScore),
                                                                    backgroundColor: '#a855f7',
                                                                    borderRadius: 8,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                                                                y: {
                                                                    beginAtZero: true,
                                                                    max: 100,
                                                                    ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
                                                                },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>No home test marks recorded yet for {selectedAcademicYear}</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>

                                    <Col xs={24} lg={8}>
                                        <div
                                            style={{
                                                background: '#faf5ff',
                                                border: '1px solid #e9d5ff',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                                    <TrophyOutlined style={{ color: '#9333ea', fontSize: '18px' }} />
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#581c87' }}>
                                                        Home Test Insights
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: '13px', color: '#6b21a8', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                                                    Review test results and feedback shared by teachers for this academic session.
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                        <span style={{ color: '#7e22ce' }}>Tests Assigned:</span>
                                                        <strong style={{ color: '#581c87' }}>{homeTestMetric.totalTests}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                        <span style={{ color: '#7e22ce' }}>Tests Evaluated:</span>
                                                        <strong style={{ color: '#581c87' }}>{homeTestMetric.completedTests}</strong>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                                        <span style={{ color: '#7e22ce' }}>Class Average:</span>
                                                        <strong style={{ color: '#581c87' }}>{homeTestMetric.averageScore}%</strong>
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                type="primary"
                                                onClick={() => handleNavigate('studenthometest')}
                                                style={{
                                                    background: '#9333ea',
                                                    borderColor: '#9333ea',
                                                    borderRadius: '10px',
                                                    marginTop: '16px',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                Open Home Tests <ArrowRightOutlined />
                                            </Button>
                                        </div>
                                    </Col>
                                </Row>
                            )}

                            {/* GRAPH SECTION 4: QUIZ (DAILY MCQ) */}
                            {(analyticsTab === 'all' || analyticsTab === 'quiz') && (
                                <Row gutter={[20, 20]} align="stretch">
                                    <Col xs={24} lg={14}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ThunderboltOutlined style={{ color: '#ea580c', fontSize: '18px' }} />
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                        Quiz / Daily MCQ Mastery by Subject
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>Accuracy %</span>
                                            </div>

                                            {quizMetric.subjectWise.length > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Bar
                                                        data={{
                                                            labels: quizMetric.subjectWise.map((q) => q.subject),
                                                            datasets: [
                                                                {
                                                                    label: 'Accuracy %',
                                                                    data: quizMetric.subjectWise.map((q) => q.avgPercentage),
                                                                    backgroundColor: '#f97316',
                                                                    borderRadius: 8,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                                                                y: {
                                                                    beginAtZero: true,
                                                                    max: 100,
                                                                    ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
                                                                },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>No quiz attempts recorded yet for {selectedAcademicYear}</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>

                                    <Col xs={24} lg={10}>
                                        <div
                                            style={{
                                                background: '#f8fafc',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '18px',
                                                padding: '20px',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <RiseOutlined style={{ color: '#ea580c', fontSize: '18px' }} />
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                                                        Recent Quiz Trajectory
                                                    </span>
                                                </div>
                                                <Button
                                                    type="link"
                                                    size="small"
                                                    onClick={() => handleNavigate('mcqtestmarkhistory')}
                                                    style={{ padding: 0, fontSize: '12px', fontWeight: 600 }}
                                                >
                                                    History <ArrowRightOutlined />
                                                </Button>
                                            </div>

                                            {quizMetric.recentScores.length > 0 ? (
                                                <div style={{ height: '220px', position: 'relative' }}>
                                                    <Line
                                                        data={{
                                                            labels: quizMetric.recentScores.map((q, idx) => q.subject || `Test ${idx + 1}`),
                                                            datasets: [
                                                                {
                                                                    label: 'Score %',
                                                                    data: quizMetric.recentScores.map((q) => q.percentage),
                                                                    borderColor: '#ea580c',
                                                                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                                                                    tension: 0.35,
                                                                    fill: true,
                                                                    pointBackgroundColor: '#ea580c',
                                                                    pointRadius: 4,
                                                                },
                                                            ],
                                                        }}
                                                        options={{
                                                            responsive: true,
                                                            maintainAspectRatio: false,
                                                            plugins: { legend: { display: false } },
                                                            scales: {
                                                                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                                                y: {
                                                                    beginAtZero: true,
                                                                    max: 100,
                                                                    ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
                                                                },
                                                            },
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <Empty
                                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                    description={<span style={{ color: '#94a3b8', fontSize: '12px' }}>Start a daily MCQ quiz to see score trend</span>}
                                                />
                                            )}
                                        </div>
                                    </Col>
                                </Row>
                            )}
                        </div>
                    )}
                </Card>
            </div>

            {/* 5. QUICK ACTIONS HUB */}
            <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RocketOutlined style={{ fontSize: '18px', color: '#2563eb' }} />
                        <Title level={4} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                            Quick Student Hub
                        </Title>
                    </div>
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                        Direct access to daily learning tools
                    </Text>
                </div>

                <Row gutter={[16, 16]}>
                    {/* Homework */}
                    <Col xs={12} sm={8} lg={4}>
                        <Card
                            hoverable
                            onClick={() => handleNavigate('studentHomework')}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <BookOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Homework</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Assignments</Text>
                        </Card>
                    </Col>

                    {/* Daily MCQ Test */}
                    <Col xs={12} sm={8} lg={4}>
                        <Card
                            hoverable
                            onClick={() => handleNavigate('dailymcqtest')}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#fdf2f8',
                                    color: '#db2777',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <QuestionCircleOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>MCQ Test</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Daily Practice</Text>
                        </Card>
                    </Col>

                    {/* Full Timetable */}
                    <Col xs={12} sm={8} lg={4}>
                        <Card
                            hoverable
                            onClick={() => handleNavigate('studentmytimetable')}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <CalendarOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Timetable</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Weekly Periods</Text>
                        </Card>
                    </Col>

                    {/* Class Notes */}
                    <Col xs={12} sm={8} lg={4}>
                        <Card
                            hoverable
                            onClick={() => handleNavigate('studentclassnotes')}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#fffbeb',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <FileTextOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Class Notes</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Study Materials</Text>
                        </Card>
                    </Col>

                    {/* Chat with Teachers */}
                    <Col xs={12} sm={8} lg={4}>
                        <Card
                            hoverable
                            onClick={() => handleNavigate('studentchat')}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <WechatOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Teacher Chat</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Ask Doubts</Text>
                        </Card>
                    </Col>

                    {/* School Circulars */}
                    <Col xs={12} sm={8} lg={4}>
                        <Card
                            hoverable
                            onClick={() => handleNavigate('studentCircular')}
                            style={{
                                borderRadius: '16px',
                                border: '1px solid #e2e8f0',
                                textAlign: 'center',
                                transition: 'all 0.25s ease',
                                height: '100%',
                            }}
                        >
                            <div
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '14px',
                                    background: '#eff6ff',
                                    color: '#0284c7',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    margin: '0 auto 10px auto',
                                }}
                            >
                                <NotificationOutlined />
                            </div>
                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>Circulars</div>
                            <Text type="secondary" style={{ fontSize: '11px' }}>Announcements</Text>
                        </Card>
                    </Col>
                </Row>
            </div>

            {/* 6. TODAY'S TIMETABLE & FACULTY SECTION */}
            <Row gutter={[24, 24]}>
                {/* Left Column: Today's Period Schedule */}
                <Col xs={24} lg={15}>
                    <Card
                        style={{
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                            height: '100%',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: '#eff6ff',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '18px',
                                    }}
                                >
                                    <ClockCircleOutlined />
                                </div>
                                <div>
                                    <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                                        {isWeekend ? "Next Upcoming Schedule (Monday)" : `Today's Timetable (${dayOfWeek})`}
                                    </Title>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {todayPeriods.length} scheduled periods ({selectedAcademicYear || 'Current Year'})
                                    </Text>
                                </div>
                            </div>

                            <Button
                                type="link"
                                onClick={() => handleNavigate('studentmytimetable')}
                                style={{ padding: 0, fontWeight: 600, fontSize: '13px' }}
                            >
                                View Full Week <ArrowRightOutlined />
                            </Button>
                        </div>

                        {/* Period List */}
                        {isLoading ? (
                            <Skeleton active paragraph={{ rows: 4 }} />
                        ) : todayPeriods.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {todayPeriods.map((entry, idx) => {
                                    const colorTheme = PERIOD_COLORS[idx % PERIOD_COLORS.length];
                                    return (
                                        <div
                                            key={`${entry.day}-${entry.period}-${idx}`}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                borderRadius: '14px',
                                                background: colorTheme.bg,
                                                border: `1px solid ${colorTheme.border}`,
                                                transition: 'all 0.2s ease',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <div
                                                    style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '10px',
                                                        background: colorTheme.badge,
                                                        color: '#ffffff',
                                                        fontWeight: 800,
                                                        fontSize: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                    }}
                                                >
                                                    P{entry.period}
                                                </div>

                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '15px', color: colorTheme.text }}>
                                                        {entry.subject_name}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <UserOutlined style={{ fontSize: '11px' }} /> {entry.teacher_name || 'Faculty'}
                                                    </div>
                                                </div>
                                            </div>

                                            <Tag
                                                color={entry.status === 'Active' ? 'blue' : 'default'}
                                                style={{
                                                    borderRadius: '8px',
                                                    fontWeight: 600,
                                                    fontSize: '11px',
                                                    margin: 0,
                                                }}
                                            >
                                                {entry.status || 'Active'}
                                            </Tag>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={
                                        <div>
                                            <span style={{ fontWeight: 600, color: '#334155', display: 'block' }}>
                                                No periods scheduled for today
                                            </span>
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                                Check the full weekly timetable to view all your class schedules.
                                            </Text>
                                        </div>
                                    }
                                >
                                    <Button
                                        type="primary"
                                        size="small"
                                        onClick={() => handleNavigate('studentmytimetable')}
                                        style={{ borderRadius: '8px', marginTop: '8px' }}
                                    >
                                        Open Timetable
                                    </Button>
                                </Empty>
                            </div>
                        )}
                    </Card>
                </Col>

                {/* Right Column: Faculty & Class Teacher */}
                <Col xs={24} lg={9}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        {/* Class Teacher Spotlight Card */}
                        <Card
                            style={{
                                borderRadius: '20px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                                background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '14px',
                                        background: '#ecfdf5',
                                        border: '2px solid #a7f3d0',
                                        color: '#059669',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '22px',
                                        flexShrink: 0,
                                    }}
                                >
                                    <TeamOutlined />
                                </div>

                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <Tag color="green" style={{ borderRadius: '6px', fontSize: '10px', fontWeight: 700, margin: '0 0 4px 0' }}>
                                        CLASS TEACHER
                                    </Tag>
                                    <div style={{ fontWeight: 800, fontSize: '16px', color: '#0f172a' }}>
                                        {classTeacher?.teacher_name || 'Class Teacher'}
                                    </div>
                                    <Text type="secondary" style={{ fontSize: '12px' }}>
                                        {classTeacher?.subject_name ? `Subject: ${classTeacher.subject_name}` : 'Grade In-Charge'}
                                    </Text>
                                </div>
                            </div>
                        </Card>

                        {/* Subject Teachers Card */}
                        <Card
                            style={{
                                borderRadius: '20px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <Title level={5} style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>
                                    Subject Faculty ({selectedAcademicYear || 'Year'})
                                </Title>
                                <Button
                                    type="link"
                                    onClick={() => handleNavigate('studentmyteachers')}
                                    style={{ padding: 0, fontSize: '12px', fontWeight: 600 }}
                                >
                                    All Teachers <ArrowRightOutlined />
                                </Button>
                            </div>

                            {isLoading ? (
                                <Skeleton active paragraph={{ rows: 3 }} />
                            ) : subjectTeachers.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {subjectTeachers.slice(0, 4).map((teacher) => (
                                        <div
                                            key={teacher.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                borderRadius: '12px',
                                                background: '#f8fafc',
                                                border: '1px solid #f1f5f9',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Avatar
                                                    size={30}
                                                    icon={<UserOutlined />}
                                                    style={{ background: '#3b82f6', fontSize: '12px' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                                                        {teacher.teacher_name}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                                                        {teacher.subject_name}
                                                    </div>
                                                </div>
                                            </div>

                                            <Button
                                                type="text"
                                                size="small"
                                                icon={<WechatOutlined style={{ color: '#2563eb' }} />}
                                                onClick={() => handleNavigate('studentchat')}
                                                style={{ borderRadius: '6px' }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Text type="secondary" style={{ fontSize: '13px' }}>
                                    Subject teachers will appear here once allocated for {selectedAcademicYear}.
                                </Text>
                            )}
                        </Card>
                    </div>
                </Col>
            </Row>

            {/* 7. STUDENT PROFILE ZOOM MODAL */}
            {isProfileModalOpen && (
                <Modal
                    open={isProfileModalOpen}
                    onCancel={() => setIsProfileModalOpen(false)}
                    footer={[
                        <Button key="close" type="primary" onClick={() => setIsProfileModalOpen(false)} style={{ borderRadius: '10px' }}>
                            Close
                        </Button>,
                    ]}
                    centered
                    width={420}
                >
                    <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                            {studentPhoto || user?.photo_url ? (
                                <Image
                                    src={studentPhoto || user?.photo_url}
                                    alt="Student Profile"
                                    fallback="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 24 24' fill='%2394a3b8'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>"
                                    style={{
                                        width: '160px',
                                        height: '160px',
                                        borderRadius: '20px',
                                        objectFit: 'cover',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    }}
                                />
                            ) : (
                                <Avatar
                                    size={120}
                                    icon={<UserOutlined />}
                                    style={{ background: '#3b82f6' }}
                                />
                            )}
                        </div>

                        <Title level={4} style={{ margin: '0 0 4px 0', fontWeight: 800 }}>
                            {user?.full_name || user?.name || 'Student'}
                        </Title>
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                            {user?.email || 'Student Account'}
                        </Text>

                        <div
                            style={{
                                marginTop: '20px',
                                background: '#f8fafc',
                                borderRadius: '14px',
                                padding: '14px',
                                textAlign: 'left',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                border: '1px solid #e2e8f0',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Register Number:</Text>
                                <Text strong style={{ fontSize: '12px' }}>{user?.register_no || '--'}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Class & Section:</Text>
                                <Text strong style={{ fontSize: '12px' }}>
                                    {user?.admitted_class ? `Grade ${user.admitted_class}` : '-'} {section ? `- Section ${section}` : ''}
                                </Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Academic Year:</Text>
                                <Tag color="blue" style={{ margin: 0, borderRadius: '6px' }}>{selectedAcademicYear || '--'}</Tag>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text type="secondary" style={{ fontSize: '12px' }}>Organization:</Text>
                                <Text strong style={{ fontSize: '12px' }}>{displaySchoolName}</Text>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default StudentDashboard;
