/**
 * Teacher Exam Question Paper Templates & Timetable Explorer
 * Sri Gayathri SMS Portal
 */
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Spin,
    Alert,
    Row,
    Col,
    Select,
    Button,
    Empty,
    Modal,
    Space,
    Tag,
    Descriptions,
    List,
    message,
    Input,
    Tooltip,
    Badge,
    Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    CalendarOutlined,
    ReadOutlined,
    EyeOutlined,
    PrinterOutlined,
    ArrowLeftOutlined,
    IdcardOutlined,
    ReloadOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    BookOutlined,
    FolderOpenOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    FileTextOutlined,
    FormOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchAllQuestionPapersRequest,
    type QuestionPaper,
} from '../../store/features/question-paper-list/questionPaperListSlice';
import {
    fetchExamTimetablesRequest,
    type ExamTimetable,
    type ExamDay,
} from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

const { Option } = Select;

// Type for the second modal's data
interface ClassTimetableInfo {
    class_name: string;
    section_name: string;
    exam_title: string;
    total_mark: number;
    exam_time: string;
    subjectCount?: number;
}

// Type for the schedule modal's data
interface ScheduleDetail {
    timetable: ExamTimetable;
}

const ExamQuestionPaperTemplates: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();

    // Redux store state
    const { user } = useSelector((state: RootState) => state.auth);
    const { papers, loading: papersLoading, error: papersError } = useSelector(
        (state: RootState) => state.questionPaperList
    );
    const { timetables, loading: timetablesLoading, error: timetablesError } = useSelector(
        (state: RootState) => state.examTimetableAdmin
    );
    const { calendars, mappings, loading: teacherDataLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );

    // Filters and view modes
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Modals state
    const [isClassModalVisible, setIsClassModalVisible] = useState(false);
    const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
    const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);

    const [modalData, setModalData] = useState<{
        academicYear: string;
        examTitle: string;
        classTimetables: ClassTimetableInfo[];
    } | null>(null);
    const [modalClassSearch, setModalClassSearch] = useState<string>('');
    const [scheduleData, setScheduleData] = useState<ScheduleDetail | null>(null);
    const [paperData, setPaperData] = useState<QuestionPaper | null>(null);

    // Printing reference
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });

    // Initial Data Fetching
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAllQuestionPapersRequest(user.organization_key));
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Set default academic year
    useEffect(() => {
        if (calendars.length > 0 && !selectedYear) {
            const currentYear = (
                calendars as { academic_year: string; is_current: boolean }[]
            ).find(c => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedYear(currentYear);
            } else {
                setSelectedYear((calendars[0] as any)?.academic_year || null);
            }
        }
    }, [calendars, selectedYear]);

    // Active Academic Years
    const academicYearOptions = useMemo(() => {
        return (
            calendars as {
                academic_year: string;
                status: string;
                id: string;
                is_current: boolean;
            }[]
        ).filter(c => c.status === 'Active');
    }, [calendars]);

    // Distinct exam titles for the selected academic year
    const examsByYear = useMemo(() => {
        if (!selectedYear) return [];
        const examsForYear = timetables.filter(t => t.academic_year === selectedYear);
        const uniqueTitles = [...new Set(examsForYear.map(t => t.exam_title))];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            return uniqueTitles.filter(title => {
                const titleMatch = title.toLowerCase().includes(q);
                const hasMatchingClass = examsForYear.some(
                    t =>
                        t.exam_title === title &&
                        (`class ${t.class_name} - ${t.section_name}`.toLowerCase().includes(q) ||
                            (t.exam_days || []).some(d => d.subject.toLowerCase().includes(q)))
                );
                return titleMatch || hasMatchingClass;
            });
        }

        return uniqueTitles;
    }, [timetables, selectedYear, searchQuery]);

    // Teacher's assigned subjects for this academic year
    const mySubjects = useMemo(() => {
        if (!mappings || !user?.full_name || !selectedYear) return new Set<string>();
        const subjects = mappings
            .filter(m => m.teacher_name === user.full_name && m.academic_year === selectedYear)
            .map(m => m.subject_name);
        return new Set<string>(subjects);
    }, [mappings, user, selectedYear]);

    // Overview KPIs
    const metrics = useMemo(() => {
        const timetablesInYear = timetables.filter(t => !selectedYear || t.academic_year === selectedYear);
        const totalExams = new Set(timetablesInYear.map(t => t.exam_title)).size;
        const totalClasses = new Set(timetablesInYear.map(t => `${t.class_name}-${t.section_name}`)).size;

        const myPapersInYear = papers.filter(
            p =>
                (!selectedYear || p.academic_year === selectedYear) &&
                p.subject &&
                mySubjects.has(p.subject)
        );
        const confirmedPapers = myPapersInYear.filter(p => p.status === 'Confirm').length;

        return {
            totalExams,
            totalClasses,
            mySubjectPapers: myPapersInYear.length,
            confirmedPapers,
        };
    }, [timetables, papers, selectedYear, mySubjects]);

    // Flattened table list for Table View
    const flattenedTimetablesList = useMemo(() => {
        if (!selectedYear) return [];
        let list = timetables.filter(t => t.academic_year === selectedYear);

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(t => {
                const titleMatch = (t.exam_title || '').toLowerCase().includes(q);
                const classMatch = `class ${t.class_name} - ${t.section_name}`.toLowerCase().includes(q);
                const subjectMatch = (t.exam_days || []).some(d => (d.subject || '').toLowerCase().includes(q));
                return titleMatch || classMatch || subjectMatch;
            });
        }

        return list;
    }, [timetables, selectedYear, searchQuery]);

    // Modal Handlers
    const handleViewTimetables = (academicYear: string, examTitle: string) => {
        const filteredTimetables = timetables
            .filter(t => t.academic_year === academicYear && t.exam_title === examTitle)
            .map(t => ({
                class_name: t.class_name,
                section_name: t.section_name,
                exam_title: t.exam_title,
                total_mark: t.exam_total_mark,
                exam_time: t.exam_time,
                subjectCount: t.exam_days?.length || 0,
            }));

        setModalData({ academicYear, examTitle, classTimetables: filteredTimetables });
        setModalClassSearch('');
        setIsClassModalVisible(true);
    };

    const handleViewSchedule = (classInfo: ClassTimetableInfo) => {
        const fullTimetable = timetables.find(
            t =>
                t.academic_year === (modalData?.academicYear || selectedYear) &&
                t.exam_title === classInfo.exam_title &&
                t.class_name === classInfo.class_name &&
                t.section_name === classInfo.section_name
        );

        if (fullTimetable) {
            setScheduleData({ timetable: fullTimetable });
            setIsScheduleModalVisible(true);
        }
    };

    const handleViewPaper = (schedule: ScheduleDetail, examDay: ExamDay) => {
        const paper = papers.find(
            p =>
                p.academic_year === schedule.timetable.academic_year &&
                p.class_name === schedule.timetable.class_name &&
                p.section_name === schedule.timetable.section_name &&
                p.exam_title === schedule.timetable.exam_title &&
                p.subject === examDay.subject
        );

        if (paper) {
            setPaperData(paper);
            setIsPaperModalVisible(true);
        } else {
            message.info('No question paper has been generated for this subject yet.');
        }
    };

    // Filtered classes inside the first modal
    const filteredModalClasses = useMemo(() => {
        if (!modalData?.classTimetables) return [];
        if (!modalClassSearch.trim()) return modalData.classTimetables;

        const q = modalClassSearch.toLowerCase().trim();
        return modalData.classTimetables.filter(c =>
            `class ${c.class_name} - ${c.section_name}`.toLowerCase().includes(q)
        );
    }, [modalData, modalClassSearch]);

    // Table view columns
    const tableColumns: ColumnsType<ExamTimetable> = [
        {
            title: '#',
            key: 'index',
            width: 55,
            align: 'center',
            render: (_t, _r, index) => <span className="font-semibold text-slate-400 text-xs">{index + 1}</span>,
        },
        {
            title: 'Exam Title',
            dataIndex: 'exam_title',
            key: 'exam_title',
            render: title => (
                <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <ReadOutlined className="text-blue-600" />
                    <span>{title}</span>
                </div>
            ),
        },
        {
            title: 'Class & Section',
            key: 'class_section',
            width: 150,
            render: (_, record) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Class {record.class_name} - {record.section_name}
                </span>
            ),
        },
        {
            title: 'Total Marks',
            dataIndex: 'exam_total_mark',
            key: 'exam_total_mark',
            width: 110,
            align: 'center',
            render: mark => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {mark} Marks
                </span>
            ),
        },
        {
            title: 'Duration',
            dataIndex: 'exam_time',
            key: 'exam_time',
            width: 130,
            render: time => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <ClockCircleOutlined className="text-slate-400" />
                    <span>{dayjs(time, 'HH:mm:ss').format('H [hr] m [min]')}</span>
                </div>
            ),
        },
        {
            title: 'Subjects Count',
            key: 'subjects_count',
            width: 130,
            align: 'center',
            render: (_, record) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {record.exam_days?.length || 0} Subjects
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            align: 'right',
            render: (_, record) => (
                <Button
                    size="small"
                    type="primary"
                    icon={<CalendarOutlined />}
                    onClick={() =>
                        handleViewSchedule({
                            class_name: record.class_name,
                            section_name: record.section_name,
                            exam_title: record.exam_title,
                            total_mark: record.exam_total_mark,
                            exam_time: record.exam_time,
                        })
                    }
                    className="text-xs inline-flex items-center bg-blue-600 hover:bg-blue-700 font-medium"
                >
                    View Schedule
                </Button>
            ),
        },
    ];

    const isLoading = papersLoading || timetablesLoading || teacherDataLoading;
    const error = papersError || timetablesError;

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 md:p-6 space-y-5">
            {/* 1. Header Card with Navigation and Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Title & Info */}
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <button
                                type="button"
                                onClick={() => dispatch(setCurrentPage('staffdashboard'))}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                            >
                                <ArrowLeftOutlined />
                                <span>Back to Dashboard</span>
                            </button>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg border border-blue-200">
                                <IdcardOutlined />
                                <span>Faculty: {user?.full_name || 'Teacher'}</span>
                            </span>
                            {selectedYear && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                                    <CalendarOutlined className="text-slate-400" />
                                    <span>Year: {selectedYear}</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Exam Question Paper Templates & Timetables</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Browse formal exam schedules by academic year, track class examination timetables, and review or print verified question papers.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            icon={<ReloadOutlined spin={isLoading} />}
                            onClick={() => {
                                if (user?.organization_key) {
                                    dispatch(fetchAllQuestionPapersRequest(user.organization_key));
                                    dispatch(fetchExamTimetablesRequest(user.organization_key));
                                    message.success('Timetables and question papers refreshed.');
                                }
                            }}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Refresh
                        </Button>
                        <Button
                            icon={<FormOutlined />}
                            onClick={() => dispatch(setCurrentPage('examquestionpaper'))}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Question Paper Generator
                        </Button>
                        <Button
                            icon={<BookOutlined />}
                            onClick={() => dispatch(setCurrentPage('questionbank'))}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Question Bank
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Overview Statistics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Scheduled Exams
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                            <ReadOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.totalExams}</span>
                        <span className="text-xs text-slate-400">exam series</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Classes Handled
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                            <FolderOpenOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.totalClasses}</span>
                        <span className="text-xs text-slate-400">sections</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            My Subject Papers
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                            <BookOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{metrics.mySubjectPapers}</span>
                        <span className="text-xs text-slate-400">generated</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Verified / Ready
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <CheckCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-600">{metrics.confirmedPapers}</span>
                        <span className="text-xs text-slate-400">confirmed papers</span>
                    </div>
                </div>
            </div>

            {/* 3. Filters, Search & View Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {/* Academic Year Selector */}
                        <div className="w-full sm:w-auto min-w-[200px]">
                            <Select
                                placeholder="Select Academic Year"
                                className="w-full"
                                value={selectedYear}
                                onChange={setSelectedYear}
                                loading={teacherDataLoading}
                            >
                                {academicYearOptions.map((year: any) => (
                                    <Option key={year.id} value={year.academic_year}>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarOutlined className="text-blue-500" />
                                            <span>{year.academic_year}</span>
                                            {year.is_current && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1 rounded ml-1">
                                                    Current
                                                </span>
                                            )}
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto sm:flex-1 min-w-[220px]">
                            <Input
                                placeholder="Search by exam title, class or subject..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                            />
                        </div>

                        {searchQuery && (
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => setSearchQuery('')}
                                className="text-slate-600 border-slate-200 text-xs"
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto border border-slate-200">
                        <button
                            type="button"
                            onClick={() => setViewMode('cards')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                viewMode === 'cards'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <AppstoreOutlined />
                            <span className="hidden sm:inline">Exams Cards</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <TableOutlined />
                            <span className="hidden sm:inline">Timetables Table</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error banner if any */}
            {error && (
                <Alert
                    message="Error Loading Exam Timetables"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    className="rounded-xl"
                />
            )}

            {/* 4. Main Content Area */}
            <Spin spinning={isLoading} tip="Loading exam templates & timetables...">
                {!selectedYear ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        Select an Academic Year
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        Please select an academic year from the dropdown above to view scheduled exam series and question paper templates.
                                    </p>
                                </div>
                            }
                        />
                    </div>
                ) : examsByYear.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        No Exam Timetables Found
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        {searchQuery
                                            ? 'No exam series or class schedules matched your search criteria.'
                                            : 'No formal exam timetables have been scheduled yet for this academic year.'}
                                    </p>
                                </div>
                            }
                        />
                    </div>
                ) : viewMode === 'cards' ? (
                    /* CARDS VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {examsByYear.map((examTitle, idx) => {
                            const timetablesForThisExam = timetables.filter(
                                t => t.academic_year === selectedYear && t.exam_title === examTitle
                            );
                            const classCount = timetablesForThisExam.length;
                            const uniqueSubjects = new Set(
                                timetablesForThisExam.flatMap(t => (t.exam_days || []).map(d => d.subject))
                            ).size;

                            return (
                                <div
                                    key={examTitle || idx}
                                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:border-blue-200"
                                >
                                    <div className="space-y-3.5">
                                        {/* Card Top Icon & Year */}
                                        <div className="flex items-center justify-between">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
                                                <ReadOutlined />
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                                                {selectedYear}
                                            </span>
                                        </div>

                                        {/* Exam Title */}
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">
                                                {examTitle}
                                            </h3>
                                            <p className="text-xs text-slate-400 mt-0.5">
                                                Curriculum Examination Series
                                            </p>
                                        </div>

                                        {/* Badges overview */}
                                        <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                <FolderOpenOutlined className="text-slate-400" />
                                                <span>{classCount} {classCount === 1 ? 'Class' : 'Classes'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                                                <BookOutlined className="text-slate-400" />
                                                <span>{uniqueSubjects} Subjects</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="pt-4 mt-4 border-t border-slate-100">
                                        <Button
                                            type="primary"
                                            icon={<CalendarOutlined />}
                                            onClick={() => handleViewTimetables(selectedYear, examTitle)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-xs inline-flex items-center justify-center"
                                        >
                                            View Class Timetables
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* TABLE VIEW */
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <Table
                            columns={tableColumns}
                            dataSource={flattenedTimetablesList}
                            rowKey="id"
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} schedules`,
                            }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                )}
            </Spin>

            {/* MODAL 1: Classes Participating in Exam Series */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            <FolderOpenOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                Classes for {modalData?.examTitle}
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                Academic Year {modalData?.academicYear} • Select a class to inspect full day-by-day exam schedules
                            </span>
                        </div>
                    </div>
                }
                open={isClassModalVisible}
                onCancel={() => setIsClassModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsClassModalVisible(false)}>
                        Close
                    </Button>,
                ]}
                width={800}
                className="rounded-2xl"
            >
                <div className="space-y-4 py-2">
                    {/* Search inside modal */}
                    <Input
                        placeholder="Search class or section..."
                        prefix={<SearchOutlined className="text-slate-400" />}
                        value={modalClassSearch}
                        onChange={e => setModalClassSearch(e.target.value)}
                        allowClear
                        className="rounded-xl"
                    />

                    {/* Classes Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                        {filteredModalClasses.map((item, idx) => (
                            <div
                                key={idx}
                                className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between space-y-3"
                            >
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            Class {item.class_name} - {item.section_name}
                                        </span>
                                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                            {item.total_mark} Marks
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                        <ClockCircleOutlined className="text-slate-400" />
                                        <span>Duration: {dayjs(item.exam_time, 'HH:mm:ss').format('H [hr] m [min]')}</span>
                                    </div>
                                </div>

                                <Button
                                    type="default"
                                    icon={<CalendarOutlined />}
                                    onClick={() => handleViewSchedule(item)}
                                    className="w-full text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-400 text-xs font-semibold"
                                >
                                    View Schedule & Papers
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

            {/* MODAL 2: Day-by-Day Exam Schedule & Question Paper Preview */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                            <CalendarOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                Exam Schedule & Paper Verification
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                Class {scheduleData?.timetable.class_name} - {scheduleData?.timetable.section_name} •{' '}
                                {scheduleData?.timetable.exam_title}
                            </span>
                        </div>
                    </div>
                }
                open={isScheduleModalVisible}
                onCancel={() => setIsScheduleModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsScheduleModalVisible(false)}>
                        Close
                    </Button>,
                ]}
                width={850}
                className="rounded-2xl"
            >
                <div className="space-y-4 py-2">
                    {/* Schedule Metadata Banner */}
                    {scheduleData && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Class:</span>
                                <span className="font-bold text-slate-700">
                                    {scheduleData.timetable.class_name} - {scheduleData.timetable.section_name}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Total Marks:</span>
                                <span className="font-bold text-slate-700">
                                    {scheduleData.timetable.exam_total_mark} Marks
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Daily Time:</span>
                                <span className="font-bold text-slate-700">
                                    {dayjs(scheduleData.timetable.exam_time, 'HH:mm:ss').format('h:mm A')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Academic Year:</span>
                                <span className="font-bold text-slate-700">
                                    {scheduleData.timetable.academic_year}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Schedule Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                                Examination Day Schedule ({scheduleData?.timetable.exam_days?.length || 0} Sessions)
                            </span>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
                            {(scheduleData?.timetable.exam_days || []).map((item, idx) => {
                                const isMySubject = mySubjects.has(item.subject);
                                const paperRecord = papers.find(
                                    p =>
                                        p.academic_year === scheduleData?.timetable.academic_year &&
                                        p.class_name === scheduleData?.timetable.class_name &&
                                        p.section_name === scheduleData?.timetable.section_name &&
                                        p.exam_title === scheduleData?.timetable.exam_title &&
                                        p.subject === item.subject
                                );
                                const isPaperConfirmed = paperRecord?.status === 'Confirm';
                                const hasPaper = !!paperRecord;

                                return (
                                    <div
                                        key={idx}
                                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                                                    <BookOutlined className="text-indigo-500" />
                                                    <span>{item.subject}</span>
                                                </span>
                                                {isMySubject && (
                                                    <Tag color="blue" className="text-[10px] font-semibold m-0">
                                                        Your Subject
                                                    </Tag>
                                                )}
                                                {hasPaper ? (
                                                    isPaperConfirmed ? (
                                                        <Tag color="success" className="text-[10px] font-semibold m-0">
                                                            Confirmed Paper
                                                        </Tag>
                                                    ) : (
                                                        <Tag color="warning" className="text-[10px] font-semibold m-0">
                                                            Draft / Pending
                                                        </Tag>
                                                    )
                                                ) : (
                                                    <Tag className="text-[10px] font-semibold m-0 text-slate-400">
                                                        Not Generated
                                                    </Tag>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <span>
                                                    {dayjs(item.examdate).format('dddd, MMMM D, YYYY')}
                                                </span>
                                                <span>•</span>
                                                <span className="font-semibold text-slate-700">
                                                    {item.examsession === 'FN' ? 'Forenoon (FN)' : 'Afternoon (AN)'}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <Button
                                                size="small"
                                                type={isPaperConfirmed && isMySubject ? 'primary' : 'default'}
                                                icon={<EyeOutlined />}
                                                onClick={() => handleViewPaper(scheduleData!, item)}
                                                disabled={!isMySubject || !isPaperConfirmed}
                                                className={`text-xs inline-flex items-center ${
                                                    isPaperConfirmed && isMySubject
                                                        ? 'bg-blue-600 hover:bg-blue-700'
                                                        : ''
                                                }`}
                                            >
                                                View Question Paper
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* MODAL 3: Question Paper Preview & Print Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                            <FileTextOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                Question Paper Preview & Print
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                {paperData?.exam_title} • {paperData?.subject} • Class {paperData?.class_name} - {paperData?.section_name}
                            </span>
                        </div>
                    </div>
                }
                open={isPaperModalVisible}
                onCancel={() => setIsPaperModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsPaperModalVisible(false)}>
                        Close
                    </Button>,
                    <Button
                        key="print"
                        type="primary"
                        icon={<PrinterOutlined />}
                        onClick={handlePrint}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Print Paper
                    </Button>,
                ]}
                width="88%"
                style={{ top: 20 }}
                className="rounded-2xl"
            >
                <div className="py-2">
                    {paperData?.paper_content ? (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs max-h-[70vh] overflow-y-auto">
                            <div
                                ref={printRef}
                                className="question-paper-content"
                                dangerouslySetInnerHTML={{ __html: paperData.paper_content }}
                            />
                        </div>
                    ) : (
                        <Empty description="Could not load question paper content." />
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ExamQuestionPaperTemplates;
