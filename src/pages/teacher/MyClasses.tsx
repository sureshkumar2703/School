import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spin, Alert, Empty, Select, Input, Tooltip, message } from 'antd';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ArrowLeftOutlined,
    TeamOutlined,
    UserOutlined,
    BookOutlined,
    StarOutlined,
    CrownOutlined,
    SearchOutlined,
    PrinterOutlined,
    FilePdfOutlined,
    AppstoreOutlined,
    TableOutlined,
    CheckCircleOutlined,
    IdcardOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';

const { Option } = Select;

interface TeacherDetails {
    teacher_name: string;
    subjects: string[];
    role: string;
}

interface ClassInfo {
    key: string;
    class_name: string;
    section_name: string;
    academic_year: string;
    teachers: TeacherDetails[];
}

const MyClasses: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading, error } = useSelector((state: RootState) => state.teacherDashboard);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Active academic years list
    const academicYears = useMemo(() => {
        const fromCalendars = calendars.filter(cal => cal.status === 'Active').map(c => c.academic_year);
        if (fromCalendars.length > 0) return Array.from(new Set(fromCalendars));
        if (mappings && mappings.length > 0) {
            return Array.from(new Set(mappings.map(m => m.academic_year).filter(Boolean)));
        }
        return [];
    }, [calendars, mappings]);

    // Default select current active academic year
    useEffect(() => {
        if (academicYears.length > 0 && (!selectedYear || !academicYears.includes(selectedYear))) {
            const currentYearObj = calendars.find(y => y.is_current && y.status === 'Active');
            const defaultYear = currentYearObj?.academic_year || academicYears[0];
            setSelectedYear(defaultYear);
        }
    }, [academicYears, calendars, selectedYear]);

    // Distinct classes the current teacher is associated with FOR THE SELECTED ACADEMIC YEAR
    const teacherClassOptions = useMemo(() => {
        if (!mappings || !user?.full_name || !selectedYear) {
            return [];
        }
        const myMappings = mappings.filter(
            m => m.teacher_name === user.full_name && m.academic_year === selectedYear
        );
        const myClassSections = myMappings.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}`;
            if (!acc.has(key)) {
                acc.set(key, {
                    key,
                    className: m.class_name,
                    sectionName: m.section_name,
                    academicYear: selectedYear,
                    label: `Class ${m.class_name} - ${m.section_name}`,
                    shortLabel: `${m.class_name} - ${m.section_name}`,
                });
            }
            return acc;
        }, new Map<string, { key: string; className: string; sectionName: string; academicYear: string; label: string; shortLabel: string }>());

        return Array.from(myClassSections.values()).sort((a, b) => a.className.localeCompare(b.className));
    }, [mappings, user?.full_name, selectedYear]);

    // When academic year or teacherClassOptions change, keep or select first valid class
    useEffect(() => {
        if (teacherClassOptions.length > 0) {
            const exists = teacherClassOptions.some(opt => opt.key === selectedClassKey);
            if (!exists) {
                setSelectedClassKey(teacherClassOptions[0].key);
            }
        } else {
            setSelectedClassKey(null);
        }
    }, [teacherClassOptions, selectedClassKey]);

    // Current selected class info and faculty list in the selected academic year
    const currentClassInfo = useMemo<ClassInfo | null>(() => {
        if (!mappings || !selectedClassKey || !selectedYear) {
            return null;
        }

        const [className, sectionName] = selectedClassKey.split('||');

        const teachersInClass = mappings
            .filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === selectedYear)
            .reduce((acc, m) => {
                if (!m.teacher_name || !m.subject_name) return acc;

                let teacherEntry = acc.get(m.teacher_name);
                if (!teacherEntry) {
                    teacherEntry = {
                        teacher_name: m.teacher_name,
                        subjects: [],
                        role: m.role || 'Subject Teacher',
                    };
                    acc.set(m.teacher_name, teacherEntry);
                }
                if (!teacherEntry.subjects.includes(m.subject_name)) {
                    teacherEntry.subjects.push(m.subject_name);
                }
                if (m.role === 'Class Teacher') {
                    teacherEntry.role = 'Class Teacher';
                }

                return acc;
            }, new Map<string, TeacherDetails>());

        return {
            key: `${className}||${sectionName}||${selectedYear}`,
            class_name: className,
            section_name: sectionName,
            academic_year: selectedYear,
            teachers: Array.from(teachersInClass.values()).sort((a, b) => {
                // Class teacher first, then current user, then alphabetical
                if (a.role === 'Class Teacher') return -1;
                if (b.role === 'Class Teacher') return 1;
                if (a.teacher_name === user?.full_name) return -1;
                if (b.teacher_name === user?.full_name) return 1;
                return a.teacher_name.localeCompare(b.teacher_name);
            }),
        };
    }, [mappings, selectedClassKey, selectedYear, user?.full_name]);

    // Filtered teachers list based on search term & role filter
    const filteredTeachers = useMemo(() => {
        if (!currentClassInfo) return [];
        return currentClassInfo.teachers.filter(teacher => {
            const matchesSearch =
                teacher.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                teacher.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesRole =
                roleFilter === 'all' ||
                (roleFilter === 'class_teacher' && teacher.role === 'Class Teacher') ||
                (roleFilter === 'subject_teacher' && teacher.role !== 'Class Teacher');

            return matchesSearch && matchesRole;
        });
    }, [currentClassInfo, searchTerm, roleFilter]);

    // Statistics for the selected class
    const classStats = useMemo(() => {
        if (!currentClassInfo) {
            return {
                totalTeachers: 0,
                totalSubjects: 0,
                classTeacherName: 'Not Assigned',
                isUserClassTeacher: false,
                userSubjects: [] as string[],
            };
        }

        const subjectsSet = new Set<string>();
        let classTeacher = 'Not Assigned';

        currentClassInfo.teachers.forEach(t => {
            t.subjects.forEach(s => subjectsSet.add(s));
            if (t.role === 'Class Teacher') {
                classTeacher = t.teacher_name;
            }
        });

        const userTeacherEntry = currentClassInfo.teachers.find(t => t.teacher_name === user?.full_name);

        return {
            totalTeachers: currentClassInfo.teachers.length,
            totalSubjects: subjectsSet.size,
            classTeacherName: classTeacher,
            isUserClassTeacher: classTeacher === user?.full_name,
            userSubjects: userTeacherEntry ? userTeacherEntry.subjects : [],
        };
    }, [currentClassInfo, user?.full_name]);

    // Colors generator for subject badges
    const getSubjectColor = (subject: string) => {
        const colors = [
            'bg-blue-50 text-blue-700 border-blue-200',
            'bg-purple-50 text-purple-700 border-purple-200',
            'bg-emerald-50 text-emerald-700 border-emerald-200',
            'bg-amber-50 text-amber-700 border-amber-200',
            'bg-rose-50 text-rose-700 border-rose-200',
            'bg-cyan-50 text-cyan-700 border-cyan-200',
            'bg-indigo-50 text-indigo-700 border-indigo-200',
        ];
        let hash = 0;
        for (let i = 0; i < subject.length; i++) {
            hash = subject.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Color initials generator for teachers
    const getAvatarBg = (name: string, isClassTeacher: boolean) => {
        if (isClassTeacher) return 'bg-gradient-to-tr from-amber-500 to-yellow-400 text-white shadow-amber-200';
        const gradients = [
            'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white',
            'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white',
            'bg-gradient-to-tr from-purple-600 to-pink-500 text-white',
            'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white',
            'bg-gradient-to-tr from-rose-600 to-orange-500 text-white',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
    };

    // Isolated targeted print
    const handlePrint = () => {
        if (!currentClassInfo) {
            message.warning('No class data available to print');
            return;
        }

        const schoolName = schoolDetails?.school_name || 'Sri Gayathri Higher Secondary School';
        const schoolAddress = schoolDetails?.address || '';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            message.error('Please allow popups to print the faculty list.');
            return;
        }

        const rowsHtml = currentClassInfo.teachers
            .map((t, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; ${t.role === 'Class Teacher' ? 'background-color: #fefce8;' : idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                    <td style="padding: 10px 12px; font-weight: 600; text-align: center; color: #475569; width: 45px;">${idx + 1}</td>
                    <td style="padding: 10px 14px; font-weight: 600; color: #0f172a;">
                        ${t.teacher_name} ${t.teacher_name === user?.full_name ? '<span style="color: #2563eb; font-size: 11px;">(You)</span>' : ''}
                    </td>
                    <td style="padding: 10px 14px;">
                        <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 11px; font-weight: 600; ${
                            t.role === 'Class Teacher'
                                ? 'background-color: #dcfce7; color: #15803d; border: 1px solid #86efac;'
                                : 'background-color: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;'
                        }">
                            ${t.role}
                        </span>
                    </td>
                    <td style="padding: 10px 14px; color: #1e293b;">
                        ${t.subjects.map(s => `<span style="display: inline-block; margin-right: 6px; padding: 2px 8px; border-radius: 4px; background: #f1f5f9; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 500;">${s}</span>`).join('')}
                    </td>
                </tr>
            `)
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Faculty Allocation - Class ${currentClassInfo.class_name} ${currentClassInfo.section_name}</title>
                    <style>
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
                        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 18px; }
                        .school-name { font-size: 20px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin: 0; }
                        .school-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .doc-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 10px; }
                        .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; margin-bottom: 18px; font-size: 13px; }
                        .meta-item { display: flex; flex-direction: column; }
                        .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                        .meta-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                        th { background: #0369a1; color: #ffffff; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
                        .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="school-name">${schoolName}</div>
                        ${schoolAddress ? `<div class="school-sub">${schoolAddress}</div>` : ''}
                        <div class="doc-title">CLASS FACULTY & SUBJECT ALLOCATION DIRECTORY</div>
                    </div>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Class & Section</span>
                            <span class="meta-val">Class ${currentClassInfo.class_name} - Section ${currentClassInfo.section_name}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Academic Year</span>
                            <span class="meta-val">${currentClassInfo.academic_year}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Class Teacher</span>
                            <span class="meta-val">${classStats.classTeacherName}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Total Faculty</span>
                            <span class="meta-val">${classStats.totalTeachers} Teachers</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45px; text-align: center;">#</th>
                                <th>Teacher Name</th>
                                <th style="width: 140px;">Role</th>
                                <th>Subjects Handled in This Class</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        <span>Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
                        <span>Generated by: ${user?.full_name || 'Staff Portal'}</span>
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
        if (!currentClassInfo) {
            message.warning('No class data available to export');
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
            doc.text(`FACULTY ALLOCATION: CLASS ${currentClassInfo.class_name} - ${currentClassInfo.section_name}`, 105, schoolAddress ? 30 : 26, { align: 'center' });

            // Metadata Box
            const metaY = schoolAddress ? 34 : 30;
            doc.setDrawColor(226, 232, 240);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(14, metaY, 182, 16, 2, 2, 'FD');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('ACADEMIC YEAR:', 18, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(currentClassInfo.academic_year, 50, metaY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('CLASS TEACHER:', 110, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(classStats.classTeacherName, 142, metaY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('TOTAL FACULTY:', 18, metaY + 12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(`${classStats.totalTeachers} Teachers (${classStats.totalSubjects} Subjects)`, 50, metaY + 12);

            // Table Data
            const tableRows = currentClassInfo.teachers.map((t, idx) => [
                String(idx + 1),
                `${t.teacher_name}${t.teacher_name === user?.full_name ? ' (You)' : ''}`,
                t.role,
                t.subjects.join(', '),
            ]);

            autoTable(doc, {
                startY: metaY + 20,
                head: [['#', 'Teacher Name', 'Role', 'Subjects Handled']],
                body: tableRows,
                headStyles: {
                    fillColor: [3, 105, 161],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 3.5,
                    textColor: [30, 41, 59],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2,
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 55, fontStyle: 'bold' },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 'auto' },
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
            });

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${pageCount}`,
                    105,
                    290,
                    { align: 'center' }
                );
            }

            const fileName = `Class_${currentClassInfo.class_name}_${currentClassInfo.section_name}_Faculty.pdf`;
            doc.save(fileName);
            message.success('Faculty directory PDF downloaded successfully');
        } catch (err) {
            console.error('PDF generation error:', err);
            message.error('Failed to generate PDF');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[420px] p-8 space-y-4">
                <Spin size="large" />
                <span className="text-sm font-medium text-slate-500">Loading your class information...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 sm:p-6">
                <Alert
                    message="Failed to Load Classes"
                    description={error}
                    type="error"
                    showIcon
                    className="rounded-xl shadow-sm"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/70 p-3 sm:p-5 md:p-6 space-y-5">
            {/* 1. Header Bar */}
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
                            <span>My Classes & Faculty Directory</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Explore your assigned classes, class teachers, and subject teacher allocations.
                        </p>
                    </div>

                    {/* Controls: Academic Year + Class Selector + Actions */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Academic Year Selector */}
                        <div className="w-full sm:w-auto min-w-[200px]">
                            <Select
                                placeholder="Academic Year"
                                className="w-full"
                                size="large"
                                value={selectedYear}
                                onChange={val => setSelectedYear(val)}
                            >
                                {academicYears.map(yr => (
                                    <Option key={yr} value={yr}>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarOutlined className="text-blue-500" />
                                            <span>{yr}</span>
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* View Switcher */}
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
                                <span className="hidden sm:inline">Cards</span>
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
                                <span className="hidden sm:inline">Table</span>
                            </button>
                        </div>

                        {/* Print & PDF Export */}
                        <Tooltip title="Print Clean Faculty List">
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={!currentClassInfo}
                                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-white cursor-pointer"
                            >
                                <PrinterOutlined className="text-base" />
                            </button>
                        </Tooltip>

                        <Tooltip title="Export Vector PDF">
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={!currentClassInfo}
                                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <FilePdfOutlined className="text-base" />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* 2. Quick Class Switcher Chips (strictly for the selected academic year) */}
                {teacherClassOptions.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                            Your Classes:
                        </span>
                        {teacherClassOptions.map(cls => {
                            const isSelected = cls.key === selectedClassKey;
                            return (
                                <button
                                    key={cls.key}
                                    type="button"
                                    onClick={() => setSelectedClassKey(cls.key)}
                                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                                    }`}
                                >
                                    <TeamOutlined className="text-[11px]" />
                                    <span>Class {cls.shortLabel}</span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {currentClassInfo ? (
                <>
                    {/* 3. Class Highlights & KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                        {/* Selected Class Profile */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Selected Class
                                </span>
                                <div className="text-lg sm:text-xl font-bold text-slate-800">
                                    Class {currentClassInfo.class_name} - {currentClassInfo.section_name}
                                </div>
                                <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                    <span>AY: {currentClassInfo.academic_year}</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <TeamOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Class Teacher Card */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Class Teacher
                                </span>
                                <div className="text-lg sm:text-xl font-bold text-slate-800 truncate max-w-[170px]">
                                    {classStats.classTeacherName}
                                </div>
                                <div>
                                    {classStats.isUserClassTeacher ? (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                            <CrownOutlined /> You are Class Teacher
                                        </span>
                                    ) : (
                                        <span className="text-xs text-slate-500 font-medium">Head Teacher</span>
                                    )}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <CrownOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Total Faculty */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Faculty Assigned
                                </span>
                                <div className="text-lg sm:text-xl font-bold text-slate-800">
                                    {classStats.totalTeachers} <span className="text-xs font-normal text-slate-500">Teachers</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    Handling this section
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                                <UserOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Subjects Portfolio */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Curriculum Subjects
                                </span>
                                <div className="text-lg sm:text-xl font-bold text-slate-800">
                                    {classStats.totalSubjects} <span className="text-xs font-normal text-slate-500">Subjects</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    Your subjects: <span className="text-blue-700 font-semibold">{classStats.userSubjects.join(', ') || 'None'}</span>
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <BookOutlined className="text-lg" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Filter & Search Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="w-full sm:w-72">
                            <Input
                                prefix={<SearchOutlined className="text-slate-400" />}
                                placeholder="Search by teacher or subject..."
                                allowClear
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Role Filter:</span>
                            <Select
                                value={roleFilter}
                                onChange={val => setRoleFilter(val)}
                                className="w-full sm:w-44"
                            >
                                <Option value="all">All Roles ({currentClassInfo.teachers.length})</Option>
                                <Option value="class_teacher">Class Teacher</Option>
                                <Option value="subject_teacher">Subject Teachers</Option>
                            </Select>
                        </div>
                    </div>

                    {/* 5. Teachers Display (Cards or Table) */}
                    {filteredTeachers.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                            <Empty description="No teachers found matching your search or filters." />
                        </div>
                    ) : viewMode === 'cards' ? (
                        /* Card Grid View */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTeachers.map(teacher => {
                                const isCurrentUser = teacher.teacher_name === user?.full_name;
                                const isClassTeacher = teacher.role === 'Class Teacher';
                                const initials = teacher.teacher_name
                                    .split(' ')
                                    .map(p => p[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase();

                                return (
                                    <div
                                        key={teacher.teacher_name}
                                        className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-sm hover:shadow-md flex flex-col justify-between ${
                                            isClassTeacher
                                                ? 'border-amber-200 ring-1 ring-amber-100 bg-gradient-to-b from-amber-50/20 to-white'
                                                : isCurrentUser
                                                ? 'border-blue-200 ring-1 ring-blue-100'
                                                : 'border-slate-200/80'
                                        }`}
                                    >
                                        <div className="space-y-4">
                                            {/* Teacher Header with Avatar and Role */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${getAvatarBg(
                                                            teacher.teacher_name,
                                                            isClassTeacher
                                                        )}`}
                                                    >
                                                        {initials || <UserOutlined />}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-base flex items-center gap-1.5 flex-wrap">
                                                            <span>{teacher.teacher_name}</span>
                                                            {isCurrentUser && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-xs text-slate-400 font-medium">
                                                            Faculty Member
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Role Pill */}
                                                <div className="shrink-0">
                                                    {isClassTeacher ? (
                                                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg shadow-sm">
                                                            <CrownOutlined /> Class Teacher
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                                            Subject Teacher
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Subjects Handled */}
                                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                                    Subjects Handled:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {teacher.subjects.map(subj => (
                                                        <span
                                                            key={subj}
                                                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${getSubjectColor(
                                                                subj
                                                            )}`}
                                                        >
                                                            <BookOutlined className="text-[10px]" />
                                                            <span>{subj}</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Footer status info */}
                                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <CheckCircleOutlined className="text-emerald-500" />
                                                <span>Active Allocation</span>
                                            </span>
                                            <span className="font-medium text-slate-500">
                                                {teacher.subjects.length} {teacher.subjects.length === 1 ? 'Subject' : 'Subjects'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* Modern Table View */
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <th className="py-3.5 px-4 w-12 text-center">#</th>
                                            <th className="py-3.5 px-4">Faculty Member</th>
                                            <th className="py-3.5 px-4 w-44">Assigned Role</th>
                                            <th className="py-3.5 px-4">Subjects Handled in This Class</th>
                                            <th className="py-3.5 px-4 w-28 text-center">Subject Count</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredTeachers.map((teacher, idx) => {
                                            const isCurrentUser = teacher.teacher_name === user?.full_name;
                                            const isClassTeacher = teacher.role === 'Class Teacher';
                                            const initials = teacher.teacher_name
                                                .split(' ')
                                                .map(p => p[0])
                                                .slice(0, 2)
                                                .join('')
                                                .toUpperCase();

                                            return (
                                                <tr
                                                    key={teacher.teacher_name}
                                                    className={`hover:bg-slate-50/80 transition-colors ${
                                                        isClassTeacher
                                                            ? 'bg-amber-50/30'
                                                            : isCurrentUser
                                                            ? 'bg-blue-50/20'
                                                            : ''
                                                    }`}
                                                >
                                                    <td className="py-3.5 px-4 text-center font-semibold text-slate-400 text-xs">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarBg(
                                                                    teacher.teacher_name,
                                                                    isClassTeacher
                                                                )}`}
                                                            >
                                                                {initials || <UserOutlined />}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                                    <span>{teacher.teacher_name}</span>
                                                                    {isCurrentUser && (
                                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                                                            You
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="text-xs text-slate-400">
                                                                    Faculty
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {isClassTeacher ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                                                                <CrownOutlined /> Class Teacher
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                                                Subject Teacher
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {teacher.subjects.map(subj => (
                                                                <span
                                                                    key={subj}
                                                                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${getSubjectColor(
                                                                        subj
                                                                    )}`}
                                                                >
                                                                    <BookOutlined className="text-[10px]" />
                                                                    <span>{subj}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center font-semibold text-slate-600">
                                                        {teacher.subjects.length}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                /* Empty state when no class found for selected academic year */
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="space-y-1">
                                <p className="font-semibold text-slate-700">
                                    {teacherClassOptions.length === 0
                                        ? `You have no assigned classes in Academic Year ${selectedYear || ''}.`
                                        : 'Please select a class from the dropdown above.'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Try selecting another academic year or contact your school administrator.
                                </p>
                            </div>
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default MyClasses;
