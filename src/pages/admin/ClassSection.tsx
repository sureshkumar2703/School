
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Select, Table, Card, Typography, Spin, Empty, Row, Col, Input, Button, message, Space } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentsRequest } from '../../store/features/students/studentsSlice';
import { fetchClassesRequest } from '../../store/features/classes/classesSlice';
import { saveClassSectionRequest, fetchAllocationsRequest } from '../../store/features/class-sections/classSectionsSlice';
import type { ClassSectionAllocation } from '../../store/features/class-sections/classSectionsSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import { fetchSchoolDetailsRequest } from '../../store/features/school-details/schoolDetailsSlice';

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const sectionColors: { [key: string]: { bg: string; hover: string } } = {
    'A': { bg: '#e6f7ff', hover: '#d9f0ff' }, // Light Blue
    'B': { bg: '#f6ffed', hover: '#e9fbd6' }, // Light Green
    'C': { bg: '#fffbe6', hover: '#fff6d4' }, // Light Yellow
    'D': { bg: '#fff1f0', hover: '#ffddd9' }, // Light Red
    'E': { bg: '#f9f0ff', hover: '#f2dfff' }, // Light Purple
    'F': { bg: '#e6fffb', hover: '#d9fff8' }, // Light Cyan
    'G': { bg: '#fff0f6', hover: '#ffe4f0' }, // Light Magenta
};

