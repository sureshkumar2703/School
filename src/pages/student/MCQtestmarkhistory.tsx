

import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, List, Empty, Row, Col, Space, Tag, Modal, Button } from 'antd';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchMcqTestHistoryRequest, type TestSession } from '../../store/features/mcq-test-history/mcqTestHistorySlice';
import dayjs from 'dayjs';
import { BookOutlined, FieldTimeOutlined, CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const { Title, Text, Paragraph } = Typography;

const TestHistoryCard = ({ session, onDetailsClick }: { session: TestSession, onDetailsClick: (session: TestSession) => void }) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const scoreColor = session.score >= session.totalQuestions / 2 ? 'success' : 'error';
    
    const desktopLayout = (
        <Row align="middle" justify="space-between">
            <Col span={8}>
                <Space direction="vertical">
                    <Text strong>{session.subject}</Text>
                    <Text type="secondary">{dayjs(session.test_date).format('DD MMM YYYY')}</Text>
                </Space>
            </Col>
            <Col span={8} style={{ textAlign: 'center' }}>
                 <Tag icon={<FieldTimeOutlined />} color="default">
                    Time: {session.time_taken}
                </Tag>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
                <Space>
                    <Tag icon={<CheckCircleOutlined />} color={scoreColor}>
                        Score: {session.score}/{session.totalQuestions}
                    </Tag>
                    <Button icon={<EyeOutlined />} onClick={() => onDetailsClick(session)}>Details</Button>
                </Space>
            </Col>
        </Row>
    );

    const mobileLayout = (
        <Space direction="vertical" style={{ width: '100%' }}>
             <div>
                <Text strong>{session.subject}</Text>
                <br/>
                <Text type="secondary">{dayjs(session.test_date).format('DD MMM YYYY')}</Text>
            </div>
             <Row justify="space-between" align="middle" style={{ width: '100%' }}>
                <Col>
                    <Tag icon={<FieldTimeOutlined />} color="default">
                        Time: {session.time_taken}
                    </Tag>
                </Col>
                 <Col>
                    <Tag icon={<CheckCircleOutlined />} color={scoreColor}>
                        Score: {session.score}/{session.totalQuestions}
                    </Tag>
                </Col>
            </Row>
            <Button icon={<EyeOutlined />} onClick={() => onDetailsClick(session)} block style={{marginTop: 8}}>
                View Details
            </Button>
        </Space>
    );

    return (
        <Card hoverable bodyStyle={{padding: '16px'}}>
            {isMobile ? mobileLayout : desktopLayout}
        </Card>
    );
};

const MCQtestmarkhistory: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedSession, setSelectedSession] = useState<TestSession | null>(null);

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { history, loading, error } = useSelector((state: RootState) => state.mcqTestHistory);

    useEffect(() => {
        if (user?.id) {
            dispatch(fetchMcqTestHistoryRequest(user.id));
        }
    }, [dispatch, user]);

    const handleDetailsClick = (session: TestSession) => {
        setSelectedSession(session);
        setIsModalVisible(true);
    };

    const handleModalClose = () => {
        setIsModalVisible(false);
        setSelectedSession(null);
    };

    if (loading) {
        return <Spin tip="Loading your test history..." fullscreen />;
    }
    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    return (
        <>
            <Card>
                <Title level={4}>MCQ Test Mark History</Title>
                <Paragraph type="secondary">Review your performance from past tests.</Paragraph>

                {history.length > 0 ? (
                    <List
                        dataSource={history}
                        renderItem={session => (
                            <List.Item>
                                <TestHistoryCard session={session} onDetailsClick={handleDetailsClick} />
                            </List.Item>
                        )}
                        grid={{ gutter: 16, xs: 1, sm: 1, md: 1, lg: 1, xl: 1, xxl: 1 }}
                    />
                ) : (
                    <Empty description="You have not attempted any MCQ tests yet." />
                )}
            </Card>

            <Modal
                title={`Test Details - ${selectedSession?.subject} (${dayjs(selectedSession?.test_date).format('DD MMM YYYY')})`}
                open={isModalVisible}
                onCancel={handleModalClose}
                footer={[<Button key="close" onClick={handleModalClose}>Close</Button>]}
                width={800}
            >
                {selectedSession && (
                    <List
                        dataSource={selectedSession.questions}
                        renderItem={(q, index) => {
                            const isCorrect = q.selected_answer === q.correct_answer;
                            return (
                                <List.Item>
                                    <div style={{width: '100%'}}>
                                        <Text strong>{`${index + 1}. ${q.question_text}`}</Text>
                                        <div style={{ marginTop: 8, paddingLeft: 16 }}>
                                            <Space align="baseline">
                                                <Text>Your answer:</Text>
                                                <Tag color={isCorrect ? 'green' : 'red'}>{q.selected_answer || 'Not Answered'}</Tag>
                                            </Space>
                                            {!isCorrect && (
                                                <div style={{ marginTop: 4 }}>
                                                     <Space align="baseline">
                                                        <Text>Correct answer:</Text>
                                                        <Tag color="blue">{q.correct_answer}</Tag>
                                                     </Space>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Modal>
        </>
    );
};

export default MCQtestmarkhistory;
