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
    Divider,
    Spin,
    message,
    Tag,
    Alert,
    Table,
    Tooltip,
    Badge,
    Empty,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    PlusOutlined,
    PrinterOutlined,
    FileTextOutlined,
    BookOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    ArrowLeftOutlined,
    IdcardOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    FilePdfOutlined,
    EyeOutlined,
    CalculatorOutlined,
    ReloadOutlined,
    FolderOpenOutlined,
    CheckOutlined,
    WarningOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { fetchUnitMarksRequest } from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import {
    generateHomeTestRequest,
    type GeneratedPaper,
    type GenerateHomeTestPayload,
    clearGeneratedPaper,
    saveHomeTestRequest,
    fetchHomeTestsRequest,
    type HomeTest as SavedHomeTest,
    generateHomeTestSuccess,
} from '../../store/features/home-test/homeTestSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useReactToPrint } from 'react-to-print';
import type { Question } from '../../store/features/question-bank/questionBankSlice';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const HomeTest: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [selectedTestItem, setSelectedTestItem] = useState<SavedHomeTest | null>(null);
    const [calculatedMarks, setCalculatedMarks] = useState<number>(0);

    // Filter and search states
    const [filterAcademicYear, setFilterAcademicYear] = useState<string | null>(null);
    const [filterClassKey, setFilterClassKey] = useState<string | null>(null);
    const [filterSubject, setFilterSubject] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const printRef = useRef<HTMLDivElement>(null);

    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: mappingsLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { unitMarks, loading: unitMarksLoading } = useSelector((state: RootState) => state.setUnitMark);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    const { loading: homeTestLoading, generatedPaper, savedHomeTests, error: homeTestError } = useSelector(
        (state: RootState) => state.homeTest
    );

    // Form value watches for dynamic dependencies
    const selectedAcademicYear = Form.useWatch('academic_year', form);
    const selectedClassKey = Form.useWatch('class_key', form);
    const selectedSubjectCode = Form.useWatch('subject_code', form);
    const selectedUnit = Form.useWatch('unit', form);
    const totalMarks = Form.useWatch('total_marks', form);

    // Initial Data Fetching
    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(
                fetchHomeTestsRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                })
            );
            dispatch(fetchSubjectsRequest());
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    // Handle paper generation modal trigger
    useEffect(() => {
        if (generatedPaper) {
            setIsPaperModalVisible(true);
        }
    }, [generatedPaper]);

    // Handle errors
    useEffect(() => {
        if (homeTestError) {
            message.error(homeTestError);
            dispatch(clearGeneratedPaper());
        }
    }, [homeTestError, dispatch]);

    // Calculate marks dynamically from question counts
    const onFormValuesChange = (_: any, allValues: any) => {
        const markTypes = allValues.mark_types || {};
        const total = Object.keys(markTypes).reduce((acc, mark) => {
            const numQuestions = markTypes[mark] || 0;
            return acc + numQuestions * Number(mark);
        }, 0);
        setCalculatedMarks(total);
    };

    // Teacher's mappings
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Academic Year Options
    const academicYearOptions = useMemo(() => {
        if (!calendars) return [];
        return calendars
            .filter((cal: any) => cal.status === 'Active')
            .sort((a: any, b: any) => b.academic_year.localeCompare(a.academic_year));
    }, [calendars]);

    // Default select current active academic year for filtering
    useEffect(() => {
        if (academicYearOptions.length > 0 && !filterAcademicYear) {
            const currentYear =
                academicYearOptions.find((c: any) => c.is_current)?.academic_year ||
                academicYearOptions[0].academic_year;
            setFilterAcademicYear(currentYear);
        }
    }, [academicYearOptions, filterAcademicYear]);

    // Filter class options for the filter bar
    const filterClassOptions = useMemo(() => {
        if (!filterAcademicYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === filterAcademicYear);
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
    }, [myAssignments, filterAcademicYear]);

    // Filter subject options for the filter bar
    const filterSubjectOptions = useMemo(() => {
        if (!filterAcademicYear || !subjects) return [];
        let relevantAssignments = myAssignments.filter((m: any) => m.academic_year === filterAcademicYear);
        if (filterClassKey) {
            const [className, sectionName] = filterClassKey.split('||');
            relevantAssignments = relevantAssignments.filter(
                (m: any) => m.class_name === className && m.section_name === sectionName
            );
        }
        const subjectNames = relevantAssignments.map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [myAssignments, filterAcademicYear, filterClassKey, subjects]);

    // Options for Create Modal - Class & Section
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

    // Options for Create Modal - Subject
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey || !subjects) return [];
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectNamesForClass = myAssignments
            .filter(
                (m: any) =>
                    m.class_name === className &&
                    m.section_name === sectionName &&
                    m.academic_year === academicYear
            )
            .map((m: any) => m.subject_name);
        return subjects.filter(s => subjectNamesForClass.includes(s.subject_name));
    }, [myAssignments, selectedClassKey, subjects]);

    // Options for Create Modal - Units & Marks
    const availableUnitsAndMarks = useMemo(() => {
        if (!selectedClassKey || !selectedSubjectCode) return { units: [], marks: [] };
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        const subjectName = subjects.find(s => s.subject_code === selectedSubjectCode)?.subject_name;

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

        return { units: units.sort((a, b) => Number(a) - Number(b)), marks: marks.sort((a, b) => a - b) };
    }, [unitMarks, selectedClassKey, selectedSubjectCode, subjects]);

    // Load prerequisites when opening modal
    useEffect(() => {
        if (isModalVisible && academicYearOptions.length > 0) {
            const currentYear = academicYearOptions.find((c: any) => c.is_current);
            if (currentYear) {
                form.setFieldsValue({ academic_year: currentYear.academic_year });
            } else if (academicYearOptions[0]) {
                form.setFieldsValue({ academic_year: academicYearOptions[0].academic_year });
            }
        }
    }, [isModalVisible, academicYearOptions, form]);

    useEffect(() => {
        if (user?.organization_key && user?.staff_code && isModalVisible) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(
                fetchUnitMarksRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                })
            );
            dispatch(fetchRegulationsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user, isModalVisible]);

    const showModal = () => {
        setCalculatedMarks(0);
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        form.resetFields();
        setCalculatedMarks(0);
    };

    const handlePaperModalClose = () => {
        setIsPaperModalVisible(false);
        setSelectedTestItem(null);
        dispatch(clearGeneratedPaper());
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: generatedPaper
            ? `${generatedPaper.template.className}_${generatedPaper.template.subjectCode}_HomeTest`
            : 'Home-Test-Paper',
    });

    const handleSaveAndPrint = () => {
        if (!generatedPaper || !user) return;
        const { template, paper } = generatedPaper;
        const [className, sectionName, academicYear] = template.class_key.split('||');

        const payload = {
            organization_key: user.organization_key!,
            staff_code: user.staff_code!,
            academic_year: academicYear,
            class_name: className,
            section_name: sectionName,
            subject_code: template.subjectCode,
            unit: String(template.unit),
            total_marks: template.totalMarks,
            test_date: dayjs().format('YYYY-MM-DD'),
            questions: paper,
        };

        dispatch(saveHomeTestRequest(payload));
        handlePrint();
    };

    const onFinish = (values: any) => {
        const [className, sectionName, academicYear] = values.class_key.split('||');

        const selectedMarkTypes = Object.keys(values.mark_types || {})
            .filter(key => values.mark_types[key] > 0)
            .map(Number);

        const payload: GenerateHomeTestPayload = {
            organizationKey: user!.organization_key!,
            staffCode: user!.staff_code!,
            academicYear: academicYear,
            className: className,
            sectionName: sectionName,
            subjectCode: values.subject_code,
            unit: values.unit,
            totalMarks: values.total_marks,
            markTypes: selectedMarkTypes,
            class_key: values.class_key,
            questionCounts: values.mark_types,
        };
        dispatch(generateHomeTestRequest(payload));
        handleCancel();
    };

    const handleReprint = (savedTest: SavedHomeTest) => {
        setSelectedTestItem(savedTest);
        const paper = savedTest.questions as Record<string, Question[]>;
        const class_key = `${savedTest.class_name}||${savedTest.section_name}||${savedTest.academic_year}`;

        const template = {
            class_key: class_key,
            className: savedTest.class_name,
            sectionName: savedTest.section_name,
            academicYear: savedTest.academic_year,
            subjectCode: savedTest.subject_code,
            totalMarks: savedTest.total_marks,
            unit: savedTest.unit,
        } as any;
        dispatch(generateHomeTestSuccess({ template, paper }));
    };

    // Filtered and Sorted Saved Tests
    const filteredSavedTests = useMemo(() => {
        let tests = [...savedHomeTests].sort(
            (a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime()
        );

        if (filterAcademicYear) {
            tests = tests.filter(t => t.academic_year === filterAcademicYear);
        }

        if (filterClassKey) {
            const [cls, sec] = filterClassKey.split('||');
            tests = tests.filter(t => t.class_name === cls && t.section_name === sec);
        }

        if (filterSubject) {
            tests = tests.filter(t => t.subject_code === filterSubject);
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            tests = tests.filter(t => {
                const subj = subjects.find(s => s.subject_code === t.subject_code);
                const subjName = subj?.subject_name?.toLowerCase() || '';
                const subjCode = t.subject_code?.toLowerCase() || '';
                const className = `class ${t.class_name} - ${t.section_name}`.toLowerCase();
                const unitText = `unit ${t.unit}`.toLowerCase();
                return (
                    subjName.includes(query) ||
                    subjCode.includes(query) ||
                    className.includes(query) ||
                    unitText.includes(query)
                );
            });
        }

        return tests;
    }, [savedHomeTests, filterAcademicYear, filterClassKey, filterSubject, searchQuery, subjects]);

    // Metrics for the dashboard banner
    const metrics = useMemo(() => {
        const totalTests = savedHomeTests.length;
        const uniqueClasses = new Set(savedHomeTests.map(t => `${t.class_name}-${t.section_name}`)).size;
        const uniqueSubjects = new Set(savedHomeTests.map(t => t.subject_code)).size;
        const latestTest = savedHomeTests.length > 0 ? savedHomeTests[0]?.test_date : null;

        return {
            totalTests,
            uniqueClasses,
            uniqueSubjects,
            latestDateFormatted: latestTest ? dayjs(latestTest).format('DD MMM YYYY') : 'None yet',
        };
    }, [savedHomeTests]);

    // Vector PDF Generation for Question Paper
    const handleDownloadPdf = (savedTest?: SavedHomeTest) => {
        const paperData = savedTest
            ? {
                  template: {
                      className: savedTest.class_name,
                      sectionName: savedTest.section_name,
                      academicYear: savedTest.academic_year,
                      subjectCode: savedTest.subject_code,
                      totalMarks: savedTest.total_marks,
                      unit: savedTest.unit,
                  },
                  paper: savedTest.questions as Record<string, Question[]>,
                  date: savedTest.test_date,
              }
            : generatedPaper
            ? {
                  template: generatedPaper.template,
                  paper: generatedPaper.paper,
                  date: dayjs().format('YYYY-MM-DD'),
              }
            : null;

        if (!paperData) {
            message.warning('No test paper data available to export.');
            return;
        }

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const schoolName = schoolDetails?.school_name || 'School Home Test Paper';
            const schoolAddress = schoolDetails?.address || '';
            const subjObj = subjects.find(s => s.subject_code === paperData.template.subjectCode);
            const subjectName = subjObj?.subject_name || paperData.template.subjectCode;

            // Header Banner
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(schoolName.toUpperCase(), 105, 16, { align: 'center' });

            if (schoolAddress) {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(schoolAddress, 105, 21, { align: 'center' });
            }

            const titleY = schoolAddress ? 28 : 24;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(3, 105, 161);
            doc.text(`HOME TEST ASSESSMENT - ${paperData.template.academicYear}`, 105, titleY, { align: 'center' });

            // Test Metadata Box
            const boxY = titleY + 4;
            doc.setDrawColor(203, 213, 225);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, boxY, 182, 18, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('CLASS & SECTION:', 18, boxY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(`${paperData.template.className} - ${paperData.template.sectionName}`, 52, boxY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('SUBJECT:', 115, boxY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(`${subjectName} (${paperData.template.subjectCode})`, 135, boxY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('UNIT / SYLLABUS:', 18, boxY + 13);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(String(paperData.template.unit || 'All Units'), 52, boxY + 13);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('TOTAL MARKS:', 115, boxY + 13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(3, 105, 161);
            doc.text(`${paperData.template.totalMarks} Marks`, 145, boxY + 13);

            // Student Information Lines
            const studentInfoY = boxY + 22;
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text('Student Name: ________________________________________', 14, studentInfoY);
            doc.text('Roll No: _______________', 125, studentInfoY);
            doc.text(`Date: ${dayjs(paperData.date).format('DD/MM/YYYY')}`, 168, studentInfoY);

            // Horizontal Line
            doc.setDrawColor(226, 232, 240);
            doc.line(14, studentInfoY + 3, 196, studentInfoY + 3);

            let currentY = studentInfoY + 10;
            let questionGlobalIndex = 1;

            // Render Questions by Parts
            Object.entries(paperData.paper).forEach(([markKey, questions]) => {
                const questionList = questions as Question[];
                if (!questionList || questionList.length === 0) return;

                if (currentY > 260) {
                    doc.addPage();
                    currentY = 20;
                }

                // Section Part Header
                doc.setFontSize(10.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                doc.setFillColor(241, 245, 249);
                doc.roundedRect(14, currentY - 4, 182, 8, 1, 1, 'F');
                doc.text(
                    `PART - ${markKey} MARK QUESTIONS (${questionList.length} Questions × ${markKey} Marks = ${
                        questionList.length * Number(markKey)
                    } Marks)`,
                    18,
                    currentY + 1.5
                );
                currentY += 10;

                questionList.forEach(q => {
                    if (currentY > 270) {
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 41, 59);
                    const qNum = `${questionGlobalIndex}.`;
                    doc.text(qNum, 16, currentY);

                    doc.setFont('helvetica', 'normal');
                    const textLines = doc.splitTextToSize(q.question, 155);
                    doc.text(textLines, 24, currentY);

                    // Mark tag on the right
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139);
                    doc.text(`[${markKey}]`, 186, currentY);

                    currentY += textLines.length * 5 + 2;

                    // MCQ options if available
                    if (q.option1 || q.option2 || q.option3 || q.option4) {
                        doc.setFontSize(8.5);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(71, 85, 105);
                        const optY = currentY;
                        if (q.option1) doc.text(`A) ${q.option1}`, 26, optY);
                        if (q.option2) doc.text(`B) ${q.option2}`, 70, optY);
                        if (q.option3) doc.text(`C) ${q.option3}`, 115, optY);
                        if (q.option4) doc.text(`D) ${q.option4}`, 155, optY);
                        currentY += 6;
                    }

                    currentY += 2;
                    questionGlobalIndex++;
                });

                currentY += 4;
            });

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Page ${i} of ${pageCount} | Generated by Sri Gayathri SMS Portal`,
                    105,
                    290,
                    { align: 'center' }
                );
            }

            const fileName = `HomeTest_${paperData.template.className}_${paperData.template.subjectCode}_${dayjs(
                paperData.date
            ).format('YYYYMMDD')}.pdf`;
            doc.save(fileName);
            message.success('Home Test Paper PDF exported successfully!');
        } catch (err: any) {
            console.error('PDF generation error:', err);
            message.error(`Failed to export PDF: ${err.message || 'Unknown error'}`);
        }
    };

    // Table Columns definition for Table view
    const tableColumns: ColumnsType<SavedHomeTest> = [
        {
            title: '#',
            key: 'index',
            width: 60,
            align: 'center',
            render: (_text, _record, index) => (
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
            width: 150,
            render: (_, record) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
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
            width: 110,
            align: 'center',
            render: marks => (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {marks} Marks
                </span>
            ),
        },
        {
            title: 'Questions',
            key: 'questions_count',
            width: 110,
            align: 'center',
            render: (_, record) => {
                const totalQ = Object.values(record.questions || {}).reduce(
                    (sum: number, list: any) => sum + (Array.isArray(list) ? list.length : 0),
                    0
                );
                return (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {totalQ} Qs
                    </span>
                );
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 170,
            align: 'right',
            render: (_, record) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Tooltip title="View & Print Test Paper">
                        <Button
                            type="primary"
                            size="small"
                            icon={<EyeOutlined />}
                            onClick={() => handleReprint(record)}
                            className="bg-blue-600 hover:bg-blue-700 text-xs inline-flex items-center"
                        >
                            View
                        </Button>
                    </Tooltip>
                    <Tooltip title="Export PDF">
                        <Button
                            size="small"
                            icon={<FilePdfOutlined />}
                            onClick={() => handleDownloadPdf(record)}
                            className="text-slate-600 hover:text-red-600 border-slate-200 text-xs inline-flex items-center"
                        />
                    </Tooltip>
                </div>
            ),
        },
    ];

    const isCreateButtonDisabled =
        !selectedClassKey ||
        !selectedSubjectCode ||
        !selectedUnit ||
        totalMarks === undefined ||
        calculatedMarks !== totalMarks ||
        calculatedMarks === 0;

    const isLoading = mappingsLoading || subjectsLoading || unitMarksLoading || homeTestLoading;

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 md:p-6 space-y-5">
            {/* 1. Header Bar with Navigation and Quick Actions */}
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
                            <span>Home Test Paper Generator</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Build balanced question papers from your verified Question Bank, customize mark
                            weights, and generate print-ready test papers.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        <Button
                            onClick={() => dispatch(setCurrentPage('hometestmanagement'))}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            <CheckCircleOutlined />
                            <span>Manage Test Marks</span>
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showModal}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-sm inline-flex items-center"
                        >
                            Create Home Test
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
                        <span className="text-xs text-slate-400">generated</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Classes Covered
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
                        <span className="text-xs text-slate-400">active</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Latest Test
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <CalendarOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">
                            {metrics.latestDateFormatted}
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
                                placeholder="All Classes"
                                allowClear
                                className="w-full"
                                value={filterClassKey}
                                onChange={val => {
                                    setFilterClassKey(val);
                                    setFilterSubject(null);
                                }}
                            >
                                {filterClassOptions.map((opt: any) => (
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
                                value={filterSubject}
                                onChange={val => setFilterSubject(val)}
                            >
                                {filterSubjectOptions.map(sub => (
                                    <Option key={sub.subject_code} value={sub.subject_code}>
                                        {sub.subject_name}
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
                {(filterClassKey || filterSubject || searchQuery) && (
                    <div className="flex items-center gap-2 pt-2 flex-wrap text-xs text-slate-500 border-t border-slate-100">
                        <span>Active filters:</span>
                        {filterClassKey && (
                            <Tag
                                closable
                                onClose={() => setFilterClassKey(null)}
                                color="blue"
                                className="rounded-md"
                            >
                                Class: {filterClassKey.split('||')[0]} - {filterClassKey.split('||')[1]}
                            </Tag>
                        )}
                        {filterSubject && (
                            <Tag
                                closable
                                onClose={() => setFilterSubject(null)}
                                color="purple"
                                className="rounded-md"
                            >
                                Subject:{' '}
                                {subjects.find(s => s.subject_code === filterSubject)?.subject_name ||
                                    filterSubject}
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
                                setFilterClassKey(null);
                                setFilterSubject(null);
                                setSearchQuery('');
                            }}
                            className="p-0 text-xs text-blue-600 hover:text-blue-800"
                        >
                            Reset all
                        </Button>
                    </div>
                )}
            </div>

            {/* 4. Saved Tests Content Area */}
            <Spin spinning={isLoading}>
                {filteredSavedTests.length === 0 ? (
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
                                            ? 'You have not created any home test papers yet. Click the button below to generate your first test.'
                                            : 'No tests match your selected filter criteria. Try clearing some filters or searching for different terms.'}
                                    </p>
                                </div>
                            }
                        >
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={showModal}
                                className="mt-2 bg-blue-600 hover:bg-blue-700 rounded-xl"
                            >
                                Create Home Test
                            </Button>
                        </Empty>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* Cards Grid View */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {filteredSavedTests.map((item, index) => {
                            const subj = subjects.find(s => s.subject_code === item.subject_code);
                            const subjectName = subj?.subject_name || item.subject_code;
                            const questionCount = Object.values(item.questions || {}).reduce(
                                (acc: number, list: any) => acc + (Array.isArray(list) ? list.length : 0),
                                0
                            );
                            const partsCount = Object.keys(item.questions || {}).length;

                            return (
                                <div
                                    key={item.id || index}
                                    className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between overflow-hidden group"
                                >
                                    {/* Card Header Banner */}
                                    <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 to-white">
                                        <div className="flex items-center justify-between gap-2 mb-2.5">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
                                                Class {item.class_name} - {item.section_name}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                <CalendarOutlined className="text-slate-400" />
                                                {dayjs(item.test_date).format('DD MMM YYYY')}
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
                                                    Code: {item.subject_code} • {item.academic_year}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Details Body */}
                                    <div className="p-4 sm:p-5 space-y-3.5 flex-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Unit / Coverage:</span>
                                            <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                                Unit {item.unit}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Total Marks:</span>
                                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                                                {item.total_marks} Marks
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-500">Question Structure:</span>
                                            <span className="font-medium text-slate-700">
                                                {questionCount} Questions ({partsCount} Parts)
                                            </span>
                                        </div>

                                        {/* Parts breakdown chips */}
                                        <div className="pt-1 flex flex-wrap gap-1.5">
                                            {Object.entries(item.questions || {}).map(([partMark, qList]) => {
                                                const len = Array.isArray(qList) ? qList.length : 0;
                                                return (
                                                    <span
                                                        key={partMark}
                                                        className="text-[11px] font-medium text-slate-600 bg-slate-100/90 border border-slate-200 px-2 py-0.5 rounded-md"
                                                    >
                                                        {len} × {partMark}M
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Card Footer Actions */}
                                    <div className="p-3 sm:p-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between gap-2">
                                        <Button
                                            type="link"
                                            size="small"
                                            icon={<FilePdfOutlined />}
                                            onClick={() => handleDownloadPdf(item)}
                                            className="text-xs text-slate-600 hover:text-red-600 inline-flex items-center p-0"
                                        >
                                            Export PDF
                                        </Button>

                                        <Button
                                            type="primary"
                                            size="small"
                                            icon={<EyeOutlined />}
                                            onClick={() => handleReprint(item)}
                                            className="bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold inline-flex items-center"
                                        >
                                            View & Print
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
                            columns={tableColumns}
                            dataSource={filteredSavedTests}
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

            {/* 5. Create Home Test Modal (Ultra-Responsive & Intuitive) */}
            <Modal
                title={
                    <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            <PlusOutlined />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 m-0 leading-tight">
                                Create New Home Test Paper
                            </h2>
                            <p className="text-xs text-slate-500 m-0 font-normal">
                                Choose target class, subject, and specify question counts per mark category.
                            </p>
                        </div>
                    </div>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel} className="rounded-xl">
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isLoading}
                        onClick={() => form.submit()}
                        disabled={isCreateButtonDisabled}
                        className="bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold inline-flex items-center"
                    >
                        Generate Test Paper
                    </Button>,
                ]}
                width={820}
                destroyOnClose
            >
                <Spin spinning={isLoading}>
                    <div className="py-2 space-y-5">
                        <Form
                            form={form}
                            layout="vertical"
                            onFinish={onFinish}
                            onValuesChange={onFormValuesChange}
                            requiredMark="optional"
                        >
                            {/* Section 1: Class and Subject Details */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                                        1
                                    </span>
                                    <span>Class & Subject Selection</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <Form.Item
                                        name="academic_year"
                                        label={<span className="text-xs font-semibold text-slate-700">Academic Year</span>}
                                        rules={[{ required: true, message: 'Please select academic year' }]}
                                    >
                                        <Select
                                            placeholder="Select Year"
                                            size="large"
                                            onChange={() => {
                                                form.setFieldsValue({
                                                    class_key: null,
                                                    subject_code: null,
                                                    unit: null,
                                                    mark_types: {},
                                                });
                                            }}
                                        >
                                            {academicYearOptions.map((cal: any) => (
                                                <Option key={cal.id} value={cal.academic_year}>
                                                    {cal.academic_year}
                                                    {cal.is_current && ' (Current)'}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        name="class_key"
                                        label={<span className="text-xs font-semibold text-slate-700">Class & Section</span>}
                                        rules={[{ required: true, message: 'Please select class' }]}
                                    >
                                        <Select
                                            placeholder="Select Class"
                                            size="large"
                                            disabled={!selectedAcademicYear}
                                            onChange={() => {
                                                form.setFieldsValue({
                                                    subject_code: null,
                                                    unit: null,
                                                    mark_types: {},
                                                });
                                            }}
                                        >
                                            {classOptions.map((opt: any) => (
                                                <Option key={opt.key} value={opt.key}>
                                                    {opt.label}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        name="subject_code"
                                        label={<span className="text-xs font-semibold text-slate-700">Subject</span>}
                                        rules={[{ required: true, message: 'Please select subject' }]}
                                    >
                                        <Select
                                            placeholder="Select Subject"
                                            size="large"
                                            disabled={!selectedClassKey}
                                            onChange={() =>
                                                form.setFieldsValue({ unit: null, mark_types: {} })
                                            }
                                        >
                                            {subjectOptions.map(sub => (
                                                <Option key={sub.subject_code} value={sub!.subject_code}>
                                                    {sub!.subject_name}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </div>
                            </div>

                            <Divider className="my-3" />

                            {/* Section 2: Syllabus Unit and Marks Target */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                                        2
                                    </span>
                                    <span>Target Marks & Syllabus Unit</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    <Form.Item
                                        name="unit"
                                        label={<span className="text-xs font-semibold text-slate-700">Syllabus Unit</span>}
                                        rules={[{ required: true, message: 'Please select unit' }]}
                                    >
                                        <Select
                                            placeholder="Select Unit"
                                            size="large"
                                            disabled={!selectedSubjectCode}
                                            onChange={() => form.setFieldsValue({ mark_types: {} })}
                                        >
                                            <Option value="All Units">All Units (Complete Syllabus)</Option>
                                            {availableUnitsAndMarks.units.map(unit => (
                                                <Option key={unit} value={unit}>
                                                    Unit {unit}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    <Form.Item
                                        name="total_marks"
                                        label={
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-xs font-semibold text-slate-700">
                                                    Total Marks for Paper
                                                </span>
                                                <span className="text-[11px] text-slate-400">
                                                    e.g. 25, 50, 100
                                                </span>
                                            </div>
                                        }
                                        rules={[{ required: true, message: 'Total marks are required' }]}
                                    >
                                        <InputNumber
                                            placeholder="Enter total marks (e.g. 50)"
                                            style={{ width: '100%' }}
                                            size="large"
                                            min={1}
                                            max={200}
                                            disabled={!selectedUnit}
                                        />
                                    </Form.Item>
                                </div>
                            </div>

                            {/* Section 3: Question Count Allocation */}
                            {selectedUnit && availableUnitsAndMarks.marks.length > 0 && (
                                <>
                                    <Divider className="my-3" />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                                                    3
                                                </span>
                                                <span>Number of Questions per Mark Type</span>
                                            </div>

                                            {/* Live Marks Counter Status */}
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500">Calculated:</span>
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                                                        calculatedMarks === totalMarks && totalMarks > 0
                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                            : calculatedMarks > (totalMarks || 0)
                                                            ? 'bg-red-100 text-red-800 border border-red-300'
                                                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                                                    }`}
                                                >
                                                    <CalculatorOutlined />
                                                    {calculatedMarks} / {totalMarks || 0} Marks
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dynamic Mark Inputs Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                                            {availableUnitsAndMarks.marks.map(mark => (
                                                <Form.Item
                                                    key={mark}
                                                    name={['mark_types', String(mark)]}
                                                    label={
                                                        <span className="text-xs font-semibold text-slate-700">
                                                            {mark} Mark Questions
                                                        </span>
                                                    }
                                                    className="mb-0"
                                                >
                                                    <InputNumber
                                                        style={{ width: '100%' }}
                                                        placeholder="0"
                                                        min={0}
                                                        size="middle"
                                                    />
                                                </Form.Item>
                                            ))}
                                        </div>

                                        {/* Real-time Validation Message */}
                                        {calculatedMarks > (totalMarks || 0) && (
                                            <Alert
                                                message="Marks Exceeded"
                                                description={`Calculated marks (${calculatedMarks}) exceed total target marks (${totalMarks}). Please reduce question counts.`}
                                                type="warning"
                                                showIcon
                                                className="rounded-xl"
                                            />
                                        )}

                                        {calculatedMarks < (totalMarks || 0) && calculatedMarks > 0 && (
                                            <Alert
                                                message="Marks Under Target"
                                                description={`Current marks sum to ${calculatedMarks}. Add questions worth ${
                                                    (totalMarks || 0) - calculatedMarks
                                                } more marks to match total (${totalMarks}).`}
                                                type="info"
                                                showIcon
                                                className="rounded-xl"
                                            />
                                        )}

                                        {calculatedMarks === totalMarks && totalMarks > 0 && (
                                            <Alert
                                                message="Perfect Allocation!"
                                                description="Questions count and total marks match exactly. Ready to generate question paper."
                                                type="success"
                                                showIcon
                                                icon={<CheckOutlined />}
                                                className="rounded-xl"
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </Spin>
            </Modal>

            {/* 6. Question Paper Preview Modal (Print-Ready Document Sheet) */}
            <Modal
                title={
                    <div className="flex items-center justify-between pr-8">
                        <div className="flex items-center gap-2">
                            <FileTextOutlined className="text-blue-600 text-lg" />
                            <span className="font-bold text-slate-800 text-base">
                                Question Paper Preview
                            </span>
                        </div>
                    </div>
                }
                open={isPaperModalVisible}
                onCancel={handlePaperModalClose}
                width="min(920px, 95vw)"
                style={{ top: 20 }}
                destroyOnClose
                footer={[
                    <Button key="close" onClick={handlePaperModalClose} className="rounded-xl">
                        Close
                    </Button>,
                    <Button
                        key="pdf"
                        icon={<FilePdfOutlined />}
                        onClick={() => handleDownloadPdf(selectedTestItem || undefined)}
                        className="rounded-xl border-slate-300 text-slate-700 hover:text-red-600 hover:border-red-400"
                    >
                        Download PDF
                    </Button>,
                    selectedTestItem ? (
                        <Button
                            key="print-saved"
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
                        >
                            Print Paper
                        </Button>
                    ) : (
                        <Button
                            key="save-print"
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handleSaveAndPrint}
                            loading={homeTestLoading}
                            className="bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold"
                        >
                            Save and Print
                        </Button>
                    ),
                ]}
            >
                <Spin spinning={homeTestLoading}>
                    {generatedPaper && (
                        <div className="bg-slate-100 p-2 sm:p-5 rounded-xl max-h-[75vh] overflow-y-auto">
                            {/* Paper Document Container with A4 style look */}
                            <div
                                ref={printRef}
                                className="bg-white p-6 sm:p-10 rounded-lg shadow-sm max-w-[800px] mx-auto text-slate-900 border border-slate-200"
                                style={{ fontFamily: 'Georgia, serif' }}
                            >
                                {/* Institution Header */}
                                <div className="text-center pb-4 mb-5 border-b-2 border-slate-900 space-y-1">
                                    {schoolDetails?.logo_url && (
                                        <img
                                            src={schoolDetails.logo_url}
                                            alt="School Logo"
                                            className="max-h-16 mx-auto mb-2 object-contain"
                                        />
                                    )}
                                    <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-slate-900 m-0">
                                        {schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School'}
                                    </h1>
                                    {schoolDetails?.address && (
                                        <p className="text-xs text-slate-600 m-0">
                                            {schoolDetails.address}
                                        </p>
                                    )}
                                    <h2 className="text-sm sm:text-base font-semibold uppercase tracking-wider text-slate-800 m-0 mt-2">
                                        Home Test Paper - {generatedPaper.template.academicYear}
                                    </h2>
                                </div>

                                {/* Paper Metadata Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs sm:text-sm mb-5">
                                    <div>
                                        <span className="font-semibold text-slate-600">Class: </span>
                                        <span className="font-bold text-slate-900">
                                            {generatedPaper.template.className} -{' '}
                                            {generatedPaper.template.sectionName}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">Subject: </span>
                                        <span className="font-bold text-slate-900">
                                            {subjects.find(
                                                s => s.subject_code === generatedPaper.template.subjectCode
                                            )?.subject_name || generatedPaper.template.subjectCode}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">Unit: </span>
                                        <span className="font-bold text-slate-900">
                                            {generatedPaper.template.unit || 'All Units'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">Total Marks: </span>
                                        <span className="font-bold text-slate-900">
                                            {generatedPaper.template.totalMarks} Marks
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">Date: </span>
                                        <span className="font-bold text-slate-900">
                                            {selectedTestItem
                                                ? dayjs(selectedTestItem.test_date).format('DD/MM/YYYY')
                                                : dayjs().format('DD/MM/YYYY')}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-600">Time: </span>
                                        <span className="font-bold text-slate-900">1 Hour</span>
                                    </div>
                                </div>

                                {/* General Instructions */}
                                <div className="border border-slate-300 p-2.5 rounded text-xs mb-6 text-slate-700 bg-slate-50/50">
                                    <p className="font-bold m-0 mb-1">General Instructions:</p>
                                    <ul className="list-disc pl-4 space-y-0.5 m-0 text-slate-600">
                                        <li>All questions are compulsory. Read instructions carefully before writing.</li>
                                        <li>Marks for each section and question are mentioned against them.</li>
                                    </ul>
                                </div>

                                {/* Parts & Questions */}
                                <div className="space-y-6">
                                    {Object.entries(generatedPaper.paper).map(([markKey, questions], partIdx) => {
                                        const questionList = questions as Question[];
                                        const partLetter = String.fromCharCode(65 + partIdx); // A, B, C...

                                        return (
                                            <div key={markKey} className="space-y-3">
                                                <div className="flex items-center justify-between pb-1.5 border-b border-slate-300 font-serif">
                                                    <h3 className="text-sm sm:text-base font-bold text-slate-900 m-0 uppercase">
                                                        Part {partLetter} ({markKey} Mark Questions)
                                                    </h3>
                                                    <span className="text-xs font-semibold text-slate-600">
                                                        [{questionList.length} × {markKey} ={' '}
                                                        {questionList.length * Number(markKey)} Marks]
                                                    </span>
                                                </div>

                                                <div className="space-y-3 pt-1">
                                                    {questionList.map((q, qIndex) => (
                                                        <div
                                                            key={q.id || qIndex}
                                                            className="flex items-start justify-between gap-3 text-xs sm:text-sm leading-relaxed"
                                                        >
                                                            <div className="flex items-start gap-2 flex-1">
                                                                <span className="font-bold text-slate-900 shrink-0">
                                                                    {qIndex + 1}.
                                                                </span>
                                                                <div className="space-y-1.5 flex-1">
                                                                    <p className="m-0 text-slate-900">
                                                                        {q.question}
                                                                    </p>

                                                                    {/* Multiple Choice Options if present */}
                                                                    {(q.option1 ||
                                                                        q.option2 ||
                                                                        q.option3 ||
                                                                        q.option4) && (
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-700">
                                                                            {q.option1 && (
                                                                                <span>A) {q.option1}</span>
                                                                            )}
                                                                            {q.option2 && (
                                                                                <span>B) {q.option2}</span>
                                                                            )}
                                                                            {q.option3 && (
                                                                                <span>C) {q.option3}</span>
                                                                            )}
                                                                            {q.option4 && (
                                                                                <span>D) {q.option4}</span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <span className="font-bold text-slate-500 shrink-0 text-xs">
                                                                [{markKey}]
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Bottom Document Sign-off */}
                                <div className="mt-12 pt-6 border-t border-slate-300 flex items-center justify-between text-xs text-slate-500 font-sans">
                                    <span>Faculty: {user?.full_name || 'Subject Teacher'}</span>
                                    <span>Verified by Academic Coordinator</span>
                                </div>
                            </div>
                        </div>
                    )}
                </Spin>
            </Modal>
        </div>
    );
};

export default HomeTest;