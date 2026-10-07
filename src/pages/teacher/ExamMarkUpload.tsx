

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Table, Typography, Spin, Alert, Row, Col, Select, Button, Empty, Form, message, InputNumber } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchExamTimetablesRequest } from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import { uploadExamMarksRequest, type StudentForExamMarks, type StudentMarkEntry, type UploadExamMarksPayload, fetchStudentsByClassRequest, fetchAllExamMarksRequest } from '../../store/features/exam-marks/examMarksSlice';

const { Title, Text } = Typography;
const { Option } = Select;

const ExamMarkUpload: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, calendars, loading: teacherDataLoading } = useSelector((state: RootState) => state.teacherDashboard);
    const { timetables, loading: timetablesLoading } = useSelector((state: RootState) => state.examTimetableAdmin);
    const { students, allMarks, loading: studentsLoading, error: studentsError } = useSelector((state: RootState) => state.examMarks);
    
    // Filters
    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedExamTitle, setSelectedExamTitle] = useState<string | null>(null);
    const [form] = Form.useForm();
    
    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchAllExamMarksRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars.length > 0 && !selectedYear) {
            const currentYear = (calendars as { academic_year: string, is_current: boolean }[]).find(c => c.is_current)?.academic_year;
            setSelectedYear(currentYear || (calendars[0] as any)?.academic_year || null);
        }
    }, [calendars, selectedYear]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return (mappings as any[]).filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);
    
    const classOptions = useMemo(() => {
        if (!selectedYear) return [];
        const assignmentsForYear = myAssignments.filter((m: any) => m.academic_year === selectedYear);
        const uniqueClasses = assignmentsForYear.reduce((acc: Map<string, { key: string; label: string }>, m: any) => {
            const key = `${m.class_name}||${m.section_name}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name}` 
                });
            }
            return acc;
        }, new Map<string, { key: string; label: string }>());
        return Array.from(uniqueClasses.values());
    }, [myAssignments, selectedYear]);
    
    const subjectOptions = useMemo(() => {
        if (!selectedClassKey) return [];
        const [className, sectionName] = selectedClassKey.split('||');
        return [...new Set(myAssignments.filter(m => m.class_name === className && m.section_name === sectionName && m.academic_year === selectedYear).map(m => m.subject_name))];
    }, [myAssignments, selectedClassKey, selectedYear]);

    const examTitleOptions = useMemo(() => {
        if (!selectedClassKey || !selectedSubject) return [];
        const [className, sectionName] = selectedClassKey.split('||');
        return [...new Set(timetables.filter(t => t.class_name === className && t.section_name === sectionName && t.academic_year === selectedYear && t.exam_days.some(d => d.subject === selectedSubject)).map(t => t.exam_title))];
    }, [timetables, selectedClassKey, selectedSubject, selectedYear]);

    useEffect(() => {
        if (selectedClassKey && selectedYear && user?.organization_key) {
            const [className, sectionName] = selectedClassKey.split('||');
            dispatch(fetchStudentsByClassRequest({
                organizationKey: user.organization_key,
                academicYear: selectedYear,
                className,
                sectionName
            }));
        } else {
             // Clear students when class is deselected
            dispatch({ type: 'examMarks/fetchStudentsByClassSuccess', payload: [] });
        }
    }, [dispatch, selectedClassKey, selectedYear, user?.organization_key]);
    
    const currentExam = useMemo(() => {
        if (!selectedClassKey || !selectedSubject || !selectedExamTitle) return null;
        const [className, sectionName] = selectedClassKey.split('||');
        const examTimetable = timetables.find(t => t.class_name === className && t.section_name === sectionName && t.academic_year === selectedYear && t.exam_title === selectedExamTitle);
        if (!examTimetable) return null;
        return {
            className,
            sectionName,
            subject: selectedSubject,
            examTitle: selectedExamTitle,
            totalMarks: examTimetable.exam_total_mark,
            examId: examTimetable.id,
        };
    }, [selectedClassKey, selectedSubject, selectedExamTitle, timetables, selectedYear]);

    // Pre-fill form with existing marks when students or exam changes
    useEffect(() => {
        if (students.length > 0 && currentExam) {
            const existingMarksRecord = allMarks.find(mark => 
                mark.exam_id === currentExam.examId &&
                mark.subject === currentExam.subject
            );
            
            const initialFormValues: { [key: string]: { mark: number | null; status: string } } = {};
            
            if (existingMarksRecord) {
                existingMarksRecord.student_marks.forEach(sm => {
                    initialFormValues[sm.student_id] = {
                        mark: sm.get_mark,
                        status: sm.status,
                    };
                });
            }
            form.setFieldsValue({ marks: initialFormValues });
        }
    }, [students, currentExam, allMarks, form]);

    
    const handleSaveMarks = () => {
        form.validateFields().then(values => {
            if (!currentExam || !user || !user.organization_key || !user.staff_code) {
                message.error("Cannot save marks. Missing necessary information.");
                return;
            }
            
            const studentMarkEntries: StudentMarkEntry[] = students.map(student => ({
                student_id: student.id,
                register_no: student.register_no,
                roll_no: student.roll_no,
                student_name: student.full_name,
                get_mark: values.marks[student.id]?.mark ?? null,
                status: values.marks[student.id]?.status ?? 'Absent',
            }));
            
            const payload: UploadExamMarksPayload = {
                organization_key: user.organization_key!,
                staff_code: user.staff_code!,
                exam_id: currentExam.examId,
                exam_title: currentExam.examTitle,
                total_marks: currentExam.totalMarks,
                class_name: currentExam.className,
                section_name: currentExam.sectionName,
                subject: currentExam.subject,
                academic_year: selectedYear!,
                test_date: timetables.find(t => t.id === currentExam.examId)?.exam_days.find(d => d.subject === currentExam.subject)?.examdate || new Date().toISOString(),
                student_marks: studentMarkEntries,
            };

            dispatch(uploadExamMarksRequest(payload));
        }).catch(info => {
            console.log('Validation failed:', info);
        });
    };

    const handleYearChange = (val: string | null) => {
        setSelectedYear(val);
        setSelectedClassKey(null);
        setSelectedSubject(null);
        setSelectedExamTitle(null);
    };

    const handleClassChange = (val: string | null) => {
        setSelectedClassKey(val);
        setSelectedSubject(null);
        setSelectedExamTitle(null);
    };

    const handleSubjectChange = (val: string | null) => {
        setSelectedSubject(val);
        setSelectedExamTitle(null);
    };

    const columns = [
        { title: 'Register No', dataIndex: 'register_no', key: 'register_no' },
        { title: 'Roll No', dataIndex: 'roll_no', key: 'roll_no' },
        { title: 'Student Name', dataIndex: 'full_name', key: 'full_name' },
        {
            title: 'Enter Mark',
            key: 'upload_mark',
            render: (_: any, record: StudentForExamMarks) => {
                const existingMark = allMarks.find(mark => 
                    mark.exam_id === currentExam?.examId &&
                    mark.subject === currentExam?.subject
                )?.student_marks.find(sm => sm.student_id === record.id);
                
                const isMarkEntered = existingMark?.get_mark !== null && existingMark?.get_mark !== undefined;

                return (
                    <Form.Item
                        name={['marks', record.id, 'mark']}
                        rules={[
                            { required: true, message: 'Mark is required' },
                            { type: 'number', min: 0, message: 'Mark must be positive' },
                            { type: 'number', max: currentExam?.totalMarks, message: `Mark cannot exceed ${currentExam?.totalMarks}` }
                        ]}
                        noStyle
                    >
                        <InputNumber 
                            placeholder={`Max: ${currentExam?.totalMarks}`} 
                            style={{ width: '100%' }}
                            disabled={isMarkEntered}
                        />
                    </Form.Item>
                )
            }
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, record: StudentForExamMarks) => {
                const existingMark = allMarks.find(mark => 
                    mark.exam_id === currentExam?.examId &&
                    mark.subject === currentExam?.subject
                )?.student_marks.find(sm => sm.student_id === record.id);

                const isMarkEntered = existingMark?.get_mark !== null && existingMark?.get_mark !== undefined;

                return (
                     <Form.Item name={['marks', record.id, 'status']} rules={[{ required: true, message: 'Status is required' }]} noStyle>
                        <Select placeholder="Select status" style={{ width: 120 }} disabled={isMarkEntered}>
                            <Option value="Pass">Pass</Option>
                            <Option value="Fail">Fail</Option>
                            <Option value="Absent">Absent</Option>
                        </Select>
                    </Form.Item>
                )
            }
        }
    ];

    const isLoading = teacherDataLoading || timetablesLoading || studentsLoading;
    const showStudentTable = selectedYear && selectedClassKey && selectedSubject && selectedExamTitle;

    return (
        <Card>
            <Title level={4}>Exam Mark Upload</Title>
             <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Select the filters to view students and enter their marks for a specific exam.
            </Text>
            <Spin spinning={isLoading}>
                <Row gutter={[16, 24]}>
                    <Col xs={24} md={6}>
                        <Select placeholder="Select Year" style={{ width: '100%' }} value={selectedYear} onChange={handleYearChange} allowClear>
                            {(calendars as any[]).map(cal => <Option key={cal.id} value={cal.academic_year}>{cal.academic_year}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Select placeholder="Select Class" style={{ width: '100%' }} value={selectedClassKey} onChange={handleClassChange} disabled={!selectedYear} allowClear>
                            {classOptions.map((opt) => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                        <Select placeholder="Select Subject" style={{ width: '100%' }} value={selectedSubject} onChange={handleSubjectChange} disabled={!selectedClassKey} allowClear>
                            {subjectOptions.map(sub => <Option key={sub} value={sub!}>{sub}</Option>)}
                        </Select>
                    </Col>
                    <Col xs={24} md={6}>
                         <Select placeholder="Select Exam" style={{ width: '100%' }} value={selectedExamTitle} onChange={setSelectedExamTitle} disabled={!selectedSubject} allowClear>
                            {examTitleOptions.map(title => <Option key={title} value={title}>{title}</Option>)}
                        </Select>
                    </Col>
                </Row>
            </Spin>

            {showStudentTable && (
                <div style={{marginTop: 24}}>
                    <Spin spinning={studentsLoading}>
                        {studentsError && <Alert message="Error" description={studentsError} type="error" showIcon style={{marginBottom: 16}} />}
                        <Form form={form}>
                            <Table
                                columns={columns}
                                dataSource={students}
                                rowKey="id"
                                bordered
                                pagination={false}
                                scroll={{ y: 400 }}
                                footer={() => (
                                    <Row justify="end">
                                        <Col>
                                            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveMarks} loading={studentsLoading}>
                                                Save All Marks
                                            </Button>
                                        </Col>
                                    </Row>
                                )}
                            />
                        </Form>
                    </Spin>
                </div>
            )}
        </Card>
    );
};

export default ExamMarkUpload;
