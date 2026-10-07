
import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, Typography, Spin, Alert, List, Avatar, Empty, Row, Col, Modal, Button, Input, Tag, Badge } from 'antd';
import { UserOutlined, ArrowLeftOutlined, SendOutlined, CheckOutlined } from '@ant-design/icons';
import type { RootState } from '../../store/store';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const { Title, Text } = Typography;

interface TeacherContact {
    teacher_id: string;
    teacher_name: string;
    phone: string | null;
    photo_url: string | null;
    unread_count: number;
    last_message: string | null;
    last_message_time: string | null;
}

interface Message {
    id: string; // Unique ID for each message
    sender: 'teacher' | 'student';
    content: string;
    timestamp: string;
    status: 'Pending' | 'Progress' | 'Completed';
    date: string;
}

const StudentChat: React.FC = () => {
    const { user } = useSelector((state: RootState) => state.auth);
    const [teachers, setTeachers] = useState<TeacherContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedTeacher, setSelectedTeacher] = useState<TeacherContact | null>(null);
    const [isChatModalVisible, setIsChatModalVisible] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isReceiverOnline, setIsReceiverOnline] = useState(false);


    useEffect(() => {
        const fetchRecentChats = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const { data, error: rpcError } = await supabase
                    .rpc('get_student_recent_chats', { p_student_id: user.id });

                if (rpcError) throw rpcError;
                
                setTeachers(data || []);

            } catch (err: any) {
                setError(err.message);
                console.error("Error fetching recent chats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentChats();
        
        // Also subscribe to changes in the chats table to refetch the list
        const subscription = supabase.channel('student-chat-list')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'chats', filter: `student_id=eq.${user?.id}` }, fetchRecentChats)
          .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };

    }, [user?.id]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    useEffect(() => {
        if (!isChatModalVisible || !selectedTeacher || !user?.id || !user?.register_no) {
            return;
        }

        const markAsRead = async () => {
            await supabase.rpc('mark_messages_as_read', {
                p_student_id: user.id,
                p_teacher_id: selectedTeacher.teacher_id,
                p_reader_identifier: user.register_no!
            });
        };

        const fetchMessages = async () => {
            const { data, error } = await supabase
                .from('chats')
                .select('messages, date')
                .eq('student_id', user.id)
                .eq('teacher_id', selectedTeacher.teacher_id)
                .order('date', { ascending: true });

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching messages:", error);
            } else if (data) {
                const allMessages: Message[] = [];
                data.forEach((chatDay: { messages: any[]; date: string; }) => {
                     const formattedMessages = chatDay.messages.map((msg: any) => {
                        const senderId = Object.keys(msg)[0];
                        const senderData = msg[senderId];
                        return {
                            id: senderData.id,
                            sender: senderId === user.register_no ? 'student' : 'teacher',
                            content: senderData.message,
                            timestamp: senderData.time,
                            status: senderData.status || 'Pending',
                            date: chatDay.date,
                        };
                    });
                    Array.prototype.push.apply(allMessages, formattedMessages as any);
                });
                setMessages(allMessages);
                markAsRead(); // Mark messages as read after fetching
            } else {
                 setMessages([]);
            }
        };

        fetchMessages();

        // Simulate receiver's online status
        const onlineInterval = setInterval(() => {
            setIsReceiverOnline(Math.random() > 0.3); // 70% chance of being "online"
        }, 5000);

        const channel = supabase.channel(`chat:student-${user.id}-teacher-${selectedTeacher.teacher_id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'chats',
                filter: `student_id=eq.${user.id}`
            }, payload => {
                fetchMessages();
            })
            .subscribe();

        return () => {
            clearInterval(onlineInterval);
            supabase.removeChannel(channel);
        };
    }, [isChatModalVisible, selectedTeacher, user?.id, user?.register_no]);

    const handleTeacherClick = (teacher: TeacherContact) => {
        setSelectedTeacher(teacher);
        setIsChatModalVisible(true);
    };

    const handleModalClose = () => {
        setIsChatModalVisible(false);
        setMessages([]);
        setSelectedTeacher(null);
    };
    
    const handleSendMessage = async () => {
        if (!newMessage.trim() || !user || !selectedTeacher) return;
        
        setSending(true);
        const today = dayjs().format('YYYY-MM-DD');
        const timestamp = dayjs().format('hh:mm A');
        const messageId = `msg_${Date.now()}`;
        const initialStatus = isReceiverOnline ? 'Progress' : 'Pending';

        const messagePayload = {
            [user.register_no!]: {
                id: messageId,
                time: timestamp,
                message: newMessage,
                status: initialStatus
            }
        };

        setMessages(prev => [...prev, {
            id: messageId,
            sender: 'student',
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
                p_student_id: user.id,
                p_teacher_id: selectedTeacher.teacher_id,
                p_student_name: user.full_name,
                p_teacher_name: selectedTeacher.teacher_name,
                p_message: messagePayload
            });

            if (error) throw error;
            
        } catch (error: any) {
            console.error("Failed to send message:", error);
            setMessages(prev => prev.map(msg => 
                msg.id === messageId
                ? { ...msg, status: 'Failed' as any } // Temp status for UI
                : msg
            ));
        } finally {
            setSending(false);
        }
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
                <div key={msg.id || index} style={{ marginBottom: '12px', textAlign: msg.sender === 'student' ? 'right' : 'left' }}>
                    <div style={{ background: msg.sender === 'student' ? '#DCF8C6' : '#FFF', padding: '8px 12px', borderRadius: '8px', display: 'inline-block', maxWidth: '70%' }}>
                        <Text>{msg.content}</Text>
                        <br/>
                        <Text type="secondary" style={{fontSize: 10, float: 'right'}}>
                            {msg.timestamp}
                            {msg.sender === 'student' && renderTicks(msg.status)}
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
                <Title level={4}>Chat with Teachers</Title>
                <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                    Select a teacher from your recent chats to continue the conversation.
                </Text>

                <Spin spinning={loading}>
                    {error && <Alert message="Error" description={error} type="error" showIcon />}
                    
                    {!loading && !error && (
                        <List
                            itemLayout="horizontal"
                            dataSource={teachers}
                            renderItem={(teacher) => (
                                <List.Item onClick={() => handleTeacherClick(teacher)} style={{cursor: 'pointer', padding: 0}}>
                                    <Card hoverable style={{ width: '100%', borderRadius: '12px', marginBottom: 12 }}>
                                        <Row align="middle" gutter={16} wrap={false}>
                                            <Col>
                                                <Avatar size={48} src={teacher.photo_url} icon={<UserOutlined />} />
                                            </Col>
                                            <Col flex="auto" style={{ minWidth: 0 }}>
                                                <Row justify="space-between" align="top" wrap={false}>
                                                    <Col flex="auto" style={{ minWidth: 0 }}>
                                                        <div style={{ marginBottom: 4 }}>
                                                          <Text strong>{teacher.teacher_name}</Text>
                                                          <Text type="secondary" style={{ marginLeft: 8 }}>{teacher.phone || 'N/A'}</Text>
                                                        </div>
                                                        <Text type="secondary" ellipsis>
                                                            {teacher.last_message || 'No messages yet...'}
                                                        </Text>
                                                    </Col>
                                                     <Col style={{ textAlign: 'right' }}>
                                                        <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                                          {teacher.last_message_time}
                                                        </Text>
                                                        {teacher.unread_count > 0 && (
                                                            <Badge count={teacher.unread_count} style={{ marginTop: 4 }} />
                                                        )}
                                                    </Col>
                                                </Row>
                                            </Col>
                                        </Row>
                                    </Card>
                                </List.Item>
                            )}
                            locale={{
                                emptyText: <Empty description="You have no active chats. Your conversations with teachers will appear here." />
                            }}
                        />
                    )}
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
                                    <Avatar size="large" src={selectedTeacher?.photo_url} icon={<UserOutlined />} />
                                </Col>
                                <Col>
                                    <Text strong>{selectedTeacher?.teacher_name}</Text>
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

export default StudentChat;
