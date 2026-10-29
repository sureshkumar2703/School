import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Spin,
    Alert,
    Empty,
    Tag,
    Select,
    Row,
    Col,
    Button,
    Space,
    Modal,
    Input,
    Segmented,
    Grid,
    Avatar,
    Badge,
    Tooltip,
    Divider,
    Table,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    BookOutlined,
    FilePdfOutlined,
    FileImageOutlined,
    FileWordOutlined,
    FileTextOutlined,
    FileOutlined,
    DownloadOutlined,
    EyeOutlined,
    SearchOutlined,
    CalendarOutlined,
    UserOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    ClockCircleOutlined,
    MessageOutlined,
    TeamOutlined,
    ReloadOutlined,
    FolderOpenOutlined,
    CloudDownloadOutlined,
    CheckCircleFilled,
    TagOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchStudentNotesRequest,
    type StudentNote,
} from '../../store/features/student-notes/studentNotesSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text, Paragraph } = Typography;

export interface AcademicYearOption {
    value: string;
    label: string;
    isCurrent: boolean;
    status?: string;
}

// Subject color mapping presets with harmonious hues
const SUBJECT_COLORS: { [key: string]: { bg: string; border: string; text: string; badge: string } } = {
    math: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#3b82f6' },
    science: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', badge: '#10b981' },
    physics: { bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', badge: '#14b8a6' },
    chemistry: { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', badge: '#8b5cf6' },
    biology: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badge: '#22c55e' },
    english: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', badge: '#f97316' },
    social: { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', badge: '#f43f5e' },
    history: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badge: '#ef4444' },
    geography: { bg: '#ecfeff', border: '#a5f3fc', text: '#155e75', badge: '#06b6d4' },
    computer: { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', badge: '#0284c7' },
    language: { bg: '#fdf4ff', border: '#f5d0fe', text: '#86198f', badge: '#d946ef' },
    default: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', badge: '#64748b' },
};

const getSubjectPalette = (subjectName?: string) => {
    if (!subjectName) return SUBJECT_COLORS.default;
    const lower = subjectName.toLowerCase();
    if (lower.includes('math')) return SUBJECT_COLORS.math;
    if (lower.includes('physics')) return SUBJECT_COLORS.physics;
    if (lower.includes('chem')) return SUBJECT_COLORS.chemistry;
    if (lower.includes('bio')) return SUBJECT_COLORS.biology;
    if (lower.includes('sci')) return SUBJECT_COLORS.science;
    if (lower.includes('eng')) return SUBJECT_COLORS.english;
    if (lower.includes('soc') || lower.includes('civic') || lower.includes('pol')) return SUBJECT_COLORS.social;
    if (lower.includes('hist')) return SUBJECT_COLORS.history;
    if (lower.includes('geo')) return SUBJECT_COLORS.geography;
    if (lower.includes('comp') || lower.includes('it') || lower.includes('code') || lower.includes('tech')) return SUBJECT_COLORS.computer;
    if (lower.includes('hindi') || lower.includes('tamil') || lower.includes('french') || lower.includes('lang') || lower.includes('sans')) {
        return SUBJECT_COLORS.language;
    }
    return SUBJECT_COLORS.default;
};

// File type detection helpers
const getFileMeta = (fileName: string, fileType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf' || (fileType && fileType.includes('pdf'))) {
        return {
            category: 'pdf',
            extension: 'PDF',
            label: 'PDF Document',
            color: '#ef4444',
            bg: '#fef2f2',
            border: '#fecaca',
            icon: <FilePdfOutlined style={{ fontSize: '28px', color: '#ef4444' }} />,
            smallIcon: <FilePdfOutlined style={{ color: '#ef4444' }} />,
        };
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) || (fileType && fileType.includes('image'))) {
        return {
            category: 'image',
            extension: ext.toUpperCase() || 'IMG',
            label: 'Image File',
            color: '#3b82f6',
            bg: '#eff6ff',
            border: '#bfdbfe',
            icon: <FileImageOutlined style={{ fontSize: '28px', color: '#3b82f6' }} />,
            smallIcon: <FileImageOutlined style={{ color: '#3b82f6' }} />,
        };
    }
    if (['doc', 'docx'].includes(ext) || (fileType && (fileType.includes('word') || fileType.includes('officedocument.wordprocessingml')))) {
        return {
            category: 'doc',
            extension: 'DOCX',
            label: 'Word Document',
            color: '#2563eb',
            bg: '#eff6ff',
            border: '#bfdbfe',
            icon: <FileWordOutlined style={{ fontSize: '28px', color: '#2563eb' }} />,
            smallIcon: <FileWordOutlined style={{ color: '#2563eb' }} />,
        };
    }
    if (['ppt', 'pptx'].includes(ext)) {
        return {
            category: 'doc',
            extension: 'PPTX',
            label: 'Presentation',
            color: '#ea580c',
            bg: '#fff7ed',
            border: '#fed7aa',
            icon: <FileTextOutlined style={{ fontSize: '28px', color: '#ea580c' }} />,
            smallIcon: <FileTextOutlined style={{ color: '#ea580c' }} />,
        };
    }
    if (['xls', 'xlsx', 'csv'].includes(ext)) {
        return {
            category: 'doc',
            extension: 'XLSX',
            label: 'Spreadsheet',
            color: '#16a34a',
            bg: '#f0fdf4',
            border: '#bbf7d0',
            icon: <FileTextOutlined style={{ fontSize: '28px', color: '#16a34a' }} />,
            smallIcon: <FileTextOutlined style={{ color: '#16a34a' }} />,
        };
    }
    return {
        category: 'other',
        extension: ext.toUpperCase() || 'FILE',
        label: 'Class Note File',
        color: '#64748b',
        bg: '#f8fafc',
        border: '#e2e8f0',
        icon: <FileOutlined style={{ fontSize: '28px', color: '#64748b' }} />,
        smallIcon: <FileOutlined style={{ color: '#64748b' }} />,
    };
};

