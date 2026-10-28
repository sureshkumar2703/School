/**
 * Teacher 1-Mark & Objective Question Uploader
 * Sri Gayathri SMS Portal
 */
import React, { useState, useEffect, useMemo } from 'react';
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Upload,
    message,
    Table,
    Spin,
    Popconfirm,
    Tag,
    Alert,
    Tooltip,
    Badge,
    Empty,
} from 'antd';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    UploadOutlined,
    DownloadOutlined,
    InboxOutlined,
    EditOutlined,
    DeleteOutlined,
    FileExcelOutlined,
    EyeOutlined,
    BookOutlined,
    FolderOpenOutlined,
    CalendarOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    ArrowLeftOutlined,
    IdcardOutlined,
    ReloadOutlined,
    CopyOutlined,
    CheckCircleOutlined,
    QuestionCircleOutlined,
    FileTextOutlined,
    PlusOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import * as XLSX from 'xlsx';
import {
    uploadQuestionsRequest,
    fetchOneMarkQuestionsRequest,
    deleteOneMarkQuestionRequest,
    updateOneMarkQuestionRequest,
    type OneMarkQuestionBatch,
    type OneMarkQuestionItem,
} from '../../store/features/one-mark-questions/oneMarkQuestionsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const { Option } = Select;
const { Dragger } = Upload;
const { TextArea } = Input;

interface FlattenedQuestion extends OneMarkQuestionItem {
    batchId: string;
    batchTitle: string;
    className: string;
    sectionName: string;
    subject: string;
}

