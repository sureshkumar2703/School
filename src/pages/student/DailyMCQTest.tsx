
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, List, Button, Empty, Row, Col, Space, Modal, message, Divider, Form, Radio } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchStudentDashboardDataRequest } from '../../store/features/student-dashboard/studentDashboardSlice';
import { BookOutlined, RightOutlined } from '@ant-design/icons';
import { fetchSubjectsRequest } from '../../store/features/subjects/subjectsSlice';
import { supabase } from '../../service/supabaseClient';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import type { OneMarkQuestionItem } from '../../store/features/one-mark-questions/oneMarkQuestionsSlice';
import { saveMcqTestDataRequest, type StudentResult } from '../../store/features/daily-mcq-test/mcqTestDataSlice';
import dayjs from 'dayjs';

const { Title, Text } = Typography;


const DailyMCQTest: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.studentDashboard);
    const { subjects, loading: subjectsLoading, error: subjectsError } = useSelector((state: RootState) => state.subjects);
    const [section, setSection] = useState<string | null>(null);
    const [rollNo, setRollNo] = useState<string | null>(null);
    const [loadingSection, setLoadingSection] = useState(true);
    const isMobile = useMediaQuery('(max-width: 768px)');
    
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedSubjectInfo, setSelectedSubjectInfo] = useState<{ subjectName: string; subjectCode: string, staffCode: string } | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [questions, setQuestions] = useState<OneMarkQuestionItem[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [form] = Form.useForm();
    const [subjectsTakenToday, setSubjectsTakenToday] = useState<string[]>([]);
    const submissionRef = useRef(false);


    useEffect(() => {
        if (user?.id) {
            const fetchTestsTakenToday = async () => {
                const today = dayjs().format('YYYY-MM-DD');
                // Check if a record exists where the student_results array contains this student's ID for today's date
                const { data, error } = await supabase
                    .from('mcqtestdata')
                    .select('subject')
                    .eq('test_date', today)
                    .contains('student_results', `[{"student_id":"${user.id}"}]`);

                if (error) {
                    console.error("Error fetching today's tests:", error);
                } else if (data) {
                    const studentHasTaken = data.map(session => session.subject);
                    setSubjectsTakenToday(studentHasTaken);
                }
            };
            fetchTestsTakenToday();
        }
    }, [user, isModalVisible]);


    useEffect(() => {
        if (user?.organization_key && user?.register_no && user?.academic_year) {
            const fetchSection = async () => {
                setLoadingSection(true);
                try {
                    const { data, error: sectionError } = await supabase
                        .from('class_section_allocations')
                        .select('section_name, roll_no')
                        .eq('organization_key', user.organization_key)
                        .eq('register_no', user.register_no)
                        .eq('academic_year', user.academic_year)
                        .single();
                    if (sectionError && sectionError.code !== 'PGRST116') throw sectionError;
                    if (data) {
                        setSection(data.section_name);
                        setRollNo(data.roll_no);
                    }
                } catch (err) {
                    console.error("Error fetching student section:", err);
                } finally {
                    setLoadingSection(false);
                }
            };
            fetchSection();
        } else {
            setLoadingSection(false);
        }
    }, [user]);

    useEffect(() => {
        if (user?.organization_key && user?.admitted_class && section && user?.academic_year) {
            dispatch(fetchStudentDashboardDataRequest({
                organizationKey: user.organization_key,
                className: user.admitted_class,
                sectionName: section,
                academicYear: user.academic_year,
            }));
            dispatch(fetchSubjectsRequest());
        }
    }, [dispatch, user, section]);
    
    const handleAutoSubmission = () => {
        if (!user || !section || !selectedSubjectInfo || submissionRef.current) {
            return;
        }

        submissionRef.current = true;
        
        const score = questions.reduce((acc, q) => acc + (answers[q.id!] === q.answer ? 1 : 0), 0);

        const studentResult: StudentResult = {
            student_id: user.id,
            student_name: user.full_name,
            roll_no: rollNo || undefined,
            register_no: user.register_no || undefined,
            time_taken: formatTime(elapsedTime),
            score: score,
            total_questions: questions.length,
            results: questions.map(q => ({
                question_id: q.id,
                question_text: q.questions,
                selected_answer: answers[q.id!] || 'Not Answered',
                correct_answer: q.answer,
            })),
        };

        const sessionData = {
            organization_key: user.organization_key!,
            academic_year: user.academic_year!,
            class_name: user.admitted_class!,
            section_name: section!,
            subject: selectedSubjectInfo.subjectName,
            subject_code: selectedSubjectInfo.subjectCode,
            staff_code: selectedSubjectInfo.staffCode,
            test_date: dayjs().format('YYYY-MM-DD'),
        };

        dispatch(saveMcqTestDataRequest({ sessionData, studentResult }));
        message.warning("Test was closed before completion and has been automatically submitted.");
    };


    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isModalVisible) {
            submissionRef.current = false;
            setElapsedTime(0);
            timer = setInterval(() => {
                setElapsedTime(prevTime => prevTime + 1);
            }, 1000);
        }
        return () => {
            clearInterval(timer);
        };
    }, [isModalVisible]);
    
    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (isModalVisible && !submissionRef.current) {
                handleAutoSubmission();
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isModalVisible, submissionRef.current, answers, questions]);


    const formatTime = (totalSeconds: number) => {
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    };

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer,
        }));
    };
    
    const handleSubmission = () => {
        setIsSubmitted(true);
        message.info("Your test has been submitted. Check your results below.");
    };
    
    const handleConfirmAndSave = () => {
        if (!user || !section || !selectedSubjectInfo) {
            message.error("Missing necessary data to save results.");
            return;
        }

        submissionRef.current = true;
        const score = questions.reduce((acc, q) => acc + (answers[q.id!] === q.answer ? 1 : 0), 0);

        const studentResult: StudentResult = {
            student_id: user.id,
            student_name: user.full_name,
            roll_no: rollNo || undefined,
            register_no: user.register_no || undefined,
            time_taken: formatTime(elapsedTime),
            score: score,
            total_questions: questions.length,
            results: questions.map(q => ({
                question_id: q.id,
                question_text: q.questions,
                selected_answer: answers[q.id!] || 'Not Answered',
                correct_answer: q.answer,
            })),
        };
        
        const sessionData = {
            organization_key: user.organization_key!,
            academic_year: user.academic_year!,
            class_name: user.admitted_class!,
            section_name: section!,
            subject: selectedSubjectInfo.subjectName,
            subject_code: selectedSubjectInfo.subjectCode,
            staff_code: selectedSubjectInfo.staffCode,
            test_date: dayjs().format('YYYY-MM-DD'),
        };

        dispatch(saveMcqTestDataRequest({ sessionData, studentResult }));
        handleModalClose();
    };

    const getRadioStyle = (question: OneMarkQuestionItem, option: string) => {
        if (!isSubmitted) return {};
        
        const selectedAnswer = answers[question.id!];
        const correctAnswer = question.answer;

        if (option === correctAnswer) {
            return { color: 'green', fontWeight: 'bold' };
        }
        if (option === selectedAnswer && selectedAnswer !== correctAnswer) {
            return { color: 'red', textDecoration: 'line-through' };
        }
        return {};
    };

    const subjectsForClass = useMemo(() => {
        if (!mappings || mappings.length === 0) return [];
        const subjectNames = [...new Set(mappings.map(m => m.subject_name))];
        return subjects.filter(s => subjectNames.includes(s.subject_name));
    }, [mappings, subjects]);

    const isLoading = mappingsLoading || subjectsLoading || loadingSection;
    const error = mappingsError || subjectsError;
    
    const handleAttendTest = async (subjectName: string, subjectCode: string) => {
        if (!user || !section || !user.academic_year || !user.admitted_class) {
            message.error("User or class details are not available.");
            return;
        }

        setModalLoading(true);
        setQuestions([]); 
        setAnswers({});
        setIsSubmitted(false);
        try {
            const subjectMapping = mappings.find(m => m.subject_name === subjectName);
            if (!subjectMapping || !subjectMapping.teacher_name) {
                throw new Error(`No teacher assigned for ${subjectName}.`);
            }
            
            const { data: teacherData, error: teacherError } = await supabase
                .from('teachers')
                .select('staff_code')
                .eq('full_name', subjectMapping.teacher_name)
                .eq('organization_key', user.organization_key)
                .single();
            
            if (teacherError || !teacherData) {
                throw new Error(`Could not find staff code for teacher: ${subjectMapping.teacher_name}.`);
            }

            const staffCode = teacherData.staff_code;

            const { data: questionBatch, error: batchError } = await supabase
                .from('one_questions')
                .select('questions')
                .eq('organization_key', user.organization_key)
                .eq('staff_code', staffCode)
                .eq('academic_year', user.academic_year)
                .eq('class', user.admitted_class)
                .eq('section', section)
                .eq('subject', subjectName)
                .eq('title', 'Choose the correct answer')
                .single();
            
            if (batchError && batchError.code !== 'PGRST116') throw batchError;

            if (!questionBatch || !questionBatch.questions || questionBatch.questions.length === 0) {
                 message.warning('No new questions are available for this subject at the moment.');
            } else {
                const shuffledQuestions = [...questionBatch.questions].sort(() => 0.5 - Math.random());
                const selectedQuestions = shuffledQuestions.slice(0, 5); // Take 5 random questions
                setQuestions(selectedQuestions);
                setSelectedSubjectInfo({ subjectName, subjectCode, staffCode });
                setIsModalVisible(true);
            }

        } catch (err: any) {
            message.error(err.message);
            console.error("Error fetching questions:", err);
        } finally {
            setModalLoading(false);
        }
    };

    const handleModalClose = () => {
        if (isModalVisible && !submissionRef.current && questions.length > 0) {
            handleAutoSubmission();
        }
        setIsModalVisible(false);
        setSelectedSubjectInfo(null);
        setIsSubmitted(false);
        setAnswers({});
        form.resetFields();
    };


    if (isLoading) {
        return <Spin tip="Loading subjects..." fullscreen />;
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    return (
        <>
            <Card>
                <Title level={4}>Daily MCQ Test</Title>
                <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                    Select a subject to start your daily test.
                </Text>

                {subjectsForClass.length > 0 ? (
                    <List
                        grid={{
                            gutter: 16,
                            xs: 1,
                            sm: 2,
                            md: 2,
                            lg: 3,
                            xl: 4,
                            xxl: 4,
                        }}
                        dataSource={subjectsForClass}
                        renderItem={subject => {
                            const hasTakenTestToday = subjectsTakenToday.includes(subject.subject_name);
                            return (
                                <List.Item>
                                    <Card hoverable>
                                        <Row align="middle" justify="space-between">
                                            <Col>
                                                <Space align="center">
                                                    <BookOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
                                                    <div>
                                                        <Text strong>{subject.subject_name}</Text>
                                                        <br />
                                                        <Text type="secondary">Code: {subject.subject_code}</Text>
                                                    </div>
                                                </Space>
                                            </Col>
                                            <Col>
                                                <Button
                                                    type="primary"
                                                    icon={<RightOutlined />}
                                                    onClick={() => handleAttendTest(subject.subject_name, subject.subject_code)}
                                                    loading={modalLoading}
                                                    disabled={hasTakenTestToday}
                                                >
                                                    {hasTakenTestToday ? 'Attended' : 'Attend Test'}
                                                </Button>
                                            </Col>
                                        </Row>
                                    </Card>
                                </List.Item>
                            )
                        }}
                    />
                ) : (
                    <Empty description="No subjects are currently assigned to your class section." />
                )}
            </Card>

            <Modal
                title={null}
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={[
                    <Button key="back" onClick={handleModalClose}>
                        Close
                    </Button>,
                     <Button
                        key="submit"
                        type="primary"
                        onClick={isSubmitted ? handleConfirmAndSave : handleSubmission}
                        disabled={!isSubmitted && (Object.keys(answers).length !== questions.length || questions.length === 0)}
                    >
                        {isSubmitted ? 'Confirm & Save' : 'Submit Test'}
                    </Button>,
                ]}
                 width={800}
                 styles={{ body: { paddingTop: 8 } }}
            >
                <div style={{ padding: '8px 0', marginTop: '24px' }}>
                     <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={5} style={{ margin: 0, color: '#1890ff' }}>
                                {selectedSubjectInfo?.subjectName}
                            </Title>
                        </Col>
                        <Col>
                            <Text type="secondary">{dayjs().format('MMMM D, YYYY')}</Text>
                        </Col>
                    </Row>
                    <Row justify="space-between" align="middle" style={{ marginTop: '8px' }}>
                       <Col>
                            <Text type="secondary" style={{fontSize: '12px'}}>Code: {selectedSubjectInfo?.subjectCode}</Text>
                        </Col>
                         <Col>
                            <Text style={{ fontSize: '12px' }}>{formatTime(elapsedTime)}</Text>
                        </Col>
                    </Row>
                    <Row justify="space-between" align="middle" style={{marginTop: '8px'}}>
                        <Col>
                             <Text type="secondary" style={{fontSize: '12px'}}>
                                Class: {user?.admitted_class} - {section} ({user?.academic_year})
                            </Text>
                        </Col>
                         <Col>
                            <Text type="secondary" style={{fontSize: '12px'}}>
                                {user?.full_name} ({rollNo || user?.register_no})
                            </Text>
                        </Col>
                    </Row>
                </div>
                <Divider style={{margin: '12px 0'}} />
                <Spin spinning={modalLoading}>
                    {questions.length > 0 ? (
                        <Form
                            form={form}
                            onFinish={handleSubmission}
                            style={{ maxHeight: '60vh', overflowY: 'auto', padding: '0 16px' }}
                        >
                            <List
                                dataSource={questions}
                                renderItem={(question, index) => (
                                    <List.Item>
                                        <Form.Item
                                            label={<Text strong>{`${index + 1}. ${question.questions}`}</Text>}
                                            style={{ marginBottom: 0, width: '100%' }}
                                            labelCol={{ span: 24 }}
                                            wrapperCol={{ span: 24 }}
                                        >
                                             <Radio.Group
                                                onChange={(e) => handleAnswerChange(question.id!, e.target.value)}
                                                value={answers[question.id!]}
                                                style={{ width: '100%', marginTop: 8 }}
                                                disabled={isSubmitted}
                                            >
                                                <Row gutter={[16, 16]}>
                                                    {[question.option1, question.option2, question.option3, question.option4].filter(Boolean).map((opt, optIndex) => (
                                                        <Col xs={24} sm={12} key={optIndex}>
                                                            <Radio value={opt!} style={getRadioStyle(question, opt!)}>
                                                                {opt}
                                                            </Radio>
                                                        </Col>
                                                    ))}
                                                </Row>
                                            </Radio.Group>
                                        </Form.Item>
                                    </List.Item>
                                )}
                            />
                        </Form>
                    ) : (
                        !modalLoading && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No questions found for this test." style={{padding: '24px 0'}} />
                    )}
                </Spin>
            </Modal>
        </>
    );
};

export default DailyMCQTest;
