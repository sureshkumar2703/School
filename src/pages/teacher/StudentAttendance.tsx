import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Table,
    message,
    Spin,
    Empty,
    Select,
    Input,
    Tooltip,
    Alert,
} from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import {
    fetchAttendanceRequest,
    markForenoonAttendanceRequest,
    markAfternoonAttendanceRequest,
    type AttendanceRecord,
} from '../../store/features/attendance/attendanceSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ArrowLeftOutlined,
    CrownOutlined,
    CalendarOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    TeamOutlined,
    SearchOutlined,
    PrinterOutlined,
    FilePdfOutlined,
    UserOutlined,
    ReloadOutlined,
    CheckOutlined,
    SunOutlined,
    MoonOutlined,
    InfoCircleOutlined,
} from '@ant-design/icons';

const { Option } = Select;

type Status = 'Present' | 'Absent' | 'OD' | 'Late';

interface Student {
    id: string;
    register_no: string;
    full_name: string;
    roll_no?: string;
    gender?: string;
    photo_url?: string | null;
}

interface AttendanceState {
    [studentId: string]: {
        fn: Status;
        an: Status;
    };
}

const StudentAttendance: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, loading: statsLoading, error: statsError } = useSelector((state: RootState) => state.teacherStats);
    const { attendance, loading: attendanceLoading } = useSelector((state: RootState) => state.attendance);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    const [attendanceDate] = useState(dayjs());
    const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
    const [isAfternoon, setIsAfternoon] = useState(dayjs().hour() >= 12);
    const [students, setStudents] = useState<Student[]>([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [currentTime, setCurrentTime] = useState(dayjs().format('hh:mm:ss A'));
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [refreshKey, setRefreshKey] = useState(0);

    // Live clock tick
    useEffect(() => {
        const timer = setInterval(() => {
            const now = dayjs();
            setCurrentTime(now.format('hh:mm:ss A'));
            setIsAfternoon(now.hour() >= 12);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Initial data fetch
    useEffect(() => {
        if (user?.organization_key && user?.full_name) {
            dispatch(
                fetchTeacherStatsRequest({
                    organizationKey: user.organization_key,
                    teacherName: user.full_name,
                })
            );
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    // Academic Year Options
    const academicYearOptions = useMemo(() => stats.academicYears || [], [stats.academicYears]);

    // Default select active / current academic year
    useEffect(() => {
        if (academicYearOptions.length > 0 && !selectedYear) {
            const activeYear = stats.activeAcademicYear;
            if (activeYear && academicYearOptions.includes(activeYear)) {
                setSelectedYear(activeYear);
            } else {
                const sortedYears = [...academicYearOptions].sort((a, b) => b.localeCompare(a));
                setSelectedYear(sortedYears[0]);
            }
        }
    }, [academicYearOptions, stats.activeAcademicYear, selectedYear]);

    // Current Class Teacher assignment
    const classTeacherAssignment = useMemo(() => {
        if (!stats.allClassTeacherAssignments || !selectedYear) return null;
        return stats.allClassTeacherAssignments.find(a => a.academic_year === selectedYear);
    }, [stats.allClassTeacherAssignments, selectedYear]);

    // Fetch students roster with passport photos
    useEffect(() => {
        const fetchStudentsAndAttendance = async () => {
            if (!classTeacherAssignment || !user?.organization_key) {
                setStudents([]);
                return;
            }

            const { class_name, section_name, academic_year } = classTeacherAssignment;
            setStudentsLoading(true);

            try {
                // 1. Fetch class allocations
                const { data: allocations, error: allocationError } = await supabase
                    .from('class_section_allocations')
                    .select('register_no, full_name, roll_no')
                    .eq('organization_key', user.organization_key)
                    .eq('class_name', class_name)
                    .eq('section_name', section_name)
                    .eq('academic_year', academic_year);

                if (allocationError) throw allocationError;

                const registerNumbers = allocations?.map(a => a.register_no).filter(Boolean) || [];
                let fetchedStudents: Student[] = [];

                if (registerNumbers.length > 0) {
                    // 2. Fetch student IDs & profiles
                    const { data: studentRecords, error: studentError } = await supabase
                        .from('students')
                        .select('id, register_no, gender')
                        .eq('organization_key', user.organization_key)
                        .in('register_no', registerNumbers);

                    if (studentError) throw studentError;

                    const studentProfileMap = new Map((studentRecords || []).map(s => [s.register_no, s]));
                    const studentIds = (studentRecords || []).map(s => s.id).filter(Boolean);
                    const photoMap = new Map<string, string>();

                    // 3. Fetch passport photos
                    if (studentIds.length > 0) {
                        const { data: documentsData } = await supabase
                            .from('student_documents')
                            .select('student_id, public_url, doc_type')
                            .eq('organization_key', user.organization_key)
                            .in('student_id', studentIds);

                        if (documentsData && documentsData.length > 0) {
                            documentsData.forEach(doc => {
                                if (doc.student_id && doc.public_url) {
                                    if (doc.doc_type === 'Passport Size Photo' || !photoMap.has(doc.student_id)) {
                                        photoMap.set(doc.student_id, doc.public_url);
                                    }
                                }
                            });
                        }
                    }

                    fetchedStudents = (allocations || []).map(alloc => {
                        const profile = studentProfileMap.get(alloc.register_no);
                        const sId = profile?.id || '';
                        return {
                            id: sId,
                            register_no: alloc.register_no,
                            full_name: alloc.full_name,
                            roll_no: alloc.roll_no,
                            gender: profile?.gender,
                            photo_url: (sId && photoMap.get(sId)) || null,
                        };
                    }).filter(s => s.id);
                }

                // Sort by roll number, then name
                fetchedStudents.sort((a, b) => {
                    const rollA = parseInt(a.roll_no || '0', 10);
                    const rollB = parseInt(b.roll_no || '0', 10);
                    if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB) {
                        return rollA - rollB;
                    }
                    return (a.full_name || '').localeCompare(b.full_name || '');
                });

                setStudents(fetchedStudents);

                // Fetch attendance records for today
                const studentIds = fetchedStudents.map(s => s.id);
                if (studentIds.length > 0) {
                    dispatch(
                        fetchAttendanceRequest({
                            organizationKey: user.organization_key,
                            date: attendanceDate.format('YYYY-MM-DD'),
                            studentIds: studentIds,
                            className: class_name,
                            sectionName: section_name,
                            academicYear: academic_year,
                        })
                    );
                } else {
                    dispatch(
                        fetchAttendanceRequest({
                            organizationKey: user.organization_key,
                            date: attendanceDate.format('YYYY-MM-DD'),
                            studentIds: [],
                        })
                    );
                }
            } catch (error: any) {
                message.error(`Failed to fetch students roster: ${error.message}`);
                setStudents([]);
            } finally {
                setStudentsLoading(false);
            }
        };

        fetchStudentsAndAttendance();
    }, [dispatch, classTeacherAssignment, attendanceDate, user?.organization_key, refreshKey]);

    // Populate local attendance state from fetched attendance
    useEffect(() => {
        const newAttendanceState: AttendanceState = {};
        const todayStr = attendanceDate.format('YYYY-MM-DD');

        students.forEach(student => {
            const record = attendance.find(
                att => att.student_id === student.id && att.date === todayStr
            );
            newAttendanceState[student.id] = {
                fn: (record?.forenoon_status as Status) || 'Present',
                an: (record?.afternoon_status as Status) || 'Present',
            };
        });

        setAttendanceState(newAttendanceState);
    }, [attendance, students, attendanceDate]);

    // Check submission status
    const isDayComplete = useMemo(() => {
        if (students.length === 0 || attendance.length === 0) return false;
        return students.every(student => {
            const record = attendance.find(att => att.student_id === student.id);
            return record && record.forenoon_status && record.afternoon_status;
        });
    }, [students, attendance]);

    const isFnSubmitted = useMemo(() => {
        if (students.length === 0 || attendance.length === 0) return false;
        return students.some(student => {
            const record = attendance.find(att => att.student_id === student.id);
            return Boolean(record?.forenoon_status);
        });
    }, [students, attendance]);

    const isAnSubmitted = useMemo(() => {
        if (students.length === 0 || attendance.length === 0) return false;
        return students.some(student => {
            const record = attendance.find(att => att.student_id === student.id);
            return Boolean(record?.afternoon_status);
        });
    }, [students, attendance]);

    // Update individual student status
    const handleStatusChange = (studentId: string, session: 'fn' | 'an', status: Status) => {
        setAttendanceState(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || { fn: 'Present', an: 'Present' }),
                [session]: status,
            },
        }));
    };

    // Bulk actions
    const handleBulkMark = (session: 'fn' | 'an', status: Status) => {
        setAttendanceState(prev => {
            const next = { ...prev };
            students.forEach(s => {
                next[s.id] = {
                    ...(next[s.id] || { fn: 'Present', an: 'Present' }),
                    [session]: status,
                };
            });
            return next;
        });
        message.info(`Marked all students as ${status} for ${session === 'fn' ? 'Forenoon (FN)' : 'Afternoon (AN)'}`);
    };

    // Submissions
    const handleSubmitForenoon = () => {
        if (!classTeacherAssignment || !user?.organization_key) return;

        const attendanceData: AttendanceRecord[] = students.map(student => ({
            student_id: student.id,
            organization_key: user.organization_key!,
            date: attendanceDate.format('YYYY-MM-DD'),
            class: classTeacherAssignment.class_name,
            section: classTeacherAssignment.section_name,
            academic_year: classTeacherAssignment.academic_year,
            roll_no: student.roll_no,
            register_no: student.register_no,
            name: student.full_name,
            forenoon_status: attendanceState[student.id]?.fn || 'Present',
            afternoon_status: attendanceState[student.id]?.an || null,
            attendace_status:
                (attendanceState[student.id]?.fn || 'Present') === 'Absent' &&
                (attendanceState[student.id]?.an || 'Present') === 'Absent'
                    ? 'Absent'
                    : 'Present',
        }));

        dispatch(markForenoonAttendanceRequest(attendanceData));
    };

    const handleSubmitAfternoon = () => {
        if (!classTeacherAssignment || !user?.organization_key) return;

        const attendanceData: AttendanceRecord[] = students.map(student => ({
            student_id: student.id,
            organization_key: user.organization_key!,
            date: attendanceDate.format('YYYY-MM-DD'),
            class: classTeacherAssignment.class_name,
            section: classTeacherAssignment.section_name,
            academic_year: classTeacherAssignment.academic_year,
            roll_no: student.roll_no,
            register_no: student.register_no,
            name: student.full_name,
            forenoon_status: attendanceState[student.id]?.fn || null,
            afternoon_status: attendanceState[student.id]?.an || 'Present',
            attendace_status:
                (attendanceState[student.id]?.fn || 'Present') === 'Absent' &&
                (attendanceState[student.id]?.an || 'Present') === 'Absent'
                    ? 'Absent'
                    : 'Present',
        }));

        dispatch(markAfternoonAttendanceRequest(attendanceData));
    };

    // Real-time live statistics
    const metrics = useMemo(() => {
        const total = students.length;
        if (total === 0) {
            return {
                total: 0,
                fnPresent: 0,
                fnAbsent: 0,
                fnOD: 0,
                fnLate: 0,
                fnRate: 0,
                anPresent: 0,
                anAbsent: 0,
                anOD: 0,
                anLate: 0,
                anRate: 0,
            };
        }

        let fnPresent = 0;
        let fnAbsent = 0;
        let fnOD = 0;
        let fnLate = 0;

        let anPresent = 0;
        let anAbsent = 0;
        let anOD = 0;
        let anLate = 0;

        students.forEach(s => {
            const st = attendanceState[s.id] || { fn: 'Present', an: 'Present' };
            if (st.fn === 'Present') fnPresent++;
            else if (st.fn === 'Absent') fnAbsent++;
            else if (st.fn === 'OD') fnOD++;
            else if (st.fn === 'Late') fnLate++;

            if (st.an === 'Present') anPresent++;
            else if (st.an === 'Absent') anAbsent++;
            else if (st.an === 'OD') anOD++;
            else if (st.an === 'Late') anLate++;
        });

        const fnRate = Math.round((fnPresent / total) * 100);
        const anRate = Math.round((anPresent / total) * 100);

        return {
            total,
            fnPresent,
            fnAbsent,
            fnOD,
            fnLate,
            fnRate,
            anPresent,
            anAbsent,
            anOD,
            anLate,
            anRate,
        };
    }, [students, attendanceState]);

    // Filtered student list
    const filteredStudents = useMemo(() => {
        return students.filter(student => {
            const matchesSearch =
                (student.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.register_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (student.roll_no || '').toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter !== 'all') {
                const currentSessionStatus = isAfternoon
                    ? attendanceState[student.id]?.an
                    : attendanceState[student.id]?.fn;
                if (currentSessionStatus !== statusFilter) return false;
            }

            return true;
        });
    }, [students, searchTerm, statusFilter, isAfternoon, attendanceState]);

    // Avatar Background generator
    const getAvatarBg = (name: string) => {
        const gradients = [
            'linear-gradient(135deg, #2563eb, #4f46e5)',
            'linear-gradient(135deg, #059669, #0d9488)',
            'linear-gradient(135deg, #9333ea, #db2777)',
            'linear-gradient(135deg, #d97706, #ea580c)',
            'linear-gradient(135deg, #e11d48, #db2777)',
            'linear-gradient(135deg, #0891b2, #2563eb)',
        ];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
    };

    const StudentAvatar: React.FC<{ name: string; photoUrl?: string | null; size?: number }> = ({
        name,
        photoUrl,
        size = 38,
    }) => {
        const [imgError, setImgError] = useState(false);
        const initials = (name || '')
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        if (photoUrl && !imgError) {
            return (
                <img
                    src={photoUrl}
                    alt={name}
                    onError={() => setImgError(true)}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: '10px',
                        objectFit: 'cover',
                        border: '1px solid #e2e8f0',
                        flexShrink: 0,
                    }}
                />
            );
        }

        return (
            <div
                style={{
                    width: size,
                    height: size,
                    borderRadius: '10px',
                    background: getAvatarBg(name),
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: size > 40 ? '16px' : '12px',
                    flexShrink: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
            >
                {initials || <UserOutlined />}
            </div>
        );
    };

    // Modern interactive status toggle buttons for table cells
    const StatusToggleBar: React.FC<{
        currentStatus: Status;
        disabled: boolean;
        onChange: (status: Status) => void;
    }> = ({ currentStatus, disabled, onChange }) => {
        const options: { status: Status; label: string; activeBg: string; activeBorder: string; activeColor: string }[] = [
            { status: 'Present', label: 'Present', activeBg: '#ecfdf5', activeBorder: '#10b981', activeColor: '#059669' },
            { status: 'Absent', label: 'Absent', activeBg: '#fef2f2', activeBorder: '#ef4444', activeColor: '#dc2626' },
            { status: 'OD', label: 'OD', activeBg: '#f0f9ff', activeBorder: '#0284c7', activeColor: '#0284c7' },
            { status: 'Late', label: 'Late', activeBg: '#fffbeb', activeBorder: '#f59e0b', activeColor: '#d97706' },
        ];

        return (
            <div
                style={{
                    display: 'inline-flex',
                    gap: '4px',
                    padding: '3px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                }}
            >
                {options.map(opt => {
                    const isSelected = currentStatus === opt.status;
                    return (
                        <button
                            key={opt.status}
                            type="button"
                            disabled={disabled}
                            onClick={() => onChange(opt.status)}
                            style={{
                                padding: '5px 11px',
                                borderRadius: '7px',
                                border: isSelected ? `1.5px solid ${opt.activeBorder}` : '1.5px solid transparent',
                                backgroundColor: isSelected ? opt.activeBg : 'transparent',
                                color: isSelected ? opt.activeColor : '#64748b',
                                fontWeight: isSelected ? 700 : 500,
                                fontSize: '11px',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                transition: 'all 0.15s ease',
                                outline: 'none',
                                opacity: disabled && !isSelected ? 0.45 : 1,
                            }}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        );
    };

    // Clean isolated targeted print
    const handlePrint = () => {
        if (students.length === 0 || !classTeacherAssignment) {
            message.warning('No student data available to print');
            return;
        }

        const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
        const schoolAddress = schoolDetails?.address || '';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.error('Please allow popups to print.');
            return;
        }

        const rowsHtml = students
            .map((s, idx) => {
                const fn = attendanceState[s.id]?.fn || 'Present';
                const an = attendanceState[s.id]?.an || 'Present';
                const isEven = idx % 2 === 0;

                const getStatusColor = (st: string) => {
                    if (st === 'Present') return 'color: #059669; font-weight: 700;';
                    if (st === 'Absent') return 'color: #dc2626; font-weight: 700;';
                    if (st === 'OD') return 'color: #0284c7; font-weight: 700;';
                    return 'color: #d97706; font-weight: 700;';
                };

                return `
                <tr style="border-bottom: 1px solid #e2e8f0; ${isEven ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                    <td style="padding: 8px 10px; text-align: center; font-weight: 600; color: #64748b; width: 45px;">${s.roll_no || idx + 1}</td>
                    <td style="padding: 8px 10px; font-weight: 600; color: #0284c7;">${s.register_no}</td>
                    <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${s.full_name}</td>
                    <td style="padding: 8px 10px; color: #475569; text-transform: capitalize;">${s.gender || 'N/A'}</td>
                    <td style="padding: 8px 12px; text-align: center; ${getStatusColor(fn)}">${fn}</td>
                    <td style="padding: 8px 12px; text-align: center; ${getStatusColor(an)}">${an}</td>
                </tr>
            `;
            })
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Daily Student Attendance - Class ${classTeacherAssignment.class_name} ${classTeacherAssignment.section_name}</title>
                    <style>
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
                        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
                        .school-name { font-size: 20px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin: 0; }
                        .school-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .doc-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 8px; letter-spacing: 0.03em; }
                        .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; margin-bottom: 16px; font-size: 13px; }
                        .meta-item { display: flex; flex-direction: column; }
                        .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                        .meta-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
                        th { background: #0369a1; color: #ffffff; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
                        .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #475569; padding-top: 20px; }
                        .sign-line { border-top: 1px solid #94a3b8; width: 160px; text-align: center; padding-top: 6px; font-weight: 600; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="school-name">${schoolName}</div>
                        ${schoolAddress ? `<div class="school-sub">${schoolAddress}</div>` : ''}
                        <div class="doc-title">OFFICIAL DAILY STUDENT ATTENDANCE REGISTER</div>
                    </div>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Class & Section</span>
                            <span class="meta-val">Class ${classTeacherAssignment.class_name} - ${classTeacherAssignment.section_name}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Date</span>
                            <span class="meta-val">${attendanceDate.format('dddd, MMMM D, YYYY')}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Class Teacher</span>
                            <span class="meta-val">${user?.full_name || 'Class Teacher'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Attendance Summary</span>
                            <span class="meta-val">FN: ${metrics.fnPresent}/${metrics.total} | AN: ${metrics.anPresent}/${metrics.total}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45px; text-align: center;">Roll</th>
                                <th style="width: 110px;">Reg No</th>
                                <th>Student Full Name</th>
                                <th style="width: 80px;">Gender</th>
                                <th style="width: 100px; text-align: center;">Forenoon (FN)</th>
                                <th style="width: 100px; text-align: center;">Afternoon (AN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        <div class="sign-line">Class Teacher Signature</div>
                        <div class="sign-line">Principal / Head Signature</div>
                    </div>

                    <script>
                        window.onload = function() {
                            window.focus();
                            window.print();
                        };
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    // Vector PDF download
    const handleDownloadPdf = () => {
        if (students.length === 0 || !classTeacherAssignment) {
            message.warning('No student data available to export');
            return;
        }

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
            const schoolAddress = schoolDetails?.address || '';

            // Institution Header
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(3, 105, 161);
            doc.text(schoolName, 105, 16, { align: 'center' });

            if (schoolAddress) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                doc.text(schoolAddress, 105, 22, { align: 'center' });
            }

            // Title
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(
                `DAILY ATTENDANCE REGISTER: CLASS ${classTeacherAssignment.class_name} - ${classTeacherAssignment.section_name}`,
                105,
                schoolAddress ? 30 : 26,
                { align: 'center' }
            );

            // Metadata Box
            const metaY = schoolAddress ? 34 : 30;
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, metaY, 182, 14, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text(`Date: ${attendanceDate.format('DD/MM/YYYY')}`, 18, metaY + 6);
            doc.text(`Academic Year: ${selectedYear}`, 75, metaY + 6);
            doc.text(`Class Teacher: ${user?.full_name || 'N/A'}`, 135, metaY + 6);

            doc.setFont('helvetica', 'normal');
            doc.text(
                `Total Strength: ${metrics.total} | FN Present: ${metrics.fnPresent} (${metrics.fnRate}%) | AN Present: ${metrics.anPresent} (${metrics.anRate}%)`,
                18,
                metaY + 11
            );

            // Table
            const tableRows = students.map((s, idx) => [
                s.roll_no || `${idx + 1}`,
                s.register_no,
                s.full_name,
                s.gender || 'N/A',
                attendanceState[s.id]?.fn || 'Present',
                attendanceState[s.id]?.an || 'Present',
            ]);

            autoTable(doc, {
                startY: metaY + 18,
                head: [['Roll', 'Reg No', 'Student Full Name', 'Gender', 'Forenoon (FN)', 'Afternoon (AN)']],
                body: tableRows,
                theme: 'striped',
                headStyles: {
                    fillColor: [3, 105, 161],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                    halign: 'left',
                },
                styles: {
                    fontSize: 8.5,
                    cellPadding: 2.5,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2,
                },
                columnStyles: {
                    0: { cellWidth: 14, halign: 'center' },
                    1: { cellWidth: 32, fontStyle: 'bold', textColor: [2, 132, 199] },
                    2: { cellWidth: 60, fontStyle: 'bold' },
                    3: { cellWidth: 22 },
                    4: { cellWidth: 27, halign: 'center' },
                    5: { cellWidth: 27, halign: 'center' },
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
            });

            const fileName = `Attendance_Class_${classTeacherAssignment.class_name}_${classTeacherAssignment.section_name}_${attendanceDate.format('YYYYMMDD')}.pdf`;
            doc.save(fileName);
            message.success('Attendance PDF downloaded successfully');
        } catch (err) {
            console.error('PDF generation error:', err);
            message.error('Failed to generate PDF');
        }
    };

    // Columns for Ant Design Table
    const columns = [
        {
            title: 'Roll',
            dataIndex: 'roll_no',
            key: 'roll_no',
            width: 75,
            align: 'center' as const,
            render: (text: string, _: any, idx: number) => (
                <span
                    style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        color: '#475569',
                    }}
                >
                    {text || idx + 1}
                </span>
            ),
        },
        {
            title: 'Student Details',
            key: 'student',
            render: (_: any, record: Student) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <StudentAvatar name={record.full_name} photoUrl={record.photo_url} size={40} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>
                            {record.full_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span
                                style={{
                                    fontSize: '11px',
                                    color: '#0284c7',
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    backgroundColor: '#f0f9ff',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    border: '1px solid #bae6fd',
                                }}
                            >
                                {record.register_no}
                            </span>
                            {record.gender && (
                                <span
                                    style={{
                                        fontSize: '11px',
                                        color: '#64748b',
                                        textTransform: 'capitalize',
                                    }}
                                >
                                    • {record.gender}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SunOutlined style={{ color: '#f59e0b' }} />
                    <span>Forenoon (FN)</span>
                    <span
                        style={{
                            fontSize: '10px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700,
                        }}
                    >
                        Morning
                    </span>
                </div>
            ),
            key: 'fn',
            width: 280,
            render: (_: any, record: Student) => (
                <StatusToggleBar
                    currentStatus={attendanceState[record.id]?.fn || 'Present'}
                    disabled={isAfternoon || isDayComplete}
                    onChange={val => handleStatusChange(record.id, 'fn', val)}
                />
            ),
        },
        {
            title: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MoonOutlined style={{ color: '#6366f1' }} />
                    <span>Afternoon (AN)</span>
                    <span
                        style={{
                            fontSize: '10px',
                            backgroundColor: '#e0e7ff',
                            color: '#3730a3',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            fontWeight: 700,
                        }}
                    >
                        Afternoon
                    </span>
                </div>
            ),
            key: 'an',
            width: 280,
            render: (_: any, record: Student) => (
                <StatusToggleBar
                    currentStatus={attendanceState[record.id]?.an || 'Present'}
                    disabled={!isAfternoon || isDayComplete}
                    onChange={val => handleStatusChange(record.id, 'an', val)}
                />
            ),
        },
    ];

    const isLoading = statsLoading || studentsLoading;
    const finalError = statsError;

    // Loading State
    if (statsLoading) {
        return (
            <div
                style={{
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    backgroundColor: '#f8fafc',
                }}
            >
                <Spin size="large" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#64748b' }}>
                    Loading class teacher assignments...
                </span>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                backgroundColor: '#f8fafc',
                padding: '20px 10px',
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
                    {/* Navigation, Badge & Title */}
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
                                    color: '#b45309',
                                    backgroundColor: '#fffbeb',
                                    border: '1px solid #fde68a',
                                    borderRadius: '8px',
                                }}
                            >
                                <CrownOutlined style={{ color: '#d97706' }} />
                                <span>Class Teacher: {user?.full_name || 'Teacher'}</span>
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
                            <span>Student Attendance Register</span>
                        </h1>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                            Mark and monitor daily Forenoon (FN) and Afternoon (AN) attendance for your assigned class.
                        </p>
                    </div>

                    {/* Controls: Academic Year, Live Clock & Print/PDF */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        {/* Live Clock & Session indicator */}
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#1e293b',
                            }}
                        >
                            <ClockCircleOutlined style={{ color: '#0284c7' }} />
                            <span>{currentTime}</span>
                            <span
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    backgroundColor: isAfternoon ? '#e0e7ff' : '#fef3c7',
                                    color: isAfternoon ? '#4338ca' : '#92400e',
                                }}
                            >
                                {isAfternoon ? 'AN Session Active' : 'FN Session Active'}
                            </span>
                        </div>

                        {/* Academic Year Selector */}
                        <div style={{ minWidth: '180px' }}>
                            <Select
                                placeholder="Academic Year"
                                style={{ width: '100%' }}
                                size="middle"
                                value={selectedYear}
                                onChange={val => setSelectedYear(val)}
                                loading={statsLoading}
                            >
                                {academicYearOptions.map(year => (
                                    <Option key={year} value={year}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CalendarOutlined style={{ color: '#0284c7' }} />
                                            <span>{year}</span>
                                            {year === stats.activeAcademicYear && (
                                                <span
                                                    style={{
                                                        fontSize: '10px',
                                                        backgroundColor: '#dcfce7',
                                                        color: '#15803d',
                                                        fontWeight: 700,
                                                        padding: '1px 5px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    Current
                                                </span>
                                            )}
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* Print Button */}
                        <Tooltip title="Print Official Attendance Register">
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={students.length === 0}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: '#ffffff',
                                    color: '#334155',
                                    cursor: students.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: students.length === 0 ? 0.5 : 1,
                                    fontSize: '15px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                            >
                                <PrinterOutlined />
                            </button>
                        </Tooltip>

                        {/* PDF Export Button */}
                        <Tooltip title="Export Attendance Vector PDF">
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={students.length === 0}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '8px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #bae6fd',
                                    backgroundColor: '#f0f9ff',
                                    color: '#0369a1',
                                    cursor: students.length === 0 ? 'not-allowed' : 'pointer',
                                    opacity: students.length === 0 ? 0.5 : 1,
                                    fontSize: '15px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                }}
                            >
                                <FilePdfOutlined />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Class Details Banner */}
                {classTeacherAssignment && (
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
                                Assigned Classroom:
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
                                Class {classTeacherAssignment.class_name} - Section {classTeacherAssignment.section_name}
                            </span>
                            <span style={{ color: '#64748b', fontWeight: 500 }}>
                                ({classTeacherAssignment.academic_year})
                            </span>
                            <span
                                style={{
                                    fontSize: '12px',
                                    color: '#475569',
                                    backgroundColor: '#f1f5f9',
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                }}
                            >
                                {attendanceDate.format('dddd, MMMM D, YYYY')}
                            </span>
                        </div>

                        {/* Session status indicator pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {isDayComplete ? (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: '#15803d',
                                        backgroundColor: '#dcfce7',
                                        border: '1px solid #86efac',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                    }}
                                >
                                    <CheckCircleOutlined /> Both Sessions Complete
                                </span>
                            ) : (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: isAfternoon ? '#4338ca' : '#b45309',
                                        backgroundColor: isAfternoon ? '#e0e7ff' : '#fef3c7',
                                        border: isAfternoon ? '1px solid #c7d2fe' : '1px solid #fde68a',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                    }}
                                >
                                    {isAfternoon ? <MoonOutlined /> : <SunOutlined />}
                                    <span>
                                        {isAfternoon ? 'Afternoon Recording Open' : 'Forenoon Recording Open'}
                                    </span>
                                </span>
                            )}

                            <button
                                type="button"
                                onClick={() => setRefreshKey(k => k + 1)}
                                title="Refresh student data and attendance"
                                style={{
                                    border: '1px solid #e2e8f0',
                                    backgroundColor: '#ffffff',
                                    padding: '5px 9px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                }}
                            >
                                <ReloadOutlined />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {finalError && (
                <Alert
                    message="Error"
                    description={finalError}
                    type="error"
                    showIcon
                    style={{ borderRadius: '12px' }}
                />
            )}

            {/* Check if user is assigned as Class Teacher */}
            {classTeacherAssignment ? (
                <>
                    {/* 2. Attendance Summary Metric Cards */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                            gap: '16px',
                        }}
                    >
                        {/* Total Strength */}
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
                                    Total Strength
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                                    {metrics.total} <span style={{ fontSize: '13px', fontWeight: 500, color: '#64748b' }}>Students</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Class {classTeacherAssignment.class_name} - {classTeacherAssignment.section_name}
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
                                <TeamOutlined />
                            </div>
                        </div>

                        {/* Forenoon (FN) Present */}
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
                                    FN Present (Morning)
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                                    {metrics.fnPresent} <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>({metrics.fnRate}%)</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Absent: <strong style={{ color: '#dc2626' }}>{metrics.fnAbsent}</strong> | OD/Late: {metrics.fnOD + metrics.fnLate}
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
                                <CheckCircleOutlined />
                            </div>
                        </div>

                        {/* Afternoon (AN) Present */}
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
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    AN Present (Afternoon)
                                </span>
                                <div style={{ fontSize: '24px', fontWeight: 800, color: '#4338ca', marginTop: '2px' }}>
                                    {metrics.anPresent} <span style={{ fontSize: '13px', fontWeight: 600, color: '#4338ca' }}>({metrics.anRate}%)</span>
                                </div>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                    Absent: <strong style={{ color: '#dc2626' }}>{metrics.anAbsent}</strong> | OD/Late: {metrics.anOD + metrics.anLate}
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: '#e0e7ff',
                                    color: '#4338ca',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: '1px solid #c7d2fe',
                                }}
                            >
                                <CheckCircleOutlined />
                            </div>
                        </div>

                        {/* Submission State Card */}
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
                                    Today's Status
                                </span>
                                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>FN Record:</span>
                                        {isFnSubmitted ? (
                                            <span style={{ color: '#059669', fontWeight: 700 }}>✓ Submitted</span>
                                        ) : (
                                            <span style={{ color: '#d97706', fontWeight: 700 }}>Pending</span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>AN Record:</span>
                                        {isAnSubmitted ? (
                                            <span style={{ color: '#059669', fontWeight: 700 }}>✓ Submitted</span>
                                        ) : (
                                            <span style={{ color: '#d97706', fontWeight: 700 }}>Pending</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '10px',
                                    backgroundColor: isDayComplete ? '#dcfce7' : '#fffbeb',
                                    color: isDayComplete ? '#15803d' : '#b45309',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '18px',
                                    border: isDayComplete ? '1px solid #86efac' : '1px solid #fde68a',
                                }}
                            >
                                {isDayComplete ? <CheckOutlined /> : <ClockCircleOutlined />}
                            </div>
                        </div>
                    </div>

                    {/* 3. Search & Bulk Actions Bar */}
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
                        {/* Search & Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 320px' }}>
                            <div style={{ width: '260px' }}>
                                <Input
                                    placeholder="Search by student name, roll, reg..."
                                    prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    allowClear
                                    style={{ borderRadius: '8px' }}
                                />
                            </div>

                            <div style={{ width: '150px' }}>
                                <Select
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    style={{ width: '100%' }}
                                >
                                    <Option value="all">All Statuses</Option>
                                    <Option value="Present">Present Only</Option>
                                    <Option value="Absent">Absent Only</Option>
                                    <Option value="OD">OD Only</Option>
                                    <Option value="Late">Late Only</Option>
                                </Select>
                            </div>
                        </div>

                        {/* Batch Action Quick Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                                Quick Bulk:
                            </span>

                            {!isAfternoon && !isDayComplete && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkMark('fn', 'Present')}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: '#ecfdf5',
                                            color: '#059669',
                                            border: '1px solid #a7f3d0',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <CheckOutlined /> Mark All FN Present
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkMark('fn', 'Absent')}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: '#fef2f2',
                                            color: '#dc2626',
                                            border: '1px solid #fecaca',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <CloseCircleOutlined /> Mark All FN Absent
                                    </button>
                                </>
                            )}

                            {isAfternoon && !isDayComplete && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkMark('an', 'Present')}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: '#e0e7ff',
                                            color: '#4338ca',
                                            border: '1px solid #c7d2fe',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <CheckOutlined /> Mark All AN Present
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleBulkMark('an', 'Absent')}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            backgroundColor: '#fef2f2',
                                            color: '#dc2626',
                                            border: '1px solid #fecaca',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                        }}
                                    >
                                        <CloseCircleOutlined /> Mark All AN Absent
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Notice if Day is Complete */}
                    {isDayComplete && (
                        <Alert
                            message="Attendance Day Completed"
                            description="Attendance for today has already been fully recorded for both Forenoon and Afternoon sessions. You can view or print the register."
                            type="success"
                            showIcon
                            style={{ borderRadius: '12px' }}
                        />
                    )}

                    {/* 4. Student Attendance Table */}
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
                            <Table
                                columns={columns}
                                dataSource={filteredStudents}
                                rowKey="id"
                                pagination={{
                                    pageSize: 50,
                                    showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total} students`,
                                    style: { padding: '16px 20px' },
                                }}
                                scroll={{ x: 800 }}
                            />
                        </Spin>
                    </div>

                    {/* 5. Sticky Bottom Action Bar for Attendance Submissions */}
                    <div
                        style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '16px 24px',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
                        }}
                    >
                        {/* Status Summary Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <InfoCircleOutlined style={{ color: '#0284c7', fontSize: '18px' }} />
                            <div>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                                    {isAfternoon
                                        ? `Afternoon Session: ${metrics.anPresent} Present, ${metrics.anAbsent} Absent`
                                        : `Forenoon Session: ${metrics.fnPresent} Present, ${metrics.fnAbsent} Absent`}
                                </span>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                    {isAfternoon
                                        ? 'Ensure afternoon attendance is reviewed before submitting.'
                                        : 'Submit forenoon attendance before 12:00 PM.'}
                                </div>
                            </div>
                        </div>

                        {/* Submission Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            {/* Submit Forenoon Button */}
                            <button
                                type="button"
                                onClick={handleSubmitForenoon}
                                disabled={isAfternoon || isDayComplete || attendanceLoading || students.length === 0}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    backgroundColor: isAfternoon || isDayComplete ? '#f1f5f9' : '#0284c7',
                                    color: isAfternoon || isDayComplete ? '#94a3b8' : '#ffffff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: isAfternoon || isDayComplete ? 'not-allowed' : 'pointer',
                                    boxShadow: isAfternoon || isDayComplete ? 'none' : '0 2px 4px rgba(2, 132, 199, 0.25)',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <SunOutlined />
                                <span>{attendanceLoading ? 'Saving...' : 'Submit Forenoon (FN)'}</span>
                            </button>

                            {/* Submit Afternoon Button */}
                            <button
                                type="button"
                                onClick={handleSubmitAfternoon}
                                disabled={!isAfternoon || isDayComplete || attendanceLoading || students.length === 0}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '9px 18px',
                                    borderRadius: '10px',
                                    backgroundColor: !isAfternoon || isDayComplete ? '#f1f5f9' : '#4f46e5',
                                    color: !isAfternoon || isDayComplete ? '#94a3b8' : '#ffffff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    cursor: !isAfternoon || isDayComplete ? 'not-allowed' : 'pointer',
                                    boxShadow: !isAfternoon || isDayComplete ? 'none' : '0 2px 4px rgba(79, 70, 229, 0.25)',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <MoonOutlined />
                                <span>{attendanceLoading ? 'Saving...' : 'Submit Afternoon (AN)'}</span>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                /* Empty state when user is not a class teacher for the selected academic year */
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
                            <div style={{ maxWidth: '420px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                                    No Class Teacher Assignment Found
                                </span>
                                <span style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                                    This attendance register is strictly dedicated to Class Teachers. You are not assigned as a Class Teacher for academic year{' '}
                                    <strong style={{ color: '#0284c7' }}>{selectedYear || 'N/A'}</strong>.
                                </span>
                                <span style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                    Please select an alternative academic year or check with the administrator to update your class teacher role.
                                </span>
                            </div>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default StudentAttendance;