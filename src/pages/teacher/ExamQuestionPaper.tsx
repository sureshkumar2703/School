/**
 * Teacher Exam Question Paper Generator & Blueprint Composer
 * Sri Gayathri SMS Portal
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
    Typography,
    InputNumber,
    TimePicker,
    Checkbox,
    Divider,
    Alert,
    Spin,
    message,
    List,
    Switch,
    Tooltip,
    Tag,
    Progress,
    Badge,
    Empty,
} from 'antd';
import {
    PlusOutlined,
    DeleteOutlined,
    MinusCircleOutlined,
    SaveOutlined,
    PrinterOutlined,
    ArrowLeftOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    BookOutlined,
    TeamOutlined,
    BulbOutlined,
    CalculatorOutlined,
    SafetyCertificateOutlined,
    FileDoneOutlined,
    ReloadOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchExamTimetablesRequest } from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import { fetchUnitMarksRequest } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import {
    generatePaperRequest,
    clearGeneratedPaper,
    fetchQuestionsRequest,
    type Question,
} from '../../store/features/question-bank/questionBankSlice';
import {
    saveQuestionPaperRequest,
    fetchQuestionPapersRequest,
} from '../../store/features/question-paper/questionPaperSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const unitColors = ['#e6f7ff', '#f6ffed', '#fffbe6', '#fff1f0', '#f9f0ff', '#e6fffb', '#fff0f6', '#fff7e6', '#f0fff0', '#e6e6fa'];
const getUnitColor = (unit: number) => unitColors[unit % unitColors.length];

// Helper to split answers by newline
const splitAnswers = (raw: string | undefined | null): string[] => {
    if (!raw) return [];
    return raw
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);
};

// Standard Fisher-Yates shuffle algorithm
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const shuffleArray = (array: any[]): any[] => {
    let currentIndex = array.length, randomIndex;
    const newArray = [...array];
    while (currentIndex > 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]];
    }
    return newArray;
};

const ShuffledAnswerBank: React.FC<{ questionIds: string[]; allQuestions: Question[] }> = ({ questionIds, allQuestions }) => {
    const answerBank = useMemo(() => {
        if (!questionIds || !Array.isArray(questionIds) || questionIds.some(id => !id) || !allQuestions || allQuestions.length === 0) {
            return [];
        }
        const allAnswers = questionIds.flatMap(id => {
            const question = allQuestions.find(q => q.id === id);
            return splitAnswers(question?.answer);
        });
        return shuffleArray(allAnswers);
    }, [questionIds, allQuestions]);

    if (answerBank.length === 0) {
        return null;
    }

    return (
        <div className="mt-2 p-3 bg-amber-50/70 rounded-xl border border-amber-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1.5">
                <BulbOutlined />
                <span>Shuffled Answer Bank (Student Reference)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {answerBank.map((answer, index) => (
                    <Tag key={`${answer}-${index}`} color="orange" className="rounded-md px-2 py-0.5 text-xs m-0 font-medium">
                        {String.fromCharCode(65 + index)}) {answer}
                    </Tag>
                ))}
            </div>
        </div>
    );
};

const ExamQuestionPaper: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const [form] = Form.useForm();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { timetables: examTimetables, loading: timetablesLoading } = useSelector((state: RootState) => state.examTimetableAdmin);
    const { unitMarks, loading: unitMarksLoading } = useSelector((state: RootState) => state.setUnitMark);
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const { loading: questionBankLoading, generatedPaper, error: questionBankError, questions: allQuestions } = useSelector((state: RootState) => state.questionBank);
    const { loading: questionPaperLoading, questionPapers } = useSelector((state: RootState) => state.questionPaper);

    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [calculatedMarks, setCalculatedMarks] = useState(0);
    const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);

    const allFormValues = Form.useWatch([], form);
    const selectedUnit = Form.useWatch('unit', form) || [];
    const selectedMarkTypes = Form.useWatch('mark_types', form) || [];
    const totalMarksForPaper = Form.useWatch('total_mark', form);
    const selectedClassKey = Form.useWatch('class_key', form);
    const selectedSubject = Form.useWatch('subject', form);

    const allSelectedQuestionIds = useMemo(() => {
        const selected = new Set<string>();
        const parts = allFormValues?.parts || [];
        parts.forEach((part: any) => {
            if (!part) return;

            if (part.is_choice && part.manual_choice_questions) {
                Object.values(part.manual_choice_questions).forEach((choicePair: any) => {
                    if (choicePair?.a) selected.add(choicePair.a);
                    if (choicePair?.b) selected.add(choicePair.b);
                });
            } else if (part.manual_questions) {
                if (part.mark_type === 1) {
                    Object.values(part.manual_questions).forEach((questionTypeGroup: any) => {
                        if (questionTypeGroup) {
                            Object.values(questionTypeGroup).forEach((id: any) => {
                                if (id) selected.add(id);
                            });
                        }
                    });
                } else {
                    const questionGroup = part.manual_questions[part.mark_type];
                    if (Array.isArray(questionGroup)) {
                        questionGroup.forEach((id: string) => {
                            if (id) selected.add(id);
                        });
                    }
                }
            }
        });
        return selected;
    }, [allFormValues]);

    const areAllQuestionsSelected = useMemo(() => {
        const parts = allFormValues?.parts || [];
        if (parts.length === 0) return false;

        return parts.every((part: any) => {
            if (!part || !part.mark_type) return false;

            if (part.is_choice && part.manual_choice_questions) {
                const numToProvide = part.total_questions || 0;
                for (let i = 0; i < numToProvide; i++) {
                    const choicePair = part.manual_choice_questions[i];
                    if (!choicePair || !choicePair.a || !choicePair.b) {
                        return false;
                    }
                }
            } else if (part.manual_questions) {
                if (part.mark_type === 1) {
                    const oneMarkTypesInForm = allFormValues.one_mark_question_types || [];
                    if (oneMarkTypesInForm.length === 0 && Object.keys(part.one_mark_counts || {}).length === 0) return true;

                    for (const type of oneMarkTypesInForm) {
                        const numToProvide = part.one_mark_counts?.[type] || 0;
                        for (let i = 0; i < numToProvide; i++) {
                            if (!part.manual_questions[type] || !part.manual_questions[type][i]) {
                                return false;
                            }
                        }
                    }
                } else {
                    const numToProvide = part.total_questions || 0;
                    const questionGroup = part.manual_questions[part.mark_type];
                    if (!questionGroup || questionGroup.length < numToProvide) {
                        return false;
                    }
                    for (let i = 0; i < numToProvide; i++) {
                        if (!questionGroup[i]) {
                            return false;
                        }
                    }
                }
            } else {
                if ((part.mark_type === 1 && (part.one_mark_counts && Object.values(part.one_mark_counts).some((v: any) => v > 0))) || (part.mark_type > 1 && part.total_questions > 0)) {
                    return false;
                }
            }
            return true;
        });
    }, [allFormValues]);

    const oneMarkTypes = [
        'Choose the correct answer',
        'Match the Following',
        'Fill in the blanks'
    ];

    useEffect(() => {
        if (generatedPaper) {
            setIsPaperModalVisible(true);
        }
    }, [generatedPaper]);

    useEffect(() => {
        if (questionBankError) {
            message.error(questionBankError);
            dispatch(clearGeneratedPaper());
        }
    }, [questionBankError, dispatch]);

    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchUnitMarksRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
            dispatch(fetchRegulationsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchQuestionsRequest({
                organizationKey: user.organization_key,
                staffCode: user.staff_code,
            }));
            dispatch(fetchQuestionPapersRequest(user.organization_key));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (calendars && calendars.length > 0 && !selectedAcademicYear) {
            const currentYear = calendars.find((c: any) => c.is_current)?.academic_year;
            setSelectedAcademicYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedAcademicYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        if (!selectedAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedAcademicYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: any, m: any) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `${m.class_name} - ${m.section_name}`
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());
        return Array.from(uniqueClasses.values()).sort((a: any, b: any) => a.label.localeCompare(b.label));
    }, [myAssignments, selectedAcademicYear]);

    const subjectOptions = useMemo(() => {
        if (!selectedClassKey || !subjects) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectNamesForClass = myAssignments
            .filter((m: any) => m.class_name === className && m.section_name === sectionName && m.academic_year === academicYear)
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNamesForClass.includes(s.subject_name));
    }, [myAssignments, selectedClassKey, subjects]);

    const matchingTimetable = useMemo(() => {
        if (!selectedClassKey || !selectedSubject || !examTimetables) return null;

        const [className, sectionName, academicYear] = selectedClassKey.split('||');

        return examTimetables.find(tt =>
            tt.class_name === className &&
            tt.section_name === sectionName &&
            tt.academic_year === academicYear &&
            tt.exam_days.some(day => day.subject === selectedSubject)
        );
    }, [selectedClassKey, selectedSubject, examTimetables]);

    const availableUnitsAndMarks = useMemo(() => {
        if (allQuestions.length === 0) return { units: [], marks: [] };
        const units = [...new Set(allQuestions.map(q => q.unit))].sort((a, b) => a - b);

        let marks: number[] = [];
        if (selectedUnit.length > 0) {
            const questionsInSelectedUnits = allQuestions.filter(q => selectedUnit.includes(q.unit));
            marks = [...new Set(questionsInSelectedUnits.map(q => q.question_type))].sort((a, b) => a - b);
        }

        return { units, marks };
    }, [allQuestions, selectedUnit]);

    useEffect(() => {
        if (matchingTimetable) {
            const examDay = matchingTimetable.exam_days.find(d => d.subject === selectedSubject);
            form.setFieldsValue({
                exam_title: matchingTimetable.exam_title,
                total_mark: matchingTimetable.exam_total_mark,
                time: dayjs(matchingTimetable.exam_time, 'HH:mm:ss'),
                exam_date: examDay ? dayjs(examDay.examdate).format('YYYY-MM-DD') : null,
            });
        } else {
            form.resetFields(['exam_title', 'total_mark', 'time', 'exam_date']);
        }
    }, [matchingTimetable, selectedSubject, form]);

    const handleYearChange = (year: string | null) => {
        setSelectedAcademicYear(year);
        form.setFieldsValue({ class_key: null, subject: null, unit: [], mark_types: [], parts: [] });
    };

    const handleClassChange = (key: string | null) => {
        form.setFieldsValue({
            class_key: key,
            subject: null,
            unit: [],
            mark_types: [],
            parts: [],
        });
    };

    const handleSubjectChange = (subject: string | null) => {
        form.setFieldsValue({
            subject: subject,
            unit: [],
            mark_types: [],
            parts: [],
        });
    };

    const handleUnitChange = () => {
        form.setFieldsValue({ mark_types: [], parts: [] });
    };

    const onFormValuesChange = (_: any, allValues: any) => {
        const parts = allValues.parts || [];
        const total = parts.reduce((acc: number, part: any) => {
            if (!part) return acc;
            const marksPerQuestion = part.mark_type || 0;
            if (marksPerQuestion === 1) {
                const oneMarkCounts = part.one_mark_counts || {};
                const oneMarkTotal = Object.entries(oneMarkCounts)
                    .filter(([key]) => key.endsWith('_answer'))
                    .reduce((sum: number, [, value]: [string, any]) => sum + (Number(value) || 0), 0);
                return acc + oneMarkTotal;
            } else {
                const numToAnswer = part.questions_to_answer || 0;
                return acc + (numToAnswer * marksPerQuestion);
            }
        }, 0);
        setCalculatedMarks(total);
    };

    const onFinish = () => {
        const values = form.getFieldsValue();
        if (!values.class_key) {
            message.error("Class information is missing. Cannot generate paper.");
            return;
        }
        const [className, sectionName, academicYear] = values.class_key.split('||');

        const payload = {
            ...values,
            organizationKey: user!.organization_key,
            staffCode: user!.staff_code,
            className,
            sectionName,
            academicYear,
            subject: selectedSubject,
        };
        dispatch(generatePaperRequest(payload));
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        pageStyle: `@page { size: A4; margin: 20mm; } @media print { body { -webkit-print-color-adjust: exact; } .printable-area .ant-row { display: block; width: 100%; } .printable-area .ant-col { display: block; width: 100% !important; max-width: 100% !important; flex: 0 0 100% !important; } }`,
    });

    const handlePaperModalClose = () => {
        setIsPaperModalVisible(false);
        dispatch(clearGeneratedPaper());
    };

    const handleConfirmAndSave = () => {
        if (!generatedPaper || !user || !printRef.current) return;

        const { template } = generatedPaper;
        if (!template.class_key) {
            message.error("Cannot save paper: Class information is missing in the template.");
            return;
        }

        const [className, sectionName, academicYear] = template.class_key.split('||');
        const paperContent = printRef.current.innerHTML;

        const payload = {
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            academic_year: academicYear,
            class_name: className,
            section_name: sectionName,
            subject: template.subject,
            exam_title: template.exam_title,
            exam_date: template.exam_date,
            exam_time: template.time ? dayjs(template.time).format('HH:mm:ss') : null,
            total_mark: template.total_mark,
            school_details: schoolDetails,
            paper_content: paperContent,
        };

        dispatch(saveQuestionPaperRequest(payload as any));
        handlePaperModalClose();
        form.resetFields();
    };

    const isCreateButtonDisabled = calculatedMarks !== totalMarksForPaper || calculatedMarks === 0 || !areAllQuestionsSelected;
    const isLoading = mappingsLoading || subjectsLoading || timetablesLoading || unitMarksLoading || questionBankLoading;
    const examDate = matchingTimetable?.exam_days.find(d => d.subject === selectedSubject)?.examdate;

    const paperAlreadyExists = useMemo(() => {
        if (!selectedClassKey || !selectedSubject || !selectedAcademicYear) return false;
        const [className, sectionName] = selectedClassKey.split('||');
        return questionPapers.some(p =>
            p.academic_year === selectedAcademicYear &&
            p.class_name === className &&
            p.section_name === sectionName &&
            p.subject === selectedSubject
        );
    }, [questionPapers, selectedAcademicYear, selectedClassKey, selectedSubject]);

    const isUnitDisabled = !selectedSubject || !form.getFieldValue('exam_date') || !form.getFieldValue('exam_title') || !form.getFieldValue('time') || paperAlreadyExists;

    // Remaining marks calculation
    const targetMarks = totalMarksForPaper || 0;
    const marksDifference = targetMarks - calculatedMarks;
    const marksProgressPercent = targetMarks > 0 ? Math.min(100, Math.round((calculatedMarks / targetMarks) * 100)) : 0;
    const partsCount = (allFormValues?.parts || []).filter(Boolean).length;

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 md:p-6 space-y-5">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: auto;
                        padding: 20px;
                        margin: 0;
                    }
                    .printable-area .ant-row {
                        display: block;
                        width: 100%;
                    }
                    .printable-area .ant-col {
                        display: block;
                        width: 100% !important;
                        max-width: 100% !important;
                        flex: 0 0 100% !important;
                    }
                }
                .scrollable-select .ant-select-selection-overflow {
                    flex-wrap: nowrap;
                    overflow-x: auto;
                }
                .scrollable-select .ant-select-selection-item {
                    white-space: nowrap;
                }
                .scrollable-select-dropdown .ant-select-item-option-content {
                    white-space: normal;
                }
                .choice-select .ant-select-selector {
                    overflow-x: auto;
                    white-space: nowrap;
                }
                .choice-select .ant-select-selection-item-content {
                    white-space: normal;
                    overflow: visible;
                }
                .scrollable-dropdown .ant-select-item-option-content {
                    white-space: normal;
                }
            `}</style>

            {/* Top Navigation & Header Card */}
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
                            <FileTextOutlined className="text-2xl" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight m-0">
                                    Exam Question Paper Generator
                                </h1>
                                <Tag color="indigo" className="rounded-full px-2.5 py-0.5 text-xs font-semibold m-0">
                                    Blueprint Composer
                                </Tag>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 m-0 mt-0.5">
                                Select exam schedule, assemble syllabus parts, and generate standardized printable examination papers
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                        <Button
                            icon={<EyeOutlined />}
                            onClick={() => dispatch(setCurrentPage('templates'))}
                            className="rounded-xl border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 font-medium h-9"
                        >
                            View Saved Papers
                        </Button>
                        <Tag color="cyan" className="rounded-xl px-3 py-1 font-medium m-0 flex items-center gap-1.5 border-0 bg-cyan-50 text-cyan-700">
                            <TeamOutlined />
                            <span>{user?.full_name || 'Faculty'}</span>
                        </Tag>
                        {selectedAcademicYear && (
                            <Tag color="blue" className="rounded-xl px-3 py-1 font-medium m-0 flex items-center gap-1.5 border-0 bg-blue-50 text-blue-700">
                                <CalendarOutlined />
                                <span>{selectedAcademicYear}</span>
                            </Tag>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Blueprint Status & Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Target Marks */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Target Marks</span>
                        <div className="h-8 w-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <SafetyCertificateOutlined className="text-base" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{targetMarks}</span>
                        <span className="text-xs text-slate-500 font-medium">Marks</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 truncate">
                        {matchingTimetable ? matchingTimetable.exam_title : 'Auto-synced from timetable'}
                    </div>
                </div>

                {/* 2. Assigned Marks & Progress */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Assigned Marks</span>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                            calculatedMarks === targetMarks && targetMarks > 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : calculatedMarks > targetMarks
                                ? 'bg-rose-50 text-rose-600'
                                : 'bg-amber-50 text-amber-600'
                        }`}>
                            <CalculatorOutlined className="text-base" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{calculatedMarks}</span>
                        <span className="text-xs text-slate-500 font-medium">/ {targetMarks} Marks</span>
                    </div>
                    <div className="mt-2">
                        <Progress
                            percent={marksProgressPercent}
                            size="small"
                            status={
                                calculatedMarks === targetMarks && targetMarks > 0
                                    ? 'success'
                                    : calculatedMarks > targetMarks
                                    ? 'exception'
                                    : 'active'
                            }
                            strokeColor={
                                calculatedMarks === targetMarks && targetMarks > 0
                                    ? '#10b981'
                                    : calculatedMarks > targetMarks
                                    ? '#f43f5e'
                                    : '#6366f1'
                            }
                            showInfo={false}
                        />
                    </div>
                </div>

                {/* 3. Balance Remaining */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Blueprint Status</span>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                            marksDifference === 0 && targetMarks > 0
                                ? 'bg-emerald-50 text-emerald-600'
                                : marksDifference > 0
                                ? 'bg-amber-50 text-amber-600'
                                : 'bg-rose-50 text-rose-600'
                        }`}>
                            {marksDifference === 0 && targetMarks > 0 ? (
                                <CheckCircleOutlined className="text-base" />
                            ) : (
                                <ExclamationCircleOutlined className="text-base" />
                            )}
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        {targetMarks === 0 ? (
                            <span className="text-xl font-bold text-slate-400">Select Exam</span>
                        ) : marksDifference === 0 ? (
                            <span className="text-xl font-bold text-emerald-600">✓ Balanced</span>
                        ) : marksDifference > 0 ? (
                            <span className="text-xl font-bold text-amber-600">{marksDifference} Left</span>
                        ) : (
                            <span className="text-xl font-bold text-rose-600">{Math.abs(marksDifference)} Over</span>
                        )}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        {marksDifference === 0 && targetMarks > 0
                            ? (areAllQuestionsSelected ? 'Ready to generate' : 'Select all questions')
                            : `${partsCount} part(s) configured`}
                    </div>
                </div>

                {/* 4. Question Bank Readiness */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bank Coverage</span>
                        <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                            <BookOutlined className="text-base" />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{allQuestions.length}</span>
                        <span className="text-xs text-slate-500 font-medium">Questions in Bank</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                        {selectedUnit.length > 0 ? `${selectedUnit.length} Unit(s) selected` : 'Choose syllabus units below'}
                    </div>
                </div>
            </div>

            {/* Main Form Container */}
            <Spin spinning={isLoading} tip="Syncing timetables & question bank...">
                <Form form={form} layout="vertical" onValuesChange={onFormValuesChange} onFinish={onFinish}>

                    {/* Step 1: Exam Context & Timetable Setup */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                    1
                                </span>
                                <h2 className="text-base font-bold text-slate-800 m-0">
                                    Academic & Timetable Context
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Required for auto-fill</span>
                        </div>

                        <Row gutter={[16, 12]}>
                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="academic_year"
                                    label={<span className="text-xs font-semibold text-slate-600">Academic Year</span>}
                                >
                                    <Select
                                        placeholder="Select Academic Year"
                                        style={{ width: '100%' }}
                                        value={selectedAcademicYear}
                                        onChange={handleYearChange}
                                        loading={mappingsLoading}
                                        className="rounded-lg"
                                    >
                                        {(calendars || []).map((cal: any) => (
                                            <Option key={cal.id} value={cal.academic_year}>
                                                {cal.academic_year} {cal.is_current && "(Current Year)"}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="class_key"
                                    label={<span className="text-xs font-semibold text-slate-600">Class & Section</span>}
                                    rules={[{ required: true, message: 'Class is required' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select Class & Section"
                                        style={{ width: '100%' }}
                                        onChange={handleClassChange}
                                        disabled={!selectedAcademicYear}
                                        allowClear
                                        className="rounded-lg"
                                    >
                                        {classOptions.map((opt: any) => (
                                            <Option key={opt.key} value={opt.key}>{opt.label}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={8}>
                                <Form.Item
                                    name="subject"
                                    label={<span className="text-xs font-semibold text-slate-600">Subject</span>}
                                    rules={[{ required: true, message: 'Subject is required' }]}
                                >
                                    <Select
                                        showSearch
                                        placeholder="Select Subject"
                                        style={{ width: '100%' }}
                                        onChange={handleSubjectChange}
                                        disabled={!selectedClassKey}
                                        allowClear
                                        className="rounded-lg"
                                    >
                                        {subjectOptions.map(sub => (
                                            <Option key={sub.subject_code} value={sub.subject_name}>{sub.subject_name}</Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Matching Timetable Banner */}
                        {matchingTimetable ? (
                            <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Tag color="green" className="m-0 text-xs font-semibold rounded-md">
                                            ✓ Timetable Verified
                                        </Tag>
                                        <span className="font-bold text-slate-800 text-sm">{matchingTimetable.exam_title}</span>
                                    </div>
                                    <div className="text-xs text-slate-600 flex flex-wrap gap-4">
                                        <span>📅 Date: <strong className="text-slate-800">{examDate ? dayjs(examDate).format('DD MMM YYYY') : 'Not Set'}</strong></span>
                                        <span>⏱️ Duration: <strong className="text-slate-800">{matchingTimetable.exam_time || 'N/A'}</strong></span>
                                        <span>🎯 Total Marks: <strong className="text-indigo-700 font-bold">{matchingTimetable.exam_total_mark} Marks</strong></span>
                                    </div>
                                </div>
                                <div className="hidden md:block">
                                    <Tag color="indigo" className="m-0 rounded-lg px-2.5 py-1 text-xs">
                                        Synced Automatically
                                    </Tag>
                                </div>
                            </div>
                        ) : selectedClassKey && selectedSubject ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="No Exam Timetable Found"
                                description="No active exam timetable entry was found matching this class and subject. Please ensure the exam schedule is published by admin in Exam Timetables."
                                className="rounded-xl"
                            />
                        ) : null}

                        {/* Existing Paper Warning */}
                        {paperAlreadyExists && (
                            <Alert
                                type="error"
                                showIcon
                                message="Question Paper Already Exists"
                                description={
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-1">
                                        <span>A confirmed question paper has already been saved for this Class, Subject, and Academic Year.</span>
                                        <Button
                                            size="small"
                                            type="primary"
                                            danger
                                            onClick={() => dispatch(setCurrentPage('templates'))}
                                            className="rounded-lg text-xs"
                                        >
                                            View in Saved Papers
                                        </Button>
                                    </div>
                                }
                                className="rounded-xl"
                            />
                        )}

                        {/* Auto-filled Metadata Fields (Hidden or read-only) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            <Form.Item name="exam_date" label={<span className="text-xs text-slate-500">Exam Date</span>} className="mb-0">
                                <Input placeholder="Auto-filled" disabled className="rounded-lg bg-slate-50 text-xs" />
                            </Form.Item>
                            <Form.Item name="exam_title" label={<span className="text-xs text-slate-500">Exam Title</span>} className="mb-0">
                                <Input placeholder="Auto-filled" disabled className="rounded-lg bg-slate-50 text-xs" />
                            </Form.Item>
                            <Form.Item name="time" label={<span className="text-xs text-slate-500">Duration</span>} className="mb-0">
                                <TimePicker format="HH:mm" style={{ width: '100%' }} disabled className="rounded-lg bg-slate-50 text-xs" />
                            </Form.Item>
                            <Form.Item name="total_mark" label={<span className="text-xs text-slate-500">Total Marks</span>} className="mb-0">
                                <InputNumber placeholder="Marks" style={{ width: '100%' }} disabled className="rounded-lg bg-slate-50 text-xs" />
                            </Form.Item>
                        </div>
                    </div>

                    {/* Step 2: Syllabus Units & Mark Coverage */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                    2
                                </span>
                                <h2 className="text-base font-bold text-slate-800 m-0">
                                    Syllabus & Question Coverage
                                </h2>
                            </div>
                            <span className="text-xs text-slate-400 font-medium">Select syllabus scope</span>
                        </div>

                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    name="unit"
                                    label={<span className="text-xs font-semibold text-slate-600">Select Units for Paper</span>}
                                    help={isUnitDisabled && paperAlreadyExists ? "A paper for this class/subject already exists." : null}
                                >
                                    <Select
                                        mode="multiple"
                                        allowClear
                                        placeholder="Select Unit(s) to include"
                                        disabled={isUnitDisabled}
                                        onChange={handleUnitChange}
                                        className="rounded-lg scrollable-select"
                                    >
                                        {availableUnitsAndMarks.units.map(unit => (
                                            <Option key={unit} value={unit}>
                                                Unit {unit}
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            {selectedUnit && selectedUnit.length > 0 && (
                                <Col xs={24} md={12}>
                                    <Form.Item
                                        name="mark_types"
                                        label={<span className="text-xs font-semibold text-slate-600">Available Mark Types in Selected Units</span>}
                                    >
                                        <Checkbox.Group
                                            options={availableUnitsAndMarks.marks.map(m => ({
                                                label: `${m} Mark`,
                                                value: m
                                            }))}
                                            className="pt-1 flex flex-wrap gap-2"
                                        />
                                    </Form.Item>
                                </Col>
                            )}

                            {selectedMarkTypes?.includes(1) && (
                                <Col xs={24}>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <Form.Item
                                            name="one_mark_question_types"
                                            label={<span className="text-xs font-semibold text-slate-700">1-Mark Objective Question Types to Include</span>}
                                            className="mb-0"
                                        >
                                            <Checkbox.Group
                                                options={oneMarkTypes.map(type => ({
                                                    label: type,
                                                    value: type
                                                }))}
                                                className="flex flex-wrap gap-4 pt-1"
                                            />
                                        </Form.Item>
                                    </div>
                                </Col>
                            )}
                        </Row>
                    </div>

                    {/* Step 3: Question Paper Blueprint Composer (Parts) */}
                    {selectedMarkTypes && selectedMarkTypes.length > 0 && (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 md:p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                                        3
                                    </span>
                                    <h2 className="text-base font-bold text-slate-800 m-0">
                                        Question Paper Parts & Questions Composer
                                    </h2>
                                </div>
                                <span className="text-xs font-medium text-slate-500">
                                    Target: <strong className="text-indigo-600">{targetMarks} Marks</strong>
                                </span>
                            </div>

                            <Form.List name="parts">
                                {(fields, { add, remove }) => (
                                    <div className="space-y-4">
                                        {fields.map(({ key, name, ...restField }) => {
                                            const partMarkType = form.getFieldValue(['parts', name, 'mark_type']);
                                            const numToProvide = form.getFieldValue(['parts', name, 'total_questions']) || 0;
                                            const isChoiceActive = form.getFieldValue(['parts', name, 'is_choice']) || false;

                                            return (
                                                <div
                                                    key={key}
                                                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4 hover:border-slate-300 transition-colors"
                                                >
                                                    {/* Part Header */}
                                                    <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                                        <div className="flex items-center gap-2.5">
                                                            <Tag color="indigo" className="font-bold text-xs rounded-md px-2 py-0.5 m-0">
                                                                Part {String.fromCharCode(65 + name)}
                                                            </Tag>
                                                            {partMarkType && (
                                                                <Tag color="blue" className="rounded-md px-2 py-0.5 text-xs m-0">
                                                                    {partMarkType} Mark Questions
                                                                </Tag>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            {partMarkType >= 10 && (
                                                                <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                                                                    <span className="text-xs text-slate-600 font-medium">Either / Or Choice:</span>
                                                                    <Form.Item {...restField} name={[name, 'is_choice']} valuePropName="checked" noStyle>
                                                                        <Switch size="small" />
                                                                    </Form.Item>
                                                                </div>
                                                            )}
                                                            <Button
                                                                type="text"
                                                                danger
                                                                icon={<DeleteOutlined />}
                                                                onClick={() => remove(name)}
                                                                className="hover:bg-rose-50 rounded-lg flex items-center justify-center text-rose-500"
                                                                title="Delete Part"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Part Meta Inputs */}
                                                    <Row gutter={[16, 12]}>
                                                        <Col xs={24} sm={12} md={8}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'partName']}
                                                                label={<span className="text-xs font-semibold text-slate-600">Part Label / Letter</span>}
                                                                rules={[{ required: true, message: 'Part Name is required' }]}
                                                                initialValue={String.fromCharCode(65 + name)}
                                                                className="mb-0"
                                                            >
                                                                <Input placeholder="e.g. A" className="rounded-lg" />
                                                            </Form.Item>
                                                        </Col>

                                                        <Col xs={24} sm={12} md={8}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[name, 'mark_type']}
                                                                label={<span className="text-xs font-semibold text-slate-600">Mark Type for this Part</span>}
                                                                rules={[{ required: true, message: 'Select mark type' }]}
                                                                className="mb-0"
                                                            >
                                                                <Select
                                                                    placeholder="Select mark"
                                                                    className="rounded-lg"
                                                                    onChange={(value) => {
                                                                        const currentParts = form.getFieldValue('parts') || [];
                                                                        const isUsed = currentParts.some((part: any, index: number) => index !== name && part && part.mark_type === value);
                                                                        if (isUsed) {
                                                                            message.error('This mark type is already used in another part.');
                                                                            const updatedParts = [...currentParts];
                                                                            updatedParts[name] = { ...updatedParts[name], mark_type: null };
                                                                            form.setFieldsValue({ parts: updatedParts });
                                                                        }
                                                                    }}
                                                                >
                                                                    {selectedMarkTypes.map((mark: number) => (
                                                                        <Option key={mark} value={mark}>{mark} Mark</Option>
                                                                    ))}
                                                                </Select>
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>

                                                    {/* 1-Mark Questions Handling */}
                                                    {partMarkType === 1 && (form.getFieldValue(['one_mark_question_types']) || []).map((questionsampletype: string) => {
                                                        const numOneMarkToProvide = form.getFieldValue(['parts', name, 'one_mark_counts', questionsampletype]) || 0;

                                                        return (
                                                            <div key={questionsampletype} className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/90 space-y-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="font-semibold text-xs sm:text-sm text-slate-800">
                                                                        Section: {questionsampletype}
                                                                    </span>
                                                                    <Tag color="blue" className="rounded-md text-xs font-medium m-0">1 Mark each</Tag>
                                                                </div>

                                                                <Row gutter={[12, 12]} align="middle">
                                                                    <Col xs={12} sm={6}>
                                                                        <Form.Item
                                                                            name={[name, 'one_mark_counts', questionsampletype]}
                                                                            label={<span className="text-xs text-slate-500">Provide (Questions)</span>}
                                                                            rules={[{ required: true, message: 'Required' }]}
                                                                            className="mb-0"
                                                                        >
                                                                            <InputNumber
                                                                                style={{ width: '100%' }}
                                                                                min={0}
                                                                                placeholder="Provide"
                                                                                className="rounded-lg"
                                                                                onChange={(value) => {
                                                                                    const currentParts = form.getFieldValue('parts');
                                                                                    currentParts[name].one_mark_counts[`${questionsampletype}_answer`] = value;
                                                                                    form.setFieldsValue({ parts: currentParts });
                                                                                    onFormValuesChange(null, form.getFieldsValue());
                                                                                }}
                                                                            />
                                                                        </Form.Item>
                                                                    </Col>
                                                                    <Col xs={12} sm={6}>
                                                                        <Form.Item
                                                                            name={[name, 'one_mark_counts', `${questionsampletype}_answer`]}
                                                                            label={<span className="text-xs text-slate-500">To Answer (Marks)</span>}
                                                                            className="mb-0"
                                                                        >
                                                                            <InputNumber style={{ width: '100%' }} placeholder="Answer" disabled className="rounded-lg bg-slate-50" />
                                                                        </Form.Item>
                                                                    </Col>
                                                                </Row>

                                                                <Form.Item
                                                                    shouldUpdate={(prevValues, currentValues) =>
                                                                        prevValues.parts?.[name]?.manual_questions?.[questionsampletype] !== currentValues.parts?.[name]?.manual_questions?.[questionsampletype]
                                                                    }
                                                                    noStyle
                                                                >
                                                                    {({ getFieldValue }) => {
                                                                        const selectedQuestionIds = getFieldValue(['parts', name, 'manual_questions', questionsampletype]) || [];

                                                                        return (
                                                                            <Row gutter={[16, 12]}>
                                                                                {Array.from({ length: numOneMarkToProvide || 0 }).map((_, index) => {
                                                                                    const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;
                                                                                    const matchingQuestions = allQuestions.filter(sq =>
                                                                                        sq.question_type === 1 &&
                                                                                        sq.subject_code === subjectCode &&
                                                                                        sq.title?.trim().toLowerCase() === questionsampletype.trim().toLowerCase() &&
                                                                                        selectedUnit.includes(sq.unit)
                                                                                    );

                                                                                    const currentQuestionId = getFieldValue(['parts', name, 'manual_questions', questionsampletype, index]);

                                                                                    const questionsGroupedByUnit = matchingQuestions.reduce((acc, q) => {
                                                                                        const unit = q.unit || 0;
                                                                                        if (!acc[unit]) acc[unit] = [];
                                                                                        acc[unit].push(q);
                                                                                        return acc;
                                                                                    }, {} as Record<number, Question[]>);

                                                                                    return (
                                                                                        <Col key={index} xs={24} md={12}>
                                                                                            <Form.Item
                                                                                                {...restField}
                                                                                                name={[name, 'manual_questions', questionsampletype, index]}
                                                                                                label={<span className="text-xs font-semibold text-slate-600">Q {index + 1}</span>}
                                                                                                className="mb-1"
                                                                                            >
                                                                                                <Select
                                                                                                    showSearch
                                                                                                    placeholder={`Select Q ${index + 1}`}
                                                                                                    dropdownClassName="scrollable-dropdown"
                                                                                                    filterOption={(input, option) =>
                                                                                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                                                                                    }
                                                                                                    className="rounded-lg"
                                                                                                >
                                                                                                    {Object.entries(questionsGroupedByUnit).map(([unit, questions]) => (
                                                                                                        <Select.OptGroup key={unit} label={`Unit ${unit}`}>
                                                                                                            {(questions as Question[]).map(sq => (
                                                                                                                <Option
                                                                                                                    key={sq.id}
                                                                                                                    value={sq.id}
                                                                                                                    disabled={(allSelectedQuestionIds as Set<string>).has(sq.id) && sq.id !== currentQuestionId}
                                                                                                                    style={{
                                                                                                                        backgroundColor: getUnitColor(Number(unit)),
                                                                                                                        color: (allSelectedQuestionIds as Set<string>).has(sq.id) && sq.id !== currentQuestionId ? '#999' : '#000',
                                                                                                                    }}
                                                                                                                >
                                                                                                                    {sq.question}
                                                                                                                </Option>
                                                                                                            ))}
                                                                                                        </Select.OptGroup>
                                                                                                    ))}
                                                                                                </Select>
                                                                                            </Form.Item>

                                                                                            {questionsampletype === 'Choose the correct answer' && currentQuestionId && (
                                                                                                <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
                                                                                                    <div className="grid grid-cols-2 gap-1 text-xs text-slate-600">
                                                                                                        {['option1', 'option2', 'option3', 'option4'].map((optKey, idx) => {
                                                                                                            const q = allQuestions.find(q => q.id === currentQuestionId);
                                                                                                            const optVal = (q as any)?.[optKey];
                                                                                                            if (!optVal) return null;
                                                                                                            return (
                                                                                                                <span key={optKey} className="truncate">
                                                                                                                    <strong>{String.fromCharCode(97 + idx)})</strong> {optVal}
                                                                                                                </span>
                                                                                                            );
                                                                                                        })}
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {questionsampletype === 'Match the Following' && (
                                                                                                <ShuffledAnswerBank questionIds={selectedQuestionIds as any} allQuestions={allQuestions} />
                                                                                            )}
                                                                                        </Col>
                                                                                    );
                                                                                })}
                                                                            </Row>
                                                                        );
                                                                    }}
                                                                </Form.Item>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Standard Questions (> 1 Mark and No Choice) */}
                                                    {!isChoiceActive && partMarkType > 1 && (
                                                        <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/90 space-y-3">
                                                            <Row gutter={[16, 12]}>
                                                                <Col xs={24} sm={12} md={8}>
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'total_questions']}
                                                                        label={<span className="text-xs font-semibold text-slate-600">Number of Questions to Provide</span>}
                                                                        rules={[{ required: true, message: 'Total questions required' }]}
                                                                        className="mb-0"
                                                                    >
                                                                        <InputNumber style={{ width: '100%' }} min={1} placeholder="e.g. 5" className="rounded-lg" />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={24} sm={12} md={8}>
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'questions_to_answer']}
                                                                        label={<span className="text-xs font-semibold text-slate-600">Questions to Answer (Weightage)</span>}
                                                                        rules={[
                                                                            { required: true, message: 'Questions to answer required' },
                                                                            ({ getFieldValue }) => ({
                                                                                validator(_, value) {
                                                                                    const total = getFieldValue(['parts', name, 'total_questions']);
                                                                                    if (!value || !total || value <= total) {
                                                                                        return Promise.resolve();
                                                                                    }
                                                                                    return Promise.reject(new Error("Cannot exceed 'Questions to Provide'"));
                                                                                },
                                                                            }),
                                                                        ]}
                                                                        className="mb-0"
                                                                    >
                                                                        <InputNumber style={{ width: '100%' }} min={1} placeholder="e.g. 3" className="rounded-lg" />
                                                                    </Form.Item>
                                                                </Col>
                                                            </Row>

                                                            <Row gutter={[16, 12]}>
                                                                {Array.from({ length: numToProvide || 0 }).map((_, index) => {
                                                                    const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;
                                                                    const matchingQuestions = allQuestions.filter(q =>
                                                                        q.question_type === partMarkType &&
                                                                        q.subject_code === subjectCode &&
                                                                        selectedUnit.includes(q.unit)
                                                                    );
                                                                    const currentQuestionId = form.getFieldValue(['parts', name, 'manual_questions', partMarkType, index]);

                                                                    return (
                                                                        <Col key={index} xs={24} md={12}>
                                                                            <Form.Item
                                                                                {...restField}
                                                                                name={[name, 'manual_questions', partMarkType, index]}
                                                                                label={<span className="text-xs font-semibold text-slate-600">Question {index + 1}</span>}
                                                                                className="mb-0"
                                                                            >
                                                                                <Select
                                                                                    showSearch
                                                                                    placeholder={`Select Question ${index + 1}`}
                                                                                    dropdownClassName="scrollable-dropdown"
                                                                                    filterOption={(input, option) =>
                                                                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                                                                    }
                                                                                    className="rounded-lg"
                                                                                >
                                                                                    {matchingQuestions.map(q => (
                                                                                        <Option
                                                                                            key={q.id}
                                                                                            value={q.id}
                                                                                            disabled={(allSelectedQuestionIds as Set<string>).has(q.id) && q.id !== currentQuestionId}
                                                                                            style={{
                                                                                                backgroundColor: getUnitColor(q.unit),
                                                                                                color: (allSelectedQuestionIds as Set<string>).has(q.id) && q.id !== currentQuestionId ? '#999' : '#000',
                                                                                                whiteSpace: 'normal',
                                                                                            }}
                                                                                        >
                                                                                            Unit {q.unit}: {q.question}
                                                                                        </Option>
                                                                                    ))}
                                                                                </Select>
                                                                            </Form.Item>
                                                                        </Col>
                                                                    );
                                                                })}
                                                            </Row>
                                                        </div>
                                                    )}

                                                    {/* Choice Questions (>= 10 Mark and Choice Active) */}
                                                    {isChoiceActive && (
                                                        <div className="p-3 sm:p-4 bg-white rounded-xl border border-slate-200/90 space-y-3">
                                                            <Row gutter={[16, 12]}>
                                                                <Col xs={12} sm={8}>
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'total_questions']}
                                                                        label={<span className="text-xs font-semibold text-slate-600">Question Pairs to Provide</span>}
                                                                        rules={[{ required: true, message: 'Required' }]}
                                                                        className="mb-0"
                                                                    >
                                                                        <InputNumber style={{ width: '100%' }} min={1} placeholder="e.g. 2" className="rounded-lg" />
                                                                    </Form.Item>
                                                                </Col>
                                                                <Col xs={12} sm={8}>
                                                                    <Form.Item
                                                                        {...restField}
                                                                        name={[name, 'questions_to_answer']}
                                                                        label={<span className="text-xs font-semibold text-slate-600">Pairs to Answer</span>}
                                                                        rules={[{ required: true, message: 'Required' }]}
                                                                        className="mb-0"
                                                                    >
                                                                        <InputNumber style={{ width: '100%' }} min={1} placeholder="e.g. 1" className="rounded-lg" />
                                                                    </Form.Item>
                                                                </Col>
                                                            </Row>

                                                            <Row gutter={[16, 16]}>
                                                                {Array.from({ length: numToProvide || 0 }).map((_, index) => {
                                                                    const questionA_id = form.getFieldValue(['parts', name, 'manual_choice_questions', index, 'a']);
                                                                    const questionB_id = form.getFieldValue(['parts', name, 'manual_choice_questions', index, 'b']);
                                                                    const questionA = allQuestions.find(q => q.id === questionA_id);
                                                                    const questionB = allQuestions.find(q => q.id === questionB_id);
                                                                    const pairTotal = (questionA?.question_type || 0) + (questionB?.question_type || 0);

                                                                    const subjectCode = subjects.find(s => s.subject_name === selectedSubject)?.subject_code;

                                                                    const questionsGroupedByUnit = allQuestions
                                                                        .filter(q =>
                                                                            q.question_type < partMarkType &&
                                                                            q.question_type >= 2 &&
                                                                            q.subject_code === subjectCode &&
                                                                            selectedUnit.includes(q.unit)
                                                                        )
                                                                        .reduce((acc, q) => {
                                                                            const unit = q.unit || 0;
                                                                            if (!acc[unit]) acc[unit] = [];
                                                                            acc[unit].push(q);
                                                                            return acc;
                                                                        }, {} as Record<number, Question[]>);

                                                                    return (
                                                                        <Col xs={24} lg={12} key={index}>
                                                                            <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-2">
                                                                                <div className="flex items-center justify-between pb-1 border-b border-indigo-100">
                                                                                    <span className="font-bold text-xs text-slate-800">
                                                                                        Choice Pair #{index + 1}
                                                                                    </span>
                                                                                    <Tag
                                                                                        color={pairTotal < partMarkType ? 'error' : 'success'}
                                                                                        className="rounded-md font-semibold text-xs m-0"
                                                                                    >
                                                                                        Total: {pairTotal} / {partMarkType} Marks
                                                                                    </Tag>
                                                                                </div>

                                                                                <Form.Item
                                                                                    {...restField}
                                                                                    name={[name, 'manual_choice_questions', index, 'a']}
                                                                                    label={<span className="text-xs font-semibold text-slate-700">Option (a)</span>}
                                                                                    rules={[{ required: true, message: 'Select option a' }]}
                                                                                    className="mb-1"
                                                                                >
                                                                                    <Select
                                                                                        showSearch
                                                                                        placeholder="Select first choice (a)"
                                                                                        allowClear
                                                                                        className="choice-select rounded-lg"
                                                                                        optionLabelProp="label"
                                                                                    >
                                                                                        {Object.entries(questionsGroupedByUnit).map(([unit, questions]) => (
                                                                                            <Select.OptGroup key={`a-${unit}`} label={`Unit ${unit}`}>
                                                                                                {(questions as Question[]).map(q => (
                                                                                                    <Option
                                                                                                        key={q.id}
                                                                                                        value={q.id}
                                                                                                        label={q.question}
                                                                                                        disabled={((allSelectedQuestionIds as Set<string>).has(q.id) && q.id !== questionA_id) || q.question_type >= partMarkType}
                                                                                                    >
                                                                                                        <div style={{ whiteSpace: 'normal' }}>
                                                                                                            Unit {unit}: {q.question} ({q.question_type}M)
                                                                                                        </div>
                                                                                                    </Option>
                                                                                                ))}
                                                                                            </Select.OptGroup>
                                                                                        ))}
                                                                                    </Select>
                                                                                </Form.Item>

                                                                                <div className="text-center py-0.5">
                                                                                    <Tag color="purple" className="rounded-full px-3 text-xs font-bold uppercase m-0">
                                                                                        — OR —
                                                                                    </Tag>
                                                                                </div>

                                                                                <Form.Item
                                                                                    {...restField}
                                                                                    name={[name, 'manual_choice_questions', index, 'b']}
                                                                                    label={<span className="text-xs font-semibold text-slate-700">Option (b)</span>}
                                                                                    rules={[{ required: true, message: 'Select option b' }]}
                                                                                    className="mb-0"
                                                                                >
                                                                                    <Select
                                                                                        showSearch
                                                                                        placeholder="Select second choice (b)"
                                                                                        allowClear
                                                                                        className="choice-select rounded-lg"
                                                                                        optionLabelProp="label"
                                                                                    >
                                                                                        {Object.entries(questionsGroupedByUnit).map(([unit, questions]) => (
                                                                                            <Select.OptGroup key={`b-${unit}`} label={`Unit ${unit}`}>
                                                                                                {(questions as Question[]).map(sq => (
                                                                                                    <Option
                                                                                                        key={sq.id}
                                                                                                        value={sq.id}
                                                                                                        label={sq.question}
                                                                                                        disabled={((allSelectedQuestionIds as Set<string>).has(sq.id) && sq.id !== questionB_id) || sq.question_type >= partMarkType}
                                                                                                    >
                                                                                                        <div style={{ whiteSpace: 'normal' }}>
                                                                                                            Unit {unit}: {sq.question} ({sq.question_type}M)
                                                                                                        </div>
                                                                                                    </Option>
                                                                                                ))}
                                                                                            </Select.OptGroup>
                                                                                        ))}
                                                                                    </Select>
                                                                                </Form.Item>
                                                                            </div>
                                                                        </Col>
                                                                    );
                                                                })}
                                                            </Row>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* Add Part Button */}
                                        <Button
                                            type="dashed"
                                            onClick={() => add()}
                                            block
                                            icon={<PlusOutlined />}
                                            className="h-12 rounded-2xl border-slate-300 hover:border-indigo-500 hover:text-indigo-600 font-semibold text-sm bg-white"
                                        >
                                            Add Another Part (e.g. Part {String.fromCharCode(65 + fields.length)})
                                        </Button>
                                    </div>
                                )}
                            </Form.List>

                            {/* Live Balance Bar & Generate Action */}
                            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase font-semibold tracking-wider text-slate-300">
                                            Blueprint Validation:
                                        </span>
                                        {calculatedMarks === targetMarks && targetMarks > 0 ? (
                                            <Tag color="success" className="font-semibold text-xs rounded-full px-2.5 m-0">
                                                ✓ Perfectly Balanced ({calculatedMarks} Marks)
                                            </Tag>
                                        ) : (
                                            <Tag color="warning" className="font-semibold text-xs rounded-full px-2.5 m-0">
                                                {marksDifference > 0 ? `${marksDifference} Marks Remaining` : `${Math.abs(marksDifference)} Marks Over Limit`}
                                            </Tag>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-300 m-0">
                                        Assigned: <strong>{calculatedMarks}</strong> / <strong>{targetMarks}</strong> Marks
                                        {!areAllQuestionsSelected && ' • Please select all question slots'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 self-end md:self-auto">
                                    <Tooltip
                                        title={
                                            targetMarks === 0
                                                ? "Select an exam timetable to set the target mark"
                                                : calculatedMarks !== targetMarks
                                                ? `Mark total must match ${targetMarks} Marks (Currently ${calculatedMarks})`
                                                : !areAllQuestionsSelected
                                                ? "All question slots in each part must be selected"
                                                : "Click to generate paper"
                                        }
                                    >
                                        <Button
                                            type="primary"
                                            size="large"
                                            htmlType="submit"
                                            disabled={isCreateButtonDisabled}
                                            icon={<FileDoneOutlined />}
                                            className="rounded-xl font-bold h-11 px-6 shadow-md"
                                            style={{
                                                background: isCreateButtonDisabled
                                                    ? undefined
                                                    : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                                border: 0,
                                            }}
                                        >
                                            Generate Question Paper
                                        </Button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    )}
                </Form>
            </Spin>

            {/* Question Paper Preview & Print Modal */}
            <Modal
                title={
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <FileTextOutlined />
                            </div>
                            <div>
                                <span className="font-bold text-slate-800 text-base">Question Paper Preview</span>
                                <span className="text-xs text-slate-400 block font-normal">Standardized Examination Sheet</span>
                            </div>
                        </div>
                        <Button
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                            className="rounded-xl border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-xs font-semibold h-8"
                        >
                            Print A4 Sheet
                        </Button>
                    </div>
                }
                open={isPaperModalVisible}
                onCancel={handlePaperModalClose}
                width="92%"
                style={{ top: 20 }}
                styles={{ body: { backgroundColor: '#fff', maxHeight: '78vh', overflowY: 'auto' } }}
                footer={[
                    <Button key="back" onClick={() => setIsPaperModalVisible(false)} className="rounded-xl">
                        Back to Edit
                    </Button>,
                    <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint} className="rounded-xl">
                        Print Paper
                    </Button>,
                    <Button key="close" onClick={handlePaperModalClose} className="rounded-xl">
                        Close
                    </Button>,
                    <Button
                        key="confirm"
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleConfirmAndSave}
                        loading={questionPaperLoading}
                        className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-semibold"
                    >
                        Confirm & Save to Repository
                    </Button>,
                ]}
            >
                <Spin spinning={questionBankLoading}>
                    {generatedPaper && (
                        <div ref={printRef} className="printable-area p-6 bg-white text-black font-serif leading-relaxed">
                            {/* School Header */}
                            <div className="text-center mb-5 pb-4 border-b-2 border-black">
                                {schoolDetails?.logo_url && (
                                    <img
                                        src={schoolDetails.logo_url}
                                        alt="School Logo"
                                        style={{ maxHeight: 75, margin: '0 auto 8px auto', display: 'block' }}
                                    />
                                )}
                                <h2 className="text-2xl font-bold uppercase tracking-wider text-black m-0 font-serif">
                                    {schoolDetails?.school_name}
                                </h2>
                                <p className="text-xs text-black m-0 mt-0.5 font-serif">
                                    {schoolDetails?.address}
                                </p>
                                <h3 className="text-lg font-bold text-black uppercase mt-3 mb-0 font-serif">
                                    {generatedPaper.template.exam_title}
                                </h3>
                            </div>

                            {/* Exam Metadata Grid */}
                            <div className="grid grid-cols-3 gap-2 text-xs font-bold text-black mb-2 font-serif">
                                <div>Class: {generatedPaper.template.className} - {generatedPaper.template.sectionName}</div>
                                <div className="text-center">Subject: {subjects.find(s => s.subject_name === generatedPaper.template.subject)?.subject_name || generatedPaper.template.subject}</div>
                                <div className="text-right">Max Marks: {generatedPaper.template.total_mark}</div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs font-bold text-black mb-4 pb-3 border-b border-black font-serif">
                                <div>Roll No: .......................................</div>
                                <div className="text-center">Duration: {dayjs(generatedPaper.template.time).format('H [hr] m [min]')}</div>
                                <div className="text-right">Date: {examDate ? dayjs(examDate).format('DD-MM-YYYY') : 'N/A'}</div>
                            </div>

                            {/* Parts and Questions */}
                            {Object.entries(generatedPaper.paper).map(([partKey, questions]) => {
                                if (!questions || questions.length === 0) return null;
                                const partInfo = generatedPaper.template.parts.find((p: any) => `Part ${p.partName}` === partKey);
                                if (!partInfo) return null;

                                const partTitle = `Part ${partInfo.partName}`;

                                const oneMarkGroups = partInfo.mark_type === 1
                                    ? questions.reduce((acc: Record<string, Question[]>, q: Question) => {
                                        const title = q.title || 'Other 1-Mark Questions';
                                        if (!acc[title]) acc[title] = [];
                                        acc[title].push(q);
                                        return acc;
                                    }, {})
                                    : null;

                                return (
                                    <div key={partKey} className="mb-6 text-black font-serif">
                                        <div className="text-center font-bold text-sm uppercase tracking-wide my-3 border-y border-dashed border-slate-300 py-1">
                                            {partTitle}
                                        </div>

                                        {partInfo.mark_type === 1 && oneMarkGroups ? (
                                            Object.entries(oneMarkGroups).map(([title, subQuestions], subIndex) => {
                                                const numToAnswer = partInfo.one_mark_counts?.[`${title}_answer`] || subQuestions.length;
                                                const matchAnswers = title === 'Match the Following' ? shuffleArray(subQuestions.flatMap(q => splitAnswers(q.answer))) : [];

                                                return (
                                                    <div key={title} className="mb-4 text-black">
                                                        <div className="flex justify-between items-center font-bold text-xs mb-2">
                                                            <span>{String.fromCharCode(65 + subIndex)}. {title}</span>
                                                            <span>{numToAnswer} × 1 = {numToAnswer} Marks</span>
                                                        </div>

                                                        {title === 'Match the Following' ? (
                                                            <div className="grid grid-cols-2 gap-4 text-xs font-serif pl-4">
                                                                <ol className="list-decimal pl-4 space-y-2">
                                                                    {subQuestions.map(sq => (
                                                                        <li key={sq.id} className="text-black">
                                                                            <pre className="font-serif m-0 whitespace-pre-wrap text-black">{sq.question}</pre>
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                                <ol type="A" className="list-[upper-alpha] pl-4 space-y-2">
                                                                    {matchAnswers.map((ans, ansIndex) => (
                                                                        <li key={ansIndex} className="text-black">
                                                                            <pre className="font-serif m-0 whitespace-pre-wrap text-black">{ans}</pre>
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                            </div>
                                                        ) : (
                                                            subQuestions.map((sq, qIndex) => (
                                                                <div key={sq.id} className="ml-4 mt-2 text-xs font-serif">
                                                                    <div className="text-black font-medium">{qIndex + 1}. {sq.question}</div>
                                                                    {sq.title === 'Choose the correct answer' && (
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-4 mt-1 text-black">
                                                                            {sq.option1 && <span>a) {sq.option1}</span>}
                                                                            {sq.option2 && <span>b) {sq.option2}</span>}
                                                                            {sq.option3 && <span>c) {sq.option3}</span>}
                                                                            {sq.option4 && <span>d) {sq.option4}</span>}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : partInfo.is_choice ? (
                                            <>
                                                <div className="flex justify-between items-center font-bold text-xs mb-3">
                                                    <span>Answer any {partInfo.questions_to_answer} of the following (Either / Or)</span>
                                                    <span>{partInfo.questions_to_answer} × {partInfo.mark_type} = {partInfo.questions_to_answer * partInfo.mark_type} Marks</span>
                                                </div>
                                                {questions.reduce((acc, q, index) => {
                                                    if (index % 2 === 0) {
                                                        const pairB = questions[index + 1];
                                                        acc.push(
                                                            <div key={q.id} className="mt-3 text-xs font-serif">
                                                                <p className="text-black m-0">{Math.floor(index / 2) + 1}. (a) {q.question}</p>
                                                                {pairB && (
                                                                    <>
                                                                        <p className="text-center font-bold text-black my-1">— OR —</p>
                                                                        <p className="text-black m-0 pl-4">(b) {pairB.question}</p>
                                                                    </>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                    return acc;
                                                }, [] as React.ReactNode[])}
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-center font-bold text-xs mb-3">
                                                    <span>Answer any {partInfo.questions_to_answer} of the following</span>
                                                    <span>{partInfo.questions_to_answer} × {partInfo.mark_type} = {partInfo.questions_to_answer * partInfo.mark_type} Marks</span>
                                                </div>
                                                {questions.map((q, index) => (
                                                    <div key={q.id} className="mt-2 text-xs font-serif pl-2">
                                                        <span className="text-black">{index + 1}. {q.question}</span>
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                );
                            })}

                            <div className="text-center text-xs font-bold text-black mt-8 pt-4 border-t border-black font-serif">
                                *** END OF QUESTION PAPER ***
                            </div>
                        </div>
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default ExamQuestionPaper;
