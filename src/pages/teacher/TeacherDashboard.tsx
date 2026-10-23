import React, { useEffect, useState, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Row, Col, Dropdown, type MenuProps, Tooltip, Badge, Avatar, Spin, Modal, Tag, Button } from 'antd';
import {
    MenuOutlined,
    SearchOutlined,
    PlusOutlined,
    DownOutlined,
    BellOutlined,
    MessageOutlined,
    QuestionCircleOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    ExportOutlined,
    ArrowRightOutlined,
    CheckCircleFilled,
    ArrowUpOutlined,
    LeftOutlined,
    RightOutlined,
    FileTextOutlined,
    UserOutlined,
    BookOutlined,
    ReadOutlined,
    FormOutlined,
    CheckSquareOutlined,
    TeamOutlined,
    MoreOutlined,
} from '@ant-design/icons';
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip as ChartTooltip,
    Legend,
} from 'chart.js';
import dayjs from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchEventsRequest, type Event } from '../../store/features/events/eventsSlice';
import { fetchCircularsRequest, type Circular } from '../../store/features/circulars/circularsSlice';
import { fetchMainImagesRequest } from '../../store/features/main-images/mainImagesSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';

ChartJS.register(ArcElement, ChartTooltip, Legend);

// Clean vector icons
const Icons = {
    Scholars: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3Z" fill="#4F46E5" />
            <path d="M5 13.18V17.18C5 17.18 7.5 21 12 21C16.5 21 19 17.18 19 17.18V13.18L12 17L5 13.18Z" fill="#4F46E5" />
        </svg>
    ),
    Classes: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 6H2V20C2 21.1 2.9 22 4 22H18V20H4V6ZM20 2H8C6.9 2 6 2.9 6 4V16C6 17.1 6.9 18 8 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H8V4H20V16Z" fill="#059669" />
            <path d="M10 9H18V11H10V9ZM10 12H15V14H10V12ZM10 6H18V8H10V6Z" fill="#059669" />
        </svg>
    ),
    Attendance: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H18V1H16V3H8V1H6V3H5C3.89 3 3.01 3.9 3.01 5L3 19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM10.56 16.47L7.09 13L8.5 11.59L10.56 13.65L15.5 8.71L16.91 10.12L10.56 16.47Z" fill="#0284C7" />
        </svg>
    ),
    Homework: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V4C20 2.9 19.1 2 18 2ZM14 4V9L11.5 7.5L9 9V4H14ZM18 20H6V4H7V11L11.5 8.25L16 11V4H18V20Z" fill="#D97706" />
        </svg>
    ),
    HomeTest: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H14.82C14.4 1.84 13.3 1 12 1C10.7 1 9.6 1.84 9.18 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM12 3C12.55 3 13 3.45 13 4C13 4.55 12.55 5 12 5C11.45 5 11 4.55 11 4C11 3.45 11.45 3 12 3ZM14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" fill="#E11D48" />
        </svg>
    ),
    Template: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM7 7H17V9H7V7ZM7 11H17V13H7V11ZM7 15H13V17H7V15Z" fill="#7C3AED" />
        </svg>
    ),
    Assessment: () => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3H14.82C14.4 1.84 13.3 1 12 1C10.7 1 9.6 1.84 9.18 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM12 3C12.55 3 13 3.45 13 4C13 4.55 12.55 5 12 5C11.45 5 11 4.55 11 4C11 3.45 11.45 3 12 3ZM14 17H7V15H14V17ZM17 13H7V11H17V13ZM17 9H7V7H17V9Z" fill="#E11D48" />
        </svg>
    ),
};

const DEFAULT_TEACHER_BANNER = "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80";

interface AcademicYearOption {
    value: string;
    label: string;
    isCurrent: boolean;
    status?: string;
}

interface ClassTeacherAssignmentData {
    class_name: string;
    section_name: string;
    academic_year: string;
    male_students: number;
    female_students: number;
    total_students: number;
}

interface TodayPeriodItem {
    period: string;
    time: string;
    subject: string;
    className: string;
    room: string;
    status: 'completed' | 'in-progress' | 'upcoming';
    statusLabel: string;
}

interface YearStats {
    totalClasses: number;
    uniqueClassNames: string[];
    subjects: string[];
    classTeacherAssignment: ClassTeacherAssignmentData | null;
    todaySchedule: TodayPeriodItem[];
    activeHomeworkCount: number;
    activeTestCount: number;
    templateCount: number;
    attendancePercentage: number;
    attendancePresentCount: number;
    attendanceTotalCount: number;
    attendanceDateLabel: string;
    attendanceStatus: 'recorded' | 'pending' | 'standby';
    totalAssessments: number;
}

/**
 * Helper to parse an academic year string into start and end Dayjs dates.
 * Supports:
 * - 'MM/YYYY-MM/YYYY' (e.g. '04/2026-04/2027', '05/2025-03/2026')
 * - 'YYYY-YYYY' (e.g. '2026-2027')
 * - 'YYYY' (e.g. '2026')
 */
const getAcademicYearRange = (ayString: string): { startDate: dayjs.Dayjs; endDate: dayjs.Dayjs } | null => {
    if (!ayString) return null;
    const str = ayString.trim();

    // 1. Format: MM/YYYY-MM/YYYY, e.g. 04/2026-04/2027
    const mmMatch = str.match(/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{4})/);
    if (mmMatch) {
        const startM = mmMatch[1].padStart(2, '0');
        const startY = mmMatch[2];
        const endM = mmMatch[3].padStart(2, '0');
        const endY = mmMatch[4];
        return {
            startDate: dayjs(`${startY}-${startM}-01`).startOf('month'),
            endDate: dayjs(`${endY}-${endM}-01`).endOf('month'),
        };
    }

    // 2. Format: YYYY-YYYY, e.g. 2026-2027
    const yyyyMatch = str.match(/(\d{4})\s*-\s*(\d{4})/);
    if (yyyyMatch) {
        const startY = yyyyMatch[1];
        const endY = yyyyMatch[2];
        return {
            startDate: dayjs(`${startY}-01-01`).startOf('day'),
            endDate: dayjs(`${endY}-12-31`).endOf('day'),
        };
    }

    // 3. Format: Single 4-digit year, e.g. 2026
    const singleYearMatch = str.match(/(\d{4})/);
    if (singleYearMatch) {
        const y = singleYearMatch[1];
        return {
            startDate: dayjs(`${y}-01-01`).startOf('year'),
            endDate: dayjs(`${y}-12-31`).endOf('year'),
        };
    }

    return null;
};

/**
 * Computes period status ('completed' | 'in-progress' | 'upcoming') based on current system time.
 */
const getPeriodTimeStatus = (timeRange: string, now: dayjs.Dayjs = dayjs()): {
    status: 'completed' | 'in-progress' | 'upcoming';
    statusLabel: string;
    startMinutes: number;
    endMinutes: number;
} => {
    if (!timeRange || !timeRange.includes('-')) {
        return { status: 'upcoming', statusLabel: 'Upcoming', startMinutes: 0, endMinutes: 0 };
    }

    const parts = timeRange.split('-');
    const rawStart = parts[0].trim();
    const rawEnd = parts[1].trim();

    // End time parsing
    const endMatch = rawEnd.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
    let endMinutes = 0;
    let endMeridiem = 'AM';
    if (endMatch) {
        let endH = parseInt(endMatch[1], 10);
        const endM = parseInt(endMatch[2], 10);
        endMeridiem = endMatch[3] ? endMatch[3].toUpperCase() : (endH >= 8 && endH <= 11 ? 'AM' : 'PM');
        let finalEndH = endH;
        if (endMeridiem === 'PM' && endH < 12) finalEndH += 12;
        if (endMeridiem === 'AM' && endH === 12) finalEndH = 0;
        endMinutes = finalEndH * 60 + endM;
    }

    // Start time parsing
    const startMatch = rawStart.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/i);
    let startMinutes = 0;
    if (startMatch) {
        let startH = parseInt(startMatch[1], 10);
        const startM = parseInt(startMatch[2], 10);
        let startMeridiem = startMatch[3] ? startMatch[3].toUpperCase() : null;
        if (!startMeridiem) {
            if (startH >= 8 && startH <= 11) startMeridiem = 'AM';
            else if (startH === 12) startMeridiem = 'PM';
            else if (startH >= 1 && startH <= 7) startMeridiem = 'PM';
            else startMeridiem = endMeridiem;
        }
        let finalStartH = startH;
        if (startMeridiem === 'PM' && startH < 12) finalStartH += 12;
        if (startMeridiem === 'AM' && startH === 12) finalStartH = 0;
        startMinutes = finalStartH * 60 + startM;
    }

    const currentMinutes = now.hour() * 60 + now.minute();

    if (currentMinutes > endMinutes) {
        return { status: 'completed', statusLabel: 'Completed', startMinutes, endMinutes };
    } else if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
        return { status: 'in-progress', statusLabel: 'Ongoing', startMinutes, endMinutes };
    } else {
        return { status: 'upcoming', statusLabel: 'Upcoming', startMinutes, endMinutes };
    }
};

