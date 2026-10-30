import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spin, Alert, Empty, Select, Input, Modal, Tooltip, message } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherStatsRequest } from '../../store/features/teacher-stats/teacherStatsSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    UserOutlined,
    ArrowLeftOutlined,
    TeamOutlined,
    CrownOutlined,
    CalendarOutlined,
    SearchOutlined,
    PrinterOutlined,
    FilePdfOutlined,
    AppstoreOutlined,
    TableOutlined,
    IdcardOutlined,
    PhoneOutlined,
    MailOutlined,
    HomeOutlined,
    HeartOutlined,
    EyeOutlined,
    CheckCircleOutlined,
    WomanOutlined,
    ManOutlined,
} from '@ant-design/icons';

const { Option } = Select;

interface Student {
    id: string;
    roll_no?: string;
    register_no: string;
    full_name: string;
    class_name: string;
    section_name: string;
    academic_year: string;
    email?: string;
    gender?: string;
    dob?: string;
    mother_tongue?: string;
    birth_place?: string;
    nationality?: string;
    religion?: string;
    caste?: string;
    permanent_address?: string;
    temporary_address?: string;
    city?: string;
    district?: string;
    state?: string;
    pin_code?: string;
    parent_email?: string;
    parent_contact?: string;
    father_name?: string;
    mother_name?: string;
    admission_no?: string;
    admission_date?: string;
    status?: string;
    blood_group?: string;
    height?: number | string;
    weight?: number | string;
    known_allergies?: string;
    photo_url?: string | null;
    [key: string]: any;
}

