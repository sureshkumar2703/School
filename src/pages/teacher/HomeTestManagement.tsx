import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Modal,
    Row,
    Select,
    Typography,
    InputNumber,
    Divider,
    Spin,
    message,
    Tag,
    Alert,
    Empty,
    Table,
    Input,
    Tooltip,
    Badge,
    Descriptions,
} from 'antd';
import {
    CalendarOutlined,
    CheckCircleOutlined,
    ArrowLeftOutlined,
    IdcardOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    BookOutlined,
    FolderOpenOutlined,
    EditOutlined,
    TeamOutlined,
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    TrophyOutlined,
    CheckOutlined,
    FileTextOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import type { ColumnsType } from 'antd/es/table';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchHomeTestsRequest, type HomeTest } from '../../store/features/home-test/homeTestSlice';
import { fetchHomeTestReportsRequest } from '../../store/features/home-test-report/homeTestReportSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface StudentForMarking {
    id: string; // Report ID
    student_id: string;
    roll_no?: string;
    register_no: string;
    student_name: string;
    get_mark: number | null;
}

const HomeTestManagement: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { savedHomeTests, loading: homeTestLoading, error: homeTestError } = useSelector(
        (state: RootState) => state.homeTest
    );

    // Filters and View Mode
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Upload Marks Modal State
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [selectedTestForMarks, setSelectedTestForMarks] = useState<HomeTest | null>(null);
    const [studentsForMarking, setStudentsForMarking] = useState<StudentForMarking[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState<string>('');
    const [marks, setMarks] = useState<Record<string, number | null>>({});
    const [loadingModalData, setLoadingModalData] = useState(false);
    const [isSavingMarks, setIsSavingMarks] = useState(false);
    const [totalStudentsInClass, setTotalStudentsInClass] = useState(0);
    const [form] = Form.useForm();

    // Initial Data Fetching
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
        }
    }, [dispatch, user?.organization_key]);

    // Active Academic Years
    const academicYears = useMemo(() => {
        if (!calendars) return [];
        return (calendars as any[])
            .filter((cal: any) => cal.status === 'Active')
            .sort((a: any, b: any) => b.academic_year.localeCompare(a.academic_year));
    }, [calendars]);

    // Default Select Current Year
    useEffect(() => {
        if (academicYears.length > 0 && !selectedAcademicYear) {
            const currentYear = academicYears.find((c: any) => c.is_current)?.academic_year;
            setSelectedAcademicYear(currentYear || academicYears[0]?.academic_year || null);
        }
    }, [academicYears, selectedAcademicYear]);

    // Fetch Tests and Reports
    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(
                fetchHomeTestsRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                })
            );
            dispatch(fetchHomeTestReportsRequest({ organizationKey: user.organization_key }));
        }
    }, [dispatch, user]);

    // Fetch Modal Student Allocation and Reports
    useEffect(() => {
        const fetchModalData = async () => {
            if (!selectedTestForMarks || !user?.organization_key) return;

            setLoadingModalData(true);
            try {
                const { count: totalCount, error: countError } = await supabase
                    .from('class_section_allocations')
                    .select('*', { count: 'exact', head: true })
                    .eq('organization_key', user.organization_key)
                    .eq('class_name', selectedTestForMarks.class_name)
                    .eq('section_name', selectedTestForMarks.section_name)
                    .eq('academic_year', selectedTestForMarks.academic_year);

                if (countError) throw countError;
                setTotalStudentsInClass(totalCount || 0);

                const { data: reportData, error: reportError } = await supabase
                    .from('home_test_report')
                    .select('id, student_id, roll_no, register_no, student_name, get_mark')
                    .eq('home_test_id', selectedTestForMarks.id);

                if (reportError) throw reportError;

                const sortedReports = (reportData || []).sort((a, b) =>
                    (a.roll_no || '').localeCompare(b.roll_no || '')
                );
                setStudentsForMarking(sortedReports as StudentForMarking[]);

                const initialMarks: Record<string, number | null> = {};
                const formValues: Record<string, number | null> = {};
                sortedReports.forEach(report => {
                    initialMarks[report.id] = report.get_mark;
                    formValues[report.id] = report.get_mark;
                });
                setMarks(initialMarks);
                form.setFieldsValue({ marks: formValues });
            } catch (err: any) {
                message.error(`Failed to load student reports: ${err.message}`);
            } finally {
                setLoadingModalData(false);
            }
        };

        if (isUploadModalVisible) {
            fetchModalData();
        }
    }, [isUploadModalVisible, selectedTestForMarks, user?.organization_key, form]);

    // Teacher's mappings
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return (mappings as any[]).filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Class options for selection
    const classOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: any, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `Class ${m.class_name} - ${m.section_name}`,
                });
            }
            return acc;
        }, new Map<string, { key: string; label: string }>());
        return Array.from(uniqueClasses.values()).sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedAcademicYear]);

    // Subject options based on selected class
    const subjectOptions = useMemo(() => {
        if (!selectedAcademicYear || !subjects) return [];
        let assignments = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYear);
        if (selectedClassKey) {
            const [className, sectionName] = selectedClassKey.split('||');
            assignments = assignments.filter(
                (m: any) => m.class_name === className && m.section_name === sectionName
            );
        }
        const subjectNames = assignments.map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [myAssignments, selectedAcademicYear, selectedClassKey, subjects]);

    const handleYearChange = (value: string) => {
        setSelectedAcademicYear(value);
        setSelectedClassKey(null);
        setSelectedSubject(null);
    };

    const handleClassChange = (value: string | null) => {
        setSelectedClassKey(value);
        setSelectedSubject(null);
    };

    const handleUploadModalOpen = (test: HomeTest) => {
        setSelectedTestForMarks(test);
        setStudentSearchQuery('');
        setIsUploadModalVisible(true);
    };

    const handleUploadModalClose = () => {
        setIsUploadModalVisible(false);
        setSelectedTestForMarks(null);
        setStudentsForMarking([]);
        setStudentSearchQuery('');
        setMarks({});
        form.resetFields();
    };

    const handleMarkChange = (studentReportId: string, value: number | null) => {
        setMarks(prev => ({ ...prev, [studentReportId]: value }));
    };

    const handleSaveMarks = async () => {
        try {
            await form.validateFields();
            if (!selectedTestForMarks || Object.keys(marks).length === 0) {
                message.warning('No marks entered to save.');
                return;
            }

            setIsSavingMarks(true);
            const updates = Object.entries(marks)
                .filter(([_, markValue]) => markValue !== null)
                .map(([reportId, markValue]) => ({
                    id: reportId,
                    get_mark: markValue,
                }));

            if (updates.length > 0) {
                const { error } = await supabase.from('home_test_report').upsert(updates);
                if (error) {
                    message.error(`Failed to save marks: ${error.message}`);
                } else {
                    message.success(`${updates.length} students' marks saved successfully.`);
                    handleUploadModalClose();
                    // Refetch reports to sync
                    if (user?.organization_key) {
                        dispatch(fetchHomeTestReportsRequest({ organizationKey: user.organization_key }));
                    }
                }
            } else {
                message.info('No valid marks were entered.');
            }
        } catch (errorInfo) {
            console.log('Validation Failed:', errorInfo);
            message.error('Please resolve errors before saving.');
        } finally {
            setIsSavingMarks(false);
        }
    };

    // Filtered Tests
    const filteredTests = useMemo(() => {
        let tests = [...savedHomeTests].sort(
            (a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
        );

        if (selectedAcademicYear) {
            tests = tests.filter(test => test.academic_year === selectedAcademicYear);
        }

        if (selectedClassKey) {
            const [className, sectionName] = selectedClassKey.split('||');
            tests = tests.filter(
                test => test.class_name === className && test.section_name === sectionName
            );
        }

        if (selectedSubject) {
            const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;
            if (subjectCode) {
                tests = tests.filter(test => test.subject_code === subjectCode);
            }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            tests = tests.filter(test => {
                const subj = subjects.find(s => s.subject_code === test.subject_code);
                const subjName = subj?.subject_name?.toLowerCase() || '';
                const code = test.subject_code?.toLowerCase() || '';
                const cls = `class ${test.class_name} - ${test.section_name}`.toLowerCase();
                const unit = `unit ${test.unit}`.toLowerCase();
                return (
                    subjName.includes(query) ||
                    code.includes(query) ||
                    cls.includes(query) ||
                    unit.includes(query)
                );
            });
        }

        return tests;
    }, [savedHomeTests, selectedAcademicYear, selectedClassKey, selectedSubject, searchQuery, subjects]);

    // Metrics for Banner
    const metrics = useMemo(() => {
        const totalTests = savedHomeTests.length;
        const uniqueClasses = new Set(savedHomeTests.map(t => `${t.class_name}-${t.section_name}`)).size;
        const uniqueSubjects = new Set(savedHomeTests.map(t => t.subject_code)).size;
        const recentDate = savedHomeTests.length > 0 ? savedHomeTests[0]?.test_date : null;

        return {
            totalTests,
            uniqueClasses,
            uniqueSubjects,
            recentDateFormatted: recentDate ? dayjs(recentDate).format('DD MMM YYYY') : 'None yet',
        };
    }, [savedHomeTests]);

    // Filtered students for marking inside modal
    const filteredModalStudents = useMemo(() => {
        if (!studentSearchQuery.trim()) return studentsForMarking;
        const query = studentSearchQuery.toLowerCase().trim();
        return studentsForMarking.filter(
            s =>
                s.student_name.toLowerCase().includes(query) ||
                (s.roll_no && s.roll_no.toLowerCase().includes(query)) ||
                s.register_no.toLowerCase().includes(query)
        );
    }, [studentsForMarking, studentSearchQuery]);

    // Modal stats
    const attendedCount = studentsForMarking.filter(s => marks[s.id] !== null && marks[s.id] !== undefined)
        .length;
    const balanceCount = Math.max(0, totalStudentsInClass - attendedCount);

    // Table Columns for student marking modal
    const studentsColumns: ColumnsType<StudentForMarking> = [
        {
            title: 'Roll No',
            dataIndex: 'roll_no',
            key: 'roll_no',
            width: 90,
            align: 'center',
            render: text => (
                <span className="font-semibold text-slate-700 text-xs">{text || 'N/A'}</span>
            ),
        },
        {
            title: 'Register No',
            dataIndex: 'register_no',
            key: 'register_no',
            width: 130,
            render: text => (
                <span className="font-mono text-xs font-medium text-blue-600">{text}</span>
            ),
        },
        {
            title: 'Student Name',
            dataIndex: 'student_name',
            key: 'student_name',
            render: text => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                        {text ? text.charAt(0).toUpperCase() : <UserOutlined />}
                    </div>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">{text}</span>
                </div>
            ),
        },
        {
            title: `Mark (Max: ${selectedTestForMarks?.total_marks || 0})`,
            key: 'mark',
            width: 170,
            render: (_, record) => (
                <Form.Item
                    name={['marks', record.id]}
                    noStyle
                    rules={[
                        {
                            validator: (_, value) => {
                                if (
                                    value !== null &&
                                    value !== undefined &&
                                    selectedTestForMarks &&
                                    value > selectedTestForMarks.total_marks
                                ) {
                                    return Promise.reject(
                                        new Error(`Max: ${selectedTestForMarks.total_marks}`)
                                    );
                                }
                                return Promise.resolve();
                            },
                        },
                    ]}
                >
                    <InputNumber
                        placeholder="Marks"
                        onChange={value => handleMarkChange(record.id, value)}
                        min={0}
                        max={selectedTestForMarks?.total_marks}
                        style={{ width: '100%' }}
                        size="middle"
                        className="rounded-lg"
                    />
                </Form.Item>
            ),
        },
    ];

    // Main Test Table Columns
    const testTableColumns: ColumnsType<HomeTest> = [
        {
            title: '#',
            key: 'index',
            width: 60,
            align: 'center',
            render: (_t, _r, index) => (
                <span className="font-semibold text-slate-500 text-xs">{index + 1}</span>
            ),
        },
        {
            title: 'Test Date',
            dataIndex: 'test_date',
            key: 'test_date',
            width: 130,
            render: date => (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                    <CalendarOutlined className="text-blue-500" />
                    {dayjs(date).format('DD MMM YYYY')}
                </span>
            ),
        },
        {
            title: 'Class & Section',
            key: 'class_section',
            width: 160,
            render: (_, record) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Class {record.class_name} - {record.section_name}
                </span>
            ),
        },
        {
            title: 'Subject',
            key: 'subject',
            render: (_, record) => {
                const subj = subjects.find(s => s.subject_code === record.subject_code);
                return (
                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 text-sm">
                            {subj?.subject_name || record.subject_code}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                            Code: {record.subject_code}
                        </span>
                    </div>
                );
            },
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            key: 'unit',
            width: 110,
            render: unit => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    Unit {unit}
                </span>
            ),
        },
        {
            title: 'Total Marks',
            dataIndex: 'total_marks',
            key: 'total_marks',
            width: 120,
            align: 'center',
            render: marksVal => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {marksVal} Marks
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
                    type="primary"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => handleUploadModalOpen(record)}
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold inline-flex items-center"
                >
                    Upload Marks
                </Button>
            ),
        },
    ];

    const isLoading = mappingsLoading || subjectsLoading || homeTestLoading;

    return (
        <div className="min-h-screen bg-slate-50/70  space-y-5">
            {/* 1. Header Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Title & Navigation */}
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
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Home Test Mark Management</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Record, evaluate, and track student scores for all generated home test papers.
                        </p>
                    </div>

                    {/* Quick Link to Test Generator */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            onClick={() => dispatch(setCurrentPage('hometest'))}
                            icon={<FileTextOutlined />}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            <span>Test Paper Generator</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Overview Statistics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Tests
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                            <FileTextOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.totalTests}</span>
                        <span className="text-xs text-slate-400">conducted</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Classes Evaluated
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                            <FolderOpenOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.uniqueClasses}</span>
                        <span className="text-xs text-slate-400">sections</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Subjects Handled
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                            <BookOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.uniqueSubjects}</span>
                        <span className="text-xs text-slate-400">subjects</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Latest Test Date
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <CalendarOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">
                            {metrics.recentDateFormatted}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Filters, Search & View Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {/* Academic Year Filter */}
                        <div className="w-full sm:w-auto min-w-[170px]">
                            <Select
                                placeholder="Academic Year"
                                className="w-full"
                                value={selectedAcademicYear}
                                onChange={handleYearChange}
                                loading={mappingsLoading}
                            >
                                {academicYears.map((cal: any) => (
                                    <Option key={cal.id} value={cal.academic_year}>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarOutlined className="text-blue-500" />
                                            <span>{cal.academic_year}</span>
                                            {cal.is_current && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1 rounded ml-1">
                                                    Current
                                                </span>
                                            )}
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Class Filter */}
                        <div className="w-full sm:w-auto min-w-[170px]">
                            <Select
                                placeholder="All Classes"
                                allowClear
                                className="w-full"
                                value={selectedClassKey}
                                onChange={handleClassChange}
                                disabled={!selectedAcademicYear}
                            >
                                {classOptions.map((opt: any) => (
                                    <Option key={opt.key} value={opt.key}>
                                        {opt.label}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Subject Filter */}
                        <div className="w-full sm:w-auto min-w-[170px]">
                            <Select
                                placeholder="All Subjects"
                                allowClear
                                className="w-full"
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                disabled={!selectedAcademicYear}
                            >
                                {subjectOptions.map(subject => (
                                    <Option
                                        key={subject?.subject_code}
                                        value={subject?.subject_name}
                                    >
                                        {subject?.subject_name}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto flex-1 min-w-[200px]">
                            <Input
                                placeholder="Search by subject, class, or unit..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                            />
                        </div>
                    </div>

                    {/* View Switcher: Cards vs Table */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    viewMode === 'cards'
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <AppstoreOutlined />
                                <span>Cards</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    viewMode === 'table'
                                        ? 'bg-white text-blue-700 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <TableOutlined />
                                <span>Table</span>
                            </button>
                        </div>

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={() => {
                                if (user?.organization_key && user?.staff_code) {
                                    dispatch(
                                        fetchHomeTestsRequest({
                                            organizationKey: user.organization_key,
                                            staffCode: user.staff_code,
                                        })
                                    );
                                }
                            }}
                            className="text-slate-600 border-slate-200 hover:text-blue-600"
                        />
                    </div>
                </div>

                {/* Active Filter Chips */}
                {(selectedClassKey || selectedSubject || searchQuery) && (
                    <div className="flex items-center gap-2 pt-2 flex-wrap text-xs text-slate-500 border-t border-slate-100">
                        <span>Active filters:</span>
                        {selectedClassKey && (
                            <Tag
                                closable
                                onClose={() => setSelectedClassKey(null)}
                                color="blue"
                                className="rounded-md"
                            >
                                Class: {selectedClassKey.split('||')[0]} - {selectedClassKey.split('||')[1]}
                            </Tag>
                        )}
                        {selectedSubject && (
                            <Tag
                                closable
                                onClose={() => setSelectedSubject(null)}
                                color="purple"
                                className="rounded-md"
                            >
                                Subject: {selectedSubject}
                            </Tag>
                        )}
                        {searchQuery && (
                            <Tag
                                closable
                                onClose={() => setSearchQuery('')}
                                color="orange"
                                className="rounded-md"
                            >
                                Query: &quot;{searchQuery}&quot;
                            </Tag>
                        )}
                        <Button
                            type="link"
                            size="small"
                            onClick={() => {
                                setSelectedClassKey(null);
                                setSelectedSubject(null);
                                setSearchQuery('');
                            }}
                            className="p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                            Reset all
                        </Button>
                    </div>
                )}
            </div>

            {homeTestError && (
                <Alert
                    message="Error loading tests"
                    description={homeTestError}
                    type="error"
                    showIcon
                    className="rounded-xl shadow-xs"
                />
            )}

            {/* 4. Tests Display List */}
            <Spin spinning={isLoading}>
                {filteredTests.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1.5">
                                    <h3 className="text-base font-semibold text-slate-800">
                                        No Home Tests Found
                                    </h3>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                        {savedHomeTests.length === 0
                                            ? 'No tests have been generated yet. Use the Test Paper Generator to create your first home test.'
                                            : 'No home tests match the current filter selection. Try adjusting or clearing your filters.'}
                                    </p>
                                </div>
                            }
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => dispatch(setCurrentPage('hometest'))}
                                className="mt-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                            >
                                Create Test Paper
                            </Button>
                        </Empty>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* Cards Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {filteredTests.map((test, index) => {
                            const subj = subjects.find(s => s.subject_code === test.subject_code);
                            const subjectName = subj?.subject_name || test.subject_code;
                            const questionsList = Object.values(test.questions || {}).reduce(
                                (acc: number, list: any) => acc + (Array.isArray(list) ? list.length : 0),
                                0
                            );

                            return (
                                <div
                                    key={test.id || index}
                                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between overflow-hidden group"
                                >
                                    {/* Card Header Banner */}
                                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                                Class {test.class_name} - {test.section_name}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                <CalendarOutlined className="text-slate-400" />
                                                {dayjs(test.test_date).format('DD MMM YYYY')}
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0 font-bold text-base mt-0.5">
                                                <BookOutlined />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-base font-bold text-slate-800 leading-snug truncate group-hover:text-blue-600 transition-colors">
                                                    {subjectName}
                                                </h3>
                                                <p className="text-xs text-slate-400 font-mono mt-0.5">
                                                    Code: {test.subject_code} • {test.academic_year}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Details Body */}
                                    <div className="p-4 sm:p-5 space-y-3 flex-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Unit / Coverage:</span>
                                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                                Unit {test.unit}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Total Marks:</span>
                                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                                                {test.total_marks} Marks
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Total Questions:</span>
                                            <span className="font-medium text-slate-700">
                                                {questionsList} Questions
                                            </span>
                                        </div>
                                    </div>

                                    {/* Card Footer Action */}
                                    <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-end">
                                        <Button
                                            type="primary"
                                            size="middle"
                                            icon={<EditOutlined />}
                                            onClick={() => handleUploadModalOpen(test)}
                                            className="bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-semibold inline-flex items-center w-full justify-center shadow-xs"
                                        >
                                            Enter / Upload Marks
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Data Table View */
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <Table
                            rowKey={r => r.id}
                            columns={testTableColumns}
                            dataSource={filteredTests}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                            }}
                            scroll={{ x: 800 }}
                        />
                    </div>
                )}
            </Spin>

            {/* 5. Marks Upload Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            <EditOutlined />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 m-0 leading-tight">
                                {selectedTestForMarks
                                    ? `Record Marks: Class ${selectedTestForMarks.class_name} - ${selectedTestForMarks.section_name}`
                                    : 'Upload Marks'}
                            </h2>
                            <p className="text-xs text-slate-500 m-0 font-normal">
                                {selectedTestForMarks
                                    ? `${
                                          subjects.find(
                                              s => s.subject_code === selectedTestForMarks.subject_code
                                          )?.subject_name || selectedTestForMarks.subject_code
                                      } • Unit ${selectedTestForMarks.unit} • Max Marks: ${
                                          selectedTestForMarks.total_marks
                                      }`
                                    : ''}
                            </p>
                        </div>
                    </div>
                }
                open={isUploadModalVisible}
                onCancel={handleUploadModalClose}
                width={820}
                destroyOnClose
                footer={[
                    <Button key="back" onClick={handleUploadModalClose} className="rounded-xl">
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={handleSaveMarks}
                        loading={isSavingMarks || loadingModalData}
                        className="bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold inline-flex items-center"
                    >
                        Save Marks
                    </Button>,
                ]}
            >
                <Spin spinning={loadingModalData} tip="Loading student list...">
                    {selectedTestForMarks && (
                        <div className="space-y-4 py-2">
                            {/* Summary Metadata Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Academic Year:</span>
                                    <span className="font-semibold text-slate-800">
                                        {selectedTestForMarks.academic_year}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Class & Section:</span>
                                    <span className="font-semibold text-slate-800">
                                        Class {selectedTestForMarks.class_name} - {selectedTestForMarks.section_name}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Total Marks:</span>
                                    <span className="font-bold text-emerald-700">
                                        {selectedTestForMarks.total_marks} Marks
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Test Date:</span>
                                    <span className="font-semibold text-slate-800">
                                        {dayjs(selectedTestForMarks.test_date).format('DD MMM YYYY')}
                                    </span>
                                </div>
                            </div>

                            {/* Attendance Counter Stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                                    <span className="text-xs text-blue-800 font-medium">Total Class Strength:</span>
                                    <span className="text-base font-bold text-blue-700">
                                        {totalStudentsInClass}
                                    </span>
                                </div>
                                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between">
                                    <span className="text-xs text-emerald-800 font-medium">Marks Recorded:</span>
                                    <span className="text-base font-bold text-emerald-700">
                                        {attendedCount}
                                    </span>
                                </div>
                                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between">
                                    <span className="text-xs text-amber-800 font-medium">Pending:</span>
                                    <span className="text-base font-bold text-amber-700">
                                        {balanceCount}
                                    </span>
                                </div>
                            </div>

                            {/* Search Filter for Student Table */}
                            <div className="flex items-center justify-between gap-3 pt-1">
                                <Input
                                    placeholder="Filter by student name or roll number..."
                                    prefix={<SearchOutlined className="text-slate-400" />}
                                    value={studentSearchQuery}
                                    onChange={e => setStudentSearchQuery(e.target.value)}
                                    allowClear
                                    className="max-w-xs rounded-lg"
                                />
                                <span className="text-xs text-slate-500 font-medium">
                                    Showing {filteredModalStudents.length} of {studentsForMarking.length} students
                                </span>
                            </div>

                            {/* Marking Form Table */}
                            <Form form={form} component={false}>
                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                    <Table
                                        columns={studentsColumns}
                                        dataSource={filteredModalStudents}
                                        rowKey="id"
                                        size="middle"
                                        pagination={false}
                                        scroll={{ y: 320 }}
                                    />
                                </div>
                            </Form>
                        </div>
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default HomeTestManagement;
