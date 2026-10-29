import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Table,
    Typography,
    Spin,
    Alert,
    Empty,
    Tag,
    Avatar,
    Badge,
    Button,
    Input,
    Select,
    Modal,
    Row,
    Col,
    Space,
    Tooltip,
    Segmented,
    Grid,
    Divider,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    UserOutlined,
    CrownFilled,
    MailOutlined,
    PhoneOutlined,
    MessageOutlined,
    SearchOutlined,
    BookOutlined,
    AppstoreOutlined,
    UnorderedListOutlined,
    ReadOutlined,
    TeamOutlined,
    IdcardOutlined,
    SafetyCertificateOutlined,
    EyeOutlined,
    CheckCircleFilled,
    ScheduleOutlined,
    EnvironmentOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchStudentDashboardDataRequest,
    fetchStudentDashboardDataSuccess,
} from '../../store/features/student-dashboard/studentDashboardSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text, Paragraph } = Typography;

export interface AcademicYearOption {
    value: string;
    label: string;
    isCurrent: boolean;
    status?: string;
}

export interface TeacherProfile {
    key: string;
    teacher_id?: string;
    teacher_name: string;
    subjects: string[];
    role: string;
    photo_url?: string | null;
    designation?: string;
    department?: string;
    highest_qualification?: string;
    experience_years?: number | string;
    email?: string;
    mobile_number?: string;
    staff_code?: string;
    status?: string;
}

