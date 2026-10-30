/**
 * Teacher Homework History & Student Submission Tracker
 * Sri Gayathri SMS Portal
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    Card,
    Col,
    Row,
    Select,
    Spin,
    Alert,
    Empty,
    Table,
    Modal,
    List,
    message,
    Tooltip,
    Popconfirm,
    Space,
    Tag,
    Input,
    Progress,
    Badge,
    Segmented,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    EyeOutlined,
    TeamOutlined,
    CheckOutlined,
    CloseOutlined,
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
    PlusOutlined,
    DownloadOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    OrderedListOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchHomeworkRequest, type Homework } from '../../store/features/homework/homeworkSlice';
import {
    fetchHomeworkReportsRequest,
    updateHomeworkReportStatusRequest,
    type HomeworkReport,
} from '../../store/features/homework-report/homeworkReportSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';

const { Option } = Select;

interface ClassItemOption {
    key: string;
    label: string;
    className?: string;
    sectionName?: string;
}

const HomeworkHistory: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();

    // Redux store state
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { homework, loading: homeworkLoading, error: homeworkError } = useSelector(
        (state: RootState) => state.homework
    );
    const { reports: allReports, loading: reportsLoading, error: reportsError } = useSelector(
        (state: RootState) => state.homeworkReport
    );

    // Active primary tab: 'assignments' (by homework card/table) vs 'submissions' (direct student list)
    const [activeTab, setActiveTab] = useState<'assignments' | 'submissions'>('assignments');

    // Filter, search & view states
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Modals state
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [isStudentsModalVisible, setIsStudentsModalVisible] = useState(false);
    const [viewingHomework, setViewingHomework] = useState<Homework | null>(null);
    const [studentsForHomework, setStudentsForHomework] = useState<HomeworkReport[]>([]);

    // Submissions modal specific filters
    const [modalStudentSearch, setModalStudentSearch] = useState<string>('');
    const [modalStatusFilter, setModalStatusFilter] = useState<string>('all');
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [isBulkApproving, setIsBulkApproving] = useState<boolean>(false);

    // Initial Data Fetching
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
        if (calendars && calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            setSelectedAcademicYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedAcademicYear]);

    // Teacher's assigned mappings
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Class options for the selected academic year
    const classOptions = useMemo<ClassItemOption[]>(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYear);
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
    }, [myAssignments, selectedAcademicYear]);

    // Subject options based on selected class or all teacher subjects in year
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) {
            const yearAssignments = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYear);
            const subjectNames = Array.from(new Set(yearAssignments.map((m: any) => m.subject_name))).filter(Boolean);
            return subjectNames as string[];
        }
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectNamesForClass = myAssignments
            .filter(
                (m: any) =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map((m: any) => m.subject_name)
            .filter(Boolean);

        return Array.from(new Set(subjectNamesForClass)) as string[];
    }, [myAssignments, selectedAcademicYear, selectedClassKey]);

    // Map of homework_id -> array of reports
    const reportsByHomeworkId = useMemo(() => {
        const map = new Map<string, HomeworkReport[]>();
        (allReports || []).forEach(r => {
            if (r.homework_id) {
                const list = map.get(r.homework_id) || [];
                list.push(r);
                map.set(r.homework_id, list);
            }
        });
        return map;
    }, [allReports]);

    // Refresh reports in modal if Redux reports update
    useEffect(() => {
        if (viewingHomework && isStudentsModalVisible) {
            const latest = (allReports || []).filter(r => r.homework_id === viewingHomework.id);
            setStudentsForHomework(latest);
        }
    }, [allReports, viewingHomework, isStudentsModalVisible]);

    // Filtered homework list
    const filteredHomework = useMemo(() => {
        if (!homework) return [];
        let data = [...homework];

        // Academic year filter
        if (selectedAcademicYear) {
            data = data.filter(h => h.academic_year === selectedAcademicYear);
        }

        // Class filter
        if (selectedClassKey) {
            const [className, sectionName] = selectedClassKey.split('||');
            data = data.filter(h => h.class_name === className && h.section_name === sectionName);
        }

        // Subject filter
        if (selectedSubject) {
            data = data.filter(h => h.subject === selectedSubject);
        }

        // Date range filter
        if (dateRangeFilter === 'today') {
            const todayStr = dayjs().format('YYYY-MM-DD');
            data = data.filter(h => dayjs(h.homework_date).format('YYYY-MM-DD') === todayStr);
        } else if (dateRangeFilter === 'week') {
            const weekAgo = dayjs().subtract(7, 'day');
            data = data.filter(h => dayjs(h.homework_date).isAfter(weekAgo));
        } else if (dateRangeFilter === 'month') {
            const monthAgo = dayjs().subtract(30, 'day');
            data = data.filter(h => dayjs(h.homework_date).isAfter(monthAgo));
        }

        // Status filter (based on reports status)
        if (statusFilter !== 'all') {
            data = data.filter(h => {
                const reps = reportsByHomeworkId.get(h.id) || [];
                if (statusFilter === 'has_confirm') {
                    return reps.some(r => r.status === 'Confirm');
                }
                if (statusFilter === 'completed') {
                    return reps.length > 0 && reps.every(r => r.status === 'Completed');
                }
                if (statusFilter === 'pending') {
                    return reps.some(r => r.status === 'Pending');
                }
                return true;
            });
        }

        // Search Query
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            data = data.filter(h => {
                const subMatch = (h.subject || '').toLowerCase().includes(q);
                const classMatch = `class ${h.class_name} - ${h.section_name}`.toLowerCase().includes(q);
                const taskMatch = (h.homework_items || []).some(item =>
                    (item || '').toLowerCase().includes(q)
                );
                const dateMatch = dayjs(h.homework_date).format('DD MMM YYYY').toLowerCase().includes(q);
                return subMatch || classMatch || taskMatch || dateMatch;
            });
        }

        return data.sort((a, b) => dayjs(b.homework_date).valueOf() - dayjs(a.homework_date).valueOf());
    }, [homework, selectedAcademicYear, selectedClassKey, selectedSubject, dateRangeFilter, statusFilter, searchQuery, reportsByHomeworkId]);

    // Direct student submissions list across all filtered homework
    const filteredAllSubmissions = useMemo(() => {
        let list = [...(allReports || [])];

        if (selectedAcademicYear) {
            list = list.filter(r => r.academic_year === selectedAcademicYear);
        }

        if (selectedClassKey) {
            const [className, sectionName] = selectedClassKey.split('||');
            list = list.filter(r => r.class_name === className && r.section_name === sectionName);
        }

        if (selectedSubject) {
            list = list.filter(r => r.subject === selectedSubject);
        }

        // Date range filter
        if (dateRangeFilter === 'today') {
            const todayStr = dayjs().format('YYYY-MM-DD');
            list = list.filter(r => dayjs(r.homework_date || r.created_at).format('YYYY-MM-DD') === todayStr);
        } else if (dateRangeFilter === 'week') {
            const weekAgo = dayjs().subtract(7, 'day');
            list = list.filter(r => dayjs(r.homework_date || r.created_at).isAfter(weekAgo));
        } else if (dateRangeFilter === 'month') {
            const monthAgo = dayjs().subtract(30, 'day');
            list = list.filter(r => dayjs(r.homework_date || r.created_at).isAfter(monthAgo));
        }

        if (statusFilter !== 'all') {
            if (statusFilter === 'has_confirm') {
                list = list.filter(r => r.status === 'Confirm');
            } else if (statusFilter === 'completed') {
                list = list.filter(r => r.status === 'Completed');
            } else if (statusFilter === 'pending') {
                list = list.filter(r => r.status === 'Pending');
            } else if (statusFilter === 'cancel') {
                list = list.filter(r => r.status === 'Cancel');
            }
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(r => {
                const nameMatch = (r.student_name || '').toLowerCase().includes(q);
                const rollMatch = (r.roll_no || '').toLowerCase().includes(q);
                const regMatch = (r.register_no || '').toLowerCase().includes(q);
                const subMatch = (r.subject || '').toLowerCase().includes(q);
                const classMatch = `${r.class_name} ${r.section_name}`.toLowerCase().includes(q);
                return nameMatch || rollMatch || regMatch || subMatch || classMatch;
            });
        }

        return list.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf());
    }, [allReports, selectedAcademicYear, selectedClassKey, selectedSubject, dateRangeFilter, statusFilter, searchQuery]);

    // Metrics for Dashboard Banner
    const metrics = useMemo(() => {
        const totalHomework = filteredHomework.length;
        const totalReports = (allReports || []).filter(r =>
            !selectedAcademicYear || r.academic_year === selectedAcademicYear
        );
        const completedReports = totalReports.filter(r => r.status === 'Completed').length;
        const confirmReports = totalReports.filter(r => r.status === 'Confirm').length;
        const pendingReports = totalReports.filter(r => r.status === 'Pending').length;
        const completionRate = totalReports.length > 0
            ? Math.round((completedReports / totalReports.length) * 100)
            : 0;

        return {
            totalHomework,
            totalSubmissions: totalReports.length,
            completedReports,
            confirmReports,
            pendingReports,
            completionRate,
        };
    }, [filteredHomework, allReports, selectedAcademicYear]);

    // Reset all filters
    const handleResetFilters = () => {
        setSelectedClassKey(null);
        setSelectedSubject(null);
        setStatusFilter('all');
        setDateRangeFilter('all');
        setSearchQuery('');
    };

    // Open Tasks View Modal
    const handleViewClick = (record: Homework) => {
        setViewingHomework(record);
        setIsViewModalVisible(true);
    };

    // Open Submissions Modal for a specific Homework
    const handleViewStudentsClick = (record: Homework) => {
        const relatedReports = (allReports || []).filter(report => report.homework_id === record.id);
        setStudentsForHomework(relatedReports);
        setViewingHomework(record);
        setModalStudentSearch('');
        setModalStatusFilter('all');
        setIsStudentsModalVisible(true);
    };

    // Handle single status update
    const handleStatusUpdate = async (reportId: string, status: 'Completed' | 'Cancel') => {
        setUpdatingStatusId(reportId);
        try {
            dispatch(updateHomeworkReportStatusRequest({ reportId, status }));
            setStudentsForHomework(prev =>
                prev.map(s => (s.id === reportId ? { ...s, status } : s))
            );
            message.success(
                status === 'Completed'
                    ? 'Submission marked as Completed!'
                    : 'Submission marked as Cancelled.'
            );
        } catch {
            message.error('Failed to update submission status');
        } finally {
            setUpdatingStatusId(null);
        }
    };

    // Bulk approve all 'Confirm' submissions for viewingHomework
    const handleBulkApproveConfirm = async () => {
        const confirmList = studentsForHomework.filter(s => s.status === 'Confirm');
        if (confirmList.length === 0) {
            message.info('No submissions awaiting confirmation.');
            return;
        }

        setIsBulkApproving(true);
        try {
            for (const item of confirmList) {
                dispatch(updateHomeworkReportStatusRequest({ reportId: item.id, status: 'Completed' }));
            }
            setStudentsForHomework(prev =>
                prev.map(s => (s.status === 'Confirm' ? { ...s, status: 'Completed' } : s))
            );
            message.success(`Approved ${confirmList.length} submissions successfully!`);
        } catch {
            message.error('Error occurred while bulk approving submissions.');
        } finally {
            setIsBulkApproving(false);
        }
    };

    // Copy homework tasks to clipboard (WhatsApp/SMS formatted)
    const handleCopyHomework = (record: Homework) => {
        const dateStr = dayjs(record.homework_date).format('DD MMM YYYY');
        const tasksStr = (record.homework_items || [])
            .map((t, idx) => `${idx + 1}. ${t}`)
            .join('\n');
        const textToCopy = `📝 *HOMEWORK ASSIGNMENT*\n📅 Date: ${dateStr}\n🏫 Class: ${record.class_name} - ${record.section_name}\n📚 Subject: ${record.subject}\n\n*Tasks:*\n${tasksStr}\n\n_Generated from Sri Gayathri Portal_`;

        navigator.clipboard
            .writeText(textToCopy)
            .then(() => {
                message.success('Homework assignment text copied to clipboard!');
            })
            .catch(() => {
                message.info('Could not copy automatically. You can copy from the details modal.');
            });
    };

    // Export Submissions for this Homework to Excel
    const handleExportModalSubmissions = () => {
        if (!viewingHomework || studentsForHomework.length === 0) {
            message.warning('No student submissions available to export.');
            return;
        }

        const dataToExport = studentsForHomework.map((item, idx) => ({
            'S.No': idx + 1,
            'Roll No': item.roll_no || 'N/A',
            'Register No': item.register_no || 'N/A',
            'Student Name': item.student_name || 'N/A',
            'Class': `${item.class_name} - ${item.section_name}`,
            'Subject': item.subject,
            'Homework Date': dayjs(item.homework_date).format('DD/MM/YYYY'),
            'Submission Status': item.status,
            'Viewed / Submitted At': dayjs(item.created_at).format('DD/MM/YYYY hh:mm A'),
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Submissions');
        const fileName = `Homework_${viewingHomework.subject}_Class${viewingHomework.class_name}_${dayjs(viewingHomework.homework_date).format('YYYYMMDD')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        message.success('Student submission report downloaded successfully!');
    };

    // Export All Homework Entries in Tab 1 to Excel
    const handleExportHomeworkList = () => {
        if (filteredHomework.length === 0) {
            message.warning('No homework records available to export.');
            return;
        }

        const dataToExport = filteredHomework.map((item, idx) => {
            const reports = reportsByHomeworkId.get(item.id) || [];
            const completedCount = reports.filter(r => r.status === 'Completed').length;
            const confirmCount = reports.filter(r => r.status === 'Confirm').length;
            const percent = reports.length > 0 ? Math.round((completedCount / reports.length) * 100) : 0;

            return {
                'S.No': idx + 1,
                'Assigned Date': dayjs(item.homework_date).format('DD/MM/YYYY'),
                'Academic Year': item.academic_year || 'N/A',
                'Class': item.class_name,
                'Section': item.section_name,
                'Subject': item.subject,
                'Tasks': (item.homework_items || []).join('; '),
                'Total Submissions': reports.length,
                'Completed': completedCount,
                'Awaiting Review': confirmCount,
                'Completion Rate (%)': `${percent}%`,
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Homework_List');
        const fileName = `Homework_History_${selectedAcademicYear || 'All'}_${dayjs().format('YYYYMMDD')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        message.success('Homework assignments list exported to Excel!');
    };

    // Export All Submissions in Tab 2 to Excel
    const handleExportAllSubmissions = () => {
        if (filteredAllSubmissions.length === 0) {
            message.warning('No student submissions available to export.');
            return;
        }

        const dataToExport = filteredAllSubmissions.map((item, idx) => ({
            'S.No': idx + 1,
            'Roll No': item.roll_no || 'N/A',
            'Register No': item.register_no || 'N/A',
            'Student Name': item.student_name || 'N/A',
            'Class': item.class_name || 'N/A',
            'Section': item.section_name || 'N/A',
            'Subject': item.subject || 'N/A',
            'Assigned Date': dayjs(item.homework_date).format('DD/MM/YYYY'),
            'Submission Status': item.status,
            'Viewed / Submitted At': dayjs(item.created_at).format('DD/MM/YYYY hh:mm A'),
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'All_Submissions');
        const fileName = `Student_Submissions_${selectedAcademicYear || 'All'}_${dayjs().format('YYYYMMDD')}.xlsx`;
        XLSX.writeFile(wb, fileName);
        message.success('All student submissions exported to Excel!');
    };

    // Filtered students inside modal
    const filteredModalStudents = useMemo(() => {
        let list = [...studentsForHomework];
        if (modalStatusFilter !== 'all') {
            list = list.filter(s => s.status === modalStatusFilter);
        }
        if (modalStudentSearch.trim()) {
            const q = modalStudentSearch.toLowerCase().trim();
            list = list.filter(
                s =>
                    (s.student_name || '').toLowerCase().includes(q) ||
                    (s.roll_no || '').toLowerCase().includes(q) ||
                    (s.register_no || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [studentsForHomework, modalStatusFilter, modalStudentSearch]);

    // Counts inside modal
    const modalCounts = useMemo(() => {
        const total = studentsForHomework.length;
        const completed = studentsForHomework.filter(s => s.status === 'Completed').length;
        const confirm = studentsForHomework.filter(s => s.status === 'Confirm').length;
        const cancel = studentsForHomework.filter(s => s.status === 'Cancel').length;
        const pending = studentsForHomework.filter(s => s.status === 'Pending').length;
        return { total, completed, confirm, cancel, pending };
    }, [studentsForHomework]);

    // Table Columns for Homework Entries
    const historyColumns: ColumnsType<Homework> = [
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
            title: 'Tasks Overview',
            key: 'tasks',
            render: (_, record) => {
                const items = record.homework_items || [];
                const firstTask = items[0] || 'No tasks specified';
                return (
                    <div className="flex flex-col gap-1 max-w-sm">
                        <span className="text-xs text-slate-700 line-clamp-1">
                            <span className="font-bold text-slate-400 mr-1">1.</span>
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
            title: 'Submissions & Status',
            key: 'submissions_progress',
            width: 220,
            render: (_, record) => {
                const reports = reportsByHomeworkId.get(record.id) || [];
                const completed = reports.filter(r => r.status === 'Completed').length;
                const confirm = reports.filter(r => r.status === 'Confirm').length;
                const total = reports.length;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">
                                {total} {total === 1 ? 'submission' : 'submissions'}
                            </span>
                            <span className="text-slate-400 text-[11px] font-medium">{percent}% completed</span>
                        </div>
                        <Progress
                            percent={percent}
                            size="small"
                            showInfo={false}
                            strokeColor={percent === 100 ? '#10b981' : '#3b82f6'}
                        />
                        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <Tag color="success" className="text-[10px] m-0 px-1 py-0 rounded">
                                {completed} Done
                            </Tag>
                            {confirm > 0 && (
                                <Tag color="warning" className="text-[10px] m-0 px-1 py-0 rounded animate-pulse">
                                    {confirm} Review
                                </Tag>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 210,
            align: 'right',
            render: (_, record) => {
                const reports = reportsByHomeworkId.get(record.id) || [];
                const confirmCount = reports.filter(r => r.status === 'Confirm').length;

                return (
                    <div className="flex items-center justify-end gap-1.5">
                        <Tooltip title="View Questions & Tasks">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => handleViewClick(record)}
                                className="text-xs inline-flex items-center text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-400"
                            >
                                Questions
                            </Button>
                        </Tooltip>
                        <Tooltip title="View Student Submissions">
                            <Badge count={confirmCount} offset={[-3, 3]} size="small">
                                <Button
                                    size="small"
                                    type="primary"
                                    icon={<TeamOutlined />}
                                    onClick={() => handleViewStudentsClick(record)}
                                    className="text-xs inline-flex items-center bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Submissions ({reports.length})
                                </Button>
                            </Badge>
                        </Tooltip>
                        <Tooltip title="Copy WhatsApp Text">
                            <Button
                                size="small"
                                icon={<CopyOutlined />}
                                onClick={() => handleCopyHomework(record)}
                                className="text-xs text-slate-600 hover:text-slate-800 border-slate-200"
                            />
                        </Tooltip>
                    </div>
                );
            },
        },
    ];

    // Table Columns for Student Submissions (inside modal and direct tab)
    const studentSubmissionColumns: ColumnsType<HomeworkReport> = [
        {
            title: 'Roll No',
            dataIndex: 'roll_no',
            key: 'roll_no',
            width: 85,
            align: 'center',
            render: text => <span className="font-semibold text-slate-700 text-xs">{text || 'N/A'}</span>,
        },
        {
            title: 'Register No',
            dataIndex: 'register_no',
            key: 'register_no',
            width: 120,
            render: text => <span className="font-mono text-xs font-semibold text-blue-600">{text || 'N/A'}</span>,
        },
        {
            title: 'Student Name',
            dataIndex: 'student_name',
            key: 'student_name',
            render: text => (
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 border border-blue-100">
                        {text ? text.charAt(0).toUpperCase() : <UserOutlined />}
                    </div>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm">{text || 'Unknown Student'}</span>
                </div>
            ),
        },
        {
            title: 'Viewed / Submitted',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 170,
            render: date => (
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <ClockCircleOutlined className="text-slate-400" />
                    <span>{dayjs(date).format('DD MMM YYYY, hh:mm A')}</span>
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status: string) => {
                if (status === 'Completed') {
                    return (
                        <Tag color="success" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckOutlined /> Completed
                        </Tag>
                    );
                }
                if (status === 'Cancel') {
                    return (
                        <Tag color="error" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CloseOutlined /> Cancelled
                        </Tag>
                    );
                }
                if (status === 'Confirm') {
                    return (
                        <Tag color="warning" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                            <ExclamationCircleOutlined /> Review
                        </Tag>
                    );
                }
                return (
                    <Tag className="font-semibold px-2 py-0.5 rounded-full">
                        {status || 'Pending'}
                    </Tag>
                );
            },
        },
        {
            title: 'Teacher Action',
            key: 'action',
            width: 170,
            align: 'right',
            render: (_: any, record: HomeworkReport) => {
                const isUpdating = updatingStatusId === record.id;

                if (record.status === 'Completed') {
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <Tag color="success" className="m-0 text-xs">Verified</Tag>
                            <Tooltip title="Cancel or Reset Status">
                                <Popconfirm
                                    title="Revoke Completion"
                                    description="Do you want to cancel this completion status?"
                                    okText="Yes, Cancel"
                                    cancelText="No"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleStatusUpdate(record.id, 'Cancel')}
                                >
                                    <Button size="small" type="text" danger icon={<CloseOutlined />} />
                                </Popconfirm>
                            </Tooltip>
                        </div>
                    );
                }

                if (record.status === 'Cancel') {
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <Tag color="error" className="m-0 text-xs">Cancelled</Tag>
                            <Tooltip title="Mark as Completed">
                                <Popconfirm
                                    title="Restore & Complete"
                                    description="Are you sure you want to mark this homework as completed?"
                                    okText="Yes, Complete"
                                    cancelText="No"
                                    onConfirm={() => handleStatusUpdate(record.id, 'Completed')}
                                >
                                    <Button size="small" type="text" className="text-emerald-600 hover:text-emerald-700" icon={<CheckOutlined />} />
                                </Popconfirm>
                            </Tooltip>
                        </div>
                    );
                }

                // Default Confirm or Pending status
                return (
                    <Space size="small">
                        <Tooltip title="Approve & Mark as Completed">
                            <Popconfirm
                                title="Confirm Homework Completion"
                                description="Are you sure you want to mark this student's homework as completed?"
                                okText="Yes, Approve"
                                cancelText="Cancel"
                                onConfirm={() => handleStatusUpdate(record.id, 'Completed')}
                            >
                                <Button
                                    size="small"
                                    loading={isUpdating}
                                    icon={<CheckOutlined />}
                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 font-medium inline-flex items-center"
                                >
                                    Approve
                                </Button>
                            </Popconfirm>
                        </Tooltip>
                        <Tooltip title="Cancel Submission">
                            <Popconfirm
                                title="Cancel Submission"
                                description="This will mark the submission as cancelled. Continue?"
                                okText="Yes, Cancel"
                                cancelText="Dismiss"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleStatusUpdate(record.id, 'Cancel')}
                            >
                                <Button
                                    size="small"
                                    danger
                                    loading={isUpdating}
                                    icon={<CloseOutlined />}
                                    className="inline-flex items-center"
                                />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    // Table Columns for All Submissions Master Table (Tab 2)
    const allSubmissionsColumns: ColumnsType<HomeworkReport> = [
        {
            title: '#',
            key: 'index',
            width: 50,
            align: 'center',
            render: (_t, _r, index) => (
                <span className="font-semibold text-slate-400 text-xs">{index + 1}</span>
            ),
        },
        {
            title: 'Student Details',
            key: 'student',
            render: (_, record) => {
                const name = record.student_name || 'Unknown Student';
                const initial = name.charAt(0).toUpperCase();
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 border border-blue-200">
                            {initial || <UserOutlined />}
                        </div>
                        <div>
                            <div className="font-bold text-slate-800 text-xs sm:text-sm">{name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-blue-600 font-medium">Reg: {record.register_no || 'N/A'}</span>
                                {record.roll_no && <span>• Roll: {record.roll_no}</span>}
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Class & Section',
            key: 'class_section',
            width: 140,
            render: (_, record) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Class {record.class_name} - {record.section_name}
                </span>
            ),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            width: 150,
            render: subject => (
                <div className="flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                    <BookOutlined className="text-indigo-500" />
                    <span>{subject}</span>
                </div>
            ),
        },
        {
            title: 'Assigned Date',
            dataIndex: 'homework_date',
            key: 'homework_date',
            width: 130,
            render: date => (
                <div className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                    <CalendarOutlined className="text-slate-400" />
                    <span>{dayjs(date).format('DD MMM YYYY')}</span>
                </div>
            ),
        },
        {
            title: 'Viewed / Submitted',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 160,
            render: date => (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <ClockCircleOutlined className="text-slate-400" />
                    <span>{dayjs(date).format('DD MMM, hh:mm A')}</span>
                </div>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => {
                if (status === 'Completed') {
                    return (
                        <Tag color="success" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckOutlined /> Completed
                        </Tag>
                    );
                }
                if (status === 'Cancel') {
                    return (
                        <Tag color="error" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CloseOutlined /> Cancelled
                        </Tag>
                    );
                }
                if (status === 'Confirm') {
                    return (
                        <Tag color="warning" className="font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse">
                            <ExclamationCircleOutlined /> Review
                        </Tag>
                    );
                }
                return (
                    <Tag className="font-semibold px-2 py-0.5 rounded-full">
                        {status || 'Pending'}
                    </Tag>
                );
            },
        },
        {
            title: 'Teacher Action',
            key: 'action',
            width: 170,
            align: 'right',
            render: (_: any, record: HomeworkReport) => {
                const isUpdating = updatingStatusId === record.id;

                if (record.status === 'Completed') {
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <Tag color="success" className="m-0 text-xs">Verified</Tag>
                            <Tooltip title="Cancel or Reset Status">
                                <Popconfirm
                                    title="Revoke Completion"
                                    description="Do you want to cancel this completion status?"
                                    okText="Yes, Cancel"
                                    cancelText="No"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={() => handleStatusUpdate(record.id, 'Cancel')}
                                >
                                    <Button size="small" type="text" danger icon={<CloseOutlined />} />
                                </Popconfirm>
                            </Tooltip>
                        </div>
                    );
                }

                if (record.status === 'Cancel') {
                    return (
                        <div className="flex items-center justify-end gap-1">
                            <Tag color="error" className="m-0 text-xs">Cancelled</Tag>
                            <Tooltip title="Mark as Completed">
                                <Popconfirm
                                    title="Restore & Complete"
                                    description="Are you sure you want to mark this homework as completed?"
                                    okText="Yes, Complete"
                                    cancelText="No"
                                    onConfirm={() => handleStatusUpdate(record.id, 'Completed')}
                                >
                                    <Button size="small" type="text" className="text-emerald-600 hover:text-emerald-700" icon={<CheckOutlined />} />
                                </Popconfirm>
                            </Tooltip>
                        </div>
                    );
                }

                return (
                    <Space size="small">
                        <Tooltip title="Approve & Mark as Completed">
                            <Popconfirm
                                title="Confirm Homework Completion"
                                description="Are you sure you want to mark this student's homework as completed?"
                                okText="Yes, Approve"
                                cancelText="Cancel"
                                onConfirm={() => handleStatusUpdate(record.id, 'Completed')}
                            >
                                <Button
                                    size="small"
                                    loading={isUpdating}
                                    icon={<CheckOutlined />}
                                    className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300 font-medium inline-flex items-center"
                                >
                                    Approve
                                </Button>
                            </Popconfirm>
                        </Tooltip>
                        <Tooltip title="Cancel Submission">
                            <Popconfirm
                                title="Cancel Submission"
                                description="This will mark the submission as cancelled. Continue?"
                                okText="Yes, Cancel"
                                cancelText="Dismiss"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleStatusUpdate(record.id, 'Cancel')}
                            >
                                <Button
                                    size="small"
                                    danger
                                    loading={isUpdating}
                                    icon={<CloseOutlined />}
                                    className="inline-flex items-center"
                                />
                            </Popconfirm>
                        </Tooltip>
                    </Space>
                );
            },
        },
    ];

    const isLoading = mappingsLoading || subjectsLoading || homeworkLoading || reportsLoading;
    const error = homeworkError || reportsError;

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
                            {selectedAcademicYear && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                                    <CalendarOutlined className="text-slate-400" />
                                    <span>Year: {selectedAcademicYear}</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Homework History & Submission Tracker</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Track past homework assignments, verify student submissions, approve completed tasks, and review assignment records.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            icon={<ReloadOutlined spin={isLoading} />}
                            onClick={() => {
                                if (user?.organization_key) {
                                    dispatch(fetchHomeworkRequest(user.organization_key));
                                    dispatch(fetchHomeworkReportsRequest({ organizationKey: user.organization_key }));
                                    message.success('Homework records refreshed.');
                                }
                            }}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Refresh
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => dispatch(setCurrentPage('homework'))}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-sm inline-flex items-center"
                        >
                            Assign New Homework
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
                        <span className="text-2xl font-bold text-slate-800">{metrics.totalHomework}</span>
                        <span className="text-xs text-slate-400">assignments</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Submissions
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                            <TeamOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.totalSubmissions}</span>
                        <span className="text-xs text-slate-400">student views</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Completed
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                            <CheckCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{metrics.completedReports}</span>
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
                            {metrics.completionRate}%
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Action Required
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <ExclamationCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-amber-600">{metrics.confirmReports}</span>
                        <span className="text-xs text-slate-400">awaiting review</span>
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
                                onChange={val => {
                                    setSelectedAcademicYear(val);
                                    setSelectedClassKey(null);
                                    setSelectedSubject(null);
                                }}
                                loading={mappingsLoading}
                            >
                                {(calendars || []).map((cal: any) => (
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
                                value={selectedClassKey}
                                onChange={val => {
                                    setSelectedClassKey(val);
                                    setSelectedSubject(null);
                                }}
                                allowClear
                                disabled={!selectedAcademicYear}
                                filterOption={(input, option) =>
                                    ((option?.label as string) || '').toLowerCase().includes(input.toLowerCase())
                                }
                                options={classOptions.map(opt => ({
                                    value: opt.key,
                                    label: opt.label,
                                }))}
                            />
                        </div>

                        {/* Subject Filter */}
                        <div className="w-full sm:w-auto min-w-[160px]">
                            <Select
                                showSearch
                                placeholder="All Subjects"
                                className="w-full"
                                value={selectedSubject}
                                onChange={val => setSelectedSubject(val)}
                                allowClear
                                disabled={subjectOptions.length === 0}
                            >
                                {subjectOptions.map(sub => (
                                    <Option key={sub} value={sub}>
                                        <span className="flex items-center gap-1.5">
                                            <BookOutlined className="text-indigo-400" />
                                            <span>{sub}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Date Range Filter */}
                        <div className="w-full sm:w-auto min-w-[130px]">
                            <Select
                                placeholder="Date Range"
                                className="w-full"
                                value={dateRangeFilter}
                                onChange={val => setDateRangeFilter(val)}
                            >
                                <Option value="all">All Dates</Option>
                                <Option value="today">Today</Option>
                                <Option value="week">Past 7 Days</Option>
                                <Option value="month">Past 30 Days</Option>
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div className="w-full sm:w-auto min-w-[140px]">
                            <Select
                                placeholder="Status"
                                className="w-full"
                                value={statusFilter}
                                onChange={val => setStatusFilter(val)}
                            >
                                <Option value="all">All Statuses</Option>
                                <Option value="has_confirm">⚠️ Awaiting Review</Option>
                                <Option value="completed">✅ Completed</Option>
                                <Option value="pending">⏳ Pending</Option>
                                <Option value="cancel">❌ Cancelled</Option>
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto sm:flex-1 min-w-[200px]">
                            <Input
                                placeholder="Search by subject, task or student..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                            />
                        </div>

                        {/* Reset Filter Button */}
                        {(selectedClassKey || selectedSubject || statusFilter !== 'all' || dateRangeFilter !== 'all' || searchQuery) && (
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleResetFilters}
                                className="text-slate-600 border-slate-200 text-xs"
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    {/* View & Tab Controls */}
                    <div className="flex items-center gap-2 self-end md:self-auto">
                        <Segmented
                            value={activeTab}
                            onChange={(val: any) => setActiveTab(val)}
                            options={[
                                { label: 'Homework List', value: 'assignments', icon: <OrderedListOutlined /> },
                                { label: 'All Submissions', value: 'submissions', icon: <TeamOutlined /> },
                            ]}
                            className="bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold"
                        />

                        {activeTab === 'assignments' && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportHomeworkList}
                                    disabled={filteredHomework.length === 0}
                                    className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-700 border-slate-200 hover:border-blue-500 rounded-xl"
                                    title="Export Homework List to Excel"
                                >
                                    Export
                                </Button>
                                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                                        <span className="hidden sm:inline">Cards</span>
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
                                        <span className="hidden sm:inline">Table</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Error banner if any */}
            {error && (
                <Alert
                    message="Error Loading Homework History"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    className="rounded-xl"
                />
            )}

            {/* 4. Main Content Area */}
            <Spin spinning={isLoading} tip="Loading homework history & submissions...">
                {activeTab === 'assignments' ? (
                    /* TAB 1: HOMEWORK ASSIGNMENTS VIEW */
                    filteredHomework.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                            <Empty
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                description={
                                    <div className="space-y-1 mt-2">
                                        <p className="text-base font-semibold text-slate-700">
                                            No Homework Assignments Found
                                        </p>
                                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                                            {searchQuery || selectedClassKey || selectedSubject || statusFilter !== 'all'
                                                ? 'No homework entries matched your selected filter criteria. Try clearing or relaxing the filters.'
                                                : 'No past homework assignments have been recorded yet for this academic year. Click below to assign one.'}
                                        </p>
                                    </div>
                                }
                            >
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => dispatch(setCurrentPage('homework'))}
                                    className="bg-blue-600 hover:bg-blue-700 mt-2 font-medium"
                                >
                                    Create New Homework
                                </Button>
                            </Empty>
                        </div>
                    ) : viewMode === 'cards' ? (
                        /* CARDS VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                            {filteredHomework.map(item => {
                                const isToday = dayjs(item.homework_date).isSame(dayjs(), 'day');
                                const tasks = item.homework_items || [];
                                const reports = reportsByHomeworkId.get(item.id) || [];
                                const completedCount = reports.filter(r => r.status === 'Completed').length;
                                const confirmCount = reports.filter(r => r.status === 'Confirm').length;
                                const totalReports = reports.length;
                                const percent = totalReports > 0 ? Math.round((completedCount / totalReports) * 100) : 0;

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
                                                    <span>Tasks Overview</span>
                                                    <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                                                        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                                    </span>
                                                </div>
                                                {tasks.slice(0, 2).map((task, idx) => (
                                                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                                                        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="line-clamp-1 leading-relaxed">
                                                            {task}
                                                        </span>
                                                    </div>
                                                ))}
                                                {tasks.length > 2 && (
                                                    <div className="text-[11px] text-blue-600 font-semibold pt-0.5">
                                                        + {tasks.length - 2} more tasks...
                                                    </div>
                                                )}
                                            </div>

                                            {/* Submission Progress Bar & Indicators */}
                                            <div className="bg-slate-50/50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                                                        <TeamOutlined className="text-slate-400" />
                                                        <span>{totalReports} Submissions</span>
                                                    </span>
                                                    <span className="text-slate-500 text-[11px] font-medium">
                                                        {percent}% Done
                                                    </span>
                                                </div>
                                                <Progress
                                                    percent={percent}
                                                    size="small"
                                                    strokeColor={percent === 100 ? '#10b981' : '#3b82f6'}
                                                    showInfo={false}
                                                />
                                                <div className="flex items-center justify-between text-[11px] pt-1">
                                                    <span className="text-emerald-700 font-semibold">
                                                        {completedCount} Completed
                                                    </span>
                                                    {confirmCount > 0 ? (
                                                        <span className="text-amber-600 font-bold animate-pulse">
                                                            {confirmCount} Review Required
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">All cleared</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Action Footer */}
                                        <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <Tooltip title="View Tasks List">
                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => handleViewClick(item)}
                                                        className="text-xs inline-flex items-center bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                    >
                                                        Tasks
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

                                            <Badge count={confirmCount} offset={[-2, 2]} size="small">
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={<TeamOutlined />}
                                                    onClick={() => handleViewStudentsClick(item)}
                                                    className="text-xs inline-flex items-center bg-indigo-600 hover:bg-indigo-700 font-medium"
                                                >
                                                    Submissions ({totalReports})
                                                </Button>
                                            </Badge>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* TABLE VIEW */
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <Table
                                columns={historyColumns}
                                dataSource={filteredHomework}
                                rowKey="id"
                                pagination={{
                                    pageSize: 10,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['10', '20', '50'],
                                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} assignments`,
                                }}
                                scroll={{ x: 'max-content' }}
                            />
                        </div>
                    )
                ) : (
                    /* TAB 2: ALL STUDENT SUBMISSIONS MASTER TABLE */
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">
                                    All Student Submissions ({filteredAllSubmissions.length})
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Real-time feed of all student views and completion confirmations across subjects.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleExportAllSubmissions}
                                    disabled={filteredAllSubmissions.length === 0}
                                    className="text-xs font-medium text-slate-700 border-slate-200 rounded-xl inline-flex items-center gap-1"
                                >
                                    Export Excel
                                </Button>
                                {filteredAllSubmissions.some(s => s.status === 'Confirm') && (
                                    <Popconfirm
                                        title="Approve All Confirmations"
                                        description="Are you sure you want to approve all displayed submissions awaiting review?"
                                        okText="Yes, Approve All"
                                        cancelText="Cancel"
                                        onConfirm={async () => {
                                            const confirmList = filteredAllSubmissions.filter(s => s.status === 'Confirm');
                                            for (const item of confirmList) {
                                                dispatch(updateHomeworkReportStatusRequest({ reportId: item.id, status: 'Completed' }));
                                            }
                                            message.success(`Approved ${confirmList.length} submissions!`);
                                        }}
                                    >
                                        <Button
                                            type="primary"
                                            icon={<CheckOutlined />}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
                                        >
                                            Approve All Confirmations
                                        </Button>
                                    </Popconfirm>
                                )}
                            </div>
                        </div>

                        <Table
                            columns={allSubmissionsColumns}
                            dataSource={filteredAllSubmissions}
                            rowKey="id"
                            pagination={{
                                pageSize: 15,
                                showSizeChanger: true,
                                pageSizeOptions: ['15', '30', '50'],
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} submissions`,
                            }}
                            scroll={{ x: 'max-content' }}
                            locale={{
                                emptyText: (
                                    <Empty
                                        description="No student submissions found matching the criteria."
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    />
                                ),
                            }}
                        />
                    </div>
                )}
            </Spin>

            {/* MODAL 1: Homework Questions & Tasks Details */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            <BookOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                Homework Details & Tasks
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                {viewingHomework?.subject} • Class {viewingHomework?.class_name} - {viewingHomework?.section_name}
                            </span>
                        </div>
                    </div>
                }
                open={isViewModalVisible}
                onCancel={() => setIsViewModalVisible(false)}
                footer={[
                    <Button
                        key="copy"
                        icon={<CopyOutlined />}
                        onClick={() => viewingHomework && handleCopyHomework(viewingHomework)}
                    >
                        Copy WhatsApp Format
                    </Button>,
                    <Button
                        key="submissions"
                        type="primary"
                        icon={<TeamOutlined />}
                        onClick={() => {
                            setIsViewModalVisible(false);
                            if (viewingHomework) handleViewStudentsClick(viewingHomework);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        View Student Submissions
                    </Button>,
                    <Button key="close" onClick={() => setIsViewModalVisible(false)}>
                        Close
                    </Button>,
                ]}
                width={650}
                className="rounded-2xl"
            >
                {viewingHomework && (
                    <div className="space-y-4 py-2">
                        {/* Info Header Badges */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Date:</span>
                                <span className="font-bold text-slate-700">
                                    {dayjs(viewingHomework.homework_date).format('DD MMM YYYY')}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Class:</span>
                                <span className="font-bold text-slate-700">
                                    {viewingHomework.class_name} - {viewingHomework.section_name}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Subject:</span>
                                <span className="font-bold text-slate-700">{viewingHomework.subject}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Academic Year:</span>
                                <span className="font-bold text-slate-700">{viewingHomework.academic_year}</span>
                            </div>
                        </div>

                        {/* Tasks Checklist */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-bold text-xs uppercase text-slate-500 tracking-wider">
                                    Assigned Tasks Checklist
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    {viewingHomework.homework_items?.length || 0} Tasks
                                </span>
                            </div>

                            <List
                                bordered
                                dataSource={viewingHomework.homework_items || []}
                                className="rounded-xl overflow-hidden bg-white border-slate-200"
                                renderItem={(item, index) => (
                                    <List.Item className="hover:bg-slate-50 transition-colors">
                                        <div className="flex items-start gap-3 w-full">
                                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                                {index + 1}
                                            </span>
                                            <span className="text-xs sm:text-sm text-slate-800 flex-1 leading-relaxed">
                                                {item}
                                            </span>
                                            <Tooltip title="Copy Task">
                                                <Button
                                                    size="small"
                                                    type="text"
                                                    icon={<CopyOutlined className="text-slate-400 hover:text-blue-600" />}
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(item);
                                                        message.success('Task copied!');
                                                    }}
                                                />
                                            </Tooltip>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL 2: Student Submissions & Status Management */}
            <Modal
                title={
                    <div className="flex items-center justify-between pr-6 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                                <TeamOutlined />
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 text-base">
                                    Student Submissions & Status
                                </span>
                                <span className="block text-xs font-medium text-slate-400">
                                    {viewingHomework?.subject} • Class {viewingHomework?.class_name} - {viewingHomework?.section_name} •{' '}
                                    {dayjs(viewingHomework?.homework_date).format('DD MMM YYYY')}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={handleExportModalSubmissions}
                                className="text-xs"
                            >
                                Export Excel
                            </Button>
                        </div>
                    </div>
                }
                open={isStudentsModalVisible}
                onCancel={() => setIsStudentsModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsStudentsModalVisible(false)}>
                        Close
                    </Button>,
                ]}
                width={880}
                className="rounded-2xl"
            >
                <div className="space-y-4 py-2">
                    {/* Modal Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                            <span className="text-xs text-slate-500">Total Viewed</span>
                            <span className="font-bold text-slate-800 text-sm">{modalCounts.total}</span>
                        </div>
                        <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
                            <span className="text-xs text-emerald-700">Completed</span>
                            <span className="font-bold text-emerald-700 text-sm">{modalCounts.completed}</span>
                        </div>
                        <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100 flex items-center justify-between">
                            <span className="text-xs text-amber-700">Awaiting Review</span>
                            <span className="font-bold text-amber-700 text-sm">{modalCounts.confirm}</span>
                        </div>
                        <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 flex items-center justify-between">
                            <span className="text-xs text-rose-700">Cancelled</span>
                            <span className="font-bold text-rose-700 text-sm">{modalCounts.cancel}</span>
                        </div>
                    </div>

                    {/* Filter and Bulk Action controls inside modal */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1">
                            <Input
                                placeholder="Search student name, roll no or reg no..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={modalStudentSearch}
                                onChange={e => setModalStudentSearch(e.target.value)}
                                allowClear
                                size="small"
                                className="w-full sm:max-w-xs rounded-lg"
                            />
                            <Select
                                value={modalStatusFilter}
                                onChange={val => setModalStatusFilter(val)}
                                size="small"
                                className="w-36"
                            >
                                <Option value="all">All Statuses</Option>
                                <Option value="Confirm">Review ({modalCounts.confirm})</Option>
                                <Option value="Completed">Completed ({modalCounts.completed})</Option>
                                <Option value="Cancel">Cancelled ({modalCounts.cancel})</Option>
                                <Option value="Pending">Pending ({modalCounts.pending})</Option>
                            </Select>
                        </div>

                        {modalCounts.confirm > 0 && (
                            <Popconfirm
                                title="Approve All Confirmations"
                                description={`Approve ${modalCounts.confirm} submissions as completed?`}
                                okText="Yes, Approve All"
                                cancelText="Cancel"
                                onConfirm={handleBulkApproveConfirm}
                            >
                                <Button
                                    size="small"
                                    type="primary"
                                    loading={isBulkApproving}
                                    icon={<CheckOutlined />}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
                                >
                                    Approve All ({modalCounts.confirm})
                                </Button>
                            </Popconfirm>
                        )}
                    </div>

                    {/* Submissions Table */}
                    <Table
                        columns={studentSubmissionColumns}
                        dataSource={filteredModalStudents}
                        rowKey="id"
                        bordered
                        size="small"
                        scroll={{ x: 'max-content' }}
                        pagination={{
                            pageSize: 8,
                            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} students`,
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    description="No student submissions found."
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            ),
                        }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default HomeworkHistory;
