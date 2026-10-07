

import React, { useState, useEffect, useMemo, CSSProperties } from 'react';
import { Select, Button, Table, message, Card, Typography, Row, Col, Spin, Empty, InputNumber } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchClassesRequest, type Class } from '../../store/features/classes/classesSlice';
import { fetchSubjectsRequest, type Subject } from '../../store/features/subjects/subjectsSlice';
import { updateMappingRequest, fetchMappingsRequest } from '../../store/features/class-mappings/classMappingsSlice';
import { supabase } from '../../service/supabaseClient';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';


const { Title } = Typography;
const { Option } = Select;

interface AssignmentRow {
    key: number;
    subjectId: string | null;
    teacherId: string | null;
    role: string | null;
}

const ClassTeacherManagement: React.FC = () => {
    const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [totalSubjects, setTotalSubjects] = useState<number>(0);
    const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teachers, setTeachers] = useState<any[]>([]);
    const [teachersLoading, setTeachersLoading] = useState(false);

    const dispatch: AppDispatch = useDispatch();
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { subjects, loading: subjectsLoading } = useSelector((state: RootState) => state.subjects);
    const { mappings: savedMappings, loading: mappingsLoading } = useSelector((state: RootState) => state.classMappings);
    const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { user } = useSelector((state: RootState) => state.auth);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);

    useEffect(() => {
        if(user?.organization_key) {
            dispatch(fetchClassesRequest());
            dispatch(fetchSubjectsRequest());
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
            const fetchTeachers = async () => {
                setTeachersLoading(true);
                const { data } = await supabase.from('teachers').select('*').eq('organization_key', user.organization_key);
                setTeachers(data || []);
                setTeachersLoading(false);
            }
            fetchTeachers();
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (selectedClassName && selectedSection && selectedAcademicYear) {
            dispatch(fetchMappingsRequest({ organizationKey: user!.organization_key!, className: selectedClassName, sectionName: selectedSection, academicYear: selectedAcademicYear }));
        }
    }, [dispatch, selectedClassName, selectedSection, selectedAcademicYear, user]);
    
    useEffect(() => {
        if (academicYears.length > 0 && !selectedAcademicYear) {
            const currentYear = academicYears.find(cal => cal.is_current)?.academic_year;
            if (currentYear) {
                setSelectedAcademicYear(currentYear);
            }
        }
    }, [academicYears, selectedAcademicYear]);

    useEffect(() => {
        if (selectedClassName && selectedSection && selectedAcademicYear) {
            if (savedMappings.length > 0) {
                 const newRows: AssignmentRow[] = savedMappings.map((mapping, index) => {
                    const subject = subjects.find(s => s.subject_name === mapping.subject_name);
                    const teacher = teachers.find(t => t.full_name === mapping.teacher_name);
                    return {
                        key: index,
                        subjectId: subject?.id || null,
                        teacherId: teacher?.id || null,
                        role: mapping.role || 'Subject Teacher'
                    };
                });
                setAssignmentRows(newRows);
                setTotalSubjects(newRows.length);
            } else {
                setTotalSubjects(0);
                setAssignmentRows([]);
            }
        }
    }, [savedMappings, selectedClassName, selectedSection, selectedAcademicYear, subjects, teachers]);
    
    const uniqueClassNames = useMemo(() => {
        const activeClasses = classes.filter(c => c.status === 'Active');
        return [...new Set(activeClasses.map(c => c.class_name))];
    }, [classes]);
    
    const sectionsForSelectedClass = useMemo(() => {
        if (!selectedClassName) return [];
        return [...new Set(classes
            .filter(c => c.class_name === selectedClassName && c.status === 'Active')
            .map(c => c.section)
            .filter(Boolean))] as string[];
    }, [classes, selectedClassName]);


    const handleTotalSubjectsChange = (value: number | null) => {
        const count = value || 0;
        setTotalSubjects(count);
        const newRows: AssignmentRow[] = [];
        for (let i = 0; i < count; i++) {
            newRows.push({ key: i, subjectId: assignmentRows[i]?.subjectId || null, teacherId: assignmentRows[i]?.teacherId || null, role: assignmentRows[i]?.role || 'Subject Teacher' });
        }
        setAssignmentRows(newRows);
    };

    const handleRowChange = (index: number, field: keyof Omit<AssignmentRow, 'key'>, value: string) => {
        const updatedRows = [...assignmentRows];
        const currentRow = { ...updatedRows[index], [field]: value };
    
        if (field === 'subjectId') {
            currentRow.teacherId = null;
        }

        if (field === 'teacherId') {
            const existingAssignment = updatedRows.find(
                (row, i) => i !== index && row.teacherId === value && row.role
            );
            if (existingAssignment) {
                currentRow.role = existingAssignment.role;
            }
        }
        updatedRows[index] = currentRow;
        setAssignmentRows(updatedRows);
    };
    
    const handleSaveAssignments = () => {
        if (!selectedClassName || !selectedSection || !selectedAcademicYear || !user?.organization_key) {
            message.error("Please select a class, section, and academic year first.");
            return;
        }

        const assignmentsToSave = assignmentRows
            .filter(row => row.subjectId && row.teacherId)
            .map(row => {
                const subject = subjects.find(s => s.id === row.subjectId);
                const teacher = teachers.find(t => t.id === row.teacherId);
                return {
                    organization_key: user.organization_key,
                    class_name: selectedClassName,
                    section_name: selectedSection,
                    academic_year: selectedAcademicYear,
                    subject_name: subject?.subject_name,
                    teacher_name: teacher?.full_name,
                    role: (row.role as 'Class Teacher' | 'Subject Teacher') || 'Subject Teacher',
                };
            }).filter(a => a.subject_name && a.teacher_name); // Ensure names were found
        
        if (assignmentsToSave.length === 0) {
            message.warning("No complete assignments to save.");
            return;
        }

        dispatch(updateMappingRequest({ assignments: assignmentsToSave as any }));
        message.success('Assignments saved successfully!');
        
        // Clear the form
        setSelectedClassName(null);
        setSelectedSection(null);
        setTotalSubjects(0);
        setAssignmentRows([]);
    };
    
    const isLoading = classesLoading || subjectsLoading || teachersLoading || mappingsLoading || calendarsLoading;
    
    const handleClassChange = (value: string | null) => {
        setSelectedClassName(value || null);
        setSelectedSection(null);
        setTotalSubjects(0);
        setAssignmentRows([]);
    };

    const handleSectionChange = (value: string | null) => {
        setSelectedSection(value || null);
        const currentYear = academicYears.find(cal => cal.is_current)?.academic_year || null;
        setSelectedAcademicYear(value ? currentYear : null);
        setTotalSubjects(0);
        setAssignmentRows([]);
    };
    
    const columns = [
        {
            title: 'Subject',
            key: 'subject',
            render: (_: any, record: AssignmentRow, index: number) => (
                 <Select
                    showSearch
                    placeholder="Select a subject"
                    style={{ width: '100%' }}
                    value={record.subjectId}
                    onChange={(value) => handleRowChange(index, 'subjectId', value)}
                    filterOption={(input, option) =>
                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {subjects.filter(subject => subject.status === 'Active').map(subject => (
                        <Option key={subject.id} value={subject.id}>{subject.subject_name}</Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Teacher',
            key: 'teacher',
            render: (_: any, record: AssignmentRow, index: number) => {
                const selectedSubject = subjects.find(s => s.id === record.subjectId);
                const selectedSubjectName = selectedSubject?.subject_name;

                const filteredTeachers = selectedSubjectName
                    ? teachers.filter(teacher => 
                        Array.isArray(teacher.subjects_handled) && teacher.subjects_handled.includes(selectedSubjectName)
                      )
                    : teachers;
                
                return (
                    <Select
                        showSearch
                        placeholder="Select a teacher"
                        style={{ width: '100%' }}
                        value={record.teacherId}
                        onChange={(value) => handleRowChange(index, 'teacherId', value)}
                        disabled={!record.subjectId}
                        filterOption={(input, option) =>
                            (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                        }
                    >
                        {filteredTeachers.map(teacher => (
                            <Option key={teacher.id} value={teacher.id}>{teacher.full_name}</Option>
                        ))}
                    </Select>
                )
            }
        },
        {
            title: 'Action (Role)',
            key: 'action',
            render: (_: any, record: AssignmentRow, index: number) => (
                <Select
                    placeholder="Select role"
                    style={{ width: '100%' }}
                    value={record.role}
                    onChange={(value) => handleRowChange(index, 'role', value)}
                >
                    <Option value="Subject Teacher">Subject Teacher</Option>
                    <Option value="Class Teacher">Class Teacher</Option>
                </Select>
            )
        }
    ];

    const watermarkStyle: CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        '--watermark-url': `url('${schoolDetails.logo_url}')`
    } as React.CSSProperties : {};
    
    if (schoolDetails?.logo_url) {
        const styleTag = document.createElement('style');
        styleTag.innerHTML = `
            .table-background-watermark::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-image: var(--watermark-url);
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                opacity: 0.05;
                pointer-events: none;
                z-index: 1;
            }
        `;
        document.head.appendChild(styleTag);
    }

    return (
        
            <Card>
                <Title level={4}>Class Teacher Management</Title>
                <Spin spinning={isLoading}>
                    <Row gutter={16} style={{ marginBottom: 24 }} align="bottom">
                        <Col xs={24} sm={12} md={6}>
                            <Typography.Text>Class</Typography.Text>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Class"
                                style={{ width: '100%' }}
                                onChange={handleClassChange}
                                value={selectedClassName}
                                filterOption={(input, option) =>
                                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {uniqueClassNames.map(c => <Option key={c} value={c}>{c}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Typography.Text>Section</Typography.Text>
                            <Select
                                allowClear
                                placeholder="Select Section"
                                style={{ width: '100%' }}
                                disabled={!selectedClassName}
                                onChange={handleSectionChange}
                                value={selectedSection}
                            >
                                 {sectionsForSelectedClass.map(sec => <Option key={sec} value={sec}>{sec}</Option>)}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Typography.Text>Academic Year</Typography.Text>
                            <Select
                                showSearch
                                placeholder="Select Year"
                                style={{ width: '100%' }}
                                disabled={!selectedSection}
                                onChange={(value) => setSelectedAcademicYear(value)}
                                value={selectedAcademicYear}
                                filterOption={(input, option) =>
                                    (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                }
                            >
                               {academicYears.filter(ay => ay.status === 'Active').map((year) => (
                                    <Option key={year.id} value={year.academic_year}>{year.academic_year}</Option>
                                ))}
                            </Select>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                            <Typography.Text>Total Subjects</Typography.Text>
                            <InputNumber
                                min={0}
                                placeholder="Number of subjects"
                                style={{ width: '100%' }}
                                disabled={!selectedAcademicYear}
                                value={totalSubjects}
                                onChange={handleTotalSubjectsChange}
                            />
                        </Col>
                    </Row>
                </Spin>
                
                {totalSubjects > 0 ? (
                    <Spin spinning={isLoading}>
                         <div 
                            className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                            style={watermarkStyle}
                        >
                            <div style={{overflowX: 'auto'}}>
                                <Table
                                    columns={columns}
                                    dataSource={assignmentRows}
                                    rowKey="key"
                                    bordered
                                    pagination={false}
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>
                        </div>
                        <Button type="primary" onClick={handleSaveAssignments} style={{ marginTop: 16 }} loading={mappingsLoading}>
                            Save Assignments
                        </Button>
                    </Spin>
                ) : (
                    <Empty description="Please select class, section, and academic year, then specify the number of subjects." />
                )}
            </Card>
    );
};

export default ClassTeacherManagement;
