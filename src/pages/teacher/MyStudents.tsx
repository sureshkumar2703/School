
import React, { useEffect, useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, Typography, Spin, Table, Alert, Empty, Row, Col, Select, Modal, Descriptions, Avatar, Tag } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { supabase } from '../../service/supabaseClient';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import dayjs from 'dayjs';
import { UserOutlined } from '@ant-design/icons';


const { Title, Text } = Typography;
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
  // Add all fields from students table for the modal
  [key: string]: any;
}

const MyStudents: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { calendars } = useSelector((state: RootState) => state.academicCalendar);
    const [allStudents, setAllStudents] = useState<StudentAllocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
    const [viewingStudent, setViewingStudent] = useState<StudentAllocation | null>(null);

    const currentAcademicYear = useMemo(() => calendars.find(c => c.is_current)?.academic_year, [calendars]);

    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [selectedSection, setSelectedSection] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        // Set the default year only once when the component loads and the current year is available.
        if (currentAcademicYear && selectedYear === null) {
            setSelectedYear(currentAcademicYear);
        }
    }, [currentAcademicYear, selectedYear]);

    useEffect(() => {
        if (user && user.full_name && user.organization_key) {
            const fetchAssignmentsAndStudents = async () => {
                setLoading(true);
                setError(null);
                try {
                    // Fetch all assignments for the teacher, regardless of year
                    const { data: assignments, error: assignmentError } = await supabase
                        .from('class_subject_teacher_mapping')
                        .select('class_name, section_name, academic_year')
                        .eq('teacher_name', user.full_name)
                        .eq('organization_key', user.organization_key);

                    if (assignmentError) {
                        throw new Error(`Error fetching assignments: ${assignmentError.message}`);
                    }

                    if (!assignments || assignments.length === 0) {
                        setAllStudents([]);
                        setLoading(false);
                        return;
                    }

                    const uniqueAssignments = Array.from(new Set(assignments.map(a => `${a.class_name}||${a.section_name}||${a.academic_year}`)))
                        .map(key => {
                            const [class_name, section_name, academic_year] = key.split('||');
                            return { class_name, section_name, academic_year };
                        });

                    const studentPromises = uniqueAssignments.map(assignment =>
                        supabase
                            .from('students') // Fetch directly from students table
                            .select('*') // Select all columns
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
                        if (result.data) {
                            // Find section for student
                             const { data: allocations } = await supabase
                                .from('class_section_allocations')
                                .select('register_no, section_name')
                                .in('register_no', result.data.map(s => s.register_no));
                            
                            const sectionMap = new Map(allocations?.map(a => [a.register_no, a.section_name]));

                            const studentsWithSection = result.data.map(student => ({
                                ...student,
                                class_name: student.admitted_class,
                                section_name: sectionMap.get(student.register_no) || ''
                            }))

                            fetchedStudents.push(...studentsWithSection as any);
                        }
                    }

                    const uniqueStudents = Array.from(new Map(fetchedStudents.map(s => [s.id, s])).values());
                    
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

    const handleViewStudent = (student: StudentAllocation) => {
        setViewingStudent(student);
        setIsProfileModalVisible(true);
    };

    const handleProfileModalClose = () => {
        setViewingStudent(null);
        setIsProfileModalVisible(false);
    };
    
    const academicYearOptions = useMemo(() => calendars.filter(c => c.status === 'Active'), [calendars]);
    const uniqueClasses = useMemo(() => selectedYear ? [...new Set(allStudents.filter(s => s.academic_year === selectedYear).map(s => s.class_name))] : [], [allStudents, selectedYear]);
    const uniqueSections = useMemo(() => selectedClass && selectedYear ? [...new Set(allStudents.filter(s => s.class_name === selectedClass && s.academic_year === selectedYear).map(s => s.section_name))] : [], [allStudents, selectedClass, selectedYear]);

    const filteredStudents = useMemo(() => {
        if (!selectedClass || !selectedSection || !selectedYear) return [];
        return allStudents.filter(student =>
            student.class_name === selectedClass &&
            student.section_name === selectedSection &&
            student.academic_year === selectedYear
        ).sort((a,b) => (a.roll_no || '').localeCompare(b.roll_no || ''));
    }, [allStudents, selectedClass, selectedSection, selectedYear]);

    const columns = [
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no', render: (rollNo: string) => rollNo || 'N/A' },
        { 
            title: 'Register No', 
            dataIndex: 'register_no', 
            key: 'register_no',
            render: (text: string, record: StudentAllocation) => <a onClick={() => handleViewStudent(record)}>{text}</a>
        },
        { title: 'Full Name', dataIndex: 'full_name', key: 'full_name' },
        { title: 'Email', dataIndex: 'email', key: 'email', render: (email: string) => email || 'N/A' },
        { title: 'Class', dataIndex: 'class_name', key: 'class_name' },
        { title: 'Section', dataIndex: 'section_name', key: 'section_name' },
        { title: 'Academic Year', dataIndex: 'academic_year', key: 'academic_year' },
    ];
    
    const showTable = selectedClass && selectedSection && selectedYear;
    
    const handleYearChange = (value: string | null) => {
        setSelectedYear(value);
        setSelectedClass(null);
        setSelectedSection(null);
    };

    return (
        <>
        <Card>
            <Title level={4}>My Students</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                This page shows all students in the classes you are assigned to teach. Use the filters to narrow the list.
            </Text>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                 <Col xs={24} md={8}>
                    <Select showSearch allowClear placeholder="Filter by Academic Year" style={{ width: '100%' }} value={selectedYear} onChange={handleYearChange}>
                        {academicYearOptions.map(y => <Option key={y.id} value={y.academic_year}>{y.academic_year}{y.is_current && " (Current)"}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} md={8}>
                    <Select showSearch allowClear placeholder="Filter by Class" style={{ width: '100%' }} value={selectedClass} onChange={value => { setSelectedClass(value); setSelectedSection(null); }} disabled={!selectedYear}>
                        {uniqueClasses.map(c => <Option key={c} value={c}>{c}</Option>)}
                    </Select>
                </Col>
                <Col xs={24} md={8}>
                    <Select showSearch allowClear placeholder="Filter by Section" style={{ width: '100%' }} value={selectedSection} onChange={setSelectedSection} disabled={!selectedClass}>
                        {uniqueSections.map(s => <Option key={s} value={s}>{s}</Option>)}
                    </Select>
                </Col>
            </Row>

            <Spin spinning={loading}>
                 {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
                
                {showTable ? (
                    <Table
                        dataSource={filteredStudents}
                        columns={columns}
                        rowKey="id"
                        bordered
                        scroll={{ x: 'max-content' }}
                    />
                ) : (
                    <Empty description="Please select an academic year, class, and section to view students." />
                )}
            </Spin>
        </Card>
        
        {viewingStudent && (
            <Modal
                open={isProfileModalVisible}
                onCancel={handleProfileModalClose}
                footer={null}
                width={900}
                title={<Title level={4} style={{margin: 0}}>Student Profile</Title>}
            >
                <Row align="middle" style={{ backgroundColor: '#f0f5ff', padding: '24px', borderRadius: '8px', margin: '24px 0' }}>
                    <Col>
                        <Avatar size={80} src={viewingStudent.photo_url} icon={<UserOutlined />} style={{ border: '4px solid white' }}/>
                    </Col>
                    <Col style={{ marginLeft: 24 }}>
                        <Title level={3} style={{ margin: 0 }}>{viewingStudent.full_name}</Title>
                        <Text style={{ fontSize: 16 }}>Register No: {viewingStudent.register_no}</Text>
                    </Col>
                </Row>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '16px' }}>
                    <Title level={5}>Personal Information</Title>
                    <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                        <Col span={8}><Text strong>Gender:</Text> {viewingStudent.gender || 'N/A'}</Col>
                        <Col span={8}><Text strong>D.O.B:</Text> {viewingStudent.dob ? dayjs(viewingStudent.dob).format('DD MMM YYYY') : 'N/A'}</Col>
                        <Col span={8}><Text strong>Mother Tongue:</Text> {viewingStudent.mother_tongue || 'N/A'}</Col>
                        <Col span={8}><Text strong>Birth Place:</Text> {viewingStudent.birth_place || 'N/A'}</Col>
                        <Col span={8}><Text strong>Nationality:</Text> {viewingStudent.nationality || 'N/A'}</Col>
                        <Col span={8}><Text strong>Religion:</Text> {viewingStudent.religion || 'N/A'}</Col>
                        <Col span={8}><Text strong>Caste:</Text> {viewingStudent.caste || 'N/A'}</Col>
                    </Row>
                    
                    <Title level={5} style={{marginTop: 24}}>Contact & Parent Information</Title>
                    <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                        <Col span={12}><Text strong>Permanent Address:</Text> {viewingStudent.permanent_address || 'N/A'}</Col>
                        <Col span={12}><Text strong>Temporary Address:</Text> {viewingStudent.temporary_address || 'N/A'}</Col>
                        <Col span={8}><Text strong>City:</Text> {viewingStudent.city || 'N/A'}</Col>
                        <Col span={8}><Text strong>District:</Text> {viewingStudent.district || 'N/A'}</Col>
                        <Col span={8}><Text strong>State:</Text> {viewingStudent.state || 'N/A'}</Col>
                        <Col span={8}><Text strong>Pin Code:</Text> {viewingStudent.pin_code || 'N/A'}</Col>
                        <Col span={8}><Text strong>Parent Email:</Text> {viewingStudent.parent_email || 'N/A'}</Col>
                        <Col span={8}><Text strong>Parent Contact:</Text> {viewingStudent.parent_contact || 'N/A'}</Col>
                        <Col span={8}><Text strong>Father's Name:</Text> {viewingStudent.father_name || 'N/A'}</Col>
                        <Col span={8}><Text strong>Mother's Name:</Text> {viewingStudent.mother_name || 'N/A'}</Col>
                    </Row>

                    <Title level={5} style={{marginTop: 24}}>Admission Details</Title>
                    <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                        <Col span={8}><Text strong>Admission No:</Text> {viewingStudent.admission_no || 'N/A'}</Col>
                        <Col span={8}><Text strong>Admission Date:</Text> {viewingStudent.admission_date ? dayjs(viewingStudent.admission_date).format('DD MMM YYYY') : 'N/A'}</Col>
                        <Col span={8}><Text strong>Admitted Class:</Text> {viewingStudent.admitted_class || 'N/A'}</Col>
                        <Col span={8}><Text strong>Academic Year:</Text> {viewingStudent.academic_year || 'N/A'}</Col>
                        <Col span={8}><Text strong>Status:</Text> <Tag color={viewingStudent.status === 'Active' ? 'green' : 'red'}>{viewingStudent.status}</Tag></Col>
                    </Row>
                    
                    <Title level={5} style={{marginTop: 24}}>Previous Academic Details</Title>
                    <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                        <Col span={8}><Text strong>Previous School:</Text> {viewingStudent.previous_school_name || 'N/A'}</Col>
                        <Col span={8}><Text strong>Last Class:</Text> {viewingStudent.last_class_studied || 'N/A'}</Col>
                        <Col span={8}><Text strong>Board:</Text> {viewingStudent.board || 'N/A'}</Col>
                    </Row>

                    <Title level={5} style={{marginTop: 24}}>Health Information</Title>
                    <Row gutter={[16, 16]} style={{padding: '16px', backgroundColor: '#fafafa', borderRadius: '4px'}}>
                        <Col span={8}><Text strong>Blood Group:</Text> {viewingStudent.blood_group || 'N/A'}</Col>
                        <Col span={8}><Text strong>Height:</Text> {viewingStudent.height ? `${viewingStudent.height} cm` : 'N/A'}</Col>
                        <Col span={8}><Text strong>Weight:</Text> {viewingStudent.weight ? `${viewingStudent.weight} kg` : 'N/A'}</Col>
                        <Col span={24}><Text strong>Known Allergies:</Text> {viewingStudent.known_allergies || 'N/A'}</Col>
                    </Row>
                </div>
            </Modal>
        )}
        </>
    );
};

export default MyStudents;
