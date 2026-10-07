
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Select, Typography, Spin, Alert, List, Avatar, Row, Col, Modal, Button, Input, Tag } from 'antd';
import { UserOutlined, ArrowLeftOutlined, SendOutlined, CheckOutlined } from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import { fetchStudentsForClassRequest, type ChatStudent } from '../../store/features/chat/chatSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);


const { Title, Text } = Typography;
const { Option } = Select;

interface Message {
    id: string; // Unique ID for each message
    sender: 'teacher' | 'student';
    content: string;
    timestamp: string;
    status: 'Pending' | 'Progress' | 'Completed';
    date: string;
}

const Chat: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.teacherDashboard);
    const { students, loading: studentsLoading, error: studentsError } = useSelector((state: RootState) => state.chat);
    
    const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isChatModalVisible, setIsChatModalVisible] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const [recentChatStudents, setRecentChatStudents] = useState<ChatStudent[]>([]);
    const [loadingRecents, setLoadingRecents] = useState(true);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);


    useEffect(() => {
        if (user?.organization_key) {
            dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
        }
        
        const fetchRecentChats = async () => {
            if (!user?.id) {
                setLoadingRecents(false);
                return;
            };
            
            setLoadingRecents(true);
            try {
                const { data, error } = await supabase
                    .rpc('get_teacher_recent_chats', { p_teacher_id: user.id });

                if (error) throw error;
                
                const recentStudents = data.map((d: any) => ({
                    id: d.student_id,
                    full_name: d.student_name,
                    phone: d.phone, 
                }));

                setRecentChatStudents(recentStudents);

            } catch(err) {
                console.error("Failed to fetch recent chats:", err);
            } finally {
                setLoadingRecents(false);
            }
        };
        fetchRecentChats();
    }, [dispatch, user]);

    useEffect(() => {
        if (selectedClassKey) {
            const [className, sectionName, academicYear] = selectedClassKey.split('||');
            dispatch(fetchStudentsForClassRequest({
                organizationKey: user!.organization_key!,
                className,
                sectionName,
                academicYear,
            }));
        }
    }, [dispatch, selectedClassKey, user]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!isChatModalVisible || !selectedStudentId || !user?.id || !user?.staff_code) {
            return;
        }

        const markAsRead = async () => {
            await supabase.rpc('mark_messages_as_read', {
                p_student_id: selectedStudentId,
                p_teacher_id: user.id,
                p_reader_identifier: user.staff_code!
            });
        };

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chats')
                .select('messages, date')
                .eq('student_id', selectedStudentId)
                .eq('teacher_id', user.id)
                .order('date', { ascending: true });


            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching messages:", error);
            } else if (data) {
                const allMessages: Message[] = [];
                data.forEach((chatDay: { messages: any[]; date: string; }) => {
                     const formattedMessages = chatDay.messages.map((msg: any) => {
                        const senderKey = Object.keys(msg)[0];
                        const senderData = msg[senderKey];
                        return {
                            id: senderData.id,
                            sender: senderKey === user.staff_code ? 'teacher' : 'student',
                            content: senderData.message,
                            timestamp: senderData.time,
                            status: senderData.status || 'Pending',
                            date: chatDay.date,
                        };
                    });
                    allMessages.push(...formattedMessages as Message[]);
                });
                setMessages(allMessages);
                markAsRead();
            } else {
                 setMessages([]);
            }
        };

        fetchMessages();

        const onlineInterval = setInterval(() => {
            setIsReceiverOnline(Math.random() > 0.3);
        }, 5000);

        const channel = supabase.channel(`chat:${user.id}-${selectedStudentId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chats',
                filter: `student_id=eq.${selectedStudentId}`
            }, payload => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            clearInterval(onlineInterval);
            supabase.removeChannel(channel);
        };

    }, [isChatModalVisible, selectedStudentId, user?.id, user?.staff_code]);

    const myAssignments = useMemo(() => {
        if (!mappings || !user?.full_name) return [];
        return mappings.filter(m => m.teacher_name === user.full_name);
    }, [mappings, user?.full_name]);

    const classOptions = useMemo(() => {
        const uniqueClasses = myAssignments.reduce((acc, m) => {
            const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
            if (!acc.has(key)) {
                acc.set(key, { 
                    key, 
                    label: `${m.class_name} - ${m.section_name} (${m.academic_year})` 
                });
            }
            return acc;
        }, new Map<string, { key: string, label: string }>());
        return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
    }, [myAssignments]);
    
    const displayedStudents = useMemo(() => {
        if (selectedClassKey) {
            return students;
        }
        return recentChatStudents;
    }, [selectedClassKey, students, recentChatStudents]);

    const selectedStudent = useMemo(() => {
        if (!selectedStudentId) return null;
        return students.find(s => s.id === selectedStudentId) || recentChatStudents.find(s => s.id === selectedStudentId);
    }, [students, recentChatStudents, selectedStudentId]);
    
    const handleStudentClick = (student: ChatStudent) => {
        setSelectedStudentId(student.id);
        setIsChatModalVisible(true);
    };
    
    const handleModalClose = () => {
        setIsChatModalVisible(false);
        setMessages([]);
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || !selectedStudent) return;
        
        setSending(true);
        const today = dayjs().format('YYYY-MM-DD');
        const timestamp = dayjs().format('hh:mm A');
        const messageId = `msg_${Date.now()}`;
        const initialStatus = isReceiverOnline ? 'Progress' : 'Pending';

        const messagePayload = {
            [user.staff_code!]: {
                id: messageId,
                time: timestamp,
                message: newMessage,
                status: initialStatus
            }
        };

        setMessages(prev => [...prev, {
            id: messageId,
            sender: 'teacher',
            content: newMessage,
            timestamp: timestamp,
            status: initialStatus,
            date: today,
        }]);
        setNewMessage('');

        try {
            const { error } = await supabase.rpc('append_to_chat', {
                p_organization_key: user.organization_key,
                p_date: today,
                p_student_id: selectedStudent.id,
                p_teacher_id: user.id,
                p_student_name: selectedStudent.full_name,
                p_teacher_name: user.full_name,
                p_message: messagePayload
            });

            if (error) throw error;
            
        } catch (error: any) {
            console.error("Failed to send message:", error);
            setMessages(prev => prev.map(msg => 
                msg.id === messageId
                ? { ...msg, status: 'Failed' as any }
                : msg
            ));
        } finally {
            setSending(false);
        }
    };


    const isLoading = mappingsLoading || studentsLoading || loadingRecents;
    const error = mappingsError || studentsError;

    const handleClassChange = (key: string | null) => {
        setSelectedClassKey(key);
        setSelectedStudentId(null);
    };

    const formatDateSeparator = (dateStr: string) => {
        const date = dayjs(dateStr);
        if (date.isToday()) return 'Today';
        if (date.isYesterday()) return 'Yesterday';
        return date.format('MMMM D, YYYY');
    };

    const renderTicks = (status: Message['status']) => {
        if (status === 'Completed') {
            return <><CheckOutlined style={{ color: '#53bdeb', marginLeft: 4 }} /><CheckOutlined style={{ color: '#53bdeb', marginLeft: -8, position: 'relative', left: '4px' }} /></>;
        }
        if (status === 'Progress') {
            return <><CheckOutlined style={{ marginLeft: 4 }} /><CheckOutlined style={{ marginLeft: -8, position: 'relative', left: '4px' }} /></>;
        }
        return <CheckOutlined style={{ color: 'gray', marginLeft: 4 }} />;
    };

    const messagesWithSeparators = () => {
        const elements: JSX.Element[] = [];
        let lastDate: string | null = null;

        messages.forEach((msg, index) => {
            if (msg.date !== lastDate) {
                elements.push(
                    <div key={`date-${msg.date}`} style={{ textAlign: 'center', margin: '16px 0' }}>
                        <Tag style={{ padding: '4px 12px', borderRadius: '12px' }}>
                            {formatDateSeparator(msg.date)}
                        </Tag>
                    </div>
                );
                lastDate = msg.date;
            }
            elements.push(
                <div key={msg.id || index} style={{ marginBottom: '12px', textAlign: msg.sender === 'teacher' ? 'right' : 'left' }}>
                    <div style={{ background: msg.sender === 'teacher' ? '#DCF8C6' : '#FFF', padding: '8px 12px', borderRadius: '8px', display: 'inline-block', maxWidth: '70%' }}>
                        <Text>{msg.content}</Text>
                        <br/>
                        <Text type="secondary" style={{fontSize: 10, float: 'right'}}>
                            {msg.timestamp}
                            {msg.sender === 'teacher' && renderTicks(msg.status)}
                        </Text>
                    </div>
                </div>
            );
        });
        return elements;
    };

    return (
        <>
        <Card>
            <Title level={4}>Chat</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                {selectedClassKey ? 'Select a student from your class to chat' : 'Showing recent chats. Select a class to see all students.'}
            </Text>
            
            <Spin spinning={isLoading}>
                {error && <Alert message="Error" description={error} type="error" showIcon closable style={{ marginBottom: 16 }} />}
                
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={12}>
                        <Select
                            showSearch
                            placeholder="Select a class to find students"
                            style={{ width: '100%' }}
                            value={selectedClassKey}
                            onChange={handleClassChange}
                            loading={mappingsLoading}
                            allowClear
                            filterOption={(input, option) =>
                                (option?.children as unknown as string).toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {classOptions.map(opt => <Option key={opt.key} value={opt.key}>{opt.label}</Option>)}
                        </Select>
                    </Col>
                </Row>
                
                 <List
                    itemLayout="horizontal"
                    dataSource={displayedStudents}
                    renderItem={(item) => (
                        <List.Item 
                            onClick={() => handleStudentClick(item)} 
                            style={{
                                cursor: 'pointer',
                                borderRadius: '8px',
                                padding: '12px',
                                backgroundColor: selectedStudentId === item.id ? '#e6f7ff' : 'transparent',
                                transition: 'background-color 0.3s'
                            }}
                        >
                            <List.Item.Meta
                                avatar={<Avatar size={48} icon={<UserOutlined />} />}
                                title={<Text strong>{item.full_name}</Text>}
                                description={`Contact: ${item.phone || 'Not available'}`}
                            />
                        </List.Item>
                    )}
                />
            </Spin>
        </Card>
        
        <Modal
            open={isChatModalVisible}
            onCancel={handleModalClose}
            footer={null}
            title={
                <Row justify="space-between" align="middle" wrap={false} style={{ padding: '8px 0' }}>
                    <Col>
                        <Row align="middle" gutter={12}>
                            <Col>
                                 <Button
                                    type="text"
                                    shape="circle"
                                    icon={<ArrowLeftOutlined style={{ fontSize: '20px' }} />}
                                    onClick={handleModalClose}
                                />
                            </Col>
                            <Col>
                                <Avatar size="large" icon={<UserOutlined />} />
                            </Col>
                            <Col>
                                <Text strong>{selectedStudent?.full_name}</Text>
                                <br />
                                <Text type="secondary">{isReceiverOnline ? 'Online' : 'Offline'}</Text>
                            </Col>
                        </Row>
                    </Col>
                </Row>
            }
            width="100vw"
            style={{ top: 0, margin: 0, padding: 0, maxWidth: '100vw', height: '100vh' }}
            bodyStyle={{ height: 'calc(100vh - 72px)', overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', background: '#ECE5DD' }}
            closable={false}
            maskClosable={false}
        >
             <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {messagesWithSeparators()}
                <div ref={messagesEndRef} />
             </div>
             <div style={{ padding: '12px', background: '#F0F0F0', display: 'flex', alignItems: 'center' }}>
                <Input.Search
                    placeholder="Type a message"
                    enterButton={<Button type="primary" icon={<SendOutlined />} loading={sending} />}
                    size="large"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onSearch={handleSendMessage}
                    disabled={sending}
                />
             </div>
        </Modal>
        </>
    );
};

export default Chat;
