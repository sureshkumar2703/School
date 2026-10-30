/**
 * Teacher Homework & Assignment Management Component
 * Sri Gayathri SMS Portal
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Spin,
    message,
    Alert,
    Table,
    Tooltip,
    Empty,
    DatePicker,
    Popconfirm,
    Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    PlusOutlined,
    EyeOutlined,
    DeleteOutlined,
    CalendarOutlined,
    BookOutlined,
    FolderOpenOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    ArrowLeftOutlined,
    IdcardOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    FileTextOutlined,
    CopyOutlined,
    MinusCircleOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import {
    addHomeworkRequest,
    fetchHomeworkRequest,
    type Homework as HomeworkType,
} from '../../store/features/homework/homeworkSlice';
import { fetchHomeworkReportsRequest } from '../../store/features/homework-report/homeworkReportSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';

const { Option } = Select;

interface ClassItemOption {
    key: string;
    label: string;
    className?: string;
    sectionName?: string;
}

// Quick suggested tasks to help teachers rapidly populate homework items
const SUGGESTED_PRESETS = [
    '📖 Read & summarize textbook chapter',
    '✏️ Complete Exercise questions 1 to 5',
    '📝 Write down key definitions & formulas',
    '🔬 Prepare practical/lab record entry',
    '🧠 Review notes for upcoming unit test',
    '🎨 Create diagram & label parts neatly',
];

export const Homework: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [createForm] = Form.useForm();

    // Redux store state
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { homework, loading: homeworkLoading, error: homeworkError } = useSelector(
        (state: RootState) => state.homework
    );

    // Filter, search & view states
    const [filterAcademicYear, setFilterAcademicYear] = useState<string | null>(null);
    const [filterClassKey, setFilterClassKey] = useState<string | null>(null);
    const [filterSubject, setFilterSubject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Modals state
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [selectedHomework, setSelectedHomework] = useState<HomeworkType | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Modal form dynamic watches
    const modalSelectedClassKey = Form.useWatch('class_key', createForm);

    // Initial Data Loading
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchHomeworkRequest(user.organization_key));
            dispatch(fetchHomeworkReportsRequest({ organizationKey: user.organization_key }));
        }
    }, [dispatch, user?.organization_key]);

    // Set default academic year to current
    useEffect(() => {
        if (calendars && calendars.length > 0 && !filterAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            if (currentYear) {
                setFilterAcademicYear(currentYear);
            } else {
                setFilterAcademicYear(calendars[0].academic_year);
            }
        }
    }, [calendars, filterAcademicYear]);

    // Teacher's assigned mappings
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Unique academic years for filtering
    const academicYearOptions = useMemo(() => {
        return calendars || [];
    }, [calendars]);

    // Available classes based on selected academic year
    const classOptions = useMemo<ClassItemOption[]>(() => {
        if (!filterAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === filterAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: Map<string, ClassItemOption>, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `Class ${m.class_name} - ${m.section_name}`,
                    className: m.class_name,
                    sectionName: m.section_name,
                });
            }
            return acc;
        }, new Map<string, ClassItemOption>());

        return Array.from(uniqueClasses.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [myAssignments, filterAcademicYear]);

    // Subjects filtered for the filter bar
    const filterSubjectOptions = useMemo(() => {
        if (!filterClassKey) {
            const yearAssignments = myAssignments.filter((m: any) => m.academic_year === filterAcademicYear);
            const subjectNames = Array.from(new Set(yearAssignments.map((m: any) => m.subject_name))).filter(Boolean);
            return subjectNames as string[];
        }
        const [className, sectionName, academicYear] = filterClassKey.split('||');
        const subjectsForClass = myAssignments
            .filter(
                (m: any) =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map((m: any) => m.subject_name)
            .filter(Boolean);

        return Array.from(new Set(subjectsForClass)) as string[];
    }, [myAssignments, filterAcademicYear, filterClassKey]);

    // Modal Class Options (based on form academic year or default)
    const modalClassOptions = useMemo<ClassItemOption[]>(() => {
        const targetYear = filterAcademicYear || (calendars?.[0]?.academic_year);
        if (!targetYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === targetYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: Map<string, ClassItemOption>, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `Class ${m.class_name} - ${m.section_name}`,
                });
            }
            return acc;
        }, new Map<string, ClassItemOption>());

        return Array.from(uniqueClasses.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [myAssignments, filterAcademicYear, calendars]);

    // Modal Subject Options based on selected class in form
    const modalSubjectOptions = useMemo<string[]>(() => {
        if (!modalSelectedClassKey) return [];
        const [className, sectionName, academicYear] = modalSelectedClassKey.split('||');
        const list = myAssignments
            .filter(
                (m: any) =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map((m: any) => m.subject_name)
            .filter(Boolean);

        return Array.from(new Set(list)) as string[];
    }, [myAssignments, modalSelectedClassKey]);

    // Pre-mapped options for Select components
    const filterClassSelectOptions = useMemo(() => {
        return classOptions.map((item: ClassItemOption) => ({
            value: item.key,
            label: item.label,
        }));
    }, [classOptions]);

    const modalClassSelectOptions = useMemo(() => {
        return modalClassOptions.map((item: ClassItemOption) => ({
            value: item.key,
            label: item.label,
        }));
    }, [modalClassOptions]);

    // Filtered homework list
    const filteredHomework = useMemo(() => {
        let list = [...(homework || [])].sort(
            (a, b) => dayjs(b.homework_date).valueOf() - dayjs(a.homework_date).valueOf()
        );

        if (filterAcademicYear) {
            list = list.filter(h => h.academic_year === filterAcademicYear);
        }

        if (filterClassKey) {
            const [cls, sec] = filterClassKey.split('||');
            list = list.filter(h => h.class_name === cls && h.section_name === sec);
        }

        if (filterSubject) {
            list = list.filter(h => h.subject === filterSubject);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(h => {
                const subMatch = (h.subject || '').toLowerCase().includes(q);
                const classMatch = `class ${h.class_name} - ${h.section_name}`.toLowerCase().includes(q);
                const taskMatch = (h.homework_items || []).some(item =>
                    (item || '').toLowerCase().includes(q)
                );
                const dateMatch = dayjs(h.homework_date).format('DD MMM YYYY').toLowerCase().includes(q);
                return subMatch || classMatch || taskMatch || dateMatch;
            });
        }

        return list;
    }, [homework, filterAcademicYear, filterClassKey, filterSubject, searchQuery]);

    // Metric Calculations for Dashboard
    const metrics = useMemo(() => {
        const total = (homework || []).length;
        const uniqueClasses = new Set((homework || []).map(h => `${h.class_name}-${h.section_name}`)).size;
        const uniqueSubjects = new Set((homework || []).map(h => h.subject)).size;
        const latest = homework && homework.length > 0 ? homework[0]?.homework_date : null;

        return {
            total,
            uniqueClasses,
            uniqueSubjects,
            latestFormatted: latest ? dayjs(latest).format('DD MMM YYYY') : 'None yet',
        };
    }, [homework]);

    // Open create modal with defaults
    const handleOpenCreateModal = () => {
        createForm.resetFields();
        createForm.setFieldsValue({
            academic_year: filterAcademicYear,
            homework_date: dayjs(),
            homeworks: [{ task: '' }],
        });
        setIsCreateModalVisible(true);
    };

    // Quick add suggested preset task
    const handleAddPresetTask = (preset: string) => {
        const currentTasks = createForm.getFieldValue('homeworks') || [];
        if (currentTasks.length > 0 && !currentTasks[currentTasks.length - 1]?.task) {
            const updated = [...currentTasks];
            updated[updated.length - 1] = { task: preset };
            createForm.setFieldsValue({ homeworks: updated });
        } else {
            createForm.setFieldsValue({
                homeworks: [...currentTasks, { task: preset }],
            });
        }
    };

    // Submit new homework
    const handleCreateSubmit = (values: any) => {
        if (!user) {
            message.error('User authentication session not found.');
            return;
        }

        const validTasks = (values.homeworks || [])
            .map((item: any) => (item?.task || '').trim())
            .filter((t: string) => t.length > 0);

        if (validTasks.length === 0) {
            message.warning('Please enter at least one homework task or item.');
            return;
        }

        const [className, sectionName, academicYear] = values.class_key.split('||');

        const payload = {
            organization_key: user.organization_key!,
            staff_code: user.staff_code || '',
            academic_year: academicYear || values.academic_year || filterAcademicYear || '',
            class_name: className,
            section_name: sectionName,
            subject: values.subject,
            homework_items: validTasks,
            homework_date: values.homework_date ? dayjs(values.homework_date).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        };

        dispatch(addHomeworkRequest(payload));
        message.success('Homework assigned successfully!');
        setIsCreateModalVisible(false);
        createForm.resetFields();
    };

    // Delete a homework entry
    const handleDeleteHomework = async (id: string) => {
        setDeletingId(id);
        try {
            const { error } = await supabase.from('homework').delete().eq('id', id);
            if (error) throw error;

            message.success('Homework entry deleted successfully.');
            if (user?.organization_key) {
                dispatch(fetchHomeworkRequest(user.organization_key));
            }
        } catch (err: any) {
            message.error(`Failed to delete homework: ${err.message || 'Unknown error'}`);
        } finally {
            setDeletingId(null);
        }
    };

    // Copy homework tasks to clipboard (formatted for WhatsApp/SMS)
    const handleCopyHomework = (record: HomeworkType) => {
        const dateStr = dayjs(record.homework_date).format('DD MMM YYYY');
        const tasksStr = (record.homework_items || [])
            .map((t, idx) => `${idx + 1}. ${t}`)
            .join('\n');
        const textToCopy = `📝 *HOMEWORK ASSIGNMENT*\n📅 Date: ${dateStr}\n🏫 Class: ${record.class_name} - ${record.section_name}\n📚 Subject: ${record.subject}\n\n*Tasks:*\n${tasksStr}\n\n_Generated from Sri Gayathri Portal_`;

        navigator.clipboard.writeText(textToCopy).then(() => {
            message.success('Homework text copied to clipboard!');
        }).catch(() => {
            message.info('Could not copy automatically. You can copy from the details modal.');
        });
    };

    // Table view columns
    const columns: ColumnsType<HomeworkType> = [
        {
            title: '#',
            key: 'index',
            width: 55,
            align: 'center',
            render: (_t, _r, index) => (
                <span className="font-semibold text-slate-400 text-xs">{index + 1}</span>
            ),
        },
        {
            title: 'Assigned Date',
            dataIndex: 'homework_date',
            key: 'homework_date',
            width: 140,
            render: date => {
                const isToday = dayjs(date).isSame(dayjs(), 'day');
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <CalendarOutlined className="text-blue-500" />
                            {dayjs(date).format('DD MMM YYYY')}
                        </span>
                        {isToday && (
                            <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 w-max">
                                Assigned Today
                            </span>
                        )}
                    </div>
                );
            },
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
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            width: 180,
            render: subject => (
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-sm">
                    <BookOutlined className="text-indigo-500" />
                    <span>{subject}</span>
                </div>
            ),
        },
        {
            title: 'Homework Tasks',
            key: 'tasks',
            render: (_, record) => {
                const items = record.homework_items || [];
                const firstTask = items[0] || 'No tasks specified';
                return (
                    <div className="flex flex-col gap-1 max-w-md">
                        <span className="text-xs text-slate-700 line-clamp-1">
                            <span className="font-bold text-slate-500 mr-1">1.</span>
                            {firstTask}
                        </span>
                        {items.length > 1 && (
                            <span className="text-[11px] font-medium text-slate-400">
                                + {items.length - 1} more {items.length - 1 === 1 ? 'task' : 'tasks'}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Items',
            key: 'count',
            width: 90,
            align: 'center',
            render: (_, record) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                    {record.homework_items?.length || 0} tasks
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 180,
            align: 'right',
            render: (_, record) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Tooltip title="View Tasks & Details">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => {
                                setSelectedHomework(record);
                                setIsViewModalVisible(true);
                            }}
                            className="text-xs inline-flex items-center text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-400"
                        >
                            View
                        </Button>
                    </Tooltip>
                    <Tooltip title="Copy WhatsApp Text">
                        <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyHomework(record)}
                            className="text-xs text-slate-600 hover:text-slate-800 border-slate-200"
                        />
                    </Tooltip>
                    <Tooltip title="Delete Entry">
                        <Popconfirm
                            title="Delete Homework"
                            description="Are you sure you want to delete this homework record?"
                            okText="Yes, Delete"
                            cancelText="Cancel"
                            okButtonProps={{ danger: true, loading: deletingId === record.id }}
                            onConfirm={() => handleDeleteHomework(record.id)}
                        >
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                className="text-xs text-red-500 hover:text-red-700"
                            />
                        </Popconfirm>
                    </Tooltip>
                </div>
            ),
        },
    ];

    const isLoading = mappingsLoading || subjectsLoading || homeworkLoading;

    return (
        <div className="min-h-screen bg-slate-50/70  space-y-5">
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
                            {filterAcademicYear && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-md">
                                    <CalendarOutlined className="text-slate-400" />
                                    Year: {filterAcademicYear}
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Teacher Homework & Assignment Portal</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Create, assign, and organize daily homework tasks, review assignments, and monitor student completion.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            onClick={() => dispatch(setCurrentPage('homeworkhistory'))}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            <CheckCircleOutlined />
                            <span>Homework History & Status</span>
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleOpenCreateModal}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-sm inline-flex items-center"
                        >
                            Assign Homework
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Overview Statistics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Assigned
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                            <FileTextOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.total}</span>
                        <span className="text-xs text-slate-400">assignments</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Classes Handled
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
                            Subjects Active
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                            <BookOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.uniqueSubjects}</span>
                        <span className="text-xs text-slate-400">courses</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Latest Homework
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <CalendarOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">
                            {metrics.latestFormatted}
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
                                value={filterAcademicYear}
                                onChange={val => {
                                    setFilterAcademicYear(val);
                                    setFilterClassKey(null);
                                    setFilterSubject(null);
                                }}
                            >
                                {academicYearOptions.map((cal: any) => (
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
                                showSearch
                                placeholder="All Classes & Sections"
                                className="w-full"
                                value={filterClassKey}
                                onChange={val => {
                                    setFilterClassKey(val);
                                    setFilterSubject(null);
                                }}
                                allowClear
                                disabled={!filterAcademicYear}
                                filterOption={(input, option) =>
                                    ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={filterClassSelectOptions}
                            />
                        </div>

                        {/* Subject Filter */}
                        <div className="w-full sm:w-auto min-w-[160px]">
                            <Select
                                showSearch
                                placeholder="All Subjects"
                                className="w-full"
                                value={filterSubject}
                                onChange={val => setFilterSubject(val)}
                                allowClear
                                disabled={filterSubjectOptions.length === 0}
                            >
                                {filterSubjectOptions.map(sub => (
                                    <Option key={sub} value={sub}>
                                        <span className="flex items-center gap-1.5">
                                            <BookOutlined className="text-indigo-400" />
                                            <span>{sub}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto sm:flex-1 min-w-[200px]">
                            <Input
                                placeholder="Search by subject, task or keyword..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                            />
                        </div>

                        {/* Reset Filter Button */}
                        {(filterClassKey || filterSubject || searchQuery) && (
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    setFilterClassKey(null);
                                    setFilterSubject(null);
                                    setSearchQuery('');
                                }}
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
                            <span className="hidden sm:inline">Cards View</span>
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
                            <span className="hidden sm:inline">Table View</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Error banner if any */}
            {homeworkError && (
                <Alert
                    message="Homework Loading Error"
                    description={homeworkError}
                    type="error"
                    showIcon
                    closable
                    className="rounded-xl"
                />
            )}

            {/* 4. Homework Content Area */}
            <Spin spinning={isLoading} tip="Loading homework records...">
                {filteredHomework.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        No Homework Found
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        {searchQuery || filterClassKey || filterSubject
                                            ? 'No homework assignments matched your selected filter criteria. Try resetting the filters.'
                                            : 'You have not assigned any homework for this academic year yet. Click "Assign Homework" above to create your first task list.'}
                                    </p>
                                </div>
                            }
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleOpenCreateModal}
                                className="bg-blue-600 hover:bg-blue-700 mt-2 font-medium"
                            >
                                Create First Homework
                            </Button>
                        </Empty>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* CARDS VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {filteredHomework.map(item => {
                            const isToday = dayjs(item.homework_date).isSame(dayjs(), 'day');
                            const tasks = item.homework_items || [];

                            return (
                                <div
                                    key={item.id}
                                    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:border-blue-200"
                                >
                                    <div className="space-y-3.5">
                                        {/* Card Top: Badges and Date */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    Class {item.class_name} - {item.section_name}
                                                </span>
                                                {isToday && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        Today
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium inline-flex items-center gap-1 shrink-0">
                                                <CalendarOutlined className="text-slate-400" />
                                                {dayjs(item.homework_date).format('DD MMM YYYY')}
                                            </span>
                                        </div>

                                        {/* Card Subject */}
                                        <div>
                                            <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                                                <BookOutlined className="text-indigo-500" />
                                                <span>{item.subject}</span>
                                            </div>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                Academic Year: {item.academic_year}
                                            </span>
                                        </div>

                                        {/* Tasks Preview List */}
                                        <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                <span>Tasks Checklist</span>
                                                <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                                                    {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                                </span>
                                            </div>
                                            {tasks.slice(0, 3).map((task, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-start gap-2 text-xs text-slate-700"
                                                >
                                                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="line-clamp-2 leading-relaxed">
                                                        {task}
                                                    </span>
                                                </div>
                                            ))}
                                            {tasks.length > 3 && (
                                                <div className="text-[11px] text-blue-600 font-semibold pt-1">
                                                    + {tasks.length - 3} more {tasks.length - 3 === 1 ? 'task' : 'tasks'}...
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Action Footer */}
                                    <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <Tooltip title="View full tasks">
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => {
                                                        setSelectedHomework(item);
                                                        setIsViewModalVisible(true);
                                                    }}
                                                    className="text-xs inline-flex items-center bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                >
                                                    View
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Copy for WhatsApp">
                                                <Button
                                                    size="small"
                                                    icon={<CopyOutlined />}
                                                    onClick={() => handleCopyHomework(item)}
                                                    className="text-xs text-slate-600 hover:text-slate-900 border-slate-200"
                                                />
                                            </Tooltip>
                                        </div>

                                        <Popconfirm
                                            title="Delete Homework"
                                            description="Are you sure you want to delete this homework?"
                                            okText="Yes, Delete"
                                            cancelText="Cancel"
                                            okButtonProps={{ danger: true, loading: deletingId === item.id }}
                                            onConfirm={() => handleDeleteHomework(item.id)}
                                        >
                                            <Button
                                                size="small"
                                                danger
                                                icon={<DeleteOutlined />}
                                                className="text-xs"
                                            />
                                        </Popconfirm>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* TABLE VIEW */
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-2 sm:p-4">
                        <Table
                            columns={columns}
                            dataSource={filteredHomework}
                            rowKey="id"
                            scroll={{ x: 'max-content' }}
                            pagination={{
                                pageSize: 10,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                            }}
                        />
                    </div>
                )}
            </Spin>

            {/* 5. Create Homework Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2 text-slate-800">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <PlusOutlined />
                        </div>
                        <div>
                            <div className="font-bold text-base">Assign New Homework</div>
                            <div className="text-xs font-normal text-slate-400">
                                Create and distribute homework tasks for your classes
                            </div>
                        </div>
                    </div>
                }
                open={isCreateModalVisible}
                onCancel={() => {
                    setIsCreateModalVisible(false);
                    createForm.resetFields();
                }}
                footer={null}
                width={650}
                destroyOnClose
            >
                <Form
                    form={createForm}
                    layout="vertical"
                    onFinish={handleCreateSubmit}
                    className="space-y-4 pt-3"
                >
                    <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="class_key"
                                label={<span className="font-semibold text-slate-700 text-xs">Class & Section</span>}
                                rules={[{ required: true, message: 'Please select class & section' }]}
                            >
                                <Select
                                    placeholder="Select Class & Section"
                                    options={modalClassSelectOptions}
                                    onChange={() => createForm.setFieldsValue({ subject: undefined })}
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="subject"
                                label={<span className="font-semibold text-slate-700 text-xs">Subject</span>}
                                rules={[{ required: true, message: 'Please select subject' }]}
                            >
                                <Select
                                    placeholder="Select Subject"
                                    disabled={!modalSelectedClassKey || modalSubjectOptions.length === 0}
                                >
                                    {modalSubjectOptions.map(sub => (
                                        <Option key={sub} value={sub}>
                                            {sub}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="homework_date"
                                label={<span className="font-semibold text-slate-700 text-xs">Assignment Date</span>}
                                rules={[{ required: true, message: 'Please select date' }]}
                                initialValue={dayjs()}
                            >
                                <DatePicker className="w-full" format="YYYY-MM-DD" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                name="academic_year"
                                label={<span className="font-semibold text-slate-700 text-xs">Academic Year</span>}
                                initialValue={filterAcademicYear}
                            >
                                <Input disabled />
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Quick suggested chips */}
                    <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <span>⚡ Quick Task Templates (Click to insert):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {SUGGESTED_PRESETS.map((preset, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleAddPresetTask(preset)}
                                    className="text-xs bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer text-left"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Dynamic Homework Tasks List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 text-xs">
                                Homework Tasks / Questions:
                            </span>
                            <span className="text-[11px] text-slate-400">
                                Add numbered tasks for students
                            </span>
                        </div>

                        <Form.List name="homeworks">
                            {(fields, { add, remove }) => (
                                <div className="space-y-2">
                                    {fields.map(({ key, name, ...restField }, idx) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                {idx + 1}
                                            </span>
                                            <Form.Item
                                                {...restField}
                                                name={[name, 'task']}
                                                rules={[{ required: true, message: 'Please enter homework task or delete row' }]}
                                                className="mb-0 flex-1"
                                            >
                                                <Input
                                                    placeholder={`e.g. Solve questions 1 to 5 from textbook page 42`}
                                                    onPressEnter={e => {
                                                        e.preventDefault();
                                                        add();
                                                    }}
                                                />
                                            </Form.Item>
                                            {fields.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => remove(name)}
                                                    className="w-7 h-7 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center cursor-pointer transition-colors"
                                                >
                                                    <MinusCircleOutlined />
                                                </button>
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        type="dashed"
                                        onClick={() => add()}
                                        block
                                        icon={<PlusOutlined />}
                                        className="text-xs font-semibold text-blue-600 mt-2"
                                    >
                                        Add Another Task Item
                                    </Button>
                                </div>
                            )}
                        </Form.List>
                    </div>

                    <Divider className="my-3" />

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button onClick={() => setIsCreateModalVisible(false)}>Cancel</Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={homeworkLoading}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold"
                        >
                            Publish Homework
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* 6. View Homework Details Modal */}
            <Modal
                title={
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <BookOutlined />
                        </div>
                        <div>
                            <div className="font-bold text-base text-slate-800">
                                {selectedHomework?.subject} Homework
                            </div>
                            <div className="text-xs text-slate-400">
                                Class {selectedHomework?.class_name} - {selectedHomework?.section_name} •{' '}
                                {selectedHomework?.homework_date &&
                                    dayjs(selectedHomework.homework_date).format('DD MMM YYYY')}
                            </div>
                        </div>
                    </div>
                }
                open={isViewModalVisible}
                onCancel={() => {
                    setIsViewModalVisible(false);
                    setSelectedHomework(null);
                }}
                footer={[
                    <Button
                        key="copy"
                        icon={<CopyOutlined />}
                        onClick={() => selectedHomework && handleCopyHomework(selectedHomework)}
                    >
                        Copy Text
                    </Button>,
                    <Button
                        key="close"
                        type="primary"
                        onClick={() => {
                            setIsViewModalVisible(false);
                            setSelectedHomework(null);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Close
                    </Button>,
                ]}
                width={550}
            >
                {selectedHomework && (
                    <div className="space-y-4 py-2">
                        {/* Meta banner */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                            <div>
                                <span className="text-slate-400 block">Class & Section</span>
                                <span className="font-bold text-slate-800">
                                    Class {selectedHomework.class_name} - {selectedHomework.section_name}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block">Academic Year</span>
                                <span className="font-bold text-slate-800">
                                    {selectedHomework.academic_year}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block">Date of Assignment</span>
                                <span className="font-bold text-slate-800">
                                    {dayjs(selectedHomework.homework_date).format('DD MMMM YYYY')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block">Total Tasks</span>
                                <span className="font-bold text-blue-600">
                                    {selectedHomework.homework_items?.length || 0} items
                                </span>
                            </div>
                        </div>

                        {/* Tasks breakdown */}
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Tasks for Students:
                            </div>
                            <div className="space-y-2">
                                {(selectedHomework.homework_items || []).map((task, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs"
                                    >
                                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                            {idx + 1}
                                        </span>
                                        <span className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                                            {task}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Student Submission tracking shortcut */}
                        <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-blue-800 font-medium">
                                Track student completion and submissions?
                            </span>
                            <Button
                                size="small"
                                type="primary"
                                onClick={() => {
                                    setIsViewModalVisible(false);
                                    dispatch(setCurrentPage('homeworkhistory'));
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-xs"
                            >
                                Open Submissions
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Homework;
