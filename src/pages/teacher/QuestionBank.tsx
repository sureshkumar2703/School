/**
 * Teacher Question Bank Repository & Examination Asset Management
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
import type { ColumnsType } from 'antd/es/table';
import {
    DownloadOutlined,
    PlusOutlined,
    UploadOutlined,
    FileExcelOutlined,
    EditOutlined,
    DeleteOutlined,
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
    PrinterOutlined,
    CheckOutlined,
    CloseOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import * as XLSX from 'xlsx';
import {
    addQuestionRequest,
    fetchQuestionsRequest,
    updateQuestionRequest,
    deleteQuestionRequest,
    bulkAddQuestionsRequest,
    type Question,
    type AddQuestionPayload,
} from '../../store/features/question-bank/questionBankSlice';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchUnitMarksRequest } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';

const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

const QuestionBank: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();

    // Redux store state
    const { questions, loading: questionBankLoading, error: questionBankError } = useSelector(
        (state: RootState) => state.questionBank
    );
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, calendars } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { unitMarks } = useSelector((state: RootState) => state.setUnitMark);
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    // Filter, search & view states
    const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string | null>(null);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | null>(null);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
    const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | null>(null);
    const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
    const [selectedMarkFilter, setSelectedMarkFilter] = useState<number | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

    // Modals state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
    const [isViewModalVisible, setIsViewModalVisible] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);

    // Form instances
    const [form] = Form.useForm();
    const [bulkUploadForm] = Form.useForm();

    // Bulk upload states
    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Form dynamic watchers
    const selectedClassKey = Form.useWatch('class_key', form);
    const selectedMarkType = Form.useWatch('question_type', form);
    const selectedTitle = Form.useWatch('title', form);
    const selectedSubjectCode = Form.useWatch('subject_code', form);
    const formAcademicYear = Form.useWatch('academic_year', form);

    const bulkSelectedClassKey = Form.useWatch('class_key', bulkUploadForm);
    const bulkSelectedSubjectCode = Form.useWatch('subject_code', bulkUploadForm);

    // Initial Data Fetching
    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(
                fetchQuestionsRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                })
            );
            dispatch(fetchSubjectsRequest());
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(
                fetchUnitMarksRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                })
            );
            dispatch(fetchRegulationsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    // Teacher's assigned mappings
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Academic Year Options
    const academicYearOptions = useMemo(() => {
        const fromMappings = [...new Set(mappings.map((m: any) => m.academic_year))];
        const fromQuestions = [...new Set(questions.map(q => q.academic_year))];
        return [...new Set([...fromMappings, ...fromQuestions])].filter(Boolean).sort((a, b) => b.localeCompare(a));
    }, [mappings, questions]);

    // Default select current academic year
    useEffect(() => {
        if (!selectedAcademicYearFilter && academicYearOptions.length > 0) {
            const currentYear = calendars?.find((c: any) => c.is_current)?.academic_year;
            if (currentYear && academicYearOptions.includes(currentYear)) {
                setSelectedAcademicYearFilter(currentYear);
            } else {
                setSelectedAcademicYearFilter(academicYearOptions[0]);
            }
        }
    }, [academicYearOptions, calendars, selectedAcademicYearFilter]);

    // Cascading filter options for Class, Section, and Subject
    const classOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter) return [];
        const filteredAssignments = myAssignments.filter(
            (m: any) => m.academic_year === selectedAcademicYearFilter
        );
        return [...new Set(filteredAssignments.map((q: any) => q.class_name))];
    }, [myAssignments, selectedAcademicYearFilter]);

    const sectionOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter || !selectedClassFilter) return [];
        const filteredAssignments = myAssignments.filter(
            (m: any) =>
                m.academic_year === selectedAcademicYearFilter &&
                m.class_name === selectedClassFilter
        );
        return [...new Set(filteredAssignments.map((q: any) => q.section_name))];
    }, [myAssignments, selectedAcademicYearFilter, selectedClassFilter]);

    const subjectOptionsForFilter = useMemo(() => {
        if (!selectedAcademicYearFilter || !selectedClassFilter || !selectedSectionFilter) return [];
        const subjectNames = myAssignments
            .filter(
                (m: any) =>
                    m.academic_year === selectedAcademicYearFilter &&
                    m.class_name === selectedClassFilter &&
                    m.section_name === selectedSectionFilter
            )
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [myAssignments, subjects, selectedAcademicYearFilter, selectedClassFilter, selectedSectionFilter]);

    // Form Class options based on form's selected academic year
    const classOptions = useMemo(() => {
        if (!formAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === formAcademicYear);
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
    }, [myAssignments, formAcademicYear]);

    // Bulk upload form class options
    const bulkClassOptions = useMemo(() => {
        const year = bulkUploadForm.getFieldValue('academic_year');
        if (!year) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === year);
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
    }, [myAssignments, bulkUploadForm]);

    // Subjects available for selected class in form or bulk form
    const subjectOptions = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        if (!key || !subjects) return [];
        const [className, sectionName, academicYear] = key.split('||');

        const subjectNamesForClass = myAssignments
            .filter(
                (m: any) =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map((m: any) => m.subject_name);

        return subjectNamesForClass
            .map(name => subjects.find(s => s.subject_name === name))
            .filter((subject): subject is NonNullable<typeof subject> => !!subject && !!subject.subject_code);
    }, [myAssignments, selectedClassKey, bulkSelectedClassKey, subjects]);

    // Units and Mark Types configured for the selected class and subject
    const availableUnitsAndMarks = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        const subjectCode = selectedSubjectCode || bulkSelectedSubjectCode;
        if (!key || !subjectCode) return { units: [], marks: [] };

        const [className, sectionName, academicYear] = key.split('||');
        const subjectName = subjects.find(s => s.subject_code === subjectCode)?.subject_name;

        const relevantUnitMarks = unitMarks.filter(
            um =>
                um.academic_year === academicYear &&
                um.class === className &&
                um.section === sectionName &&
                um.subject === subjectName &&
                um.status === 'Active'
        );

        const units = [...new Set(relevantUnitMarks.map(um => um.unit))];
        const marks = [...new Set(relevantUnitMarks.map(um => um.mark_type))];

        return {
            units: units.sort((a, b) => a - b),
            marks: marks.sort((a, b) => a - b),
        };
    }, [unitMarks, selectedClassKey, bulkSelectedClassKey, selectedSubjectCode, bulkSelectedSubjectCode, subjects]);

    // Regulation lookup for class
    const regulationForClass = useMemo(() => {
        const key = selectedClassKey || bulkSelectedClassKey;
        if (!key) return null;
        const [className, , academicYear] = key.split('||');
        return (
            regulations.find(r => r.academic_year === academicYear && r.class === className)?.regulation ||
            'General Regulation'
        );
    }, [regulations, selectedClassKey, bulkSelectedClassKey]);

    useEffect(() => {
        form.setFieldsValue({ regulation: regulationForClass });
        bulkUploadForm.setFieldsValue({ regulation: regulationForClass });
    }, [regulationForClass, form, bulkUploadForm]);

    // Filtered questions list
    const filteredQuestions = useMemo(() => {
        let list = questions.filter(
            q =>
                (!selectedAcademicYearFilter || q.academic_year === selectedAcademicYearFilter) &&
                (!selectedClassFilter || q.class === selectedClassFilter) &&
                (!selectedSectionFilter || q.section === selectedSectionFilter) &&
                (!selectedSubjectFilter || q.subject_code === selectedSubjectFilter)
        );

        if (selectedUnitFilter !== null) {
            list = list.filter(q => q.unit === selectedUnitFilter);
        }

        if (selectedLevelFilter !== 'all') {
            list = list.filter(q => q.level === selectedLevelFilter);
        }

        if (selectedMarkFilter !== 'all') {
            list = list.filter(q => q.question_type === selectedMarkFilter);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            list = list.filter(q => {
                const qText = (q.question || '').toLowerCase();
                const ansText = (q.answer || '').toLowerCase();
                const titleText = (q.title || '').toLowerCase();
                const unitStr = `unit ${q.unit}`;
                const markStr = `${q.question_type} mark`;
                const optMatch = [q.option1, q.option2, q.option3, q.option4].some(
                    opt => opt && opt.toLowerCase().includes(query)
                );

                return (
                    qText.includes(query) ||
                    ansText.includes(query) ||
                    titleText.includes(query) ||
                    unitStr.includes(query) ||
                    markStr.includes(query) ||
                    optMatch
                );
            });
        }

        return list;
    }, [
        questions,
        selectedAcademicYearFilter,
        selectedClassFilter,
        selectedSectionFilter,
        selectedSubjectFilter,
        selectedUnitFilter,
        selectedLevelFilter,
        selectedMarkFilter,
        searchQuery,
    ]);

    // Available units in the filtered subset for filter bar
    const availableUnitsInDataset = useMemo(() => {
        const units = [...new Set(questions.map(q => q.unit))].filter(u => u !== undefined && u !== null);
        return units.sort((a, b) => a - b);
    }, [questions]);

    // Metrics for Banner
    const metrics = useMemo(() => {
        const total = filteredQuestions.length;
        const uniqueUnits = new Set(filteredQuestions.map(q => q.unit)).size;
        const easyCount = filteredQuestions.filter(q => q.level === 'Easy').length;
        const mediumCount = filteredQuestions.filter(q => q.level === 'Medium').length;
        const hardCount = filteredQuestions.filter(q => q.level === 'Hard').length;
        const oneMarkCount = filteredQuestions.filter(q => q.question_type === 1).length;

        return {
            total,
            uniqueUnits,
            easyCount,
            mediumCount,
            hardCount,
            oneMarkCount,
        };
    }, [filteredQuestions]);

    // Reset filters
    const handleResetFilters = () => {
        setSelectedClassFilter(null);
        setSelectedSectionFilter(null);
        setSelectedSubjectFilter(null);
        setSelectedUnitFilter(null);
        setSelectedLevelFilter('all');
        setSelectedMarkFilter('all');
        setSearchQuery('');
    };

    // Modal Handlers
    const showModal = (question: Question | null = null) => {
        setEditingQuestion(question);
        if (question) {
            form.setFieldsValue({
                ...question,
                class_key: `${question.class}||${question.section}||${question.academic_year}`,
            });
        } else {
            const currentYear = calendars?.find((c: any) => c.is_current)?.academic_year;
            form.resetFields();
            form.setFieldsValue({
                academic_year: selectedAcademicYearFilter || currentYear,
                status: 'Active',
                level: 'Medium',
            });
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingQuestion(null);
        form.resetFields();
    };

    const showBulkModal = () => {
        const currentYear = calendars?.find((c: any) => c.is_current)?.academic_year;
        bulkUploadForm.resetFields();
        bulkUploadForm.setFieldsValue({ academic_year: selectedAcademicYearFilter || currentYear });
        setFileList([]);
        setParsedData([]);
        setUploadError(null);
        setIsBulkModalVisible(true);
    };

    const handleBulkCancel = () => {
        setIsBulkModalVisible(false);
        setFileList([]);
        setParsedData([]);
        setUploadError(null);
        bulkUploadForm.resetFields();
    };

    const handleViewQuestion = (question: Question) => {
        setViewingQuestion(question);
        setIsViewModalVisible(true);
    };

    const handleViewCancel = () => {
        setIsViewModalVisible(false);
        setViewingQuestion(null);
    };

    // Save Single Question
    const onFinish = (values: any) => {
        if (!user?.organization_key || !user?.staff_code) {
            message.error('User authentication session expired. Please re-login.');
            return;
        }

        const [className, sectionName, academicYear] = values.class_key.split('||');

        const payload: Omit<Question, 'id' | 'created_at'> = {
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            unit: values.unit,
            question: values.question,
            level: values.level,
            question_type: values.question_type,
            subject_code: values.subject_code,
            regulation: values.regulation || 'Standard',
            status: values.status || 'Active',
            academic_year: academicYear,
            class: className,
            section: sectionName,
            title: values.title || null,
            option1: values.option1 || null,
            option2: values.option2 || null,
            option3: values.option3 || null,
            option4: values.option4 || null,
            answer: values.answer,
        };

        if (editingQuestion) {
            dispatch(updateQuestionRequest({ ...payload, id: editingQuestion.id }));
            message.success('Question updated successfully!');
        } else {
            dispatch(addQuestionRequest(payload as AddQuestionPayload));
            message.success('Question added to Question Bank successfully!');
        }
        handleCancel();
    };

    // Delete Question
    const handleDelete = (id: string) => {
        dispatch(deleteQuestionRequest(id));
        message.success('Question removed successfully.');
    };

    // Download Excel Template for Bulk Upload
    const handleDownloadTemplate = () => {
        const headers = [
            'unit',
            'question_type',
            'level',
            'question',
            'answer',
            'title',
            'option1',
            'option2',
            'option3',
            'option4',
        ];
        const sampleRow = [
            1,
            1,
            'Medium',
            'What is the powerhouse of the cell?',
            'Mitochondria',
            'Choose the correct answer',
            'Ribosome',
            'Mitochondria',
            'Nucleus',
            'Golgi Apparatus',
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'QuestionTemplate');
        XLSX.writeFile(wb, 'question_bank_template.xlsx');
        message.success('Template downloaded successfully.');
    };

    // Bulk File Parse
    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedData([]);
        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

        const formValues = bulkUploadForm.getFieldsValue();
        if (!formValues.class_key || !formValues.subject_code) {
            setUploadError('Please select academic year, class, and subject before selecting a file.');
            setFileList([]);
            return;
        }

        const [className, sectionName, academicYear] = (formValues.class_key || '').split('||');
        const subjectCode = formValues.subject_code;

        reader.onload = e => {
            if (!e.target) {
                setUploadError('Could not read the uploaded file.');
                return;
            }
            try {
                const data = new Uint8Array(e.target.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (!json || json.length === 0) {
                    throw new Error('The uploaded file is empty.');
                }

                const requiredHeaders = ['unit', 'question_type', 'question', 'answer'];
                const fileHeaders = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                }

                const subjectName = subjects.find(s => s.subject_code === subjectCode)?.subject_name;

                for (const row of json as any[]) {
                    const isUnitMarkValid = unitMarks.some(
                        um =>
                            um.academic_year === academicYear &&
                            um.class === className &&
                            um.section === sectionName &&
                            um.subject === subjectName &&
                            um.unit === row.unit &&
                            um.mark_type === row.question_type
                    );
                    if (!isUnitMarkValid) {
                        throw new Error(
                            `Invalid combination in row for question "${row.question}": Unit ${row.unit} with mark type ${row.question_type} is not configured for this subject. Please check 'Set Unit Mark'.`
                        );
                    }

                    if (row.title === 'Choose the correct answer' && (!row.option1 || !row.option2)) {
                        throw new Error(
                            `Row with question "${row.question}" is a 'Choose the correct answer' question but is missing 'option1' or 'option2'.`
                        );
                    }
                }

                setParsedData(json);
                message.success(`Successfully parsed ${json.length} questions from file.`);
            } catch (err: any) {
                setUploadError(err.message || 'Error processing spreadsheet.');
                setFileList([]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Bulk Submit
    const handleBulkSubmit = () => {
        if (!user?.organization_key || !user.staff_code) {
            message.error('User details are missing. Cannot upload.');
            return;
        }

        const formValues = bulkUploadForm.getFieldsValue();
        const [className, sectionName, academicYear] = formValues.class_key.split('||');
        const subjectCode = formValues.subject_code;

        const questionsToUpload: AddQuestionPayload[] = parsedData.map(row => ({
            organization_key: user.organization_key!,
            staff_code: user.staff_code!,
            class: className,
            section: sectionName,
            academic_year: academicYear,
            subject_code: subjectCode,
            regulation: formValues.regulation || 'General',
            unit: Number(row.unit),
            question_type: Number(row.question_type),
            level: row.level || 'Medium',
            question: String(row.question),
            answer: String(row.answer),
            title: row.title || null,
            option1: row.option1 || null,
            option2: row.option2 || null,
            option3: row.option3 || null,
            option4: row.option4 || null,
            status: 'Active',
        }));

        dispatch(bulkAddQuestionsRequest(questionsToUpload));
        message.success(`Uploaded ${questionsToUpload.length} questions successfully!`);
        handleBulkCancel();
    };

    // Download formatted HTML Question Paper
    const handleHtmlDownload = () => {
        const subjectObj = subjects.find(s => s.subject_code === selectedSubjectFilter);
        const subjectName = subjectObj?.subject_name || selectedSubjectFilter || 'All Subjects';

        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Question Bank - ${subjectName}</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #1e293b; }
                    .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
                    .header h1 { margin: 0; font-size: 24px; color: #0f172a; }
                    .header p { margin: 4px 0; color: #64748b; font-size: 14px; }
                    .meta-badge { display: inline-block; padding: 4px 10px; background: #f1f5f9; border-radius: 6px; font-weight: 600; font-size: 13px; margin: 4px; }
                    .question-list { list-style-type: none; padding-left: 0; }
                    .question-item { margin-bottom: 20px; padding: 16px; background: #fafafa; border: 1px solid #e2e8f0; border-radius: 8px; page-break-inside: avoid; }
                    .question-title { font-size: 12px; font-weight: 700; color: #6366f1; text-transform: uppercase; margin-bottom: 4px; }
                    .question-text { font-weight: 600; font-size: 15px; margin: 0 0 10px 0; color: #1e293b; }
                    .options { padding-left: 24px; list-style-type: lower-alpha; margin: 10px 0; font-size: 14px; color: #334155; }
                    .options li { margin-bottom: 4px; }
                    .answer-box { margin-top: 10px; padding: 8px 12px; background: #ecfdf5; border-left: 4px solid #10b981; border-radius: 4px; font-size: 13px; }
                    .answer-label { font-weight: bold; color: #047857; }
                    .badge-mark { float: right; background: #dbeafe; color: #1d4ed8; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo" style="max-height: 70px; margin-bottom: 8px;">` : ''}
                    <h1>${schoolDetails?.school_name || 'Sri Gayathri School'}</h1>
                    <p style="font-size: 16px; font-weight: bold; color: #334155;">QUESTION BANK REPOSITORY</p>
                    <div>
                        <span class="meta-badge">Class: ${selectedClassFilter || 'All'} - ${selectedSectionFilter || 'All'}</span>
                        <span class="meta-badge">Subject: ${subjectName}</span>
                        <span class="meta-badge">Year: ${selectedAcademicYearFilter || 'Current'}</span>
                        <span class="meta-badge">Total Questions: ${filteredQuestions.length}</span>
                    </div>
                </div>
                <ul class="question-list">
        `;

        filteredQuestions.forEach((q, index) => {
            htmlContent += `
                <li class="question-item">
                    <span class="badge-mark">Unit ${q.unit} • ${q.question_type} Marks • ${q.level}</span>
                    ${q.title ? `<div class="question-title">${q.title}</div>` : ''}
                    <p class="question-text">${index + 1}. ${q.question}</p>
            `;
            if (q.title === 'Choose the correct answer' || q.option1) {
                htmlContent += `<ol class="options">`;
                if (q.option1) htmlContent += `<li>${q.option1}</li>`;
                if (q.option2) htmlContent += `<li>${q.option2}</li>`;
                if (q.option3) htmlContent += `<li>${q.option3}</li>`;
                if (q.option4) htmlContent += `<li>${q.option4}</li>`;
                htmlContent += `</ol>`;
            }
            htmlContent += `
                    <div class="answer-box">
                        <span class="answer-label">Correct Answer:</span> ${q.answer}
                    </div>
                </li>
            `;
        });

        htmlContent += `
                </ul>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=UTF-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g,'');
        a.download = `QuestionBank_${selectedSubjectFilter || 'Export'}_${dateStr}.html`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('HTML Question Paper downloaded successfully!');
    };

    // Difficulty level tag colors
    const getLevelTag = (level: string) => {
        if (level === 'Easy') return <Tag color="success" className="font-semibold rounded-md m-0">Easy</Tag>;
        if (level === 'Medium') return <Tag color="warning" className="font-semibold rounded-md m-0">Medium</Tag>;
        if (level === 'Hard') return <Tag color="error" className="font-semibold rounded-md m-0">Hard</Tag>;
        return <Tag className="rounded-md m-0">{level}</Tag>;
    };

    // Table view columns
    const columns: ColumnsType<Question> = [
        {
            title: '#',
            key: 'index',
            width: 55,
            align: 'center',
            render: (_t, _r, index) => <span className="font-semibold text-slate-400 text-xs">{index + 1}</span>,
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            key: 'unit',
            width: 90,
            align: 'center',
            sorter: (a, b) => a.unit - b.unit,
            render: unit => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Unit {unit}
                </span>
            ),
        },
        {
            title: 'Class',
            key: 'class_section',
            width: 130,
            render: (_, record) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    {record.class} - {record.section}
                </span>
            ),
        },
        {
            title: 'Marks',
            dataIndex: 'question_type',
            key: 'question_type',
            width: 90,
            align: 'center',
            sorter: (a, b) => a.question_type - b.question_type,
            render: marks => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {marks} {marks === 1 ? 'Mark' : 'Marks'}
                </span>
            ),
        },
        {
            title: 'Difficulty',
            dataIndex: 'level',
            key: 'level',
            width: 100,
            align: 'center',
            render: level => getLevelTag(level),
        },
        {
            title: 'Question & Details',
            dataIndex: 'question',
            key: 'question',
            render: (text, record) => (
                <div className="space-y-1 max-w-lg">
                    {record.title && (
                        <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {record.title}
                        </span>
                    )}
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-2 leading-relaxed">
                        {text}
                    </p>
                    {record.title === 'Choose the correct answer' && (
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 pt-0.5">
                            {record.option1 && <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">A: {record.option1}</span>}
                            {record.option2 && <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">B: {record.option2}</span>}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Answer Key',
            dataIndex: 'answer',
            key: 'answer',
            width: 170,
            render: answer => (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 line-clamp-2">
                    {answer}
                </span>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 130,
            align: 'right',
            render: (_, record) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Tooltip title="View Question Details">
                        <Button
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleViewQuestion(record)}
                            className="text-xs text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-400"
                        />
                    </Tooltip>
                    <Tooltip title="Edit Question">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => showModal(record)}
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
                            onConfirm={() => handleDelete(record.id)}
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} className="text-xs" />
                        </Popconfirm>
                    </Tooltip>
                </div>
            ),
        },
    ];

    const loading = questionBankLoading || mappingsLoading;

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
                            {selectedAcademicYearFilter && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                                    <CalendarOutlined className="text-slate-400" />
                                    <span>Year: {selectedAcademicYearFilter}</span>
                                </span>
                            )}
                        </div>

                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>Question Bank Repository</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Create, organize, bulk import, and manage multi-tier examination questions across subjects, units, and difficulty levels.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            icon={<ReloadOutlined spin={loading} />}
                            onClick={() => {
                                if (user?.organization_key && user?.staff_code) {
                                    dispatch(fetchQuestionsRequest({ organizationKey: user.organization_key, staffCode: user.staff_code }));
                                    message.success('Question bank refreshed.');
                                }
                            }}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Refresh
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleHtmlDownload}
                            disabled={filteredQuestions.length === 0}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Download Paper (HTML)
                        </Button>
                        <Button
                            icon={<UploadOutlined />}
                            onClick={showBulkModal}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Bulk Upload
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => showModal()}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-sm inline-flex items-center"
                        >
                            Add Question
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
                        <span className="text-xs text-slate-400">questions</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Units Covered
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
                            <FolderOpenOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.uniqueUnits}</span>
                        <span className="text-xs text-slate-400">units</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Difficulty Ratio
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                            <CheckCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {metrics.easyCount} Easy
                        </span>
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {metrics.mediumCount} Med
                        </span>
                        <span className="text-xs font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            {metrics.hardCount} Hard
                        </span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Objective / 1-Mark
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <FileTextOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.oneMarkCount}</span>
                        <span className="text-xs text-slate-400">MCQ & Objectives</span>
                    </div>
                </div>
            </div>

            {/* 3. Filters, Search & View Controls */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {/* Academic Year Filter */}
                        <div className="w-full sm:w-auto min-w-[150px]">
                            <Select
                                placeholder="Year"
                                className="w-full"
                                value={selectedAcademicYearFilter}
                                onChange={val => {
                                    setSelectedAcademicYearFilter(val);
                                    setSelectedClassFilter(null);
                                    setSelectedSectionFilter(null);
                                    setSelectedSubjectFilter(null);
                                }}
                                loading={mappingsLoading}
                            >
                                {academicYearOptions.map(year => (
                                    <Option key={year} value={year}>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarOutlined className="text-blue-500" />
                                            <span>{year}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Class Filter */}
                        <div className="w-full sm:w-auto min-w-[130px]">
                            <Select
                                placeholder="Class"
                                className="w-full"
                                value={selectedClassFilter}
                                onChange={val => {
                                    setSelectedClassFilter(val);
                                    setSelectedSectionFilter(null);
                                    setSelectedSubjectFilter(null);
                                }}
                                allowClear
                                disabled={!selectedAcademicYearFilter}
                            >
                                {classOptionsForFilter.map(c => (
                                    <Option key={c} value={c}>
                                        Class {c}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Section Filter */}
                        <div className="w-full sm:w-auto min-w-[120px]">
                            <Select
                                placeholder="Section"
                                className="w-full"
                                value={selectedSectionFilter}
                                onChange={val => {
                                    setSelectedSectionFilter(val);
                                    setSelectedSubjectFilter(null);
                                }}
                                allowClear
                                disabled={!selectedClassFilter}
                            >
                                {sectionOptionsForFilter.map(s => (
                                    <Option key={s} value={s}>
                                        Section {s}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Subject Filter */}
                        <div className="w-full sm:w-auto min-w-[160px]">
                            <Select
                                showSearch
                                placeholder="Subject"
                                className="w-full"
                                value={selectedSubjectFilter}
                                onChange={val => setSelectedSubjectFilter(val)}
                                allowClear
                                disabled={!selectedSectionFilter}
                                filterOption={(input, option) =>
                                    ((option?.children as unknown as string) || '')
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                            >
                                {subjectOptionsForFilter.map(s => (
                                    <Option key={s.subject_code} value={s.subject_code}>
                                        <span className="flex items-center gap-1.5">
                                            <BookOutlined className="text-indigo-400" />
                                            <span>{s.subject_name}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Unit Filter */}
                        <div className="w-full sm:w-auto min-w-[110px]">
                            <Select
                                placeholder="Unit"
                                className="w-full"
                                value={selectedUnitFilter}
                                onChange={val => setSelectedUnitFilter(val)}
                                allowClear
                            >
                                {availableUnitsInDataset.map(unit => (
                                    <Option key={unit} value={unit}>
                                        Unit {unit}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Difficulty Level Filter */}
                        <div className="w-full sm:w-auto min-w-[120px]">
                            <Select
                                placeholder="Difficulty"
                                className="w-full"
                                value={selectedLevelFilter}
                                onChange={val => setSelectedLevelFilter(val)}
                            >
                                <Option value="all">All Difficulties</Option>
                                <Option value="Easy">Easy</Option>
                                <Option value="Medium">Medium</Option>
                                <Option value="Hard">Hard</Option>
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto sm:flex-1 min-w-[180px]">
                            <Input
                                placeholder="Search question text or answer..."
                                prefix={<SearchOutlined className="text-slate-400" />}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                allowClear
                            />
                        </div>

                        {/* Reset Filter Button */}
                        {(selectedClassFilter ||
                            selectedSectionFilter ||
                            selectedSubjectFilter ||
                            selectedUnitFilter !== null ||
                            selectedLevelFilter !== 'all' ||
                            searchQuery) && (
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={handleResetFilters}
                                className="text-slate-600 border-slate-200 text-xs"
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    {/* View Mode Switcher */}
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

            {/* Error alert if any */}
            {questionBankError && (
                <Alert
                    message="Question Bank Error"
                    description={questionBankError}
                    type="error"
                    showIcon
                    closable
                    className="rounded-xl"
                />
            )}

            {/* 4. Main Content Area */}
            <Spin spinning={loading || subjectsLoading} tip="Loading question bank records...">
                {filteredQuestions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        No Questions Found
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        {searchQuery || selectedClassFilter || selectedSubjectFilter || selectedUnitFilter !== null
                                            ? 'No questions matched your selected filter criteria. Try clearing some filters.'
                                            : 'No questions have been added yet for this academic year. Click "Add Question" above or "Bulk Upload" to populate the question bank.'}
                                    </p>
                                </div>
                            }
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => showModal()}
                                className="bg-blue-600 hover:bg-blue-700 mt-2 font-medium"
                            >
                                Add First Question
                            </Button>
                        </Empty>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* CARDS VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {filteredQuestions.map((item, idx) => {
                            const isMCQ = item.title === 'Choose the correct answer' || !!item.option1;

                            return (
                                <div
                                    key={item.id || idx}
                                    className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:border-blue-200"
                                >
                                    <div className="space-y-3">
                                        {/* Card Top: Badges */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                    Unit {item.unit}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {item.class} - {item.section}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                    {item.question_type} {item.question_type === 1 ? 'Mark' : 'Marks'}
                                                </span>
                                            </div>
                                            {getLevelTag(item.level)}
                                        </div>

                                        {/* Title format if present */}
                                        {item.title && (
                                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                                {item.title}
                                            </span>
                                        )}

                                        {/* Question text */}
                                        <div>
                                            <p className="text-xs sm:text-sm font-semibold text-slate-800 line-clamp-3 leading-relaxed">
                                                {item.question}
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
                                                    Answer Key:
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
                                            Reg: {item.regulation || 'General'}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            <Tooltip title="View full details">
                                                <Button
                                                    size="small"
                                                    icon={<EyeOutlined />}
                                                    onClick={() => handleViewQuestion(item)}
                                                    className="text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                                >
                                                    View
                                                </Button>
                                            </Tooltip>
                                            <Tooltip title="Edit">
                                                <Button
                                                    size="small"
                                                    icon={<EditOutlined />}
                                                    onClick={() => showModal(item)}
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
                                                    onConfirm={() => handleDelete(item.id)}
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
                            columns={columns}
                            dataSource={filteredQuestions}
                            rowKey="id"
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

            {/* MODAL 1: Add or Edit Question */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            {editingQuestion ? <EditOutlined /> : <PlusOutlined />}
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                {editingQuestion ? 'Edit Question' : 'Add New Question'}
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                Configure curriculum question with difficulty rating and answer keys
                            </span>
                        </div>
                    </div>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={null}
                destroyOnClose
                width={780}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4 space-y-4">
                    {/* Header download format link */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500">
                            Have multiple questions? You can prepare them in Excel and bulk import.
                        </span>
                        <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadTemplate}
                            className="text-xs font-medium"
                        >
                            Download Format
                        </Button>
                    </div>

                    {/* Step 1: Target Class & Subject */}
                    <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 space-y-3">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                            Target Class & Subject Mapping
                        </span>
                        <Row gutter={12}>
                            <Col xs={24} sm={8}>
                                <Form.Item
                                    name="academic_year"
                                    label="Academic Year"
                                    rules={[{ required: true, message: 'Select academic year' }]}
                                >
                                    <Select
                                        placeholder="Year"
                                        loading={mappingsLoading}
                                        onChange={() =>
                                            form.setFieldsValue({
                                                class_key: null,
                                                subject_code: null,
                                                unit: null,
                                                question_type: null,
                                            })
                                        }
                                    >
                                        {(calendars || [])
                                            .filter((c: any) => c.status === 'Active')
                                            .map((cal: any) => (
                                                <Option key={cal.id} value={cal.academic_year}>
                                                    {cal.academic_year} {cal.is_current && '(Current)'}
                                                </Option>
                                            ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} sm={8}>
                                <Form.Item
                                    name="class_key"
                                    label="Class & Section"
                                    rules={[{ required: true, message: 'Select class & section' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select class"
                                        disabled={!form.getFieldValue('academic_year')}
                                    >
                                        {classOptions.map((opt: any) => (
                                            <Option key={opt.key} value={opt.key}>
                                                {opt.label}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} sm={8}>
                                <Form.Item
                                    name="subject_code"
                                    label="Subject"
                                    rules={[{ required: true, message: 'Select subject' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select subject"
                                        loading={mappingsLoading}
                                        disabled={!selectedClassKey}
                                    >
                                        {subjectOptions.map(subject => (
                                            <Option key={subject.subject_code} value={subject.subject_code}>
                                                {subject.subject_name}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* Step 2: Unit, Marks, Difficulty, Regulation */}
                    <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 space-y-3">
                        <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                            Unit, Marks & Difficulty Level
                        </span>
                        <Row gutter={12}>
                            <Col xs={12} sm={6}>
                                <Form.Item
                                    name="unit"
                                    label="Unit"
                                    rules={[{ required: true, message: 'Unit is required' }]}
                                >
                                    <Select placeholder="Unit" disabled={!selectedSubjectCode}>
                                        {availableUnitsAndMarks.units.map(unit => (
                                            <Option key={unit} value={unit}>
                                                Unit {unit}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={12} sm={6}>
                                <Form.Item
                                    name="question_type"
                                    label="Marks"
                                    rules={[{ required: true, message: 'Marks required' }]}
                                >
                                    <Select placeholder="Marks" disabled={!selectedSubjectCode}>
                                        {availableUnitsAndMarks.marks.map(mark => (
                                            <Option key={mark} value={mark}>
                                                {mark} {mark === 1 ? 'Mark' : 'Marks'}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={12} sm={6}>
                                <Form.Item
                                    name="level"
                                    label="Difficulty"
                                    rules={[{ required: true, message: 'Select level' }]}
                                >
                                    <Select placeholder="Difficulty">
                                        <Option value="Easy">Easy</Option>
                                        <Option value="Medium">Medium</Option>
                                        <Option value="Hard">Hard</Option>
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={12} sm={6}>
                                <Form.Item name="regulation" label="Regulation">
                                    <Input disabled className="bg-white" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* Step 3: Question Text & MCQ Options */}
                    <div className="space-y-3">
                        {selectedMarkType === 1 && (
                            <Form.Item name="title" label="Objective Format">
                                <Select placeholder="Choose 1-Mark Question Format" allowClear>
                                    <Option value="Choose the correct answer">Choose the correct answer (MCQ)</Option>
                                    <Option value="Match the following">Match the following</Option>
                                    <Option value="Fill in the blanks">Fill in the blanks</Option>
                                </Select>
                            </Form.Item>
                        )}

                        <Form.Item
                            name="question"
                            label="Question Statement"
                            rules={[{ required: true, message: 'Please enter question text' }]}
                        >
                            <TextArea
                                rows={3}
                                placeholder="Enter the complete question text here..."
                                className="rounded-xl"
                            />
                        </Form.Item>

                        {selectedMarkType === 1 && selectedTitle === 'Choose the correct answer' && (
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
                                            <Input placeholder="Option A text" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item
                                            name="option2"
                                            label="Option B"
                                            rules={[{ required: true, message: 'Option B required' }]}
                                        >
                                            <Input placeholder="Option B text" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="option3" label="Option C">
                                            <Input placeholder="Option C text (optional)" />
                                        </Form.Item>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Form.Item name="option4" label="Option D">
                                            <Input placeholder="Option D text (optional)" />
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        <Form.Item
                            name="answer"
                            label="Correct Answer Key"
                            rules={[{ required: true, message: 'Please enter correct answer key' }]}
                        >
                            <Input placeholder="Enter the exact answer or key..." className="rounded-lg" />
                        </Form.Item>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <Button onClick={handleCancel}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={loading} className="bg-blue-600 hover:bg-blue-700">
                            {editingQuestion ? 'Update Question' : 'Save Question'}
                        </Button>
                    </div>
                </Form>
            </Modal>

            {/* MODAL 2: Bulk Upload Questions via Excel */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm font-bold">
                            <UploadOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">Bulk Upload Questions</span>
                            <span className="block text-xs font-medium text-slate-400">
                                Import full question sets via Microsoft Excel (.xlsx, .xls)
                            </span>
                        </div>
                    </div>
                }
                open={isBulkModalVisible}
                onCancel={handleBulkCancel}
                destroyOnClose
                width={780}
                footer={[
                    <Button key="back" onClick={handleBulkCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        disabled={!fileList.length || !parsedData.length}
                        loading={loading}
                        onClick={() => bulkUploadForm.submit()}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Upload {parsedData.length > 0 ? `(${parsedData.length}) Questions` : ''}
                    </Button>,
                ]}
                className="rounded-2xl"
            >
                <Form
                    form={bulkUploadForm}
                    layout="vertical"
                    onFinish={handleBulkSubmit}
                    className="mt-4 space-y-4"
                >
                    <Spin spinning={mappingsLoading}>
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-3">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                Select Target Class & Subject
                            </span>
                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="academic_year"
                                        label="Academic Year"
                                        rules={[{ required: true, message: 'Please select academic year' }]}
                                    >
                                        <Select
                                            placeholder="Select year"
                                            onChange={() =>
                                                bulkUploadForm.setFieldsValue({
                                                    class_key: null,
                                                    subject_code: null,
                                                })
                                            }
                                        >
                                            {(calendars || [])
                                                .filter((c: any) => c.status === 'Active')
                                                .map((cal: any) => (
                                                    <Option key={cal.id} value={cal.academic_year}>
                                                        {cal.academic_year} {cal.is_current && '(Current)'}
                                                    </Option>
                                                ))}
                                        </Select>
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="class_key"
                                        label="Class & Section"
                                        rules={[{ required: true, message: 'Please select class' }]}
                                    >
                                        <Select
                                            showSearch
                                            placeholder="Select class"
                                            disabled={!bulkUploadForm.getFieldValue('academic_year')}
                                        >
                                            {bulkClassOptions.map((opt: any) => (
                                                <Option key={opt.key} value={opt.key}>
                                                    {opt.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="subject_code"
                                        label="Subject"
                                        rules={[{ required: true, message: 'Please select subject' }]}
                                    >
                                        <Select
                                            showSearch
                                            placeholder="Select subject"
                                            disabled={!bulkSelectedClassKey}
                                        >
                                            {subjectOptions.map(subject => (
                                                <Option key={subject.subject_code} value={subject.subject_code}>
                                                    {subject.subject_name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <Form.Item name="regulation" label="Regulation">
                                        <Input disabled className="bg-white" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>
                    </Spin>

                    {/* File Upload Zone */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                Upload Spreadsheet File
                            </span>
                            <Button
                                size="small"
                                icon={<DownloadOutlined />}
                                onClick={handleDownloadTemplate}
                                className="text-xs"
                            >
                                Download Excel Template
                            </Button>
                        </div>

                        <Dragger
                            name="file"
                            multiple={false}
                            accept=".xlsx, .xls, .csv"
                            fileList={fileList}
                            beforeUpload={() => false}
                            onChange={handleFileChange}
                            onRemove={() => {
                                setFileList([]);
                                setParsedData([]);
                                setUploadError(null);
                            }}
                            disabled={!bulkSelectedSubjectCode}
                            className="bg-slate-50 rounded-xl border-dashed"
                        >
                            <p className="ant-upload-drag-icon text-emerald-500">
                                <FileExcelOutlined style={{ fontSize: 40 }} />
                            </p>
                            <p className="text-sm font-semibold text-slate-700">
                                Click or drag Excel file to this area to upload
                            </p>
                            <p className="text-xs text-slate-400">
                                Supports .xlsx, .xls and .csv formatted spreadsheets.
                            </p>
                        </Dragger>

                        {uploadError && (
                            <Alert
                                message="File Validation Error"
                                description={uploadError}
                                type="error"
                                showIcon
                                className="rounded-xl mt-3"
                            />
                        )}

                        {parsedData.length > 0 && (
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
                                <span className="font-semibold flex items-center gap-1.5">
                                    <CheckCircleOutlined className="text-emerald-600" />
                                    Parsed {parsedData.length} valid questions ready for upload.
                                </span>
                                <Tag color="success" className="font-bold">
                                    Validated
                                </Tag>
                            </div>
                        )}
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
                                Complete question preview with answer keys and metadata
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
                                const text = `Q: ${viewingQuestion.question}\nAns: ${viewingQuestion.answer}`;
                                navigator.clipboard.writeText(text);
                                message.success('Question and answer copied!');
                            }
                        }}
                    >
                        Copy Question
                    </Button>,
                    <Button
                        key="edit"
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => {
                            setIsViewModalVisible(false);
                            if (viewingQuestion) showModal(viewingQuestion);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        Edit Question
                    </Button>,
                    <Button key="close" onClick={handleViewCancel}>
                        Close
                    </Button>,
                ]}
                width={650}
                className="rounded-2xl"
            >
                {viewingQuestion && (
                    <div className="space-y-4 py-2">
                        {/* Meta Tags Row */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                                <span className="text-slate-400 block text-[11px]">Class:</span>
                                <span className="font-bold text-slate-700">
                                    {viewingQuestion.class} - {viewingQuestion.section}
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Unit:</span>
                                <span className="font-bold text-slate-700">Unit {viewingQuestion.unit}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Marks:</span>
                                <span className="font-bold text-slate-700">
                                    {viewingQuestion.question_type} Marks
                                </span>
                            </div>
                            <div>
                                <span className="text-slate-400 block text-[11px]">Difficulty:</span>
                                {getLevelTag(viewingQuestion.level)}
                            </div>
                        </div>

                        {/* Question Format Title if any */}
                        {viewingQuestion.title && (
                            <span className="inline-block px-2.5 py-1 rounded text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {viewingQuestion.title}
                            </span>
                        )}

                        {/* Question Statement */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                Question Statement:
                            </span>
                            <p className="text-sm sm:text-base font-semibold text-slate-800 leading-relaxed">
                                {viewingQuestion.question}
                            </p>
                        </div>

                        {/* Options if MCQ */}
                        {viewingQuestion.title === 'Choose the correct answer' && (
                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2">
                                <span className="font-bold text-xs uppercase tracking-wider text-slate-500 block">
                                    Options
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                        <span className="font-bold text-slate-400 mr-1.5">A.</span>
                                        <span className="font-semibold text-slate-700">{viewingQuestion.option1}</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                        <span className="font-bold text-slate-400 mr-1.5">B.</span>
                                        <span className="font-semibold text-slate-700">{viewingQuestion.option2}</span>
                                    </div>
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
                                <span>Correct Answer Key</span>
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

export default QuestionBank;
