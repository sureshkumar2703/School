import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Table,
    Spin,
    Alert,
    Empty,
    Select,
    Upload,
    message,
    Popconfirm,
    Input,
} from 'antd';
import {
    ArrowLeftOutlined,
    BookOutlined,
    FilePdfOutlined,
    FileWordOutlined,
    FileTextOutlined,
    UploadOutlined,
    DeleteOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    InboxOutlined,
    EyeOutlined,
    FolderOpenOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import {
    fetchNotesRequest,
    addNoteRequest,
    deleteNoteRequest,
    type ClassNote,
} from '../../store/features/notes/notesSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';

const { Option } = Select;

interface ClassOption {
    key: string;
    label: string;
    className: string;
    sectionName: string;
    academicYear: string;
}

const ClassNotes: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector(
        (state: RootState) => state.teacherDashboard
    );
    const { notes, loading: notesLoading, error: notesError } = useSelector(
        (state: RootState) => state.notes
    );

    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'pdf' | 'doc'>('all');

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo<ClassOption[]>(() => {
        const uniqueClasses = myAssignments.reduce((acc: Map<string, ClassOption>, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    label: `Class ${m.class_name} - Section ${m.section_name} (${m.academic_year})`,
                    className: m.class_name,
                    sectionName: m.section_name,
                    academicYear: m.academic_year,
                });
            }
            return acc;
        }, new Map<string, ClassOption>());

        return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [myAssignments]);

    // Auto-select first class if none selected
    useEffect(() => {
        if (classOptions.length > 0 && !selectedClassKey) {
            setSelectedClassKey(classOptions[0].key);
        }
    }, [classOptions, selectedClassKey]);

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

    useEffect(() => {
        if (selectedClassKey) {
            const defaultSubject = subjectOptions.length > 0 ? subjectOptions[0] : null;
            setSelectedSubject(defaultSubject);
        } else {
            setSelectedSubject(null);
        }
    }, [selectedClassKey, subjectOptions]);

    useEffect(() => {
        if (selectedClassKey && selectedSubject && user?.id) {
            const [className, sectionName, academicYear] = selectedClassKey.split('||');
            dispatch(
                fetchNotesRequest({
                    teacherId: user.id,
                    className,
                    sectionName,
                    academicYear,
                    subject: selectedSubject,
                })
            );
        } else if (!selectedClassKey || !selectedSubject) {
            dispatch({ type: 'notes/fetchNotesSuccess', payload: [] });
        }
    }, [dispatch, selectedClassKey, selectedSubject, user?.id]);

    const handleUpload = (file: File) => {
        if (!selectedClassKey || !selectedSubject || !user?.id || !user?.organization_key || !user?.full_name) {
            message.error('Please select a class and subject first, and ensure you are logged in.');
            return;
        }
        const [className, sectionName, academicYear] = selectedClassKey.split('||');

        dispatch(
            addNoteRequest({
                teacher_id: user.id,
                teacher_name: user.full_name,
                staff_code: user.staff_code || '',
                organization_key: user.organization_key,
                class_name: className,
                section_name: sectionName,
                academic_year: academicYear,
                subject: selectedSubject,
                file: file,
            })
        );
    };

    const handleDelete = (noteId: string, filePath: string) => {
        dispatch(deleteNoteRequest({ noteId, filePath }));
    };

    const uploadProps: UploadProps = {
        showUploadList: false,
        beforeUpload: (file: File) => {
            const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
            const isDoc = file.type === 'application/msword' || file.name.toLowerCase().endsWith('.doc');
            const isDocx =
                file.type ===
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                file.name.toLowerCase().endsWith('.docx');

            if (!isPdf && !isDoc && !isDocx) {
                message.error('You can only upload PDF or Word documents (.pdf, .doc, .docx)!');
                return Upload.LIST_IGNORE;
            }

            // Size check: limit to 25MB
            const isLt25M = file.size / 1024 / 1024 < 25;
            if (!isLt25M) {
                message.error('File must be smaller than 25MB!');
                return Upload.LIST_IGNORE;
            }

            handleUpload(file);
            return false;
        },
    };

    // Metrics for the currently selected class & subject
    const noteMetrics = useMemo<{
        total: number;
        pdfCount: number;
        docCount: number;
        latestNote: ClassNote | null;
    }>(() => {
        const total = notes.length;
        let pdfCount = 0;
        let docCount = 0;
        let latestNote: ClassNote | null = null;

        for (const note of notes) {
            const lowerUrl = (note.file_url || note.file_name || '').toLowerCase();
            if (lowerUrl.endsWith('.pdf')) pdfCount++;
            else docCount++;

            if (!latestNote || new Date(note.created_at) > new Date(latestNote.created_at)) {
                latestNote = note;
            }
        }

        return { total, pdfCount, docCount, latestNote };
    }, [notes]);

    // Filtered notes list
    const filteredNotes = useMemo(() => {
        return notes.filter(note => {
            const matchesSearch =
                (note.file_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (note.subject || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            const lower = (note.file_url || note.file_name || '').toLowerCase();
            if (fileTypeFilter === 'pdf') return lower.endsWith('.pdf');
            if (fileTypeFilter === 'doc') return lower.endsWith('.doc') || lower.endsWith('.docx');

            return true;
        });
    }, [notes, searchTerm, fileTypeFilter]);

    const getFileIcon = (fileName: string, fileUrl: string) => {
        const target = (fileUrl || fileName || '').toLowerCase();
        if (target.endsWith('.pdf')) {
            return (
                <div
                    style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                    }}
                >
                    <FilePdfOutlined />
                </div>
            );
        }
        if (target.endsWith('.doc') || target.endsWith('.docx')) {
            return (
                <div
                    style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        backgroundColor: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                    }}
                >
                    <FileWordOutlined />
                </div>
            );
        }
        return (
            <div
                style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                }}
            >
                <FileTextOutlined />
            </div>
        );
    };

    const columns: ColumnsType<ClassNote> = [
        {
            title: 'Document Details',
            dataIndex: 'file_name',
            key: 'file_name',
            render: (text: string, record: ClassNote) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {getFileIcon(record.file_name, record.file_url)}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <a
                            href={record.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontWeight: 700,
                                color: '#0f172a',
                                fontSize: '13px',
                                textDecoration: 'none',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                            }}
                        >
                            <span>{text}</span>
                            <EyeOutlined style={{ fontSize: '12px', color: '#0284c7' }} />
                        </a>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#64748b' }}>
                            <span>Subject: <strong style={{ color: '#0284c7' }}>{record.subject}</strong></span>
                            <span>•</span>
                            <span>Class {record.class_name}-{record.section_name}</span>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'File Type',
            dataIndex: 'file_type',
            key: 'file_type',
            width: 140,
            render: (_: string, record: ClassNote) => {
                const lower = (record.file_url || record.file_name || '').toLowerCase();
                const isPdf = lower.endsWith('.pdf');
                const isDoc = lower.endsWith('.doc') || lower.endsWith('.docx');

                return (
                    <span
                        style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: isPdf ? '#fef2f2' : isDoc ? '#eff6ff' : '#f8fafc',
                            color: isPdf ? '#dc2626' : isDoc ? '#2563eb' : '#475569',
                            border: isPdf ? '1px solid #fecaca' : isDoc ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                        }}
                    >
                        {isPdf ? 'PDF Document' : isDoc ? 'Word Document' : record.file_type || 'Document'}
                    </span>
                );
            },
        },
        {
            title: 'Uploaded At',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 200,
            render: (date: string) => (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {dayjs(date).format('DD MMM YYYY')}
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {dayjs(date).format('hh:mm A')}
                    </span>
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            align: 'center',
            render: (_, record: ClassNote) => (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <a
                        href={record.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#f0f9ff',
                            border: '1px solid #bae6fd',
                            color: '#0284c7',
                            textDecoration: 'none',
                            fontSize: '13px',
                        }}
                        title="View / Download Document"
                    >
                        <EyeOutlined />
                    </a>

                    <Popconfirm
                        title="Delete Course Material"
                        description="Are you sure you want to delete this study note? Students will no longer have access to it."
                        okText="Yes, Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(record.id, record.file_path)}
                    >
                        <button
                            type="button"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#dc2626',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                            title="Delete Document"
                        >
                            <DeleteOutlined />
                        </button>
                    </Popconfirm>
                </div>
            ),
        },
    ];

    const isLoading = mappingsLoading || notesLoading;
    const error = mappingsError || notesError;

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f8fafc',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
        >
            {/* 1. Header Card */}
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '16px',
                    }}
                >
                    {/* Title & Navigation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => dispatch(setCurrentPage('staffdashboard'))}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#475569',
                                    backgroundColor: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <ArrowLeftOutlined />
                                <span>Back to Dashboard</span>
                            </button>
                            <span
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#0284c7',
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '8px',
                                }}
                            >
                                <BookOutlined style={{ color: '#0284c7' }} />
                                <span>Course Materials & Notes</span>
                            </span>
                        </div>

                        <h1
                            style={{
                                margin: '4px 0 0 0',
                                fontSize: '22px',
                                fontWeight: 800,
                                color: '#0f172a',
                                letterSpacing: '-0.02em',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <span>Class Notes & Study Materials</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            Upload, organize, and manage course notes, syllabus materials, and references for your students.
                        </p>
                    </div>

                    {/* Class & Subject Selectors */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Class & Section Selector */}
                        <div style={{ minWidth: '240px' }}>
                            <Select
                                showSearch
                                placeholder="Select Class & Section"
                                style={{ width: '100%' }}
                                size="middle"
                                value={selectedClassKey}
                                onChange={value => setSelectedClassKey(value)}
                                loading={mappingsLoading}
                                allowClear
                            >
                                {classOptions.map(option => (
                                    <Option key={option.key} value={option.key}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FolderOpenOutlined style={{ color: '#0284c7' }} />
                                            <span>{option.label}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Subject Selector */}
                        <div style={{ minWidth: '180px' }}>
                            <Select
                                placeholder="Select Subject"
                                style={{ width: '100%' }}
                                size="middle"
                                value={selectedSubject}
                                onChange={setSelectedSubject}
                                disabled={!selectedClassKey || subjectOptions.length === 0}
                                allowClear
                            >
                                {subjectOptions.map(subject => (
                                    <Option key={subject} value={subject}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <BookOutlined style={{ color: '#4f46e5' }} />
                                            <span>{subject}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Selected Class & Subject Banner */}
                {selectedClassKey && selectedSubject && (
                    <div
                        style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '10px',
                            fontSize: '13px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                                Selected Subject:
                            </span>
                            <span
                                style={{
                                    fontWeight: 700,
                                    color: '#0369a1',
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    padding: '4px 12px',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            >
                                {selectedSubject}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>
                                ({classOptions.find(c => c.key === selectedClassKey)?.label || selectedClassKey})
                            </span>
                        </div>

                        <span
                            style={{
                                color: '#15803d',
                                backgroundColor: '#dcfce7',
                                border: '1px solid #86efac',
                                padding: '3px 10px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                            }}
                        >
                            <CheckCircleOutlined /> Active Repository
                        </span>
                    </div>
                )}
            </div>

            {error && (
                <Alert
                    message="Error"
                    description={error}
                    type="error"
                    showIcon
                    style={{ borderRadius: '12px' }}
                />
            )}

            {selectedClassKey && selectedSubject ? (
                <>
                    {/* 2. Summary KPI Metric Cards */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        {/* Total Uploaded Materials */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Total Materials
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                    {noteMetrics.total} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Files</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    In {selectedSubject}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #dbeafe',
                                }}
                            >
                                <FolderOpenOutlined />
                            </div>
                        </div>

                        {/* PDF Documents */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    PDF Documents
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                                    {noteMetrics.pdfCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Files</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Portable Document Format
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #fecaca',
                                }}
                            >
                                <FilePdfOutlined />
                            </div>
                        </div>

                        {/* Word Documents */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Word Documents
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#2563eb', marginTop: '2px' }}>
                                    {noteMetrics.docCount} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Files</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    DOC & DOCX Files
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #bfdbfe',
                                }}
                            >
                                <FileWordOutlined />
                            </div>
                        </div>

                        {/* Recent Upload Activity */}
                        <div
                            style={{
                                backgroundColor: '#ffffff',
                                borderRadius: '14px',
                                border: '1px solid #e2e8f0',
                                padding: '16px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            }}
                        >
                            <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Latest Upload
                                </span>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                                    {noteMetrics.latestNote
                                        ? dayjs((noteMetrics.latestNote as ClassNote).created_at).format('DD MMM YYYY')
                                        : 'None Uploaded'}
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    {noteMetrics.latestNote
                                        ? dayjs((noteMetrics.latestNote as ClassNote).created_at).format('hh:mm A')
                                        : 'Awaiting first file'}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #a7f3d0',
                                }}
                            >
                                <ClockCircleOutlined />
                            </div>
                        </div>
                    </div>

                    {/* 3. Drag & Drop Upload Zone */}
                    <div
                        style={{
                            borderRadius: '16px',
                            border: '1px dashed #0284c7',
                            padding: '24px 20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            gap: '12px',
                            backgroundColor: '#f8fafc',
                        }}
                    >
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #bae6fd',
                                color: '#0284c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '22px',
                            }}
                        >
                            <InboxOutlined />
                        </div>

                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                                Upload Study Notes for {selectedSubject}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                Click the button below to upload course materials. Supported formats: PDF, DOC, DOCX (Max 25MB).
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#fef2f2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                }}
                            >
                                .PDF
                            </span>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                }}
                            >
                                .DOC
                            </span>
                            <span
                                style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    border: '1px solid #bfdbfe',
                                }}
                            >
                                .DOCX
                            </span>
                        </div>

                        <Upload {...uploadProps}>
                            <button
                                type="button"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 20px',
                                    borderRadius: '10px',
                                    backgroundColor: '#0284c7',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
                                    marginTop: '4px',
                                }}
                            >
                                <UploadOutlined />
                                <span>Choose Document to Upload</span>
                            </button>
                        </Upload>
                    </div>

                    {/* 4. Search & Filter Bar */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '14px 18px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '12px',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                    >
                        {/* Search Input */}
                        <div style={{ width: '280px' }}>
                            <Input
                                placeholder="Search materials by title..."
                                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                allowClear
                                style={{ borderRadius: '8px' }}
                            />
                        </div>

                        {/* Format Filter Toggle Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginRight: '4px' }}>
                                Format:
                            </span>
                            {[
                                { key: 'all', label: `All Files (${noteMetrics.total})` },
                                { key: 'pdf', label: `PDFs (${noteMetrics.pdfCount})` },
                                { key: 'doc', label: `Word (${noteMetrics.docCount})` },
                            ].map(item => {
                                const isSelected = fileTypeFilter === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        type="button"
                                        onClick={() => setFileTypeFilter(item.key as any)}
                                        style={{
                                            padding: '5px 12px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: isSelected ? 700 : 500,
                                            border: isSelected ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                                            backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                                            color: isSelected ? '#0369a1' : '#64748b',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 5. Documents Table */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            overflow: 'hidden',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                    >
                        <Spin spinning={isLoading}>
                            {filteredNotes.length > 0 ? (
                                <Table
                                    columns={columns}
                                    dataSource={filteredNotes}
                                    rowKey="id"
                                    pagination={{
                                        pageSize: 15,
                                        showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} documents`,
                                        style: { padding: '16px 20px' },
                                    }}
                                    scroll={{ x: 750 }}
                                />
                            ) : (
                                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            <div style={{ maxWidth: '360px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                                    {searchTerm || fileTypeFilter !== 'all'
                                                        ? 'No Matching Documents Found'
                                                        : 'No Course Materials Uploaded Yet'}
                                                </span>
                                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                                    {searchTerm || fileTypeFilter !== 'all'
                                                        ? 'Try clearing your search filters to view all documents.'
                                                        : `Use the upload area above to share study materials for ${selectedSubject}.`}
                                                </span>
                                            </div>
                                        }
                                    />
                                </div>
                            )}
                        </Spin>
                    </div>
                </>
            ) : (
                /* Empty state when no class or subject selected */
                <div
                    style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        padding: '48px 24px',
                        textAlign: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                >
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div style={{ maxWidth: '380px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                    Select a Class & Subject
                                </span>
                                <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                    Please choose a class, section, and subject from the dropdown above to view, upload, or manage study materials.
                                </span>
                            </div>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default ClassNotes;