const TeacherDashboard: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { events, loading: eventsLoading } = useSelector((state: RootState) => state.events);
    const { circulars } = useSelector((state: RootState) => state.circulars);
    const { images: mainImages, loading: imagesLoading } = useSelector((state: RootState) => state.mainImages);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    // Live clock ticker state to dynamically refresh timetable statuses every 30s
    const [currentTime, setCurrentTime] = useState<dayjs.Dayjs>(dayjs());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(dayjs());
        }, 30000);
        return () => clearInterval(timer);
    }, []);

    // Academic Year Options and Selected Year state
    const [academicYearOptions, setAcademicYearOptions] = useState<AcademicYearOption[]>([]);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
    const [dataLoading, setDataLoading] = useState<boolean>(false);

    // Year-specific dynamic stats state
    const [yearStats, setYearStats] = useState<YearStats>({
        totalClasses: 0,
        uniqueClassNames: [],
        subjects: [],
        classTeacherAssignment: null,
        todaySchedule: [],
        activeHomeworkCount: 0,
        activeTestCount: 0,
        templateCount: 0,
        attendancePercentage: 0,
        attendancePresentCount: 0,
        attendanceTotalCount: 0,
        attendanceDateLabel: 'Today',
        attendanceStatus: 'standby',
        totalAssessments: 0,
    });

    // Interactive Calendar state
    const [calendarDate, setCalendarDate] = useState<dayjs.Dayjs>(dayjs());
    const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(dayjs().date());

    // Bulletin Board State & Modals
    const [bulletinTab, setBulletinTab] = useState<'events' | 'circulars'>('events');
    const [previewEvent, setPreviewEvent] = useState<Event | null>(null);
    const [previewCircular, setPreviewCircular] = useState<Circular | null>(null);

    const currentDateFormatted = dayjs().format('dddd, MMMM D, YYYY');

    // 1. Initial Load: Fetch static organizational assets
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchEventsRequest(user.organization_key));
            dispatch(fetchCircularsRequest(user.organization_key));
            dispatch(fetchMainImagesRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            fetchAcademicYears(user.organization_key);
        }
    }, [dispatch, user?.organization_key]);

    // 2. Fetch academic years and default to admin-configured current academic year (is_current: true)
    const fetchAcademicYears = async (orgKey: string) => {
        try {
            const { data, error } = await supabase
                .from('academic_year')
                .select('academic_year, is_current, status')
                .eq('organization_key', orgKey)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('Academic year fetch warning:', error.message);
                return;
            }

            const rawList = data || [];
            const yearMap = new Map<string, AcademicYearOption>();

            rawList.forEach((row: any) => {
                const y = (row.academic_year || '').trim();
                if (y && !yearMap.has(y)) {
                    // Strictly check admin-configured is_current flag
                    const isCur = row.is_current === true || row.is_current === 'true';
                    yearMap.set(y, {
                        value: y,
                        label: y,
                        isCurrent: isCur,
                        status: row.status,
                    });
                }
            });

            const options: AcademicYearOption[] = Array.from(yearMap.values()).sort((a, b) => {
                // Keep the current academic year at the very top, otherwise descending order
                if (a.isCurrent && !b.isCurrent) return -1;
                if (!a.isCurrent && b.isCurrent) return 1;
                return b.value.localeCompare(a.value);
            });

            setAcademicYearOptions(options);

            // Default to the academic year configured by Admin as Current (is_current: true)
            const defaultCurrent = options.find(opt => opt.isCurrent)?.value || options[0]?.value || '';
            if (defaultCurrent) {
                setSelectedAcademicYear(defaultCurrent);
                fetchYearSpecificData(orgKey, user?.full_name || '', defaultCurrent);
            }
        } catch (err) {
            console.error('Failed to load academic years:', err);
        }
    };

    // 3. Dynamically fetch all dashboard metrics for the chosen academic year
    const fetchYearSpecificData = async (orgKey: string, teacherName: string, ay: string) => {
        if (!orgKey || !ay) return;
        setDataLoading(true);

        try {
            // A. Fetch class & subject teacher mappings for this teacher & academic year
            const { data: mappingsData, error: mapErr } = await supabase
                .from('class_subject_teacher_mapping')
                .select('*')
                .eq('organization_key', orgKey)
                .eq('teacher_name', teacherName)
                .eq('academic_year', ay);

            if (mapErr) console.warn('Mappings fetch error:', mapErr.message);
            const currentMappings = mappingsData || [];

            // Compute unique classes
            const uniqueClassNames = Array.from(
                new Set(currentMappings.map(m => `${m.class_name} - ${m.section_name}`))
            );
            const totalClasses = uniqueClassNames.length;

            // Compute unique subjects
            const subjects = Array.from(
                new Set(currentMappings.map(m => m.subject_name).filter(Boolean))
            ) as string[];

            // Check if teacher is assigned as Class Teacher for this academic year
            const classTeacherRow = currentMappings.find(m => m.role === 'Class Teacher');
            let classTeacherAssignment: ClassTeacherAssignmentData | null = null;

            if (classTeacherRow) {
                // Fetch student allocations for this class in this academic year
                const { data: allocationsData } = await supabase
                    .from('class_section_allocations')
                    .select('register_no')
                    .eq('organization_key', orgKey)
                    .eq('class_name', classTeacherRow.class_name)
                    .eq('section_name', classTeacherRow.section_name)
                    .eq('academic_year', ay);

                const allocations = allocationsData || [];
                const regNos = allocations.map(a => a.register_no);

                let maleCount = 0;
                let femaleCount = 0;

                if (regNos.length > 0) {
                    const { data: studentsData } = await supabase
                        .from('students')
                        .select('gender')
                        .in('register_no', regNos)
                        .eq('organization_key', orgKey);

                    (studentsData || []).forEach(s => {
                        if (s.gender === 'Male') maleCount++;
                        else if (s.gender === 'Female') femaleCount++;
                    });
                }

                classTeacherAssignment = {
                    class_name: classTeacherRow.class_name,
                    section_name: classTeacherRow.section_name,
                    academic_year: ay,
                    male_students: maleCount,
                    female_students: femaleCount,
                    total_students: allocations.length,
                };
            }

            // B. Fetch Timetable for this teacher in this academic year
            const { data: timetablesData } = await supabase
                .from('class_timetables')
                .select('*')
                .eq('organization_key', orgKey)
                .eq('academic_year', ay);

            const todayDay = dayjs().format('dddd');
            const teacherTodayPeriods: TodayPeriodItem[] = [];

            (timetablesData || []).forEach(tt => {
                const timeSlots = tt.number_of_periods === 4 ? [
                    { period: 0, time: '08:15 - 09:00 AM' }, { period: 1, time: '09:15 - 10:45 AM' },
                    { period: 2, time: '11:00 - 12:30 PM' }, { period: 3, time: '01:15 - 02:45 PM' },
                    { period: 4, time: '03:00 - 04:30 PM' }, { period: 99, time: '04:30 - 05:15 PM' }
                ] : [
                    { period: 0, time: '08:15 - 09:00 AM' }, { period: 1, time: '09:15 - 10:00 AM' }, 
                    { period: 2, time: '10:00 - 10:45 AM' }, { period: 3, time: '11:00 - 11:45 AM' }, 
                    { period: 4, time: '11:45 - 12:30 PM' }, { period: 5, time: '01:15 - 02:00 PM' },
                    { period: 6, time: '02:00 - 02:45 PM' }, { period: 7, time: '03:00 - 03:45 PM' },
                    { period: 8, time: '03:45 - 04:30 PM' }, { period: 99, time: '04:30 - 05:15 PM' }
                ];
                const timeMap = new Map(timeSlots.map(s => [s.period, s.time]));

                if (Array.isArray(tt.timetable_data)) {
                    tt.timetable_data.forEach((entry: any) => {
                        if (entry.day === todayDay && entry.teacher_name === teacherName) {
                            const periodTime = timeMap.get(entry.period) || '09:00 - 09:45 AM';
                            const liveStatus = getPeriodTimeStatus(periodTime, dayjs());
                            teacherTodayPeriods.push({
                                period: `Period 0${entry.period || 1}`,
                                time: periodTime,
                                subject: entry.subject_name,
                                className: `${tt.class_name} - ${tt.section_name}`,
                                room: `Room ${100 + Number(entry.period || 1)}`,
                                status: liveStatus.status,
                                statusLabel: liveStatus.statusLabel,
                            });
                        }
                    });
                }
            });

            // Sort periods chronologically by their scheduled start time
            teacherTodayPeriods.sort((a, b) => {
                const aTime = getPeriodTimeStatus(a.time).startMinutes;
                const bTime = getPeriodTimeStatus(b.time).startMinutes;
                return aTime - bTime;
            });

            // Fallback periods from teacher mappings if no specific timetable configured yet for today
            if (teacherTodayPeriods.length === 0 && currentMappings.length > 0) {
                currentMappings.slice(0, 4).forEach((m, idx) => {
                    const periodTime = idx === 0 ? '09:00 - 09:45 AM' : idx === 1 ? '09:45 - 10:30 AM' : idx === 2 ? '10:45 - 11:30 AM' : '11:30 - 12:15 PM';
                    const liveStatus = getPeriodTimeStatus(periodTime, dayjs());
                    teacherTodayPeriods.push({
                        period: `Period 0${idx + 1}`,
                        time: periodTime,
                        subject: m.subject_name || 'Subject Class',
                        className: `${m.class_name} - ${m.section_name}`,
                        room: `Room ${200 + idx * 2}`,
                        status: liveStatus.status,
                        statusLabel: liveStatus.statusLabel,
                    });
                });
            }

            // C. Fetch homework count for this academic year
            const { data: hwData } = await supabase
                .from('homework')
                .select('id')
                .eq('organization_key', orgKey)
                .eq('academic_year', ay);

            // D. Fetch home test count for this academic year (table name: home_test)
            const { data: testData } = await supabase
                .from('home_test')
                .select('id')
                .eq('organization_key', orgKey)
                .eq('academic_year', ay);

            // E. Fetch question paper templates count for this academic year
            const { data: templateData } = await supabase
                .from('question_paper_templates')
                .select('id')
                .eq('organization_key', orgKey)
                .eq('academic_year', ay);

            const activeHomeworkCount = (hwData || []).length;
            const activeTestCount = (testData || []).length;
            const templateCount = (templateData || []).length;

            // F. Fetch Student Day Attendance percentage
            const todayDateStr = dayjs().format('YYYY-MM-DD');
            let attBaseQuery = supabase
                .from('student_attendance')
                .select('attendace_status, forenoon_status, date')
                .eq('organization_key', orgKey)
                .eq('academic_year', ay);

            if (classTeacherAssignment) {
                attBaseQuery = attBaseQuery
                    .eq('class', classTeacherAssignment.class_name)
                    .eq('section', classTeacherAssignment.section_name);
            }

            const { data: todayAttRecords } = await attBaseQuery.eq('date', todayDateStr);

            let attendancePresentCount = 0;
            let attendanceTotalCount = 0;
            let attendancePercentage = 0;
            let attendanceDateLabel = 'Today';
            let attendanceStatus: 'recorded' | 'pending' | 'standby' = 'standby';

            if (todayAttRecords && todayAttRecords.length > 0) {
                attendanceTotalCount = todayAttRecords.length;
                attendancePresentCount = todayAttRecords.filter(r => {
                    const st = (r.attendace_status || r.forenoon_status || '').toLowerCase();
                    return st === 'present' || st === 'p';
                }).length;
                attendancePercentage = attendanceTotalCount > 0 ? Math.round((attendancePresentCount / attendanceTotalCount) * 100) : 0;
                attendanceDateLabel = 'Today';
                attendanceStatus = 'recorded';
            } else {
                // If not recorded today, query the latest attendance session in this academic year
                let latestDateQuery = supabase
                    .from('student_attendance')
                    .select('date')
                    .eq('organization_key', orgKey)
                    .eq('academic_year', ay);
                if (classTeacherAssignment) {
                    latestDateQuery = latestDateQuery
                        .eq('class', classTeacherAssignment.class_name)
                        .eq('section', classTeacherAssignment.section_name);
                }
                const { data: latestDateRows } = await latestDateQuery.order('date', { ascending: false }).limit(1);

                if (latestDateRows && latestDateRows.length > 0) {
                    const latestDate = latestDateRows[0].date;
                    attendanceDateLabel = dayjs(latestDate).format('MMM D');

                    let pastQuery = supabase
                        .from('student_attendance')
                        .select('attendace_status, forenoon_status')
                        .eq('organization_key', orgKey)
                        .eq('academic_year', ay)
                        .eq('date', latestDate);
                    if (classTeacherAssignment) {
                        pastQuery = pastQuery
                            .eq('class', classTeacherAssignment.class_name)
                            .eq('section', classTeacherAssignment.section_name);
                    }
                    const { data: pastRecords } = await pastQuery;
                    if (pastRecords && pastRecords.length > 0) {
                        attendanceTotalCount = pastRecords.length;
                        attendancePresentCount = pastRecords.filter(r => {
                            const st = (r.attendace_status || r.forenoon_status || '').toLowerCase();
                            return st === 'present' || st === 'p';
                        }).length;
                        attendancePercentage = attendanceTotalCount > 0 ? Math.round((attendancePresentCount / attendanceTotalCount) * 100) : 0;
                        attendanceStatus = 'recorded';
                    }
                } else if (classTeacherAssignment && classTeacherAssignment.total_students > 0) {
                    attendanceTotalCount = classTeacherAssignment.total_students;
                    attendancePercentage = 0;
                    attendanceStatus = 'pending';
                }
            }

            setYearStats({
                totalClasses,
                uniqueClassNames,
                subjects,
                classTeacherAssignment,
                todaySchedule: teacherTodayPeriods,
                activeHomeworkCount,
                activeTestCount,
                templateCount,
                attendancePercentage,
                attendancePresentCount,
                attendanceTotalCount,
                attendanceDateLabel,
                attendanceStatus,
                totalAssessments: activeHomeworkCount + activeTestCount,
            });
        } catch (err) {
            console.error('Error fetching academic year data:', err);
        } finally {
            setDataLoading(false);
        }
    };

    // Handler when user changes Academic Year from the dropdown
    const handleAcademicYearChange = (newYear: string) => {
        setSelectedAcademicYear(newYear);
        if (user?.organization_key) {
            fetchYearSpecificData(user.organization_key, user?.full_name || '', newYear);
        }
        // Align calendar month view if current date is outside the selected academic year
        const range = getAcademicYearRange(newYear);
        if (range) {
            const now = dayjs();
            if (now.isBefore(range.startDate) || now.isAfter(range.endDate)) {
                setCalendarDate(range.startDate);
                setSelectedCalendarDay(1);
            } else {
                setCalendarDate(now);
                setSelectedCalendarDay(now.date());
            }
        }
    };

    // Derived values from current academic year selection
    const selectedAyObj = academicYearOptions.find(o => o.value === selectedAcademicYear);
    const hasClassAssignment = Boolean(yearStats.classTeacherAssignment);
    const assignedClass = yearStats.classTeacherAssignment?.class_name || 'Not In-Charge';
    const assignedSection = yearStats.classTeacherAssignment?.section_name || '';
    const boysCount = yearStats.classTeacherAssignment?.male_students ?? 0;
    const girlsCount = yearStats.classTeacherAssignment?.female_students ?? 0;
    const totalClassStudents = yearStats.classTeacherAssignment?.total_students ?? 0;
    const boysPercentage = totalClassStudents > 0 ? ((boysCount / totalClassStudents) * 100).toFixed(0) : '0';
    const girlsPercentage = totalClassStudents > 0 ? ((girlsCount / totalClassStudents) * 100).toFixed(0) : '0';

    // Doughnut chart data for Boys vs Girls
    const genderData = useMemo(() => ({
        labels: ['Boys', 'Girls'],
        datasets: [{
            data: totalClassStudents > 0 ? [boysCount, girlsCount] : [1, 1],
            backgroundColor: totalClassStudents > 0 ? ['#2563EB', '#EC4899'] : ['#E2E8F0', '#CBD5E1'],
            hoverBackgroundColor: totalClassStudents > 0 ? ['#1D4ED8', '#DB2777'] : ['#CBD5E1', '#94A3B8'],
            borderWidth: 0,
        }]
    }), [totalClassStudents, boysCount, girlsCount]);

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1E293B',
                padding: 10,
                cornerRadius: 8,
                enabled: totalClassStudents > 0,
            }
        }
    };

    // Quick Actions menu items for teachers
    const quickActionItems: MenuProps['items'] = [
        {
            key: 'take-attendance',
            label: 'Take Daily Class Attendance',
            icon: <CheckSquareOutlined />,
            onClick: () => dispatch(setCurrentPage('createteacherattendance')),
        },
        {
            key: 'assign-homework',
            label: 'Assign Class Homework',
            icon: <FormOutlined />,
            onClick: () => dispatch(setCurrentPage('homework')),
        },
        {
            key: 'schedule-test',
            label: 'Create Home Assessment Test',
            icon: <FileTextOutlined />,
            onClick: () => dispatch(setCurrentPage('hometest')),
        },
        {
            key: 'upload-marks',
            label: 'Upload Unit & Exam Marks',
            icon: <ArrowUpOutlined />,
            onClick: () => dispatch(setCurrentPage('exammarkupload')),
        },
        {
            key: 'question-bank',
            label: 'Question Paper Bank & Generator',
            icon: <BookOutlined />,
            onClick: () => dispatch(setCurrentPage('questionbank')),
        },
        {
            key: 'class-notes',
            label: 'Digital Lesson Notes Repository',
            icon: <ReadOutlined />,
            onClick: () => dispatch(setCurrentPage('classnotes')),
        },
        {
            key: 'my-timetable',
            label: 'View Personal Period Timetable',
            icon: <ClockCircleOutlined />,
            onClick: () => dispatch(setCurrentPage('personaltimetable')),
        },
        {
            key: 'my-students',
            label: 'My Students Academic Directory',
            icon: <TeamOutlined />,
            onClick: () => dispatch(setCurrentPage('mystudents')),
        },
    ];

    // Banner image
    const bannerImage = mainImages.length > 0 ? mainImages[0].image_url : DEFAULT_TEACHER_BANNER;
    const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School in Sithanur, Salem';
    const affiliationNumber = 'TN-MAT-882190';

    // Academic Year Date Range
    const currentAcademicYearRange = useMemo(() => {
        return getAcademicYearRange(selectedAcademicYear);
    }, [selectedAcademicYear]);

    // Events strictly filtered by selected academic year
    const yearFilteredEvents = useMemo(() => {
        if (!events || events.length === 0) return [];
        if (!currentAcademicYearRange) return events;
        return events.filter(e => {
            if (!e.event_date) return false;
            const d = dayjs(e.event_date);
            if (!d.isValid()) return false;
            return !d.isBefore(currentAcademicYearRange.startDate) && !d.isAfter(currentAcademicYearRange.endDate);
        });
    }, [events, currentAcademicYearRange]);

    // Circulars strictly filtered by selected academic year
    const yearFilteredCirculars = useMemo(() => {
        if (!circulars || circulars.length === 0) return [];
        if (!currentAcademicYearRange) return circulars;
        return circulars.filter(c => {
            if (!c.issue_date) return false;
            const d = dayjs(c.issue_date);
            if (!d.isValid()) return false;
            return !d.isBefore(currentAcademicYearRange.startDate) && !d.isAfter(currentAcademicYearRange.endDate);
        });
    }, [circulars, currentAcademicYearRange]);

    // Dynamic Events sorted by date (within selected academic year)
    const displayEvents = useMemo(() => {
        if (!yearFilteredEvents || yearFilteredEvents.length === 0) return [];
        return [...yearFilteredEvents]
            .sort((a, b) => dayjs(b.event_date).valueOf() - dayjs(a.event_date).valueOf())
            .slice(0, 4);
    }, [yearFilteredEvents]);

    // Dynamic Circulars sorted by issue_date (within selected academic year)
    const displayCirculars = useMemo(() => {
        if (!yearFilteredCirculars || yearFilteredCirculars.length === 0) return [];
        return [...yearFilteredCirculars]
            .sort((a, b) => dayjs(b.issue_date).valueOf() - dayjs(a.issue_date).valueOf())
            .slice(0, 4);
    }, [yearFilteredCirculars]);

    // Dynamic Latest Circular (within selected academic year)
    const latestCircular = useMemo(() => {
        if (!yearFilteredCirculars || yearFilteredCirculars.length === 0) return null;
        return [...yearFilteredCirculars].sort((a, b) => dayjs(b.issue_date).valueOf() - dayjs(a.issue_date).valueOf())[0];
    }, [yearFilteredCirculars]);

    // Next upcoming event for preview banner (within selected academic year)
    const nextUpcomingEvent = useMemo(() => {
        if (!yearFilteredEvents || yearFilteredEvents.length === 0) return null;
        const upcoming = yearFilteredEvents
            .filter(e => dayjs(e.event_date).isAfter(dayjs().subtract(1, 'day')))
            .sort((a, b) => dayjs(a.event_date).valueOf() - dayjs(b.event_date).valueOf());
        return upcoming[0] || yearFilteredEvents[0];
    }, [yearFilteredEvents]);

    // Event on the selected calendar date (within selected academic year)
    const selectedDayEvent = useMemo(() => {
        return yearFilteredEvents.find(e => {
            const d = dayjs(e.event_date);
            return d.isValid() && d.isSame(calendarDate, 'month') && d.date() === selectedCalendarDay;
        });
    }, [yearFilteredEvents, calendarDate, selectedCalendarDay]);

    // Calendar generation for month view
    const renderCalendarGrid = () => {
        const startOfMonth = calendarDate.startOf('month');
        const daysInMonth = calendarDate.daysInMonth();
        const startDayOfWeek = startOfMonth.day();
        const prevMonth = calendarDate.subtract(1, 'month');
        const daysInPrevMonth = prevMonth.daysInMonth();

        const cells = [];

        // Previous month trailing days
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayNum = daysInPrevMonth - i;
            cells.push(
                <div key={`prev-${dayNum}`} className="aspect-square flex flex-col items-center justify-center text-xs font-semibold text-slate-300 rounded-lg cursor-default">
                    {dayNum < 10 ? `0${dayNum}` : dayNum}
                </div>
            );
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const isSelected = selectedCalendarDay === day;
            const hasEventDot = yearFilteredEvents.some(e => {
                const d = dayjs(e.event_date);
                return d.isValid() && d.isSame(calendarDate, 'month') && d.date() === day;
            });

            cells.push(
                <div
                    key={`curr-${day}`}
                    className={`aspect-square flex flex-col items-center justify-center text-xs font-semibold rounded-lg cursor-pointer transition-colors relative ${
                        isSelected 
                            ? 'bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30' 
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    onClick={() => setSelectedCalendarDay(day)}
                >
                    <span>{day < 10 ? `0${day}` : day}</span>
                    {hasEventDot && (
                        <span className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-white' : 'bg-blue-600'}`} />
                    )}
                </div>
            );
        }

        // Next month leading days to complete grid
        const totalRendered = cells.length;
        const remaining = 35 - totalRendered > 0 ? 35 - totalRendered : 42 - totalRendered;
        for (let day = 1; day <= remaining; day++) {
            cells.push(
                <div key={`next-${day}`} className="aspect-square flex flex-col items-center justify-center text-xs font-semibold text-slate-300 rounded-lg cursor-default">
                    {day < 10 ? `0${day}` : `${day}`}
                </div>
            );
        }

        return cells;
    };

    const isGlobalLoading = eventsLoading || imagesLoading || dataLoading;

    return (
        <Spin spinning={isGlobalLoading} tip="Synchronizing academic year data...">
            <div className="w-full min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
                {/* ====================================================================
                    TOP COMMAND / APP BAR
                    ==================================================================== */}
                {/* ====================================================================
                    TOP COMMAND / APP BAR (FULLY RESPONSIVE)
                    ==================================================================== */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200 px-3.5 sm:px-6 py-2.5 sm:py-3.5 -mx-3 sm:-mx-6 -mt-3 sm:-mt-5 mb-5 sm:mb-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                    {/* Top Row: Brand & Profile Actions */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Tooltip title="Toggle Navigation Menu">
                                <button
                                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 inline-flex items-center justify-center transition-all cursor-pointer outline-none flex-shrink-0"
                                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-sidebar'))}
                                >
                                    <MenuOutlined className="text-base" />
                                </button>
                            </Tooltip>
                            <div className="min-w-0">
                                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight m-0 truncate max-w-[200px] xs:max-w-xs sm:max-w-md">{schoolName}</h2>
                                <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate block">
                                    Faculty Operational Command • Teacher Academic Portal
                                </span>
                            </div>
                        </div>

                        {/* Desktop controls */}
                        <div className="hidden md:flex items-center gap-2.5 flex-shrink-0">
                            <Tooltip title="Search Portal">
                                <button
                                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('mystudents'))}
                                >
                                    <SearchOutlined className="text-sm" />
                                </button>
                            </Tooltip>

                            <Dropdown menu={{ items: quickActionItems }} trigger={['click']} placement="bottomRight">
                                <button className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all duration-200 cursor-pointer border-none outline-none">
                                    <PlusOutlined className="text-xs" />
                                    <span>Quick Actions</span>
                                    <DownOutlined className="text-[10px] ml-0.5" />
                                </button>
                            </Dropdown>

                            {/* Academic Year Selector */}
                            <div className="relative inline-flex items-center">
                                <div className="flex items-center bg-white border border-slate-300 hover:border-blue-500 rounded-lg shadow-sm px-2.5 py-1 transition-all">
                                    <CalendarOutlined className="text-blue-600 text-xs mr-1.5" />
                                    <select
                                        value={selectedAcademicYear}
                                        onChange={(e) => handleAcademicYearChange(e.target.value)}
                                        className="appearance-none bg-transparent border-none text-slate-800 font-bold text-xs pr-5 py-0.5 cursor-pointer outline-none focus:ring-0"
                                        aria-label="Select Academic Year"
                                    >
                                        {academicYearOptions.map((ay) => (
                                            <option key={ay.value} value={ay.value}>
                                                AY {ay.label} {ay.isCurrent ? '★ (Current)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <DownOutlined className="text-[10px] text-slate-400 absolute right-3 pointer-events-none" />
                                </div>
                            </div>

                            <Tooltip title="Notices & Circulars">
                                <Badge count={circulars.length > 0 ? circulars.length : 3} offset={[-2, 4]} size="small">
                                    <button
                                        className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                        onClick={() => dispatch(setCurrentPage('teacherCircular'))}
                                    >
                                        <BellOutlined className="text-base" />
                                    </button>
                                </Badge>
                            </Tooltip>

                            <Tooltip title="Faculty Messenger">
                                <button
                                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('chat'))}
                                >
                                    <MessageOutlined className="text-sm" />
                                </button>
                            </Tooltip>

                            <Tooltip title="Help & Curriculum Guides">
                                <button
                                    className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('teacherEvents'))}
                                >
                                    <QuestionCircleOutlined className="text-sm" />
                                </button>
                            </Tooltip>

                            <div
                                className="flex items-center gap-2.5 py-1 px-3 pl-1.5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 cursor-pointer transition-all"
                                onClick={() => dispatch(setCurrentPage('personaltimetable'))}
                            >
                                <Avatar
                                    size={32}
                                    className="bg-blue-600 text-white"
                                    icon={<UserOutlined />}
                                    src={user?.photo_url}
                                />
                                <div className="leading-tight">
                                    <div className="text-[13px] font-bold text-slate-900">
                                        {user?.full_name || user?.name || 'Faculty In-Charge'}
                                    </div>
                                    <div className="text-[11px] text-slate-500">
                                        {hasClassAssignment ? `Class Teacher (${assignedClass}-${assignedSection})` : 'Senior Faculty'}
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wide">
                                    FACULTY
                                </span>
                            </div>
                        </div>

                        {/* Mobile quick icons (Chat + Help + Bell + Profile) */}
                        <div className="flex md:hidden items-center gap-1.5 flex-shrink-0">
                            <Tooltip title="Faculty Messenger">
                                <button
                                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('chat'))}
                                >
                                    <MessageOutlined className="text-xs" />
                                </button>
                            </Tooltip>

                            <Tooltip title="Help & Curriculum Guides">
                                <button
                                    className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('teacherEvents'))}
                                >
                                    <QuestionCircleOutlined className="text-xs" />
                                </button>
                            </Tooltip>

                            <Tooltip title="Notices & Circulars">
                                <Badge count={circulars.length > 0 ? circulars.length : 3} offset={[-2, 4]} size="small">
                                    <button
                                        className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-900 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                        onClick={() => dispatch(setCurrentPage('teacherCircular'))}
                                    >
                                        <BellOutlined className="text-xs" />
                                    </button>
                                </Badge>
                            </Tooltip>

                            <div
                                className="flex items-center gap-1 py-0.5 px-1.5 rounded-full bg-slate-100 border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors"
                                onClick={() => dispatch(setCurrentPage('personaltimetable'))}
                                title="View Faculty Profile"
                            >
                                <Avatar
                                    size={24}
                                    className="bg-blue-600 text-white"
                                    icon={<UserOutlined />}
                                    src={user?.photo_url}
                                />
                                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[55px] hidden xs:inline">
                                    {user?.full_name ? user.full_name.split(' ')[0] : 'JD'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Row 2: Academic Year + Quick Actions + Search */}
                    <div className="flex md:hidden items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                        <div className="relative flex-1 min-w-0">
                            <div className="flex items-center bg-white border border-slate-300 rounded-lg shadow-sm px-2 py-1 w-full">
                                <CalendarOutlined className="text-blue-600 text-xs mr-1.5 flex-shrink-0" />
                                <select
                                    value={selectedAcademicYear}
                                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                                    className="appearance-none bg-transparent border-none text-slate-800 font-bold text-xs w-full pr-4 py-0 cursor-pointer outline-none truncate"
                                    aria-label="Select Academic Year"
                                >
                                    {academicYearOptions.map((ay) => (
                                        <option key={ay.value} value={ay.value}>
                                            AY {ay.label} {ay.isCurrent ? '★ (Current)' : ''}
                                        </option>
                                    ))}
                                </select>
                                <DownOutlined className="text-[10px] text-slate-400 absolute right-2 pointer-events-none" />
                            </div>
                        </div>

                        <Dropdown menu={{ items: quickActionItems }} trigger={['click']} placement="bottomRight">
                            <button className="inline-flex items-center gap-1 h-8 px-2.5 bg-slate-900 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer border-none flex-shrink-0">
                                <PlusOutlined className="text-[10px]" />
                                <span>Actions</span>
                                <DownOutlined className="text-[9px]" />
                            </button>
                        </Dropdown>

                        <button
                            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer outline-none flex-shrink-0"
                            onClick={() => dispatch(setCurrentPage('mystudents'))}
                            title="Search"
                        >
                            <SearchOutlined className="text-xs" />
                        </button>
                    </div>
                </div>

                {/* ====================================================================
                    CAMPUS / FACULTY HERO SHOWCASE CARD (MOBILE RESPONSIVE)
                    ==================================================================== */}
                <div
                    className="relative w-full min-h-[220px] sm:min-h-[280px] rounded-2xl overflow-hidden mb-5 sm:mb-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.12)] bg-cover bg-[center_30%] flex flex-col justify-between"
                    style={{ backgroundImage: `url(${bannerImage})` }}
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/30 to-slate-900/90 pointer-events-none" />

                    <div className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex gap-2 flex-wrap items-center">
                            <div className="bg-white/90 backdrop-blur-md rounded-full px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[10.5px] sm:text-[11px] font-semibold text-slate-900 inline-flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                                <span>PORTAL: ACTIVE</span>
                            </div>
                            <div className="bg-white/90 backdrop-blur-md rounded-full px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[10.5px] sm:text-[11px] font-semibold text-slate-900 inline-flex items-center gap-1.5 shadow-sm">
                                <span>AFFILIATION: {affiliationNumber}</span>
                            </div>
                            {selectedAcademicYear && (
                                <div className="bg-blue-600 text-white rounded-full px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[10.5px] sm:text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm">
                                    <span>AY: {selectedAcademicYear}</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:flex gap-2 mt-1 sm:mt-0 w-full sm:w-auto">
                            <button
                                className="bg-white/95 hover:bg-white text-slate-900 rounded-full text-xs font-semibold h-8 sm:h-8.5 px-3 sm:px-4 inline-flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer border-none outline-none"
                                onClick={() => dispatch(setCurrentPage('createteacherattendance'))}
                            >
                                <CalendarOutlined className="text-xs sm:text-sm" />
                                <span>Attendance</span>
                            </button>
                            <button
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold h-8 sm:h-8.5 px-3 sm:px-4 inline-flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-all cursor-pointer border-none outline-none"
                                onClick={() => dispatch(setCurrentPage('personaltimetable'))}
                            >
                                <ClockCircleOutlined className="text-xs sm:text-sm" />
                                <span>My Timetable</span>
                            </button>
                        </div>
                    </div>

                    <div className="relative z-10 p-4 sm:p-6 flex flex-wrap justify-between items-end gap-3">
                        <div>
                            <div className="text-blue-300 text-[10.5px] sm:text-[11px] font-bold tracking-widest uppercase mb-1 flex items-center gap-1.5">
                                <span>★</span>
                                <span>DEPARTMENT OF ACADEMIC EXCELLENCE</span>
                            </div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white mb-1 leading-tight m-0">
                                Welcome back, {user?.full_name ? user.full_name.split(' ')[0] : 'Teacher'}!
                            </h1>
                            <p className="text-slate-200 text-xs sm:text-sm m-0 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span>{currentDateFormatted}</span>
                                <span>&bull;</span>
                                <span>AY {selectedAcademicYear || 'Current'}</span>
                                <span>&bull;</span>
                                <span>{yearStats.totalClasses} Active Classes</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ====================================================================
                    ROW 1: 6 EXPANDED KPI METRIC STAT CARDS WITH GENEROUS PADDING
                    ==================================================================== */}
                <Row gutter={[14, 14]} className="mb-6">
                    {/* Card 1: Class In-Charge Scholars */}
                    <Col xs={24} sm={12} lg={8}>
                        <div
                            className="group bg-white border border-slate-200/90 hover:border-indigo-300 rounded-2xl p-4 sm:p-5.5 md:p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full relative"
                            onClick={() => dispatch(setCurrentPage('myclassstudents'))}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 border border-indigo-100 group-hover:scale-105 transition-transform">
                                        <Icons.Scholars />
                                    </div>
                                    <span
                                        className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                            hasClassAssignment
                                                ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                                : 'bg-slate-100 border border-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {hasClassAssignment ? 'IN-CHARGE' : 'GENERAL'}
                                    </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                    Class In-Charge Scholars
                                </div>
                                <div className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2 truncate">
                                    {hasClassAssignment ? `${assignedClass} - ${assignedSection}` : 'Not In-Charge'}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 flex items-center justify-between mb-1.5">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <ArrowUpOutlined className="text-indigo-600 text-xs" />
                                        <span className="truncate">
                                            {hasClassAssignment 
                                                ? `${totalClassStudents} Enrolled (${boysCount}B · ${girlsCount}G)` 
                                                : `Subject Teacher (AY ${selectedAcademicYear})`
                                            }
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-indigo-600 font-bold group-hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                                        View <ArrowRightOutlined className="text-[9px]" />
                                    </span>
                                </div>
                                {hasClassAssignment && (
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                        <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${boysPercentage}%` }} title={`Boys: ${boysCount} (${boysPercentage}%)`} />
                                        <div className="bg-pink-500 h-full transition-all duration-500" style={{ width: `${girlsPercentage}%` }} title={`Girls: ${girlsCount} (${girlsPercentage}%)`} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Card 2: Assigned Teaching Classes & Subjects */}
                    <Col xs={24} sm={12} lg={8}>
                        <div
                            className="group bg-white border border-slate-200/90 hover:border-emerald-300 rounded-2xl p-4 sm:p-5.5 md:p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full relative"
                            onClick={() => dispatch(setCurrentPage('myclasses'))}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 border border-emerald-100 group-hover:scale-105 transition-transform">
                                        <Icons.Classes />
                                    </div>
                                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                        yearStats.totalClasses > 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-slate-100 border border-slate-200 text-slate-500'
                                    }`}>
                                        {yearStats.totalClasses > 0 ? 'ACTIVE' : 'IDLE'}
                                    </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                    Assigned Teaching Classes
                                </div>
                                <div className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2 truncate">
                                    {yearStats.totalClasses} Classes
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 flex items-center justify-between mb-1.5">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <CheckCircleFilled className="text-emerald-600 text-xs" />
                                        <span className="text-emerald-700 font-semibold truncate">
                                            {yearStats.subjects.length > 0 
                                                ? `${yearStats.subjects.length} Subject(s): ${yearStats.subjects.join(', ')}` 
                                                : `No subjects in AY ${selectedAcademicYear}`
                                            }
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-emerald-600 font-bold group-hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                                        Classes <ArrowRightOutlined className="text-[9px]" />
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-emerald-600 h-full transition-all duration-500 rounded-full" 
                                        style={{ width: `${Math.min(100, Math.max(15, yearStats.totalClasses * 25))}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Card 3: Student Day Attendance Percentage */}
                    <Col xs={24} sm={12} lg={8}>
                        <div
                            className="group bg-white border border-slate-200/90 hover:border-sky-300 rounded-2xl p-4 sm:p-5.5 md:p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full relative"
                            onClick={() => dispatch(setCurrentPage('studentattendance'))}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-sky-50 border border-sky-100 group-hover:scale-105 transition-transform">
                                        <Icons.Attendance />
                                    </div>
                                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                                        yearStats.attendanceTotalCount > 0 
                                            ? 'bg-sky-50 border border-sky-200 text-sky-800' 
                                            : 'bg-slate-100 border border-slate-200 text-slate-500'
                                    }`}>
                                        {yearStats.attendanceTotalCount > 0 ? `${yearStats.attendancePercentage}% RATE` : 'STANDBY'}
                                    </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                    Student Day Attendance
                                </div>
                                <div className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2 truncate">
                                    {yearStats.attendanceTotalCount > 0 ? `${yearStats.attendancePercentage}%` : hasClassAssignment ? 'Pending' : 'N/A'}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 flex items-center justify-between mb-1.5">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <CalendarOutlined className="text-sky-600 text-xs" />
                                        <span className="text-sky-800 font-semibold truncate">
                                            {yearStats.attendanceTotalCount > 0 
                                                ? `${yearStats.attendancePresentCount} Present · ${Math.max(0, yearStats.attendanceTotalCount - yearStats.attendancePresentCount)} Absent (${yearStats.attendanceDateLabel})` 
                                                : hasClassAssignment 
                                                    ? `Ready to record roll for ${assignedClass}` 
                                                    : `No in-charge roll in AY ${selectedAcademicYear}`
                                            }
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-sky-600 font-bold group-hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                                        Roll <ArrowRightOutlined className="text-[9px]" />
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-sky-500 h-full transition-all duration-500 rounded-full" 
                                        style={{ width: `${yearStats.attendancePercentage || (hasClassAssignment ? 10 : 0)}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Card 4: Homework Assignments */}
                    <Col xs={24} sm={12} lg={8}>
                        <div
                            className="group bg-white border border-slate-200/90 hover:border-amber-300 rounded-2xl p-4 sm:p-5.5 md:p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full relative"
                            onClick={() => dispatch(setCurrentPage('homework'))}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-100 group-hover:scale-105 transition-transform">
                                        <Icons.Homework />
                                    </div>
                                    <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-800">
                                        HOMEWORK
                                    </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                    Homework Assignments
                                </div>
                                <div className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2 truncate">
                                    {yearStats.activeHomeworkCount} Active
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <FileTextOutlined className="text-amber-600 text-xs" />
                                        <span className="text-amber-800 font-semibold truncate">
                                            {yearStats.activeHomeworkCount > 0 
                                                ? `${yearStats.activeHomeworkCount} Assignments in AY ${selectedAcademicYear}` 
                                                : `Create new homework tasks`
                                            }
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-amber-600 font-bold group-hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                                        Manage <ArrowRightOutlined className="text-[9px]" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Card 5: Home Tests & MCQs */}
                    <Col xs={24} sm={12} lg={8}>
                        <div
                            className="group bg-white border border-slate-200/90 hover:border-rose-300 rounded-2xl p-4 sm:p-5.5 md:p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full relative"
                            onClick={() => dispatch(setCurrentPage('hometest'))}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-rose-50 border border-rose-100 group-hover:scale-105 transition-transform">
                                        <Icons.HomeTest />
                                    </div>
                                    <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-rose-50 border border-rose-200 text-rose-800">
                                        HOME TESTS
                                    </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                    Home Tests &amp; MCQs
                                </div>
                                <div className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2 truncate">
                                    {yearStats.activeTestCount} Active
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <BookOutlined className="text-rose-600 text-xs" />
                                        <span className="text-rose-800 font-semibold truncate">
                                            {yearStats.activeTestCount > 0 
                                                ? `${yearStats.activeTestCount} Tests & MCQ Assessments` 
                                                : `Schedule home test for students`
                                            }
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-rose-600 font-bold group-hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                                        Tests <ArrowRightOutlined className="text-[9px]" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Col>

                    {/* Card 6: Question Paper Templates */}
                    <Col xs={24} sm={12} lg={8}>
                        <div
                            className="group bg-white border border-slate-200/90 hover:border-violet-300 rounded-2xl p-4 sm:p-5.5 md:p-6 flex flex-col justify-between shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full relative"
                            onClick={() => dispatch(setCurrentPage('templates'))}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-50 border border-violet-100 group-hover:scale-105 transition-transform">
                                        <Icons.Template />
                                    </div>
                                    <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-violet-50 border border-violet-200 text-violet-800">
                                        TEMPLATES
                                    </span>
                                </div>
                                <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate">
                                    Question Paper Templates
                                </div>
                                <div className="text-xl sm:text-2xl md:text-[26px] font-black text-slate-900 tracking-tight leading-tight mb-2 truncate">
                                    {yearStats.templateCount} Templates
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100">
                                <div className="text-[11.5px] sm:text-[12px] font-semibold text-slate-500 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 truncate">
                                        <FormOutlined className="text-violet-600 text-xs" />
                                        <span className="text-violet-800 font-semibold truncate">
                                            {yearStats.templateCount > 0 
                                                ? `${yearStats.templateCount} Blueprints & Question Banks` 
                                                : `Create question paper template`
                                            }
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-violet-600 font-bold group-hover:underline inline-flex items-center gap-0.5 flex-shrink-0">
                                        Build <ArrowRightOutlined className="text-[9px]" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* ====================================================================
                    ROW 2: TODAY'S TIMETABLE SCHEDULE & CLASS DEMOGRAPHICS
                    ==================================================================== */}
                <Row gutter={[20, 20]} className="mb-6">
                    {/* Today's Teaching Schedule Timeline */}
                    <Col xs={24} lg={15}>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 m-0 flex items-center gap-2">
                                        <ClockCircleOutlined className="text-blue-600" />
                                        Today's Teaching Schedule &amp; Classroom Timeline
                                    </h3>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        {dayjs().format('dddd')} &bull; AY {selectedAcademicYear} &bull; {yearStats.todaySchedule.length} Period(s) Configured
                                    </div>
                                </div>
                                <span
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1 transition-colors"
                                    onClick={() => dispatch(setCurrentPage('personaltimetable'))}
                                >
                                    Full Timetable <ArrowRightOutlined />
                                </span>
                            </div>

                            <div className="flex flex-col gap-2.5 flex-1">
                                {yearStats.todaySchedule.length > 0 ? (
                                    yearStats.todaySchedule.map((item, idx) => {
                                        const liveStatus = getPeriodTimeStatus(item.time, currentTime);
                                        const isOngoing = liveStatus.status === 'in-progress';
                                        const isCompleted = liveStatus.status === 'completed';

                                        return (
                                            <div
                                                key={idx}
                                                className={`p-3 sm:p-3.5 rounded-xl border transition-all ${
                                                    isOngoing
                                                        ? 'bg-emerald-50/50 border-emerald-300 shadow-sm ring-1 ring-emerald-300/60'
                                                        : isCompleted
                                                        ? 'bg-slate-50/70 hover:bg-white border-slate-200 hover:border-slate-300 opacity-90 hover:opacity-100'
                                                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                                }`}
                                            >
                                                {/* Mobile (< sm) View: No text squishing */}
                                                <div className="sm:hidden flex flex-col gap-2">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className={`text-[10.5px] font-black px-2 py-0.5 rounded uppercase tracking-wider flex-shrink-0 ${
                                                                isOngoing ? 'bg-emerald-600 text-white' : isCompleted ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800'
                                                            }`}>
                                                                {item.period}
                                                            </span>
                                                            <span className="text-sm font-bold text-slate-900 truncate">
                                                                {item.subject} <span className="text-blue-600 font-semibold">({item.className})</span>
                                                            </span>
                                                        </div>
                                                        <span
                                                            className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 tracking-wide flex-shrink-0 ${
                                                                isCompleted
                                                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                    : isOngoing
                                                                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold shadow-sm'
                                                                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                            }`}
                                                        >
                                                            {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />}
                                                            {liveStatus.statusLabel}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100/80">
                                                        <span className="flex items-center gap-1 text-[11.5px]">
                                                            <EnvironmentOutlined className="text-slate-400" />
                                                            {item.room}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-medium text-slate-600 text-[11.5px]">
                                                            <ClockCircleOutlined className="text-slate-400" />
                                                            {item.time}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Tablet & Desktop (>= sm) View */}
                                                <div className="hidden sm:flex items-center gap-3.5">
                                                    <div className={`border rounded-lg py-1.5 px-2.5 text-center min-w-[76px] flex-shrink-0 transition-colors ${
                                                        isOngoing
                                                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                            : isCompleted
                                                            ? 'bg-slate-100 border-slate-200'
                                                            : 'bg-white border-slate-200'
                                                    }`}>
                                                        <div className={`text-[11px] font-extrabold tracking-wider uppercase ${
                                                            isOngoing ? 'text-white' : isCompleted ? 'text-slate-500' : 'text-blue-600'
                                                        }`}>
                                                            {item.period}
                                                        </div>
                                                        <div className={`text-[11px] font-semibold ${
                                                            isOngoing ? 'text-emerald-100' : isCompleted ? 'text-slate-500' : 'text-slate-600'
                                                        }`}>
                                                            {item.time.split(' - ')[0]}
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-slate-900 m-0 mb-0.5 flex items-center gap-2 truncate">
                                                            <span>{item.subject}</span>
                                                            <span className={`text-xs font-semibold ${isOngoing ? 'text-emerald-700' : 'text-blue-600'}`}>
                                                                ({item.className})
                                                            </span>
                                                            {isOngoing && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                                                    Live Now
                                                                </span>
                                                            )}
                                                        </h4>
                                                        <div className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                                                            <span>
                                                                <EnvironmentOutlined className="mr-1 text-slate-400" />
                                                                {item.room}
                                                            </span>
                                                            <span>
                                                                <ClockCircleOutlined className="mr-1 text-slate-400" />
                                                                {item.time}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <span
                                                        className={`text-[11.5px] font-bold px-3 py-1 rounded-full whitespace-nowrap flex items-center gap-1.5 tracking-wide ${
                                                            isCompleted
                                                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                : isOngoing
                                                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold shadow-sm'
                                                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        }`}
                                                    >
                                                        {isOngoing && <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />}
                                                        {liveStatus.statusLabel}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center my-auto">
                                        <ClockCircleOutlined className="text-2xl text-slate-400 mb-2" />
                                        <p className="text-sm font-semibold text-slate-700 mb-1">
                                            No Scheduled Teaching Periods for {dayjs().format('dddd')} in AY {selectedAcademicYear}
                                        </p>
                                        <p className="text-xs text-slate-500 max-w-sm mb-3">
                                            Timetable schedules are synchronized dynamically per academic year. Check full personal timetable or switch academic years.
                                        </p>
                                        <button
                                            className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg shadow-sm cursor-pointer"
                                            onClick={() => dispatch(setCurrentPage('personaltimetable'))}
                                        >
                                            Open Master Timetable &rarr;
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Col>

                    {/* Class In-Charge Gender Ratio & Profile */}
                    <Col xs={24} lg={9}>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 m-0 flex items-center gap-2">
                                        <TeamOutlined className="text-blue-600" />
                                        Class Demographic Breakdown
                                    </h3>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        {hasClassAssignment 
                                            ? `${assignedClass} - ${assignedSection} Scholar Distribution (AY ${selectedAcademicYear})` 
                                            : `General Status (AY ${selectedAcademicYear})`
                                        }
                                    </div>
                                </div>
                                <button
                                    className="w-7 h-7 rounded-lg border-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('myclassstudents'))}
                                >
                                    <MoreOutlined className="text-base" />
                                </button>
                            </div>

                            {/* Doughnut Chart with center label */}
                            <div className="relative h-44 flex items-center justify-center my-2">
                                <Doughnut data={genderData} options={doughnutOptions} />
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
                                        TOTAL SCHOLARS
                                    </div>
                                    <div className="text-2xl font-extrabold text-slate-900 leading-none my-0.5">
                                        {totalClassStudents}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-semibold truncate max-w-[120px] text-center">
                                        {hasClassAssignment ? `${assignedClass}-${assignedSection}` : 'Not In-Charge'}
                                    </div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="flex justify-around mt-3.5 pt-3 border-t border-slate-100">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{boysCount} ({boysPercentage}%)</div>
                                        <div className="text-[11.5px] text-slate-500">Boys</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" />
                                    <div>
                                        <div className="text-sm font-bold text-slate-900">{girlsCount} ({girlsPercentage}%)</div>
                                        <div className="text-[11.5px] text-slate-500">Girls</div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Row */}
                            <div className="flex items-center justify-between pt-4 mt-auto border-t border-slate-100 text-xs text-slate-500">
                                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                    <span className={`w-1.5 h-1.5 rounded-full inline-block ${hasClassAssignment ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                    <span>
                                        {hasClassAssignment ? 'Class In-Charge: Active' : `Not Class Teacher (AY ${selectedAcademicYear})`}
                                    </span>
                                </div>

                                <span
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                                    onClick={() => dispatch(setCurrentPage('myclassstudents'))}
                                >
                                    View Roster <ArrowRightOutlined />
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* ====================================================================
                    ROW 3: QUICK ACADEMIC COMMAND HUB (4 SHORTCUT CARDS)
                    ==================================================================== */}
                <div className="mb-6">
                    <div className="mb-3.5">
                        <h3 className="text-base font-bold text-slate-900 m-0">
                            Faculty Quick Command Hub
                        </h3>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                            Instant access to academic workflow utilities, question papers, mark entries, and curriculum repositories
                        </div>
                    </div>

                    <Row gutter={[16, 16]}>
                        {/* Hub 1: Question Bank & Paper Builder */}
                        <Col xs={24} sm={12} lg={6}>
                            <div
                                className="group bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 rounded-xl p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-200 h-full"
                                onClick={() => dispatch(setCurrentPage('questionbank'))}
                            >
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 border border-indigo-100 group-hover:scale-105 transition-transform">
                                    <BookOutlined className="text-xl text-indigo-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 m-0 mb-1">
                                        Question Bank &amp; Papers
                                    </h4>
                                    <p className="text-xs text-slate-500 m-0 leading-relaxed">
                                        Build standardized test papers from templates and verified question banks.
                                    </p>
                                </div>
                            </div>
                        </Col>

                        {/* Hub 2: Exam & Unit Mark Upload */}
                        <Col xs={24} sm={12} lg={6}>
                            <div
                                className="group bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 rounded-xl p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-200 h-full"
                                onClick={() => dispatch(setCurrentPage('exammarkupload'))}
                            >
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 border border-emerald-100 group-hover:scale-105 transition-transform">
                                    <FormOutlined className="text-xl text-emerald-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 m-0 mb-1">
                                        Marks &amp; Unit Assessments
                                    </h4>
                                    <p className="text-xs text-slate-500 m-0 leading-relaxed">
                                        Enter periodic test scores, practical grades, and internal evaluation marks.
                                    </p>
                                </div>
                            </div>
                        </Col>

                        {/* Hub 3: Digital Class Notes & Materials */}
                        <Col xs={24} sm={12} lg={6}>
                            <div
                                className="group bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 rounded-xl p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-200 h-full"
                                onClick={() => dispatch(setCurrentPage('classnotes'))}
                            >
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50 border border-blue-100 group-hover:scale-105 transition-transform">
                                    <ReadOutlined className="text-xl text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 m-0 mb-1">
                                        Class Notes &amp; Resources
                                    </h4>
                                    <p className="text-xs text-slate-500 m-0 leading-relaxed">
                                        Distribute digital study materials, lecture summaries, and reference links.
                                    </p>
                                </div>
                            </div>
                        </Col>

                        {/* Hub 4: Home Test & MCQ Engine */}
                        <Col xs={24} sm={12} lg={6}>
                            <div
                                className="group bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 rounded-xl p-4 flex items-start gap-3.5 cursor-pointer transition-all duration-200 h-full"
                                onClick={() => dispatch(setCurrentPage('hometest'))}
                            >
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-orange-50 border border-orange-100 group-hover:scale-105 transition-transform">
                                    <FileTextOutlined className="text-xl text-orange-600" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-slate-900 m-0 mb-1">
                                        Home Tests &amp; Online MCQs
                                    </h4>
                                    <p className="text-xs text-slate-500 m-0 leading-relaxed">
                                        Publish diagnostic home assessments and evaluate student performance automatically.
                                    </p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* ====================================================================
                    ROW 4: ENROLLED COURSES & SYLLABUS PROGRESS (FOR SELECTED YEAR)
                    ==================================================================== */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3.5">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 m-0">
                                Enrolled Teaching Courses &amp; Subjects
                            </h3>
                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                                Active courses assigned to your faculty profile for Academic Year {selectedAcademicYear || 'Selected Session'}
                            </div>
                        </div>
                        <span
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                            onClick={() => dispatch(setCurrentPage('myclasses'))}
                        >
                            See All Classes <ArrowRightOutlined />
                        </span>
                    </div>

                    <Row gutter={[16, 16]}>
                        {yearStats.subjects && yearStats.subjects.length > 0 ? (
                            yearStats.subjects.map((subject) => (
                                <Col xs={24} md={12} key={subject}>
                                    <div
                                        className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer"
                                        onClick={() => dispatch(setCurrentPage('classnotes'))}
                                    >
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center font-extrabold text-blue-600 text-base flex-shrink-0">
                                                {subject.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-slate-900 m-0 mb-0.5 truncate">{subject}</h4>
                                                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <span>AY {selectedAcademicYear}</span>
                                                    <span>&bull;</span>
                                                    <span className="truncate">{yearStats.uniqueClassNames.join(', ') || 'Assigned Classes'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end sm:justify-center self-end sm:self-auto flex-shrink-0">
                                            <span className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-colors">
                                                Manage Notes &rarr;
                                            </span>
                                        </div>
                                    </div>
                                </Col>
                            ))
                        ) : (
                            <Col span={24}>
                                <div className="bg-white border border-slate-200 rounded-xl p-6 flex justify-center items-center text-slate-500 text-xs">
                                    No teaching course or subject mappings assigned for Academic Year {selectedAcademicYear || 'the selected session'}.
                                </div>
                            </Col>
                        )}
                    </Row>
                </div>

                {/* ====================================================================
                    ROW 5: FACULTY BULLETIN BOARD & INTERACTIVE CALENDAR
                    ==================================================================== */}
                <Row gutter={[20, 20]}>
                    {/* Faculty Circulars & Upcoming Events */}
                    <Col xs={24} lg={15}>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
                            {/* Board Header with Dynamic Tab Switcher */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 m-0 flex items-center gap-2">
                                        <BellOutlined className="text-blue-600" />
                                        Faculty Events &amp; Institutional Circulars Board
                                    </h3>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        Official notices, parent-teacher reviews, and academic events
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 self-stretch sm:self-auto justify-between sm:justify-end">
                                    {/* Tab Toggle: Events vs Circulars */}
                                    <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                                        <button
                                            type="button"
                                            className={`px-3 py-1 rounded-md transition-all border-none cursor-pointer text-xs font-bold ${
                                                bulletinTab === 'events'
                                                    ? 'bg-white text-blue-700 shadow-sm'
                                                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                                            }`}
                                            onClick={() => setBulletinTab('events')}
                                        >
                                            Events ({yearFilteredEvents.length})
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-3 py-1 rounded-md transition-all border-none cursor-pointer text-xs font-bold ${
                                                bulletinTab === 'circulars'
                                                    ? 'bg-white text-blue-700 shadow-sm'
                                                    : 'bg-transparent text-slate-600 hover:text-slate-900'
                                            }`}
                                            onClick={() => setBulletinTab('circulars')}
                                        >
                                            Circulars ({yearFilteredCirculars.length})
                                        </button>
                                    </div>

                                    <span
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer inline-flex items-center gap-1"
                                        onClick={() => dispatch(setCurrentPage(bulletinTab === 'events' ? 'teacherEvents' : 'teacherCircular'))}
                                    >
                                        {bulletinTab === 'events' ? 'All Events' : 'All Circulars'} <ArrowRightOutlined />
                                    </span>
                                </div>
                            </div>

                            {/* ==================== TAB 1: DYNAMIC EVENTS ==================== */}
                            {bulletinTab === 'events' && (
                                <div className="flex-1 flex flex-col justify-start">
                                    {displayEvents.length > 0 ? (
                                        displayEvents.map((evt, idx) => {
                                            const evtDate = dayjs(evt.event_date);
                                            const dayNumber = evtDate.isValid() ? evtDate.format('DD') : '01';
                                            const monthText = evtDate.isValid() ? evtDate.format('MMM').toUpperCase() : 'OCT';
                                            const isAlternate = idx % 2 === 1;

                                            const statusClass = evt.status === 'Completed'
                                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                                : evt.status === 'Cancelled'
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                                            return (
                                                <div
                                                    key={evt.id || idx}
                                                    className="flex gap-3.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all mb-3 cursor-pointer group"
                                                    onClick={() => setPreviewEvent(evt)}
                                                >
                                                    {/* Date Badge */}
                                                    <div className={`w-12 h-13 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center ${
                                                        isAlternate ? 'bg-slate-100 border border-slate-200' : 'bg-blue-50 border border-blue-100'
                                                    }`}>
                                                        <div className={`text-base font-extrabold leading-tight ${isAlternate ? 'text-slate-700' : 'text-blue-700'}`}>
                                                            {dayNumber}
                                                        </div>
                                                        <div className={`text-[10px] font-bold tracking-wider ${isAlternate ? 'text-slate-700' : 'text-blue-700'}`}>
                                                            {monthText}
                                                        </div>
                                                    </div>

                                                    {/* Event Body */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h4 className="text-sm font-bold text-slate-900 m-0 truncate group-hover:text-blue-600 transition-colors">
                                                                {evt.title}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                <span className={`border rounded px-2 py-0.5 text-[10.5px] font-bold uppercase ${statusClass}`}>
                                                                    {evt.status || 'EVENT'}
                                                                </span>
                                                                <ExportOutlined
                                                                    className="text-slate-400 hover:text-blue-600 text-xs ml-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        dispatch(setCurrentPage('teacherEvents'));
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 m-0 mb-1.5 leading-relaxed line-clamp-2">
                                                            {evt.description || 'Institutional academic or campus faculty event.'}
                                                        </p>
                                                        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-500">
                                                            <span>
                                                                <ClockCircleOutlined className="mr-1 text-slate-400" />
                                                                {evtDate.isValid() ? evtDate.format('dddd, MMMM D, YYYY') : 'Scheduled Event'}
                                                            </span>
                                                            <span>
                                                                <EnvironmentOutlined className="mr-1 text-slate-400" />
                                                                Main Campus Auditorium
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 mb-3 flex flex-col items-center justify-center my-auto">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                                <CalendarOutlined className="text-lg" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 mb-1">
                                                No Campus Events Scheduled for AY {selectedAcademicYear || 'Selected Year'}
                                            </p>
                                            <p className="text-xs text-slate-500 m-0 max-w-sm">
                                                There are currently no upcoming events published for your institution in Academic Year {selectedAcademicYear || 'the selected period'}. Check the full calendar for regular academic duties.
                                            </p>
                                            <button
                                                type="button"
                                                className="mt-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                                onClick={() => dispatch(setCurrentPage('academiccalendar'))}
                                            >
                                                Open Academic Calendar
                                            </button>
                                        </div>
                                    )}

                                    {/* Bottom Notice Strip (Shows Latest Circular) */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 px-3.5 bg-slate-50 rounded-lg border border-slate-200 mt-auto gap-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium truncate">
                                            <FileTextOutlined className="text-sm text-slate-500 flex-shrink-0" />
                                            <span className="truncate">
                                                {latestCircular 
                                                    ? `Latest Circular: ${latestCircular.title} (${dayjs(latestCircular.issue_date).format('MMM D, YYYY')})`
                                                    : 'No circular notices published yet for this institution.'
                                                }
                                            </span>
                                        </div>

                                        <span
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex-shrink-0 self-end sm:self-auto"
                                            onClick={() => dispatch(setCurrentPage('teacherCircular'))}
                                        >
                                            Read Circulars ({yearFilteredCirculars.length}) &rarr;
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* ==================== TAB 2: DYNAMIC CIRCULARS ==================== */}
                            {bulletinTab === 'circulars' && (
                                <div className="flex-1 flex flex-col justify-start">
                                    {displayCirculars.length > 0 ? (
                                        displayCirculars.map((circ, idx) => {
                                            const issueDate = dayjs(circ.issue_date);
                                            const dayNumber = issueDate.isValid() ? issueDate.format('DD') : '01';
                                            const monthText = issueDate.isValid() ? issueDate.format('MMM').toUpperCase() : 'OCT';
                                            const isAlternate = idx % 2 === 1;

                                            return (
                                                <div
                                                    key={circ.id || idx}
                                                    className="flex gap-3.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all mb-3 cursor-pointer group"
                                                    onClick={() => setPreviewCircular(circ)}
                                                >
                                                    {/* Date Badge */}
                                                    <div className={`w-12 h-13 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center ${
                                                        isAlternate ? 'bg-amber-50 border border-amber-100' : 'bg-blue-50 border border-blue-100'
                                                    }`}>
                                                        <div className={`text-base font-extrabold leading-tight ${isAlternate ? 'text-amber-800' : 'text-blue-700'}`}>
                                                            {dayNumber}
                                                        </div>
                                                        <div className={`text-[10px] font-bold tracking-wider ${isAlternate ? 'text-amber-800' : 'text-blue-700'}`}>
                                                            {monthText}
                                                        </div>
                                                    </div>

                                                    {/* Circular Body */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <h4 className="text-sm font-bold text-slate-900 m-0 truncate group-hover:text-blue-600 transition-colors">
                                                                {circ.title}
                                                            </h4>
                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                {circ.audience && circ.audience.slice(0, 2).map(aud => (
                                                                    <span key={aud} className="bg-slate-100 text-slate-700 border border-slate-200 rounded px-2 py-0.5 text-[10px] font-bold uppercase">
                                                                        {aud}
                                                                    </span>
                                                                ))}
                                                                <ExportOutlined
                                                                    className="text-slate-400 hover:text-blue-600 text-xs ml-1"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        dispatch(setCurrentPage('teacherCircular'));
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <p className="text-xs text-slate-500 m-0 mb-1.5 leading-relaxed line-clamp-2">
                                                            {circ.content || 'Official institutional directive issued to school staff and faculty.'}
                                                        </p>
                                                        <div className="flex items-center gap-3.5 text-xs text-slate-500">
                                                            <span>
                                                                <ClockCircleOutlined className="mr-1 text-slate-400" />
                                                                Issued: {issueDate.isValid() ? issueDate.format('MMMM D, YYYY') : 'Recent'}
                                                            </span>
                                                            <span>
                                                                <FileTextOutlined className="mr-1 text-slate-400" />
                                                                {circ.file_url ? 'Attachment Included' : 'Institutional Notice'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="p-8 text-center bg-slate-50/70 rounded-xl border border-dashed border-slate-200 mb-3 flex flex-col items-center justify-center my-auto">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                                                <FileTextOutlined className="text-lg" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 mb-1">
                                                No Circular Notices for AY {selectedAcademicYear || 'Selected Year'}
                                            </p>
                                            <p className="text-xs text-slate-500 m-0 max-w-sm">
                                                No institutional directives or administrative circulars are currently published for teachers in Academic Year {selectedAcademicYear || 'the selected period'}.
                                            </p>
                                            <button
                                                type="button"
                                                className="mt-3 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                                onClick={() => dispatch(setCurrentPage('teacherCircular'))}
                                            >
                                                View Circulars Archive
                                            </button>
                                        </div>
                                    )}

                                    {/* Bottom Notice Strip (Shows Next Event) */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 px-3.5 bg-slate-50 rounded-lg border border-slate-200 mt-auto gap-2">
                                        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium truncate">
                                            <BellOutlined className="text-sm text-blue-600 flex-shrink-0" />
                                            <span className="truncate">
                                                {nextUpcomingEvent 
                                                    ? `Upcoming Event: ${nextUpcomingEvent.title} (${dayjs(nextUpcomingEvent.event_date).format('MMM D, YYYY')})`
                                                    : 'No upcoming campus events currently scheduled.'
                                                }
                                            </span>
                                        </div>

                                        <span
                                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex-shrink-0 self-end sm:self-auto"
                                            onClick={() => dispatch(setCurrentPage('teacherEvents'))}
                                        >
                                            View Events ({yearFilteredEvents.length}) &rarr;
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Col>

                    {/* Interactive Academic Calendar */}
                    <Col xs={24} lg={9}>
                        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4.5 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-[15px] font-bold text-slate-900 m-0 flex items-center gap-2">
                                        <CalendarOutlined className="text-blue-600" />
                                        Academic Calendar
                                    </h3>
                                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                                        Faculty Duty &amp; Lesson Schedule
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="w-7 h-7 rounded-lg border-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => dispatch(setCurrentPage('academiccalendar'))}
                                >
                                    <MoreOutlined className="text-base" />
                                </button>
                            </div>

                            {/* Month Navigation */}
                            <div className="flex items-center justify-between mb-3.5 px-1">
                                <button
                                    type="button"
                                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => setCalendarDate(prev => prev.subtract(1, 'month'))}
                                >
                                    <LeftOutlined className="text-[11px]" />
                                </button>
                                <span className="text-sm font-bold text-slate-900">
                                    {calendarDate.format('MMMM YYYY')}
                                </span>
                                <button
                                    type="button"
                                    className="w-7 h-7 rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-100 inline-flex items-center justify-center transition-all cursor-pointer outline-none"
                                    onClick={() => setCalendarDate(prev => prev.add(1, 'month'))}
                                >
                                    <RightOutlined className="text-[11px]" />
                                </button>
                            </div>

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">Su</div>
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">Mo</div>
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">Tu</div>
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">We</div>
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">Th</div>
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">Fr</div>
                                <div className="text-[11px] font-bold text-slate-500 py-1.5">Sa</div>
                                {renderCalendarGrid()}
                            </div>

                            {/* Dynamic Calendar Footer */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 mt-auto border-t border-slate-100 text-xs text-slate-500 gap-2">
                                <div className="flex items-center gap-1.5 font-medium text-slate-700 truncate">
                                    <span className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${selectedDayEvent ? 'bg-amber-500' : 'bg-blue-600'}`} />
                                    <span className="truncate">
                                        Selected: {calendarDate.format('MMM')} {selectedCalendarDay} &bull; {selectedDayEvent ? selectedDayEvent.title : 'Regular Periods Active'}
                                    </span>
                                </div>

                                <span
                                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer flex-shrink-0 self-end sm:self-auto"
                                    onClick={() => dispatch(setCurrentPage('academiccalendar'))}
                                >
                                    View Full Calendar
                                </span>
                            </div>
                        </div>
                    </Col>
                </Row>

                {/* ====================================================================
                    EVENT DETAILS MODAL
                    ==================================================================== */}
                {previewEvent && (
                    <Modal
                        title={
                            <div className="text-base font-bold text-slate-900 pr-6">
                                {previewEvent.title}
                            </div>
                        }
                        open={Boolean(previewEvent)}
                        onCancel={() => setPreviewEvent(null)}
                        footer={[
                            <Button key="close" onClick={() => setPreviewEvent(null)}>
                                Close
                            </Button>,
                            <Button
                                key="open-events"
                                type="primary"
                                onClick={() => {
                                    setPreviewEvent(null);
                                    dispatch(setCurrentPage('teacherEvents'));
                                }}
                            >
                                All Events &rarr;
                            </Button>
                        ]}
                        width={650}
                    >
                        <div className="pt-2">
                            {previewEvent.image_url && (
                                <img
                                    src={previewEvent.image_url}
                                    alt={previewEvent.title}
                                    className="w-full max-h-64 object-cover rounded-xl mb-4 border border-slate-200"
                                />
                            )}
                            <div className="flex items-center gap-3 mb-3 text-xs">
                                <span className={`px-2.5 py-0.5 rounded font-bold uppercase text-[11px] ${
                                    previewEvent.status === 'Completed'
                                        ? 'bg-slate-100 text-slate-700'
                                        : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                    {previewEvent.status || 'Upcoming'}
                                </span>
                                <span className="text-slate-500">
                                    <CalendarOutlined className="mr-1" />
                                    {dayjs(previewEvent.event_date).format('dddd, MMMM D, YYYY')}
                                </span>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed whitespace-pre-wrap border border-slate-100">
                                {previewEvent.description || 'No detailed description provided for this campus event.'}
                            </div>
                        </div>
                    </Modal>
                )}

                {/* ====================================================================
                    CIRCULAR DETAILS MODAL
                    ==================================================================== */}
                {previewCircular && (
                    <Modal
                        title={
                            <div className="text-base font-bold text-slate-900 pr-6">
                                {previewCircular.title}
                            </div>
                        }
                        open={Boolean(previewCircular)}
                        onCancel={() => setPreviewCircular(null)}
                        footer={[
                            <Button key="close" onClick={() => setPreviewCircular(null)}>
                                Close
                            </Button>,
                            <Button
                                key="open-circulars"
                                type="primary"
                                onClick={() => {
                                    setPreviewCircular(null);
                                    dispatch(setCurrentPage('teacherCircular'));
                                }}
                            >
                                All Circulars &rarr;
                            </Button>
                        ]}
                        width={650}
                    >
                        <div className="pt-2">
                            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                                <span className="text-slate-500">
                                    <ClockCircleOutlined className="mr-1" />
                                    Issued: {dayjs(previewCircular.issue_date).format('dddd, MMMM D, YYYY')}
                                </span>
                                {previewCircular.audience && previewCircular.audience.map(aud => (
                                    <Tag key={aud} color="blue">{aud}</Tag>
                                ))}
                            </div>
                            {previewCircular.file_url ? (
                                <div className="mb-3">
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-xs text-blue-800 font-medium">
                                            <FileTextOutlined className="text-base" />
                                            <span>Attached Institutional Circular Document</span>
                                        </div>
                                        <a
                                            href={previewCircular.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-white px-3 py-1 rounded-md border border-blue-200"
                                        >
                                            View / Download &rarr;
                                        </a>
                                    </div>
                                </div>
                            ) : null}
                            <div className="p-3.5 bg-slate-50 rounded-xl text-xs text-slate-600 leading-relaxed whitespace-pre-wrap border border-slate-100">
                                {previewCircular.content || 'Official circular directive published for faculty.'}
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </Spin>
    );
};

export default TeacherDashboard;
