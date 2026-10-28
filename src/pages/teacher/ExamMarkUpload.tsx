/**
 * Teacher Exam Mark Upload & Evaluation Portal
 * Sri Gayathri SMS Portal
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Table,
    Spin,
    Alert,
    Row,
    Col,
    Select,
    Button,
    Empty,
    Form,
    message,
    InputNumber,
    Tag,
    Input,
    Progress,
} from 'antd';
import {
    SaveOutlined,
    ArrowLeftOutlined,
    FileExcelOutlined,
    SearchOutlined,
    CheckCircleOutlined,
    LockOutlined,
    UnlockOutlined,
    TrophyOutlined,
    TeamOutlined,
    CalendarOutlined,
    UserOutlined,
    SafetyCertificateOutlined,
} from '@ant-design/icons';
import * as XLSX from 'xlsx';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchExamTimetablesRequest } from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import {
    uploadExamMarksRequest,
    type StudentForExamMarks,
    type StudentMarkEntry,
    type UploadExamMarksPayload,
    fetchStudentsByClassRequest,
    fetchAllExamMarksRequest,
} from '../../store/features/exam-marks/examMarksSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';

const { Option } = Select;

type MarkEntry = { mark: number | null; status: 'Pass' | 'Fail' | 'Absent' };

const ExamMarkUpload: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: teacherDataLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { timetables, loading: timetablesLoading } = useSelector((state: RootState) => state.examTimetableAdmin);
    const { students, allMarks, loading: studentsLoading, error: studentsError } = useSelector((state: RootState) => state.examMarks);

    // Filters
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedExamTitle, setSelectedExamTitle] = useState<string | null>(null);

    // Interactive Table States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [isEditUnlocked, setIsEditUnlocked] = useState(false);
    const [marksState, setMarksState] = useState<Record<string, MarkEntry>>({});
    const [form] = Form.useForm();

    const initializedExamRef = useRef<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchAllExamMarksRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars.length > 0 && !selectedYear) {
            const currentYear = (calendars as { academic_year: string; is_current: boolean }[]).find(c => c.is_current)?.academic_year;
            setSelectedYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return (mappings as any[]).filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        if (!selectedYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: Map<string, { key: string; label: string }>, m: any) => {
            const key = `${m.class_name}||${m.section_name}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `${m.class_name} - ${m.section_name}`,
                });
            }
            return acc;
        }, new Map<string, { key: string; label: string }>());
        return Array.from(uniqueClasses.values());
    }, [myAssignments, selectedYear]);

    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) return [];
        const [className, sectionName] = selectedClassKey.split('||');
        return [...new Set(myAssignments.filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === selectedYear).map(m => m.subject_name))];
    }, [myAssignments, selectedClassKey, selectedYear]);

    const examTitleOptions = useMemo(() => {
        if (!selectedClassKey || !selectedSubject) return [];
        const [className, sectionName] = selectedClassKey.split('||');
        return [...new Set(timetables.filter(t => t.class_name === className && t.section_name === sectionName && t.academic_year === selectedYear && t.exam_days.some(d => d.subject === selectedSubject)).map(t => t.exam_title))];
    }, [timetables, selectedClassKey, selectedSubject, selectedYear]);

    useEffect(() => {
        if (selectedClassKey && selectedYear && user?.organization_key) {
            const [className, sectionName] = selectedClassKey.split('||');
            dispatch(fetchStudentsByClassRequest({
                organizationKey: user.organization_key,
                academicYear: selectedYear,
                className,
                sectionName,
            }));
        } else {
            dispatch({ type: 'examMarks/fetchStudentsByClassSuccess', payload: [] });
        }
    }, [dispatch, selectedClassKey, selectedYear, user?.organization_key]);

    const currentExam = useMemo(() => {
        if (!selectedClassKey || !selectedSubject || !selectedExamTitle) return null;
        const [className, sectionName] = selectedClassKey.split('||');
        const examTimetable = timetables.find(t => t.class_name === className && t.section_name === sectionName && t.academic_year === selectedYear && t.exam_title === selectedExamTitle);
        if (!examTimetable) return null;
        return {
            className,
            sectionName,
            subject: selectedSubject,
            examTitle: selectedExamTitle,
            totalMarks: examTimetable.exam_total_mark,
            examId: examTimetable.id,
            examDate: examTimetable.exam_days.find(d => d.subject === selectedSubject)?.examdate,
        };
    }, [selectedClassKey, selectedSubject, selectedExamTitle, timetables, selectedYear]);

    // Check if marks for this exam & subject are already submitted
    const existingMarksRecord = useMemo(() => {
        if (!currentExam) return null;
        return allMarks.find(mark =>
            mark.exam_id === currentExam.examId &&
            mark.subject === currentExam.subject
        );
    }, [allMarks, currentExam]);

    const isRecordLocked = Boolean(existingMarksRecord) && !isEditUnlocked;

    // Pre-fill form when students or exam change
    const currentExamKey = currentExam ? `${currentExam.examId}_${currentExam.subject}` : null;

    useEffect(() => {
        if (students.length > 0 && currentExam && currentExamKey) {
            const initialFormValues: Record<string, MarkEntry> = {};

            if (existingMarksRecord) {
                existingMarksRecord.student_marks.forEach(sm => {
                    initialFormValues[sm.student_id] = {
                        mark: sm.get_mark,
                        status: sm.status,
                    };
                });
            } else {
                students.forEach(student => {
                    initialFormValues[student.id] = {
                        mark: null,
                        status: 'Pass',
                    };
                });
            }

            form.setFieldsValue({ marks: initialFormValues });
            setMarksState(initialFormValues);
            initializedExamRef.current = currentExamKey;
        } else if (!currentExamKey) {
            setMarksState({});
            form.resetFields();
            initializedExamRef.current = null;
        }
    }, [students, currentExamKey, existingMarksRecord, form]);

    // Live statistics calculation
    const stats = useMemo(() => {
        const totalStudents = students.length;
        if (totalStudents === 0 || !currentExam) {
            return {
                total: 0,
                evaluated: 0,
                passed: 0,
                failed: 0,
                absent: 0,
                average: 0,
                highest: 0,
                lowest: 0,
                progressPercent: 0,
            };
        }

        let evaluated = 0;
        let passed = 0;
        let failed = 0;
        let absent = 0;
        let marksSum = 0;
        let presentCount = 0;
        let highest = 0;
        let lowest = currentExam.totalMarks;

        students.forEach(student => {
            const entry = marksState[student.id];
            if (entry) {
                if (entry.status === 'Absent') {
                    absent++;
                    evaluated++;
                } else if (entry.mark !== null && entry.mark !== undefined) {
                    evaluated++;
                    presentCount++;
                    marksSum += Number(entry.mark);
                    if (Number(entry.mark) > highest) highest = Number(entry.mark);
                    if (Number(entry.mark) < lowest) lowest = Number(entry.mark);

                    if (entry.status === 'Pass') passed++;
                    else if (entry.status === 'Fail') failed++;
                }
            }
        });

        const average = presentCount > 0 ? (marksSum / presentCount).toFixed(1) : 0;
        const progressPercent = totalStudents > 0 ? Math.round((evaluated / totalStudents) * 100) : 0;

        return {
            total: totalStudents,
            evaluated,
            passed,
            failed,
            absent,
            average,
            highest: presentCount > 0 ? highest : 0,
            lowest: presentCount > 0 ? lowest : 0,
            progressPercent,
        };
    }, [students, marksState, currentExam]);

    // Auto-update status when mark is changed
    const handleMarkChange = (studentId: string, markValue: number | null) => {
        if (!currentExam) return;
        const passCutoff = currentExam.totalMarks * 0.35;
        if (markValue === null || markValue === undefined) return;

        const newStatus: 'Pass' | 'Fail' = markValue >= passCutoff ? 'Pass' : 'Fail';
        form.setFieldValue(['marks', studentId, 'status'], newStatus);
        setMarksState(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                mark: markValue,
                status: newStatus,
            },
        }));
    };

    const handleSaveMarks = () => {
        form.validateFields().then(values => {
            if (!currentExam || !user || !user.organization_key || !user.staff_code) {
                message.error("Cannot save marks. Missing necessary information.");
                return;
            }

            const studentMarkEntries: StudentMarkEntry[] = students.map(student => ({
                student_id: student.id,
                register_no: student.register_no,
                roll_no: student.roll_no,
                student_name: student.full_name,
                get_mark: values.marks?.[student.id]?.status === 'Absent' ? null : (values.marks?.[student.id]?.mark ?? null),
                status: values.marks?.[student.id]?.status ?? 'Absent',
            }));

            const payload: UploadExamMarksPayload = {
                organization_key: user.organization_key,
                staff_code: user.staff_code,
                exam_id: currentExam.examId,
                exam_title: currentExam.examTitle,
                total_marks: currentExam.totalMarks,
                class_name: currentExam.className,
                section_name: currentExam.sectionName,
                subject: currentExam.subject,
                academic_year: selectedYear!,
                test_date: currentExam.examDate || new Date().toISOString(),
                student_marks: studentMarkEntries,
            };

            dispatch(uploadExamMarksRequest(payload));
            setIsEditUnlocked(false);
        }).catch(info => {
            message.warning("Please complete all required mark and status fields before submitting.");
            console.log('Validation failed:', info);
        });
    };

    const handleYearChange = (val: string | null) => {
        setSelectedYear(val);
        setSelectedClassKey(null);
        setSelectedSubject(null);
        setSelectedExamTitle(null);
    };

    const handleClassChange = (val: string | null) => {
        setSelectedClassKey(val);
        setSelectedSubject(null);
        setSelectedExamTitle(null);
    };

    const handleSubjectChange = (val: string | null) => {
        setSelectedSubject(val);
        setSelectedExamTitle(null);
    };

    // Filter students by search and status
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch =
                student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (student.roll_no && student.roll_no.toLowerCase().includes(searchQuery.toLowerCase())) ||
                student.register_no.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter === 'ALL') return true;

            const entry = marksState[student.id];
            if (!entry) return statusFilter === 'UNGRADED';

            if (statusFilter === 'GRADED') return entry.status === 'Absent' || (entry.mark !== null && entry.mark !== undefined);
            if (statusFilter === 'UNGRADED') return entry.status !== 'Absent' && (entry.mark === null || entry.mark === undefined);
            if (statusFilter === 'PASS') return entry.status === 'Pass';
            if (statusFilter === 'FAIL') return entry.status === 'Fail';
            if (statusFilter === 'ABSENT') return entry.status === 'Absent';

            return true;
        });
    }, [students, searchQuery, statusFilter, marksState]);

    // Quick Action: Autofill all absent or pass
    const handleQuickAction = (action: 'PASS_ALL' | 'ABSENT_ALL') => {
        if (!currentExam) return;
        const currentVals = form.getFieldValue('marks') || {};
        const updated: Record<string, MarkEntry> = { ...currentVals };

        students.forEach(student => {
            if (action === 'PASS_ALL') {
                updated[student.id] = {
                    mark: Math.round(currentExam.totalMarks * 0.5),
                    status: 'Pass',
                };
            } else if (action === 'ABSENT_ALL') {
                updated[student.id] = {
                    mark: null,
                    status: 'Absent',
                };
            }
        });

        form.setFieldsValue({ marks: updated });
        setMarksState(updated);
        message.success(`Autofilled all students as ${action === 'PASS_ALL' ? 'Pass (50%)' : 'Absent'}`);
    };

    // Export to Excel (.xlsx)
    const handleExportExcel = () => {
        if (!currentExam || students.length === 0) {
            message.warning("No student records available to export.");
            return;
        }

        const dataToExport = students.map((s, idx) => {
            const entry = marksState[s.id] || {};
            const mark = entry.mark ?? '-';
            const status = entry.status ?? 'Absent';
            const percentage = typeof mark === 'number' ? `${((mark / currentExam.totalMarks) * 100).toFixed(1)}%` : '-';

            return {
                'S.No': idx + 1,
                'Roll No': s.roll_no || 'N/A',
                'Register No': s.register_no,
                'Student Name': s.full_name,
                'Class & Section': `${currentExam.className} - ${currentExam.sectionName}`,
                'Subject': currentExam.subject,
                'Exam Title': currentExam.examTitle,
                'Max Marks': currentExam.totalMarks,
                'Obtained Marks': mark,
                'Percentage': percentage,
                'Status': status,
            };
        });

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exam Marks");
        const filename = `${currentExam.className}_${currentExam.subject}_${currentExam.examTitle}_Marks.xlsx`.replace(/\s+/g, '_');
        XLSX.writeFile(wb, filename);
        message.success("Mark sheet exported successfully!");
    };

    const columns = useMemo(() => [
        {
            title: 'Student Details',
            key: 'student',
            render: (_: any, record: StudentForExamMarks) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-xs flex-shrink-0 border border-indigo-100">
                        {record.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{record.full_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>Reg: <strong>{record.register_no}</strong></span>
                            {record.roll_no && <span>• Roll: <strong>{record.roll_no}</strong></span>}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: `Mark (Max: ${currentExam?.totalMarks || 100})`,
            key: 'upload_mark',
            width: 220,
            render: (_: any, record: StudentForExamMarks) => {
                const entry = marksState[record.id];
                const isAbsent = entry?.status === 'Absent';

                return (
                    <div className="space-y-1">
                        <Form.Item
                            name={['marks', record.id, 'mark']}
                            noStyle
                            rules={[
                                {
                                    validator: (_, value) => {
                                        const currentStatus = form.getFieldValue(['marks', record.id, 'status']);
                                        if (currentStatus === 'Absent') return Promise.resolve();
                                        if (value === null || value === undefined) {
                                            return Promise.reject(new Error('Mark is required'));
                                        }
                                        if (value < 0) return Promise.reject(new Error('Must be ≥ 0'));
                                        if (value > (currentExam?.totalMarks || 100)) {
                                            return Promise.reject(new Error(`Max is ${currentExam?.totalMarks}`));
                                        }
                                        return Promise.resolve();
                                    },
                                },
                            ]}
                        >
                            <InputNumber
                                placeholder={isAbsent ? "Absent" : `0 - ${currentExam?.totalMarks || 100}`}
                                style={{ width: '100%' }}
                                disabled={isRecordLocked || isAbsent}
                                min={0}
                                max={currentExam?.totalMarks}
                                className="rounded-lg text-sm font-semibold"
                                onChange={(val) => handleMarkChange(record.id, val)}
                            />
                        </Form.Item>
                        {entry?.mark !== null && entry?.mark !== undefined && !isAbsent && currentExam && (
                            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                                <span>Percentage:</span>
                                <strong className="text-indigo-600">
                                    {((entry.mark / currentExam.totalMarks) * 100).toFixed(1)}%
                                </strong>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            title: 'Attendance & Result Status',
            key: 'status',
            width: 180,
            render: (_: any, record: StudentForExamMarks) => (
                <Form.Item
                    name={['marks', record.id, 'status']}
                    noStyle
                    rules={[{ required: true, message: 'Status is required' }]}
                >
                    <Select
                        placeholder="Select status"
                        style={{ width: '100%' }}
                        disabled={isRecordLocked}
                        className="rounded-lg font-medium"
                        onChange={(statusVal: 'Pass' | 'Fail' | 'Absent') => {
                            if (statusVal === 'Absent') {
                                form.setFieldValue(['marks', record.id, 'mark'], null);
                            }
                            setMarksState(prev => ({
                                ...prev,
                                [record.id]: {
                                    ...prev[record.id],
                                    mark: statusVal === 'Absent' ? null : (prev[record.id]?.mark ?? null),
                                    status: statusVal,
                                },
                            }));
                        }}
                    >
                        <Option value="Pass">
                            <Tag color="success" className="m-0 rounded-md">Pass</Tag>
                        </Option>
                        <Option value="Fail">
                            <Tag color="error" className="m-0 rounded-md">Fail</Tag>
                        </Option>
                        <Option value="Absent">
                            <Tag color="default" className="m-0 rounded-md">Absent</Tag>
                        </Option>
                    </Select>
                </Form.Item>
            ),
        },
    ], [currentExam, isRecordLocked, marksState, form]);

    const isLoading = teacherDataLoading || timetablesLoading || studentsLoading;
    const showStudentTable = selectedYear && selectedClassKey && selectedSubject && selectedExamTitle;

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 md:p-6 space-y-5">
            {/* Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <Button
                            type="text"
                            icon={<ArrowLeftOutlined className="text-slate-600" />}
                            onClick={() => dispatch(setCurrentPage('staffdashboard'))}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 border-0 flex-shrink-0"
                            title="Back to Dashboard"
                        />
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                            <SafetyCertificateOutlined className="text-2xl" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight m-0">
                                    Exam Mark Upload
                                </h1>
                                <Tag color="indigo" className="rounded-full px-2.5 py-0.5 text-xs font-semibold m-0">
                                    Score Evaluation
                                </Tag>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 m-0 mt-0.5">
                                Select scheduled examination, input student obtained scores, and publish official academic marks
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                        {showStudentTable && (
                            <Button
                                icon={<FileExcelOutlined />}
                                onClick={handleExportExcel}
                                className="rounded-xl border-slate-200 text-slate-700 hover:text-emerald-600 hover:border-emerald-300 font-medium h-9"
                            >
                                Export Excel
                            </Button>
                        )}
                        <Tag color="cyan" className="rounded-xl px-3 py-1 font-medium m-0 flex items-center gap-1.5 border-0 bg-cyan-50 text-cyan-700">
                            <TeamOutlined />
                            <span>{user?.full_name || 'Faculty'}</span>
                        </Tag>
                        {selectedYear && (
                            <Tag color="blue" className="rounded-xl px-3 py-1 font-medium m-0 flex items-center gap-1.5 border-0 bg-blue-50 text-blue-700">
                                <CalendarOutlined />
                                <span>{selectedYear}</span>
                            </Tag>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Select Exam Cohort & Schedule
                    </span>
                    <span className="text-xs text-slate-400">Step 1: Choose target exam</span>
                </div>

                <Spin spinning={isLoading}>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} lg={6}>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-600">Academic Year</span>
                                <Select
                                    placeholder="Select Academic Year"
                                    style={{ width: '100%' }}
                                    value={selectedYear}
                                    onChange={handleYearChange}
                                    allowClear
                                    className="rounded-lg"
                                >
                                    {(calendars as any[]).map(cal => (
                                        <Option key={cal.id} value={cal.academic_year}>
                                            {cal.academic_year} {cal.is_current && "(Current)"}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-600">Class & Section</span>
                                <Select
                                    showSearch
                                    placeholder="Select Class & Section"
                                    style={{ width: '100%' }}
                                    value={selectedClassKey}
                                    onChange={handleClassChange}
                                    disabled={!selectedYear}
                                    allowClear
                                    className="rounded-lg"
                                >
                                    {classOptions.map((opt) => (
                                        <Option key={opt.key} value={opt.key}>{opt.label}</Option>
                                    ))}
                                </Select>
                            </div>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-600">Subject</span>
                                <Select
                                    showSearch
                                    placeholder="Select Subject"
                                    style={{ width: '100%' }}
                                    value={selectedSubject}
                                    onChange={handleSubjectChange}
                                    disabled={!selectedClassKey}
                                    allowClear
                                    className="rounded-lg"
                                >
                                    {subjectOptions.map(sub => (
                                        <Option key={sub} value={sub!}>{sub}</Option>
                                    ))}
                                </Select>
                            </div>
                        </Col>

                        <Col xs={24} sm={12} lg={6}>
                            <div className="space-y-1">
                                <span className="text-xs font-semibold text-slate-600">Exam Title</span>
                                <Select
                                    showSearch
                                    placeholder="Select Exam Schedule"
                                    style={{ width: '100%' }}
                                    value={selectedExamTitle}
                                    onChange={setSelectedExamTitle}
                                    disabled={!selectedSubject}
                                    allowClear
                                    className="rounded-lg"
                                >
                                    {examTitleOptions.map(title => (
                                        <Option key={title} value={title}>{title}</Option>
                                    ))}
                                </Select>
                            </div>
                        </Col>
                    </Row>
                </Spin>

                {/* Exam Context Banner */}
                {currentExam && (
                    <div className="mt-3 p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag color="indigo" className="font-bold text-xs rounded-md m-0">
                                    {currentExam.examTitle}
                                </Tag>
                                <span className="font-semibold text-slate-800 text-sm">
                                    {currentExam.className} - {currentExam.sectionName} • {currentExam.subject}
                                </span>
                            </div>
                            <div className="text-xs text-slate-600 flex flex-wrap gap-4">
                                <span>🎯 Maximum Marks: <strong className="text-indigo-700 font-bold">{currentExam.totalMarks} Marks</strong></span>
                                <span>📅 Exam Date: <strong className="text-slate-800">{currentExam.examDate ? dayjs(currentExam.examDate).format('DD MMM YYYY') : 'Scheduled'}</strong></span>
                                <span>👥 Total Students: <strong className="text-slate-800">{students.length}</strong></span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start md:self-auto">
                            {existingMarksRecord ? (
                                <div className="flex items-center gap-2">
                                    <Tag color={isEditUnlocked ? "orange" : "green"} className="m-0 rounded-lg px-2.5 py-1 text-xs font-semibold">
                                        {isEditUnlocked ? "🔓 Editing Unlocked" : "🔒 Marks Saved in Records"}
                                    </Tag>
                                    <Button
                                        size="small"
                                        icon={isEditUnlocked ? <LockOutlined /> : <UnlockOutlined />}
                                        onClick={() => setIsEditUnlocked(!isEditUnlocked)}
                                        className="rounded-lg text-xs"
                                    >
                                        {isEditUnlocked ? "Lock Entry" : "Unlock to Edit"}
                                    </Button>
                                </div>
                            ) : (
                                <Tag color="blue" className="m-0 rounded-lg px-2.5 py-1 text-xs font-semibold">
                                    📝 New Mark Entry
                                </Tag>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Live Metrics Overview Cards */}
            {showStudentTable && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Evaluation Progress</span>
                            <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <CheckCircleOutlined />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-800">{stats.evaluated}</span>
                            <span className="text-xs text-slate-500 font-medium">/ {stats.total} Graded</span>
                        </div>
                        <div className="mt-2">
                            <Progress
                                percent={stats.progressPercent}
                                size="small"
                                strokeColor={stats.progressPercent === 100 ? '#10b981' : '#6366f1'}
                                showInfo={false}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Class Average</span>
                            <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                <TrophyOutlined />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-800">{stats.average}</span>
                            <span className="text-xs text-slate-500 font-medium">/ {currentExam?.totalMarks} Marks</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex justify-between">
                            <span>High: <strong>{stats.highest}</strong></span>
                            <span>Low: <strong>{stats.lowest}</strong></span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pass / Fail Ratio</span>
                            <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <SafetyCertificateOutlined />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-600">{stats.passed}</span>
                            <span className="text-xs text-slate-500 font-medium">Passed • <strong className="text-rose-600">{stats.failed}</strong> Failed</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">
                            Cutoff: ≥ {((currentExam?.totalMarks || 100) * 0.35).toFixed(0)} Marks (35%)
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Attendance</span>
                            <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                <UserOutlined />
                            </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-800">
                                {stats.total - stats.absent}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">Present</span>
                        </div>
                        <div className="mt-2 text-xs text-amber-600 font-medium">
                            {stats.absent > 0 ? `${stats.absent} Student(s) Absent` : '100% Student Attendance'}
                        </div>
                    </div>
                </div>
            )}

            {/* Students Marks Table */}
            {showStudentTable ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm space-y-4">
                    {/* Table Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                        <div className="flex flex-wrap items-center gap-3">
                            <Input
                                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                                placeholder="Search by name, roll no, or register no..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full sm:w-64 rounded-xl text-xs"
                                allowClear
                            />
                            <Select
                                value={statusFilter}
                                onChange={setStatusFilter}
                                className="w-36 rounded-xl text-xs"
                            >
                                <Option value="ALL">All Students</Option>
                                <Option value="GRADED">Graded Only</Option>
                                <Option value="UNGRADED">Ungraded Only</Option>
                                <Option value="PASS">Passed Only</Option>
                                <Option value="FAIL">Failed Only</Option>
                                <Option value="ABSENT">Absent Only</Option>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto">
                            {!isRecordLocked && (
                                <>
                                    <Button
                                        size="small"
                                        onClick={() => handleQuickAction('PASS_ALL')}
                                        className="rounded-lg text-xs"
                                    >
                                        Autofill Pass (50%)
                                    </Button>
                                    <Button
                                        size="small"
                                        onClick={() => handleQuickAction('ABSENT_ALL')}
                                        className="rounded-lg text-xs"
                                    >
                                        Mark All Absent
                                    </Button>
                                </>
                            )}
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                onClick={handleSaveMarks}
                                loading={studentsLoading}
                                disabled={isRecordLocked}
                                className="rounded-xl font-bold px-4 bg-indigo-600 hover:bg-indigo-700 h-9"
                            >
                                Save All Marks
                            </Button>
                        </div>
                    </div>

                    <Spin spinning={studentsLoading}>
                        {studentsError && (
                            <Alert message="Error" description={studentsError} type="error" showIcon className="mb-4 rounded-xl" />
                        )}

                        <Form
                            form={form}
                            onValuesChange={(_, allValues) => {
                                if (allValues.marks) {
                                    setMarksState(allValues.marks);
                                }
                            }}
                        >
                            <Table
                                columns={columns}
                                dataSource={filteredStudents}
                                rowKey="id"
                                pagination={{
                                    pageSize: 25,
                                    showSizeChanger: true,
                                    pageSizeOptions: ['15', '25', '50', '100'],
                                    showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} students`,
                                }}
                                scroll={{ x: 700 }}
                                className="border border-slate-100 rounded-xl overflow-hidden"
                            />
                        </Form>
                    </Spin>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="space-y-1">
                                <span className="font-semibold text-slate-700 block text-base">
                                    No Examination Cohort Selected
                                </span>
                                <span className="text-xs text-slate-400 block max-w-md mx-auto">
                                    Please select Academic Year, Class & Section, Subject, and Exam Title above to load the student score entry sheet.
                                </span>
                            </div>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default ExamMarkUpload;
