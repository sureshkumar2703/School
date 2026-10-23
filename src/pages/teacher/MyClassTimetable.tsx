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
    EnvironmentOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherTimetableDataRequest } from '../../store/features/teacher-timetable/teacherTimetableSlice';
import type { Day, TimetableEntry } from '../../store/features/class-timetables/classTimetablesSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';

const { Option } = Select;

interface TimetableRow {
    key: Day;
    day: Day;
    isToday: boolean;
    periods: (TimetableEntry | null)[];
}

const ALL_DAYS: Day[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MyClassTimetable: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { timetables, mappings, loading, error } = useSelector((state: RootState) => state.teacherTimetable);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
    
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

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherTimetableDataRequest({ organizationKey: user.organization_key }));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Unique classes from teacher mappings
    const myClassOptions = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        const myMappings = mappings.filter(m => m.teacher_name === user.full_name);
        const uniqueClasses = myMappings.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    className: m.class_name,
                    sectionName: m.section_name,
                    academicYear: m.academic_year,
                    label: `${m.class_name} - ${m.section_name} (${m.academic_year})` 
                });
            }
            return acc;
        }, new Map<string, { key: string, className: string, sectionName: string, academicYear: string, label: string }>());

        return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [mappings, user?.full_name]);

    // Auto-select first class when loaded so user doesn't face an empty screen
    useEffect(() => {
        if (!selectedClassKey && myClassOptions.length > 0) {
            setSelectedClassKey(myClassOptions[0].key);
        }
    }, [myClassOptions, selectedClassKey]);

    const selectedTimetable = useMemo(() => {
        if (!selectedClassKey || !timetables) return null;
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return timetables.find(tt => 
            tt.class_name === className && 
            tt.section_name === sectionName && 
            tt.academic_year === academicYear
        );
    }, [selectedClassKey, timetables]);

    // Selected class details
    const selectedClassDetails = useMemo(() => {
        if (!selectedClassKey) return { className: '', sectionName: '', academicYear: '' };
        const [className, sectionName, academicYear] = selectedClassKey.split('||');
        return { className, sectionName, academicYear };
    }, [selectedClassKey]);

    // Time slot definitions
    const timeSlots = useMemo(() => {
        return selectedTimetable?.number_of_periods === 4 ? [
            { period: 1, time: '09:15 - 10:45', label: 'Period 1' },
            { period: 2, time: '11:00 - 12:30', label: 'Period 2' },
            { period: 3, time: '01:15 - 02:45', label: 'Period 3' },
            { period: 4, time: '03:00 - 04:30', label: 'Period 4' },
        ] : [
            { period: 1, time: '09:15 - 10:00', label: 'Period 1' },
            { period: 2, time: '10:00 - 10:45', label: 'Period 2' },
            { period: 3, time: '11:00 - 11:45', label: 'Period 3' },
            { period: 4, time: '11:45 - 12:30', label: 'Period 4' },
            { period: 5, time: '01:15 - 02:00', label: 'Period 5' },
            { period: 6, time: '02:00 - 02:45', label: 'Period 6' },
            { period: 7, time: '03:00 - 03:45', label: 'Period 7' },
            { period: 8, time: '03:45 - 04:30', label: 'Period 8' },
        ];
    }, [selectedTimetable?.number_of_periods]);

    // Full slot sequence including extra periods (0 and 99)
    const allSlotDefinitions = useMemo(() => [
        { period: 0, time: '08:15 - 09:00', label: 'Morning Extra' },
        ...timeSlots,
        { period: 99, time: '04:30 - 05:15', label: 'Evening Extra' },
    ], [timeSlots]);

    // Helper: evaluate period live time status
    const getSlotLiveStatus = (timeRange: string, day: Day) => {
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

    // Calculate timetable summary metrics
    const metrics = useMemo(() => {
        if (!selectedTimetable) {
            return { totalPeriods: 0, myPeriods: 0, uniqueSubjects: 0, uniqueTeachers: 0 };
        }

        const validEntries = selectedTimetable.timetable_data.filter(e => e.subject_name);
        const myEntries = validEntries.filter(e => e.teacher_name === user?.full_name);
        const subjectSet = new Set(validEntries.map(e => e.subject_name));
        const teacherSet = new Set(validEntries.map(e => e.teacher_name).filter(Boolean));

        return {
            totalPeriods: validEntries.length,
            myPeriods: myEntries.length,
            uniqueSubjects: subjectSet.size,
            uniqueTeachers: teacherSet.size,
        };
    }, [selectedTimetable, user?.full_name]);

    // Format weekly rows for Table
    const tableData: TimetableRow[] = useMemo(() => {
        if (!selectedTimetable) return [];
        return ALL_DAYS.map(day => ({
            key: day,
            day,
            isToday: day === todayName,
            periods: Array.from({ length: timeSlots.length + 2 }, (_, i) => {
                const periodNum = i === 0 ? 0 : (i === timeSlots.length + 1 ? 99 : timeSlots[i - 1]?.period);
                return selectedTimetable.timetable_data.find(entry => entry.day === day && entry.period === periodNum) || null;
            })
        }));
    }, [selectedTimetable, timeSlots, todayName]);

    // Active day periods for mobile / card view
    const activeDayPeriods = useMemo(() => {
        if (!selectedTimetable) return [];
        return allSlotDefinitions.map(slot => {
            const entry = selectedTimetable.timetable_data.find(
                e => e.day === activeDayTab && e.period === slot.period
            ) || null;
            const liveStatus = getSlotLiveStatus(slot.time, activeDayTab);
            const isMyPeriod = entry?.teacher_name === user?.full_name;
            return {
                ...slot,
                entry,
                liveStatus,
                isMyPeriod
            };
        });
    }, [selectedTimetable, allSlotDefinitions, activeDayTab, user?.full_name, nowTime]);

    // Cell renderer for table
    const renderCell = (entry: TimetableEntry | null, day: Day, time: string) => {
        if (!entry || !entry.subject_name) {
            return (
                <div className="flex items-center justify-center p-3 text-center min-h-[78px] text-slate-300 text-xs italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    Free / Library
                </div>
            );
        }
        
        const isMyPeriod = entry.teacher_name === user?.full_name;
        const liveStatus = getSlotLiveStatus(time, day);
        const isOngoing = liveStatus.status === 'ongoing';

        return (
            <div
                className={`relative flex flex-col justify-between p-2.5 rounded-xl border transition-all duration-200 min-h-[82px] text-left group ${
                    isMyPeriod 
                        ? 'bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-white border-blue-300 shadow-sm hover:border-blue-500' 
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                } ${isOngoing ? 'ring-2 ring-emerald-500 shadow-emerald-100 shadow-md' : ''}`}
            >
                {/* Header: Subject + My Period badge / Ongoing dot */}
                <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                        {entry.subject_name}
                    </span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {isOngoing && (
                            <Tooltip title="Period Live Now">
                                <span className="inline-flex items-center w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </Tooltip>
                        )}
                        {isMyPeriod && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                                You
                            </span>
                        )}
                    </div>
                </div>

                {/* Teacher name & room */}
                <div className="mt-auto pt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1 truncate max-w-[130px]" title={entry.teacher_name}>
                        <UserOutlined className={`text-[10px] ${isMyPeriod ? 'text-blue-600 font-bold' : 'text-slate-400'}`} />
                        <span className={`truncate ${isMyPeriod ? 'font-semibold text-blue-900' : ''}`}>
                            {entry.teacher_name}
                        </span>
                    </div>
                    {(entry as any)?.room_number && (
                        <span className="text-[10px] text-slate-400 font-medium">
                            R-{(entry as any).room_number}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    // Columns config
    const columns: ColumnsType<TimetableRow> = [
        {
            title: 'Day',
            dataIndex: 'day',
            key: 'day',
            width: 130,
            fixed: 'left',
            render: (day: Day, record: TimetableRow) => (
                <div className="flex flex-col items-center justify-center p-2 text-center h-full">
                    <span className={`text-sm font-bold ${record.isToday ? 'text-blue-600' : 'text-slate-800'}`}>
                        {day}
                    </span>
                    {record.isToday && (
                        <span className="mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Today
                        </span>
                    )}
                </div>
            ),
        },
        {
            title: () => (
                <div className="text-center leading-tight py-1">
                    <div className="font-bold text-slate-800 text-xs">Morning Extra</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">08:15 - 09:00</div>
                </div>
            ),
            key: 'period-0',
            width: 175,
            render: (_: any, record: TimetableRow) => renderCell(
                record.periods.find(p => p?.period === 0) || null,
                record.day,
                '08:15 - 09:00'
            ),
        },
        ...timeSlots.map(slot => ({
            title: () => (
                <div className="text-center leading-tight py-1">
                    <div className="font-bold text-slate-800 text-xs">{slot.label}</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">{slot.time}</div>
                </div>
            ),
            key: `period-${slot.period}`,
            width: 175,
            render: (_: any, record: TimetableRow) => renderCell(
                record.periods.find(p => p?.period === slot.period) || null,
                record.day,
                slot.time
            ),
        })),
        {
            title: () => (
                <div className="text-center leading-tight py-1">
                    <div className="font-bold text-slate-800 text-xs">Evening Extra</div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">04:30 - 05:15</div>
                </div>
            ),
            key: 'period-99',
            width: 175,
            render: (_: any, record: TimetableRow) => renderCell(
                record.periods.find(p => p?.period === 99) || null,
                record.day,
                '04:30 - 05:15'
            ),
        },
    ];

    // Helper: format timetable cell text for PDF export
    const formatEntryForPrint = (entry: TimetableEntry | undefined | null) => {
        if (!entry || !entry.subject_name) return '-';
        const isMyPeriod = entry.teacher_name === user?.full_name;
        return `${entry.subject_name}\n${entry.teacher_name || ''}${isMyPeriod ? ' [YOU]' : ''}`;
    };

    // Download PDF (Targeted Timetable Document only)
    const handleDownloadPdf = () => {
        if (!selectedTimetable) {
            message.warning('Please select a class with a published timetable first.');
            return;
        }

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const pageWidth = doc.internal.pageSize.getWidth();

        // Institutional Header
        const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(schoolName, pageWidth / 2, 28, { align: 'center' });

        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        if (schoolDetails?.address) {
            doc.text(schoolDetails.address, pageWidth / 2, 42, { align: 'center' });
        }

        // Subtitle & Class details
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text(`CLASS WEEKLY TIMETABLE • Class ${selectedClassDetails.className} - ${selectedClassDetails.sectionName}`, 40, 68);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(
            `Academic Year: ${selectedClassDetails.academicYear || 'Current'}  |  Faculty In-Charge: ${user?.full_name || 'Teacher'}  |  Generated: ${dayjs().format('MMMM D, YYYY')}`,
            40,
            82
        );

        // Table Columns
        const head = [[
            'Day',
            'Morning Extra\n08:15 - 09:00',
            ...timeSlots.map(s => `${s.label}\n${s.time}`),
            'Evening Extra\n04:30 - 05:15'
        ]];

        // Table Body
        const body = ALL_DAYS.map(day => {
            const rowCells: string[] = [day];
            
            // Slot 0: Morning Extra
            const morningEntry = selectedTimetable.timetable_data.find(e => e.day === day && e.period === 0);
            rowCells.push(formatEntryForPrint(morningEntry));

            // Regular slots
            timeSlots.forEach(slot => {
                const entry = selectedTimetable.timetable_data.find(e => e.day === day && e.period === slot.period);
                rowCells.push(formatEntryForPrint(entry));
            });

            // Slot 99: Evening Extra
            const eveningEntry = selectedTimetable.timetable_data.find(e => e.day === day && e.period === 99);
            rowCells.push(formatEntryForPrint(eveningEntry));

            return rowCells;
        });

        autoTable(doc, {
            head,
            body,
            startY: 94,
            theme: 'grid',
            styles: {
                font: 'helvetica',
                fontSize: 8,
                halign: 'center',
                valign: 'middle',
                cellPadding: 4,
                overflow: 'linebreak',
            },
            headStyles: {
                fillColor: [30, 41, 59], // slate-800
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center',
            },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: 72 },
            },
            didParseCell: (data) => {
                // Highlight cells that belong to current teacher
                if (data.section === 'body' && data.column.index > 0) {
                    const cellText = String(data.cell.raw || '');
                    if (cellText.includes('[YOU]')) {
                        data.cell.styles.fillColor = [224, 242, 254]; // light blue
                        data.cell.styles.textColor = [3, 105, 161]; // blue-700
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
        });

        doc.save(`Class_${selectedClassDetails.className}-${selectedClassDetails.sectionName}_Timetable.pdf`);
    };

    // Helper: render clean print cell HTML
    const renderPrintCellHtml = (entry: TimetableEntry | undefined | null) => {
        if (!entry || !entry.subject_name) {
            return `<td class="free-cell">-</td>`;
        }
        const isMyPeriod = entry.teacher_name === user?.full_name;
        return `
            <td class="${isMyPeriod ? 'my-period' : ''}">
                <div class="cell-content">
                    <span class="subject">${entry.subject_name}</span>
                    <span class="teacher">${entry.teacher_name || ''}</span>
                    ${isMyPeriod ? `<span class="my-badge">YOU</span>` : ''}
                </div>
            </td>
        `;
    };

    // Targeted Print: prints strictly the timetable sheet without any app UI
    const handlePrint = () => {
        if (!selectedTimetable) {
            message.warning('Please select a class with a published timetable first.');
            return;
        }

        const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
        const schoolAddress = schoolDetails?.address || '';
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }

        const tableHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Class Timetable - ${selectedClassDetails.className}-${selectedClassDetails.sectionName}</title>
                    <style>
                        @page { size: landscape; margin: 8mm; }
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                            color: #0f172a;
                            margin: 0;
                            padding: 12px;
                            background: #fff;
                        }
                        .header-container {
                            text-align: center;
                            margin-bottom: 12px;
                            border-bottom: 2px solid #2563eb;
                            padding-bottom: 10px;
                        }
                        .school-title {
                            font-size: 20px;
                            font-weight: 800;
                            color: #0f172a;
                            margin: 0 0 2px 0;
                            letter-spacing: -0.3px;
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
                            font-size: 10px;
                            table-layout: fixed;
                        }
                        th, td {
                            border: 1px solid #cbd5e1;
                            padding: 6px 3px;
                            text-align: center;
                            vertical-align: middle;
                            word-break: break-word;
                        }
                        th {
                            background-color: #1e293b;
                            color: #ffffff;
                            font-weight: 700;
                            font-size: 10px;
                            line-height: 1.2;
                        }
                        .th-time {
                            font-weight: normal;
                            font-size: 8.5px;
                            opacity: 0.85;
                            display: block;
                            margin-top: 2px;
                        }
                        .day-header {
                            font-weight: 700;
                            background-color: #f1f5f9;
                            color: #0f172a;
                            width: 75px;
                        }
                        .cell-content {
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 42px;
                        }
                        .subject {
                            font-weight: 700;
                            color: #0f172a;
                            font-size: 11px;
                            line-height: 1.2;
                        }
                        .teacher {
                            font-size: 9.5px;
                            color: #64748b;
                            margin-top: 2px;
                        }
                        .my-period {
                            background-color: #eff6ff !important;
                        }
                        .my-badge {
                            display: inline-block;
                            background-color: #2563eb;
                            color: #ffffff;
                            font-size: 8px;
                            font-weight: 800;
                            padding: 1px 4px;
                            border-radius: 3px;
                            margin-top: 2px;
                            text-transform: uppercase;
                        }
                        .free-cell {
                            color: #94a3b8;
                            font-style: italic;
                            font-size: 9px;
                        }
                        .footer-note {
                            display: flex;
                            justify-content: space-between;
                            margin-top: 10px;
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
                        <div class="doc-title">CLASS WEEKLY TIMETABLE • Class ${selectedClassDetails.className} - ${selectedClassDetails.sectionName}</div>
                        <div class="meta-bar">
                            <span><strong>Academic Year:</strong> ${selectedClassDetails.academicYear || 'Current'}</span>
                            <span><strong>Class:</strong> ${selectedClassDetails.className} - ${selectedClassDetails.sectionName}</span>
                            <span><strong>Generated:</strong> ${dayjs().format('DD/MM/YYYY, hh:mm A')}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 75px;">Day</th>
                                <th>Morning Extra<span class="th-time">08:15 - 09:00</span></th>
                                ${timeSlots.map(s => `<th>${s.label}<span class="th-time">${s.time}</span></th>`).join('')}
                                <th>Evening Extra<span class="th-time">04:30 - 05:15</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ALL_DAYS.map(day => `
                                <tr>
                                    <td class="day-header">${day}</td>
                                    ${renderPrintCellHtml(selectedTimetable.timetable_data.find(e => e.day === day && e.period === 0))}
                                    ${timeSlots.map(slot => renderPrintCellHtml(selectedTimetable.timetable_data.find(e => e.day === day && e.period === slot.period))).join('')}
                                    ${renderPrintCellHtml(selectedTimetable.timetable_data.find(e => e.day === day && e.period === 99))}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="footer-note">
                        <span>* Blue highlighted cells indicate teaching periods assigned to ${user?.full_name || 'Faculty'}.</span>
                        <span>Official Institutional Academic Document • Sri Gayathri Matric Hr Sec School</span>
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
        printWindow.document.write(tableHtml);
        printWindow.document.close();
    };

    if (loading && timetables.length === 0) {
        return (
            <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200">
                <Spin size="large" />
                <div className="text-sm font-semibold text-slate-600 mt-4">
                    Loading class timetables and subject mappings...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert
                    message="Timetable Synchronization Error"
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
                HEADER & CLASS SELECTOR BAR (RESPONSIVE)
                ==================================================================== */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Title & Navigation */}
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
                                    Class Weekly Timetable
                                </h1>
                                {selectedClassDetails.className && (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                        Class {selectedClassDetails.className} - {selectedClassDetails.sectionName}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">
                                Complete weekly lesson schedule, faculty period assignments, and timetable matrix.
                            </p>
                        </div>
                    </div>

                    {/* Right: Class Selector Dropdown & View Mode Switcher */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                        <div className="min-w-[240px] flex-1">
                            <Select
                                showSearch
                                placeholder="Choose Assigned Class"
                                className="w-full h-10 rounded-xl"
                                value={selectedClassKey}
                                onChange={setSelectedClassKey}
                                loading={loading}
                                optionFilterProp="children"
                            >
                                {myClassOptions.map(opt => (
                                    <Option key={opt.key} value={opt.key}>
                                        <div className="flex items-center justify-between py-0.5">
                                            <span className="font-semibold text-slate-800">
                                                {opt.className} - {opt.sectionName}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-medium">
                                                AY {opt.academicYear}
                                            </span>
                                        </div>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* View Switcher: Matrix vs Day Cards */}
                        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200 flex-shrink-0 self-start sm:self-auto">
                            <button
                                type="button"
                                onClick={() => setViewMode('matrix')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'matrix' 
                                        ? 'bg-white text-blue-700 shadow-sm' 
                                        : 'bg-transparent text-slate-600 hover:text-slate-900'
                                }`}
                                title="Full Weekly Matrix"
                            >
                                <TableOutlined className="text-xs" />
                                <span className="hidden xs:inline">Weekly Grid</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer flex items-center gap-1.5 ${
                                    viewMode === 'cards' 
                                        ? 'bg-white text-blue-700 shadow-sm' 
                                        : 'bg-transparent text-slate-600 hover:text-slate-900'
                                }`}
                                title="Day Schedule Cards"
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
                            title="Download Clean Timetable PDF"
                        >
                            <FilePdfOutlined className="text-sm text-blue-600" />
                            <span className="hidden sm:inline">PDF</span>
                        </button>

                        {/* Targeted Print Button */}
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer flex-shrink-0"
                            title="Print Timetable Sheet (Data Only)"
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
                    {/* Stat 1: Selected Class */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                            <TeamOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                Selected Class
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                {selectedClassDetails.className ? `${selectedClassDetails.className} - ${selectedClassDetails.sectionName}` : 'Not Selected'}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                AY {selectedClassDetails.academicYear || 'Current'}
                            </div>
                        </div>
                    </div>

                    {/* Stat 2: Total Periods */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100/70 border border-indigo-200 flex items-center justify-center text-indigo-700 flex-shrink-0">
                            <ClockCircleOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                Total Periods
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                {metrics.totalPeriods} Weekly
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                {selectedTimetable?.number_of_periods || 8} Periods/Day + Extra
                            </div>
                        </div>
                    </div>

                    {/* Stat 3: My Teaching Load */}
                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 flex-shrink-0">
                            <StarOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider truncate">
                                Your Periods
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-emerald-950 truncate">
                                {metrics.myPeriods} Assigned
                            </div>
                            <div className="text-[11px] text-emerald-700 font-medium truncate">
                                Teaching in this class
                            </div>
                        </div>
                    </div>

                    {/* Stat 4: Subjects & Faculty */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100/70 border border-purple-200 flex items-center justify-center text-purple-700 flex-shrink-0">
                            <BookOutlined className="text-base" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                                Curriculum
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                                {metrics.uniqueSubjects} Subjects
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                                {metrics.uniqueTeachers} Faculty Members
                            </div>
                        </div>
                    </div>
                </div>

                {/* Legend Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
                        <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-400 inline-block" />
                            <span>Your Assigned Teaching Period (Marked "YOU")</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-3.5 h-3.5 rounded bg-white border border-slate-300 inline-block" />
                            <span>Other Faculty Teaching Period</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            <span>Currently Active Period (Live Clock)</span>
                        </div>
                    </div>

                    <div className="text-slate-500 text-[11px]">
                        Today is <strong className="text-slate-800">{todayName}</strong> • {nowTime.format('hh:mm A')}
                    </div>
                </div>
            </div>

            {/* ====================================================================
                MAIN CONTENT: WEEKLY GRID OR MOBILE DAY CARDS
                ==================================================================== */}
            {selectedClassKey ? (
                selectedTimetable ? (
                    viewMode === 'matrix' ? (
                        /* ==================== VIEW 1: FULL WEEKLY GRID TABLE ==================== */
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                    <TableOutlined className="text-blue-600 text-base" />
                                    <h3 className="text-sm font-bold text-slate-900 m-0">
                                        Weekly Period Matrix • {selectedClassDetails.className} - {selectedClassDetails.sectionName}
                                    </h3>
                                </div>
                                <div className="text-xs text-slate-500">
                                    Scroll horizontally to view morning and evening extra classes
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <Table
                                    columns={columns}
                                    dataSource={tableData}
                                    rowKey="key"
                                    bordered
                                    pagination={false}
                                    scroll={{ x: 1300 }}
                                    rowClassName={(record) => record.isToday ? 'bg-blue-50/20' : ''}
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
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setActiveDayTab(day)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                    : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border-slate-200'
                                            }`}
                                        >
                                            <span>{day}</span>
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

                            {/* Schedule Cards for Selected Day */}
                            <div className="space-y-3">
                                {activeDayPeriods.map((slot) => {
                                    const { entry, liveStatus, isMyPeriod } = slot;
                                    const isOngoing = liveStatus.status === 'ongoing';
                                    const isCompleted = liveStatus.status === 'completed';

                                    return (
                                        <div
                                            key={slot.period}
                                            className={`p-4 rounded-xl border transition-all ${
                                                isOngoing 
                                                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400 shadow-sm' 
                                                    : isMyPeriod
                                                    ? 'bg-blue-50/50 border-blue-200 hover:border-blue-300 shadow-xs'
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                {/* Left: Period Badge + Subject */}
                                                <div className="flex items-start sm:items-center gap-3">
                                                    <div className={`w-14 h-12 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center ${
                                                        isOngoing
                                                            ? 'bg-emerald-600 text-white'
                                                            : isMyPeriod
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                    }`}>
                                                        <span className="text-[10px] font-bold uppercase tracking-wider">
                                                            {slot.period === 0 ? 'M-EXT' : slot.period === 99 ? 'E-EXT' : `P-${slot.period}`}
                                                        </span>
                                                        <span className="text-[11px] font-black">
                                                            {slot.time.split(' - ')[0]}
                                                        </span>
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="text-sm font-bold text-slate-900 m-0">
                                                                {entry?.subject_name || 'Free Period / Unassigned'}
                                                            </h4>
                                                            {isMyPeriod && (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                                                                    Your Period
                                                                </span>
                                                            )}
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
                                                                {slot.time}
                                                            </span>
                                                            {entry?.teacher_name && (
                                                                <span className="flex items-center gap-1 font-medium">
                                                                    <UserOutlined className="text-slate-400" />
                                                                    {entry.teacher_name}
                                                                </span>
                                                            )}
                                                            {(entry as any)?.room_number && (
                                                                <span className="flex items-center gap-1 text-slate-400">
                                                                    <EnvironmentOutlined /> Room {(entry as any).room_number}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Live Status badge */}
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
                        </div>
                    )
                ) : (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description={
                                <div>
                                    <div className="text-base font-bold text-slate-800 mb-1">
                                        No Timetable Published for {selectedClassDetails.className} - {selectedClassDetails.sectionName}
                                    </div>
                                    <div className="text-xs text-slate-500 max-w-md mx-auto">
                                        A master timetable schedule has not yet been published by administration for Academic Year {selectedClassDetails.academicYear}.
                                    </div>
                                </div>
                            }
                        />
                    </div>
                )
            ) : (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                    <Empty
                        description={
                            myClassOptions.length > 0 ? (
                                <div>
                                    <div className="text-base font-bold text-slate-800 mb-1">
                                        Select an Assigned Class
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        Choose one of your assigned classes from the dropdown above to inspect its weekly timetable.
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-base font-bold text-slate-800 mb-1">
                                        No Class Assignments Found
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        You are currently not mapped as a subject teacher or class teacher to any active classes.
                                    </div>
                                </div>
                            )
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default MyClassTimetable;

