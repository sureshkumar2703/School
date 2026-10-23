import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Spin, Alert, Empty, Select, Modal, Input, Tooltip, message, Tag } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { supabase } from '../../service/supabaseClient';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    UserOutlined,
    ArrowLeftOutlined,
    TeamOutlined,
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

interface StudentAllocation {
    id: string;
    register_no: string;
    full_name: string;
    email?: string;
    class_name: string;
    section_name: string;
    academic_year: string;
    roll_no?: string;
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

interface TeacherAssignment {
    class_name: string;
    section_name: string;
    academic_year: string;
}

const MyStudents: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    const [allStudents, setAllStudents] = useState<StudentAllocation[]>([]);
    const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [genderFilter, setGenderFilter] = useState<string>('all');

    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentAllocation | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Active academic years list
    const academicYearOptions = useMemo(() => {
        const fromCals = calendars.filter(c => c.status === 'Active');
        if (fromCals.length > 0) return fromCals;
        return calendars;
    }, [calendars]);

    // Default select active / current academic year
    useEffect(() => {
        if (academicYearOptions.length > 0 && selectedYear === null) {
            const currentYear = academicYearOptions.find(c => c.is_current)?.academic_year || academicYearOptions[0].academic_year;
            setSelectedYear(currentYear);
        }
    }, [academicYearOptions, selectedYear]);