const StudentMyNotes: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { notes, loading, error } = useSelector((state: RootState) => state.studentNotes);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section and Class allocated for selected academic year
    const [studentClass, setStudentClass] = useState<string | null>(null);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    // UI View and Filter state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubject, setSelectedSubject] = useState<string>('all');
    const [fileCategoryFilter, setFileCategoryFilter] = useState<'all' | 'pdf' | 'image' | 'doc'>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'subject'>('newest');
    const [previewingNote, setPreviewingNote] = useState<StudentNote | null>(null);

    // 1. Fetch Academic Years from database and default to the active/current one
    useEffect(() => {
        let isMounted = true;
        if (!user?.organization_key) {
            setLoadingAcademicYears(false);
            return;
        }

        const fetchAcademicYears = async () => {
            setLoadingAcademicYears(true);
            try {
                const { data, error: yearError } = await supabase
                    .from('academic_year')
                    .select('academic_year, is_current, status')
                    .eq('organization_key', user.organization_key)
                    .order('created_at', { ascending: false });

                if (yearError) {
                    console.warn('Academic year fetch warning:', yearError.message);
                    return;
                }

                const rawList = data || [];
                const yearMap = new Map<string, AcademicYearOption>();

                rawList.forEach((row: any) => {
                    const y = (row.academic_year || '').trim();
                    if (y && !yearMap.has(y)) {
                        const isCur = row.is_current === true || row.is_current === 'true' || row.status === 'Active';
                        yearMap.set(y, {
                            value: y,
                            label: isCur ? `${y} (Current)` : y,
                            isCurrent: isCur,
                            status: row.status,
                        });
                    }
                });

                if (user?.academic_year && !yearMap.has(user.academic_year)) {
                    yearMap.set(user.academic_year, {
                        value: user.academic_year,
                        label: `${user.academic_year} (Current)`,
                        isCurrent: true,
                    });
                }

                const options = Array.from(yearMap.values()).sort((a, b) => {
                    if (a.isCurrent && !b.isCurrent) return -1;
                    if (!a.isCurrent && b.isCurrent) return 1;
                    return b.value.localeCompare(a.value);
                });

                if (isMounted) {
                    setAcademicYears(options);
                    const currentOption =
                        options.find((opt) => opt.isCurrent) ||
                        options.find((opt) => opt.status === 'Active') ||
                        options[0];
                    const defaultYear = currentOption?.value || user?.academic_year || '';
                    setSelectedAcademicYear((prev) => (prev ? prev : defaultYear));
                }
            } catch (err) {
                console.error('Error fetching academic years:', err);
                if (isMounted && user?.academic_year) {
                    setSelectedAcademicYear(user.academic_year);
                }
            } finally {
                if (isMounted) setLoadingAcademicYears(false);
            }
        };

        fetchAcademicYears();
        return () => {
            isMounted = false;
        };
    }, [user?.organization_key, user?.academic_year]);

    // 2. Fetch Student's Class & Section based on SELECTED academic year
    useEffect(() => {
        let isMounted = true;
        if (!user?.organization_key || !selectedAcademicYear) {
            setLoadingSection(false);
            return;
        }

        const fetchAllocationForYear = async () => {
            setLoadingSection(true);
            try {
                let foundClass: string | null = null;
                let foundSection: string | null = null;

                if (user?.register_no) {
                    const { data, error: allocError } = await supabase
                        .from('class_section_allocations')
                        .select('class_name, section_name')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', selectedAcademicYear)
                        .maybeSingle();

                    if (!allocError && data) {
                        foundClass = data.class_name;
                        foundSection = data.section_name;
                    }
                }

                if (!foundClass && user?.admitted_class) {
                    foundClass = user.admitted_class;
                }

                if (isMounted) {
                    setStudentClass(foundClass);
                    setSection(foundSection);
                }
            } catch (err) {
                console.error('Error fetching student allocation for academic year:', err);
                if (isMounted) {
                    setSection(null);
                }
            } finally {
                if (isMounted) setLoadingSection(false);
            }
        };

        fetchAllocationForYear();
        return () => {
            isMounted = false;
        };
    }, [user?.organization_key, user?.register_no, user?.admitted_class, selectedAcademicYear]);

    // 3. Fetch Class Notes based on Effective Class, Section & Academic Year
    useEffect(() => {
        const effectiveClass = studentClass || user?.admitted_class;

        if (user?.organization_key && effectiveClass && section && selectedAcademicYear) {
            dispatch(
                fetchStudentNotesRequest({
                    organizationKey: user.organization_key,
                    className: effectiveClass,
                    sectionName: section,
                    academicYear: selectedAcademicYear,
                })
            );
        }
    }, [dispatch, user?.organization_key, studentClass, user?.admitted_class, section, selectedAcademicYear]);

    const effectiveClass = studentClass || user?.admitted_class;
    const isUpdating = loadingSection || loading;

    // Unique subjects list from notes
    const uniqueSubjects = useMemo(() => {
        const set = new Set<string>();
        notes.forEach((note) => {
            if (note.subject) set.add(note.subject.trim());
        });
        return Array.from(set).sort();
    }, [notes]);

    // Summary Statistics
    const stats = useMemo(() => {
        const totalNotes = notes.length;
        const totalSubjects = uniqueSubjects.length;

        let pdfCount = 0;
        let imageCount = 0;
        let recentCount = 0;

        const oneWeekAgo = dayjs().subtract(7, 'day');

        notes.forEach((note) => {
            const meta = getFileMeta(note.file_name, note.file_type);
            if (meta.category === 'pdf') pdfCount++;
            if (meta.category === 'image') imageCount++;
            if (dayjs(note.created_at).isAfter(oneWeekAgo)) recentCount++;
        });

        return {
            totalNotes,
            totalSubjects,
            pdfCount,
            imageCount,
            recentCount,
        };
    }, [notes, uniqueSubjects]);

    // Filtered and Sorted Notes
    const filteredNotes = useMemo(() => {
        return notes
            .filter((note) => {
                // Subject filter
                if (selectedSubject !== 'all' && note.subject.toLowerCase() !== selectedSubject.toLowerCase()) {
                    return false;
                }

                // File category filter
                if (fileCategoryFilter !== 'all') {
                    const meta = getFileMeta(note.file_name, note.file_type);
                    if (meta.category !== fileCategoryFilter) {
                        return false;
                    }
                }

                // Search query filter
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchName = note.file_name.toLowerCase().includes(q);
                    const matchSubject = note.subject.toLowerCase().includes(q);
                    const matchTeacher = (note.teacher_name || '').toLowerCase().includes(q);
                    if (!matchName && !matchSubject && !matchTeacher) {
                        return false;
                    }
                }

                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf();
                }
                if (sortBy === 'oldest') {
                    return dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf();
                }
                if (sortBy === 'name') {
                    return a.file_name.localeCompare(b.file_name);
                }
                if (sortBy === 'subject') {
                    return a.subject.localeCompare(b.subject);
                }
                return 0;
            });
    }, [notes, selectedSubject, fileCategoryFilter, searchQuery, sortBy]);

    // Trigger download
    const handleDownloadFile = (note: StudentNote) => {
        const link = document.createElement('a');
        link.href = note.file_url;
        link.download = note.file_name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Navigation handlers
    const handleGoToChat = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    const handleGoToTeachers = () => {
        dispatch(setCurrentPage('studentmyteachers'));
    };

    // Table view columns
    const columns: ColumnsType<StudentNote> = [
        {
            title: 'Document & Format',
            dataIndex: 'file_name',
            key: 'file_name',
            render: (_: any, record: StudentNote) => {
                const meta = getFileMeta(record.file_name, record.file_type);
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '10px',
                                background: meta.bg,
                                border: `1px solid ${meta.border}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            {meta.icon}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div
                                style={{
                                    fontWeight: 700,
                                    fontSize: '13.5px',
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '280px',
                                }}
                            >
                                <Tooltip title={record.file_name}>{record.file_name}</Tooltip>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <Tag
                                    style={{
                                        margin: 0,
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        color: meta.color,
                                        background: meta.bg,
                                        borderColor: meta.border,
                                        borderRadius: '6px',
                                        padding: '0 6px',
                                    }}
                                >
                                    {meta.extension}
                                </Tag>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{meta.label}</span>
                            </div>
                        </div>
                    </div>
                );
            },
        },
        {
            title: 'Subject',
            dataIndex: 'subject',
            key: 'subject',
            width: 170,
            render: (subject: string) => {
                const palette = getSubjectPalette(subject);
                return (
                    <span
                        style={{
                            background: palette.bg,
                            color: palette.text,
                            border: `1px solid ${palette.border}`,
                            borderRadius: '8px',
                            padding: '3px 10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                        }}
                    >
                        <TagOutlined style={{ fontSize: '11px' }} />
                        {subject}
                    </span>
                );
            },
        },
        {
            title: 'Uploaded By',
            dataIndex: 'teacher_name',
            key: 'teacher_name',
            width: 190,
            render: (teacherName: string) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar
                        size={28}
                        icon={<UserOutlined />}
                        style={{ background: '#3b82f6', fontSize: '12px', flexShrink: 0 }}
                    />
                    <div>
                        <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>
                            {teacherName || 'Faculty Member'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Teacher</div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Date Added',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 140,
            render: (date: string) => (
                <div style={{ fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CalendarOutlined style={{ color: '#94a3b8' }} />
                    {dayjs(date).format('MMM D, YYYY')}
                </div>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            width: 150,
            align: 'right',
            render: (_: any, record: StudentNote) => (
                <Space size={6}>
                    <Tooltip title="Preview Document">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<EyeOutlined style={{ color: '#2563eb' }} />}
                            onClick={() => setPreviewingNote(record)}
                            style={{ background: '#eff6ff' }}
                        />
                    </Tooltip>
                    <Tooltip title="Download File">
                        <Button
                            type="primary"
                            size="small"
                            icon={<DownloadOutlined />}
                            onClick={() => handleDownloadFile(record)}
                            style={{
                                borderRadius: '8px',
                                background: '#0284c7',
                                borderColor: '#0284c7',
                                fontWeight: 600,
                                fontSize: '11px',
                            }}
                        >
                            Get
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (loadingAcademicYears && !selectedAcademicYear) {
        return (
            <div
                style={{
                    minHeight: '60vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '32px',
                }}
            >
                <Spin size="large" />
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                    Loading class notes and study repository...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Notes"
                    description={error}
                    type="error"
                    showIcon
                    style={{ borderRadius: '14px' }}
                />
            </div>
        );
    }

    return (
        <div style={{ padding: isMobile ? '12px' : '24px', maxWidth: '1440px', margin: '0 auto' }}>
            {/* 1. HERO BANNER WITH DYNAMIC ACADEMIC YEAR SELECTOR */}
            <div
                style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)',
                    borderRadius: isMobile ? '16px' : '22px',
                    padding: isMobile ? '18px' : '26px 30px',
                    color: '#ffffff',
                    marginBottom: '22px',
                    boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Glow effects */}
                <div
                    style={{
                        position: 'absolute',
                        right: '-50px',
                        top: '-50px',
                        width: '220px',
                        height: '220px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.08)',
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'absolute',
                        right: '80px',
                        bottom: '-60px',
                        width: '160px',
                        height: '160px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.05)',
                        pointerEvents: 'none',
                    }}
                />

                <Row gutter={[20, 20]} align="middle">
                    <Col xs={24} md={15}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '10px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <span
                                style={{
                                    background: 'rgba(255, 255, 255, 0.18)',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)',
                                    padding: '5px 14px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                    color: '#e0f2fe',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <BookOutlined /> Digital Study Materials & Class Notes
                            </span>

                            {/* DYNAMIC ACADEMIC YEAR SELECTOR */}
                            <div
                                style={{
                                    background: '#ffffff',
                                    borderRadius: '20px',
                                    padding: '2px 8px 2px 12px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                                    border: '1px solid rgba(255, 255, 255, 0.85)',
                                }}
                            >
                                <ClockCircleOutlined style={{ color: '#2563eb', fontSize: '13px' }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Session:</span>
                                <Select
                                    value={selectedAcademicYear}
                                    onChange={(val) => setSelectedAcademicYear(val)}
                                    options={academicYears}
                                    loading={loadingAcademicYears}
                                    bordered={false}
                                    popupMatchSelectWidth={false}
                                    dropdownStyle={{
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    }}
                                    style={{
                                        minWidth: isMobile ? '135px' : '180px',
                                        fontWeight: 700,
                                        color: '#0f172a',
                                    }}
                                />
                            </div>
                        </div>

                        <h1
                            style={{
                                fontSize: isMobile ? '22px' : '28px',
                                fontWeight: 800,
                                margin: '0 0 6px 0',
                                color: '#ffffff',
                                letterSpacing: '-0.5px',
                                lineHeight: 1.25,
                            }}
                        >
                            My Class Notes & Materials 📝
                        </h1>

                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.92)',
                                fontSize: isMobile ? '12px' : '14px',
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {isUpdating ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <Spin size="small" /> Loading class notes for {selectedAcademicYear}...
                                </span>
                            ) : section ? (
                                <>
                                    Curated lecture notes, reference PDFs, and resources for{' '}
                                    <strong style={{ color: '#ffffff' }}>
                                        Class {effectiveClass || '--'} - Section {section}
                                    </strong>{' '}
                                    in academic session{' '}
                                    <strong style={{ color: '#fef08a' }}>{selectedAcademicYear || '--'}</strong>.
                                </>
                            ) : (
                                <>
                                    No section allocation found for{' '}
                                    <strong style={{ color: '#fef08a' }}>{selectedAcademicYear || '--'}</strong>.
                                    {user?.admitted_class ? ` (Admitted Class: Grade ${user.admitted_class})` : ''}
                                </>
                            )}
                        </p>
                    </Col>

                    {/* Class Details Badge Pill */}
                    <Col xs={24} md={9}>
                        <div
                            style={{
                                background: 'rgba(255, 255, 255, 0.14)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: '16px',
                                padding: isMobile ? '12px 14px' : '14px 18px',
                                border: '1px solid rgba(255, 255, 255, 0.22)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Class & Section:</span>
                                <span style={{ fontWeight: 800, fontSize: '13px', color: '#ffffff' }}>
                                    {effectiveClass ? `Grade ${effectiveClass}` : 'Class'}{' '}
                                    {section ? `- Section ${section}` : '(Not Allocated)'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Available Notes:</span>
                                <span
                                    style={{
                                        fontWeight: 800,
                                        fontSize: '13px',
                                        color: '#fef08a',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <FolderOpenOutlined style={{ color: '#fef08a' }} />
                                    {stats.totalNotes} Documents
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Selected Session:</span>
                                <Tag
                                    color="geekblue"
                                    style={{ margin: 0, fontWeight: 700, borderRadius: '8px', fontSize: '11px' }}
                                >
                                    {selectedAcademicYear || '--'}
                                </Tag>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* 2. STATS SUMMARY CARDS */}
            <Row gutter={[16, 16]} style={{ marginBottom: '22px' }}>
                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                                    Total Notes
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalNotes}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#eff6ff',
                                    color: '#2563eb',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <BookOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                                    Subjects Covered
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalSubjects}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <TagOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: '#ffffff',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>
                                    PDF Documents
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#ef4444',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.pdfCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <FilePdfOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={6} lg={6}>
                    <Card
                        style={{
                            borderRadius: '16px',
                            border: '1px solid #fed7aa',
                            boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <Text style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                                    Recent (This Week)
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#b45309',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.recentCount}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: '#fef3c7',
                                    color: '#d97706',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '20px',
                                }}
                            >
                                <ClockCircleOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CONTROL BAR: SEARCH, FILTERS, SORT & VIEW TOGGLE */}
            <Card
                style={{
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    marginBottom: '20px',
                    background: '#ffffff',
                }}
                bodyStyle={{ padding: '14px 18px' }}
            >
                <Row gutter={[12, 12]} align="middle" justify="space-between">
                    <Col xs={24} md={8} lg={7}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search notes, subject, or teacher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            allowClear
                            style={{
                                borderRadius: '10px',
                                padding: '8px 12px',
                                fontSize: '13px',
                                border: '1px solid #cbd5e1',
                            }}
                        />
                    </Col>

                    <Col xs={24} md={16} lg={17}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                gap: '10px',
                                flexWrap: 'wrap',
                            }}
                        >
                            {/* Subject filter */}
                            <Select
                                value={selectedSubject}
                                onChange={(val) => setSelectedSubject(val)}
                                style={{ minWidth: isMobile ? '100%' : '160px' }}
                                popupMatchSelectWidth={false}
                                options={[
                                    { value: 'all', label: `All Subjects (${notes.length})` },
                                    ...uniqueSubjects.map((s) => ({
                                        value: s,
                                        label: `${s} (${notes.filter((n) => n.subject === s).length})`,
                                    })),
                                ]}
                            />

                            {/* File Category filter */}
                            <Select
                                value={fileCategoryFilter}
                                onChange={(val) => setFileCategoryFilter(val)}
                                style={{ minWidth: isMobile ? '100%' : '140px' }}
                                options={[
                                    { value: 'all', label: 'All Formats' },
                                    { value: 'pdf', label: `PDFs (${stats.pdfCount})` },
                                    { value: 'image', label: `Images (${stats.imageCount})` },
                                    { value: 'doc', label: 'Documents' },
                                ]}
                            />

                            {/* Sort by */}
                            <Select
                                value={sortBy}
                                onChange={(val) => setSortBy(val)}
                                style={{ minWidth: isMobile ? '100%' : '135px' }}
                                options={[
                                    { value: 'newest', label: 'Newest First' },
                                    { value: 'oldest', label: 'Oldest First' },
                                    { value: 'name', label: 'File Name (A-Z)' },
                                    { value: 'subject', label: 'Subject Name' },
                                ]}
                            />

                            {/* View Mode Toggle */}
                            <Segmented
                                value={viewMode}
                                onChange={(val) => setViewMode(val as 'grid' | 'table')}
                                options={[
                                    {
                                        value: 'grid',
                                        icon: <AppstoreOutlined />,
                                        label: 'Cards',
                                    },
                                    {
                                        value: 'table',
                                        icon: <UnorderedListOutlined />,
                                        label: 'List',
                                    },
                                ]}
                                style={{
                                    background: '#f1f5f9',
                                    padding: '3px',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                }}
                            />
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* 4. MAIN NOTES LIST / GRID */}
            <Spin spinning={isUpdating}>
                {filteredNotes.length > 0 ? (
                    viewMode === 'grid' ? (
                        /* GRID / CARD VIEW */
                        <Row gutter={[18, 18]}>
                            {filteredNotes.map((note) => {
                                const meta = getFileMeta(note.file_name, note.file_type);
                                const palette = getSubjectPalette(note.subject);

                                return (
                                    <Col xs={24} sm={12} lg={8} key={note.id}>
                                        <Card
                                            hoverable
                                            style={{
                                                borderRadius: '16px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                                                background: '#ffffff',
                                                transition: 'all 0.25s ease',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                            }}
                                            bodyStyle={{
                                                padding: '18px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                height: '100%',
                                            }}
                                        >
                                            {/* Card Top: Subject & Extension Badge */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '14px',
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        background: palette.bg,
                                                        color: palette.text,
                                                        border: `1px solid ${palette.border}`,
                                                        borderRadius: '8px',
                                                        padding: '3px 10px',
                                                        fontSize: '11.5px',
                                                        fontWeight: 700,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <TagOutlined style={{ fontSize: '10px' }} />
                                                    {note.subject}
                                                </span>

                                                <Tag
                                                    style={{
                                                        margin: 0,
                                                        fontWeight: 800,
                                                        fontSize: '10.5px',
                                                        color: meta.color,
                                                        background: meta.bg,
                                                        borderColor: meta.border,
                                                        borderRadius: '6px',
                                                        padding: '1px 8px',
                                                    }}
                                                >
                                                    {meta.extension}
                                                </Tag>
                                            </div>

                                            {/* Card Body: Icon & File Title */}
                                            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', flex: 1 }}>
                                                <div
                                                    style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '12px',
                                                        background: meta.bg,
                                                        border: `1px solid ${meta.border}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {meta.icon}
                                                </div>

                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div
                                                        style={{
                                                            fontSize: '14px',
                                                            fontWeight: 700,
                                                            color: '#0f172a',
                                                            lineHeight: 1.35,
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            wordBreak: 'break-word',
                                                        }}
                                                        title={note.file_name}
                                                    >
                                                        {note.file_name}
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize: '12px',
                                                            color: '#64748b',
                                                            marginTop: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                        }}
                                                    >
                                                        <UserOutlined style={{ fontSize: '11px', color: '#94a3b8' }} />
                                                        <span>{note.teacher_name || 'Faculty Member'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <Divider style={{ margin: '14px 0 12px 0' }} />

                                            {/* Card Bottom: Date & Actions */}
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontSize: '11.5px',
                                                        color: '#94a3b8',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                    }}
                                                >
                                                    <CalendarOutlined style={{ fontSize: '11px' }} />
                                                    {dayjs(note.created_at).format('MMM D, YYYY')}
                                                </div>

                                                <Space size={6}>
                                                    <Button
                                                        size="small"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => setPreviewingNote(note)}
                                                        style={{
                                                            borderRadius: '8px',
                                                            fontWeight: 600,
                                                            fontSize: '11.5px',
                                                            borderColor: '#cbd5e1',
                                                        }}
                                                    >
                                                        View
                                                    </Button>

                                                    <Button
                                                        size="small"
                                                        type="primary"
                                                        icon={<DownloadOutlined />}
                                                        onClick={() => handleDownloadFile(note)}
                                                        style={{
                                                            borderRadius: '8px',
                                                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                            border: 'none',
                                                            fontWeight: 600,
                                                            fontSize: '11.5px',
                                                        }}
                                                    >
                                                        Download
                                                    </Button>
                                                </Space>
                                            </div>
                                        </Card>
                                    </Col>
                                );
                            })}
                        </Row>
                    ) : (
                        /* TABLE / LIST VIEW */
                        <Card
                            style={{
                                borderRadius: '18px',
                                border: '1px solid #e2e8f0',
                                boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                                overflow: 'hidden',
                                background: '#ffffff',
                            }}
                            bodyStyle={{ padding: 0 }}
                        >
                            <Table
                                columns={columns}
                                dataSource={filteredNotes}
                                rowKey="id"
                                pagination={{ pageSize: 10, showSizeChanger: true }}
                                scroll={{ x: 'max-content' }}
                            />
                        </Card>
                    )
                ) : (
                    /* EMPTY STATE */
                    <Card
                        style={{
                            borderRadius: '20px',
                            border: '1px solid #e2e8f0',
                            padding: '40px 20px',
                            textAlign: 'center',
                            background: '#ffffff',
                        }}
                    >
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <h3
                                        style={{
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: '#0f172a',
                                            margin: '0 0 6px 0',
                                        }}
                                    >
                                        {notes.length === 0
                                            ? 'No Class Notes Uploaded Yet'
                                            : 'No Notes Match Your Filters'}
                                    </h3>
                                    <p
                                        style={{
                                            color: '#64748b',
                                            fontSize: '13px',
                                            maxWidth: '460px',
                                            margin: '0 auto 16px auto',
                                        }}
                                    >
                                        {notes.length === 0
                                            ? `Teachers haven't shared reference notes for Class ${
                                                  effectiveClass || '--'
                                              } - Section ${section || '--'} in session ${
                                                  selectedAcademicYear || '--'
                                              } yet. Please check back soon!`
                                            : 'Try clearing the search query or switching subject and file category filters.'}
                                    </p>
                                </div>
                            }
                        >
                            <Space size={10}>
                                {notes.length > 0 ? (
                                    <Button
                                        type="primary"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedSubject('all');
                                            setFileCategoryFilter('all');
                                        }}
                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        Clear Filters
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        icon={<ReloadOutlined />}
                                        onClick={() => {
                                            if (
                                                user?.organization_key &&
                                                effectiveClass &&
                                                section &&
                                                selectedAcademicYear
                                            ) {
                                                dispatch(
                                                    fetchStudentNotesRequest({
                                                        organizationKey: user.organization_key,
                                                        className: effectiveClass,
                                                        sectionName: section,
                                                        academicYear: selectedAcademicYear,
                                                    })
                                                );
                                            }
                                        }}
                                        style={{ borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        Refresh Repository
                                    </Button>
                                )}
                                <Button
                                    icon={<TeamOutlined />}
                                    onClick={handleGoToTeachers}
                                    style={{ borderRadius: '8px', fontWeight: 600 }}
                                >
                                    Contact Teachers
                                </Button>
                            </Space>
                        </Empty>
                    </Card>
                )}
            </Spin>

            {/* 5. HELPER ACTION FOOTER */}
            <div
                style={{
                    marginTop: '22px',
                    display: 'flex',
                    alignItems: isMobile ? 'stretch' : 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    flexDirection: isMobile ? 'column' : 'row',
                    gap: '14px',
                    background: '#f8fafc',
                    padding: isMobile ? '14px' : '14px 18px',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: isMobile ? '1 1 100%' : '1 1 280px', minWidth: 0 }}>
                    <BookOutlined style={{ color: '#2563eb', fontSize: '15px', marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                        Need extra reference material or syllabus clarification? Reach out directly to your subject faculty.
                    </span>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '8px',
                        width: isMobile ? '100%' : 'auto',
                        flexDirection: isMobile ? 'column' : 'row',
                        flexWrap: 'wrap',
                        flexShrink: 0,
                    }}
                >
                    <Button
                        size={isMobile ? 'middle' : 'small'}
                        block={isMobile}
                        icon={<TeamOutlined />}
                        onClick={handleGoToTeachers}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        Faculty Directory
                    </Button>
                    <Button
                        size={isMobile ? 'middle' : 'small'}
                        block={isMobile}
                        type="primary"
                        icon={<MessageOutlined />}
                        onClick={handleGoToChat}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            background: '#2563eb',
                        }}
                    >
                        Student Chat
                    </Button>
                </div>
            </div>

            {/* 6. DOCUMENT PREVIEW MODAL */}
            <Modal
                title={
                    previewingNote && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {getFileMeta(previewingNote.file_name, previewingNote.file_type).smallIcon}
                            <span
                                style={{
                                    fontWeight: 700,
                                    fontSize: '15px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '70vw',
                                }}
                            >
                                {previewingNote.file_name}
                            </span>
                        </div>
                    )
                }
                open={!!previewingNote}
                onCancel={() => setPreviewingNote(null)}
                width="88vw"
                style={{ top: 20 }}
                styles={{
                    body: {
                        height: '76vh',
                        padding: 0,
                        overflow: 'hidden',
                        background: '#f1f5f9',
                    },
                }}
                footer={[
                    <Button
                        key="chat"
                        icon={<MessageOutlined />}
                        onClick={() => {
                            setPreviewingNote(null);
                            handleGoToChat();
                        }}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        Ask Question
                    </Button>,
                    <Button
                        key="download"
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => previewingNote && handleDownloadFile(previewingNote)}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            background: '#0284c7',
                            borderColor: '#0284c7',
                        }}
                    >
                        Download File
                    </Button>,
                    <Button
                        key="close"
                        onClick={() => setPreviewingNote(null)}
                        style={{ borderRadius: '8px', fontWeight: 600 }}
                    >
                        Close
                    </Button>,
                ]}
            >
                {previewingNote && (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                        {/* Preview Top Meta Strip */}
                        <div
                            style={{
                                background: '#ffffff',
                                borderBottom: '1px solid #e2e8f0',
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '8px',
                            }}
                        >
                            <Space size={8} wrap>
                                <Tag color="blue" style={{ fontWeight: 700, borderRadius: '6px' }}>
                                    {previewingNote.subject}
                                </Tag>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    Uploaded by: <strong>{previewingNote.teacher_name || 'Faculty Member'}</strong>
                                </span>
                                <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
                                <span style={{ fontSize: '12px', color: '#64748b' }}>
                                    {dayjs(previewingNote.created_at).format('MMM D, YYYY h:mm A')}
                                </span>
                            </Space>

                            <a
                                href={previewingNote.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '12px', fontWeight: 600, color: '#2563eb' }}
                            >
                                Open in New Tab ↗
                            </a>
                        </div>

                        {/* Document Content View */}
                        <div style={{ flex: 1, height: '100%', position: 'relative' }}>
                            {/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewingNote.file_name) ? (
                                <div
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '20px',
                                        overflow: 'auto',
                                    }}
                                >
                                    <img
                                        src={previewingNote.file_url}
                                        alt={previewingNote.file_name}
                                        style={{
                                            maxWidth: '100%',
                                            maxHeight: '100%',
                                            objectFit: 'contain',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                        }}
                                    />
                                </div>
                            ) : (
                                <object
                                    data={previewingNote.file_url}
                                    type={previewingNote.file_type || 'application/pdf'}
                                    width="100%"
                                    height="100%"
                                    aria-label={previewingNote.file_name}
                                >
                                    <div
                                        style={{
                                            padding: '40px 20px',
                                            textAlign: 'center',
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <FileOutlined style={{ fontSize: '48px', color: '#94a3b8', marginBottom: '16px' }} />
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#0f172a' }}>
                                            Document Preview Not Available In-Browser
                                        </h4>
                                        <Text type="secondary" style={{ maxWidth: '420px', marginBottom: '20px' }}>
                                            This file type cannot be previewed directly inside the frame. Please download the document
                                            to view it with your default system application.
                                        </Text>
                                        <Button
                                            type="primary"
                                            icon={<CloudDownloadOutlined />}
                                            onClick={() => handleDownloadFile(previewingNote)}
                                            style={{
                                                borderRadius: '8px',
                                                background: '#2563eb',
                                                fontWeight: 600,
                                            }}
                                        >
                                            Download {previewingNote.file_name}
                                        </Button>
                                    </div>
                                </object>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentMyNotes;
