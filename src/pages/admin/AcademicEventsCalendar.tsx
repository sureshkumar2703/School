
import React, { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Calendar, Badge, Card, Typography, Spin, Alert, Modal, Form, Input, Button, message, Row, Col, Tooltip } from 'antd';
import type { Dayjs } from 'dayjs';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchEventsRequest, addEventRequest, type Event } from '../../store/features/events/eventsSlice';
import dayjs from 'dayjs';
import { EyeOutlined } from '@ant-design/icons';


const { Title, Text } = Typography;

const AcademicEventsCalendar: React.FC = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isYearViewModalVisible, setIsYearViewModalVisible] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [currentYear] = useState(dayjs().year());
    const [form] = Form.useForm();
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { events, loading, error } = useSelector((state: RootState) => state.events);

    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchEventsRequest(user.organization_key));
        }
    }, [dispatch, user?.organization_key]);

    const eventsByDate = useMemo(() => {
        const map = new Map<string, Event[]>();
        events.forEach(event => {
            const dateStr = dayjs(event.event_date).format('YYYY-MM-DD');
            if (!map.has(dateStr)) {
                map.set(dateStr, []);
            }
            map.get(dateStr)!.push(event as any);
        });
        return map;
    }, [events]);

    const handleSelectDate = (date: Dayjs) => {
        setSelectedDate(date);
        setIsModalVisible(true);
        form.setFieldsValue({ event_date: date });
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setSelectedDate(null);
        form.resetFields();
    };

    const onFinish = (values: { title: string; description: string }) => {
        if (!user?.organization_key || !selectedDate) {
            message.error("Cannot create event. Missing user or date information.");
            return;
        }

        dispatch(addEventRequest({
            organization_key: user.organization_key,
            title: values.title,
            description: values.description,
            event_date: selectedDate.format('YYYY-MM-DD'),
        } as any));
        
        handleCancel();
    };

    const dateCellRender = (value: Dayjs) => {
        const dateStr = value.format('YYYY-MM-DD');
        const listData = eventsByDate.get(dateStr) || [];
        return (
            <ul className="events" style={{ margin: 0, padding: '0 4px', listStyle: 'none' }}>
                {listData.map((item) => (
                    <li key={item.id}>
                        <Badge status={'success'} text={item.title} />
                    </li>
                ))}
            </ul>
        );
    };

    const renderYearView = () => {
        const months = Array.from({ length: 12 }, (_, i) => dayjs().year(currentYear).month(i));
        
        return (
            <Row gutter={[16, 24]}>
                {months.map(month => {
                    const daysInMonth = month.daysInMonth();
                    const firstDayOfMonth = month.startOf('month').day();
                    const emptyCells = Array(firstDayOfMonth).fill(null);
                    const dayCells = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                    return (
                        <Col xs={24} sm={12} md={8} lg={6} key={month.format('YYYY-MM')}>
                            <div style={{ border: '1px solid #f0f0f0', borderRadius: '4px', padding: '8px' }}>
                                <Title level={5} style={{ textAlign: 'center', margin: '0 0 8px 0' }}>{month.format('MMMM')}</Title>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <Text strong key={d}>{d}</Text>)}
                                    {emptyCells.map((_, i) => <div key={`empty-${i}`}/>)}
                                    {dayCells.map(day => {
                                        const currentDate = month.date(day);
                                        const dateStr = currentDate.format('YYYY-MM-DD');
                                        const dayEvents = eventsByDate.get(dateStr);
                                        const hasEvent = dayEvents && dayEvents.length > 0;
                                        
                                        return (
                                            <Tooltip
                                                key={dateStr}
                                                title={hasEvent ? dayEvents.map(e => e.title).join(', ') : ''}
                                            >
                                                <div style={{
                                                    background: hasEvent ? '#e6f7ff' : 'transparent',
                                                    borderRadius: '50%',
                                                    width: '28px',
                                                    height: '28px',
                                                    lineHeight: '28px',
                                                    cursor: hasEvent ? 'pointer' : 'default',
                                                }}>
                                                    {day}
                                                </div>
                                            </Tooltip>
                                        );
                                    })}
                                </div>
                            </div>
                        </Col>
                    );
                })}
            </Row>
        )
    };
    
    return (
        <>
        <Card
             title={<Title level={4}>Academic Events Calendar</Title>}
             extra={
                <Button icon={<EyeOutlined />} onClick={() => setIsYearViewModalVisible(true)}>
                    View All
                </Button>
             }
        >
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                A full-year view of all scheduled school events. Click on a date to add a new event.
            </Text>
            {error && <Alert message="Error fetching events" description={error} type="error" showIcon style={{marginBottom: 16}} />}
            <Spin spinning={loading}>
                 <Calendar dateCellRender={dateCellRender} onSelect={handleSelectDate} />
            </Spin>
        </Card>
        
        <Modal
            title={`Add Event for ${selectedDate?.format('MMMM D, YYYY')}`}
            open={isModalVisible}
            onCancel={handleCancel}
            footer={null}
            destroyOnClose
        >
            <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 24 }}>
                <Form.Item name="title" label="Event Title" rules={[{ required: true, message: 'Please enter a title for the event.' }]}>
                    <Input placeholder="e.g., Annual Sports Day" />
                </Form.Item>
                <Form.Item name="description" label="Event Description" rules={[{ required: true, message: 'Please enter a description.' }]}>
                    <Input.TextArea rows={4} placeholder="Describe the event..." />
                </Form.Item>
                
                <Form.Item shouldUpdate>
                    {() => (
                         <Row justify="end">
                            <Button onClick={handleCancel} style={{ marginRight: 8 }}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                disabled={
                                    !form.isFieldTouched('title') ||
                                    !form.isFieldTouched('description') ||
                                    !!form.getFieldsError().filter(({ errors }) => errors.length).length
                                }
                            >
                                Submit
                            </Button>
                        </Row>
                    )}
                </Form.Item>
            </Form>
        </Modal>

        <Modal
            title={`Yearly Event Overview - ${currentYear}`}
            open={isYearViewModalVisible}
            onCancel={() => setIsYearViewModalVisible(false)}
            footer={null}
            width="90vw"
            style={{ maxWidth: '1200px' }}
        >
            {renderYearView()}
        </Modal>
        </>
    );
};

export default AcademicEventsCalendar;