const MyClassStudents: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { stats, loading: statsLoading, error: statsError } = useSelector((state: RootState) => state.teacherStats);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState<string>('all');

    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<Student | null>(null);

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

    const academicYearOptions = useMemo(() => stats.academicYears || [], [stats.academicYears]);

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

    const assignmentForSelectedYear = useMemo(() => {
        if (!selectedYear) return null;
        return stats.allClassTeacherAssignments?.find(a => a.academic_year === selectedYear) || null;
    }, [stats.allClassTeacherAssignments, selectedYear]);

    useEffect(() => {
        const fetchStudents = async () => {
            if (!assignmentForSelectedYear || !user?.organization_key) {
                setStudents([]);
                return;
            }

            setLoadingStudents(true);
            setError(null);
            try {
                // 1. Fetch class section allocations
                const { data: allocations, error: fetchError } = await supabase
                    .from('class_section_allocations')
                    .select('id, roll_no, register_no, full_name, class_name, section_name, academic_year')
                    .eq('organization_key', user.organization_key)
                    .eq('class_name', assignmentForSelectedYear.class_name)
                    .eq('section_name', assignmentForSelectedYear.section_name)
                    .eq('academic_year', assignmentForSelectedYear.academic_year)
                    .order('roll_no', { ascending: true, nullsFirst: false });

                if (fetchError) {
                    throw new Error(`Failed to fetch students: ${fetchError.message}`);
                }

                if (!allocations || allocations.length === 0) {
                    setStudents([]);
                    setLoadingStudents(false);
                    return;
                }

                // 2. Fetch full student profiles to enrich with photo, contact, gender, etc.
                const regNos = allocations.map(a => a.register_no);
                const { data: studentProfiles } = await supabase
                    .from('students')
                    .select('*')
                    .eq('organization_key', user.organization_key)
                    .in('register_no', regNos);

                // 3. Fetch passport photos from student_documents
                const studentIds = (studentProfiles || []).map(s => s.id).filter(Boolean);
                const photoMap = new Map<string, string>();

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

                const profileMap = new Map(studentProfiles?.map(s => [s.register_no, s]));

                const enrichedStudents: Student[] = allocations.map(alloc => {
                    const profile = profileMap.get(alloc.register_no) || {};
                    const photoUrl = (profile.id && photoMap.get(profile.id)) || profile.photo_url || null;
                    return {
                        ...profile,
                        ...alloc,
                        photo_url: photoUrl,
                    };
                });

                setStudents(enrichedStudents);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoadingStudents(false);
            }
        };

        if (selectedYear) {
            fetchStudents();
        } else {
            setStudents([]);
        }
    }, [selectedYear, assignmentForSelectedYear, user?.organization_key]);

    // Filter students by search and gender
    const filteredStudents = useMemo(() => {
        return students
            .filter(student => {
                const matchesSearch =
                    (student.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (student.register_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (student.roll_no || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (student.email || '').toLowerCase().includes(searchTerm.toLowerCase());

                const matchesGender =
                    genderFilter === 'all' ||
                    (student.gender || '').toLowerCase() === genderFilter.toLowerCase();

                return matchesSearch && matchesGender;
            })
            .sort((a, b) => {
                if (a.roll_no && b.roll_no) {
                    const numA = parseInt(a.roll_no, 10);
                    const numB = parseInt(b.roll_no, 10);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return a.roll_no.localeCompare(b.roll_no);
                }
                return (a.full_name || '').localeCompare(b.full_name || '');
            });
    }, [students, searchTerm, genderFilter]);

    // Metric summaries
    const classMetrics = useMemo(() => {
        const total = students.length;
        let boys = 0;
        let girls = 0;
        let active = 0;

        students.forEach(s => {
            const g = (s.gender || '').toLowerCase();
            if (g === 'male' || g === 'boy') boys++;
            else if (g === 'female' || g === 'girl') girls++;
            if (s.status === 'Active' || !s.status) active++;
        });

        return {
            total,
            boys,
            girls,
            active,
            className: assignmentForSelectedYear?.class_name || '',
            sectionName: assignmentForSelectedYear?.section_name || '',
        };
    }, [students, assignmentForSelectedYear]);

    const handleViewStudent = (student: Student) => {
        setViewingStudent(student);
        setIsProfileModalVisible(true);
    };

    const handleProfileModalClose = () => {
        setViewingStudent(null);
        setIsProfileModalVisible(false);
    };

    // Color initials generator
    const getAvatarBg = (name: string) => {
        const gradients = [
            'bg-gradient-to-tr from-blue-600 to-indigo-500 text-white',
            'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white',
            'bg-gradient-to-tr from-purple-600 to-pink-500 text-white',
            'bg-gradient-to-tr from-amber-500 to-orange-500 text-white',
            'bg-gradient-to-tr from-rose-600 to-pink-500 text-white',
            'bg-gradient-to-tr from-cyan-600 to-blue-500 text-white',
        ];
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return gradients[Math.abs(hash) % gradients.length];
    };

    const StudentAvatar: React.FC<{ name: string; photoUrl?: string | null; size?: 'sm' | 'md' | 'lg' }> = ({
        name,
        photoUrl,
        size = 'sm',
    }) => {
        const [imgError, setImgError] = useState(false);
        const initials = (name || '')
            .split(' ')
            .map(p => p[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        const sizeClasses = {
            sm: 'w-10 h-10 text-xs rounded-xl',
            md: 'w-12 h-12 text-sm rounded-xl',
            lg: 'w-20 h-20 text-2xl rounded-2xl',
        }[size];

        if (photoUrl && !imgError) {
            return (
                <img
                    src={photoUrl}
                    alt={name}
                    onError={() => setImgError(true)}
                    className={`${sizeClasses} object-cover border border-slate-200/80 shadow-sm shrink-0`}
                />
            );
        }

        return (
            <div
                className={`${sizeClasses} flex items-center justify-center font-bold shrink-0 shadow-sm ${getAvatarBg(
                    name
                )}`}
            >
                {initials || <UserOutlined />}
            </div>
        );
    };

    // Clean isolated targeted print
    const handlePrint = () => {
        if (students.length === 0 || !assignmentForSelectedYear) {
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
            .map(
                (s, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                    <td style="padding: 8px 10px; text-align: center; font-weight: 600; color: #64748b; width: 45px;">${s.roll_no || idx + 1}</td>
                    <td style="padding: 8px 10px; font-weight: 600; color: #0284c7;">${s.register_no}</td>
                    <td style="padding: 8px 12px; font-weight: 600; color: #0f172a;">${s.full_name}</td>
                    <td style="padding: 8px 10px; color: #475569; text-transform: capitalize;">${s.gender || 'N/A'}</td>
                    <td style="padding: 8px 10px; color: #475569;">${s.parent_contact || 'N/A'}</td>
                    <td style="padding: 8px 10px; color: #475569;">${s.blood_group || 'N/A'}</td>
                </tr>
            `
            )
            .join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Class Teacher Roll - Class ${classMetrics.className} ${classMetrics.sectionName}</title>
                    <style>
                        @page { size: A4 portrait; margin: 15mm; }
                        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; }
                        .header { text-align: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 16px; }
                        .school-name { font-size: 20px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin: 0; }
                        .school-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
                        .doc-title { font-size: 15px; font-weight: 700; color: #0f172a; margin-top: 8px; }
                        .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 16px; margin-bottom: 16px; font-size: 13px; }
                        .meta-item { display: flex; flex-direction: column; }
                        .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; }
                        .meta-val { font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
                        th { background: #0369a1; color: #ffffff; padding: 9px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
                        .footer { margin-top: 25px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="school-name">${schoolName}</div>
                        ${schoolAddress ? `<div class="school-sub">${schoolAddress}</div>` : ''}
                        <div class="doc-title">CLASS TEACHER OFFICIAL STUDENT REGISTER</div>
                    </div>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Assigned Class</span>
                            <span class="meta-val">Class ${classMetrics.className} - Section ${classMetrics.sectionName}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Academic Year</span>
                            <span class="meta-val">${selectedYear}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Class Teacher</span>
                            <span class="meta-val">${user?.full_name || 'Class Teacher'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Total Strength</span>
                            <span class="meta-val">${classMetrics.total} Students (${classMetrics.boys} Boys, ${classMetrics.girls} Girls)</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45px; text-align: center;">Roll</th>
                                <th style="width: 110px;">Reg No</th>
                                <th>Student Full Name</th>
                                <th style="width: 80px;">Gender</th>
                                <th style="width: 120px;">Parent Contact</th>
                                <th style="width: 80px;">Blood Group</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div class="footer">
                        <span>Printed on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</span>
                        <span>Generated by: ${user?.full_name || 'Class Teacher Portal'}</span>
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
        if (students.length === 0 || !assignmentForSelectedYear) {
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
                `CLASS TEACHER REGISTER: CLASS ${classMetrics.className} - ${classMetrics.sectionName} (${selectedYear})`,
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
            doc.text('CLASS TEACHER:', 18, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(user?.full_name || 'Class Teacher', 52, metaY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('TOTAL ENROLLED:', 125, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(`${classMetrics.total} Students (${classMetrics.boys} Boys, ${classMetrics.girls} Girls)`, 158, metaY + 6);

            // Table Data
            const tableRows = students.map((s, idx) => [
                s.roll_no || String(idx + 1),
                s.register_no,
                s.full_name,
                s.gender || 'N/A',
                s.parent_contact || 'N/A',
                s.blood_group || 'N/A',
            ]);

            autoTable(doc, {
                startY: metaY + 18,
                head: [['Roll', 'Register No', 'Student Name', 'Gender', 'Parent Contact', 'Blood']],
                body: tableRows,
                headStyles: {
                    fillColor: [3, 105, 161],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 9,
                },
                styles: {
                    fontSize: 8.5,
                    cellPadding: 3,
                    textColor: [30, 41, 59],
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2,
                },
                columnStyles: {
                    0: { cellWidth: 12, halign: 'center' },
                    1: { cellWidth: 32, fontStyle: 'bold', textColor: [2, 132, 199] },
                    2: { cellWidth: 55, fontStyle: 'bold' },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 35 },
                    5: { cellWidth: 16, halign: 'center' },
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

            const fileName = `Class_${classMetrics.className}_${classMetrics.sectionName}_ClassTeacher_Students.pdf`;
            doc.save(fileName);
            message.success('Class student register PDF downloaded successfully');
        } catch (err) {
            console.error('PDF generation error:', err);
            message.error('Failed to generate PDF');
        }
    };

    const isLoading = statsLoading || loadingStudents;
    const finalError = statsError || error;

    if (isLoading && students.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[420px] p-8 space-y-4">
                <Spin size="large" />
                <span className="text-sm font-medium text-slate-500">Loading your class student roster...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/70  space-y-5">
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
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
                                <CrownOutlined />
                                <span>Class Teacher: {user?.full_name || 'Teacher'}</span>
                            </span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <span>My Class Students</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            Dedicated register for class teachers to view and manage students in their assigned class.
                        </p>
                    </div>

                    {/* Controls: Academic Year Selector + View Toggle + Print & PDF */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Academic Year Selector */}
                        <div className="w-full sm:w-auto min-w-[200px]">
                            <Select
                                placeholder="Academic Year"
                                className="w-full"
                                size="large"
                                value={selectedYear}
                                onChange={val => setSelectedYear(val)}
                                loading={statsLoading}
                            >
                                {academicYearOptions.map(year => (
                                    <Option key={year} value={year}>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarOutlined className="text-blue-500" />
                                            <span>{year}</span>
                                            {year === stats.activeAcademicYear && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-bold px-1 rounded ml-1">
                                                    Current
                                                </span>
                                            )}
                                        </span>
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        {/* View Switcher */}
                        <div className="inline-flex p-1 bg-slate-100 border border-slate-200 rounded-xl">
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
                        </div>

                        {/* Print & PDF Export */}
                        <Tooltip title="Print Class Student Register">
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={students.length === 0}
                                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-white cursor-pointer"
                            >
                                <PrinterOutlined className="text-base" />
                            </button>
                        </Tooltip>

                        <Tooltip title="Export Vector PDF">
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={students.length === 0}
                                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <FilePdfOutlined className="text-base" />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Class Teacher Banner */}
                {assignmentForSelectedYear && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-400 uppercase tracking-wider">
                                Your Class:
                            </span>
                            <span className="font-bold text-slate-800 bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl">
                                Class {assignmentForSelectedYear.class_name} - Section {assignmentForSelectedYear.section_name}
                            </span>
                            <span className="text-slate-500 font-medium hidden sm:inline">
                                ({assignmentForSelectedYear.academic_year})
                            </span>
                        </div>
                        <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            <CheckCircleOutlined /> Active Class Teacher
                        </span>
                    </div>
                )}
            </div>

            {finalError && (
                <Alert
                    message="Error Loading Students"
                    description={finalError}
                    type="error"
                    showIcon
                    className="rounded-xl shadow-sm"
                />
            )}

            {selectedYear && assignmentForSelectedYear ? (
                <>
                    {/* 2. Class Summary Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                        {/* Total Strength */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Strength
                                </span>
                                <div className="text-2xl font-bold text-slate-800">
                                    {classMetrics.total} <span className="text-xs font-normal text-slate-500">Students</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    Class {classMetrics.className} - {classMetrics.sectionName}
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <TeamOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Gender Demographic */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Gender Demographic
                                </span>
                                <div className="text-base font-bold text-slate-800 flex items-center gap-2 pt-0.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                                        <ManOutlined /> {classMetrics.boys} Boys
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                        <WomanOutlined /> {classMetrics.girls} Girls
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 font-medium pt-0.5">
                                    Enrolled Pupils
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                                <UserOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Class Teacher In-Charge */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Head Teacher
                                </span>
                                <div className="text-lg font-bold text-slate-800 truncate max-w-[170px]">
                                    {user?.full_name || 'You'}
                                </div>
                                <div className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                                    <CrownOutlined /> Class Teacher
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <CrownOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Academic Year Info */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Academic Year
                                </span>
                                <div className="text-lg font-bold text-slate-800 truncate">
                                    AY {selectedYear}
                                </div>
                                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                                    <CheckCircleOutlined /> Active Cohort
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <CalendarOutlined className="text-lg" />
                            </div>
                        </div>
                    </div>

                    {/* 3. Search & Filter Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="w-full sm:w-80">
                            <Input
                                prefix={<SearchOutlined className="text-slate-400" />}
                                placeholder="Search by name, roll no, reg no..."
                                allowClear
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Gender:</span>
                            <Select
                                value={genderFilter}
                                onChange={val => setGenderFilter(val)}
                                className="w-full sm:w-36"
                            >
                                <Option value="all">All Genders</Option>
                                <Option value="male">Boys ({classMetrics.boys})</Option>
                                <Option value="female">Girls ({classMetrics.girls})</Option>
                            </Select>
                            <span className="text-xs font-semibold text-slate-400 ml-2 hidden md:inline">
                                Showing {filteredStudents.length} of {students.length}
                            </span>
                        </div>
                    </div>

                    {/* 4. Students Display: Table or Cards */}
                    {filteredStudents.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                            <Empty description="No students found for this class matching your filter." />
                        </div>
                    ) : viewMode === 'table' ? (
                        /* Modern Table View */
                        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                                            <th className="py-3.5 px-4 w-14 text-center">Roll</th>
                                            <th className="py-3.5 px-4 w-36">Register No</th>
                                            <th className="py-3.5 px-4">Student Details</th>
                                            <th className="py-3.5 px-4 w-28">Gender</th>
                                            <th className="py-3.5 px-4">Parent Contact</th>
                                            <th className="py-3.5 px-4 w-24 text-center">Status</th>
                                            <th className="py-3.5 px-4 w-28 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {filteredStudents.map((student, idx) => {
                                            const initials = (student.full_name || '')
                                                .split(' ')
                                                .map(p => p[0])
                                                .slice(0, 2)
                                                .join('')
                                                .toUpperCase();

                                            return (
                                                <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                                                            {student.roll_no || idx + 1}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewStudent(student)}
                                                            className="font-mono text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-blue-50/60 px-2.5 py-1 rounded-md border border-blue-100"
                                                        >
                                                            {student.register_no}
                                                        </button>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <StudentAvatar
                                                                name={student.full_name}
                                                                photoUrl={student.photo_url}
                                                                size="sm"
                                                            />
                                                            <div>
                                                                <div className="font-bold text-slate-800">
                                                                    {student.full_name}
                                                                </div>
                                                                {student.email && (
                                                                    <div className="text-xs text-slate-400 flex items-center gap-1">
                                                                        <MailOutlined className="text-[10px]" />
                                                                        <span>{student.email}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span
                                                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md ${
                                                                (student.gender || '').toLowerCase() === 'female' ||
                                                                (student.gender || '').toLowerCase() === 'girl'
                                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                                    : 'bg-sky-50 text-sky-700 border border-sky-200'
                                                            }`}
                                                        >
                                                            {(student.gender || '').toLowerCase() === 'female' ||
                                                            (student.gender || '').toLowerCase() === 'girl' ? (
                                                                <WomanOutlined />
                                                            ) : (
                                                                <ManOutlined />
                                                            )}
                                                            <span className="capitalize">{student.gender || 'N/A'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <div className="space-y-0.5">
                                                            {student.parent_contact ? (
                                                                <div className="text-xs font-medium text-slate-700 flex items-center gap-1">
                                                                    <PhoneOutlined className="text-slate-400 text-[10px]" />
                                                                    <span>{student.parent_contact}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-slate-400">N/A</span>
                                                            )}
                                                            {student.father_name && (
                                                                <div className="text-[11px] text-slate-400">
                                                                    Father: {student.father_name}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                            <span>Active</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewStudent(student)}
                                                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 cursor-pointer"
                                                        >
                                                            <EyeOutlined />
                                                            <span>Profile</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* Card Grid View */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStudents.map(student => {
                                const initials = (student.full_name || '')
                                    .split(' ')
                                    .map(p => p[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase();

                                return (
                                    <div
                                        key={student.id}
                                        className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                                    >
                                        <div className="space-y-4">
                                            {/* Card Top: Avatar, Name, Reg No */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <StudentAvatar
                                                        name={student.full_name}
                                                        photoUrl={student.photo_url}
                                                        size="md"
                                                    />
                                                    <div>
                                                        <h3 className="font-bold text-slate-800 text-base">
                                                            {student.full_name}
                                                        </h3>
                                                        <span className="font-mono text-xs font-semibold text-blue-600">
                                                            {student.register_no}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                                                    #{student.roll_no || '-'}
                                                </span>
                                            </div>

                                            {/* Info Chips */}
                                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100">
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                        Gender
                                                    </span>
                                                    <span className="font-semibold text-slate-700 capitalize">
                                                        {student.gender || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="bg-slate-50 p-2 rounded-lg">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                                                        Blood Group
                                                    </span>
                                                    <span className="font-semibold text-rose-600">
                                                        {student.blood_group || 'N/A'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Contact Details */}
                                            <div className="space-y-1 text-xs text-slate-500">
                                                {student.parent_contact && (
                                                    <div className="flex items-center gap-1.5">
                                                        <PhoneOutlined className="text-slate-400 text-[11px]" />
                                                        <span>{student.parent_contact}</span>
                                                    </div>
                                                )}
                                                {student.email && (
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <MailOutlined className="text-slate-400 text-[11px]" />
                                                        <span className="truncate">{student.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Footer Button */}
                                        <div className="mt-4 pt-3 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => handleViewStudent(student)}
                                                className="w-full inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 cursor-pointer"
                                            >
                                                <EyeOutlined />
                                                <span>View Full Profile</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            ) : (
                /* Empty state when teacher is not a class teacher in the selected year */
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm space-y-4">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="space-y-1">
                                <p className="font-semibold text-slate-700">
                                    {selectedYear
                                        ? `You are not assigned as a Class Teacher for the ${selectedYear} academic year.`
                                        : 'Please select an academic year.'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    This view is reserved for designated Class Teachers. As a subject teacher, you can browse all your assigned class students in the student directory.
                                </p>
                            </div>
                        }
                    />
                    <div>
                        <button
                            type="button"
                            onClick={() => dispatch(setCurrentPage('mystudents'))}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 cursor-pointer"
                        >
                            <TeamOutlined />
                            <span>Go to My Students Directory</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 5. Modern Student Profile Modal */}
            {viewingStudent && (
                <Modal
                    open={isProfileModalVisible}
                    onCancel={handleProfileModalClose}
                    footer={null}
                    width={840}
                    className="rounded-2xl overflow-hidden p-0"
                >
                    <div className="p-1 sm:p-2 space-y-6">
                        {/* Student Hero Card */}
                        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
                            <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                                <StudentAvatar
                                    name={viewingStudent.full_name}
                                    photoUrl={viewingStudent.photo_url}
                                    size="lg"
                                />
                                <div className="space-y-1.5 flex-1">
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                                            {viewingStudent.full_name}
                                        </h2>
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 border border-emerald-300/40 text-emerald-100">
                                            {viewingStudent.status || 'Active'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-blue-100">
                                        <span>
                                            Reg No: <strong className="text-white">{viewingStudent.register_no}</strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                            Roll No: <strong className="text-white">{viewingStudent.roll_no || 'N/A'}</strong>
                                        </span>
                                        <span>•</span>
                                        <span>
                                            Class: <strong className="text-white">{viewingStudent.class_name} - {viewingStudent.section_name}</strong>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Profile Data Sections */}
                        <div className="max-h-[60vh] overflow-y-auto space-y-5 pr-1 scrollbar-thin">
                            {/* Personal Information */}
                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <UserOutlined className="text-blue-500" />
                                    <span>Personal Information</span>
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-medium">Gender</span>
                                        <span className="font-semibold text-slate-800 capitalize">{viewingStudent.gender || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Date of Birth</span>
                                        <span className="font-semibold text-slate-800">
                                            {viewingStudent.dob ? dayjs(viewingStudent.dob).format('DD MMM YYYY') : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Blood Group</span>
                                        <span className="font-semibold text-rose-600">{viewingStudent.blood_group || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Mother Tongue</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.mother_tongue || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Nationality</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.nationality || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Religion</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.religion || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Caste</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.caste || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Birth Place</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.birth_place || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact & Parent Information */}
                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <HomeOutlined className="text-indigo-500" />
                                    <span>Contact & Parent Information</span>
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-medium">Father's Name</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.father_name || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Mother's Name</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.mother_name || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Parent Contact</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.parent_contact || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Parent Email</span>
                                        <span className="font-semibold text-slate-800 truncate block">{viewingStudent.parent_email || 'N/A'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-400 block font-medium">Permanent Address</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.permanent_address || 'N/A'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-400 block font-medium">City, State & Pin</span>
                                        <span className="font-semibold text-slate-800">
                                            {[viewingStudent.city, viewingStudent.state, viewingStudent.pin_code].filter(Boolean).join(', ') || 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Admission & Academic Record */}
                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <IdcardOutlined className="text-emerald-500" />
                                    <span>Admission & Academic Record</span>
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-medium">Admission No</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.admission_no || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Admission Date</span>
                                        <span className="font-semibold text-slate-800">
                                            {viewingStudent.admission_date ? dayjs(viewingStudent.admission_date).format('DD MMM YYYY') : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Academic Year</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.academic_year || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Admitted Class</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.admitted_class || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Health Information */}
                            <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200/80 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <HeartOutlined className="text-rose-500" />
                                    <span>Health & Medical Information</span>
                                </h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                    <div>
                                        <span className="text-slate-400 block font-medium">Height</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.height ? `${viewingStudent.height} cm` : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Weight</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.weight ? `${viewingStudent.weight} kg` : 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block font-medium">Known Allergies</span>
                                        <span className="font-semibold text-slate-800">{viewingStudent.known_allergies || 'None Reported'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="pt-3 border-t border-slate-100 flex justify-end">
                            <button
                                type="button"
                                onClick={handleProfileModalClose}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default MyClassStudents;
