import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    Card,
    Typography,
    Spin,
    Alert,
    List,
    Avatar,
    Empty,
    Row,
    Col,
    Button,
    Input,
    Tag,
    Badge,
    Grid,
    Tooltip,
    Modal,
    Divider,
    Segmented,
    Space,
} from 'antd';
import {
    UserOutlined,
    ArrowLeftOutlined,
    CloseOutlined,
    SendOutlined,
    CheckOutlined,
    SearchOutlined,
    WechatOutlined,
    TeamOutlined,
    PhoneOutlined,
    MailOutlined,
    ClockCircleOutlined,
    InfoCircleOutlined,
    PlusOutlined,
    MessageOutlined,
    BookOutlined,
    CheckCircleFilled,
    ThunderboltOutlined,
    CalendarOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { supabase } from '../../service/supabaseClient';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import { setUnreadCount } from '../../store/features/chat/chatSlice';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const { Title, Text, Paragraph } = Typography;

export interface TeacherContact {
    teacher_id: string;
    teacher_name: string;
    phone: string | null;
    photo_url: string | null;
    unread_count: number;
    last_message: string | null;
    last_message_time: string | null;
    last_message_date?: string | null;
    last_message_sender?: 'teacher' | 'student';
    staff_code?: string | null;
    department?: string | null;
    designation?: string | null;
    email?: string | null;
}

export interface AllFacultyMember {
    id: string;
    staff_code?: string;
    full_name: string;
    mobile_number?: string | null;
    photo_url?: string | null;
    designation?: string | null;
    department?: string | null;
    email?: string | null;
}

export interface Message {
    id: string;
    sender: 'teacher' | 'student';
    content: string;
    timestamp: string;
    status: 'Pending' | 'Progress' | 'Completed';
    date: string;
}

// Quick suggested prompt chips for students
const QUICK_PROMPTS = [
    'Homework Clarification',
    'Question on Today’s Class',
    'Exam Syllabus Query',
    'Project Guidance',
];

const StudentChat: React.FC = () => {
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    const dispatch: AppDispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);

    // Chat list state
    const [teachers, setTeachers] = useState<TeacherContact[]>([]);
    const [allFaculty, setAllFaculty] = useState<AllFacultyMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingFaculty, setLoadingFaculty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Active Chat & Messaging state
    const [selectedTeacher, setSelectedTeacher] = useState<TeacherContact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<any>(null);

    // Presence & Online Tracking state
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
    const isReceiverOnline = selectedTeacher ? onlineUserIds.has(selectedTeacher.teacher_id) : false;

    // Filters and Tab View state
    const [chatTab, setChatTab] = useState<'recent' | 'all'>('recent');
    const [searchQuery, setSearchQuery] = useState('');
    const [isTeacherInfoModalOpen, setIsTeacherInfoModalOpen] = useState(false);

    // 1. Presence channel for real-time online/offline tracking
    useEffect(() => {
        if (!user?.id) return;

        const orgKey = user.organization_key || 'global';
        const presenceChannel = supabase.channel(`school-presence-${orgKey}`, {
            config: { presence: { key: user.id } },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const onlineIds = new Set(Object.keys(state));
                setOnlineUserIds(onlineIds);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({
                        user_id: user.id,
                        user_name: user.full_name,
                        role: user.role,
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [user?.id, user?.organization_key, user?.full_name, user?.role]);

    // 2. Fetch Recent Chats from chats table & RPC (Extract real last message, time, and unread count)
    const fetchRecentChats = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        try {
            // A. Fetch all faculty members for this organization (provides full catalog of teacher profiles)
            let facultyList: AllFacultyMember[] = allFaculty;
            if (facultyList.length === 0 && user.organization_key) {
                const { data: facData } = await supabase
                    .from('teachers')
                    .select('id, staff_code, full_name, mobile_number, photo_url, designation, department, email')
                    .eq('organization_key', user.organization_key)
                    .order('full_name', { ascending: true });
                if (facData) {
                    facultyList = facData;
                    setAllFaculty(facData);
                }
            }

            // Create quick lookup maps for faculty
            const facultyById = new Map<string, AllFacultyMember>();
            const facultyByStaffCode = new Map<string, AllFacultyMember>();
            const facultyByName = new Map<string, AllFacultyMember>();

            facultyList.forEach((f) => {
                if (f.id) facultyById.set(f.id, f);
                if (f.staff_code) facultyByStaffCode.set(f.staff_code, f);
                if (f.full_name) facultyByName.set(f.full_name.toLowerCase().trim(), f);
            });

            // B. Fetch RPC data as base contact list (if available)
            let rpcTeachers: any[] = [];
            try {
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_student_recent_chats', {
                    p_student_id: user.id,
                });
                if (!rpcError && rpcData && Array.isArray(rpcData)) {
                    rpcTeachers = rpcData;
                }
            } catch (rpcErr) {
                console.warn('RPC get_student_recent_chats unavailable:', rpcErr);
            }

            // C. Fetch all chats rows for this student
            let chatRows: any[] = [];
            try {
                const { data, error: chatError } = await supabase
                    .from('chats')
                    .select('*')
                    .or(`student_id.eq.${user.id}${user.register_no ? `,student_id.eq.${user.register_no}` : ''}`)
                    .order('date', { ascending: true });

                if (!chatError && data) {
                    chatRows = data;
                } else {
                    const { data: fallbackData } = await supabase
                        .from('chats')
                        .select('*')
                        .eq('student_id', user.id);
                    if (fallbackData) chatRows = fallbackData;
                }
            } catch (fetchErr) {
                console.error('Error fetching chats rows:', fetchErr);
            }

            // D. Map stats per canonical teacher ID
            const statsMap = new Map<string, {
                canonicalId: string;
                teacherName: string;
                staffCode?: string;
                photoUrl?: string | null;
                phone?: string | null;
                department?: string | null;
                designation?: string | null;
                email?: string | null;
                unreadCount: number;
                lastMessage?: string;
                lastMessageTime?: string;
                lastMessageDate?: string;
                lastMessageSender?: 'teacher' | 'student';
            }>();

            let totalStudentUnread = 0;
            const myIdentifier = user.register_no || user.id;

            if (chatRows.length > 0) {
                chatRows.forEach((row: any) => {
                    const rawTeacherId = row.teacher_id;
                    const rawTeacherName = row.teacher_name;

                    // Resolve faculty profile
                    const matchedFaculty = 
                        (rawTeacherId ? (facultyById.get(rawTeacherId) || facultyByStaffCode.get(rawTeacherId)) : undefined) ||
                        (rawTeacherName ? facultyByName.get(rawTeacherName.toLowerCase().trim()) : undefined);

                    const canonicalId = matchedFaculty?.id || rawTeacherId || rawTeacherName || 'unknown_faculty';
                    const canonicalName = matchedFaculty?.full_name || rawTeacherName || 'Faculty';

                    if (!statsMap.has(canonicalId)) {
                        statsMap.set(canonicalId, {
                            canonicalId,
                            teacherName: canonicalName,
                            staffCode: matchedFaculty?.staff_code || (rawTeacherId !== canonicalId ? rawTeacherId : undefined),
                            photoUrl: matchedFaculty?.photo_url || null,
                            phone: matchedFaculty?.mobile_number || null,
                            department: matchedFaculty?.department || null,
                            designation: matchedFaculty?.designation || null,
                            email: matchedFaculty?.email || null,
                            unreadCount: 0,
                        });
                    }
                    const tStats = statsMap.get(canonicalId)!;

                    // Parse messages
                    let rawMessages = row.messages;
                    if (typeof rawMessages === 'string') {
                        try { rawMessages = JSON.parse(rawMessages); } catch (e) {}
                    }
                    if (Array.isArray(rawMessages)) {
                        rawMessages.forEach((rawMsg: any) => {
                            let msg = rawMsg;
                            if (typeof msg === 'string') {
                                try { msg = JSON.parse(msg); } catch (e) {}
                            }

                            let msgText = '';
                            let msgTime = '';
                            let msgStatus = 'Pending';
                            let isFromStudent = false;

                            if (typeof msg === 'string') {
                                msgText = msg;
                                isFromStudent = false;
                            } else if (msg && typeof msg === 'object') {
                                const keys = Object.keys(msg);
                                // Format 1: { [senderKey]: { message, time, status, id } }
                                if (keys.length === 1 && typeof msg[keys[0]] === 'object' && msg[keys[0]] !== null) {
                                    const senderKey = keys[0];
                                    const inner = msg[senderKey];
                                    isFromStudent = senderKey === myIdentifier || 
                                                    senderKey === user.id || 
                                                    senderKey === user.roll_no ||
                                                    senderKey.toLowerCase().includes('student') ||
                                                    senderKey.toLowerCase().includes('reg');
                                    msgText = inner.message || inner.content || inner.text || '';
                                    msgTime = inner.time || inner.timestamp || '';
                                    msgStatus = inner.status || 'Pending';
                                } else {
                                    // Format 2: Direct object { sender, sender_id, message, content, text, time, status }
                                    const senderId = String(msg.sender || msg.sender_id || msg.senderKey || msg.from || '');
                                    isFromStudent = senderId === myIdentifier || 
                                                    senderId === user.id || 
                                                    senderId === user.roll_no ||
                                                    msg.sender === 'student' || 
                                                    msg.role === 'student';
                                    msgText = msg.message || msg.content || msg.text || '';
                                    msgTime = msg.time || msg.timestamp || '';
                                    msgStatus = msg.status || 'Pending';
                                }
                            }

                            if (msgText || msgTime) {
                                if (!isFromStudent && msgStatus !== 'Completed') {
                                    tStats.unreadCount += 1;
                                    totalStudentUnread += 1;
                                }
                                tStats.lastMessage = msgText;
                                tStats.lastMessageTime = msgTime;
                                tStats.lastMessageDate = row.date;
                                tStats.lastMessageSender = isFromStudent ? 'student' : 'teacher';
                            }
                        });
                    }
                });
            }

            // E. Combine statsMap & RPC list
            const contactsMap = new Map<string, TeacherContact>();

            // 1. Add all teachers from statsMap
            statsMap.forEach((stats, cId) => {
                contactsMap.set(cId, {
                    teacher_id: cId,
                    teacher_name: stats.teacherName,
                    staff_code: stats.staffCode || null,
                    phone: stats.phone || null,
                    photo_url: stats.photoUrl || null,
                    unread_count: stats.unreadCount,
                    last_message: stats.lastMessage
                        ? (stats.lastMessageSender === 'student' ? `You: ${stats.lastMessage}` : stats.lastMessage)
                        : null,
                    last_message_time: stats.lastMessageTime || null,
                    last_message_date: stats.lastMessageDate || null,
                    last_message_sender: stats.lastMessageSender,
                    department: stats.department || null,
                    designation: stats.designation || null,
                    email: stats.email || null,
                });
            });

            // 2. Add or merge any teachers from RPC
            rpcTeachers.forEach((r: any) => {
                const rId = r.teacher_id || r.id || r.staff_code;
                const rName = r.teacher_name || r.full_name;

                const matchedFaculty = 
                    (rId ? (facultyById.get(rId) || facultyByStaffCode.get(rId)) : undefined) ||
                    (rName ? facultyByName.get(rName.toLowerCase().trim()) : undefined);

                const cId = matchedFaculty?.id || rId || rName;
                if (!cId) return;

                const existing = contactsMap.get(cId);
                if (existing) {
                    if (!existing.last_message && (r.last_message || r.message)) {
                        existing.last_message = r.last_message || r.message;
                    }
                    if (!existing.last_message_time && (r.last_message_time || r.time)) {
                        existing.last_message_time = r.last_message_time || r.time;
                    }
                    if (existing.unread_count === 0 && (r.unread_count || r.unreadCount)) {
                        existing.unread_count = r.unread_count || r.unreadCount || 0;
                    }
                    if (!existing.photo_url && (matchedFaculty?.photo_url || r.photo_url)) {
                        existing.photo_url = matchedFaculty?.photo_url || r.photo_url;
                    }
                } else {
                    contactsMap.set(cId, {
                        teacher_id: cId,
                        teacher_name: matchedFaculty?.full_name || rName || 'Faculty',
                        staff_code: matchedFaculty?.staff_code || (rId !== cId ? rId : null),
                        phone: matchedFaculty?.mobile_number || r.phone || null,
                        photo_url: matchedFaculty?.photo_url || r.photo_url || null,
                        unread_count: r.unread_count || r.unreadCount || 0,
                        last_message: r.last_message || r.message || null,
                        last_message_time: r.last_message_time || r.time || null,
                        department: matchedFaculty?.department || null,
                        designation: matchedFaculty?.designation || null,
                        email: matchedFaculty?.email || null,
                    });
                }
            });

            const mergedList = Array.from(contactsMap.values());

            // Recalculate accurate total unread across all contacts
            const calculatedTotalUnread = mergedList.reduce((acc, c) => acc + (c.unread_count || 0), 0);

            // Sort: contacts with unread messages first, then by last message recency
            mergedList.sort((a, b) => {
                if (b.unread_count !== a.unread_count) {
                    return b.unread_count - a.unread_count;
                }
                const timeA = a.last_message_time || '';
                const timeB = b.last_message_time || '';
                return timeB.localeCompare(timeA);
            });

            setTeachers(mergedList);

            // Synchronize Redux store unread count with sidebar
            dispatch(setUnreadCount(calculatedTotalUnread));
        } catch (err: any) {
            console.error('Error fetching recent chats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecentChats();

        // Subscribe to changes in the chats table to auto-refetch the list
        if (user?.id) {
            const subscription = supabase
                .channel('student-chat-list')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'chats' },
                    fetchRecentChats
                )
                .subscribe();

            return () => {
                supabase.removeChannel(subscription);
            };
        }
    }, [user?.id]);

    // 3. Fetch All Faculty Directory (to enable starting a new chat with any teacher)
    useEffect(() => {
        if (!user?.organization_key) return;

        const fetchFaculty = async () => {
            setLoadingFaculty(true);
            try {
                const { data, error: facultyError } = await supabase
                    .from('teachers')
                    .select('id, staff_code, full_name, mobile_number, photo_url, designation, department, email')
                    .eq('organization_key', user.organization_key)
                    .order('full_name', { ascending: true });

                if (facultyError) throw facultyError;
                setAllFaculty(data || []);
            } catch (err) {
                console.error('Error fetching faculty directory for chat:', err);
            } finally {
                setLoadingFaculty(false);
            }
        };

        fetchFaculty();
    }, [user?.organization_key]);

    // 4. Auto scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, sending]);

    // 5. Fetch Messages & Realtime Subscription for Selected Teacher
    useEffect(() => {
        if (!selectedTeacher || !user?.id) {
            return;
        }

        const markAsRead = async () => {
            try {
                await supabase.rpc('mark_messages_as_read', {
                    p_student_id: user.id,
                    p_teacher_id: selectedTeacher.teacher_id,
                    p_reader_identifier: user.register_no || user.id,
                });
            } catch (err) {
                console.warn('RPC mark_messages_as_read notice:', err);
            }

            // Direct DB update fallback to guarantee messages are marked Completed in chats table
            try {
                const { data: rows } = await supabase
                    .from('chats')
                    .select('*')
                    .or(`student_id.eq.${user.id}${user.register_no ? `,student_id.eq.${user.register_no}` : ''}`);

                if (rows && rows.length > 0) {
                    const teacherKeys = [
                        selectedTeacher.teacher_id,
                        (selectedTeacher as any).staff_code,
                        selectedTeacher.teacher_name,
                    ].filter(Boolean);

                    const targetRows = rows.filter((r: any) => {
                        return teacherKeys.includes(r.teacher_id) ||
                            (r.teacher_name && selectedTeacher.teacher_name && 
                             r.teacher_name.toLowerCase().trim() === selectedTeacher.teacher_name.toLowerCase().trim());
                    });

                    for (const r of targetRows) {
                        let msgs = r.messages;
                        if (typeof msgs === 'string') {
                            try { msgs = JSON.parse(msgs); } catch (e) {}
                        }
                        if (!Array.isArray(msgs)) continue;
                        let changed = false;
                        const myIdentifier = user.register_no || user.id;

                        const updated = msgs.map((m: any) => {
                            if (m && typeof m === 'object') {
                                const keys = Object.keys(m);
                                if (keys.length === 1 && typeof m[keys[0]] === 'object' && m[keys[0]] !== null) {
                                    const senderKey = keys[0];
                                    const isFromStudent = senderKey === myIdentifier || senderKey === user.id || senderKey === user.roll_no;
                                    if (!isFromStudent && m[senderKey]?.status !== 'Completed') {
                                        changed = true;
                                        return {
                                            [senderKey]: {
                                                ...m[senderKey],
                                                status: 'Completed',
                                            },
                                        };
                                    }
                                } else {
                                    const sender = String(m.sender || m.sender_id || m.senderKey || '');
                                    const isFromStudent = sender === myIdentifier || sender === user.id || m.sender === 'student';
                                    if (!isFromStudent && m.status !== 'Completed') {
                                        changed = true;
                                        return {
                                            ...m,
                                            status: 'Completed',
                                        };
                                    }
                                }
                            }
                            return m;
                        });

                        if (changed) {
                            await supabase.from('chats').update({ messages: updated }).eq('id', r.id);
                        }
                    }
                }
            } catch (directErr) {
                console.error('Error updating read status in chats:', directErr);
            }

            // Clear unread count locally for this teacher
            setTeachers((prev) =>
                prev.map((t) =>
                    t.teacher_id === selectedTeacher.teacher_id ? { ...t, unread_count: 0 } : t
                )
            );
        };

        const fetchMessages = async () => {
            try {
                const { data: rawChats, error: msgError } = await supabase
                    .from('chats')
                    .select('*')
                    .or(`student_id.eq.${user.id}${user.register_no ? `,student_id.eq.${user.register_no}` : ''}`)
                    .order('date', { ascending: true });

                if (msgError && msgError.code !== 'PGRST116') {
                    console.error('Error fetching messages:', msgError);
                } else if (rawChats) {
                    const teacherKeys = [
                        selectedTeacher.teacher_id,
                        (selectedTeacher as any).staff_code,
                        selectedTeacher.teacher_name,
                    ].filter(Boolean);

                    const relevantRows = rawChats.filter((r: any) => {
                        if (teacherKeys.includes(r.teacher_id)) return true;
                        if (r.teacher_name && selectedTeacher.teacher_name && 
                            r.teacher_name.toLowerCase().trim() === selectedTeacher.teacher_name.toLowerCase().trim()) {
                            return true;
                        }
                        return false;
                    });

                    const allMessages: Message[] = [];
                    const myIdentifier = user.register_no || user.id;

                    relevantRows.forEach((chatDay: any) => {
                        let msgs = chatDay.messages;
                        if (typeof msgs === 'string') {
                            try { msgs = JSON.parse(msgs); } catch (e) {}
                        }
                        if (Array.isArray(msgs)) {
                            msgs.forEach((rawMsg: any) => {
                                let msg = rawMsg;
                                if (typeof msg === 'string') {
                                    try { msg = JSON.parse(msg); } catch (e) {}
                                }

                                let msgId = `msg_${Math.random()}`;
                                let msgText = '';
                                let msgTime = '';
                                let msgStatus: Message['status'] = 'Pending';
                                let isFromStudent = false;

                                if (typeof msg === 'string') {
                                    msgText = msg;
                                } else if (msg && typeof msg === 'object') {
                                    const keys = Object.keys(msg);
                                    if (keys.length === 1 && typeof msg[keys[0]] === 'object' && msg[keys[0]] !== null) {
                                        const senderKey = keys[0];
                                        const inner = msg[senderKey];
                                        msgId = inner.id || msgId;
                                        isFromStudent = senderKey === myIdentifier || 
                                                        senderKey === user.id || 
                                                        senderKey === user.roll_no ||
                                                        senderKey.toLowerCase().includes('student') ||
                                                        senderKey.toLowerCase().includes('reg');
                                        msgText = inner.message || inner.content || inner.text || '';
                                        msgTime = inner.time || inner.timestamp || '';
                                        msgStatus = inner.status || 'Pending';
                                    } else {
                                        msgId = msg.id || msgId;
                                        const sender = String(msg.sender || msg.sender_id || msg.senderKey || msg.from || '');
                                        isFromStudent = sender === myIdentifier || 
                                                        sender === user.id || 
                                                        sender === user.roll_no ||
                                                        msg.sender === 'student' || 
                                                        msg.role === 'student';
                                        msgText = msg.message || msg.content || msg.text || '';
                                        msgTime = msg.time || msg.timestamp || '';
                                        msgStatus = msg.status || 'Pending';
                                    }
                                }

                                if (msgText || msgTime) {
                                    allMessages.push({
                                        id: msgId,
                                        sender: isFromStudent ? 'student' : 'teacher',
                                        content: msgText,
                                        timestamp: msgTime,
                                        status: msgStatus,
                                        date: chatDay.date,
                                    });
                                }
                            });
                        }
                    });

                    setMessages(allMessages);
                    markAsRead();
                } else {
                    setMessages([]);
                }
            } catch (err) {
                console.error('Error in message processing:', err);
            }
        };

        fetchMessages();

        const channel = supabase
            .channel(`chat:student-${user.id}-teacher-${selectedTeacher.teacher_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'chats',
                },
                () => {
                    fetchMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedTeacher, user?.id, user?.register_no]);

    // Handle Teacher Selection
    const handleSelectTeacher = (teacher: TeacherContact) => {
        setSelectedTeacher(teacher);
        setTimeout(() => chatInputRef.current?.focus(), 150);
    };

    // Handle Closing the Active Chat Conversation
    const handleCloseConversation = () => {
        setSelectedTeacher(null);
    };

    // Handle Exiting Chat Page to Dashboard
    const handleCloseChatPage = () => {
        dispatch(setCurrentPage('studentdashboard'));
    };

    // Handle Starting a New Conversation from All Faculty List
    const handleStartChatWithFaculty = (faculty: AllFacultyMember) => {
        const contact: TeacherContact = {
            teacher_id: faculty.id,
            teacher_name: faculty.full_name,
            phone: faculty.mobile_number || null,
            photo_url: faculty.photo_url || null,
            unread_count: 0,
            last_message: null,
            last_message_time: null,
            designation: faculty.designation || null,
            department: faculty.department || null,
            email: faculty.email || null,
        };
        setSelectedTeacher(contact);
        setChatTab('recent');
        setTimeout(() => chatInputRef.current?.focus(), 150);
    };

    // Handle Sending Message
    const handleSendMessage = async (textToSend?: string) => {
        const messageText = (textToSend || newMessage).trim();
        if (!messageText || !user || !selectedTeacher) return;

        setSending(true);
        const today = dayjs().format('YYYY-MM-DD');
        const timestamp = dayjs().format('hh:mm A');
        const messageId = `msg_${Date.now()}`;
        const initialStatus = isReceiverOnline ? 'Progress' : 'Pending';

        const messagePayload = {
            [user.register_no!]: {
                id: messageId,
                time: timestamp,
                message: messageText,
                status: initialStatus,
            },
        };

        setMessages((prev) => [
            ...prev,
            {
                id: messageId,
                sender: 'student',
                content: messageText,
                timestamp: timestamp,
                status: initialStatus,
                date: today,
            },
        ]);

        setNewMessage('');

        try {
            const { error: rpcError } = await supabase.rpc('append_to_chat', {
                p_organization_key: user.organization_key,
                p_date: today,
                p_student_id: user.id,
                p_teacher_id: selectedTeacher.teacher_id,
                p_student_name: user.full_name,
                p_teacher_name: selectedTeacher.teacher_name,
                p_message: messagePayload,
            });

            if (rpcError) throw rpcError;
            fetchRecentChats();
        } catch (err: any) {
            console.error('Failed to send message:', err);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId ? { ...msg, status: 'Pending' } : msg
                )
            );
        } finally {
            setSending(false);
        }
    };

    const formatDateSeparator = (dateStr: string) => {
        const date = dayjs(dateStr);
        if (date.isToday()) return 'Today';
        if (date.isYesterday()) return 'Yesterday';
        return date.format('dddd, MMMM D, YYYY');
    };

    const renderTicks = (status: Message['status']) => {
        if (status === 'Completed') {
            return (
                <span title="Read by Teacher">
                    <CheckOutlined style={{ color: '#38bdf8', fontSize: '11px' }} />
                    <CheckOutlined style={{ color: '#38bdf8', fontSize: '11px', marginLeft: -6 }} />
                </span>
            );
        }
        if (status === 'Progress' || isReceiverOnline) {
            return (
                <span title="Delivered">
                    <CheckOutlined style={{ color: '#cbd5e1', fontSize: '11px' }} />
                    <CheckOutlined style={{ color: '#cbd5e1', fontSize: '11px', marginLeft: -6 }} />
                </span>
            );
        }
        return <CheckOutlined style={{ color: '#94a3b8', fontSize: '11px' }} title="Sent" />;
    };

    // Filter contacts based on search query
    const filteredTeachers = useMemo(() => {
        return teachers.filter((t) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                t.teacher_name.toLowerCase().includes(q) ||
                (t.last_message && t.last_message.toLowerCase().includes(q))
            );
        });
    }, [teachers, searchQuery]);

    const filteredFaculty = useMemo(() => {
        return allFaculty.filter((f) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
                f.full_name.toLowerCase().includes(q) ||
                (f.department && f.department.toLowerCase().includes(q)) ||
                (f.designation && f.designation.toLowerCase().includes(q))
            );
        });
    }, [allFaculty, searchQuery]);

    const onlineTeachersCount = useMemo(() => {
        return teachers.filter((t) => onlineUserIds.has(t.teacher_id)).length;
    }, [teachers, onlineUserIds]);

    const totalUnreadCount = useMemo(() => {
        return teachers.reduce((acc, t) => acc + (t.unread_count || 0), 0);
    }, [teachers]);

    return (
        <div
            style={{
                padding: isMobile ? (selectedTeacher ? '0px' : '10px 8px') : '24px',
                maxWidth: '1440px',
                margin: '0 auto',
                boxSizing: 'border-box',
                width: '100%',
                overflowX: 'hidden',
            }}
        >
            {/* 1. HERO BANNER (Shown on Desktop, and on Mobile when no chat is open) */}
            {(!isMobile || !selectedTeacher) && (
                <div
                    style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%)',
                        borderRadius: isMobile ? '16px' : '22px',
                        padding: isMobile ? '16px 14px' : '24px 28px',
                        color: '#ffffff',
                        marginBottom: isMobile ? '14px' : '20px',
                        boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
                        position: 'relative',
                        overflow: 'hidden',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Glow decorative shapes */}
                    <div
                        style={{
                            position: 'absolute',
                            right: '-50px',
                            top: '-50px',
                            width: '220px',
                            height: '220px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            pointerEvents: 'none',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            right: '80px',
                            bottom: '-60px',
                            width: '160px',
                            height: '160px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.05)',
                            pointerEvents: 'none',
                        }}
                    />

                    <Row gutter={[20, 16]} align="middle" justify="space-between">
                        <Col xs={24} md={15}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                <span
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.18)',
                                        backdropFilter: 'blur(8px)',
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        letterSpacing: '0.4px',
                                        color: '#e0f2fe',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    <WechatOutlined /> Realtime Teacher Messenger
                                </span>
                                <span
                                    style={{
                                        background: onlineTeachersCount > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
                                        color: '#ffffff',
                                        padding: '3px 10px',
                                        borderRadius: '12px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                    }}
                                >
                                    <span
                                        style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: '#ffffff',
                                            display: 'inline-block',
                                        }}
                                    />
                                    {onlineTeachersCount} Faculty Online
                                </span>
                            </div>

                            <h1
                                style={{
                                    fontSize: isMobile ? '20px' : '26px',
                                    fontWeight: 800,
                                    margin: '0 0 6px 0',
                                    color: '#ffffff',
                                    letterSpacing: '-0.5px',
                                    lineHeight: 1.25,
                                }}
                            >
                                Teacher Chat & Academic Doubts 💬
                            </h1>

                            <p
                                style={{
                                    color: 'rgba(255, 255, 255, 0.92)',
                                    fontSize: isMobile ? '12px' : '13.5px',
                                    margin: 0,
                                    lineHeight: 1.45,
                                }}
                            >
                                Ask homework questions, clarify textbook doubts, and receive guidance directly from your subject teachers.
                            </p>
                        </Col>

                        {/* Quick Stats Pill & Close Chat Button */}
                        <Col xs={24} md={9}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.14)',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: '14px',
                                        padding: '10px 14px',
                                        border: '1px solid rgba(255, 255, 255, 0.22)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <div>
                                        <span style={{ fontSize: '10.5px', color: '#cbd5e1', display: 'block' }}>Student Profile:</span>
                                        <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#ffffff' }}>
                                            {user?.full_name || 'Student'} ({user?.register_no || '--'})
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '10.5px', color: '#cbd5e1', display: 'block' }}>Unread Chats:</span>
                                        <Badge count={totalUnreadCount} overflowCount={99}>
                                            <Tag color={totalUnreadCount > 0 ? 'warning' : 'success'} style={{ margin: 0, fontWeight: 700, borderRadius: '6px' }}>
                                                {totalUnreadCount > 0 ? `${totalUnreadCount} New` : 'All Caught Up'}
                                            </Tag>
                                        </Badge>
                                    </div>
                                </div>

                                {/* Close Chat / Exit to Dashboard Button */}
                                <Button
                                    icon={<ArrowLeftOutlined />}
                                    onClick={handleCloseChatPage}
                                    style={{
                                        borderRadius: '10px',
                                        fontWeight: 700,
                                        background: 'rgba(255, 255, 255, 0.18)',
                                        borderColor: 'rgba(255, 255, 255, 0.35)',
                                        color: '#ffffff',
                                        height: '36px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    Close Chat & Back to Dashboard
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </div>
            )}

            {/* 2. MAIN CHAT WORKSPACE (SPLIT VIEW ON DESKTOP, SWITCH VIEW ON MOBILE) */}
            <Card
                style={{
                    borderRadius: isMobile ? (selectedTeacher ? '0px' : '16px') : '20px',
                    border: isMobile && selectedTeacher ? 'none' : '1px solid #e2e8f0',
                    boxShadow: isMobile && selectedTeacher ? 'none' : '0 8px 30px rgba(15, 23, 42, 0.05)',
                    overflow: 'hidden',
                    background: '#ffffff',
                    width: '100%',
                    boxSizing: 'border-box',
                }}
                bodyStyle={{ padding: 0 }}
            >
                <div
                    style={{
                        display: 'flex',
                        height: isMobile
                            ? selectedTeacher
                                ? 'calc(100vh - 64px)'
                                : 'calc(100vh - 280px)'
                            : '720px',
                        minHeight: isMobile ? (selectedTeacher ? '420px' : '480px') : '520px',
                        position: 'relative',
                        width: '100%',
                        minWidth: 0,
                        overflow: 'hidden',
                    }}
                >
                    {/* LEFT COLUMN: CONTACTS LIST & DIRECTORY */}
                    <div
                        style={{
                            width: isMobile ? '100%' : '360px',
                            minWidth: isMobile ? '0' : '320px',
                            maxWidth: isMobile ? '100%' : '380px',
                            flexShrink: 0,
                            borderRight: isMobile ? 'none' : '1px solid #e2e8f0',
                            display: isMobile && selectedTeacher ? 'none' : 'flex',
                            flexDirection: 'column',
                            background: '#f8fafc',
                            height: '100%',
                            boxSizing: 'border-box',
                        }}
                    >
                        {/* Search & Tabs Top Header */}
                        <div
                            style={{
                                padding: '16px',
                                borderBottom: '1px solid #e2e8f0',
                                background: '#ffffff',
                            }}
                        >
                            <Input
                                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                                placeholder="Search faculty or messages..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                allowClear
                                style={{
                                    borderRadius: '10px',
                                    padding: '7px 12px',
                                    marginBottom: '12px',
                                    border: '1px solid #cbd5e1',
                                }}
                            />

                            <Segmented
                                block
                                value={chatTab}
                                onChange={(val) => setChatTab(val as 'recent' | 'all')}
                                options={[
                                    {
                                        label: `Recent Chats (${teachers.length})`,
                                        value: 'recent',
                                        icon: <MessageOutlined />,
                                    },
                                    {
                                        label: `All Faculty (${allFaculty.length})`,
                                        value: 'all',
                                        icon: <TeamOutlined />,
                                    },
                                ]}
                                style={{
                                    background: '#f1f5f9',
                                    borderRadius: '10px',
                                    padding: '3px',
                                    fontWeight: 600,
                                }}
                            />
                        </div>

                        {/* Contacts List Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
                            <Spin spinning={loading || loadingFaculty}>
                                {error && (
                                    <Alert
                                        message="Notice"
                                        description={error}
                                        type="error"
                                        showIcon
                                        style={{ marginBottom: '10px', borderRadius: '10px' }}
                                    />
                                )}

                                {chatTab === 'recent' ? (
                                    /* RECENT CHATS LIST */
                                    filteredTeachers.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {filteredTeachers.map((teacher) => {
                                                const isSelected = selectedTeacher?.teacher_id === teacher.teacher_id;
                                                const isOnline = onlineUserIds.has(teacher.teacher_id);

                                                return (
                                                    <div
                                                        key={teacher.teacher_id}
                                                        onClick={() => handleSelectTeacher(teacher)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '12px 14px',
                                                            borderRadius: '14px',
                                                            cursor: 'pointer',
                                                            background: isSelected
                                                                ? '#eff6ff'
                                                                : teacher.unread_count > 0
                                                                ? '#f0f9ff'
                                                                : '#ffffff',
                                                            border: isSelected
                                                                ? '1px solid #93c5fd'
                                                                : teacher.unread_count > 0
                                                                ? '1px solid #bfdbfe'
                                                                : '1px solid #f1f5f9',
                                                            borderLeft: isSelected
                                                                ? '4px solid #1d4ed8'
                                                                : teacher.unread_count > 0
                                                                ? '4px solid #2563eb'
                                                                : '4px solid transparent',
                                                            boxShadow: isSelected || teacher.unread_count > 0
                                                                ? '0 2px 8px rgba(37, 99, 235, 0.08)'
                                                                : 'none',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    >
                                                        <div style={{ position: 'relative' }}>
                                                            <Avatar
                                                                size={44}
                                                                src={teacher.photo_url}
                                                                icon={<UserOutlined />}
                                                                style={{
                                                                    background: '#2563eb',
                                                                    border: '2px solid #ffffff',
                                                                    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                                }}
                                                            />
                                                            <span
                                                                style={{
                                                                    position: 'absolute',
                                                                    bottom: 0,
                                                                    right: 0,
                                                                    width: '12px',
                                                                    height: '12px',
                                                                    borderRadius: '50%',
                                                                    background: isOnline ? '#10b981' : '#94a3b8',
                                                                    border: '2px solid #ffffff',
                                                                }}
                                                            />
                                                        </div>

                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                <span
                                                                    style={{
                                                                        fontWeight: teacher.unread_count > 0 ? 800 : 700,
                                                                        fontSize: '13.5px',
                                                                        color: isSelected ? '#1d4ed8' : '#0f172a',
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        maxWidth: '175px',
                                                                    }}
                                                                >
                                                                    {teacher.teacher_name}
                                                                </span>
                                                                {teacher.last_message_time && (
                                                                    <span
                                                                        style={{
                                                                            fontSize: '11px',
                                                                            color: teacher.unread_count > 0 ? '#2563eb' : '#94a3b8',
                                                                            fontWeight: teacher.unread_count > 0 ? 700 : 500,
                                                                            whiteSpace: 'nowrap',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    >
                                                                        {teacher.last_message_time}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                                <span
                                                                    style={{
                                                                        fontSize: '12px',
                                                                        color: teacher.unread_count > 0 ? '#0f172a' : '#64748b',
                                                                        fontWeight: teacher.unread_count > 0 ? 700 : 400,
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        flex: 1,
                                                                        minWidth: 0,
                                                                    }}
                                                                >
                                                                    {teacher.last_message || 'Start a conversation...'}
                                                                </span>
                                                                {teacher.unread_count > 0 && (
                                                                    <Badge
                                                                        count={teacher.unread_count}
                                                                        style={{
                                                                            backgroundColor: '#2563eb',
                                                                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)',
                                                                            fontSize: '11px',
                                                                            fontWeight: 700,
                                                                            borderRadius: '10px',
                                                                            flexShrink: 0,
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '36px 16px', textAlign: 'center' }}>
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    <div>
                                                        <span style={{ fontWeight: 600, color: '#334155', display: 'block' }}>
                                                            No active chats found
                                                        </span>
                                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                                            Switch to the "All Faculty" tab above to start a conversation with any teacher!
                                                        </Text>
                                                    </div>
                                                }
                                            >
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={<TeamOutlined />}
                                                    onClick={() => setChatTab('all')}
                                                    style={{ borderRadius: '8px', marginTop: '8px' }}
                                                >
                                                    Browse Faculty Directory
                                                </Button>
                                            </Empty>
                                        </div>
                                    )
                                ) : (
                                    /* ALL FACULTY DIRECTORY */
                                    filteredFaculty.length > 0 ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {filteredFaculty.map((faculty) => {
                                                const isOnline = onlineUserIds.has(faculty.id);

                                                return (
                                                    <div
                                                        key={faculty.id}
                                                        onClick={() => handleStartChatWithFaculty(faculty)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '12px',
                                                            padding: '12px 14px',
                                                            borderRadius: '14px',
                                                            cursor: 'pointer',
                                                            background: '#ffffff',
                                                            border: '1px solid #f1f5f9',
                                                            transition: 'all 0.2s ease',
                                                        }}
                                                    >
                                                        <div style={{ position: 'relative' }}>
                                                            <Avatar
                                                                size={42}
                                                                src={faculty.photo_url}
                                                                icon={<UserOutlined />}
                                                                style={{ background: '#4f46e5' }}
                                                            />
                                                            <span
                                                                style={{
                                                                    position: 'absolute',
                                                                    bottom: 0,
                                                                    right: 0,
                                                                    width: '10px',
                                                                    height: '10px',
                                                                    borderRadius: '50%',
                                                                    background: isOnline ? '#10b981' : '#94a3b8',
                                                                    border: '2px solid #ffffff',
                                                                }}
                                                            />
                                                        </div>

                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                                                                {faculty.full_name}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '6px' }}>
                                                                <span>{faculty.designation || faculty.department || 'Faculty'}</span>
                                                                {faculty.staff_code && <span>• {faculty.staff_code}</span>}
                                                            </div>
                                                        </div>

                                                        <Button
                                                            size="small"
                                                            type="text"
                                                            icon={<MessageOutlined style={{ color: '#2563eb' }} />}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Empty description="No faculty members found." />
                                    )
                                )}
                            </Spin>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: ACTIVE CONVERSATION MESSENGER */}
                    <div
                        style={{
                            flex: '1 1 0%',
                            width: isMobile ? '100%' : 'auto',
                            minWidth: 0,
                            maxWidth: '100%',
                            display: isMobile && !selectedTeacher ? 'none' : 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            background: '#f8fafc',
                            overflow: 'hidden',
                            boxSizing: 'border-box',
                        }}
                    >
                        {selectedTeacher ? (
                            <>
                                {/* Conversation Header */}
                                <div
                                    style={{
                                        padding: isMobile ? '10px 12px' : '12px 20px',
                                        background: '#ffffff',
                                        borderBottom: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                        width: '100%',
                                        minWidth: 0,
                                        boxSizing: 'border-box',
                                        gap: '8px',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '12px', minWidth: 0, flex: 1 }}>
                                        {/* Back Button */}
                                        <Tooltip title="Back to Faculty Directory">
                                            <Button
                                                type="text"
                                                shape="circle"
                                                icon={<ArrowLeftOutlined style={{ fontSize: isMobile ? '18px' : '16px', color: '#1e293b' }} />}
                                                onClick={handleCloseConversation}
                                                style={{ flexShrink: 0 }}
                                            />
                                        </Tooltip>

                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <Avatar
                                                size={isMobile ? 38 : 42}
                                                src={selectedTeacher.photo_url}
                                                icon={<UserOutlined />}
                                                style={{ background: '#2563eb' }}
                                            />
                                            <span
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0,
                                                    width: '10px',
                                                    height: '10px',
                                                    borderRadius: '50%',
                                                    background: isReceiverOnline ? '#10b981' : '#94a3b8',
                                                    border: '2px solid #ffffff',
                                                }}
                                            />
                                        </div>

                                        <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                            <div
                                                style={{
                                                    fontWeight: 800,
                                                    fontSize: isMobile ? '14px' : '15px',
                                                    color: '#0f172a',
                                                    lineHeight: 1.25,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {selectedTeacher.teacher_name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: isReceiverOnline ? '#059669' : '#64748b', fontWeight: 600 }}>
                                                {isReceiverOnline ? '● Online & Active' : 'Offline'}
                                            </div>
                                        </div>
                                    </div>

                                    <Space size={isMobile ? 6 : 8} style={{ flexShrink: 0 }}>
                                        <Button
                                            size="small"
                                            icon={<InfoCircleOutlined />}
                                            onClick={() => setIsTeacherInfoModalOpen(true)}
                                            style={{ borderRadius: '8px', fontWeight: 600, fontSize: isMobile ? '11px' : '12px' }}
                                        >
                                            {isMobile ? '' : 'Faculty Info'}
                                        </Button>

                                        {/* Close Conversation Button on Both Desktop and Mobile */}
                                        <Tooltip title="Close active chat">
                                            <Button
                                                size="small"
                                                danger
                                                icon={<CloseOutlined />}
                                                onClick={handleCloseConversation}
                                                style={{
                                                    borderRadius: '8px',
                                                    fontWeight: 700,
                                                    fontSize: isMobile ? '11px' : '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                }}
                                            >
                                                {isMobile ? 'Close' : 'Close Chat'}
                                            </Button>
                                        </Tooltip>
                                    </Space>
                                </div>

                                {/* Messages History Scrollable View */}
                                <div
                                    style={{
                                        flex: 1,
                                        overflowY: 'auto',
                                        overflowX: 'hidden',
                                        padding: isMobile ? '12px' : '20px 24px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px',
                                        background: '#f8fafc',
                                        width: '100%',
                                        minWidth: 0,
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    {messages.length > 0 ? (
                                        (() => {
                                            const items: JSX.Element[] = [];
                                            let lastDate: string | null = null;

                                            messages.forEach((msg, idx) => {
                                                if (msg.date !== lastDate) {
                                                    items.push(
                                                        <div key={`date-${msg.date}-${idx}`} style={{ textAlign: 'center', margin: '12px 0 4px 0' }}>
                                                            <span
                                                                style={{
                                                                    background: '#e2e8f0',
                                                                    color: '#475569',
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    padding: '3px 12px',
                                                                    borderRadius: '12px',
                                                                }}
                                                            >
                                                                {formatDateSeparator(msg.date)}
                                                            </span>
                                                        </div>
                                                    );
                                                    lastDate = msg.date;
                                                }

                                                const isStudent = msg.sender === 'student';

                                                items.push(
                                                    <div
                                                        key={msg.id || idx}
                                                        style={{
                                                            display: 'flex',
                                                            justifyContent: isStudent ? 'flex-end' : 'flex-start',
                                                            marginBottom: '4px',
                                                            width: '100%',
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                maxWidth: isMobile ? '86%' : '65%',
                                                                background: isStudent
                                                                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                                                                    : '#ffffff',
                                                                color: isStudent ? '#ffffff' : '#0f172a',
                                                                padding: isMobile ? '8px 12px' : '10px 14px',
                                                                borderRadius: isStudent
                                                                    ? '16px 16px 4px 16px'
                                                                    : '16px 16px 16px 4px',
                                                                border: isStudent ? 'none' : '1px solid #e2e8f0',
                                                                boxShadow: isStudent
                                                                    ? '0 3px 10px rgba(37, 99, 235, 0.22)'
                                                                    : '0 2px 8px rgba(0, 0, 0, 0.03)',
                                                                wordBreak: 'break-word',
                                                                overflowWrap: 'anywhere',
                                                            }}
                                                        >
                                                            <div style={{ fontSize: isMobile ? '13px' : '13.5px', lineHeight: 1.45 }}>
                                                                {msg.content}
                                                            </div>

                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'flex-end',
                                                                    gap: '4px',
                                                                    marginTop: '4px',
                                                                    fontSize: '10px',
                                                                    color: isStudent ? 'rgba(255, 255, 255, 0.75)' : '#94a3b8',
                                                                }}
                                                            >
                                                                <span>{msg.timestamp}</span>
                                                                {isStudent && renderTicks(msg.status)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });

                                            return items;
                                        })()
                                    ) : (
                                        <div
                                            style={{
                                                margin: 'auto',
                                                textAlign: 'center',
                                                padding: isMobile ? '20px 12px' : '30px',
                                                width: '100%',
                                                maxWidth: '420px',
                                                boxSizing: 'border-box',
                                            }}
                                        >
                                            <Avatar
                                                size={isMobile ? 48 : 58}
                                                icon={<WechatOutlined />}
                                                style={{ background: '#e0f2fe', color: '#0284c7', marginBottom: '12px' }}
                                            />
                                            <h4 style={{ margin: '0 0 6px 0', fontSize: isMobile ? '15px' : '16px', color: '#0f172a', fontWeight: 800 }}>
                                                Start your conversation with {selectedTeacher.teacher_name}
                                            </h4>
                                            <p style={{ color: '#64748b', fontSize: isMobile ? '12px' : '13px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                                                Type your question or choose one of the quick doubt suggestions below to begin.
                                            </p>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Quick Prompt Suggestions Strip */}
                                <div
                                    style={{
                                        padding: isMobile ? '6px 10px' : '8px 16px',
                                        background: '#ffffff',
                                        borderTop: '1px solid #f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        overflowX: 'auto',
                                        WebkitOverflowScrolling: 'touch',
                                        width: '100%',
                                        minWidth: 0,
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <ThunderboltOutlined style={{ color: '#d97706' }} /> {isMobile ? '' : 'Suggestions:'}
                                    </span>
                                    {QUICK_PROMPTS.map((prompt) => (
                                        <Button
                                            key={prompt}
                                            size="small"
                                            onClick={() => setNewMessage(`Hello Teacher, I have a ${prompt.toLowerCase()} query: `)}
                                            style={{
                                                borderRadius: '16px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                background: '#f8fafc',
                                                borderColor: '#e2e8f0',
                                                flexShrink: 0,
                                                padding: '0 10px',
                                                height: '24px',
                                            }}
                                        >
                                            {prompt}
                                        </Button>
                                    ))}
                                </div>

                                {/* Message Input Box - Always Constrained and Responsive */}
                                <div
                                    style={{
                                        padding: isMobile ? '8px 10px' : '12px 16px',
                                        background: '#ffffff',
                                        borderTop: '1px solid #e2e8f0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        minWidth: 0,
                                        maxWidth: '100%',
                                        boxSizing: 'border-box',
                                    }}
                                >
                                    <Input.TextArea
                                        ref={chatInputRef}
                                        rows={1}
                                        autoSize={{ minRows: 1, maxRows: 3 }}
                                        placeholder={isMobile ? `Message ${selectedTeacher.teacher_name}...` : `Message ${selectedTeacher.teacher_name}... (Press Enter to Send)`}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onPressEnter={(e) => {
                                            if (!e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                        style={{
                                            flex: '1 1 auto',
                                            minWidth: 0,
                                            width: '100%',
                                            borderRadius: '12px',
                                            padding: isMobile ? '6px 10px' : '8px 14px',
                                            fontSize: isMobile ? '13px' : '13.5px',
                                            border: '1px solid #cbd5e1',
                                            resize: 'none',
                                        }}
                                    />

                                    <Button
                                        type="primary"
                                        shape="circle"
                                        size={isMobile ? 'middle' : 'large'}
                                        icon={<SendOutlined style={{ fontSize: isMobile ? '14px' : '16px' }} />}
                                        loading={sending}
                                        disabled={!newMessage.trim()}
                                        onClick={() => handleSendMessage()}
                                        style={{
                                            flexShrink: 0,
                                            width: isMobile ? '38px' : '42px',
                                            height: isMobile ? '38px' : '42px',
                                            minWidth: isMobile ? '38px' : '42px',
                                            background: newMessage.trim()
                                                ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                                                : '#cbd5e1',
                                            border: 'none',
                                            boxShadow: newMessage.trim()
                                                ? '0 4px 12px rgba(37, 99, 235, 0.3)'
                                                : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    />
                                </div>
                            </>
                        ) : (
                            /* Empty Selection State on Desktop */
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    padding: '32px',
                                    textAlign: 'center',
                                    background: '#f8fafc',
                                }}
                            >
                                <div
                                    style={{
                                        width: '76px',
                                        height: '76px',
                                        borderRadius: '24px',
                                        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                                        color: '#2563eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '34px',
                                        marginBottom: '18px',
                                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.12)',
                                    }}
                                >
                                    <WechatOutlined />
                                </div>

                                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                                    Select a Faculty Member to Chat
                                </h3>

                                <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '380px', margin: '0 0 20px 0' }}>
                                    Select an existing conversation from the list on the left, or browse the faculty directory to ask questions.
                                </p>

                                <Button
                                    type="primary"
                                    icon={<TeamOutlined />}
                                    onClick={() => setChatTab('all')}
                                    style={{
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        border: 'none',
                                        fontWeight: 700,
                                    }}
                                >
                                    Browse All Faculty
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* 3. HELPER ACTION FOOTER - FULLY RESPONSIVE (Hidden on mobile when chat is active) */}
            {(!isMobile || !selectedTeacher) && (
                <div
                    style={{
                        marginTop: '20px',
                        display: 'flex',
                        alignItems: isMobile ? 'stretch' : 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: '14px',
                        background: '#f8fafc',
                        padding: isMobile ? '14px' : '14px 18px',
                        borderRadius: '14px',
                        border: '1px solid #e2e8f0',
                        width: '100%',
                        boxSizing: 'border-box',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: isMobile ? '1 1 100%' : '1 1 280px', minWidth: 0 }}>
                        <BookOutlined style={{ color: '#2563eb', fontSize: '15px', marginTop: '2px', flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                            Messages are shared directly with school faculty. Please ensure academic and respectful communication at all times.
                        </span>
                    </div>

                    <div
                        style={{
                            display: 'flex',
                            gap: '8px',
                            width: isMobile ? '100%' : 'auto',
                            flexDirection: isMobile ? 'column' : 'row',
                            flexWrap: 'wrap',
                            flexShrink: 0,
                        }}
                    >
                        <Button
                            size={isMobile ? 'middle' : 'small'}
                            block={isMobile}
                            icon={<ArrowLeftOutlined />}
                            onClick={handleCloseChatPage}
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                            Back to Dashboard
                        </Button>
                        <Button
                            size={isMobile ? 'middle' : 'small'}
                            block={isMobile}
                            icon={<TeamOutlined />}
                            onClick={() => dispatch(setCurrentPage('studentmyteachers'))}
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                            Faculty Directory
                        </Button>
                        <Button
                            size={isMobile ? 'middle' : 'small'}
                            block={isMobile}
                            icon={<CalendarOutlined />}
                            onClick={() => dispatch(setCurrentPage('studentmytimetable'))}
                            style={{ borderRadius: '8px', fontWeight: 600 }}
                        >
                            My Timetable
                        </Button>
                        <Button
                            size={isMobile ? 'middle' : 'small'}
                            block={isMobile}
                            type="primary"
                            icon={<BookOutlined />}
                            onClick={() => dispatch(setCurrentPage('studentHomework'))}
                            style={{
                                borderRadius: '8px',
                                fontWeight: 600,
                                background: '#2563eb',
                            }}
                        >
                            Homework Tasks
                        </Button>
                    </div>
                </div>
            )}

            {/* 4. TEACHER INFO MODAL */}
            <Modal
                title={
                    selectedTeacher && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar size={36} src={selectedTeacher.photo_url} icon={<UserOutlined />} style={{ background: '#2563eb' }} />
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '15px' }}>{selectedTeacher.teacher_name}</div>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>Faculty Profile Details</div>
                            </div>
                        </div>
                    )
                }
                open={isTeacherInfoModalOpen}
                onCancel={() => setIsTeacherInfoModalOpen(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setIsTeacherInfoModalOpen(false)} style={{ borderRadius: '8px' }}>
                        Close
                    </Button>,
                ]}
                centered
                width={420}
            >
                {selectedTeacher && (
                    <div style={{ padding: '10px 0' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                                    <PhoneOutlined style={{ marginRight: '6px' }} /> Contact Phone:
                                </span>
                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                                    {selectedTeacher.phone || 'Available via School Portal'}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                                    <MailOutlined style={{ marginRight: '6px' }} /> Email Address:
                                </span>
                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                                    {selectedTeacher.email || 'School Institutional Email'}
                                </span>
                            </div>

                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: '#f8fafc',
                                    borderRadius: '12px',
                                }}
                            >
                                <span style={{ fontSize: '12.5px', color: '#64748b' }}>Active Status:</span>
                                <Tag color={isReceiverOnline ? 'success' : 'default'} style={{ margin: 0, fontWeight: 700, borderRadius: '6px' }}>
                                    {isReceiverOnline ? 'Online Now' : 'Currently Offline'}
                                </Tag>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default StudentChat;
