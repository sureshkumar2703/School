import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Spin,
    Alert,
    Button,
    Empty,
    Row,
    Col,
    Space,
    Modal,
    message,
    Divider,
    Form,
    Radio,
    Tag,
    Badge,
    Input,
    Select,
    Segmented,
    Grid,
    Progress,
    Tooltip,
} from 'antd';
import {
    BookOutlined,
    RightOutlined,
    ClockCircleOutlined,
    CheckCircleFilled,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TrophyOutlined,
    ThunderboltOutlined,
    SearchOutlined,
    ReloadOutlined,
    TeamOutlined,
    MessageOutlined,
    HistoryOutlined,
    StarFilled,
    FireOutlined,
    FieldTimeOutlined,
    TagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { supabase } from '../../service/supabaseClient';
import type { OneMarkQuestionItem } from '../../store/features/one-mark-questions/oneMarkQuestionsSlice';
import { saveMcqTestDataRequest, type StudentResult } from '../../store/features/daily-mcq-test/mcqTestDataSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';

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

const DailyMCQTest: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.studentDashboard);
    const { subjects, loading: subjectsLoading, error: subjectsError } = useSelector((state: RootState) => state.subjects);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section and Class allocated for selected academic year
    const [studentClass, setStudentClass] = useState<string | null>(null);
    const [section, setSection] = useState<string | null>(null);
    const [rollNo, setRollNo] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    // Filter & Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

    // Test execution state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedSubjectInfo, setSelectedSubjectInfo] = useState<{
        subjectName: string;
        subjectCode: string;
        staffCode: string;
    } | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [questions, setQuestions] = useState<OneMarkQuestionItem[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [form] = Form.useForm();
    const [subjectsTakenToday, setSubjectsTakenToday] = useState<string[]>([]);
    const submissionRef = useRef(false);

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
                let foundRollNo: string | null = null;

                if (user?.register_no) {
                    const { data, error: allocError } = await supabase
                        .from('class_section_allocations')
                        .select('class_name, section_name, roll_no')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', selectedAcademicYear)
                        .maybeSingle();

                    if (!allocError && data) {
                        foundClass = data.class_name;
                        foundSection = data.section_name;
                        foundRollNo = data.roll_no;
                    }
                }

                if (!foundClass && user?.admitted_class) {
                    foundClass = user.admitted_class;
                }

                if (isMounted) {
                    setStudentClass(foundClass);
                    setSection(foundSection);
                    setRollNo(foundRollNo || user?.roll_no || null);
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
    }, [user?.organization_key, user?.register_no, user?.admitted_class, user?.roll_no, selectedAcademicYear]);

    // 3. Fetch tests taken today
    useEffect(() => {
        if (!user?.id || !user?.organization_key) return;

        let isMounted = true;
        const fetchTestsTakenToday = async () => {
            try {
                const today = dayjs().format('YYYY-MM-DD');
                const { data, error } = await supabase
                    .from('mcqtestdata')
                    .select('subject, student_results, test_date')
                    .eq('organization_key', user.organization_key)
                    .eq('test_date', today);

                if (error) {
                    console.error("Error fetching today's tests:", error);
                    return;
                }

                if (isMounted && data) {
                    const studentHasTaken: string[] = [];
                    data.forEach((session: any) => {
                        if (Array.isArray(session.student_results)) {
                            const hasStudent = session.student_results.some(
                                (res: any) =>
                                    (res.student_id && res.student_id === user.id) ||
                                    (user.register_no && res.register_no === user.register_no) ||
                                    (user.roll_no && res.roll_no === user.roll_no)
                            );
                            if (hasStudent && session.subject) {
                                studentHasTaken.push(session.subject);
                            }
                        }
                    });
                    setSubjectsTakenToday(studentHasTaken);
                }
            } catch (err) {
                console.error("Error processing today's test records:", err);
            }
        };

        fetchTestsTakenToday();
        return () => {
            isMounted = false;
        };
    }, [user?.id, user?.register_no, user?.roll_no, user?.organization_key, isModalVisible]);

    // 4. Fetch dashboard mappings and subjects
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
            dispatch(fetchSubjectsRequest());
        }
    }, [dispatch, user?.organization_key, studentClass, user?.admitted_class, section, selectedAcademicYear]);

    // Check if the selected academic year is the current/active year
    const isCurrentYear = useMemo(() => {
        if (!selectedAcademicYear) return true;
        const selectedOpt = academicYears.find((y) => y.value === selectedAcademicYear);
        if (selectedOpt) {
            return selectedOpt.isCurrent === true || selectedOpt.status === 'Active';
        }
        return user?.academic_year ? selectedAcademicYear === user.academic_year : true;
    }, [academicYears, selectedAcademicYear, user?.academic_year]);

    const effectiveClass = studentClass || user?.admitted_class;
    const isLoading = loadingAcademicYears || loadingSection || mappingsLoading || subjectsLoading;
    const error = mappingsError || subjectsError;

    // Subjects for student's class
    const subjectsForClass = useMemo(() => {
        if (!mappings || mappings.length === 0) return [];
        const subjectNames = [...new Set(mappings.map((m) => m.subject_name))];
        return subjects.filter((s) => subjectNames.includes(s.subject_name));
    }, [mappings, subjects]);

    // Filtered subjects list
    const filteredSubjects = useMemo(() => {
        return subjectsForClass.filter((subject) => {
            const hasTaken = subjectsTakenToday.includes(subject.subject_name);

            if (statusFilter === 'completed' && !hasTaken) return false;
            if (statusFilter === 'pending' && hasTaken) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = subject.subject_name.toLowerCase().includes(q);
                const matchCode = (subject.subject_code || '').toLowerCase().includes(q);
                if (!matchName && !matchCode) return false;
            }

            return true;
        });
    }, [subjectsForClass, subjectsTakenToday, statusFilter, searchQuery]);

    // Statistics
    const stats = useMemo(() => {
        const total = subjectsForClass.length;
        const completed = subjectsForClass.filter((s) => subjectsTakenToday.includes(s.subject_name)).length;
        const pending = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
            total,
            completed,
            pending,
            completionRate,
        };
    }, [subjectsForClass, subjectsTakenToday]);

    // Format seconds into MM:SS
    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60)
            .toString()
            .padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    // Auto-submission when closing modal or window unloads
    const handleAutoSubmission = () => {
        if (!user || !section || !selectedSubjectInfo || submissionRef.current) {
            return;
        }

        submissionRef.current = true;
        const score = questions.reduce((acc, q) => acc + (answers[q.id!] === q.answer ? 1 : 0), 0);

        const studentResult: StudentResult = {
            student_id: user.id,
            student_name: user.full_name,
            roll_no: rollNo || undefined,
            register_no: user.register_no || undefined,
            time_taken: formatTime(elapsedTime),
            score: score,
            total_questions: questions.length,
            results: questions.map((q) => ({
                question_id: q.id,
                question_text: q.questions,
                selected_answer: answers[q.id!] || 'Not Answered',
                correct_answer: q.answer,
            })),
        };

        const sessionData = {
            organization_key: user.organization_key!,
            academic_year: selectedAcademicYear || user.academic_year!,
            class_name: effectiveClass || user.admitted_class!,
            section_name: section!,
            subject: selectedSubjectInfo.subjectName,
            subject_code: selectedSubjectInfo.subjectCode,
            staff_code: selectedSubjectInfo.staffCode,
            test_date: dayjs().format('YYYY-MM-DD'),
        };

        dispatch(saveMcqTestDataRequest({ sessionData, studentResult }));
        if (selectedSubjectInfo) {
            setSubjectsTakenToday((prev) => [...new Set([...prev, selectedSubjectInfo.subjectName])]);
        }
        message.warning('Test was closed early and has been automatically saved.');
    };

    // Live timer
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isModalVisible) {
            submissionRef.current = false;
            setElapsedTime(0);
            timer = setInterval(() => {
                setElapsedTime((prevTime) => prevTime + 1);
            }, 1000);
        }
        return () => {
            clearInterval(timer);
        };
    }, [isModalVisible]);

    // Before unload listener
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isModalVisible && !submissionRef.current) {
                handleAutoSubmission();
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isModalVisible, selectedSubjectInfo, answers, questions]);

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }));
    };

    const handleSubmission = () => {
        setIsSubmitted(true);
        message.info('Your test has been evaluated. Review your answers and click Confirm & Save below.');
    };

    const handleConfirmAndSave = () => {
        if (!user || !section || !selectedSubjectInfo) {
            message.error('Missing necessary data to save results.');
            return;
        }

        submissionRef.current = true;
        const score = questions.reduce((acc, q) => acc + (answers[q.id!] === q.answer ? 1 : 0), 0);

        const studentResult: StudentResult = {
            student_id: user.id,
            student_name: user.full_name,
            roll_no: rollNo || undefined,
            register_no: user.register_no || undefined,
            time_taken: formatTime(elapsedTime),
            score: score,
            total_questions: questions.length,
            results: questions.map((q) => ({
                question_id: q.id,
                question_text: q.questions,
                selected_answer: answers[q.id!] || 'Not Answered',
                correct_answer: q.answer,
            })),
        };

        const sessionData = {
            organization_key: user.organization_key!,
            academic_year: selectedAcademicYear || user.academic_year!,
            class_name: effectiveClass || user.admitted_class!,
            section_name: section!,
            subject: selectedSubjectInfo.subjectName,
            subject_code: selectedSubjectInfo.subjectCode,
            staff_code: selectedSubjectInfo.staffCode,
            test_date: dayjs().format('YYYY-MM-DD'),
        };

        dispatch(saveMcqTestDataRequest({ sessionData, studentResult }));
        setSubjectsTakenToday((prev) => [...new Set([...prev, selectedSubjectInfo.subjectName])]);
        handleModalClose();
    };

    const handleAttendTest = async (subjectName: string, subjectCode: string) => {
        if (!isCurrentYear) {
            message.warning(`Quizzes cannot be attempted for past academic session ${selectedAcademicYear}. Data is view-only.`);
            return;
        }

        if (subjectsTakenToday.includes(subjectName)) {
            message.info(`You have already completed the daily quiz for ${subjectName} today.`);
            return;
        }

        if (!user || !section || !selectedAcademicYear || !effectiveClass) {
            message.error('Class allocation details are not available.');
            return;
        }

        setModalLoading(true);
        setQuestions([]);
        setAnswers({});
        setIsSubmitted(false);

        try {
            const subjectMapping = mappings.find((m) => m.subject_name === subjectName);
            if (!subjectMapping || !subjectMapping.teacher_name) {
                throw new Error(`No teacher assigned for ${subjectName}.`);
            }

            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('staff_code')
                .eq('full_name', subjectMapping.teacher_name)
                .eq('organization_key', user.organization_key)
                .single();

            if (teacherError || !teacherData) {
                throw new Error(`Could not find faculty details for: ${subjectMapping.teacher_name}.`);
            }

            const staffCode = teacherData.staff_code;

            const { data: questionBatch, error: batchError } = await supabase
                .from('one_questions')
                .select('questions')
                .eq('organization_key', user.organization_key)
                .eq('staff_code', staffCode)
                .eq('academic_year', selectedAcademicYear)
                .eq('class', effectiveClass)
                .eq('section', section)
                .eq('subject', subjectName)
                .eq('title', 'Choose the correct answer')
                .single();

            if (batchError && batchError.code !== 'PGRST116') throw batchError;

            if (!questionBatch || !questionBatch.questions || questionBatch.questions.length === 0) {
                message.warning('No MCQ practice questions are currently uploaded for this subject.');
            } else {
                const shuffled = [...questionBatch.questions].sort(() => 0.5 - Math.random());
                const selectedQuestions = shuffled.slice(0, 5); // Take 5 questions
                setQuestions(selectedQuestions);
                setSelectedSubjectInfo({ subjectName, subjectCode, staffCode });
                setIsModalVisible(true);
            }
        } catch (err: any) {
            message.error(err.message);
            console.error('Error fetching questions:', err);
        } finally {
            setModalLoading(false);
        }
    };

    const handleModalClose = () => {
        if (isModalVisible && !submissionRef.current && questions.length > 0) {
            handleAutoSubmission();
        }
        setIsModalVisible(false);
        setSelectedSubjectInfo(null);
        setIsSubmitted(false);
        setAnswers({});
        form.resetFields();
    };

    // Option radio style helper
    const getOptionCardStyle = (question: OneMarkQuestionItem, opt: string) => {
        const isSelected = answers[question.id!] === opt;

        if (!isSubmitted) {
            return {
                padding: '12px 14px',
                borderRadius: '10px',
                border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                background: isSelected ? '#eff6ff' : '#ffffff',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            };
        }

        const isCorrect = opt === question.answer;
        const isWrongChosen = isSelected && !isCorrect;

        if (isCorrect) {
            return {
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #10b981',
                background: '#ecfdf5',
                color: '#065f46',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            };
        }
        if (isWrongChosen) {
            return {
                padding: '12px 14px',
                borderRadius: '10px',
                border: '1.5px solid #ef4444',
                background: '#fef2f2',
                color: '#991b1b',
                textDecoration: 'line-through',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
            };
        }

        return {
            padding: '12px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            background: '#ffffff',
            opacity: 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        };
    };

    // Navigation handlers
    const handleGoToChat = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    const handleGoToTeachers = () => {
        dispatch(setCurrentPage('studentmyteachers'));
    };

    const handleGoToHistory = () => {
        dispatch(setCurrentPage('mcqtesthistory'));
    };

    const currentScore = useMemo(() => {
        return questions.reduce((acc, q) => acc + (answers[q.id!] === q.answer ? 1 : 0), 0);
    }, [questions, answers]);

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
                    Loading daily practice subjects and quiz data...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Daily Quiz"
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
            {/* 1. HERO BANNER WITH DYNAMIC ACADEMIC YEAR SELECTOR */}
            <div
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
                                <ThunderboltOutlined /> Daily Rapid MCQ Practice
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
                            Daily MCQ Quiz & Practice 🎯
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
                                    <Spin size="small" /> Loading quiz data for {selectedAcademicYear}...
                                </span>
                            ) : section ? (
                                <>
                                    Sharpen your conceptual understanding with 5 daily rapid-fire questions for{' '}
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

                    {/* Class Details & Today's Goal Progress */}
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
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Today's Target:</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#fef08a' }}>
                                    {stats.completionRate}% Done ({stats.completed}/{stats.total} Subjects)
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
            <Row gutter={[12, 12]} style={{ marginBottom: '20px' }}>
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
                                    Total Subjects
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
                                    Completed Today
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '22px',
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
                                    Pending Today
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '18px' : '22px',
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
                                <FireOutlined />
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
                                    Streak / Status
                                </Text>
                                <div
                                    style={{
                                        fontSize: isMobile ? '15px' : '18px',
                                        fontWeight: 800,
                                        color: '#5b21b6',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.completionRate === 100 ? 'All Done 🏆' : `${stats.pending} Left ⚡`}
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
                                <TrophyOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CONTROL BAR: SEARCH, STATUS & SCORE HISTORY SHORTCUT */}
            <Card
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
                    <Col xs={24} md={10} lg={9}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search by subject name or code..."
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

                    <Col xs={24} md={14} lg={15}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'space-between' : 'flex-end',
                                gap: '10px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Select
                                value={statusFilter}
                                onChange={(val) => setStatusFilter(val)}
                                style={{ minWidth: isMobile ? '48%' : '170px' }}
                                options={[
                                    { value: 'all', label: `All Subjects (${subjectsForClass.length})` },
                                    { value: 'pending', label: `Pending Today (${stats.pending})` },
                                    { value: 'completed', label: `Completed (${stats.completed})` },
                                ]}
                            />

                            <Button
                                icon={<HistoryOutlined />}
                                onClick={handleGoToHistory}
                                style={{
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    borderColor: '#cbd5e1',
                                    width: isMobile ? '48%' : 'auto',
                                }}
                            >
                                Mark History
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* 3.5 HISTORICAL SESSION NOTICE BANNER */}
            {!isCurrentYear && (
                <Alert
                    message="Archived Academic Session — View Only Mode"
                    description={`You are viewing curriculum subjects for academic session ${selectedAcademicYear}. Daily quizzes can only be attempted in the active academic session (${academicYears.find((y) => y.isCurrent)?.value || 'Current Session'}). In this session, quiz attempts are closed.`}
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

            {/* 4. SUBJECT QUIZ CARDS GRID */}
            <Spin spinning={isLoading}>
                {filteredSubjects.length > 0 ? (
                    <Row gutter={[16, 16]}>
                        {filteredSubjects.map((subject) => {
                            const hasTakenTestToday = subjectsTakenToday.includes(subject.subject_name);
                            const palette = getSubjectPalette(subject.subject_name);
                            const isAttemptable = isCurrentYear && !hasTakenTestToday;

                            const ribbonText = !isCurrentYear
                                ? 'Archived (View Only)'
                                : hasTakenTestToday
                                ? 'Done Today ✓'
                                : 'Ready to Attempt';

                            const ribbonColor = !isCurrentYear
                                ? '#64748b'
                                : hasTakenTestToday
                                ? '#10b981'
                                : '#2563eb';

                            return (
                                <Col xs={24} sm={12} lg={8} key={subject.id}>
                                    <Badge.Ribbon
                                        text={ribbonText}
                                        color={ribbonColor}
                                        style={{ fontWeight: 700 }}
                                    >
                                        <Card
                                            hoverable={isAttemptable}
                                            style={{
                                                borderRadius: '18px',
                                                border: !isCurrentYear
                                                    ? '1px solid #cbd5e1'
                                                    : hasTakenTestToday
                                                    ? '1px solid #bbf7d0'
                                                    : `1px solid ${palette.border}`,
                                                background: !isCurrentYear
                                                    ? '#f8fafc'
                                                    : hasTakenTestToday
                                                    ? '#f0fdf4'
                                                    : palette.bg,
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                                transition: 'all 0.25s ease',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                opacity: !isCurrentYear ? 0.88 : 1,
                                            }}
                                            bodyStyle={{
                                                padding: isMobile ? '18px 16px' : '22px 20px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                                                <div
                                                    style={{
                                                        width: isMobile ? '46px' : '52px',
                                                        height: isMobile ? '46px' : '52px',
                                                        borderRadius: '14px',
                                                        background: !isCurrentYear
                                                            ? '#94a3b8'
                                                            : hasTakenTestToday
                                                            ? '#10b981'
                                                            : palette.badge,
                                                        color: '#ffffff',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: isMobile ? '20px' : '22px',
                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {hasTakenTestToday ? <CheckCircleFilled /> : <BookOutlined />}
                                                </div>

                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <Title
                                                        level={4}
                                                        ellipsis={{ tooltip: subject.subject_name }}
                                                        style={{
                                                            margin: 0,
                                                            color: '#0f172a',
                                                            fontWeight: 800,
                                                            fontSize: isMobile ? '16px' : '18px',
                                                        }}
                                                    >
                                                        {subject.subject_name}
                                                    </Title>
                                                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                                        Subject Code: {subject.subject_code}
                                                    </span>
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.75)',
                                                    borderRadius: '12px',
                                                    padding: '10px 14px',
                                                    marginBottom: '18px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <ThunderboltOutlined style={{ color: '#d97706' }} />
                                                    <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                                                        5 Rapid Questions
                                                    </span>
                                                </div>
                                                <Tag
                                                    color={!isCurrentYear ? 'default' : hasTakenTestToday ? 'success' : 'processing'}
                                                    style={{ margin: 0, borderRadius: '6px', fontWeight: 700 }}
                                                >
                                                    {!isCurrentYear
                                                        ? 'Session Archived'
                                                        : hasTakenTestToday
                                                        ? 'Attended Today'
                                                        : 'Available'}
                                                </Tag>
                                            </div>

                                            <div style={{ marginTop: 'auto' }}>
                                                {!isCurrentYear ? (
                                                    <Button
                                                        block
                                                        disabled
                                                        style={{
                                                            borderRadius: '10px',
                                                            fontWeight: 700,
                                                            background: '#e2e8f0',
                                                            borderColor: '#cbd5e1',
                                                            color: '#64748b',
                                                        }}
                                                    >
                                                        Attempt Closed (Past Session)
                                                    </Button>
                                                ) : hasTakenTestToday ? (
                                                    <Button
                                                        block
                                                        icon={<CheckCircleFilled style={{ color: '#10b981' }} />}
                                                        disabled
                                                        style={{
                                                            borderRadius: '10px',
                                                            fontWeight: 700,
                                                            background: '#e2e8f0',
                                                            borderColor: '#cbd5e1',
                                                            color: '#334155',
                                                        }}
                                                    >
                                                        Attended for Today
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        block
                                                        type="primary"
                                                        icon={<RightOutlined />}
                                                        loading={modalLoading && selectedSubjectInfo?.subjectName === subject.subject_name}
                                                        onClick={() => handleAttendTest(subject.subject_name, subject.subject_code)}
                                                        style={{
                                                            borderRadius: '10px',
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                            border: 'none',
                                                            fontWeight: 700,
                                                        }}
                                                    >
                                                        Attend Daily Quiz
                                                    </Button>
                                                )}
                                            </div>
                                        </Card>
                                    </Badge.Ribbon>
                                </Col>
                            );
                        })}
                    </Row>
                ) : (
                    <Card style={{ borderRadius: '20px', padding: '40px', textAlign: 'center' }}>
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                                        No Subjects Found
                                    </h3>
                                    <p style={{ color: '#64748b', fontSize: '13px' }}>
                                        {statusFilter !== 'all' || searchQuery
                                            ? 'No subjects match your current search or filter.'
                                            : 'No subjects are currently assigned to your class section.'}
                                    </p>
                                </div>
                            }
                        >
                            {(statusFilter !== 'all' || searchQuery) && (
                                <Button
                                    type="primary"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('all');
                                    }}
                                    style={{ borderRadius: '8px', fontWeight: 600 }}
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </Empty>
                    </Card>
                )}
            </Spin>

            {/* 5. HELPER ACTION FOOTER - FULLY RESPONSIVE */}
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
                        Daily MCQ practice refreshes every morning. Review previous scores in MCQ Mark History.
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
                        icon={<HistoryOutlined />}
                        onClick={handleGoToHistory}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        MCQ Mark History
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

            {/* 6. INTERACTIVE QUIZ MODAL - FULLY RESPONSIVE */}
            <Modal
                title={null}
                open={isModalVisible}
                onCancel={handleModalClose}
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
                        <Button key="back" block={isMobile} onClick={handleModalClose} style={{ borderRadius: '8px' }}>
                            {isSubmitted ? 'Close' : 'Cancel & Exit'}
                        </Button>
                        <Button
                            key="submit"
                            block={isMobile}
                            type="primary"
                            onClick={isSubmitted ? handleConfirmAndSave : handleSubmission}
                            disabled={!isSubmitted && Object.keys(answers).length !== questions.length}
                            style={{
                                borderRadius: '8px',
                                background: isSubmitted ? '#10b981' : '#2563eb',
                                borderColor: isSubmitted ? '#10b981' : '#2563eb',
                                fontWeight: 700,
                            }}
                        >
                            {isSubmitted
                                ? 'Confirm & Save Results ✓'
                                : `Submit Answers (${Object.keys(answers).length}/${questions.length})`}
                        </Button>
                    </div>
                }
                width={isMobile ? '96vw' : 780}
                style={{ top: isMobile ? 10 : 25, maxWidth: '100vw' }}
                styles={{
                    body: {
                        padding: isMobile ? '16px 12px' : '20px 24px',
                    },
                }}
            >
                {/* Quiz Header Bar */}
                <div
                    style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: isMobile ? '12px 14px' : '14px 18px',
                        marginBottom: '16px',
                    }}
                >
                    <Row justify="space-between" align="middle" gutter={[8, 8]}>
                        <Col xs={24} sm={16}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <Tag color="blue" style={{ fontWeight: 800, borderRadius: '6px' }}>
                                    {selectedSubjectInfo?.subjectCode}
                                </Tag>
                                <span style={{ fontWeight: 800, fontSize: isMobile ? '16px' : '18px', color: '#0f172a' }}>
                                    {selectedSubjectInfo?.subjectName}
                                </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                Class: Grade {effectiveClass} - Section {section} | {dayjs().format('dddd, MMMM D, YYYY')}
                            </div>
                        </Col>

                        <Col xs={24} sm={8} style={{ textAlign: isMobile ? 'left' : 'right' }}>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#eff6ff',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    border: '1px solid #bfdbfe',
                                }}
                            >
                                <ClockCircleOutlined style={{ color: '#2563eb', fontSize: '13px' }} />
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#1e40af' }}>
                                    {formatTime(elapsedTime)}
                                </span>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Score Banner when Evaluated */}
                {isSubmitted && (
                    <div
                        style={{
                            background:
                                currentScore >= 4
                                    ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                                    : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                            border: currentScore >= 4 ? '1px solid #86efac' : '1px solid #bfdbfe',
                            borderRadius: '14px',
                            padding: '14px 18px',
                            marginBottom: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                        }}
                    >
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrophyOutlined style={{ color: '#f59e0b', fontSize: '18px' }} />
                                <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                                    Score: {currentScore} / {questions.length} ({Math.round((currentScore / questions.length) * 100)}%)
                                </strong>
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                Time taken: {formatTime(elapsedTime)}. Please click Confirm & Save to register your marks.
                            </div>
                        </div>

                        <Tag color={currentScore >= 4 ? 'success' : 'processing'} style={{ fontWeight: 800, borderRadius: '6px' }}>
                            {currentScore === 5 ? 'Perfect 100%' : currentScore >= 3 ? 'Passed' : 'Needs Practice'}
                        </Tag>
                    </div>
                )}

                {/* Questions List */}
                <Spin spinning={modalLoading}>
                    {questions.length > 0 ? (
                        <Form
                            form={form}
                            onFinish={handleSubmission}
                            style={{
                                maxHeight: isMobile ? '55vh' : '60vh',
                                overflowY: 'auto',
                                padding: '2px 4px',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                {questions.map((question, index) => {
                                    const selectedOpt = answers[question.id!];
                                    const isCorrect = isSubmitted && selectedOpt === question.answer;
                                    const isWrong = isSubmitted && selectedOpt && selectedOpt !== question.answer;

                                    return (
                                        <Card
                                            key={question.id || index}
                                            style={{
                                                borderRadius: '14px',
                                                border: isSubmitted
                                                    ? isCorrect
                                                        ? '1.5px solid #86efac'
                                                        : isWrong
                                                        ? '1.5px solid #fca5a5'
                                                        : '1px solid #e2e8f0'
                                                    : '1px solid #e2e8f0',
                                                background: '#ffffff',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                                            }}
                                            bodyStyle={{ padding: isMobile ? '14px' : '18px' }}
                                        >
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '14px' }}>
                                                <span
                                                    style={{
                                                        background: '#2563eb',
                                                        color: '#ffffff',
                                                        borderRadius: '50%',
                                                        width: '24px',
                                                        height: '24px',
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
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: isMobile ? '13.5px' : '15px', fontWeight: 700, color: '#0f172a', lineHeight: 1.45 }}>
                                                        {question.questions}
                                                    </div>
                                                </div>
                                            </div>

                                            <Radio.Group
                                                onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                                                value={answers[question.id!]}
                                                style={{ width: '100%' }}
                                                disabled={isSubmitted}
                                            >
                                                <Row gutter={[10, 10]}>
                                                    {[question.option1, question.option2, question.option3, question.option4]
                                                        .filter(Boolean)
                                                        .map((opt, optIdx) => (
                                                            <Col xs={24} sm={12} key={optIdx}>
                                                                <div
                                                                    onClick={() => {
                                                                        if (!isSubmitted) {
                                                                            handleAnswerChange(question.id!, opt!);
                                                                        }
                                                                    }}
                                                                    style={getOptionCardStyle(question, opt!)}
                                                                >
                                                                    <Radio value={opt!} style={{ marginRight: '4px' }} />
                                                                    <span style={{ fontSize: '13px', lineHeight: 1.4 }}>{opt}</span>
                                                                </div>
                                                            </Col>
                                                        ))}
                                                </Row>
                                            </Radio.Group>
                                        </Card>
                                    );
                                })}
                            </div>
                        </Form>
                    ) : (
                        !modalLoading && (
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description="No questions found for this test."
                                style={{ padding: '24px 0' }}
                            />
                        )
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default DailyMCQTest;