const ClassSection: React.FC = () => {
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [targetSection, setTargetSection] = useState<string | null>(null);

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { students, loading: studentsLoading } = useSelector((state: RootState) => state.students);
    const { classes, loading: classesLoading } = useSelector((state: RootState) => state.classes);
    const { allocations, loading: allocationsLoading } = useSelector((state: RootState) => state.classSections);
    const { calendars: academicYears, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);
    const { details: schoolDetails } = useSelector((state: RootState) => state.schoolDetails);
    
    // Create a map for quick lookup of allocated students and their sections
    const allocatedStudentMap = new Map<string, string>();
    allocations.forEach(alloc => {
        if (alloc.register_no) {
            allocatedStudentMap.set(alloc.register_no, alloc.section_name);
        }
    });

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchStudentsRequest(user.organization_key));
            dispatch(fetchClassesRequest());
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
            dispatch(fetchSchoolDetailsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    // Fetch allocations when class and year are selected
    useEffect(() => {
        if (selectedClass && selectedAcademicYear && user?.organization_key) {
            dispatch(fetchAllocationsRequest({
                organizationKey: user.organization_key,
                className: selectedClass,
                academicYear: selectedAcademicYear,
            }));
        }
    }, [dispatch, selectedClass, selectedAcademicYear, user?.organization_key]);
    
    // This effect reliably sets the current academic year when a class is selected.
    useEffect(() => {
        if (selectedClass && academicYears.length > 0) {
            const currentYear = academicYears.find(cal => cal.is_current)?.academic_year || null;
            setSelectedAcademicYear(currentYear);
        }
    }, [selectedClass, academicYears]);


    const activeClasses = classes.filter(c => c.status === 'Active');
    const uniqueClassNames = [...new Set(activeClasses.map(c => c.class_name))];

    const sectionsForSelectedClass = selectedClass 
        ? [...new Set(activeClasses.filter(c => c.class_name === selectedClass).map(c => c.section).filter(Boolean))] as string[]
        : [];

    const filteredStudents = students.filter(student => {
        if (!selectedClass || !selectedAcademicYear) return false;

        const classMatch = student.admitted_class === selectedClass;
        const yearMatch = student.academic_year === selectedAcademicYear;
        const searchMatch = !searchTerm || 
            (student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.register_no?.toLowerCase().includes(searchTerm.toLowerCase()));

        return classMatch && yearMatch && searchMatch;
    });
        
    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };

    const handleMoveStudents = () => {
        if (!targetSection || !selectedClass || !selectedAcademicYear || !user?.organization_key) {
            message.error("Please select a class, academic year, and target section.");
            return;
        }

        const studentsToAllocate = students.filter(s => selectedRowKeys.includes(s.id));
        
        const allocationPayloads: Omit<ClassSectionAllocation, 'id' | 'created_at'>[] = studentsToAllocate.map(student => ({
            organization_key: user.organization_key!,
            academic_year: selectedAcademicYear,
            class_name: selectedClass,
            section_name: targetSection,
            register_no: student.register_no!,
            full_name: student.full_name!,
        }));

        dispatch(saveClassSectionRequest(allocationPayloads));
        
        // After dispatching, clear all fields
        setSelectedRowKeys([]);
        setTargetSection(null);
        setSelectedClass(null);
        setSelectedAcademicYear(null);
    };

    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
        getCheckboxProps: (record: (typeof students)[0]) => ({
            disabled: allocatedStudentMap.has(record.register_no!),
            name: record.full_name,
        }),
    };

    const columns = [
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Admitted Class', dataIndex: 'admitted_class', key: 'admitted_class' },
        { 
            title: 'Allocated Section', 
            key: 'allocated_section',
            render: (_: any, record: (typeof students)[0]) => {
                const section = allocatedStudentMap.get(record.register_no!);
                return section ? <Text strong style={{ color: '#1890ff' }}>{section}</Text> : <Text type="secondary">Not Allocated</Text>;
            }
        },
    ];
    
    const isLoading = studentsLoading || classesLoading || allocationsLoading || calendarsLoading;
    
    const handleClassChange = (value: string | null) => {
        setSelectedClass(value);
        // Reset dependent fields. The useEffect will handle setting the academic year.
        setSelectedAcademicYear(null);
        setTargetSection(null);
        setSelectedRowKeys([]);
    };
    
    const watermarkStyle: React.CSSProperties = schoolDetails?.logo_url ? {
        position: 'relative',
        ['--watermark-url' as any]: `url('${schoolDetails.logo_url}')`
    } : {};


    const dynamicStyles = `
        ${Object.entries(sectionColors).map(([section, colors]) => `
            .allocated-row-${section} {
                background-color: ${colors.bg} !important;
            }
            .allocated-row-${section}:hover > td {
                background-color: ${colors.hover} !important;
            }
        `).join('\n')}
         .ant-table-row-disabled > td {
            background: #f5f5f5 !important;
            cursor: not-allowed !important;
            color: #999 !important;
        }
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

    return (
        <>
            <style>{dynamicStyles}</style>
            <Card>
                <Title level={4}>Class Section Students</Title>
                <Row style={{ marginBottom: 24 }} gutter={[16, 16]} align="middle" justify="space-between">
                    <Col xs={24} md={16}>
                        <Row gutter={[16, 16]}>
                             <Col xs={24} sm={12}>
                                <Select
                                    showSearch allowClear placeholder="Select a class" style={{ width: '100%' }}
                                    onChange={handleClassChange} loading={classesLoading}
                                    value={selectedClass}
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {uniqueClassNames.map((className) => (
                                        <Option key={className} value={className}>{className}</Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col xs={24} sm={12}>
                                 <Select
                                    showSearch allowClear placeholder="Select Academic Year" style={{ width: '100%' }}
                                    onChange={(value) => setSelectedAcademicYear(value)} disabled={!selectedClass}
                                    value={selectedAcademicYear}
                                    loading={calendarsLoading}
                                    filterOption={(input, option) =>
                                        (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {academicYears.filter(ay => ay.status === 'Active').map((year) => (
                                        <Option key={year.id} value={year.academic_year}>{year.academic_year} {year.is_current && "(Current)"}</Option>
                                    ))}
                                </Select>
                            </Col>
                        </Row>
                    </Col>
                    {selectedRowKeys.length > 0 && (
                        <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                            <Space wrap>
                                <Select
                                    placeholder="Move to Section" style={{ width: 160 }}
                                    onChange={setTargetSection} value={targetSection} allowClear
                                >
                                    {sectionsForSelectedClass.map(section => (
                                        <Option key={section} value={section}>{section}</Option>
                                    ))}
                                </Select>
                                <Button type="primary" onClick={handleMoveStudents} disabled={!targetSection}>
                                    Move ({selectedRowKeys.length})
                                </Button>
                            </Space>
                        </Col>
                    )}
                </Row>

                <Spin spinning={isLoading}>
                    <div 
                        className={schoolDetails?.logo_url ? 'table-background-watermark' : ''}
                        style={watermarkStyle}
                    >
                    {selectedClass && selectedAcademicYear ? (
                        <>
                            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                                <Col>
                                    <Text strong>Total Students in Class: {filteredStudents.length}</Text>
                                </Col>
                                <Col xs={24} sm={12} md={8}>
                                    <Search
                                        placeholder="Search by Name or Register No"
                                        onSearch={setSearchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        style={{ width: '100%' }}
                                        allowClear
                                    />
                                </Col>
                            </Row>
                            <div style={{ overflowX: 'auto' }}>
                                <Table
                                    rowSelection={rowSelection}
                                    columns={columns}
                                    dataSource={filteredStudents}
                                    rowKey="id"
                                    bordered
                                    rowClassName={(record) => {
                                        const section = allocatedStudentMap.get(record.register_no!);
                                        return section ? `allocated-row-${section}` : '';
                                    }}
                                    scroll={{ x: 'max-content' }}
                                />
                            </div>
                        </>
                    ) : (
                        <Empty description="Please select both a class and an academic year to view students." />
                    )}
                    </div>
                </Spin>
            </Card>
        </>
    );
};

export default ClassSection;
