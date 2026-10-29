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
    CalendarOutlined,
    ClockCircleOutlined,
    BookOutlined,
    UserOutlined,
    PrinterOutlined,
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    ScheduleOutlined,
    FilterOutlined,
    ThunderboltOutlined,
    MessageOutlined,
    InfoCircleOutlined,
    CrownFilled,
    CheckCircleFilled,
    ArrowRightOutlined,
    CoffeeOutlined,
    StarFilled,
    TeamOutlined,
    IdcardOutlined,
    ReloadOutlined,
    RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import {
    fetchStudentDashboardDataRequest,
    fetchStudentDashboardDataSuccess,
} from '../../store/features/student-dashboard/studentDashboardSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import type { Day, TimetableEntry } from '../../store/features/class-timetables/classTimetablesSlice';
import { supabase } from '../../service/supabaseClient';

const { Title, Text, Paragraph } = Typography;

export interface AcademicYearOption {
    value: string;
    label: string;
    isCurrent: boolean;
    status?: string;
}

interface TimetableRow {
    key: Day;
    day: Day;
    isToday: boolean;
    periods: (TimetableEntry | null)[];
}

// Subject color mapping presets with harmonious hues
const SUBJECT_COLOR_PALETTES: { [key: string]: { bg: string; border: string; text: string; badge: string; iconBg: string } } = {
    math: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af', badge: '#3b82f6', iconBg: '#dbeafe' },
    science: { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46', badge: '#10b981', iconBg: '#d1fae5' },
    physics: { bg: '#f0fdfa', border: '#99f6e4', text: '#115e59', badge: '#14b8a6', iconBg: '#ccfbf1' },
    chemistry: { bg: '#f5f3ff', border: '#ddd6fe', text: '#5b21b6', badge: '#8b5cf6', iconBg: '#ede9fe' },
    biology: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', badge: '#22c55e', iconBg: '#dcfce7' },
    english: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', badge: '#f97316', iconBg: '#ffedd5' },
    social: { bg: '#fff1f2', border: '#fecdd3', text: '#9f1239', badge: '#f43f5e', iconBg: '#ffe4e6' },
    history: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', badge: '#ef4444', iconBg: '#fee2e2' },
    geography: { bg: '#ecfeff', border: '#a5f3fc', text: '#155e75', badge: '#06b6d4', iconBg: '#cffafe' },
    computer: { bg: '#f0f9ff', border: '#bae6fd', text: '#075985', badge: '#0284c7', iconBg: '#e0f2fe' },
    language: { bg: '#fdf4ff', border: '#f5d0fe', text: '#86198f', badge: '#d946ef', iconBg: '#fae8ff' },
    pe: { bg: '#f7fee7', border: '#d9f99d', text: '#3f6212', badge: '#84cc16', iconBg: '#ecfccb' },
    sports: { bg: '#f7fee7', border: '#d9f99d', text: '#3f6212', badge: '#84cc16', iconBg: '#ecfccb' },
    art: { bg: '#fdf2f8', border: '#fbcfe8', text: '#9d174d', badge: '#ec4899', iconBg: '#fce7f3' },
    music: { bg: '#fdf2f8', border: '#fbcfe8', text: '#9d174d', badge: '#ec4899', iconBg: '#fce7f3' },
    library: { bg: '#f8fafc', border: '#cbd5e1', text: '#334155', badge: '#64748b', iconBg: '#e2e8f0' },
    extra: { bg: '#fffbeb', border: '#fde68a', text: '#854d0e', badge: '#eab308', iconBg: '#fef3c7' },
    default: { bg: '#f8fafc', border: '#e2e8f0', text: '#334155', badge: '#64748b', iconBg: '#f1f5f9' },
};

const getSubjectPalette = (subjectName?: string, periodNum?: number) => {
    if (!subjectName) return SUBJECT_COLOR_PALETTES.default;
    if (periodNum === 0 || periodNum === 99) return SUBJECT_COLOR_PALETTES.extra;

    const lower = subjectName.toLowerCase();
    if (lower.includes('math')) return SUBJECT_COLOR_PALETTES.math;
    if (lower.includes('physics')) return SUBJECT_COLOR_PALETTES.physics;
    if (lower.includes('chemistry')) return SUBJECT_COLOR_PALETTES.chemistry;
    if (lower.includes('bio')) return SUBJECT_COLOR_PALETTES.biology;
    if (lower.includes('science')) return SUBJECT_COLOR_PALETTES.science;
    if (lower.includes('eng')) return SUBJECT_COLOR_PALETTES.english;
    if (lower.includes('soc') || lower.includes('civic') || lower.includes('pol')) return SUBJECT_COLOR_PALETTES.social;
    if (lower.includes('hist')) return SUBJECT_COLOR_PALETTES.history;
    if (lower.includes('geo')) return SUBJECT_COLOR_PALETTES.geography;
    if (lower.includes('comp') || lower.includes('it') || lower.includes('code') || lower.includes('tech')) return SUBJECT_COLOR_PALETTES.computer;
    if (lower.includes('pe') || lower.includes('sport') || lower.includes('pt') || lower.includes('yoga') || lower.includes('game')) return SUBJECT_COLOR_PALETTES.pe;
    if (lower.includes('art') || lower.includes('craft') || lower.includes('draw')) return SUBJECT_COLOR_PALETTES.art;
    if (lower.includes('music') || lower.includes('dance')) return SUBJECT_COLOR_PALETTES.music;
    if (lower.includes('lib')) return SUBJECT_COLOR_PALETTES.library;
    if (lower.includes('hindi') || lower.includes('tamil') || lower.includes('french') || lower.includes('sanskrit') || lower.includes('lang') || lower.includes('spanish')) {
        return SUBJECT_COLOR_PALETTES.language;
    }

    return SUBJECT_COLOR_PALETTES.default;
};

const DAYS_OF_WEEK: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Time slots configuration
const DEFAULT_8_SLOTS = [
    { period: 1, time: '09:15 - 10:00', start: '09:15', end: '10:00' },
    { period: 2, time: '10:00 - 10:45', start: '10:00', end: '10:45' },
    { period: 3, time: '11:00 - 11:45', start: '11:00', end: '11:45' },
    { period: 4, time: '11:45 - 12:30', start: '11:45', end: '12:30' },
    { period: 5, time: '01:15 - 02:00', start: '13:15', end: '14:00' },
    { period: 6, time: '02:00 - 02:45', start: '14:00', end: '14:45' },
    { period: 7, time: '03:00 - 03:45', start: '15:00', end: '15:45' },
    { period: 8, time: '03:45 - 04:30', start: '15:45', end: '16:30' },
];

const DEFAULT_4_SLOTS = [
    { period: 1, time: '09:15 - 10:45', start: '09:15', end: '10:45' },
    { period: 2, time: '11:00 - 12:30', start: '11:00', end: '12:30' },
    { period: 3, time: '01:15 - 02:45', start: '13:15', end: '14:45' },
    { period: 4, time: '03:00 - 04:30', start: '15:00', end: '16:30' },
];

const StudentMyTimetable: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetable, mappings, loading, error } = useSelector((state: RootState) => state.studentDashboard);

    // Academic Year state
    const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [loadingAcademicYears, setLoadingAcademicYears] = useState(true);

    // Section and Class allocated for selected academic year
    const [studentClass, setStudentClass] = useState<string | null>(null);
    const [section, setSection] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);

    // UI state
    const [viewMode, setViewMode] = useState<'matrix' | 'cards' | 'compact'>('matrix');
    const [selectedDayTab, setSelectedDayTab] = useState<string>('today');
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [showExtraClasses, setShowExtraClasses] = useState<boolean>(true);
    const [selectedPeriodModal, setSelectedPeriodModal] = useState<{
        entry: TimetableEntry;
        time: string;
        periodLabel: string;
    } | null>(null);

    // Real-time current day & active period calculation
    const [currentTime, setCurrentTime] = useState(dayjs());
    const currentDayOfWeek = currentTime.format('dddd');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(dayjs()), 60000);
        return () => clearInterval(timer);
    }, []);

    // 1. Fetch Academic Years from database
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

    // 3. Fetch Dashboard Timetable & Mappings based on SELECTED Academic Year
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
            dispatch(fetchStudentDashboardDataSuccess({ mappings: [], timetable: null }));
        }
    }, [dispatch, user?.organization_key, studentClass, user?.admitted_class, section, selectedAcademicYear]);

    const effectiveClass = studentClass || user?.admitted_class;
    const isUpdating = loadingSection || loading;

    // Time Slots resolution
    const timeSlots = useMemo(() => {
        if (timetable?.number_of_periods === 4) {
            return DEFAULT_4_SLOTS;
        }
        return DEFAULT_8_SLOTS;
    }, [timetable?.number_of_periods]);

    // Distinct Subjects list for filtering
    const uniqueSubjects = useMemo(() => {
        if (!timetable?.timetable_data) return [];
        const set = new Set<string>();
        timetable.timetable_data.forEach((entry) => {
            if (entry.subject_name) set.add(entry.subject_name.trim());
        });
        return Array.from(set).sort();
    }, [timetable?.timetable_data]);

    // Class Teacher determination from mappings
    const classTeacherName = useMemo(() => {
        const ct = mappings?.find((m) => m.role === 'Class Teacher');
        return ct ? ct.teacher_name : 'Not Assigned';
    }, [mappings]);

    // Total statistics
    const stats = useMemo(() => {
        if (!timetable?.timetable_data) {
            return {
                totalSlots: 0,
                uniqueSubjectsCount: 0,
                todaySlotsCount: 0,
                extraClassesCount: 0,
            };
        }
        const activeEntries = timetable.timetable_data.filter((e) => e.status !== 'Inactive' && e.subject_name);
        const todayEntries = activeEntries.filter((e) => e.day === currentDayOfWeek);
        const extraEntries = activeEntries.filter((e) => e.period === 0 || e.period === 99);

        return {
            totalSlots: activeEntries.length,
            uniqueSubjectsCount: uniqueSubjects.length,
            todaySlotsCount: todayEntries.length,
            extraClassesCount: extraEntries.length,
        };
    }, [timetable?.timetable_data, currentDayOfWeek, uniqueSubjects.length]);

    // Current Ongoing Class calculation
    const currentClassStatus = useMemo(() => {
        if (!timetable?.timetable_data) return null;

        const todayEntries = timetable.timetable_data.filter(
            (e) => e.day === currentDayOfWeek && e.status !== 'Inactive' && e.subject_name
        );
        if (todayEntries.length === 0) return null;

        const currentMinutes = currentTime.hour() * 60 + currentTime.minute();

        // Helper to parse "HH:mm" to minutes
        const toMins = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        };

        // Check Extra morning class
        const morningSlot = { period: 0, start: 8 * 60 + 15, end: 9 * 60 };
        const eveningSlot = { period: 99, start: 16 * 60 + 30, end: 17 * 60 + 15 };

        if (currentMinutes >= morningSlot.start && currentMinutes < morningSlot.end) {
            const entry = todayEntries.find((e) => e.period === 0);
            if (entry) {
                return {
                    isOngoing: true,
                    entry,
                    timeLabel: '08:15 - 09:00',
                    periodLabel: 'Morning Extra Class',
                    minutesRemaining: morningSlot.end - currentMinutes,
                };
            }
        }

        // Check regular slots
        for (const slot of timeSlots) {
            const startM = toMins(slot.start);
            const endM = toMins(slot.end);

            if (currentMinutes >= startM && currentMinutes < endM) {
                const entry = todayEntries.find((e) => e.period === slot.period);
                if (entry) {
                    return {
                        isOngoing: true,
                        entry,
                        timeLabel: slot.time,
                        periodLabel: `Period ${slot.period}`,
                        minutesRemaining: endM - currentMinutes,
                    };
                }
            }
        }

        if (currentMinutes >= eveningSlot.start && currentMinutes < eveningSlot.end) {
            const entry = todayEntries.find((e) => e.period === 99);
            if (entry) {
                return {
                    isOngoing: true,
                    entry,
                    timeLabel: '04:30 - 05:15',
                    periodLabel: 'Evening Extra Class',
                    minutesRemaining: eveningSlot.end - currentMinutes,
                };
            }
        }

        // Check upcoming slot
        for (const slot of timeSlots) {
            const startM = toMins(slot.start);
            if (currentMinutes < startM) {
                const entry = todayEntries.find((e) => e.period === slot.period);
                if (entry) {
                    return {
                        isOngoing: false,
                        entry,
                        timeLabel: slot.time,
                        periodLabel: `Period ${slot.period}`,
                        minutesRemaining: startM - currentMinutes,
                    };
                }
            }
        }

        return null;
    }, [timetable?.timetable_data, currentDayOfWeek, currentTime, timeSlots]);

    // Table Data for Matrix View
    const tableData: TimetableRow[] = useMemo(() => {
        if (!timetable?.timetable_data) return [];

        return DAYS_OF_WEEK.map((day) => {
            const isToday = day === currentDayOfWeek;
            const dayEntries = timetable.timetable_data.filter((e) => e.day === day);

            // Construct full periods array
            const periods = Array.from({ length: timeSlots.length + 2 }, (_, i) => {
                const periodNum = i === 0 ? 0 : i === timeSlots.length + 1 ? 99 : timeSlots[i - 1]?.period;
                return dayEntries.find((e) => e.period === periodNum) || null;
            });

            return {
                key: day,
                day,
                isToday,
                periods,
            };
        });
    }, [timetable?.timetable_data, currentDayOfWeek, timeSlots]);

    // Filter check helper
    const matchesFilter = (entry: TimetableEntry | null) => {
        if (!entry || !entry.subject_name) return false;

        if (subjectFilter !== 'all' && entry.subject_name.toLowerCase() !== subjectFilter.toLowerCase()) {
            return false;
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchSubject = entry.subject_name.toLowerCase().includes(q);
            const matchTeacher = (entry.teacher_name || '').toLowerCase().includes(q);
            if (!matchSubject && !matchTeacher) return false;
        }

        return true;
    };

    // Render interactive period cell in matrix
    const renderCell = (entry: TimetableEntry | null, timeLabel: string, periodLabel: string) => {
        if (!entry || !entry.subject_name) {
            return (
                <div
                    style={{
                        height: '100%',
                        minHeight: '68px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#cbd5e1',
                        fontSize: '13px',
                        userSelect: 'none',
                    }}
                >
                    —
                </div>
            );
        }

        const isMatch = matchesFilter(entry);
        const palette = getSubjectPalette(entry.subject_name, entry.period);
        const isCurrentlyActive =
            currentClassStatus?.isOngoing &&
            currentClassStatus.entry.day === entry.day &&
            currentClassStatus.entry.period === entry.period;

        return (
            <div
                onClick={() => setSelectedPeriodModal({ entry, time: timeLabel, periodLabel })}
                style={{
                    lineHeight: '1.35',
                    textAlign: 'center',
                    padding: '8px 6px',
                    borderRadius: '10px',
                    background: palette.bg,
                    border: `1px solid ${isCurrentlyActive ? '#10b981' : palette.border}`,
                    boxShadow: isCurrentlyActive
                        ? '0 0 0 2px #10b981, 0 4px 10px rgba(16, 185, 129, 0.2)'
                        : '0 2px 5px rgba(0,0,0,0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: searchQuery.trim() || subjectFilter !== 'all' ? (isMatch ? 1 : 0.28) : 1,
                    position: 'relative',
                    height: '100%',
                    minHeight: '68px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    boxSizing: 'border-box',
                }}
            >
                {isCurrentlyActive && (
                    <div
                        style={{
                            position: 'absolute',
                            top: '-6px',
                            right: '6px',
                            background: '#10b981',
                            color: '#ffffff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '10px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                        }}
                    >
                        ● LIVE
                    </div>
                )}

                <div
                    style={{
                        fontWeight: 700,
                        fontSize: '13px',
                        color: palette.text,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {entry.subject_name}
                </div>

                <div
                    style={{
                        fontSize: '11px',
                        color: '#64748b',
                        marginTop: '3px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '3px',
                    }}
                >
                    <UserOutlined style={{ fontSize: '10px' }} />
                    {entry.teacher_name || 'Faculty'}
                </div>
            </div>
        );
    };

    // Columns Definition for Table Matrix
    const columns: ColumnsType<TimetableRow> = useMemo(() => {
        const cols: ColumnsType<TimetableRow> = [
            {
                title: 'Day',
                dataIndex: 'day',
                key: 'day',
                width: 120,
                fixed: 'left',
                render: (day: string, record: TimetableRow) => (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            padding: '4px 0',
                        }}
                    >
                        <span
                            style={{
                                fontWeight: 800,
                                fontSize: '13px',
                                color: record.isToday ? '#2563eb' : '#1e293b',
                            }}
                        >
                            {day}
                        </span>
                        {record.isToday && (
                            <span
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: '#dbeafe',
                                    color: '#1d4ed8',
                                    borderRadius: '12px',
                                    padding: '1px 8px',
                                    marginTop: '4px',
                                }}
                            >
                                Today
                            </span>
                        )}
                    </div>
                ),
            },
        ];

        // Morning Extra Class Column
        if (showExtraClasses) {
            cols.push({
                title: () => (
                    <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#b45309' }}>Morning Extra</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>08:15 - 09:00</div>
                    </div>
                ),
                key: 'period-0',
                width: 155,
                render: (_: any, record: TimetableRow) =>
                    renderCell(record.periods.find((p) => p?.period === 0) || null, '08:15 - 09:00', 'Morning Extra'),
            });
        }

        // Regular Period Columns with Break Indicators
        timeSlots.forEach((slot, index) => {
            // Add Morning Break indicator column after Period 2
            if (index === 2) {
                cols.push({
                    title: () => (
                        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: 700, fontSize: '11px', color: '#475569' }}>
                                <CoffeeOutlined /> Recess
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>10:45 - 11:00</div>
                        </div>
                    ),
                    key: 'break-morning',
                    width: 75,
                    render: () => (
                        <div
                            style={{
                                textAlign: 'center',
                                color: '#94a3b8',
                                fontSize: '10px',
                                fontWeight: 600,
                                background: '#f8fafc',
                                height: '100%',
                                minHeight: '68px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                            }}
                        >
                            Break
                        </div>
                    ),
                });
            }

            // Add Lunch Break indicator column after Period 4
            if (index === 4) {
                cols.push({
                    title: () => (
                        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: 700, fontSize: '11px', color: '#d97706' }}>🍱 Lunch</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>12:30 - 01:15</div>
                        </div>
                    ),
                    key: 'break-lunch',
                    width: 80,
                    render: () => (
                        <div
                            style={{
                                textAlign: 'center',
                                color: '#b45309',
                                fontSize: '10px',
                                fontWeight: 700,
                                background: '#fffbeb',
                                height: '100%',
                                minHeight: '68px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                            }}
                        >
                            Lunch
                        </div>
                    ),
                });
            }

            // Add Afternoon Break indicator column after Period 6
            if (index === 6) {
                cols.push({
                    title: () => (
                        <div style={{ textAlign: 'center', lineHeight: '1.2' }}>
                            <div style={{ fontWeight: 700, fontSize: '11px', color: '#475569' }}>
                                <CoffeeOutlined /> Interval
                            </div>
                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>02:45 - 03:00</div>
                        </div>
                    ),
                    key: 'break-afternoon',
                    width: 75,
                    render: () => (
                        <div
                            style={{
                                textAlign: 'center',
                                color: '#94a3b8',
                                fontSize: '10px',
                                fontWeight: 600,
                                background: '#f8fafc',
                                height: '100%',
                                minHeight: '68px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                            }}
                        >
                            Break
                        </div>
                    ),
                });
            }

            // Regular period
            cols.push({
                title: () => (
                    <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{`Period ${slot.period}`}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{slot.time}</div>
                    </div>
                ),
                key: `period-${slot.period}`,
                width: 155,
                render: (_: any, record: TimetableRow) =>
                    renderCell(
                        record.periods.find((p) => p?.period === slot.period) || null,
                        slot.time,
                        `Period ${slot.period}`
                    ),
            });
        });

        // Evening Extra Class Column
        if (showExtraClasses) {
            cols.push({
                title: () => (
                    <div style={{ textAlign: 'center', lineHeight: '1.3' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#b45309' }}>Evening Extra</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>04:30 - 05:15</div>
                    </div>
                ),
                key: 'period-99',
                width: 155,
                render: (_: any, record: TimetableRow) =>
                    renderCell(record.periods.find((p) => p?.period === 99) || null, '04:30 - 05:15', 'Evening Extra'),
            });
        }

        return cols;
    }, [showExtraClasses, timeSlots, searchQuery, subjectFilter, currentClassStatus]);

    // Active Day for Card / Timeline View
    const effectiveDayForCards = useMemo(() => {
        if (selectedDayTab === 'today') {
            return DAYS_OF_WEEK.includes(currentDayOfWeek as Day) ? (currentDayOfWeek as Day) : 'Monday';
        }
        return selectedDayTab as Day;
    }, [selectedDayTab, currentDayOfWeek]);

    // Day Periods for Card / Timeline View
    const dayTimelineSlots = useMemo(() => {
        if (!timetable?.timetable_data) return [];

        const dayEntries = timetable.timetable_data.filter((e) => e.day === effectiveDayForCards);

        // Compose timeline items
        const items: {
            periodNum: number;
            periodLabel: string;
            timeLabel: string;
            entry: TimetableEntry | null;
            isBreak?: boolean;
            breakLabel?: string;
        }[] = [];

        // Morning Extra
        if (showExtraClasses) {
            const morningEntry = dayEntries.find((e) => e.period === 0) || null;
            if (morningEntry && morningEntry.subject_name) {
                items.push({
                    periodNum: 0,
                    periodLabel: 'Morning Extra Class',
                    timeLabel: '08:15 - 09:00',
                    entry: morningEntry,
                });
            }
        }

        // Regular periods and breaks
        timeSlots.forEach((slot, idx) => {
            if (idx === 2) {
                items.push({
                    periodNum: -1,
                    periodLabel: 'Morning Break',
                    timeLabel: '10:45 - 11:00',
                    entry: null,
                    isBreak: true,
                    breakLabel: 'Morning Recess (15 mins)',
                });
            }
            if (idx === 4) {
                items.push({
                    periodNum: -2,
                    periodLabel: 'Lunch Break',
                    timeLabel: '12:30 - 01:15',
                    entry: null,
                    isBreak: true,
                    breakLabel: 'Lunch & Relaxation Break (45 mins)',
                });
            }
            if (idx === 6) {
                items.push({
                    periodNum: -3,
                    periodLabel: 'Afternoon Break',
                    timeLabel: '02:45 - 03:00',
                    entry: null,
                    isBreak: true,
                    breakLabel: 'Short Recess (15 mins)',
                });
            }

            const regEntry = dayEntries.find((e) => e.period === slot.period) || null;
            items.push({
                periodNum: slot.period,
                periodLabel: `Period ${slot.period}`,
                timeLabel: slot.time,
                entry: regEntry,
            });
        });

        // Evening Extra
        if (showExtraClasses) {
            const eveningEntry = dayEntries.find((e) => e.period === 99) || null;
            if (eveningEntry && eveningEntry.subject_name) {
                items.push({
                    periodNum: 99,
                    periodLabel: 'Evening Extra Class',
                    timeLabel: '04:30 - 05:15',
                    entry: eveningEntry,
                });
            }
        }

        return items;
    }, [timetable?.timetable_data, effectiveDayForCards, showExtraClasses, timeSlots]);

    // Handle Print
    const handlePrintTimetable = () => {
        window.print();
    };

    // Navigation handlers
    const handleGoToChat = () => {
        dispatch(setCurrentPage('studentchat'));
    };

    const handleGoToTeachers = () => {
        dispatch(setCurrentPage('studentmyteachers'));
    };

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
                    Loading your timetable and academic calendar...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: isMobile ? '12px' : '24px' }}>
                <Alert
                    message="Unable to Load Timetable"
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
            {/* Embedded Print Styling */}
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #printable-timetable, #printable-timetable * {
                            visibility: visible;
                        }
                        #printable-timetable {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 10px;
                        }
                        .no-print {
                            display: none !important;
                        }
                    }
                `}
            </style>

            {/* 1. HERO BANNER WITH DYNAMIC SESSION SELECTOR */}
            <div
                className="no-print"
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
                                <CalendarOutlined /> Weekly Class Schedule
                            </span>

                            {/* ACADEMIC YEAR SELECTOR */}
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
                            My Class Timetable 📅
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
                                    <Spin size="small" /> Loading class timetable for {selectedAcademicYear}...
                                </span>
                            ) : section ? (
                                <>
                                    Structured timetable for{' '}
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

                    {/* Class & Session Badge Card */}
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
                                    {classTeacherName}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#cbd5e1' }}>Today's Date:</span>
                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#e0f2fe' }}>
                                    {currentTime.format('ddd, MMM D, YYYY')}
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>
            </div>

            {/* 2. STATS SUMMARY CARDS */}
            <Row gutter={[16, 16]} className="no-print" style={{ marginBottom: '22px' }}>
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
                                    Weekly Periods
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.totalSlots}
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
                                <ScheduleOutlined />
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
                                    Today's Classes
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#059669',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.todaySlotsCount}
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
                                <ClockCircleOutlined />
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
                                    Total Subjects
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#7c3aed',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.uniqueSubjectsCount}
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
                                    Extra Sessions
                                </Text>
                                <div
                                    style={{
                                        fontSize: 'clamp(18px, 3.5vw, 24px)',
                                        fontWeight: 800,
                                        color: '#b45309',
                                        marginTop: '2px',
                                    }}
                                >
                                    {stats.extraClassesCount}
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
                                <ThunderboltOutlined />
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 3. LIVE HAPPENING NOW / UP NEXT BANNER */}
            {currentClassStatus && (
                <Card
                    className="no-print"
                    style={{
                        borderRadius: '16px',
                        marginBottom: '20px',
                        border: currentClassStatus.isOngoing ? '1px solid #86efac' : '1px solid #bfdbfe',
                        background: currentClassStatus.isOngoing
                            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                            : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    }}
                    bodyStyle={{ padding: '14px 20px' }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '12px',
                                    background: currentClassStatus.isOngoing ? '#10b981' : '#2563eb',
                                    color: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                                }}
                            >
                                {currentClassStatus.isOngoing ? <CheckCircleFilled /> : <ClockCircleOutlined />}
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Tag
                                        color={currentClassStatus.isOngoing ? 'success' : 'processing'}
                                        style={{ fontWeight: 800, borderRadius: '6px' }}
                                    >
                                        {currentClassStatus.isOngoing ? '● HAPPENING NOW' : '⏳ UPCOMING NEXT'}
                                    </Tag>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                                        {currentClassStatus.periodLabel} ({currentClassStatus.timeLabel})
                                    </span>
                                </div>
                                <div style={{ marginTop: '2px' }}>
                                    <strong style={{ fontSize: '16px', color: '#0f172a' }}>
                                        {currentClassStatus.entry.subject_name}
                                    </strong>{' '}
                                    <span style={{ color: '#64748b', fontSize: '13px' }}>
                                        with {currentClassStatus.entry.teacher_name || 'Faculty Member'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>
                                {currentClassStatus.isOngoing
                                    ? `${currentClassStatus.minutesRemaining} mins remaining`
                                    : `Starts in ${currentClassStatus.minutesRemaining} mins`}
                            </span>
                            <Button
                                size="small"
                                type="primary"
                                icon={<MessageOutlined />}
                                onClick={handleGoToChat}
                                style={{
                                    borderRadius: '8px',
                                    background: '#2563eb',
                                    fontWeight: 600,
                                }}
                            >
                                Ask Teacher
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* 4. CONTROLS BAR: SEARCH, FILTERS, VIEW SWITCHER & PRINT */}
            <Card
                className="no-print"
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
                    <Col xs={24} md={8} lg={8}>
                        <Input
                            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                            placeholder="Search subject or teacher (e.g. Math, Physics)..."
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

                    <Col xs={24} md={16} lg={16}>
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
                                value={subjectFilter}
                                onChange={(val) => setSubjectFilter(val)}
                                style={{ minWidth: '150px' }}
                                dropdownMatchSelectWidth={false}
                                options={[
                                    { value: 'all', label: 'All Subjects' },
                                    ...uniqueSubjects.map((s) => ({ value: s, label: s })),
                                ]}
                            />

                            {/* Extra classes toggle */}
                            <Button
                                onClick={() => setShowExtraClasses((prev) => !prev)}
                                style={{
                                    borderRadius: '10px',
                                    borderColor: showExtraClasses ? '#fde68a' : '#cbd5e1',
                                    background: showExtraClasses ? '#fffbeb' : '#ffffff',
                                    color: showExtraClasses ? '#b45309' : '#475569',
                                    fontWeight: 600,
                                    fontSize: '12px',
                                }}
                            >
                                <ThunderboltOutlined /> {showExtraClasses ? 'Extra: ON' : 'Extra: OFF'}
                            </Button>

                            {/* View Mode Segmented */}
                            <Segmented
                                value={viewMode}
                                onChange={(val) => setViewMode(val as 'matrix' | 'cards' | 'compact')}
                                options={[
                                    {
                                        value: 'matrix',
                                        icon: <TableOutlined />,
                                        label: 'Week Grid',
                                    },
                                    {
                                        value: 'cards',
                                        icon: <ScheduleOutlined />,
                                        label: 'Day Cards',
                                    },
                                ]}
                                style={{
                                    background: '#f1f5f9',
                                    padding: '3px',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                }}
                            />

                            {/* Print Button */}
                            <Button
                                icon={<PrinterOutlined />}
                                onClick={handlePrintTimetable}
                                style={{
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    borderColor: '#cbd5e1',
                                }}
                            >
                                {!isMobile && 'Print'}
                            </Button>
                        </div>
                    </Col>
                </Row>
            </Card>

            {/* 5. MAIN TIMETABLE CONTENT */}
            {timetable ? (
                <div id="printable-timetable">
                    {/* Printable Header (Visible only when printing) */}
                    <div
                        style={{
                            display: 'none',
                            marginBottom: '16px',
                            borderBottom: '2px solid #0f172a',
                            paddingBottom: '12px',
                        }}
                        className="print-only"
                    >
                        <h2 style={{ margin: 0, fontSize: '20px' }}>School Class Timetable</h2>
                        <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                            Class: Grade {effectiveClass || '--'} - Section {section || '--'} | Session:{' '}
                            {selectedAcademicYear || '--'} | Class Teacher: {classTeacherName}
                        </div>
                    </div>

                    {/* VIEW A: WEEK MATRIX (FULL TABLE GRID) */}
                    {viewMode === 'matrix' && (
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
                            <div style={{ overflowX: 'auto' }}>
                                <Table
                                    columns={columns}
                                    dataSource={tableData}
                                    rowKey="key"
                                    bordered
                                    pagination={false}
                                    scroll={{ x: 'max-content' }}
                                    rowClassName={(record) => (record.isToday ? 'today-highlight-row' : '')}
                                />
                            </div>
                        </Card>
                    )}

                    {/* VIEW B: DAY CARDS / TIMELINE */}
                    {viewMode === 'cards' && (
                        <div>
                            {/* Day Tabs */}
                            <div
                                className="no-print"
                                style={{
                                    display: 'flex',
                                    gap: '8px',
                                    overflowX: 'auto',
                                    paddingBottom: '12px',
                                    marginBottom: '12px',
                                }}
                            >
                                <Button
                                    type={selectedDayTab === 'today' ? 'primary' : 'default'}
                                    onClick={() => setSelectedDayTab('today')}
                                    icon={<StarFilled />}
                                    style={{
                                        borderRadius: '20px',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                    }}
                                >
                                    Today ({currentDayOfWeek})
                                </Button>

                                {DAYS_OF_WEEK.map((d) => {
                                    const isCurrentDay = d === currentDayOfWeek;
                                    const isSelected = selectedDayTab === d;
                                    return (
                                        <Button
                                            key={d}
                                            type={isSelected ? 'primary' : 'default'}
                                            onClick={() => setSelectedDayTab(d)}
                                            style={{
                                                borderRadius: '20px',
                                                fontWeight: 600,
                                                fontSize: '12px',
                                                background: isSelected
                                                    ? undefined
                                                    : isCurrentDay
                                                    ? '#eff6ff'
                                                    : '#ffffff',
                                                borderColor: isSelected
                                                    ? undefined
                                                    : isCurrentDay
                                                    ? '#bfdbfe'
                                                    : '#cbd5e1',
                                                color: isSelected
                                                    ? undefined
                                                    : isCurrentDay
                                                    ? '#1d4ed8'
                                                    : '#334155',
                                            }}
                                        >
                                            {d} {isCurrentDay && '•'}
                                        </Button>
                                    );
                                })}
                            </div>

                            {/* Timeline Cards for the selected day */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {dayTimelineSlots.map((item, idx) => {
                                    if (item.isBreak) {
                                        return (
                                            <div
                                                key={`break-${idx}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    padding: '10px 16px',
                                                    background: '#f8fafc',
                                                    borderRadius: '12px',
                                                    border: '1px dashed #cbd5e1',
                                                    color: '#64748b',
                                                    fontSize: '13px',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                <CoffeeOutlined style={{ color: '#d97706' }} />
                                                <span>{item.breakLabel}</span>
                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                    ({item.timeLabel})
                                                </span>
                                            </div>
                                        );
                                    }

                                    const entry = item.entry;
                                    const isMatch = matchesFilter(entry);
                                    const palette = getSubjectPalette(entry?.subject_name, item.periodNum);
                                    const isCurrentlyActive =
                                        currentClassStatus?.isOngoing &&
                                        effectiveDayForCards === currentDayOfWeek &&
                                        currentClassStatus.entry.period === item.periodNum;

                                    if (!entry || !entry.subject_name) {
                                        return (
                                            <div
                                                key={`empty-${item.periodNum}`}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '12px 18px',
                                                    background: '#ffffff',
                                                    borderRadius: '14px',
                                                    border: '1px solid #e2e8f0',
                                                    opacity: 0.6,
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <Tag style={{ borderRadius: '8px', fontWeight: 700 }}>
                                                        {item.periodLabel}
                                                    </Tag>
                                                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                                                        {item.timeLabel}
                                                    </span>
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                    Free / Self-Study Period
                                                </span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <Card
                                            key={`slot-${item.periodNum}`}
                                            hoverable
                                            onClick={() =>
                                                setSelectedPeriodModal({
                                                    entry,
                                                    time: item.timeLabel,
                                                    periodLabel: item.periodLabel,
                                                })
                                            }
                                            style={{
                                                borderRadius: '16px',
                                                border: isCurrentlyActive
                                                    ? '2px solid #10b981'
                                                    : `1px solid ${palette.border}`,
                                                background: palette.bg,
                                                boxShadow: isCurrentlyActive
                                                    ? '0 6px 20px rgba(16, 185, 129, 0.15)'
                                                    : '0 4px 14px rgba(0,0,0,0.03)',
                                                opacity:
                                                    searchQuery.trim() || subjectFilter !== 'all'
                                                        ? isMatch
                                                            ? 1
                                                            : 0.28
                                                        : 1,
                                                transition: 'all 0.2s ease',
                                            }}
                                            bodyStyle={{ padding: '16px 20px' }}
                                        >
                                            <Row gutter={[16, 16]} align="middle" justify="space-between">
                                                <Col xs={24} sm={14}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        <div
                                                            style={{
                                                                width: '46px',
                                                                height: '46px',
                                                                borderRadius: '14px',
                                                                background: palette.badge,
                                                                color: '#ffffff',
                                                                fontWeight: 800,
                                                                fontSize: '15px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            {item.periodNum === 0
                                                                ? 'EX'
                                                                : item.periodNum === 99
                                                                ? 'EV'
                                                                : `P${item.periodNum}`}
                                                        </div>

                                                        <div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span
                                                                    style={{
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        color: '#64748b',
                                                                    }}
                                                                >
                                                                    {item.periodLabel} • {item.timeLabel}
                                                                </span>
                                                                {isCurrentlyActive && (
                                                                    <Tag
                                                                        color="success"
                                                                        style={{
                                                                            borderRadius: '6px',
                                                                            fontWeight: 800,
                                                                            fontSize: '10px',
                                                                        }}
                                                                    >
                                                                        ● LIVE NOW
                                                                    </Tag>
                                                                )}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    fontSize: '17px',
                                                                    fontWeight: 800,
                                                                    color: palette.text,
                                                                    marginTop: '2px',
                                                                }}
                                                            >
                                                                {entry.subject_name}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    fontSize: '12px',
                                                                    color: '#475569',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '6px',
                                                                    marginTop: '3px',
                                                                }}
                                                            >
                                                                <UserOutlined style={{ color: '#64748b' }} />
                                                                <strong>Teacher:</strong> {entry.teacher_name || 'Faculty Member'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Col>

                                                <Col xs={24} sm={10}>
                                                    <div
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: isMobile ? 'flex-start' : 'flex-end',
                                                            gap: '8px',
                                                        }}
                                                    >
                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            icon={<InfoCircleOutlined />}
                                                            style={{
                                                                color: '#2563eb',
                                                                fontWeight: 600,
                                                                background: '#ffffff',
                                                                borderRadius: '8px',
                                                            }}
                                                        >
                                                            Details
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            icon={<MessageOutlined />}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleGoToChat();
                                                            }}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                                                borderRadius: '8px',
                                                                fontWeight: 600,
                                                                border: 'none',
                                                            }}
                                                        >
                                                            Chat
                                                        </Button>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Bottom Helper Bar */}
                    <div
                        className="no-print"
                        style={{
                            marginTop: '20px',
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
                            <InfoCircleOutlined style={{ color: '#3b82f6', fontSize: '15px', marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                                Click any subject slot to view faculty info, room details, and send queries.
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
                                View My Teachers
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
                </div>
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
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: '0 0 6px 0' }}>
                                    Timetable Not Published Yet
                                </h3>
                                <p style={{ color: '#64748b', fontSize: '13px', maxWidth: '480px', margin: '0 auto 16px auto' }}>
                                    Your weekly class schedule for{' '}
                                    <strong>Class {effectiveClass || '--'} - Section {section || '--'}</strong> in academic
                                    session <strong>{selectedAcademicYear || '--'}</strong> has not been published by the
                                    school administration.
                                </p>
                            </div>
                        }
                    >
                        <Space size={10}>
                            <Button
                                type="primary"
                                icon={<ReloadOutlined />}
                                onClick={() => {
                                    if (user?.organization_key && effectiveClass && section && selectedAcademicYear) {
                                        dispatch(
                                            fetchStudentDashboardDataRequest({
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
                                Refresh
                            </Button>
                            <Button
                                icon={<TeamOutlined />}
                                onClick={handleGoToTeachers}
                                style={{ borderRadius: '8px', fontWeight: 600 }}
                            >
                                Contact Faculty
                            </Button>
                        </Space>
                    </Empty>
                </Card>
            )}

            {/* 6. PERIOD DETAIL MODAL */}
            <Modal
                open={!!selectedPeriodModal}
                onCancel={() => setSelectedPeriodModal(null)}
                footer={null}
                centered
                destroyOnClose
                width={480}
                styles={{
                    content: {
                        borderRadius: '20px',
                        padding: '24px',
                    },
                }}
            >
                {selectedPeriodModal && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
                            <div
                                style={{
                                    width: '52px',
                                    height: '52px',
                                    borderRadius: '16px',
                                    background: getSubjectPalette(
                                        selectedPeriodModal.entry.subject_name,
                                        selectedPeriodModal.entry.period
                                    ).badge,
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                }}
                            >
                                <BookOutlined />
                            </div>

                            <div>
                                <Tag
                                    color="blue"
                                    style={{
                                        borderRadius: '6px',
                                        fontWeight: 700,
                                        fontSize: '11px',
                                        marginBottom: '4px',
                                    }}
                                >
                                    {selectedPeriodModal.periodLabel} • {selectedPeriodModal.entry.day}
                                </Tag>
                                <h3
                                    style={{
                                        margin: 0,
                                        fontSize: '20px',
                                        fontWeight: 800,
                                        color: '#0f172a',
                                    }}
                                >
                                    {selectedPeriodModal.entry.subject_name}
                                </h3>
                            </div>
                        </div>

                        <Divider style={{ margin: '14px 0' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                    <ClockCircleOutlined style={{ marginRight: '6px' }} /> Scheduled Timing:
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    {selectedPeriodModal.time}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                    <UserOutlined style={{ marginRight: '6px' }} /> Teacher In-Charge:
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#2563eb' }}>
                                    {selectedPeriodModal.entry.teacher_name || 'Faculty Member'}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '13px', color: '#64748b' }}>
                                    <IdcardOutlined style={{ marginRight: '6px' }} /> Class & Section:
                                </span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    Grade {effectiveClass || '--'} - Section {section || '--'}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '13px', color: '#64748b' }}>Status:</span>
                                <Tag
                                    color={selectedPeriodModal.entry.status === 'Active' ? 'success' : 'default'}
                                    style={{ margin: 0, borderRadius: '6px', fontWeight: 700 }}
                                >
                                    {selectedPeriodModal.entry.status || 'Active'}
                                </Tag>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '22px' }}>
                            <Button
                                block
                                icon={<TeamOutlined />}
                                onClick={() => {
                                    setSelectedPeriodModal(null);
                                    handleGoToTeachers();
                                }}
                                style={{ borderRadius: '10px', fontWeight: 600 }}
                            >
                                Teacher Info
                            </Button>
                            <Button
                                block
                                type="primary"
                                icon={<MessageOutlined />}
                                onClick={() => {
                                    setSelectedPeriodModal(null);
                                    handleGoToChat();
                                }}
                                style={{
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    border: 'none',
                                }}
                            >
                                Message Teacher
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentMyTimetable;
