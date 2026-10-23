import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Table, Spin, Alert, Empty, Select, Tooltip, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ClockCircleOutlined,
    UserOutlined,
    BookOutlined,
    TeamOutlined,
    ArrowLeftOutlined,
    AppstoreOutlined,
    TableOutlined,
    PrinterOutlined,
    FilePdfOutlined,
    StarOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    EnvironmentOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherTimetableDataRequest, type TimetableEntry } from '../../store/features/teacher-timetable/teacherTimetableSlice';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';

const { Option } = Select;

type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

const ALL_DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface PersonalPeriod extends TimetableEntry {
    class_name: string;
    section_name: string;
    time: string;
}

const PersonalTimetable: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetables, loading: timetableLoading, error: timetableError } = useSelector((state: RootState) => state.teacherTimetable);
    const { calendars, loading: dashboardLoading, error: dashboardError } = useSelector((state: RootState) => state.teacherDashboard);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

    // Day tracker for mobile / daily view
    const todayName = useMemo(() => dayjs().format('dddd') as Day, []);
    const [activeDayTab, setActiveDayTab] = useState<Day>(
        ALL_DAYS.includes(todayName) ? todayName : 'Monday'
    );

    // Live 30-second time ticker for live period status
    const [nowTime, setNowTime] = useState<dayjs.Dayjs>(dayjs());
    useEffect(() => {
        const interval = setInterval(() => setNowTime(dayjs()), 30000);
        return () => clearInterval(interval);
    }, []);

    const academicYears = useMemo(() => calendars.filter(cal => cal.status === 'Active'), [calendars]);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchTeacherTimetableDataRequest({ organizationKey: user.organization_key }));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (academicYears && academicYears.length > 0 && !selectedYear) {
            const currentYear = academicYears.find(y => y.is_current)?.academic_year;
            setSelectedYear(currentYear || academicYears[0].academic_year);
        }
    }, [academicYears, selectedYear]);

    // Parse all personal periods assigned to this teacher
    const personalSchedule = useMemo(() => {
        if (!timetables || !user?.full_name || !selectedYear) {
            return [];
        }

        const myPeriods: PersonalPeriod[] = [];
        const dayOrder: { [key in Day]: number } = {
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6
        };

        const relevantTimetables = timetables.filter(tt => tt.academic_year === selectedYear);

        relevantTimetables.forEach(tt => {
            const timeSlots = tt.number_of_periods === 4 ? [
                { period: 0, time: '08:15 - 09:00' }, { period: 1, time: '09:15 - 10:45' },
                { period: 2, time: '11:00 - 12:30' }, { period: 3, time: '01:15 - 02:45' },
                { period: 4, time: '03:00 - 04:30' }, { period: 99, time: '04:30 - 05:15' }
            ] : [
                { period: 0, time: '08:15 - 09:00' }, { period: 1, time: '09:15 - 10:00' }, 
                { period: 2, time: '10:00 - 10:45' }, { period: 3, time: '11:00 - 11:45' }, 
                { period: 4, time: '11:45 - 12:30' }, { period: 5, time: '01:15 - 02:00' },
                { period: 6, time: '02:00 - 02:45' }, { period: 7, time: '03:00 - 03:45' },
                { period: 8, time: '03:45 - 04:30' }, { period: 99, time: '04:30 - 05:15' }
            ];
            const timeMap = new Map(timeSlots.map(s => [s.period, s.time]));

            tt.timetable_data.forEach(entry => {
                if (entry.teacher_name === user.full_name) {
                    myPeriods.push({
                        ...entry,
                        class_name: tt.class_name,
                        section_name: tt.section_name,
                        time: timeMap.get(entry.period) || 'N/A'
                    });
                }
            });
        });

        // Sort the periods chronologically by day and then by the period number
        return myPeriods.sort((a, b) => {
            const dayDiff = dayOrder[a.day] - dayOrder[b.day];
            if (dayDiff !== 0) return dayDiff;
            return a.period - b.period;
        });

    }, [timetables, user?.full_name, selectedYear]);

    // Helper: evaluate period live time status
    const getPeriodLiveStatus = (timeRange: string, day: Day) => {
        if (day !== todayName) return { status: 'none', label: '' };
        
        try {
            const [startPart, endPartWithAmPm] = timeRange.split(' - ').map(s => s.trim());
            const hasPM = timeRange.toLowerCase().includes('pm');
            const hasAM = timeRange.toLowerCase().includes('am');

            const parseMinutes = (timeStr: string, defaultPM: boolean) => {
                const clean = timeStr.replace(/(am|pm)/i, '').trim();
                const [hStr, mStr] = clean.split(':');
                let h = parseInt(hStr, 10);
                const m = parseInt(mStr || '0', 10);

                if (hasPM || defaultPM) {
                    if (h < 12 && (h >= 1 && h <= 6)) {
                        h += 12;
                    }
                }
                if (hasAM && h === 12) h = 0;
                return h * 60 + m;
            };

            const isPMTime = hasPM || (!hasAM && parseInt(startPart.split(':')[0], 10) < 7 && parseInt(startPart.split(':')[0], 10) >= 1);
            const startMins = parseMinutes(startPart, isPMTime);
            const endMins = parseMinutes(endPartWithAmPm, isPMTime);
            const currentMins = nowTime.hour() * 60 + nowTime.minute();

            if (currentMins > endMins) return { status: 'completed', label: 'Completed' };
            if (currentMins >= startMins && currentMins <= endMins) return { status: 'ongoing', label: 'Live Now' };
            return { status: 'upcoming', label: 'Upcoming' };
        } catch {
            return { status: 'none', label: '' };
        }
    };

    // Metrics summary
    const metrics = useMemo(() => {
        const totalPeriods = personalSchedule.length;
        const classesSet = new Set(personalSchedule.map(p => `${p.class_name}-${p.section_name}`));
        const subjectsSet = new Set(personalSchedule.map(p => p.subject_name));
        const todayPeriods = personalSchedule.filter(p => p.day === todayName).length;

        return {
            totalPeriods,
            uniqueClasses: Array.from(classesSet),
            uniqueSubjects: Array.from(subjectsSet),
            todayPeriods,
        };
    }, [personalSchedule, todayName]);

    // Active day periods for card view
    const activeDaySchedule = useMemo(() => {
        return personalSchedule.filter(p => p.day === activeDayTab);
    }, [personalSchedule, activeDayTab]);

    // Format Period Label helper
    const getPeriodName = (periodNum: number) => {
        if (periodNum === 0) return 'Morning Extra';
        if (periodNum === 99) return 'Evening Extra';
        return `Period ${periodNum}`;
    };

    // Columns config for Weekly Table
    const columns: ColumnsType<PersonalPeriod> = [
        {
            title: 'Day',
            dataIndex: 'day',
            key: 'day',
            width: 140,
            render: (day: Day) => {
                const isToday = day === todayName;
                return (
                    <div className="flex items-center gap-2 py-1">
                        <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                            {day}
                        </span>
                        {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Today
                            </span>
                        )}
                    </div>
                );
            },
            onCell: (_, index) => {
                if (!personalSchedule || index === undefined || !personalSchedule[index]) return {};
                const rowSpan = personalSchedule.filter(r => r.day === personalSchedule[index!].day).length;
                if (personalSchedule.findIndex(r => r.day === personalSchedule[index!].day) === index) {
                    return { rowSpan };
                }
                return { rowSpan: 0 };
            },
        },
        {
            title: 'Period & Timing',
            dataIndex: 'time',
            key: 'time',
            width: 190,
            render: (time: string, record: PersonalPeriod) => {
                const liveStatus = getPeriodLiveStatus(time, record.day);
                const isOngoing = liveStatus.status === 'ongoing';

                return (
                    <div className="flex items-center gap-2.5">
                        <div className={`w-11 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isOngoing ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                            {record.period === 0 ? 'M-EXT' : record.period === 99 ? 'E-EXT' : `P-${record.period}`}
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-800 truncate">{time}</div>
                            <div className="text-[11px] text-slate-400 font-medium">
                                {getPeriodName(record.period)}
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            title: 'Subject',
            dataIndex: 'subject_name',
            key: 'subject_name',
            width: 180,
            render: (subject: string) => (
                <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 flex-shrink-0">
                        {subject.charAt(0).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-slate-900">{subject}</span>
                </div>
            )
        },
        {
            title: 'Assigned Class',
            key: 'class',
            width: 180,
            render: (_: any, record: PersonalPeriod) => (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 font-bold text-xs text-slate-800">
                    <TeamOutlined className="text-blue-600 text-[11px]" />
                    <span>Class {record.class_name} - {record.section_name}</span>
                </div>
            )
        },
        {
            title: 'Status',
            key: 'status',
            width: 130,
            render: (_: any, record: PersonalPeriod) => {
                const liveStatus = getPeriodLiveStatus(record.time, record.day);
                if (!liveStatus.label) return <span className="text-slate-400 text-xs">-</span>;

                const isOngoing = liveStatus.status === 'ongoing';
                const isCompleted = liveStatus.status === 'completed';

                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isOngoing 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs' 
                            : isCompleted 
                            ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}>
                        {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />}
                        {liveStatus.label}
                    </span>
                );
            }
        }
    ];

    // Download Targeted PDF
    const handleDownloadPdf = () => {
        if (personalSchedule.length === 0) {
            message.warning('No scheduled periods available to export.');
            return;
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();

        // Institutional Header
        const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(schoolName, pageWidth / 2, 32, { align: 'center' });

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        if (schoolDetails?.address) {
            doc.text(schoolDetails.address, pageWidth / 2, 46, { align: 'center' });
        }

        // Subtitle & Teacher Details
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text(`FACULTY PERSONAL TIMETABLE SCHEDULE`, 40, 74);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(
            `Faculty: ${user?.full_name || 'Teacher'}  |  Academic Year: ${selectedYear || 'Current'}  |  Generated: ${dayjs().format('MMMM D, YYYY')}`,
            40,
            88
        );

        // Table Columns & Body
        const head = [['Day', 'Period', 'Time Window', 'Subject', 'Class & Section']];
        const body = personalSchedule.map(p => [
            p.day,
            getPeriodName(p.period),
            p.time,
            p.subject_name,
            `Class ${p.class_name} - ${p.section_name}`
        ]);

        autoTable(doc, {
            head,
            body,
            startY: 102,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8.5,
                halign: 'center',
                valign: 'middle',
                cellPadding: 5,
            },
            headStyles: {
                fillColor: [30, 41, 59], // slate-800
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center',
            },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 80, halign: 'left' },
                3: { fontStyle: 'bold', textColor: [37, 99, 235] },
            },
        });

        const safeName = (user?.full_name || 'Faculty').replace(/\s+/g, '_');
        doc.save(`Personal_Timetable_${safeName}_AY${selectedYear || ''}.pdf`);
    };

    // Targeted Clean Print
    const handlePrint = () => {
        if (personalSchedule.length === 0) {
            message.warning('No scheduled periods available to print.');
            return;
        }

        const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
        const schoolAddress = schoolDetails?.address || '';
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        const printHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Personal Timetable - ${user?.full_name || 'Faculty'}</title>
                    <style>
                        @page { size: portrait; margin: 10mm; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                            color: #0f172a;
                            margin: 0;
                            padding: 16px;
                            background: #fff;
                        }
                        .header-container {
                            text-align: center;
                            margin-bottom: 14px;
                            border-bottom: 2px solid #2563eb;
                            padding-bottom: 10px;
                        }
                        .school-title {
                            font-size: 20px;
                            font-weight: 800;
                            color: #0f172a;
                            margin: 0 0 2px 0;
                        }
                        .school-sub {
                            font-size: 11px;
                            color: #64748b;
                            margin: 0 0 6px 0;
                        }
                        .doc-title {
                            font-size: 14px;
                            font-weight: 700;
                            color: #2563eb;
                            margin: 0;
                        }
                        .meta-bar {
                            display: flex;
                            justify-content: space-between;
                            font-size: 11px;
                            color: #475569;
                            margin-top: 6px;
                            font-weight: 500;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 11px;
                            margin-top: 10px;
                        }
                        th, td {
                            border: 1px solid #cbd5e1;
                            padding: 8px 10px;
                            text-align: left;
                            vertical-align: middle;
                        }
                        th {
                            background-color: #1e293b;
                            color: #ffffff;
                            font-weight: 700;
                            font-size: 11px;
                            text-align: center;
                        }
                        .day-cell {
                            font-weight: 700;
                            background-color: #f8fafc;
                        }
                        .subject-cell {
                            font-weight: 700;
                            color: #1d4ed8;
                        }
                        .class-badge {
                            display: inline-block;
                            background: #f1f5f9;
                            border: 1px solid #cbd5e1;
                            padding: 2px 6px;
                            border-radius: 4px;
                            font-weight: 600;
                        }
                        .footer-note {
                            display: flex;
                            justify-content: space-between;
                            margin-top: 14px;
                            font-size: 9px;
                            color: #94a3b8;
                            border-top: 1px solid #e2e8f0;
                            padding-top: 6px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header-container">
                        <h1 class="school-title">${schoolName}</h1>
                        ${schoolAddress ? `<p class="school-sub">${schoolAddress}</p>` : ''}
                        <div class="doc-title">FACULTY PERSONAL TEACHING TIMETABLE</div>
                        <div class="meta-bar">
                            <span><strong>Faculty Member:</strong> ${user?.full_name || 'Teacher'}</span>
                            <span><strong>Academic Year:</strong> ${selectedYear || 'Current'}</span>
                            <span><strong>Generated:</strong> ${dayjs().format('DD/MM/YYYY, hh:mm A')}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 110px;">Day</th>
                                <th style="width: 120px;">Period</th>
                                <th style="width: 130px;">Time Window</th>
                                <th>Subject</th>
                                <th>Class & Section</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${personalSchedule.map(p => `
                                <tr>
                                    <td class="day-cell">${p.day}</td>
                                    <td>${getPeriodName(p.period)}</td>
                                    <td>${p.time}</td>
                                    <td class="subject-cell">${p.subject_name}</td>
                                    <td><span class="class-badge">Class ${p.class_name} - ${p.section_name}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer-note">
                        <span>Total Assigned: ${personalSchedule.length} Teaching Periods per week.</span>
                        <span>Official Faculty Schedule • Sri Gayathri Matric Hr Sec School</span>
                    </div>

                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(printHtml);
        printWindow.document.close();
    };

    const loading = dashboardLoading || timetableLoading;
    const error = dashboardError || timetableError;

    if (loading && timetables.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200">
                <Spin size="large" />
                <div className="text-sm font-semibold text-slate-600 mt-4">
                    Loading your personal teaching timetable...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert
                    message="Schedule Synchronization Error"
                    description={error}
                    type="error"
                    showIcon
                    className="rounded-xl border border-rose-200 shadow-sm"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* ====================================================================
                HEADER & ACADEMIC YEAR SELECTOR BAR (RESPONSIVE)
                ==================================================================== */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Navigation & Title */}
                    <div className="flex items-start sm:items-center gap-3">
                        <button
                            type="button"
                            onClick={() => dispatch(setCurrentPage('staffdashboard'))}
                            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
                            title="Back to Dashboard"
                        >
                            <ArrowLeftOutlined className="text-sm" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 m-0 tracking-tight">
                                    Handling Class Time Table
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    {user?.full_name || 'Faculty Member'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">
                                Complete weekly lesson schedule, assigned teaching periods, and classroom timelines.
                            </p>
                        </div>
                    </div>

                    {/* Right: Academic Year Select & Action Controls */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        {/* AY Dropdown */}
                        <div className="min-w-[200px] flex-1">
                            <Select
                                value={selectedYear}
                                onChange={setSelectedYear}
                                placeholder="Select Academic Year"
                                className="w-full h-10 rounded-xl"
                                loading={loading}
                            >
                                {academicYears.map(year => (
                                    <Option key={year.id} value={year.academic_year}>
                                        <div className="flex items-center justify-between py-0.5">
                                            <span className="font-semibold text-slate-800">
                                                AY {year.academic_year}
                                            </span>
                                            {year.is_current && (
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                                                    Current
                                                </span>
                                            )}
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* View Switcher: Table vs Day Cards */}
                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'table' 
                                        ? 'bg-white text-blue-700 shadow-sm' 
                                        : 'bg-transparent text-slate-600 hover:text-slate-900'
                                }`}
                                title="Full Weekly Table"
                            >
                                <TableOutlined className="text-xs" />
                                <span className="hidden xs:inline">Weekly Table</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'cards' 
                                        ? 'bg-white text-blue-700 shadow-sm' 
                                        : 'bg-transparent text-slate-600 hover:text-slate-900'
                                }`}
                                title="Day Timeline Cards"
                            >
                                <AppstoreOutlined className="text-xs" />
                                <span className="hidden xs:inline">Day Cards</span>
                            </button>
                        </div>

                        {/* PDF Export Button */}
                        <button
                            type="button"
                            onClick={handleDownloadPdf}
                            className="h-10 px-3.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer flex-shrink-0"
                            title="Download Clean Personal Schedule PDF"
                        >
                            <FilePdfOutlined className="text-sm text-blue-600" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Targeted Print Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer flex-shrink-0"
                            title="Print Personal Schedule Sheet"
                        >
                            <PrinterOutlined className="text-xs text-slate-600" />
                            <span className="hidden sm:inline">Print</span>
                        </button>
                    </div>
                </div>

                {/* ====================================================================
                    KPI STAT CARDS (4 RESPONSIVE TILES)
                    ==================================================================== */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-5 border-t border-slate-100">
                    {/* Stat 1: Weekly Load */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                            <ClockCircleOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                Weekly Load
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                {metrics.totalPeriods} Periods
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                Across Monday to Saturday
                            </div>
                        </div>
                    </div>

                    {/* Stat 2: Classes Assigned */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
                            <TeamOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                Assigned Classes
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                {metrics.uniqueClasses.length} Classes
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                {metrics.uniqueClasses.join(', ') || 'None Assigned'}
                            </div>
                        </div>
                    </div>

                    {/* Stat 3: Subject Portfolio */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-700 flex-shrink-0">
                            <BookOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                Subject Portfolio
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                {metrics.uniqueSubjects.length} Subject(s)
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                {metrics.uniqueSubjects.join(', ') || 'No mapped subjects'}
                            </div>
                        </div>
                    </div>

                    {/* Stat 4: Today's Teaching Schedule */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 flex-shrink-0">
                            <StarOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider truncate">
                                Today ({todayName})
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-emerald-950 truncate">
                                {metrics.todayPeriods} Periods Scheduled
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium truncate">
                                Current active session
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-bar with Live Time */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                        <CheckCircleOutlined className="text-emerald-500" />
                        <span>Showing assigned teaching classes for Academic Year <strong>{selectedYear || 'Current'}</strong></span>
                    </div>
                    <div>
                        Current System Time: <strong className="text-slate-800">{nowTime.format('hh:mm A')}</strong>
                    </div>
                </div>
            </div>

            {/* ====================================================================
                MAIN CONTENT: WEEKLY TABLE OR MOBILE DAY CARDS
                ==================================================================== */}
            {personalSchedule.length > 0 ? (
                viewMode === 'table' ? (
                    /* ==================== VIEW 1: FULL WEEKLY TABLE ==================== */
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                                <TableOutlined className="text-blue-600 text-base" />
                                <h3 className="text-sm font-bold text-slate-900 m-0">
                                    Weekly Personal Teaching Schedule • AY {selectedYear}
                                </h3>
                            </div>
                            <div className="text-xs text-slate-500">
                                Total: {personalSchedule.length} periods mapped across your weekly timetable
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <Table
                                columns={columns}
                                dataSource={personalSchedule}
                                rowKey={record => `${record.day}-${record.period}-${record.class_name}-${record.section_name}`}
                                bordered
                                scroll={{ x: 800 }}
                                pagination={false}
                                rowClassName={(record) => record.day === todayName ? 'bg-blue-50/15' : ''}
                            />
                        </div>
                    </div>
                ) : (
                    /* ==================== VIEW 2: DAY SCHEDULE CARDS (MOBILE OPTIMIZED) ==================== */
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6">
                        {/* Day Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-100 mb-5 scrollbar-thin">
                            {ALL_DAYS.map(day => {
                                const isDayToday = day === todayName;
                                const isSelected = day === activeDayTab;
                                const countForDay = personalSchedule.filter(p => p.day === day).length;

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => setActiveDayTab(day)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                            isSelected
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                                        }`}
                                    >
                                        <span>{day}</span>
                                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                            isSelected ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700'
                                        }`}>
                                            {countForDay}
                                        </span>
                                        {isDayToday && (
                                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                                                isSelected ? 'bg-white text-blue-700' : 'bg-emerald-100 text-emerald-800'
                                            }`}>
                                                Today
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Cards for active day */}
                        {activeDaySchedule.length > 0 ? (
                            <div className="space-y-3">
                                {activeDaySchedule.map((p) => {
                                    const liveStatus = getPeriodLiveStatus(p.time, p.day);
                                    const isOngoing = liveStatus.status === 'ongoing';
                                    const isCompleted = liveStatus.status === 'completed';

                                    return (
                                        <div
                                            key={`${p.day}-${p.period}-${p.class_name}-${p.section_name}`}
                                            className={`p-4 rounded-xl border transition-all ${
                                                isOngoing 
                                                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400 shadow-sm' 
                                                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                {/* Left: Timing badge + details */}
                                                <div className="flex items-start sm:items-center gap-3.5">
                                                    <div className={`w-14 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center ${
                                                        isOngoing
                                                            ? 'bg-emerald-600 text-white shadow-xs'
                                                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    }`}>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                                            {p.period === 0 ? 'M-EXT' : p.period === 99 ? 'E-EXT' : `P-${p.period}`}
                                                        </span>
                                                        <span className="text-[11px] font-black">
                                                            {p.time.split(' - ')[0]}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-sm font-bold text-slate-900 m-0">
                                                                {p.subject_name}
                                                            </h4>
                                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                                Class {p.class_name} - {p.section_name}
                                                            </span>
                                                            {isOngoing && (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
                                                                    Live Now
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <ClockCircleOutlined className="text-slate-400" />
                                                                {p.time} ({getPeriodName(p.period)})
                                                            </span>
                                                            <span className="flex items-center gap-1 font-medium">
                                                                <CalendarOutlined className="text-slate-400" />
                                                                AY {selectedYear}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Live Status Pill */}
                                                <div className="flex items-center self-end sm:self-center">
                                                    {liveStatus.label && (
                                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                                            isOngoing
                                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                : isCompleted
                                                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                        }`}>
                                                            {liveStatus.label}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center my-auto">
                                <ClockCircleOutlined className="text-2xl text-slate-400 mb-2" />
                                <p className="text-sm font-semibold text-slate-700 mb-0.5">
                                    No Teaching Periods for {activeDayTab}
                                </p>
                                <p className="text-xs text-slate-500 m-0">
                                    You have no scheduled classes on this day in Academic Year {selectedYear}.
                                </p>
                            </div>
                        )}
                    </div>
                )
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div>
                                <div className="text-base font-bold text-slate-800 mb-1">
                                    No Teaching Periods Scheduled for AY {selectedYear || 'Selected Year'}
                                </div>
                                <div className="text-xs text-slate-500 max-w-md mx-auto">
                                    You currently have no classes scheduled under your faculty profile for this academic session. Please verify your subject mappings or switch academic years.
                                </div>
                            </div>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default PersonalTimetable;

