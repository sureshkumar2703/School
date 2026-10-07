
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, Row, Col, Select, Button, Empty, Modal, Space, Tag, Descriptions, List, message } from 'antd';
import { CalendarOutlined, SolutionOutlined, ReadOutlined, EyeOutlined, PrinterOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchAllQuestionPapersRequest, updateQuestionPaperStatusRequest, type QuestionPaper } from '../../store/features/question-paper-list/questionPaperListSlice';
import { fetchExamTimetablesRequest, type ExamTimetable, type ExamDay } from '../../store/features/exam-timetable-admin/examTimetableAdminSlice';
import { fetchAcademicCalendarsRequest } from '../../store/features/academic-calendar/academicCalendarSlice';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';


const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Type for the second modal's data
interface ClassTimetableInfo {
    class_name: string;
    section_name: string;
    exam_title: string;
    total_mark: number;
    exam_time: string;
}

// Type for the third modal's data
interface ScheduleDetail {
    timetable: ExamTimetable;
}

const ExamList: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { papers, loading: papersLoading, error: papersError } = useSelector((state: RootState) => state.questionPaperList);
    const { timetables, loading: timetablesLoading, error: timetablesError } = useSelector((state: RootState) => state.examTimetableAdmin);
    const { calendars, loading: calendarsLoading } = useSelector((state: RootState) => state.academicCalendar);

    const [selectedYear, setSelectedYear] = useState<string | null>(null);
    const [isClassModalVisible, setIsClassModalVisible] = useState(false);
    const [isScheduleModalVisible, setIsScheduleModalVisible] = useState(false);
    const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);

    const [modalData, setModalData] = useState<{ academicYear: string; examTitle: string; classTimetables: ClassTimetableInfo[] } | null>(null);
    const [scheduleData, setScheduleData] = useState<ScheduleDetail | null>(null);
    const [paperData, setPaperData] = useState<QuestionPaper | null>(null);
    
    const printRef = useRef(null);
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
    });


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchAllQuestionPapersRequest(user.organization_key));
            dispatch(fetchExamTimetablesRequest(user.organization_key));
            dispatch(fetchAcademicCalendarsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    useEffect(() => {
        if (calendars.length > 0 && !selectedYear) {
            const currentYear = calendars.find(c => c.is_current)?.academic_year;
            if (currentYear) {
                setSelectedYear(currentYear);
            }
        }
    }, [calendars, selectedYear]);
    
    const academicYearOptions = useMemo(() => {
        return calendars.filter(c => c.status === 'Active');
    }, [calendars]);

    const examsByYear = useMemo(() => {
        if (!selectedYear) return [];
        const examsForYear = timetables.filter(t => t.academic_year === selectedYear);
        const uniqueTitles = [...new Set(examsForYear.map(t => t.exam_title))];
        return uniqueTitles;
    }, [timetables, selectedYear]);

    const handleViewTimetables = (academicYear: string, examTitle: string) => {
        const filteredTimetables = timetables
            .filter(t => t.academic_year === academicYear && t.exam_title === examTitle)
            .map(t => ({
                class_name: t.class_name,
                section_name: t.section_name,
                exam_title: t.exam_title,
                total_mark: t.exam_total_mark,
                exam_time: t.exam_time,
            }));
        
        setModalData({ academicYear, examTitle, classTimetables: filteredTimetables });
        setIsClassModalVisible(true);
    };
    
    const handleViewSchedule = (classInfo: ClassTimetableInfo) => {
        const fullTimetable = timetables.find(t => 
            t.academic_year === modalData?.academicYear &&
            t.exam_title === classInfo.exam_title &&
            t.class_name === classInfo.class_name &&
            t.section_name === classInfo.section_name
        );

        if (fullTimetable) {
            setScheduleData({ timetable: fullTimetable });
            setIsScheduleModalVisible(true);
        }
    };
    
    const handleViewPaper = (schedule: ScheduleDetail, examDay: ExamDay) => {
        const paper = papers.find(p =>
            p.academic_year === schedule.timetable.academic_year &&
            p.class_name === schedule.timetable.class_name &&
            p.section_name === schedule.timetable.section_name &&
            p.exam_title === schedule.timetable.exam_title &&
            p.subject === examDay.subject
        );

        if (paper) {
            setPaperData(paper);
            setIsPaperModalVisible(true);
        } else {
            message.info("No question paper has been generated for this subject yet.");
        }
    };
    
    const handleConfirmPaper = () => {
        if (!paperData || !user?.name) {
            message.error("Cannot confirm paper without required data.");
            return;
        };
        dispatch(updateQuestionPaperStatusRequest({
            paperId: paperData.id,
            status: 'Confirm',
            adminName: user.name,
        }));
    };
    
    useEffect(() => {
        if (paperData) {
            const updatedPaper = papers.find(p => p.id === paperData.id);
            if (updatedPaper) {
                setPaperData(updatedPaper);
            }
        }
    }, [papers, paperData]);

    
    const isLoading = papersLoading || timetablesLoading || calendarsLoading;
    const error = papersError || timetablesError;

    return (
        <Card>
            <Title level={4}>Exam List & Question Papers</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                Browse exams by academic year to view timetables and question papers.
            </Text>

            <Spin spinning={isLoading}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={8}>
                         <Select
                            placeholder="Select Academic Year"
                            style={{ width: '100%' }}
                            value={selectedYear}
                            onChange={setSelectedYear}
                            allowClear
                        >
                            {academicYearOptions.map(year => <Option key={year.id} value={year.academic_year}>{year.academic_year}{year.is_current && ' (Current)'}</Option>)}
                        </Select>
                    </Col>
                </Row>
                
                {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

                {selectedYear ? (
                     <Row gutter={[24, 24]}>
                        {examsByYear.length > 0 ? examsByYear.map(examTitle => (
                            <Col xs={24} sm={12} md={8} key={examTitle}>
                                <Card
                                    hoverable
                                    style={{ textAlign: 'center', borderRadius: '12px', background: '#f0f5ff' }}
                                    actions={[
                                        <Button type="primary" onClick={() => handleViewTimetables(selectedYear, examTitle)}>View Timetables</Button>
                                    ]}
                                >
                                    <ReadOutlined style={{ fontSize: '48px', color: '#1d39c4', marginBottom: '16px' }} />
                                    <Title level={5} style={{ margin: 0 }}>{examTitle}</Title>
                                    <Text type="secondary">{selectedYear}</Text>
                                </Card>
                            </Col>
                        )) : (
                            <Col span={24}>
                                <Empty description="No exam timetables found for this academic year." />
                            </Col>
                        )}
                    </Row>
                ) : (
                     <Empty description="Please select an academic year to view exams." />
                )}
            </Spin>

            <Modal
                title={`Classes for ${modalData?.examTitle} (${modalData?.academicYear})`}
                open={isClassModalVisible}
                onCancel={() => setIsClassModalVisible(false)}
                footer={null}
                width={800}
            >
                <List
                    dataSource={modalData?.classTimetables}
                    renderItem={item => (
                        <List.Item>
                             <Card 
                                hoverable
                                style={{ width: '100%' }}
                             >
                                <Row align="middle" justify="space-between" gutter={[16, 16]}>
                                    <Col xs={24} sm={8}>
                                        <Title level={5}>{`${item.class_name} - ${item.section_name}`}</Title>
                                    </Col>
                                    <Col xs={12} sm={8} style={{ textAlign: 'center' }}>
                                        <Space direction="vertical">
                                            <Tag>Total Marks: {item.total_mark}</Tag>
                                            <Tag>Duration: {dayjs(item.exam_time, 'HH:mm:ss').format('H [hr] m [min]')}</Tag>
                                        </Space>
                                    </Col>
                                    <Col xs={12} sm={8} style={{ textAlign: 'right' }}>
                                        <Button type="default" onClick={() => handleViewSchedule(item)}>View Schedule</Button>
                                    </Col>
                                </Row>
                            </Card>
                        </List.Item>
                    )}
                />
            </Modal>
            
            <Modal
                title={`Exam Schedule for ${scheduleData?.timetable.class_name} - ${scheduleData?.timetable.section_name}`}
                open={isScheduleModalVisible}
                onCancel={() => setIsScheduleModalVisible(false)}
                footer={null}
                width={800}
            >
                {scheduleData && (
                     <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
                        <Descriptions.Item label="Class">{`${scheduleData.timetable.class_name} - ${scheduleData.timetable.section_name}`}</Descriptions.Item>
                        <Descriptions.Item label="Academic Year">{scheduleData.timetable.academic_year}</Descriptions.Item>
                        <Descriptions.Item label="Total Marks">{scheduleData.timetable.exam_total_mark}</Descriptions.Item>
                        <Descriptions.Item label="Exam Time">{dayjs(scheduleData.timetable.exam_time, 'HH:mm:ss').format('h:mm A')}</Descriptions.Item>
                        <Descriptions.Item label="Created By">{scheduleData.timetable.created_by}</Descriptions.Item>
                    </Descriptions>
                )}
                <List
                    header={<Title level={5}>Schedule</Title>}
                    bordered
                    dataSource={scheduleData?.timetable.exam_days}
                    renderItem={item => {
                        const hasPaper = papers.some(p =>
                            p.academic_year === scheduleData?.timetable.academic_year &&
                            p.class_name === scheduleData?.timetable.class_name &&
                            p.section_name === scheduleData?.timetable.section_name &&
                            p.exam_title === scheduleData?.timetable.exam_title &&
                            p.subject === item.subject
                        );
                        return (
                            <List.Item>
                               <Row align="middle" justify="space-between" style={{ width: '100%' }}>
                                    <Col xs={24} sm={16}>
                                        <Text strong>{item.subject}:</Text> {dayjs(item.examdate).format('dddd, MMMM D, YYYY')} ({item.examsession})
                                    </Col>
                                    <Col xs={24} sm={8} style={{ textAlign: 'right', marginTop: '8px' }}>
                                        <Button size="small" onClick={() => handleViewPaper(scheduleData!, item)} disabled={!hasPaper}>View Paper</Button>
                                    </Col>
                                </Row>
                            </List.Item>
                        );
                    }}
                />
            </Modal>
            
             <Modal
                title="Question Paper Preview"
                open={isPaperModalVisible}
                onCancel={() => setIsPaperModalVisible(false)}
                footer={
                    paperData?.status === 'Confirm' ? (
                        [
                            <Button key="close" onClick={() => setIsPaperModalVisible(false)}>Close</Button>,
                            <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={handlePrint}>Print</Button>
                        ]
                    ) : (
                        [
                            <Button key="back" onClick={() => setIsPaperModalVisible(false)}>Cancel</Button>,
                            <Button key="submit" type="primary" onClick={handleConfirmPaper} loading={papersLoading}>Confirm Paper</Button>
                        ]
                    )
                }
                width="90%"
                style={{ top: 20 }}
            >
                {paperData?.paper_content ? (
                    <div
                        ref={printRef}
                        className="question-paper-content"
                        dangerouslySetInnerHTML={{ __html: paperData.paper_content }}
                    />
                ) : (
                    <Empty description="Could not load question paper content." />
                )}
            </Modal>
        </Card>
    );
};

export default ExamList;