const UploadOneMark: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const isMobile = useMediaQuery('(max-width: 768px)');

    // Redux store state
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, calendars } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { questions: questionBatches, loading: uploadLoading } = useSelector(
        (state: RootState) => state.oneMarkQuestions
    );

    // Filters and state
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedTitle, setSelectedTitle] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Modals state
    const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<{
        batch: OneMarkQuestionBatch;
        question: OneMarkQuestionItem;
    } | null>(null);
    const [viewingQuestion, setViewingQuestion] = useState<FlattenedQuestion | null>(null);

    // Upload modal form state
    const [modalAcademicYear, setModalAcademicYear] = useState<string | null>(null);
    const [modalClassKey, setModalClassKey] = useState<string | null>(null);
    const [modalSubject, setModalSubject] = useState<string | null>(null);
    const [modalTitle, setModalTitle] = useState<string>('Choose the correct answer');
    const [fileList, setFileList] = useState<any[]>([]);

    const [editForm] = Form.useForm();

    const titleOptions = [
        'Choose the correct answer',
        'Match the Following',
        'Fill in the blanks',
    ];

    // Initial Data Fetching
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Set default academic year
    useEffect(() => {
        if (calendars && calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
                setModalAcademicYear(currentYear);
            } else {
                setSelectedAcademicYear(calendars[0].academic_year);
                setModalAcademicYear(calendars[0].academic_year);
            }
        }
    }, [calendars, selectedAcademicYear]);

    // Fetch questions when class & subject are selected
    useEffect(() => {
        if (selectedClassKey && selectedSubject && user?.staff_code && user?.organization_key) {
            const [className, sectionName, academicYear] = selectedClassKey.split('||');
            dispatch(
                fetchOneMarkQuestionsRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                    academicYear,
                    className,
                    sectionName,
                    subject: selectedSubject,
                })
            );
        }
    }, [dispatch, selectedClassKey, selectedSubject, user]);

    // Populate edit form
    useEffect(() => {
        if (editingQuestion) {
            editForm.setFieldsValue(editingQuestion.question);
        }
    }, [editingQuestion, editForm]);

    // Teacher assignments
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Class options for main filter
    const classOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter(m => m.academic_year === selectedAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `Class ${m.class_name} - ${m.section_name}`,
                });
            }
            return acc;
        }, new Map<string, { key: string; label: string }>());

        return Array.from(uniqueClasses.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedAcademicYear]);

    // Subject options for main filter
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return myAssignments
            .filter(
                m =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map(m => m.subject_name)
            .filter((value, index, self) => self.indexOf(value) === index && value);
    }, [myAssignments, selectedClassKey]);

    // Class options for modal
    const modalClassOptions = useMemo(() => {
        const year = modalAcademicYear || selectedAcademicYear;
        if (!year) return [];
        const assignmentsForYear = myAssignments.filter(m => m.academic_year === year);
        const uniqueClasses = assignmentsForYear.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `Class ${m.class_name} - ${m.section_name}`,
                });
            }
            return acc;
        }, new Map<string, { key: string; label: string }>());

        return Array.from(uniqueClasses.values()).sort((a, b) => a.label.localeCompare(b.label));
    }, [myAssignments, modalAcademicYear, selectedAcademicYear]);

    // Subject options for modal
    const modalSubjectOptions = useMemo(() => {
        if (!modalClassKey) return [];
        const [className, sectionName, academicYear] = modalClassKey.split('||');
        return myAssignments
            .filter(
                m =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map(m => m.subject_name)
            .filter((value, index, self) => self.indexOf(value) === index && value);
    }, [myAssignments, modalClassKey]);

    // Flattened and filtered questions
    const flattenedQuestions = useMemo<FlattenedQuestion[]>(() => {
        let list = questionBatches
            .filter(batch => selectedTitle === 'all' || batch.title === selectedTitle)
            .flatMap(batch =>
                (batch.questions || []).map(question => ({
                    ...question,
                    batchId: batch.id,
                    batchTitle: batch.title,
                    className: batch.class,
                    sectionName: batch.section,
                    subject: batch.subject,
                }))
            );

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(item => {
                const qText = (item.questions || '').toLowerCase();
                const ansText = (item.answer || '').toLowerCase();
                const titleText = (item.batchTitle || '').toLowerCase();
                const optMatch = [item.option1, item.option2, item.option3, item.option4].some(
                    opt => opt && opt.toLowerCase().includes(q)
                );
                return qText.includes(q) || ansText.includes(q) || titleText.includes(q) || optMatch;
            });
        }

        return list;
    }, [questionBatches, selectedTitle, searchQuery]);

    // Metrics for Banner
    const metrics = useMemo(() => {
        const total = flattenedQuestions.length;
        const totalBatches = questionBatches.length;
        const mcqCount = flattenedQuestions.filter(
            q => q.batchTitle === 'Choose the correct answer' || !!q.option1
        ).length;
        const otherCount = total - mcqCount;

        return {
            total,
            totalBatches,
            mcqCount,
            otherCount,
        };
    }, [flattenedQuestions, questionBatches]);

    // Reset filters
    const handleResetFilters = () => {
        setSelectedClassKey(null);
        setSelectedSubject(null);
        setSelectedTitle('all');
        setSearchQuery('');
    };

    // Modal triggers
    const showUploadModal = () => {
        setModalAcademicYear(selectedAcademicYear);
        setModalClassKey(selectedClassKey);
        setModalSubject(selectedSubject);
        setModalTitle(selectedTitle !== 'all' ? selectedTitle : 'Choose the correct answer');
        setFileList([]);
        setIsUploadModalVisible(true);
    };

    const handleUploadCancel = () => {
        setIsUploadModalVisible(false);
        setFileList([]);
    };

    const showEditModal = (batch: OneMarkQuestionBatch, question: OneMarkQuestionItem) => {
        setEditingQuestion({ batch, question });
        setIsEditModalVisible(true);
    };

    const handleEditCancel = () => {
        setIsEditModalVisible(false);
        setEditingQuestion(null);
        editForm.resetFields();
    };

    const showViewModal = (question: FlattenedQuestion) => {
        setViewingQuestion(question);
        setIsViewModalVisible(true);
    };

    const handleViewCancel = () => {
        setIsViewModalVisible(false);
        setViewingQuestion(null);
    };

    // Filter change handlers
    const handleClassChange = (value: string | null) => {
        setSelectedClassKey(value);
        setSelectedSubject(null);
    };

    const handleYearChange = (value: string | null) => {
        setSelectedAcademicYear(value);
        setSelectedClassKey(null);
        setSelectedSubject(null);
    };

    const handleFileChange: UploadProps['onChange'] = info => {
        setFileList(info.fileList);
    };

    const uploadProps: UploadProps = {
        name: 'file',
        multiple: false,
        accept: '.xlsx, .xls',
        fileList,
        onChange: handleFileChange,
        beforeUpload: () => false,
    };

    // Download Template
    const handleDownloadTemplate = () => {
        const headers = [['questions', 'option1', 'option2', 'option3', 'option4', 'answer']];
        const sampleRow = [
            'What is the capital of India?',
            'Mumbai',
            'New Delhi',
            'Kolkata',
            'Chennai',
            'New Delhi',
        ];
        const ws = XLSX.utils.aoa_to_sheet([...headers, sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'OneMarkTemplate');
        XLSX.writeFile(wb, 'one_mark_question_template.xlsx');
        message.success('Excel template downloaded successfully.');
    };

    // Export Questions to Excel
    const handleExportQuestions = () => {
        if (flattenedQuestions.length === 0) {
            message.warning('No questions available to export.');
            return;
        }

        const dataToExport = flattenedQuestions.map((q, idx) => ({
            'S.No': idx + 1,
            'Question': q.questions,
            'Option A': q.option1 || '',
            'Option B': q.option2 || '',
            'Option C': q.option3 || '',
            'Option D': q.option4 || '',
            'Answer Key': q.answer,
            'Question Type': q.batchTitle,
            'Class': `${q.className} - ${q.sectionName}`,
            'Subject': q.subject,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'OneMarkQuestions');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `OneMark_${selectedSubject || 'Questions'}_${dateStr}.xlsx`);
        message.success('Questions exported to Excel successfully!');
    };

    // Submit Bulk Upload
    const handleUploadSubmit = () => {
        if (!fileList[0] || !user || !modalClassKey || !modalSubject || !modalTitle) {
            message.error('Please select academic year, class, subject, question type, and a file to upload.');
            return;
        }

        const [className, sectionName, academicYear] = modalClassKey.split('||');
        const file = fileList[0].originFileObj;
        const reader = new FileReader();

        reader.onload = (e: any) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (!json || json.length < 2) {
                    throw new Error('Excel file must have a header row and at least one question.');
                }

                const headers = (json[0] as string[]).map(h => String(h || '').trim().toLowerCase());
                const requiredHeaders = ['questions', 'answer'];
                if (!requiredHeaders.every(h => headers.includes(h))) {
                    throw new Error(`Excel file is missing required headers: ${requiredHeaders.join(', ')}`);
                }

                const qIndex = headers.indexOf('questions');
                const aIndex = headers.indexOf('answer');
                const opt1Index = headers.indexOf('option1');
                const opt2Index = headers.indexOf('option2');
                const opt3Index = headers.indexOf('option3');
                const opt4Index = headers.indexOf('option4');

                const questionsToUpload = (json.slice(1) as any[])
                    .map(row => {
                        const qText = row[qIndex];
                        const ansText = row[aIndex];

                        if (!qText || !ansText) return null;

                        return {
                            questions: String(qText).trim(),
                            option1: opt1Index !== -1 && row[opt1Index] ? String(row[opt1Index]).trim() : null,
                            option2: opt2Index !== -1 && row[opt2Index] ? String(row[opt2Index]).trim() : null,
                            option3: opt3Index !== -1 && row[opt3Index] ? String(row[opt3Index]).trim() : null,
                            option4: opt4Index !== -1 && row[opt4Index] ? String(row[opt4Index]).trim() : null,
                            answer: String(ansText).trim(),
                        };
                    })
                    .filter(Boolean);

                if (questionsToUpload.length > 0) {
                    dispatch(
                        uploadQuestionsRequest({
                            organization_key: user.organization_key!,
                            staff_code: user.staff_code!,
                            academic_year: academicYear,
                            class: className,
                            section: sectionName,
                            subject: modalSubject,
                            title: modalTitle,
                            questions: questionsToUpload as any,
                        })
                    );
                    message.success(`Uploaded ${questionsToUpload.length} questions successfully!`);
                    handleUploadCancel();
                } else {
                    message.warning('No valid questions found in the Excel file.');
                }
            } catch (error: any) {
                message.error(`Failed to process file: ${error.message}`);
            }
        };

        reader.readAsArrayBuffer(file);
    };

    // Submit Edit
    const handleEditSubmit = (values: any) => {
        if (!editingQuestion) return;

        const { batch, question } = editingQuestion;

        const updatedQuestions = batch.questions.map(q =>
            q.id === question.id ? { ...q, ...values } : q
        );

        const payload: OneMarkQuestionBatch = {
            ...batch,
            questions: updatedQuestions,
        };
        dispatch(updateOneMarkQuestionRequest(payload));
        message.success('Question updated successfully!');
        handleEditCancel();
    };

    // Delete single question
    const handleDelete = (batchId: string, questionId: string) => {
        dispatch(deleteOneMarkQuestionRequest({ batchId, questionId }));
        message.success('Question deleted successfully.');
    };

    const isLoading = mappingsLoading || uploadLoading;

    // Table view columns
    const tableColumns: ColumnsType<FlattenedQuestion> = [
        {
            title: '#',
            key: 'index',
            width: 55,
            align: 'center',
            render: (_t, _r, index) => <span className="font-semibold text-slate-400 text-xs">{index + 1}</span>,
        },
        {
            title: 'Format',
            dataIndex: 'batchTitle',
            key: 'batchTitle',
            width: 170,
            render: title => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {title}
                </span>
            ),
        },
        {
            title: 'Question Statement',
            dataIndex: 'questions',
            key: 'questions',
            render: (text, record) => (
                <div className="space-y-1 max-w-lg">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {text}
                    </p>
                    {record.option1 && (
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-0.5">
                            <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">A: {record.option1}</span>
                            {record.option2 && <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">B: {record.option2}</span>}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Correct Answer',
            dataIndex: 'answer',
            key: 'answer',
            width: 170,
            render: text => (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 line-clamp-2">
                    {text}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'action',
            width: 130,
            align: 'right',
            render: (_, record) => {
                const batch = questionBatches.find(b => b.id === record.batchId);
                return (
                    <div className="flex items-center justify-end gap-1.5">
                        <Tooltip title="View Details">
                            <Button
                                size="small"
                                icon={<EyeOutlined />}
                                onClick={() => showViewModal(record)}
                                className="text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-400"
                            />
                        </Tooltip>
                        <Tooltip title="Edit Question">
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => showEditModal(batch!, record)}
                                className="text-xs text-slate-600 hover:text-slate-800 border-slate-200"
                            />
                        </Tooltip>
                        <Tooltip title="Delete Question">
                            <Popconfirm
                                title="Delete Question"
                                description="Are you sure you want to delete this question?"
                                okText="Yes, Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleDelete(record.batchId, record.id)}
                            >
                                <Button size="small" danger icon={<DeleteOutlined />} className="text-xs" />
                            </Popconfirm>
                        </Tooltip>
                    </div>
                );
            },
        },
    ];

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
                            {selectedAcademicYear && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                                    <CalendarOutlined className="text-slate-400" />
                                    <span>Year: {selectedAcademicYear}</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>1-Mark & Objective Questions Uploader</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Bulk upload quizzes, multiple-choice questions, match-the-following, and fill-in-the-blanks directly from Excel.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            icon={<ReloadOutlined spin={isLoading} />}
                            onClick={() => {
                                if (selectedClassKey && selectedSubject && user?.staff_code && user?.organization_key) {
                                    const [className, sectionName, academicYear] = selectedClassKey.split('||');
                                    dispatch(
                                        fetchOneMarkQuestionsRequest({
                                            organizationKey: user.organization_key,
                                            staffCode: user.staff_code,
                                            academicYear,
                                            className,
                                            sectionName,
                                            subject: selectedSubject,
                                        })
                                    );
                                    message.success('Questions refreshed.');
                                }
                            }}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Refresh
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleExportQuestions}
                            disabled={flattenedQuestions.length === 0}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Export Excel
                        </Button>
                        <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={showUploadModal}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-sm inline-flex items-center"
                        >
                            Upload Questions (Excel)
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Overview Statistics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Questions
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                            <QuestionCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.total}</span>
                        <span className="text-xs text-slate-400">items</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Upload Batches
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                            <FolderOpenOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.totalBatches}</span>
                        <span className="text-xs text-slate-400">batches</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Multiple Choice
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                            <CheckCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{metrics.mcqCount}</span>
                        <span className="text-xs text-slate-400">MCQs</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Fill & Match
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <FileTextOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.otherCount}</span>
                        <span className="text-xs text-slate-400">objective items</span>
                    </div>
                </div>
            </div>

            {/* 3. Filters, Search & View Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {/* Academic Year Filter */}
                        <div className="w-full sm:w-auto min-w-[160px]">
                            <Select
                                placeholder="Academic Year"
                                className="w-full"
                                value={selectedAcademicYear}
                                onChange={handleYearChange}
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
                                placeholder="Select Class & Section"
                                className="w-full"
                                value={selectedClassKey}
                                onChange={handleClassChange}
                                allowClear
                                disabled={!selectedAcademicYear}
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
                                placeholder="Select Subject"
                                className="w-full"
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                allowClear
                                disabled={!selectedClassKey}
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

                        {/* Question Type Filter */}
                        <div className="w-full sm:w-auto min-w-[180px]">
                            <Select
                                placeholder="Question Type"
                                className="w-full"
                                value={selectedTitle}
                                onChange={setSelectedTitle}
                                disabled={!selectedSubject}
                            >
                                <Option value="all">All Question Types</Option>
                                {titleOptions.map(title => (
                                    <Option key={title} value={title}>
                                        {title}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto sm:flex-1 min-w-[180px]">
                            <Input
                                placeholder="Search question or answer..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                            />
                        </div>

                        {/* Reset Filter Button */}
                        {(selectedClassKey || selectedSubject || selectedTitle !== 'all' || searchQuery) && (
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleResetFilters}
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
            </div>

            {/* 4. Main Content Area */}
            <Spin spinning={isLoading} tip="Loading 1-mark questions...">
                {!selectedClassKey || !selectedSubject ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        Select Class & Subject to View Questions
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        Choose your assigned academic year, class & section, and subject in the filter bar above to browse and manage 1-mark questions.
                                    </p>
                                </div>
                            }
                        >
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                onClick={showUploadModal}
                                className="bg-blue-600 hover:bg-blue-700 mt-2 font-medium"
                            >
                                Upload From Excel
                            </Button>
                        </Empty>
                    </div>
                ) : flattenedQuestions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        No Questions Uploaded Yet
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        No 1-mark questions have been uploaded for {selectedSubject} in this class. Click below to import your first batch from an Excel spreadsheet.
                                    </p>
                                </div>
                            }
                        >
                            <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                onClick={showUploadModal}
                                className="bg-blue-600 hover:bg-blue-700 mt-2 font-medium"
                            >
                                Upload Questions from Excel
                            </Button>
                        </Empty>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* CARDS VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {flattenedQuestions.map((item, idx) => {
                            const isMCQ = item.batchTitle === 'Choose the correct answer' || !!item.option1;
                            const batch = questionBatches.find(b => b.id === item.batchId);

                            return (
                                <div
                                    key={item.id || idx}
                                    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:border-blue-200"
                                >
                                    <div className="space-y-3">
                                        {/* Card Top: Format Badge and Number */}
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                {item.batchTitle}
                                            </span>
                                            <span className="text-xs font-bold text-slate-400">
                                                #{idx + 1}
                                            </span>
                                        </div>

                                        {/* Question text */}
                                        <div>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-3 leading-relaxed">
                                                {item.questions}
                                            </p>
                                        </div>

                                        {/* Options for MCQ */}
                                        {isMCQ && (
                                            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1 text-xs">
                                                {item.option1 && (
                                                    <div className="flex items-start gap-1.5 text-slate-600">
                                                        <span className="font-bold text-slate-400">A.</span>
                                                        <span className="line-clamp-1">{item.option1}</span>
                                                    </div>
                                                )}
                                                {item.option2 && (
                                                    <div className="flex items-start gap-1.5 text-slate-600">
                                                        <span className="font-bold text-slate-400">B.</span>
                                                        <span className="line-clamp-1">{item.option2}</span>
                                                    </div>
                                                )}
                                                {item.option3 && (
                                                    <div className="flex items-start gap-1.5 text-slate-600">
                                                        <span className="font-bold text-slate-400">C.</span>
                                                        <span className="line-clamp-1">{item.option3}</span>
                                                    </div>
                                                )}
                                                {item.option4 && (
                                                    <div className="flex items-start gap-1.5 text-slate-600">
                                                        <span className="font-bold text-slate-400">D.</span>
                                                        <span className="line-clamp-1">{item.option4}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Answer key box */}
                                        <div className="bg-emerald-50/70 rounded-xl p-2.5 border border-emerald-100 flex items-start gap-2 text-xs">
                                            <CheckCircleOutlined className="text-emerald-600 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="font-bold text-emerald-800 text-[11px] block uppercase tracking-wide">
                                                    Correct Answer:
                                                </span>
                                                <span className="font-semibold text-emerald-900 line-clamp-2">
                                                    {item.answer}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <span className="text-[11px] text-slate-400">
                                            1 Mark
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <Tooltip title="View Details">
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => showViewModal(item)}
                                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                >
                                                    View
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <Button
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => showEditModal(batch!, item)}
                                                    className="text-xs text-slate-600 hover:text-slate-800 border-slate-200"
                                                />
                                            </Tooltip>
                                            <Tooltip title="Delete">
                                                <Popconfirm
                                                    title="Delete Question"
                                                    description="Are you sure you want to delete this question?"
                                                    okText="Yes, Delete"
                                                    cancelText="Cancel"
                                                    okButtonProps={{ danger: true }}
                                                    onConfirm={() => handleDelete(item.batchId, item.id)}
                                                >
                                                    <Button
                                                        size="small"
                                                        danger
                                                        icon={<DeleteOutlined />}
                                                        className="text-xs"
                                                    />
                                                </Popconfirm>
                                            </Tooltip>
                                        </div>
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
                            dataSource={flattenedQuestions}
                            rowKey="id"
                            loading={uploadLoading}
                            pagination={{
                                pageSize: 12,
                                showSizeChanger: true,
                                pageSizeOptions: ['12', '24', '48'],
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} questions`,
                            }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                )}
            </Spin>

            {/* MODAL 1: Bulk Upload from Excel */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                            <UploadOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                Upload 1-Mark Questions
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                Import questions and MCQ choices directly from an Excel spreadsheet
                            </span>
                        </div>
                    </div>
                }
                open={isUploadModalVisible}
                onCancel={handleUploadCancel}
                width={isMobile ? '95vw' : 750}
                footer={[
                    <Button key="back" onClick={handleUploadCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        disabled={fileList.length === 0}
                        onClick={handleUploadSubmit}
                        loading={uploadLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Submit & Upload
                    </Button>,
                ]}
                className="rounded-2xl"
            >
                <Spin spinning={mappingsLoading} tip="Loading class assignments...">
                    <div className="space-y-4 py-2">
                        {/* Target Selection Card */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                Target Class & Question Format
                            </span>
                            <Row gutter={[12, 12]}>
                                <Col xs={24} sm={12}>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                        Academic Year
                                    </label>
                                    <Select
                                        placeholder="Select Academic Year"
                                        style={{ width: '100%' }}
                                        value={modalAcademicYear}
                                        onChange={val => {
                                            setModalAcademicYear(val);
                                            setModalClassKey(null);
                                            setModalSubject(null);
                                        }}
                                    >
                                        {(calendars || []).map((cal: any) => (
                                            <Option key={cal.id} value={cal.academic_year}>
                                                {cal.academic_year} {cal.is_current && '(Current)'}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                        Class & Section
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Select class"
                                        style={{ width: '100%' }}
                                        value={modalClassKey}
                                        onChange={val => {
                                            setModalClassKey(val);
                                            setModalSubject(null);
                                        }}
                                        disabled={!modalAcademicYear}
                                    >
                                        {modalClassOptions.map(cls => (
                                            <Option key={cls.key} value={cls.key}>
                                                {cls.label}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                        Subject
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Select subject"
                                        style={{ width: '100%' }}
                                        value={modalSubject}
                                        onChange={setModalSubject}
                                        disabled={!modalClassKey}
                                    >
                                        {modalSubjectOptions.map(sub => (
                                            <Option key={sub} value={sub}>
                                                {sub}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <label className="text-xs font-semibold text-slate-600 mb-1 block">
                                        Question Type Format
                                    </label>
                                    <Select
                                        placeholder="Select Question Type"
                                        style={{ width: '100%' }}
                                        value={modalTitle}
                                        onChange={setModalTitle}
                                    >
                                        {titleOptions.map(title => (
                                            <Option key={title} value={title}>
                                                {title}
                                            </Option>
                                        ))}
                                    </Select>
                                </Col>
                            </Row>
                        </div>

                        {/* Instructions and Download Template */}
                        <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                                <span className="font-bold text-blue-900 block">
                                    Excel Template Guidelines:
                                </span>
                                <p className="text-blue-700">
                                    Columns required: <code className="bg-white px-1 py-0.5 rounded text-blue-900 font-bold border border-blue-200">questions</code>, <code className="bg-white px-1 py-0.5 rounded text-blue-900 font-bold border border-blue-200">answer</code>, and optional <code className="bg-white px-1 py-0.5 rounded text-blue-900 font-bold border border-blue-200">option1</code> to <code className="bg-white px-1 py-0.5 rounded text-blue-900 font-bold border border-blue-200">option4</code>.
                                </p>
                            </div>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={handleDownloadTemplate}
                                className="bg-white text-blue-700 border-blue-300 hover:bg-blue-50 font-medium shrink-0"
                            >
                                Download Template (.xlsx)
                            </Button>
                        </div>

                        {/* Drag and Drop Zone */}
                        <Dragger
                            {...uploadProps}
                            height={180}
                            disabled={!modalSubject || !modalTitle}
                            className="bg-slate-50 rounded-xl border-dashed"
                        >
                            <p className="ant-upload-drag-icon text-emerald-500">
                                <InboxOutlined style={{ fontSize: 36 }} />
                            </p>
                            <p className="text-sm font-semibold text-slate-700">
                                Click or drag Excel file (.xlsx, .xls) to upload
                            </p>
                            <p className="text-xs text-slate-400">
                                Ensure class and subject are selected before selecting a file.
                            </p>
                        </Dragger>
                    </div>
                </Spin>
            </Modal>

            {/* MODAL 2: Edit Single Question */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            <EditOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">Edit Question</span>
                            <span className="block text-xs font-medium text-slate-400">
                                Modify question statement, options, or answer key
                            </span>
                        </div>
                    </div>
                }
                open={isEditModalVisible}
                onCancel={handleEditCancel}
                footer={null}
                destroyOnClose
                className="rounded-2xl"
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditSubmit} className="mt-4 space-y-3">
                    <Form.Item
                        name="questions"
                        label="Question Statement"
                        rules={[{ required: true, message: 'Please enter question text' }]}
                    >
                        <TextArea rows={3} className="rounded-xl" />
                    </Form.Item>

                    {editingQuestion?.batch.title === 'Choose the correct answer' && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">
                                Multiple Choice Options
                            </span>
                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="option1"
                                        label="Option A"
                                        rules={[{ required: true, message: 'Option A required' }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="option2"
                                        label="Option B"
                                        rules={[{ required: true, message: 'Option B required' }]}
                                    >
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="option3" label="Option C">
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item name="option4" label="Option D">
                                        <Input />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>
                    )}

                    <Form.Item
                        name="answer"
                        label="Correct Answer Key"
                        rules={[{ required: true, message: 'Please enter correct answer' }]}
                    >
                        <Input className="rounded-lg" />
                    </Form.Item>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button onClick={handleEditCancel}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={uploadLoading} className="bg-blue-600 hover:bg-blue-700">
                            Update Question
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL 3: View Question Details */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-bold">
                            <EyeOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">Question Details</span>
                            <span className="block text-xs font-medium text-slate-400">
                                1-Mark Objective Question Preview
                            </span>
                        </div>
                    </div>
                }
                open={isViewModalVisible}
                onCancel={handleViewCancel}
                footer={[
                    <Button
                        key="copy"
                        icon={<CopyOutlined />}
                        onClick={() => {
                            if (viewingQuestion) {
                                const text = `Q: ${viewingQuestion.questions}\nAns: ${viewingQuestion.answer}`;
                                navigator.clipboard.writeText(text);
                                message.success('Question and answer copied!');
                            }
                        }}
                    >
                        Copy
                    </Button>,
                    <Button key="close" onClick={handleViewCancel}>
                        Close
                    </Button>,
                ]}
                width={600}
                className="rounded-2xl"
            >
                {viewingQuestion && (
                    <div className="space-y-4 py-2">
                        {/* Meta Tags Row */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Class:</span>
                                <span className="font-bold text-slate-700">
                                    {viewingQuestion.className} - {viewingQuestion.sectionName}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Subject:</span>
                                <span className="font-bold text-slate-700">{viewingQuestion.subject}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Format:</span>
                                <span className="font-bold text-amber-700">{viewingQuestion.batchTitle}</span>
                            </div>
                        </div>

                        {/* Question Statement */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Question:
                            </span>
                            <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                                {viewingQuestion.questions}
                            </p>
                        </div>

                        {/* Options if MCQ */}
                        {(viewingQuestion.batchTitle === 'Choose the correct answer' || viewingQuestion.option1) && (
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">
                                    Options
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    {viewingQuestion.option1 && (
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                            <span className="font-bold text-slate-400 mr-1.5">A.</span>
                                            <span className="font-semibold text-slate-700">{viewingQuestion.option1}</span>
                                        </div>
                                    )}
                                    {viewingQuestion.option2 && (
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                            <span className="font-bold text-slate-400 mr-1.5">B.</span>
                                            <span className="font-semibold text-slate-700">{viewingQuestion.option2}</span>
                                        </div>
                                    )}
                                    {viewingQuestion.option3 && (
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                            <span className="font-bold text-slate-400 mr-1.5">C.</span>
                                            <span className="font-semibold text-slate-700">{viewingQuestion.option3}</span>
                                        </div>
                                    )}
                                    {viewingQuestion.option4 && (
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                            <span className="font-bold text-slate-400 mr-1.5">D.</span>
                                            <span className="font-semibold text-slate-700">{viewingQuestion.option4}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Answer Key */}
                        <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200 space-y-1">
                            <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                <CheckCircleOutlined className="text-emerald-600" />
                                <span>Correct Answer</span>
                            </span>
                            <p className="text-sm font-bold text-emerald-900 leading-relaxed pl-5">
                                {viewingQuestion.answer}
                            </p>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default UploadOneMark;
