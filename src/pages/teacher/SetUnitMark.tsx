/**
 * Teacher Unit Mark Configuration & Examination Weightage Setup
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
    Switch,
    InputNumber,
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
    ArrowLeftOutlined,
    IdcardOutlined,
    CalendarOutlined,
    BookOutlined,
    FolderOpenOutlined,
    ReloadOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    SettingOutlined,
    FileDoneOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import {
    addUnitMarkRequest,
    bulkAddUnitMarksRequest,
    fetchUnitMarksRequest,
    updateUnitMarkRequest,
    deleteUnitMarkRequest,
    type UnitMark,
} from '../../store/features/set-unit-mark/setUnitMarkSlice';
import { fetchRegulationsRequest } from '../../store/features/set-regulation/setRegulationSlice';
import * as XLSX from 'xlsx';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';

const { Option } = Select;
const { Dragger } = Upload;

const SetUnitMark: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();

    // Redux store state
    const { user } = useSelector((state: RootState) => state.auth);
    const { unitMarks, loading: unitMarkLoading, error: unitMarkError } = useSelector(
        (state: RootState) => state.setUnitMark
    );
    const { mappings, calendars: academicYears, loading: mappingsLoading } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { regulations } = useSelector((state: RootState) => state.setRegulation);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    // Filter, search & view states
    const [selectedAcademicYearFilter, setSelectedAcademicYearFilter] = useState<string | null>(null);
    const [selectedClassFilter, setSelectedClassFilter] = useState<string | null>(null);
    const [selectedSectionFilter, setSelectedSectionFilter] = useState<string | null>(null);
    const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');

    // Modals state
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isBulkModalVisible, setIsBulkModalVisible] = useState(false);
    const [editingMark, setEditingMark] = useState<UnitMark | null>(null);

    // Form instances
    const [form] = Form.useForm();
    const [bulkUploadForm] = Form.useForm();

    // Form dynamic watchers
    const selectedClassKey = Form.useWatch('class_key', form);
    const formAcademicYear = Form.useWatch('academic_year', form);

    const bulkSelectedClassKey = Form.useWatch('class_key', bulkUploadForm);
    const bulkFormAcademicYear = Form.useWatch('academic_year', bulkUploadForm);

    // Bulk upload states
    const [fileList, setFileList] = useState<any[]>([]);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploadError, setUploadError] = useState<string | null>(null);

    // Initial Data Fetching
    useEffect(() => {
        if (user?.organization_key && user?.staff_code) {
            dispatch(
                fetchUnitMarksRequest({
                    organizationKey: user.organization_key,
                    staffCode: user.staff_code,
                })
            );
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSubjectsRequest());
            dispatch(fetchRegulationsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    // Unique academic years available
    const uniqueYears = useMemo(() => {
        const fromUnitMarks = unitMarks.map(u => u.academic_year);
        const fromCalendars = (academicYears || []).map((c: any) => c.academic_year);
        return [...new Set([...fromUnitMarks, ...fromCalendars])].filter(Boolean).sort((a, b) => b.localeCompare(a));
    }, [unitMarks, academicYears]);

    const activeCalendars = useMemo(() => {
        if (!academicYears) return [];
        return (academicYears as any[]).filter(cal => cal.status === 'Active');
    }, [academicYears]);

    // Set default academic year
    useEffect(() => {
        if (uniqueYears.length > 0 && !selectedAcademicYearFilter) {
            const currentYear = academicYears?.find((c: any) => c.is_current)?.academic_year;
            if (currentYear && uniqueYears.includes(currentYear)) {
                setSelectedAcademicYearFilter(currentYear);
            } else {
                setSelectedAcademicYearFilter(uniqueYears[0]);
            }
        }
    }, [uniqueYears, academicYears, selectedAcademicYearFilter]);

    // Teacher assignments
    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter((m: any) => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    // Cascading filter dropdown options
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

    // Modal Form Class Options
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

    // Subject Options for Modal Form
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

        return subjects.filter(s => subjectNamesForClass.includes(s.subject_name));
    }, [myAssignments, selectedClassKey, bulkSelectedClassKey, subjects]);

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

    // Filtered Unit Marks List
    const filteredMarks = useMemo(() => {
        let data = [...unitMarks];

        if (selectedAcademicYearFilter) {
            data = data.filter(mark => mark.academic_year === selectedAcademicYearFilter);
        }
        if (selectedClassFilter) {
            data = data.filter(mark => mark.class === selectedClassFilter);
        }
        if (selectedSectionFilter) {
            data = data.filter(mark => mark.section === selectedSectionFilter);
        }
        if (selectedSubjectFilter) {
            data = data.filter(mark => mark.subject === selectedSubjectFilter);
        }
        if (statusFilter !== 'all') {
            data = data.filter(mark => mark.status === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            data = data.filter(mark => {
                const subMatch = (mark.subject || '').toLowerCase().includes(q);
                const classMatch = `class ${mark.class} - ${mark.section}`.toLowerCase().includes(q);
                const unitMatch = `unit ${mark.unit}`.toLowerCase().includes(q);
                const markMatch = `${mark.mark_type} mark`.toLowerCase().includes(q);
                const regMatch = (mark.regulation || '').toLowerCase().includes(q);
                return subMatch || classMatch || unitMatch || markMatch || regMatch;
            });
        }

        return data.sort((a, b) => {
            if (a.class !== b.class) return a.class.localeCompare(b.class);
            if (a.section !== b.section) return a.section.localeCompare(b.section);
            if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
            return a.unit - b.unit;
        });
    }, [
        unitMarks,
        selectedAcademicYearFilter,
        selectedClassFilter,
        selectedSectionFilter,
        selectedSubjectFilter,
        statusFilter,
        searchQuery,
    ]);

    // Overview KPIs
    const metrics = useMemo(() => {
        const total = filteredMarks.length;
        const activeCount = filteredMarks.filter(m => m.status === 'Active').length;
        const uniqueUnits = new Set(filteredMarks.map(m => `${m.class}-${m.subject}-${m.unit}`)).size;
        const uniqueClasses = new Set(filteredMarks.map(m => `${m.class}-${m.section}`)).size;

        return {
            total,
            activeCount,
            uniqueUnits,
            uniqueClasses,
        };
    }, [filteredMarks]);

    // Reset filters
    const handleResetFilters = () => {
        setSelectedClassFilter(null);
        setSelectedSectionFilter(null);
        setSelectedSubjectFilter(null);
        setStatusFilter('all');
        setSearchQuery('');
    };

    // Modal Triggers
    const showModal = (mark: UnitMark | null = null) => {
        setEditingMark(mark);
        if (mark) {
            const classKey = `${mark.class}||${mark.section}||${mark.academic_year}`;
            form.setFieldsValue({
                ...mark,
                class_key: classKey,
            });
        } else {
            const currentYear = academicYears?.find((c: any) => c.is_current)?.academic_year;
            form.resetFields();
            form.setFieldsValue({
                academic_year: selectedAcademicYearFilter || currentYear,
                status: 'Active',
            });
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingMark(null);
        form.resetFields();
    };

    const showBulkModal = () => {
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
    };

    // Single Submit
    const onFinish = (values: any) => {
        if (!user?.organization_key || !user?.staff_code) {
            message.error('User authentication session not found.');
            return;
        }

        const [className, sectionName, academicYear] = values.class_key.split('||');
        const subjectObj = subjects.find(s => s.subject_code === values.subject_code);
        const subjectName = subjectObj?.subject_name || values.subject || 'Unknown';

        const payload = {
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            class: className,
            section: sectionName,
            academic_year: academicYear,
            subject: subjectName,
            regulation: values.regulation || 'General',
            unit: Number(values.unit),
            mark_type: Number(values.mark_type),
            status: values.status || 'Active',
        };

        if (editingMark) {
            dispatch(updateUnitMarkRequest({ ...payload, id: editingMark.id }));
            message.success('Unit mark configuration updated successfully!');
        } else {
            dispatch(addUnitMarkRequest(payload as any));
            message.success('Unit mark configuration added successfully!');
        }

        handleCancel();
    };

    // Toggle Status
    const handleStatusChange = (checked: boolean, record: UnitMark) => {
        const newStatus = checked ? 'Active' : 'Inactive';
        dispatch(updateUnitMarkRequest({ ...record, status: newStatus }));
        message.success(`Status updated to ${newStatus}`);
    };

    // Delete
    const handleDelete = (id: string) => {
        dispatch(deleteUnitMarkRequest(id));
        message.success('Unit mark entry deleted successfully.');
    };

    // Excel Template Download
    const handleDownloadTemplate = () => {
        const headers = ['class', 'section', 'academic_year', 'subject', 'regulation', 'unit', 'mark_type'];
        const sampleRow = ['10', 'A', selectedAcademicYearFilter || '2026-2027', 'Mathematics', 'General', 1, 2];
        const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'UnitMarkTemplate');
        XLSX.writeFile(wb, 'unit_mark_template.xlsx');
        message.success('Template downloaded successfully.');
    };

    // Export Filtered Unit Marks to Excel
    const handleExcelDownload = () => {
        if (filteredMarks.length === 0) {
            message.warning('No unit marks available to export.');
            return;
        }

        const dataToExport = filteredMarks.map((item, idx) => ({
            'S.No': idx + 1,
            'Academic Year': item.academic_year,
            'Class': item.class,
            'Section': item.section,
            'Subject': item.subject,
            'Unit': item.unit,
            'Mark Type': item.mark_type,
            'Regulation': item.regulation,
            'Status': item.status,
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'UnitMarks');
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        XLSX.writeFile(wb, `UnitMarks_${selectedAcademicYearFilter || 'Export'}_${dateStr}.xlsx`);
        message.success('Unit mark configurations exported to Excel!');
    };

    // HTML Report Download
    const handleHtmlDownload = () => {
        if (filteredMarks.length === 0) {
            message.warning('No unit marks available to export.');
            return;
        }

        let htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Unit Mark Structure - ${selectedAcademicYearFilter || ''}</title>
                <meta charset="UTF-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 30px; color: #1e293b; }
                    .header { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 24px; }
                    .header h1 { margin: 0; font-size: 22px; color: #0f172a; }
                    .header p { margin: 4px 0; color: #64748b; font-size: 13px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
                    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
                    th { background-color: #f1f5f9; font-weight: 700; color: #334155; }
                    tr:nth-child(even) { background-color: #f8fafc; }
                    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px; }
                    .badge-active { background: #dcfce7; color: #15803d; }
                    .badge-inactive { background: #fee2e2; color: #b91c1c; }
                </style>
            </head>
            <body>
                <div class="header">
                    ${schoolDetails?.logo_url ? `<img src="${schoolDetails.logo_url}" alt="School Logo" style="max-height: 60px; margin-bottom: 8px;">` : ''}
                    <h1>${schoolDetails?.school_name || 'Sri Gayathri School'}</h1>
                    <p>UNIT MARK & QUESTION WEIGHTAGE CONFIGURATION REPORT</p>
                    <p>Academic Year: ${selectedAcademicYearFilter || 'All'} • Total Entries: ${filteredMarks.length}</p>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Class & Section</th>
                            <th>Subject</th>
                            <th>Unit</th>
                            <th>Mark Type</th>
                            <th>Regulation</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        filteredMarks.forEach((m, idx) => {
            htmlContent += `
                <tr>
                    <td>${idx + 1}</td>
                    <td>Class ${m.class} - ${m.section}</td>
                    <td>${m.subject}</td>
                    <td>Unit ${m.unit}</td>
                    <td>${m.mark_type} Marks</td>
                    <td>${m.regulation || 'General'}</td>
                    <td><span class="badge ${m.status === 'Active' ? 'badge-active' : 'badge-inactive'}">${m.status}</span></td>
                </tr>
            `;
        });

        htmlContent += `
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=UTF-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `UnitMarks_Report_${dateStr}.html`;
        a.click();
        URL.revokeObjectURL(url);
        message.success('HTML Report downloaded successfully!');
    };

    // Bulk File Parse
    const handleFileChange = (info: any) => {
        setFileList([info.file]);
        setUploadError(null);
        setParsedData([]);
        const file = info.file.originFileObj || info.file;
        const reader = new FileReader();

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
                    throw new Error('Spreadsheet appears to be empty.');
                }

                const requiredHeaders = ['class', 'section', 'academic_year', 'subject', 'unit', 'mark_type'];
                const fileHeaders = Object.keys(json[0] || {});
                const missingHeaders = requiredHeaders.filter(h => !fileHeaders.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
                }

                setParsedData(json);
                message.success(`Parsed ${json.length} unit mark rows.`);
            } catch (err: any) {
                setUploadError(`Error parsing file: ${err.message}`);
                setFileList([]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Bulk Submit
    const handleBulkSubmit = () => {
        if (!user?.organization_key || !user.staff_code) {
            message.error('User authentication session not found.');
            return;
        }

        const recordsToUpload = parsedData.map(row => ({
            ...row,
            organization_key: user.organization_key,
            staff_code: user.staff_code,
            unit: Number(row.unit),
            mark_type: Number(row.mark_type),
            status: row.status || 'Active',
        }));

        dispatch(bulkAddUnitMarksRequest(recordsToUpload as any));
        message.success(`Uploaded ${recordsToUpload.length} unit marks successfully!`);
        handleBulkCancel();
    };

    // Table Columns
    const columns: ColumnsType<UnitMark> = [
        {
            title: '#',
            key: 'index',
            width: 55,
            align: 'center',
            render: (_t, _r, index) => <span className="font-semibold text-slate-400 text-xs">{index + 1}</span>,
        },
        {
            title: 'Class & Section',
            key: 'class_section',
            width: 140,
            render: (_, record) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                    Class {record.class} - {record.section}
                </span>
            ),
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            render: subject => (
                <div className="flex items-center gap-1.5 font-semibold text-slate-800 text-xs sm:text-sm">
                    <BookOutlined className="text-indigo-500" />
                    <span>{subject}</span>
                </div>
            ),
        },
        {
            title: 'Unit',
            dataIndex: 'unit',
            key: 'unit',
            width: 100,
            align: 'center',
            sorter: (a, b) => a.unit - b.unit,
            render: unit => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Unit {unit}
                </span>
            ),
        },
        {
            title: 'Mark Type',
            dataIndex: 'mark_type',
            key: 'mark_type',
            width: 110,
            align: 'center',
            sorter: (a, b) => a.mark_type - b.mark_type,
            render: mark => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {mark} {mark === 1 ? 'Mark' : 'Marks'}
                </span>
            ),
        },
        {
            title: 'Regulation',
            dataIndex: 'regulation',
            key: 'regulation',
            width: 130,
            render: reg => <span className="text-xs text-slate-500">{reg || 'General'}</span>,
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            width: 110,
            align: 'center',
            render: (status: string, record: UnitMark) => (
                <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                    checked={status === 'Active'}
                    onChange={checked => handleStatusChange(checked, record)}
                    loading={unitMarkLoading}
                    size="small"
                />
            ),
        },
        {
            title: 'Actions',
            key: 'action',
            width: 110,
            align: 'right',
            render: (_, record) => (
                <div className="flex items-center justify-end gap-1.5">
                    <Tooltip title="Edit Configuration">
                        <Button
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => showModal(record)}
                            className="text-xs text-slate-600 hover:text-slate-800 border-slate-200"
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete Unit Mark"
                            description="Are you sure you want to delete this configuration?"
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

    const isLoading = unitMarkLoading || mappingsLoading || subjectsLoading;

    return (
        <div className="min-h-screen bg-slate-50/70 space-y-5">
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
                            <span>Set Unit Mark Configuration</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Configure syllabus units and mark weightings for question paper generation and question bank validation.
                        </p>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            icon={<ReloadOutlined spin={isLoading} />}
                            onClick={() => {
                                if (user?.organization_key && user?.staff_code) {
                                    dispatch(
                                        fetchUnitMarksRequest({
                                            organizationKey: user.organization_key,
                                            staffCode: user.staff_code,
                                        })
                                    );
                                    message.success('Unit mark configurations refreshed.');
                                }
                            }}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Refresh
                        </Button>
                        <Button
                            icon={<DownloadOutlined />}
                            onClick={handleExcelDownload}
                            disabled={filteredMarks.length === 0}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-indigo-500 hover:text-indigo-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Export Excel
                        </Button>
                        <Button
                            icon={<FileDoneOutlined />}
                            onClick={handleHtmlDownload}
                            disabled={filteredMarks.length === 0}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-emerald-500 hover:text-emerald-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Report (HTML)
                        </Button>
                        <Button
                            icon={<UploadOutlined />}
                            onClick={showBulkModal}
                            className="inline-flex items-center gap-1.5 text-slate-700 border-slate-300 hover:border-amber-500 hover:text-amber-600 font-medium h-9 rounded-xl shadow-xs"
                        >
                            Bulk Upload
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => showModal()}
                            className="bg-blue-600 hover:bg-blue-700 font-semibold h-9 rounded-xl shadow-sm inline-flex items-center"
                        >
                            Add Unit Mark
                        </Button>
                    </div>
                </div>
            </div>

            {/* 2. Overview Statistics Banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Total Configurations
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                            <SettingOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.total}</span>
                        <span className="text-xs text-slate-400">rules</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Active Mappings
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                            <CheckCircleOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-emerald-600">{metrics.activeCount}</span>
                        <span className="text-xs text-slate-400">enabled</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Units Mapped
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
                            Classes Configured
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                            <FileTextOutlined />
                        </div>
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-800">{metrics.uniqueClasses}</span>
                        <span className="text-xs text-slate-400">sections</span>
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
                                {uniqueYears.map(year => (
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
                                onChange={setSelectedSubjectFilter}
                                allowClear
                                disabled={!selectedSectionFilter}
                            >
                                {subjectOptionsForFilter.map(s => (
                                    <Option key={s.subject_code} value={s.subject_name}>
                                        <span className="flex items-center gap-1.5">
                                            <BookOutlined className="text-indigo-400" />
                                            <span>{s.subject_name}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Status Filter */}
                        <div className="w-full sm:w-auto min-w-[120px]">
                            <Select
                                placeholder="Status"
                                className="w-full"
                                value={statusFilter}
                                onChange={setStatusFilter}
                            >
                                <Option value="all">All Status</Option>
                                <Option value="Active">Active</Option>
                                <Option value="Inactive">Inactive</Option>
                            </Select>
                        </div>

                        {/* Search Input */}
                        <div className="w-full sm:w-auto sm:flex-1 min-w-[180px]">
                            <Input
                                placeholder="Search by class, subject or mark..."
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
                            statusFilter !== 'all' ||
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

            {/* Error banner if any */}
            {unitMarkError && (
                <Alert
                    message="Error Loading Unit Marks"
                    description={unitMarkError}
                    type="error"
                    showIcon
                    closable
                    className="rounded-xl"
                />
            )}

            {/* 4. Main Content Area */}
            <Spin spinning={isLoading} tip="Loading unit marks configuration...">
                {filteredMarks.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div className="space-y-1 mt-2">
                                    <p className="text-base font-semibold text-slate-700">
                                        No Unit Marks Configured
                                    </p>
                                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                                        {searchQuery || selectedClassFilter || selectedSubjectFilter || statusFilter !== 'all'
                                            ? 'No configurations matched your selected filter criteria. Try resetting filters.'
                                            : 'No unit mark rules have been created yet for this academic year. Click "Add Unit Mark" above to configure your syllabus weights.'}
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
                                Add First Unit Mark
                            </Button>
                        </Empty>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* CARDS VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {filteredMarks.map((item, idx) => (
                            <div
                                key={item.id || idx}
                                className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group hover:border-blue-200"
                            >
                                <div className="space-y-3">
                                    {/* Card Top: Badges and Status */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                Class {item.class} - {item.section}
                                            </span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                Unit {item.unit}
                                            </span>
                                        </div>
                                        <Switch
                                            checkedChildren="Active"
                                            unCheckedChildren="Inactive"
                                            checked={item.status === 'Active'}
                                            onChange={checked => handleStatusChange(checked, item)}
                                            loading={unitMarkLoading}
                                            size="small"
                                        />
                                    </div>

                                    {/* Subject */}
                                    <div>
                                        <div className="flex items-center gap-1.5 text-base font-bold text-slate-800">
                                            <BookOutlined className="text-indigo-500" />
                                            <span>{item.subject}</span>
                                        </div>
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            Regulation: {item.regulation || 'General'}
                                        </span>
                                    </div>

                                    {/* Mark Type Box */}
                                    <div className="bg-emerald-50/70 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
                                        <span className="text-xs font-semibold text-emerald-800">
                                            Weightage / Question Mark Type
                                        </span>
                                        <span className="text-sm font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                            {item.mark_type} {item.mark_type === 1 ? 'Mark' : 'Marks'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Footer Actions */}
                                <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-400">
                                        Year: {item.academic_year}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <Tooltip title="Edit Configuration">
                                            <Button
                                                size="small"
                                                icon={<EditOutlined />}
                                                onClick={() => showModal(item)}
                                                className="text-xs text-slate-600 hover:text-slate-800 border-slate-200"
                                            />
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <Popconfirm
                                                title="Delete Unit Mark"
                                                description="Are you sure you want to delete this configuration?"
                                                okText="Yes, Delete"
                                                cancelText="Cancel"
                                                okButtonProps={{ danger: true }}
                                                onConfirm={() => handleDelete(item.id)}
                                            >
                                                <Button size="small" danger icon={<DeleteOutlined />} className="text-xs" />
                                            </Popconfirm>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* TABLE VIEW */
                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <Table
                            columns={columns}
                            dataSource={filteredMarks}
                            rowKey="id"
                            pagination={{
                                pageSize: 12,
                                showSizeChanger: true,
                                pageSizeOptions: ['12', '24', '48'],
                                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} configurations`,
                            }}
                            scroll={{ x: 'max-content' }}
                        />
                    </div>
                )}
            </Spin>

            {/* MODAL 1: Add or Edit Unit Mark */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold">
                            {editingMark ? <EditOutlined /> : <PlusOutlined />}
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                {editingMark ? 'Edit Unit Mark Configuration' : 'Create Unit Mark Rule'}
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                Configure curriculum unit number and mark type weightage for exams
                            </span>
                        </div>
                    </div>
                }
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="cancel" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        onClick={() => form.submit()}
                        loading={unitMarkLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {editingMark ? 'Update Rule' : 'Save Rule'}
                    </Button>,
                ]}
                destroyOnClose
                width={700}
                className="rounded-2xl"
            >
                <Form form={form} layout="vertical" onFinish={onFinish} className="mt-4 space-y-4">
                    {/* Header download link */}
                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <span className="text-xs text-slate-500">
                            Need to configure multiple units? Use Excel bulk upload.
                        </span>
                        <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadTemplate}
                            className="text-xs font-medium"
                        >
                            Download Template
                        </Button>
                    </div>

                    <Spin spinning={isLoading}>
                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 space-y-3">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                Target Class & Subject
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
                                            loading={mappingsLoading}
                                            onChange={() =>
                                                form.setFieldsValue({ class_key: null, subject_code: null })
                                            }
                                        >
                                            {activeCalendars.map((cal: any) => (
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
                                            disabled={!formAcademicYear}
                                        >
                                            {classOptions.map((opt: any) => (
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
                                            loading={subjectsLoading}
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

                                <Col xs={24} sm={12}>
                                    <Form.Item name="regulation" label="Regulation">
                                        <Input disabled className="bg-white" />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        <div className="bg-slate-50/60 p-3.5 rounded-xl border border-slate-100 space-y-3 mt-3">
                            <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                                Unit Number & Mark Weightage
                            </span>
                            <Row gutter={12}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="unit"
                                        label="Unit Number"
                                        rules={[{ required: true, message: 'Enter unit number' }]}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            placeholder="e.g. 1"
                                            min={1}
                                            className="rounded-lg"
                                        />
                                    </Form.Item>
                                </Col>

                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="mark_type"
                                        label="Question Mark Weightage"
                                        rules={[{ required: true, message: 'Enter marks weightage' }]}
                                    >
                                        <InputNumber
                                            style={{ width: '100%' }}
                                            placeholder="e.g. 1, 2, 5, or 10"
                                            min={1}
                                            className="rounded-lg"
                                        />
                                    </Form.Item>
                                </Col>

                                {editingMark && (
                                    <Col xs={24} sm={12}>
                                        <Form.Item
                                            name="status"
                                            label="Status"
                                            rules={[{ required: true }]}
                                        >
                                            <Select>
                                                <Option value="Active">Active</Option>
                                                <Option value="Inactive">Inactive</Option>
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                )}
                            </Row>
                        </div>
                    </Spin>
                </Form>
            </Modal>

            {/* MODAL 2: Bulk Upload Unit Marks */}
            <Modal
                title={
                    <div className="flex items-center gap-2 pr-6">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm font-bold">
                            <UploadOutlined />
                        </div>
                        <div>
                            <span className="font-bold text-slate-800 text-base">
                                Bulk Upload Unit Mark Configurations
                            </span>
                            <span className="block text-xs font-medium text-slate-400">
                                Import full unit and mark weightage rules via Excel (.xlsx, .xls)
                            </span>
                        </div>
                    </div>
                }
                open={isBulkModalVisible}
                onCancel={handleBulkCancel}
                destroyOnClose
                footer={[
                    <Button key="back" onClick={handleBulkCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        disabled={parsedData.length === 0}
                        loading={unitMarkLoading}
                        onClick={handleBulkSubmit}
                        className="bg-amber-600 hover:bg-amber-700"
                    >
                        Upload {parsedData.length > 0 ? `(${parsedData.length}) Rules` : ''}
                    </Button>,
                ]}
                className="rounded-2xl"
            >
                <div className="space-y-4 py-2">
                    {/* Instructions and Template */}
                    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                        <span className="text-amber-800">
                            Required spreadsheet columns: <code className="bg-white px-1 py-0.5 rounded font-bold border border-amber-200">class</code>, <code className="bg-white px-1 py-0.5 rounded font-bold border border-amber-200">section</code>, <code className="bg-white px-1 py-0.5 rounded font-bold border border-amber-200">academic_year</code>, <code className="bg-white px-1 py-0.5 rounded font-bold border border-amber-200">subject</code>, <code className="bg-white px-1 py-0.5 rounded font-bold border border-amber-200">unit</code>, <code className="bg-white px-1 py-0.5 rounded font-bold border border-amber-200">mark_type</code>.
                        </span>
                        <Button
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={handleDownloadTemplate}
                            className="bg-white text-amber-700 border-amber-300 hover:bg-amber-50 font-medium shrink-0 ml-2"
                        >
                            Download Template
                        </Button>
                    </div>

                    {/* Drag and Drop Zone */}
                    <Dragger
                        name="file"
                        multiple={false}
                        accept=".xlsx, .xls"
                        fileList={fileList}
                        beforeUpload={() => false}
                        onChange={handleFileChange}
                        onRemove={() => {
                            setFileList([]);
                            setParsedData([]);
                            setUploadError(null);
                        }}
                        className="bg-slate-50 rounded-xl border-dashed"
                    >
                        <p className="ant-upload-drag-icon text-amber-500">
                            <FileExcelOutlined style={{ fontSize: 36 }} />
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                            Click or drag Excel file (.xlsx, .xls) to upload
                        </p>
                        <p className="text-xs text-slate-400">
                            Parses and validates all units and marks against syllabus standards.
                        </p>
                    </Dragger>

                    {uploadError && (
                        <Alert
                            message="Spreadsheet Validation Error"
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
                                Found {parsedData.length} valid unit mark records ready to import.
                            </span>
                            <Tag color="success" className="font-bold">
                                Ready
                            </Tag>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default SetUnitMark;