    // Fetch assignments and student records
    useEffect(() => {
        if (user && user.full_name && user.organization_key) {
            const fetchAssignmentsAndStudents = async () => {
                setLoading(true);
                setError(null);
                try {
                    // Fetch all assignments for the teacher
                    const { data: rawAssignments, error: assignmentError } = await supabase
                        .from('class_subject_teacher_mapping')
                        .select('class_name, section_name, academic_year')
                        .eq('teacher_name', user.full_name)
                        .eq('organization_key', user.organization_key);

                    if (assignmentError) {
                        throw new Error(`Error fetching assignments: ${assignmentError.message}`);
                    }

                    if (!rawAssignments || rawAssignments.length === 0) {
                        setAssignments([]);
                        setAllStudents([]);
                        setLoading(false);
                        return;
                    }

                    // Deduplicate assignments
                    const uniqueAssignmentsMap = new Map<string, TeacherAssignment>();
                    rawAssignments.forEach(a => {
                        const key = `${a.class_name}||${a.section_name}||${a.academic_year}`;
                        if (!uniqueAssignmentsMap.has(key)) {
                            uniqueAssignmentsMap.set(key, a);
                        }
                    });
                    const uniqueAssignments = Array.from(uniqueAssignmentsMap.values());
                    setAssignments(uniqueAssignments);

                    // Fetch students for these classes and academic years
                    const studentPromises = uniqueAssignments.map(assignment =>
                        supabase
                            .from('students')
                            .select('*')
                            .eq('organization_key', user.organization_key!)
                            .eq('admitted_class', assignment.class_name)
                            .eq('academic_year', assignment.academic_year)
                    );

                    const studentResults = await Promise.all(studentPromises);

                    let fetchedStudents: StudentAllocation[] = [];
                    for (const result of studentResults) {
                        if (result.error) {
                            throw new Error(`Error fetching students: ${result.error.message}`);
                        }
                        if (result.data && result.data.length > 0) {
                            // Fetch sections and roll numbers for these students
                            const { data: allocations } = await supabase
                                .from('class_section_allocations')
                                .select('register_no, section_name, roll_no')
                                .in('register_no', result.data.map(s => s.register_no));

                            const sectionMap = new Map(allocations?.map(a => [a.register_no, a.section_name]));
                            const rollMap = new Map(allocations?.map(a => [a.register_no, a.roll_no]));

                            const studentsWithSection = result.data.map(student => ({
                                ...student,
                                class_name: student.admitted_class,
                                section_name: sectionMap.get(student.register_no) || '',
                                roll_no: rollMap.get(student.register_no) || student.roll_no || '',
                            }));

                            fetchedStudents.push(...(studentsWithSection as any));
                        }
                    }

                    // Deduplicate by student id
                    const uniqueStudentsRaw = Array.from(new Map(fetchedStudents.map(s => [s.id, s])).values());

                    // Fetch passport photos from student_documents
                    const studentIds = uniqueStudentsRaw.map(s => s.id).filter(Boolean);
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

                    const uniqueStudents = uniqueStudentsRaw.map(s => ({
                        ...s,
                        photo_url: photoMap.get(s.id) || s.photo_url || null,
                    }));

                    setAllStudents(uniqueStudents);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };

            fetchAssignmentsAndStudents();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Available classes strictly for the selected academic year
    const availableClasses = useMemo(() => {
        if (!selectedYear) return [];

        const classMap = new Map<string, { key: string; className: string; sectionName: string; label: string; count: number }>();

        // Find classes from assignments in this year
        assignments
            .filter(a => a.academic_year === selectedYear)
            .forEach(a => {
                const key = `${a.class_name}||${a.section_name}`;
                if (!classMap.has(key)) {
                    classMap.set(key, {
                        key,
                        className: a.class_name,
                        sectionName: a.section_name,
                        label: `Class ${a.class_name} - ${a.section_name}`,
                        count: 0,
                    });
                }
            });

        // Calculate student counts for each class
        allStudents
            .filter(s => s.academic_year === selectedYear)
            .forEach(s => {
                const key = `${s.class_name}||${s.section_name}`;
                if (classMap.has(key)) {
                    classMap.get(key)!.count += 1;
                }
            });

        return Array.from(classMap.values()).sort(
            (a, b) => a.className.localeCompare(b.className) || a.sectionName.localeCompare(b.sectionName)
        );
    }, [assignments, allStudents, selectedYear]);

    // Auto-select first class when availableClasses changes
    useEffect(() => {
        if (availableClasses.length > 0) {
            const exists = availableClasses.some(c => c.key === selectedClassKey);
            if (!exists) {
                setSelectedClassKey(availableClasses[0].key);
            }
        } else {
            setSelectedClassKey(null);
        }
    }, [availableClasses, selectedClassKey]);

    // Filter students for the selected class & section
    const currentClassStudents = useMemo(() => {
        if (!selectedClassKey || !selectedYear) return [];
        const [className, sectionName] = selectedClassKey.split('||');

        return allStudents.filter(
            s => s.class_name === className && s.section_name === sectionName && s.academic_year === selectedYear
        );
    }, [allStudents, selectedClassKey, selectedYear]);

    // Filtered by search and gender
    const filteredStudents = useMemo(() => {
        return currentClassStudents
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
    }, [currentClassStudents, searchTerm, genderFilter]);

    // Selected class summary metrics
    const classMetrics = useMemo(() => {
        const total = currentClassStudents.length;
        let boys = 0;
        let girls = 0;
        let active = 0;

        currentClassStudents.forEach(s => {
            const g = (s.gender || '').toLowerCase();
            if (g === 'male' || g === 'boy') boys++;
            else if (g === 'female' || g === 'girl') girls++;
            if (s.status === 'Active' || !s.status) active++;
        });

        const selectedInfo = availableClasses.find(c => c.key === selectedClassKey);

        return {
            total,
            boys,
            girls,
            active,
            className: selectedInfo?.className || '',
            sectionName: selectedInfo?.sectionName || '',
        };
    }, [currentClassStudents, availableClasses, selectedClassKey]);

    const handleViewStudent = (student: StudentAllocation) => {
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
        if (currentClassStudents.length === 0) {
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

        const rowsHtml = currentClassStudents
            .map(
                (s, idx) => `
                <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #f8fafc;'}">
                    <td style="padding: 8px 10px; text-align: center; font-weight: 600; color: #64748b; width: 40px;">${s.roll_no || idx + 1}</td>
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
                    <title>Student Roll List - Class ${classMetrics.className} ${classMetrics.sectionName}</title>
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
                        <div class="doc-title">OFFICIAL STUDENT ENROLLMENT LIST</div>
                    </div>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">Class & Section</span>
                            <span class="meta-val">Class ${classMetrics.className} - Section ${classMetrics.sectionName}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Academic Year</span>
                            <span class="meta-val">${selectedYear}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Total Strength</span>
                            <span class="meta-val">${classMetrics.total} Students (${classMetrics.boys} Boys, ${classMetrics.girls} Girls)</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Faculty</span>
                            <span class="meta-val">${user?.full_name || 'Teacher'}</span>
                        </div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">Roll</th>
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
                        <span>Generated by: ${user?.full_name || 'Faculty Portal'}</span>
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
        if (currentClassStudents.length === 0) {
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
                `STUDENT ROLL: CLASS ${classMetrics.className} - ${classMetrics.sectionName} (${selectedYear})`,
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
            doc.text('TOTAL ENROLLED:', 18, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(`${classMetrics.total} Students (${classMetrics.boys} Boys, ${classMetrics.girls} Girls)`, 52, metaY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(71, 85, 105);
            doc.text('FACULTY:', 130, metaY + 6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(user?.full_name || 'Teacher', 150, metaY + 6);

            // Table Data
            const tableRows = currentClassStudents.map((s, idx) => [
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

            const fileName = `Class_${classMetrics.className}_${classMetrics.sectionName}_Students.pdf`;
            doc.save(fileName);
            message.success('Student roll PDF downloaded successfully');
        } catch (err) {
            console.error('PDF generation error:', err);
            message.error('Failed to generate PDF');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[420px] p-8 space-y-4">
                <Spin size="large" />
                <span className="text-sm font-medium text-slate-500">Loading student directory...</span>
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
                            <span>My Students Directory</span>
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500">
                            View, search, and manage students enrolled in your assigned classes and sections.
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
                            >
                                {academicYearOptions.map(y => (
                                    <Option key={y.id || y.academic_year} value={y.academic_year}>
                                        <span className="flex items-center gap-1.5">
                                            <CalendarOutlined className="text-blue-500" />
                                            <span>{y.academic_year}</span>
                                            {y.is_current && (
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
                        <Tooltip title="Print Clean Student Roll List">
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={currentClassStudents.length === 0}
                                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-white cursor-pointer"
                            >
                                <PrinterOutlined className="text-base" />
                            </button>
                        </Tooltip>

                        <Tooltip title="Export Vector PDF">
                            <button
                                type="button"
                                onClick={handleDownloadPdf}
                                disabled={currentClassStudents.length === 0}
                                className="inline-flex items-center justify-center p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            >
                                <FilePdfOutlined className="text-base" />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* 2. Quick Class & Section Switcher Buttons */}
                {availableClasses.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                            Your Classes:
                        </span>
                        {availableClasses.map(cls => {
                            const isSelected = cls.key === selectedClassKey;
                            return (
                                <button
                                    key={cls.key}
                                    type="button"
                                    onClick={() => setSelectedClassKey(cls.key)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200 ring-2 ring-blue-400 ring-offset-1'
                                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                                    }`}
                                >
                                    <TeamOutlined className="text-[11px]" />
                                    <span>{cls.label}</span>
                                    <span
                                        className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            isSelected ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-600'
                                        }`}
                                    >
                                        {cls.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {error && (
                <Alert
                    message="Error Loading Students"
                    description={error}
                    type="error"
                    showIcon
                    className="rounded-xl shadow-sm"
                />
            )}

            {selectedClassKey && availableClasses.length > 0 ? (
                <>
                    {/* 3. Class Summary Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                        {/* Total Strength */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Total Enrolled
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

                        {/* Gender Breakdown */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Gender Distribution
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
                                    Class Demographic
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                                <UserOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Active Students */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Enrollment Status
                                </span>
                                <div className="text-2xl font-bold text-slate-800">
                                    {classMetrics.active} <span className="text-xs font-normal text-emerald-600 font-semibold">Active</span>
                                </div>
                                <div className="text-xs text-slate-500 font-medium">
                                    100% Verified in Roll
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <CheckCircleOutlined className="text-lg" />
                            </div>
                        </div>

                        {/* Academic Year Info */}
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex items-start justify-between">
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Current Cohort
                                </span>
                                <div className="text-lg font-bold text-slate-800 truncate">
                                    AY {selectedYear}
                                </div>
                                <div className="text-xs text-blue-600 font-semibold">
                                    {classMetrics.className} - {classMetrics.sectionName} Roster
                                </div>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <CalendarOutlined className="text-lg" />
                            </div>
                        </div>
                    </div>

                    {/* 4. Search & Filter Bar */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="w-full sm:w-80">
                            <Input
                                prefix={<SearchOutlined className="text-slate-400" />}
                                placeholder="Search by name, roll no, reg no, or email..."
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
                                Showing {filteredStudents.length} of {currentClassStudents.length}
                            </span>
                        </div>
                    </div>

                    {/* 5. Students Display: Table or Cards */}
                    {filteredStudents.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                            <Empty description="No students found matching your search or filters." />
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
                                                            <div
                                                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarBg(
                                                                    student.full_name
                                                                )}`}
                                                            >
                                                                {initials || <UserOutlined />}
                                                            </div>
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
                                                    <div
                                                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${getAvatarBg(
                                                            student.full_name
                                                        )}`}
                                                    >
                                                        {initials || <UserOutlined />}
                                                    </div>
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
                /* Empty state when no classes in this academic year */
                <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-sm">
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                            <div className="space-y-1">
                                <p className="font-semibold text-slate-700">
                                    {availableClasses.length === 0
                                        ? `You have no assigned classes in Academic Year ${selectedYear || ''}.`
                                        : 'Please select a class from the list above.'}
                                </p>
                                <p className="text-xs text-slate-400">
                                    Try selecting another academic year or contact your school administrator.
                                </p>
                            </div>
                        }
                    />
                </div>
            )}

            {/* 6. Modern Student Profile Modal */}
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
                                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center text-3xl font-bold shadow-lg shrink-0">
                                    {viewingStudent.photo_url ? (
                                        <img
                                            src={viewingStudent.photo_url}
                                            alt={viewingStudent.full_name}
                                            className="w-full h-full object-cover rounded-2xl"
                                        />
                                    ) : (
                                        <UserOutlined />
                                    )}
                                </div>
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

export default MyStudents;