// Preset color map for subject badges
const SUBJECT_COLORS = [
    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
    { bg: '#f5f3ff', text: '#6d28d9', border: '#ddd6fe' },
    { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' },
    { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
    { bg: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    { bg: '#fefce8', text: '#a16207', border: '#fef08a' },
    { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
];

const getSubjectTagStyle = (index: number) => {
    const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
    return {
        backgroundColor: color.bg,
        color: color.text,
        border: `1px solid ${color.border}`,
        borderRadius: '6px',
        padding: '2px 8px',
        fontSize: '11px',
        fontWeight: 600,
        margin: '2px 4px 2px 0',
    };
};

const StudentMyTeachers: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading, error } = useSelector((state: RootState) => state.studentDashboard);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section and Class allocated for selected academic year
    const [studentClass, setStudentClass] = useState<string | null>(null);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    // Enriched teacher details state from teachers & teacher_documents tables
    const [teachersDbMap, setTeachersDbMap] = useState<Map<string, any>>(new Map());
    const [teacherPhotosMap, setTeacherPhotosMap] = useState<Map<string, string>>(new Map());
    const [loadingDetails, setLoadingDetails] = useState(false);

    // UI View and Filter state
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'class_teacher' | 'subject_teacher'>('all');
    const [selectedTeacherModal, setSelectedTeacherModal] = useState<TeacherProfile | null>(null);

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

                // Ensure user's assigned academic_year is in options
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
                    // Default select the active/current academic year
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

                // Fallback to user admitted_class if class_name not in allocation
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

    // 3. Fetch Dashboard Mappings (Teachers & Subjects) based on SELECTED Academic Year
    useEffect(() => {
        const effectiveClass = studentClass || user?.admitted_class;

        if (user?.organization_key && effectiveClass && section && selectedAcademicYear) {
            dispatch(
                fetchStudentDashboardDataRequest({
                    organizationKey: user.organization_key,
                    className: effectiveClass,
                    sectionName: section,
                    academicYear: selectedAcademicYear,
                })
            );
        } else if (!section && selectedAcademicYear) {
            // If student has no section allocation in this academic year, clear previous mappings
            dispatch(fetchStudentDashboardDataSuccess({ mappings: [], timetable: null }));
        }
    }, [dispatch, user?.organization_key, studentClass, user?.admitted_class, section, selectedAcademicYear]);

    // 4. Fetch Enriched Teacher Info & Photos from Supabase
    useEffect(() => {
        let isMounted = true;
        if (!user?.organization_key) return;

        const fetchEnrichedTeacherInfo = async () => {
            setLoadingDetails(true);
            try {
                // Fetch teachers in organization
                const { data: teachersData } = await supabase
                    .from('teachers')
                    .select(
                        'id, full_name, email, mobile_number, designation, department, highest_qualification, qualification, experience_years, photo_url, staff_code, status'
                    )
                    .eq('organization_key', user.organization_key);

                const dbMap = new Map<string, any>();
                const teacherIds: string[] = [];

                if (teachersData && teachersData.length > 0) {
                    teachersData.forEach((t) => {
                        if (t.full_name) {
                            dbMap.set(t.full_name.trim().toLowerCase(), t);
                        }
                        if (t.id) {
                            teacherIds.push(t.id);
                        }
                    });
                }

                // Fetch passport photos from teacher_documents
                const photoMap = new Map<string, string>();
                if (teacherIds.length > 0) {
                    const { data: docsData } = await supabase
                        .from('teacher_documents')
                        .select('teacher_id, public_url, file_path, doc_type')
                        .eq('organization_key', user.organization_key)
                        .in('teacher_id', teacherIds);

                    if (docsData && docsData.length > 0) {
                        for (const doc of docsData) {
                            if (doc.teacher_id && !photoMap.has(doc.teacher_id)) {
                                if (doc.public_url) {
                                    photoMap.set(doc.teacher_id, doc.public_url);
                                } else if (doc.file_path) {
                                    const { data: pubData } = supabase.storage
                                        .from('teacher-documents')
                                        .getPublicUrl(doc.file_path);
                                    if (pubData?.publicUrl) {
                                        photoMap.set(doc.teacher_id, pubData.publicUrl);
                                    }
                                }
                            }
                        }
                    }
                }

                if (isMounted) {
                    setTeachersDbMap(dbMap);
                    setTeacherPhotosMap(photoMap);
                }
            } catch (err) {
                console.error('Error fetching enriched teacher records:', err);
            } finally {
                if (isMounted) setLoadingDetails(false);
            }
        };

        fetchEnrichedTeacherInfo();
        return () => {
            isMounted = false;
        };
    }, [user?.organization_key]);

    // 5. Combine Mappings with Enriched Teacher Data
    const teacherData: TeacherProfile[] = useMemo(() => {
        if (!mappings || mappings.length === 0) {
            return [];
        }

        const teachersMap = mappings.reduce((acc, m) => {
            if (!m.teacher_name || !m.subject_name) return acc;

            const nameKey = m.teacher_name.trim();
            let teacherEntry = acc.get(nameKey);
            if (!teacherEntry) {
                const normName = nameKey.toLowerCase();
                const dbTeacher = teachersDbMap.get(normName);

                let photo = dbTeacher?.photo_url || null;
                if (dbTeacher?.id && teacherPhotosMap.has(dbTeacher.id)) {
                    photo = teacherPhotosMap.get(dbTeacher.id) || photo;
                }

                teacherEntry = {
                    key: nameKey,
                    teacher_id: dbTeacher?.id,
                    teacher_name: nameKey,
                    subjects: [],
                    role: m.role || 'Subject Teacher',
                    photo_url: photo,
                    designation:
                        dbTeacher?.designation ||
                        (m.role === 'Class Teacher' ? 'Class In-charge' : 'Faculty Member'),
                    department: dbTeacher?.department || 'Academics',
                    highest_qualification:
                        dbTeacher?.highest_qualification || dbTeacher?.qualification || undefined,
                    experience_years: dbTeacher?.experience_years || undefined,
                    email: dbTeacher?.email || undefined,
                    mobile_number: dbTeacher?.mobile_number || undefined,
                    staff_code: dbTeacher?.staff_code || undefined,
                    status: dbTeacher?.status || 'Active',
                };
                acc.set(nameKey, teacherEntry);
            }

            if (!teacherEntry.subjects.includes(m.subject_name)) {
                teacherEntry.subjects.push(m.subject_name);
            }

            if (m.role === 'Class Teacher') {
                teacherEntry.role = 'Class Teacher';
                if (!teacherEntry.designation || teacherEntry.designation === 'Faculty Member') {
                    teacherEntry.designation = 'Class Teacher';
                }
            }

            return acc;
        }, new Map<string, TeacherProfile>());

        // Sort so Class Teacher appears first, then alphabetically
        return Array.from(teachersMap.values()).sort((a, b) => {
            if (a.role === 'Class Teacher' && b.role !== 'Class Teacher') return -1;
            if (a.role !== 'Class Teacher' && b.role === 'Class Teacher') return 1;
            return a.teacher_name.localeCompare(b.teacher_name);
        });
    }, [mappings, teachersDbMap, teacherPhotosMap]);

    // 6. Filtered Teacher Data
    const filteredTeachers = useMemo(() => {
        return teacherData.filter((teacher) => {
            // Role filter
            if (roleFilter === 'class_teacher' && teacher.role !== 'Class Teacher') {
                return false;
            }
            if (roleFilter === 'subject_teacher' && teacher.role === 'Class Teacher') {
                return false;
            }

            // Search filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const matchesName = teacher.teacher_name.toLowerCase().includes(query);
                const matchesSubject = teacher.subjects.some((s) => s.toLowerCase().includes(query));
                const matchesDept = (teacher.department || '').toLowerCase().includes(query);
                const matchesDesig = (teacher.designation || '').toLowerCase().includes(query);
                if (!matchesName && !matchesSubject && !matchesDept && !matchesDesig) {
                    return false;
                }
            }

            return true;
        });
    }, [teacherData, roleFilter, searchQuery]);

    // Stats calculations
    const stats = useMemo(() => {
        const totalTeachers = teacherData.length;
        const classTeacher = teacherData.find((t) => t.role === 'Class Teacher');
        const allSubjects = new Set<string>();
        teacherData.forEach((t) => t.subjects.forEach((s) => allSubjects.add(s)));
        return {
            totalTeachers,
            classTeacherName: classTeacher ? classTeacher.teacher_name : 'Not Assigned',
            totalSubjects: allSubjects.size,
        };
    }, [teacherData]);

    const isPageLoading = loadingAcademicYears && !selectedAcademicYear;
    const isUpdatingYear = loadingSection || loading;
    const effectiveClass = studentClass || user?.admitted_class;

    // Helper: Navigate to Student Chat
    const handleChatClick = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    // Table Column Definitions
    const columns: ColumnsType<TeacherProfile> = [
        {
            title: 'Faculty / Teacher',
            dataIndex: 'teacher_name',
            key: 'teacher_name',
            render: (_: any, record: TeacherProfile) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Avatar
                            size={44}
                            src={record.photo_url}
                            icon={<UserOutlined />}
                            style={{
                                background: record.role === 'Class Teacher' ? '#4f46e5' : '#0284c7',
                                border: record.role === 'Class Teacher' ? '2px solid #f59e0b' : '2px solid #e2e8f0',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                            }}
                        />
                        {record.role === 'Class Teacher' && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -4,
                                    background: '#f59e0b',
                                    color: '#ffffff',
                                    borderRadius: '50%',
                                    width: '18px',
                                    height: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                }}
                            >
                                <CrownFilled />
                            </div>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>
                            {record.teacher_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>
                            {record.designation || 'Subject Teacher'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            width: 140,
            render: (role: string) => {
                const isClassTeacher = role === 'Class Teacher';
                return (
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isClassTeacher
                                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                : '#f1f5f9',
                            color: isClassTeacher ? '#b45309' : '#334155',
                            border: isClassTeacher ? '1px solid #fcd34d' : '1px solid #cbd5e1',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                        }}
                    >
                        {isClassTeacher && <CrownFilled style={{ color: '#d97706', fontSize: '12px' }} />}
                        {role}
                    </span>
                );
            },
        },
        {
            title: 'Subjects Handled',
            dataIndex: 'subjects',
            key: 'subjects',
            render: (subjects: string[]) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {subjects.map((sub, idx) => (
                        <span key={sub} style={getSubjectTagStyle(idx)}>
                            {sub}
                        </span>
                    ))}
                </div>
            ),
        },
        {
            title: 'Department & Qualification',
            key: 'details',
            responsive: ['md'],
            render: (_: any, record: TeacherProfile) => (
                <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                        {record.department || 'Academics'}
                    </div>
                    {record.highest_qualification && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {record.highest_qualification}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Contact',
            key: 'contact',
            responsive: ['lg'],
            render: (_: any, record: TeacherProfile) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {record.email ? (
                        <a
                            href={`mailto:${record.email}`}
                            style={{
                                fontSize: '12px',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <MailOutlined style={{ fontSize: '11px' }} /> {record.email}
                        </a>
                    ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>--</span>
                    )}
                    {record.mobile_number && (
                        <a
                            href={`tel:${record.mobile_number}`}
                            style={{
                                fontSize: '12px',
                                color: '#059669',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <PhoneOutlined style={{ fontSize: '11px' }} /> {record.mobile_number}
                        </a>
                    )}
                </div>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            width: 130,
            render: (_: any, record: TeacherProfile) => (
                <Space size={6}>
                    <Tooltip title="View Profile">
                        <Button
                            type="text"
                            shape="circle"
                            icon={<EyeOutlined style={{ color: '#2563eb' }} />}
                            onClick={() => setSelectedTeacherModal(record)}
                            style={{ background: '#eff6ff' }}
                        />
                    </Tooltip>
                    <Tooltip title="Send Message">
                        <Button
                            type="primary"
                            size="small"
                            icon={<MessageOutlined />}
                            onClick={handleChatClick}
                            style={{
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '11px',
                            }}
                        >
                            Chat
                        </Button>
                    </Tooltip>
                </Space>
            ),
        },
    ];

    if (isPageLoading) {
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
                    Loading faculty directory and academic sessions...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Teachers"
                    description={error}
                    type="error"
                    showIcon
                    style={{ borderRadius: '12px' }}
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
                {/* Decorative background glow circles */}
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
                                <TeamOutlined /> My Faculty Directory
                            </span>

                            {/* DYNAMIC ACADEMIC YEAR DROPDOWN SELECTOR */}
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
                                <CalendarOutlined style={{ color: '#2563eb', fontSize: '13px' }} />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                    Session:
                                </span>
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
                            My Teachers & Mentors 👨‍🏫
                        </h1>

                        <p
                            style={{
                                color: 'rgba(255, 255, 255, 0.92)',
                                fontSize: isMobile ? '12px' : '14px',
                                margin: 0,
                                lineHeight: 1.5,
                            }}
                        >
                            {isUpdatingYear ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                    <Spin size="small" /> Loading teacher allocations for {selectedAcademicYear}...
                                </span>
                            ) : section ? (
                                <>
                                    Assigned subject teachers and mentor faculty for{' '}
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
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Class Teacher:</span>
                                <span
                                    style={{
                                        fontWeight: 800,
                                        fontSize: '12px',
                                        color: '#fef08a',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <CrownFilled style={{ color: '#f59e0b', fontSize: '12px' }} />
                                    {stats.classTeacherName}
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
                <Col xs={12} sm={8} lg={8}>
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
                                    Total Teachers
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalTeachers}
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
                                <TeamOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>

                <Col xs={12} sm={8} lg={8}>
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
                                    Subjects Handled
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
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
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
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

                <Col xs={24} sm={8} lg={8}>
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <CrownFilled style={{ color: '#d97706', fontSize: '13px' }} />
                                    <Text style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
                                        Class Teacher
                                    </Text>
                                </div>
                                <div
                                    style={{
                                        fontSize: 'clamp(14px, 2.5vw, 17px)',
                                        fontWeight: 800,
                                        color: '#78350f',
                                        marginTop: '4px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        maxWidth: '180px',
                                    }}
                                >
                                    {stats.classTeacherName}
                                </div>
                            </div>
                            <Button
                                size="small"
                                type="primary"
                                icon={<MessageOutlined />}
                                onClick={handleChatClick}
                                style={{
                                    borderRadius: '8px',
                                    background: '#d97706',
                                    borderColor: '#d97706',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                }}
                            >
                                Chat
                            </Button>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. CONTROL BAR: SEARCH, ROLE FILTER & VIEW TOGGLE */}
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
                    <Col xs={24} md={10} lg={11}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search by teacher name or subject (e.g. Mathematics, English)..."
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

                    <Col xs={24} md={14} lg={13}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                gap: '10px',
                                flexWrap: 'wrap',
                            }}
                        >
                            <Select
                                value={roleFilter}
                                onChange={(val) => setRoleFilter(val)}
                                style={{ width: isMobile ? '100%' : '170px' }}
                                options={[
                                    { value: 'all', label: `All Teachers (${teacherData.length})` },
                                    { value: 'class_teacher', label: 'Class Teacher Only' },
                                    { value: 'subject_teacher', label: 'Subject Teachers' },
                                ]}
                            />

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
                                        label: 'Table',
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

            {/* 4. MAIN CONTENT AREA: CARDS OR TABLE */}
            {isUpdatingYear ? (
                <Card
                    style={{
                        borderRadius: '18px',
                        border: '1px solid #e2e8f0',
                        padding: '48px 24px',
                        textAlign: 'center',
                        background: '#ffffff',
                    }}
                >
                    <Spin size="large" />
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginTop: '14px' }}>
                        Loading faculty details for academic session {selectedAcademicYear}...
                    </div>
                </Card>
            ) : filteredTeachers.length === 0 ? (
                <Card
                    style={{
                        borderRadius: '18px',
                        border: '1px solid #e2e8f0',
                        padding: '48px 24px',
                        textAlign: 'center',
                        background: '#ffffff',
                    }}
                >
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <div
                                    style={{
                                        fontSize: '15px',
                                        fontWeight: 700,
                                        color: '#334155',
                                        marginBottom: '4px',
                                    }}
                                >
                                    No teachers found
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                    {searchQuery
                                        ? `No faculty matching "${searchQuery}". Try clearing search keywords.`
                                        : section
                                        ? `No teacher assignments found for Class ${effectiveClass} - Section ${section} in session ${selectedAcademicYear}.`
                                        : `No class section allocation found for session ${selectedAcademicYear}.`}
                                </div>
                            </div>
                        }
                    >
                        {searchQuery && (
                            <Button type="default" onClick={() => setSearchQuery('')} style={{ borderRadius: '8px' }}>
                                Clear Search
                            </Button>
                        )}
                    </Empty>
                </Card>
            ) : viewMode === 'grid' ? (
                /* GRID VIEW */
                <Row gutter={[18, 18]}>
                    {filteredTeachers.map((teacher, index) => {
                        const isClassTeacher = teacher.role === 'Class Teacher';
                        return (
                            <Col xs={24} sm={12} lg={8} xl={6} key={teacher.key}>
                                <div
                                    style={{
                                        background: '#ffffff',
                                        borderRadius: '18px',
                                        border: isClassTeacher ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                                        boxShadow: isClassTeacher
                                            ? '0 8px 22px rgba(245, 158, 11, 0.15)'
                                            : '0 4px 16px rgba(0, 0, 0, 0.04)',
                                        overflow: 'hidden',
                                        transition: 'all 0.25s ease',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        height: '100%',
                                        position: 'relative',
                                    }}
                                >
                                    {/* Top decorative gradient bar */}
                                    <div
                                        style={{
                                            height: '75px',
                                            background: isClassTeacher
                                                ? 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)'
                                                : index % 3 === 0
                                                ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
                                                : index % 3 === 1
                                                ? 'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)'
                                                : 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
                                            position: 'relative',
                                            padding: '10px 14px',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start',
                                        }}
                                    >
                                        {/* Class Teacher Badge */}
                                        {isClassTeacher ? (
                                            <span
                                                style={{
                                                    background: '#ffffff',
                                                    color: '#b45309',
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                }}
                                            >
                                                <CrownFilled style={{ color: '#d97706' }} /> Class Teacher
                                            </span>
                                        ) : (
                                            <span
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.22)',
                                                    backdropFilter: 'blur(6px)',
                                                    WebkitBackdropFilter: 'blur(6px)',
                                                    color: '#ffffff',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Faculty
                                            </span>
                                        )}

                                        {teacher.department && (
                                            <span
                                                style={{
                                                    background: 'rgba(0, 0, 0, 0.2)',
                                                    color: '#ffffff',
                                                    padding: '2px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '10px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {teacher.department}
                                            </span>
                                        )}
                                    </div>

                                    {/* Card Body */}
                                    <div
                                        style={{
                                            padding: '0 16px 16px 16px',
                                            marginTop: '-36px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            flex: 1,
                                        }}
                                    >
                                        {/* Avatar & Status */}
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'flex-end',
                                                justifyContent: 'space-between',
                                                marginBottom: '10px',
                                            }}
                                        >
                                            <div style={{ position: 'relative' }}>
                                                <Avatar
                                                    size={70}
                                                    src={teacher.photo_url}
                                                    icon={<UserOutlined style={{ fontSize: '32px' }} />}
                                                    style={{
                                                        background: isClassTeacher ? '#d97706' : '#2563eb',
                                                        border: '3px solid #ffffff',
                                                        boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                                                    }}
                                                />
                                                {isClassTeacher && (
                                                    <div
                                                        style={{
                                                            position: 'absolute',
                                                            bottom: 0,
                                                            right: -2,
                                                            background: '#f59e0b',
                                                            color: '#ffffff',
                                                            borderRadius: '50%',
                                                            width: '22px',
                                                            height: '22px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            border: '2px solid #ffffff',
                                                        }}
                                                    >
                                                        <CrownFilled />
                                                    </div>
                                                )}
                                            </div>

                                            {teacher.staff_code && (
                                                <span
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: '#64748b',
                                                        background: '#f1f5f9',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                    }}
                                                >
                                                    ID: {teacher.staff_code}
                                                </span>
                                            )}
                                        </div>

                                        {/* Teacher Name & Designation */}
                                        <div style={{ marginBottom: '12px' }}>
                                            <div
                                                style={{
                                                    fontSize: '16px',
                                                    fontWeight: 800,
                                                    color: '#0f172a',
                                                    lineHeight: 1.3,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                }}
                                            >
                                                {teacher.teacher_name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                {teacher.designation || 'Subject Faculty'}
                                            </div>
                                        </div>

                                        {/* Subjects Handled */}
                                        <div style={{ marginBottom: '14px', flex: 1 }}>
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: '#475569',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.4px',
                                                    marginBottom: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                <BookOutlined style={{ color: '#3b82f6' }} /> Handled Subjects
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {teacher.subjects.map((sub, sIdx) => (
                                                    <span key={sub} style={getSubjectTagStyle(sIdx)}>
                                                        {sub}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Quick Contact & Details Divider */}
                                        <div
                                            style={{
                                                paddingTop: '10px',
                                                borderTop: '1px solid #f1f5f9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                gap: '6px',
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {teacher.email && (
                                                    <Tooltip title={`Email: ${teacher.email}`}>
                                                        <a
                                                            href={`mailto:${teacher.email}`}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '8px',
                                                                background: '#eff6ff',
                                                                color: '#2563eb',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                            }}
                                                        >
                                                            <MailOutlined />
                                                        </a>
                                                    </Tooltip>
                                                )}
                                                {teacher.mobile_number && (
                                                    <Tooltip title={`Phone: ${teacher.mobile_number}`}>
                                                        <a
                                                            href={`tel:${teacher.mobile_number}`}
                                                            style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '8px',
                                                                background: '#ecfdf5',
                                                                color: '#059669',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                            }}
                                                        >
                                                            <PhoneOutlined />
                                                        </a>
                                                    </Tooltip>
                                                )}
                                                <Tooltip title="View Profile Information">
                                                    <Button
                                                        type="text"
                                                        shape="circle"
                                                        size="small"
                                                        icon={<EyeOutlined style={{ color: '#475569' }} />}
                                                        onClick={() => setSelectedTeacherModal(teacher)}
                                                        style={{ background: '#f8fafc' }}
                                                    />
                                                </Tooltip>
                                            </div>

                                            <Button
                                                type="primary"
                                                size="small"
                                                icon={<MessageOutlined />}
                                                onClick={handleChatClick}
                                                style={{
                                                    borderRadius: '8px',
                                                    background: isClassTeacher
                                                        ? 'linear-gradient(135deg, #d97706 0%, #b45309 100%)'
                                                        : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                                    border: 'none',
                                                    fontWeight: 600,
                                                    fontSize: '11px',
                                                    padding: '0 12px',
                                                }}
                                            >
                                                Message
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            ) : (
                /* TABLE VIEW */
                <Card
                    style={{
                        borderRadius: '18px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                        background: '#ffffff',
                        overflow: 'hidden',
                    }}
                    bodyStyle={{ padding: 0 }}
                >
                    <Table
                        columns={columns}
                        dataSource={filteredTeachers}
                        rowKey="key"
                        pagination={{ pageSize: 8, showSizeChanger: true }}
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
            )}

            {/* 5. TEACHER PROFILE DETAIL MODAL */}
            <Modal
                open={!!selectedTeacherModal}
                onCancel={() => setSelectedTeacherModal(null)}
                footer={null}
                width={520}
                centered
                destroyOnClose
                bodyStyle={{ padding: 0, borderRadius: '20px', overflow: 'hidden' }}
            >
                {selectedTeacherModal && (
                    <div>
                        {/* Modal Header */}
                        <div
                            style={{
                                background:
                                    selectedTeacherModal.role === 'Class Teacher'
                                        ? 'linear-gradient(135deg, #b45309 0%, #d97706 50%, #f59e0b 100%)'
                                        : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
                                padding: '24px 24px 16px 24px',
                                color: '#ffffff',
                                textAlign: 'center',
                                position: 'relative',
                            }}
                        >
                            <Avatar
                                size={80}
                                src={selectedTeacherModal.photo_url}
                                icon={<UserOutlined style={{ fontSize: '38px' }} />}
                                style={{
                                    border: '3px solid #ffffff',
                                    boxShadow: '0 8px 18px rgba(0,0,0,0.2)',
                                    background:
                                        selectedTeacherModal.role === 'Class Teacher' ? '#f59e0b' : '#3b82f6',
                                    marginBottom: '10px',
                                }}
                            />
                            <div style={{ fontSize: '20px', fontWeight: 800 }}>
                                {selectedTeacherModal.teacher_name}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.9 }}>
                                {selectedTeacherModal.designation || 'Faculty Member'}
                            </div>

                            {selectedTeacherModal.role === 'Class Teacher' && (
                                <div style={{ marginTop: '8px' }}>
                                    <span
                                        style={{
                                            background: '#ffffff',
                                            color: '#b45309',
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <CrownFilled style={{ color: '#d97706' }} /> Class Teacher of Grade{' '}
                                        {effectiveClass} - {section}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Modal Body Details */}
                        <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <div
                                        style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#64748b',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Subjects Assigned To Your Class
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                        {selectedTeacherModal.subjects.map((sub, sIdx) => (
                                            <span key={sub} style={getSubjectTagStyle(sIdx)}>
                                                {sub}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <Divider style={{ margin: '8px 0' }} />

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Department</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                            {selectedTeacherModal.department || 'Academics'}
                                        </div>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>Staff ID Code</div>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                            {selectedTeacherModal.staff_code || 'N/A'}
                                        </div>
                                    </div>

                                    {selectedTeacherModal.highest_qualification && (
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Qualification</div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                                {selectedTeacherModal.highest_qualification}
                                            </div>
                                        </div>
                                    )}

                                    {selectedTeacherModal.experience_years && (
                                        <div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>Experience</div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                                {selectedTeacherModal.experience_years} Years
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {(selectedTeacherModal.email || selectedTeacherModal.mobile_number) && (
                                    <>
                                        <Divider style={{ margin: '8px 0' }} />
                                        <div>
                                            <div
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: '#64748b',
                                                    textTransform: 'uppercase',
                                                    marginBottom: '8px',
                                                }}
                                            >
                                                Contact Info
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {selectedTeacherModal.email && (
                                                    <a
                                                        href={`mailto:${selectedTeacherModal.email}`}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            color: '#2563eb',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <MailOutlined /> {selectedTeacherModal.email}
                                                    </a>
                                                )}
                                                {selectedTeacherModal.mobile_number && (
                                                    <a
                                                        href={`tel:${selectedTeacherModal.mobile_number}`}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            color: '#059669',
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        <PhoneOutlined /> {selectedTeacherModal.mobile_number}
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Actions */}
                            <div
                                style={{
                                    marginTop: '22px',
                                    display: 'flex',
                                    gap: '10px',
                                    justifyContent: 'flex-end',
                                }}
                            >
                                <Button onClick={() => setSelectedTeacherModal(null)} style={{ borderRadius: '8px' }}>
                                    Close
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<MessageOutlined />}
                                    onClick={() => {
                                        setSelectedTeacherModal(null);
                                        handleChatClick();
                                    }}
                                    style={{
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                        border: 'none',
                                        fontWeight: 700,
                                    }}
                                >
                                    Message in Student Chat
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentMyTeachers;
