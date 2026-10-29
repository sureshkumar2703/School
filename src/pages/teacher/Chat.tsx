import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Modal,
  Select,
  Typography,
  Spin,
  Alert,
  List,
  Avatar,
  Row,
  Col,
  Button,
  Input,
  Tag,
  Badge,
  Tabs,
  Tooltip,
  Empty,
  Space,
  Grid,
  Card,
} from 'antd';
import {
  ArrowLeftOutlined,
  CloseOutlined,
  SendOutlined,
  CheckOutlined,
  SearchOutlined,
  MessageOutlined,
  PhoneOutlined,
  ReloadOutlined,
  CheckCircleFilled,
  BookOutlined,
  ClockCircleOutlined,
  WechatOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { RootState, AppDispatch } from '../../store/store';
import { fetchTeacherDashboardDataRequest } from '../../store/features/teacher-dashboard/teacherDashboardSlice';
import {
  fetchStudentsForClassRequest,
  setUnreadCount,
  type ChatStudent,
} from '../../store/features/chat/chatSlice';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const { Title, Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

interface Message {
  id: string;
  sender: 'teacher' | 'student';
  content: string;
  timestamp: string;
  status: 'Pending' | 'Progress' | 'Completed';
  date: string;
}

interface EnhancedContact extends ChatStudent {
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
  last_message_date?: string;
  last_message_sender?: 'teacher' | 'student';
}

const QUICK_REPLIES = [
  'Please submit your homework.',
  'Well done! Keep it up.',
  'Please review the class notes.',
  'Attendance is required tomorrow.',
  'Parent-teacher meeting scheduled.',
];

const Chat: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { mappings, loading: mappingsLoading } = useSelector(
    (state: RootState) => state.teacherDashboard
  );
  const { students, loading: studentsLoading, error: studentsError } = useSelector(
    (state: RootState) => state.chat
  );

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [activeTab, setActiveTab] = useState<'recent' | 'class'>('recent');
  const [selectedClassKey, setSelectedClassKey] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [recentChatStudents, setRecentChatStudents] = useState<EnhancedContact[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);

  // Online Presence state: stores set of online user IDs
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Photos cache map (student_id -> public_url)
  const [studentPhotos, setStudentPhotos] = useState<Record<string, string>>({});

  // Profile modal state
  const [profileModalStudent, setProfileModalStudent] = useState<EnhancedContact | null>(null);

  // Track initial load states to avoid showing spinners on background updates
  const hasLoadedRecentsRef = useRef(false);
  const currentLoadedStudentRef = useRef<string | null>(null);
  const isMarkingAsReadRef = useRef(false);

  // Presence channel: Join and track online status
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

  // Fetch teacher dashboard data (classes/mappings)
  useEffect(() => {
    if (user?.organization_key) {
      dispatch(fetchTeacherDashboardDataRequest(user.organization_key));
    }
  }, [dispatch, user?.organization_key]);

  // Fetch photos from student_documents for student IDs missing in cache
  const fetchStudentPhotos = useCallback(
    async (studentIds: string[]) => {
      const missingIds = studentIds.filter((id) => id && !studentPhotos[id]);
      if (missingIds.length === 0) return;

      try {
        const { data: docData } = await supabase
          .from('student_documents')
          .select('student_id, public_url, doc_type')
          .in('student_id', missingIds);

        if (docData && docData.length > 0) {
          const newMap: Record<string, string> = {};
          docData.forEach((doc) => {
            if (doc.student_id && doc.public_url) {
              if (doc.doc_type === 'Passport Size Photo' || !newMap[doc.student_id]) {
                newMap[doc.student_id] = doc.public_url;
              }
            }
          });

          setStudentPhotos((prev) => ({ ...prev, ...newMap }));
        }
      } catch (err) {
        console.error('Failed to fetch student photos:', err);
      }
    },
    [studentPhotos]
  );

  // Fetch recent chats & compute unread counts per student
  const fetchRecentChats = useCallback(
    async (silent = false) => {
      if (!user?.id) {
        setLoadingRecents(false);
        return;
      }

      if (!silent && !hasLoadedRecentsRef.current) {
        setLoadingRecents(true);
      }

      try {
        // 1. Fetch recent contacts from RPC
        const { data: rpcData, error: rpcErr } = await supabase.rpc(
          'get_teacher_recent_chats',
          { p_teacher_id: user.id }
        );
        if (rpcErr) throw rpcErr;

        // 2. Fetch chats rows to extract latest message & unread count per student
        const { data: chatRows, error: chatErr } = await supabase
          .from('chats')
          .select('student_id, student_name, date, messages')
          .eq('teacher_id', user.id)
          .order('date', { ascending: true });

        if (chatErr && chatErr.code !== 'PGRST116') {
          console.error('Error fetching chats data:', chatErr);
        }

        // Build stats map per student
        const statsMap = new Map<
          string,
          {
            unreadCount: number;
            lastMessage?: string;
            lastMessageTime?: string;
            lastMessageDate?: string;
            lastMessageSender?: 'teacher' | 'student';
            studentName?: string;
          }
        >();

        let totalTeacherUnread = 0;

        if (chatRows) {
          chatRows.forEach((row: any) => {
            const sId = row.student_id;
            if (!statsMap.has(sId)) {
              statsMap.set(sId, {
                unreadCount: 0,
                studentName: row.student_name,
              });
            }
            const sStats = statsMap.get(sId)!;

            if (Array.isArray(row.messages)) {
              row.messages.forEach((msg: any) => {
                const senderKey = Object.keys(msg)[0];
                const senderData = msg[senderKey];
                const isFromTeacher = senderKey === user.staff_code;

                if (!isFromTeacher && senderData?.status !== 'Completed') {
                  sStats.unreadCount += 1;
                  totalTeacherUnread += 1;
                }

                sStats.lastMessage = senderData?.message;
                sStats.lastMessageTime = senderData?.time;
                sStats.lastMessageDate = row.date;
                sStats.lastMessageSender = isFromTeacher ? 'teacher' : 'student';
              });
            }
          });
        }

        // Update Redux total unread count for sidebar synchronization
        dispatch(setUnreadCount(totalTeacherUnread));

        // Combine RPC contacts with stats
        const contacts: EnhancedContact[] = (rpcData || []).map((d: any) => {
          const stats = statsMap.get(d.student_id);
          return {
            id: d.student_id,
            full_name: d.student_name,
            phone: d.phone,
            unread_count: stats?.unreadCount || 0,
            last_message: stats?.lastMessage,
            last_message_time: stats?.lastMessageTime,
            last_message_date: stats?.lastMessageDate,
            last_message_sender: stats?.lastMessageSender,
          };
        });

        // Also include any students from chatRows not in rpcData
        statsMap.forEach((stats, sId) => {
          if (!contacts.some((c) => c.id === sId)) {
            contacts.push({
              id: sId,
              full_name: stats.studentName || 'Student',
              unread_count: stats.unreadCount,
              last_message: stats.lastMessage,
              last_message_time: stats.lastMessageTime,
              last_message_date: stats.lastMessageDate,
              last_message_sender: stats.lastMessageSender,
            });
          }
        });

        // Sort by unread first, then by last message recency
        contacts.sort((a, b) => {
          if ((b.unread_count || 0) !== (a.unread_count || 0)) {
            return (b.unread_count || 0) - (a.unread_count || 0);
          }
          return (b.last_message_date || '').localeCompare(a.last_message_date || '');
        });

        setRecentChatStudents(contacts);
        hasLoadedRecentsRef.current = true;

        // Fetch passport photos for these contacts
        const idsToFetch = contacts.map((c) => c.id);
        fetchStudentPhotos(idsToFetch);
      } catch (err) {
        console.error('Failed to fetch recent chats:', err);
      } finally {
        setLoadingRecents(false);
      }
    },
    [user?.id, user?.staff_code, dispatch, fetchStudentPhotos]
  );

  useEffect(() => {
    fetchRecentChats(false);
  }, [fetchRecentChats]);

  // Fetch students when a class is selected
  useEffect(() => {
    if (selectedClassKey && user?.organization_key) {
      const [className, sectionName, academicYear] = selectedClassKey.split('||');
      dispatch(
        fetchStudentsForClassRequest({
          organizationKey: user.organization_key,
          className,
          sectionName,
          academicYear,
        })
      );
    }
  }, [dispatch, selectedClassKey, user?.organization_key]);

  // Fetch photos for class students once loaded
  useEffect(() => {
    if (students && students.length > 0) {
      const ids = students.map((s) => s.id);
      fetchStudentPhotos(ids);
    }
  }, [students, fetchStudentPhotos]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation messages when selectedStudentId changes
  useEffect(() => {
    if (!selectedStudentId || !user?.id || !user?.staff_code) {
      setMessages([]);
      currentLoadedStudentRef.current = null;
      return;
    }

    const isDifferentStudent = currentLoadedStudentRef.current !== selectedStudentId;
    if (isDifferentStudent) {
      setFetchingMessages(true);
    }

    const markAsRead = async () => {
      if (isMarkingAsReadRef.current) return;
      isMarkingAsReadRef.current = true;

      try {
        await supabase.rpc('mark_messages_as_read', {
          p_student_id: selectedStudentId,
          p_teacher_id: user.id,
          p_reader_identifier: user.staff_code!,
        });

        // Locally clear this student's unread badge
        setRecentChatStudents((prev) =>
          prev.map((s) => (s.id === selectedStudentId ? { ...s, unread_count: 0 } : s))
        );
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      } finally {
        isMarkingAsReadRef.current = false;
      }
    };

    const fetchMessages = async (silent = false) => {
      if (!silent && isDifferentStudent) {
        setFetchingMessages(true);
      }

      try {
        const { data, error } = await supabase
          .from('chats')
          .select('messages, date')
          .eq('student_id', selectedStudentId)
          .eq('teacher_id', user.id)
          .order('date', { ascending: true });

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching messages:', error);
        } else if (data) {
          const allMessages: Message[] = [];
          let hasUnread = false;

          data.forEach((chatDay: { messages: any[]; date: string }) => {
            if (Array.isArray(chatDay.messages)) {
              chatDay.messages.forEach((msg: any) => {
                const senderKey = Object.keys(msg)[0];
                const senderData = msg[senderKey];
                const isStudent = senderKey !== user.staff_code;

                if (isStudent && senderData?.status !== 'Completed') {
                  hasUnread = true;
                }

                allMessages.push({
                  id: senderData.id || `msg_${Math.random()}`,
                  sender: isStudent ? 'student' : 'teacher',
                  content: senderData.message,
                  timestamp: senderData.time,
                  status: senderData.status || 'Pending',
                  date: chatDay.date,
                });
              });
            }
          });

          setMessages(allMessages);
          currentLoadedStudentRef.current = selectedStudentId;

          // Only call markAsRead if there are actual unread messages from student
          if (hasUnread) {
            markAsRead();
          }
        } else {
          setMessages([]);
          currentLoadedStudentRef.current = selectedStudentId;
        }
      } finally {
        setFetchingMessages(false);
      }
    };

    fetchMessages(false);

    // Realtime channel for this specific student-teacher chat (silent updates)
    const channel = supabase
      .channel(`chat:${user.id}-${selectedStudentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
          filter: `student_id=eq.${selectedStudentId}`,
        },
        () => {
          fetchMessages(true);
          fetchRecentChats(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedStudentId, user?.id, user?.staff_code, fetchRecentChats]);

  // Is currently selected student online?
  const isStudentOnline = useMemo(() => {
    return Boolean(selectedStudentId && onlineUserIds.has(selectedStudentId));
  }, [selectedStudentId, onlineUserIds]);

  // When opposite student is online, upgrade any 'Pending' messages to 'Progress' (delivered)
  useEffect(() => {
    if (!isStudentOnline || !selectedStudentId || !user?.id || !user?.staff_code) return;

    const hasPending = messages.some(
      (m) => m.sender === 'teacher' && m.status === 'Pending'
    );
    if (!hasPending) return;

    // Immediately update local messages state so double tick renders instantly
    setMessages((prev) =>
      prev.map((m) =>
        m.sender === 'teacher' && m.status === 'Pending'
          ? { ...m, status: 'Progress' }
          : m
      )
    );

    // Persist delivered status in database
    const syncDeliveredToDB = async () => {
      try {
        const { data: chatDays } = await supabase
          .from('chats')
          .select('id, messages')
          .eq('student_id', selectedStudentId)
          .eq('teacher_id', user.id);

        if (!chatDays) return;

        for (const day of chatDays) {
          if (!Array.isArray(day.messages)) continue;
          let changed = false;
          const updatedMessages = day.messages.map((m: any) => {
            const key = Object.keys(m)[0];
            if (key === user.staff_code && m[key]?.status === 'Pending') {
              changed = true;
              return {
                [key]: {
                  ...m[key],
                  status: 'Progress',
                },
              };
            }
            return m;
          });

          if (changed) {
            await supabase
              .from('chats')
              .update({ messages: updatedMessages })
              .eq('id', day.id);
          }
        }
      } catch (err) {
        console.error('Error syncing delivered messages:', err);
      }
    };

    syncDeliveredToDB();
  }, [isStudentOnline, selectedStudentId, user?.id, user?.staff_code, messages]);


  // My teacher assignments / classes options
  const myAssignments = useMemo(() => {
    if (!mappings || !user?.full_name) return [];
    return mappings.filter((m) => m.teacher_name === user.full_name);
  }, [mappings, user?.full_name]);

  const classOptions = useMemo(() => {
    const uniqueClasses = myAssignments.reduce((acc, m) => {
      const key = `${m.class_name}||${m.section_name}||${m.academic_year}`;
      if (!acc.has(key)) {
        acc.set(key, {
          key,
          label: `${m.class_name} - ${m.section_name} (${m.academic_year})`,
        });
      }
      return acc;
    }, new Map<string, { key: string; label: string }>());
    return Array.from(uniqueClasses.values()).sort((a, b) => b.label.localeCompare(a.label));
  }, [myAssignments]);

  // Current active student profile
  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return (
      recentChatStudents.find((s) => s.id === selectedStudentId) ||
      students.find((s) => s.id === selectedStudentId) ||
      null
    );
  }, [selectedStudentId, recentChatStudents, students]);

  // Filtered contact lists based on search
  const filteredRecentStudents = useMemo(() => {
    if (!searchQuery.trim()) return recentChatStudents;
    const q = searchQuery.toLowerCase();
    return recentChatStudents.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.last_message?.toLowerCase().includes(q)
    );
  }, [recentChatStudents, searchQuery]);

  const filteredClassStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // Total unread messages across recent chats
  const totalUnreadCount = useMemo(() => {
    return recentChatStudents.reduce((acc, s) => acc + (s.unread_count || 0), 0);
  }, [recentChatStudents]);

  const handleStudentSelect = (student: ChatStudent) => {
    setSelectedStudentId(student.id);
  };

  const handleCloseChat = () => {
    setSelectedStudentId(null);
  };

  const handleCloseChatPage = () => {
    dispatch(setCurrentPage('staffdashboard'));
  };

  const handleOpenProfileModal = (student: EnhancedContact | null) => {
    if (student) {
      setProfileModalStudent(student);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || newMessage).trim();
    if (!messageContent || !user || !selectedStudent) return;

    setSending(true);
    const today = dayjs().format('YYYY-MM-DD');
    const timestamp = dayjs().format('hh:mm A');
    const messageId = `msg_${Date.now()}`;

    // Opposite user online -> Double tick ('Progress')
    // Opposite user offline -> Single tick ('Pending')
    const initialStatus: Message['status'] = isStudentOnline ? 'Progress' : 'Pending';

    const messagePayload = {
      [user.staff_code!]: {
        id: messageId,
        time: timestamp,
        message: messageContent,
        status: initialStatus,
      },
    };

    // Optimistically update message list
    setMessages((prev) => [
      ...prev,
      {
        id: messageId,
        sender: 'teacher',
        content: messageContent,
        timestamp: timestamp,
        status: initialStatus,
        date: today,
      },
    ]);

    // Optimistically update recent chats preview
    setRecentChatStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id
          ? {
              ...s,
              last_message: messageContent,
              last_message_time: timestamp,
              last_message_date: today,
              last_message_sender: 'teacher',
            }
          : s
      )
    );

    setNewMessage('');

    try {
      const { error } = await supabase.rpc('append_to_chat', {
        p_organization_key: user.organization_key,
        p_date: today,
        p_student_id: selectedStudent.id,
        p_teacher_id: user.id,
        p_student_name: selectedStudent.full_name,
        p_teacher_name: user.full_name,
        p_message: messagePayload,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Failed to send message:', error);
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
    return date.format('MMMM D, YYYY');
  };

  /**
   * Format last message timestamp for recent chats list:
   * - Today: displays time (e.g. 03:07 PM)
   * - 24 hours / Yesterday: displays 'Yesterday'
   * - Older: displays formatted date (e.g. Oct 27, 2025)
   */
  const formatLastMessageDisplayTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return timeStr || '';
    const d = dayjs(dateStr);
    if (d.isToday()) {
      return timeStr || d.format('hh:mm A');
    }
    if (d.isYesterday()) {
      return 'Yesterday';
    }
    const isCurrentYear = d.year() === dayjs().year();
    return isCurrentYear ? d.format('MMM D') : d.format('DD/MM/YYYY');
  };

  /**
   * Ticks rendering:
   * - Pending (opposite user offline): Single tick
   * - Progress (opposite user online): Double tick (gray/white)
   * - Completed (opposite user read): Double tick colour change (vibrant blue/cyan)
   */
  const renderTicks = (status: Message['status']) => {
    if (status === 'Completed') {
      return (
        <span
          title="Read"
          style={{
            color: '#38bdf8',
            display: 'inline-flex',
            marginLeft: 4,
            alignItems: 'center',
          }}
        >
          <CheckOutlined style={{ fontSize: 11 }} />
          <CheckOutlined style={{ fontSize: 11, marginLeft: -6 }} />
        </span>
      );
    }
    // Delivered: If status is Progress OR if the opposite user is currently Online
    if (status === 'Progress' || isStudentOnline) {
      return (
        <span
          title="Delivered"
          style={{
            color: 'rgba(255, 255, 255, 0.75)',
            display: 'inline-flex',
            marginLeft: 4,
            alignItems: 'center',
          }}
        >
          <CheckOutlined style={{ fontSize: 11 }} />
          <CheckOutlined style={{ fontSize: 11, marginLeft: -6 }} />
        </span>
      );
    }
    // Pending (Single tick)
    return (
      <span
        title="Sent"
        style={{
          color: 'rgba(255, 255, 255, 0.75)',
          display: 'inline-flex',
          marginLeft: 4,
          alignItems: 'center',
        }}
      >
        <CheckOutlined style={{ fontSize: 11 }} />
      </span>
    );
  };

  // Color generator for contact avatars
  const getAvatarColor = (name: string) => {
    const colors = ['#1677ff', '#722ed1', '#13c2c2', '#52c41a', '#fa8c16', '#eb2f96'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div
      style={{
        padding: isMobile ? (selectedStudentId ? '0px' : '10px 8px') : '24px',
        maxWidth: '1440px',
        margin: '0 auto',
        boxSizing: 'border-box',
        width: '100%',
        overflowX: 'hidden',
      }}
    >
      {/* 1. HERO BANNER (Hidden on mobile when conversation is open) */}
      {(!isMobile || !selectedStudentId) && (
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
          {/* Decorative shapes */}
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
                  <WechatOutlined /> Realtime Student Messenger
                </span>
                <span
                  style={{
                    background: onlineUserIds.size > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.2)',
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
                  {onlineUserIds.size} Online Now
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
                Student Messages & Academic Doubts 💬
              </h1>

              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.92)',
                  fontSize: isMobile ? '12px' : '13.5px',
                  margin: 0,
                  lineHeight: 1.45,
                }}
              >
                Communicate directly with your class students, clarify doubts, and monitor academic progress.
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
                    <span style={{ fontSize: '10.5px', color: '#cbd5e1', display: 'block' }}>Teacher Profile:</span>
                    <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#ffffff' }}>
                      {user?.full_name || 'Teacher'} ({user?.staff_code || '--'})
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '10.5px', color: '#cbd5e1', display: 'block' }}>Unread Messages:</span>
                    <Badge count={totalUnreadCount} overflowCount={99}>
                      <Tag color={totalUnreadCount > 0 ? 'warning' : 'success'} style={{ margin: 0, fontWeight: 700, borderRadius: '6px' }}>
                        {totalUnreadCount > 0 ? `${totalUnreadCount} New` : 'All Caught Up'}
                      </Tag>
                    </Badge>
                  </div>
                </div>

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

      {/* 2. MAIN CHAT WORKSPACE */}
      <Card
        style={{
          borderRadius: isMobile ? (selectedStudentId ? '0px' : '16px') : '20px',
          border: isMobile && selectedStudentId ? 'none' : '1px solid #e2e8f0',
          boxShadow: isMobile && selectedStudentId ? 'none' : '0 8px 30px rgba(15, 23, 42, 0.05)',
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
              ? selectedStudentId
                ? 'calc(100vh - 64px)'
                : 'calc(100vh - 280px)'
              : '720px',
            minHeight: isMobile ? (selectedStudentId ? '420px' : '480px') : '520px',
            position: 'relative',
            width: '100%',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <Row style={{ height: '100%', width: '100%', margin: 0 }}>
        {/* ===================== LEFT PANE: CONTACTS & CHATS ===================== */}
        <Col
          xs={selectedStudentId ? 0 : 24}
          md={9}
          lg={8}
          xl={7}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid #f1f5f9',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
                  }}
                >
                  <WechatOutlined style={{ fontSize: 20 }} />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>
                    Messages
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Student Communication
                  </Text>
                </div>
              </div>

              <Space>
                {totalUnreadCount > 0 && (
                  <Badge
                    count={`${totalUnreadCount} New`}
                    style={{
                      backgroundColor: '#ef4444',
                      fontWeight: 600,
                      borderRadius: '10px',
                      padding: '0 8px',
                    }}
                  />
                )}
                <Tooltip title="Refresh chats">
                  <Button
                    type="text"
                    shape="circle"
                    icon={<ReloadOutlined style={{ color: '#64748b' }} />}
                    onClick={() => fetchRecentChats(false)}
                    loading={loadingRecents && recentChatStudents.length === 0}
                  />
                </Tooltip>
              </Space>
            </div>

            {/* Search Input */}
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search student or message..."
              allowClear
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            />
          </div>

          {/* Mode Switch Tabs */}
          <div style={{ padding: '0 16px', background: '#ffffff' }}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'recent' | 'class')}
              items={[
                {
                  key: 'recent',
                  label: (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Recent Chats
                      {totalUnreadCount > 0 && (
                        <Badge count={totalUnreadCount} size="small" style={{ backgroundColor: '#ef4444' }} />
                      )}
                    </span>
                  ),
                },
                {
                  key: 'class',
                  label: 'Class Students',
                },
              ]}
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Class Filter (Visible when Class Students tab is active) */}
          {activeTab === 'class' && (
            <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
              <Select
                showSearch
                placeholder="Select a class to view students"
                style={{ width: '100%' }}
                value={selectedClassKey}
                onChange={(key) => setSelectedClassKey(key)}
                loading={mappingsLoading}
                allowClear
                filterOption={(input, option) =>
                  (option?.children as unknown as string)
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              >
                {classOptions.map((opt) => (
                  <Option key={opt.key} value={opt.key}>
                    {opt.label}
                  </Option>
                ))}
              </Select>
            </div>
          )}

          {/* Student List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 10px',
            }}
          >
            {activeTab === 'recent' ? (
              <Spin spinning={loadingRecents && recentChatStudents.length === 0}>
                {filteredRecentStudents.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        searchQuery
                          ? 'No chats match your search.'
                          : 'No recent conversations yet. Switch to "Class Students" to start a chat.'
                      }
                    />
                    {!searchQuery && (
                      <Button
                        type="primary"
                        ghost
                        size="small"
                        style={{ marginTop: 12, borderRadius: 8 }}
                        onClick={() => setActiveTab('class')}
                      >
                        Browse Students by Class
                      </Button>
                    )}
                  </div>
                ) : (
                  <List
                    dataSource={filteredRecentStudents}
                    renderItem={(item) => {
                      const isSelected = selectedStudentId === item.id;
                      const hasUnread = (item.unread_count || 0) > 0;
                      const isItemOnline = onlineUserIds.has(item.id);
                      const displayTimestamp = formatLastMessageDisplayTime(
                        item.last_message_date,
                        item.last_message_time
                      );
                      const photoUrl = item.photo_url || studentPhotos[item.id];

                      return (
                        <div
                          key={item.id}
                          onClick={() => handleStudentSelect(item)}
                          style={{
                            padding: '12px 14px',
                            marginBottom: '6px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: isSelected
                              ? '#eff6ff'
                              : hasUnread
                              ? '#fef2f2'
                              : 'transparent',
                            borderLeft: isSelected
                              ? '4px solid #2563eb'
                              : hasUnread
                              ? '4px solid #ef4444'
                              : '4px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.backgroundColor = hasUnread
                                ? '#fef2f2'
                                : 'transparent';
                            }
                          }}
                        >
                          <Row align="middle" gutter={12} wrap={false}>
                            <Col flex="none">
                              <Tooltip title="View Profile">
                                <div
                                  style={{ position: 'relative', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenProfileModal(item);
                                  }}
                                >
                                  <Avatar
                                    size={44}
                                    src={photoUrl}
                                    style={{
                                      backgroundColor: getAvatarColor(item.full_name),
                                      fontWeight: 600,
                                      fontSize: 16,
                                    }}
                                  >
                                    {item.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                  </Avatar>
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      right: 0,
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      backgroundColor: isItemOnline ? '#10b981' : '#cbd5e1',
                                      border: '2px solid #ffffff',
                                    }}
                                    title={isItemOnline ? 'Online' : 'Offline'}
                                  />
                                </div>
                              </Tooltip>
                            </Col>

                            <Col flex="auto" style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'baseline',
                                  marginBottom: 3,
                                }}
                              >
                                <Text
                                  strong={hasUnread || isSelected}
                                  ellipsis
                                  style={{
                                    fontSize: 14,
                                    color: isSelected ? '#1d4ed8' : '#0f172a',
                                  }}
                                >
                                  {item.full_name}
                                </Text>

                                {displayTimestamp && (
                                  <Text
                                    type="secondary"
                                    style={{
                                      fontSize: 11,
                                      color: hasUnread ? '#ef4444' : '#94a3b8',
                                      fontWeight: hasUnread ? 600 : 400,
                                      flexShrink: 0,
                                      marginLeft: 8,
                                    }}
                                  >
                                    {displayTimestamp}
                                  </Text>
                                )}
                              </div>

                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Text
                                  type={hasUnread ? undefined : 'secondary'}
                                  ellipsis
                                  style={{
                                    fontSize: 12,
                                    color: hasUnread ? '#334155' : '#64748b',
                                    fontWeight: hasUnread ? 600 : 400,
                                    flex: 1,
                                    marginRight: 6,
                                  }}
                                >
                                  {item.last_message_sender === 'teacher' && (
                                    <span style={{ color: '#2563eb' }}>You: </span>
                                  )}
                                  {item.last_message || 'Start a conversation...'}
                                </Text>

                                {hasUnread && (
                                  <Badge
                                    count={item.unread_count}
                                    style={{
                                      backgroundColor: '#ef4444',
                                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                                    }}
                                  />
                                )}
                              </div>
                            </Col>
                          </Row>
                        </div>
                      );
                    }}
                  />
                )}
              </Spin>
            ) : (
              <Spin spinning={studentsLoading && students.length === 0}>
                {studentsError && (
                  <Alert
                    message="Error"
                    description={studentsError}
                    type="error"
                    showIcon
                    style={{ marginBottom: 12, borderRadius: 8 }}
                  />
                )}

                {!selectedClassKey ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <BookOutlined style={{ fontSize: 36, color: '#cbd5e1', marginBottom: 12 }} />
                    <Title level={5} style={{ margin: '0 0 4px', color: '#475569' }}>
                      Choose a Class
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Select a class from the dropdown above to view and message all its students.
                    </Text>
                  </div>
                ) : filteredClassStudents.length === 0 ? (
                  <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No students found in this class."
                    />
                  </div>
                ) : (
                  <List
                    dataSource={filteredClassStudents}
                    renderItem={(item) => {
                      const isSelected = selectedStudentId === item.id;
                      const isItemOnline = onlineUserIds.has(item.id);
                      const photoUrl = item.photo_url || studentPhotos[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleStudentSelect(item)}
                          style={{
                            padding: '12px 14px',
                            marginBottom: '6px',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            background: isSelected ? '#eff6ff' : 'transparent',
                            borderLeft: isSelected ? '4px solid #2563eb' : '4px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <Row align="middle" gutter={12} wrap={false}>
                            <Col flex="none">
                              <Tooltip title="View Profile">
                                <div
                                  style={{ position: 'relative', cursor: 'pointer' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenProfileModal(item);
                                  }}
                                >
                                  <Avatar
                                    size={42}
                                    src={photoUrl}
                                    style={{
                                      backgroundColor: getAvatarColor(item.full_name),
                                      fontWeight: 600,
                                    }}
                                  >
                                    {item.full_name?.charAt(0)?.toUpperCase() || 'S'}
                                  </Avatar>
                                  <span
                                    style={{
                                      position: 'absolute',
                                      bottom: 0,
                                      right: 0,
                                      width: 10,
                                      height: 10,
                                      borderRadius: '50%',
                                      backgroundColor: isItemOnline ? '#10b981' : '#cbd5e1',
                                      border: '2px solid #ffffff',
                                    }}
                                    title={isItemOnline ? 'Online' : 'Offline'}
                                  />
                                </div>
                              </Tooltip>
                            </Col>
                            <Col flex="auto" style={{ minWidth: 0 }}>
                              <Text strong ellipsis style={{ display: 'block', fontSize: 14 }}>
                                {item.full_name}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {item.phone ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <PhoneOutlined style={{ fontSize: 11 }} /> {item.phone}
                                  </span>
                                ) : (
                                  'Student'
                                )}
                              </Text>
                            </Col>
                            <Col flex="none">
                              <Button
                                size="small"
                                type="text"
                                icon={<MessageOutlined style={{ color: '#2563eb' }} />}
                              />
                            </Col>
                          </Row>
                        </div>
                      );
                    }}
                  />
                )}
              </Spin>
            )}
          </div>
        </Col>

        {/* ===================== RIGHT PANE: ACTIVE CHAT CONVERSATION ===================== */}
        <Col
          xs={selectedStudentId ? 24 : 0}
          md={15}
          lg={16}
          xl={17}
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            background: '#f8fafc',
          }}
        >
          {selectedStudent ? (
            <>
              {/* Conversation Header */}
              <div
                style={{
                  padding: '14px 20px',
                  background: '#ffffff',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minWidth: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleOpenProfileModal(selectedStudent)}
                  title="Click to view student profile"
                >
                  {isMobile && (
                    <Button
                      type="text"
                      shape="circle"
                      icon={<ArrowLeftOutlined style={{ fontSize: 18 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseChat();
                      }}
                    />
                  )}

                  <div style={{ position: 'relative' }}>
                    <Avatar
                      size={46}
                      src={selectedStudent.photo_url || studentPhotos[selectedStudent.id]}
                      style={{
                        backgroundColor: getAvatarColor(selectedStudent.full_name),
                        fontWeight: 600,
                        fontSize: 18,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    >
                      {selectedStudent.full_name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: isStudentOnline ? '#10b981' : '#94a3b8',
                        border: '2px solid #ffffff',
                      }}
                      title={isStudentOnline ? 'Online' : 'Offline'}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <Text
                      strong
                      ellipsis
                      style={{
                        fontSize: 16,
                        color: '#0f172a',
                        display: 'block',
                        lineHeight: 1.3,
                      }}
                    >
                      {selectedStudent.full_name}
                    </Text>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            backgroundColor: isStudentOnline ? '#10b981' : '#94a3b8',
                            boxShadow: isStudentOnline ? '0 0 0 2px rgba(16, 185, 129, 0.25)' : 'none',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 12,
                            color: isStudentOnline ? '#059669' : '#64748b',
                            fontWeight: 500,
                          }}
                        >
                          {isStudentOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>

                      {selectedStudent.phone && (
                        <Tag
                          bordered={false}
                          style={{
                            fontSize: 11,
                            padding: '1px 8px',
                            borderRadius: '10px',
                            background: '#f1f5f9',
                            color: '#475569',
                            margin: 0,
                          }}
                        >
                          <PhoneOutlined style={{ marginRight: 3 }} /> {selectedStudent.phone}
                        </Tag>
                      )}
                    </div>
                  </div>
                </div>

                <Space>
                  <Tooltip title="View Profile">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<UserOutlined style={{ color: '#64748b', fontSize: 16 }} />}
                      onClick={() => handleOpenProfileModal(selectedStudent)}
                    />
                  </Tooltip>

                  <Tooltip title="Refresh messages">
                    <Button
                      type="text"
                      shape="circle"
                      icon={<ReloadOutlined style={{ color: '#64748b' }} />}
                      onClick={() => {
                        const temp = selectedStudentId;
                        currentLoadedStudentRef.current = null;
                        setSelectedStudentId(null);
                        setTimeout(() => setSelectedStudentId(temp), 50);
                      }}
                    />
                  </Tooltip>

                  <Tooltip title="Close active chat">
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={handleCloseChat}
                      style={{
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: isMobile ? 11 : 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {isMobile ? 'Close' : 'Close Chat'}
                    </Button>
                  </Tooltip>
                </Space>
              </div>

              {/* Messages Body */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '20px 24px',
                  backgroundImage:
                    'radial-gradient(#e2e8f0 0.75px, transparent 0.75px), radial-gradient(#e2e8f0 0.75px, #f8fafc 0.75px)',
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px',
                }}
              >
                <Spin spinning={fetchingMessages && messages.length === 0}>
                  {messages.length === 0 && !fetchingMessages ? (
                    <div
                      style={{
                        padding: '60px 20px',
                        textAlign: 'center',
                        maxWidth: 420,
                        margin: '0 auto',
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          background: '#e0e7ff',
                          color: '#4f46e5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          fontSize: 28,
                        }}
                      >
                        <MessageOutlined />
                      </div>
                      <Title level={4} style={{ margin: '0 0 8px', color: '#1e293b' }}>
                        No Messages Yet
                      </Title>
                      <Text type="secondary" style={{ fontSize: 14 }}>
                        Say hello to <strong>{selectedStudent.full_name}</strong> or send important
                        homework and class updates.
                      </Text>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const elements: JSX.Element[] = [];
                        let lastDate: string | null = null;

                        messages.forEach((msg, index) => {
                          if (msg.date !== lastDate) {
                            elements.push(
                              <div
                                key={`date-${msg.date}`}
                                style={{ textAlign: 'center', margin: '20px 0' }}
                              >
                                <Tag
                                  style={{
                                    padding: '4px 14px',
                                    borderRadius: '16px',
                                    background: '#ffffff',
                                    border: '1px solid #e2e8f0',
                                    color: '#64748b',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                  }}
                                >
                                  {formatDateSeparator(msg.date)}
                                </Tag>
                              </div>
                            );
                            lastDate = msg.date;
                          }

                          const isTeacher = msg.sender === 'teacher';

                          elements.push(
                            <div
                              key={msg.id || index}
                              style={{
                                display: 'flex',
                                justifyContent: isTeacher ? 'flex-end' : 'flex-start',
                                marginBottom: 12,
                              }}
                            >
                              <div
                                style={{
                                  maxWidth: isMobile ? '82%' : '65%',
                                  padding: '10px 14px 8px',
                                  borderRadius: isTeacher
                                    ? '16px 16px 4px 16px'
                                    : '16px 16px 16px 4px',
                                  background: isTeacher
                                    ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                                    : '#ffffff',
                                  color: isTeacher ? '#ffffff' : '#0f172a',
                                  boxShadow: isTeacher
                                    ? '0 4px 12px rgba(37, 99, 235, 0.2)'
                                    : '0 2px 8px rgba(0, 0, 0, 0.05)',
                                  border: isTeacher ? 'none' : '1px solid #e2e8f0',
                                  position: 'relative',
                                  wordBreak: 'break-word',
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap',
                                  }}
                                >
                                  {msg.content}
                                </div>

                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    gap: 4,
                                    marginTop: 4,
                                    fontSize: 10,
                                    color: isTeacher ? 'rgba(255, 255, 255, 0.8)' : '#94a3b8',
                                  }}
                                >
                                  <span>{msg.timestamp}</span>
                                  {isTeacher && renderTicks(msg.status)}
                                </div>
                              </div>
                            </div>
                          );
                        });

                        return elements;
                      })()}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </Spin>
              </div>

              {/* Quick Reply Suggestions */}
              <div
                style={{
                  padding: '8px 16px',
                  background: '#ffffff',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflowX: 'auto',
                  whiteSpace: 'nowrap',
                }}
              >
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  Quick Reply:
                </Text>
                {QUICK_REPLIES.map((reply, idx) => (
                  <Tag
                    key={idx}
                    onClick={() => handleSendMessage(reply)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '12px',
                      padding: '3px 10px',
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      color: '#334155',
                      fontSize: 12,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#e0e7ff';
                      e.currentTarget.style.color = '#3730a3';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    {reply}
                  </Tag>
                ))}
              </div>

              {/* Input Area */}
              <div
                style={{
                  padding: isMobile ? '8px 10px' : '12px 16px',
                  background: '#ffffff',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  minWidth: 0,
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                <Input.TextArea
                  placeholder={isMobile ? `Message ${selectedStudent.full_name}...` : `Message ${selectedStudent.full_name}... (Press Enter to Send)`}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    width: '100%',
                    borderRadius: '12px',
                    padding: isMobile ? '6px 10px' : '8px 14px',
                    fontSize: isMobile ? 13 : 13.5,
                    border: '1px solid #cbd5e1',
                    resize: 'none',
                  }}
                />
                <Button
                  type="primary"
                  shape="circle"
                  size={isMobile ? 'middle' : 'large'}
                  icon={<SendOutlined style={{ fontSize: isMobile ? 14 : 16 }} />}
                  loading={sending}
                  onClick={() => handleSendMessage()}
                  disabled={!newMessage.trim() || sending}
                  style={{
                    flexShrink: 0,
                    width: isMobile ? 38 : 42,
                    height: isMobile ? 38 : 42,
                    minWidth: isMobile ? 38 : 42,
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
            /* Empty State when no student is selected */
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: '24px',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 42,
                  marginBottom: 24,
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.15)',
                }}
              >
                <WechatOutlined />
              </div>

              <Title level={3} style={{ margin: '0 0 10px', fontWeight: 700, color: '#0f172a' }}>
                Teacher Messenger
              </Title>
              <Text
                type="secondary"
                style={{
                  fontSize: 15,
                  maxWidth: 440,
                  lineHeight: 1.6,
                  marginBottom: 28,
                }}
              >
                Select a conversation from the left to read and send messages in real-time, or choose
                a class to start a new chat with any student.
              </Text>

              <Row gutter={[16, 16]} style={{ maxWidth: 520, width: '100%' }}>
                <Col span={8}>
                  <div
                    style={{
                      padding: '16px 12px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <CheckCircleFilled style={{ color: '#10b981', fontSize: 20, marginBottom: 8 }} />
                    <Text strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                      Real-time
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Live sync & receipts
                    </Text>
                  </div>
                </Col>

                <Col span={8}>
                  <div
                    style={{
                      padding: '16px 12px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <Badge
                      count={totalUnreadCount}
                      style={{
                        backgroundColor: '#ef4444',
                        marginBottom: 8,
                      }}
                    >
                      <ClockCircleOutlined style={{ color: '#f59e0b', fontSize: 20 }} />
                    </Badge>
                    <Text strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                      Unread Badges
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Never miss a query
                    </Text>
                  </div>
                </Col>

                <Col span={8}>
                  <div
                    style={{
                      padding: '16px 12px',
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <BookOutlined style={{ color: '#6366f1', fontSize: 20, marginBottom: 8 }} />
                    <Text strong style={{ display: 'block', fontSize: 13, color: '#1e293b' }}>
                      Class Filter
                    </Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Direct class reach
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>
          )}
        </Col>
      </Row>
        </div>
      </Card>

      {/* 3. HELPER ACTION FOOTER (Hidden on mobile when conversation is active) */}
      {(!isMobile || !selectedStudentId) && (
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
              Messages sent here are visible to students and archived for school academic audit.
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
              onClick={() => dispatch(setCurrentPage('myclasses'))}
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              My Classes
            </Button>
            <Button
              size={isMobile ? 'middle' : 'small'}
              block={isMobile}
              icon={<CalendarOutlined />}
              onClick={() => dispatch(setCurrentPage('myclasstimetable'))}
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              Class Timetable
            </Button>
            <Button
              size={isMobile ? 'middle' : 'small'}
              block={isMobile}
              type="primary"
              icon={<CheckSquareOutlined />}
              onClick={() => dispatch(setCurrentPage('studentattendance'))}
              style={{
                borderRadius: '8px',
                fontWeight: 600,
                background: '#2563eb',
              }}
            >
              Student Attendance
            </Button>
          </div>
        </div>
      )}

      {/* ===================== USER PROFILE MODAL ===================== */}
      <Modal
        open={Boolean(profileModalStudent)}
        onCancel={() => setProfileModalStudent(null)}
        footer={null}
        centered
        width={380}
        styles={{ body: { padding: '28px 24px 20px', textAlign: 'center' } }}
      >
        {profileModalStudent && (
          <div>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <Avatar
                size={96}
                src={profileModalStudent.photo_url || studentPhotos[profileModalStudent.id]}
                style={{
                  backgroundColor: getAvatarColor(profileModalStudent.full_name),
                  fontSize: 34,
                  fontWeight: 700,
                  border: '4px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                }}
              >
                {profileModalStudent.full_name?.charAt(0)?.toUpperCase()}
              </Avatar>
              <span
                style={{
                  position: 'absolute',
                  bottom: 4,
                  right: 4,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: onlineUserIds.has(profileModalStudent.id) ? '#10b981' : '#94a3b8',
                  border: '3px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
                title={onlineUserIds.has(profileModalStudent.id) ? 'Online' : 'Offline'}
              />
            </div>

            <Title level={4} style={{ margin: '0 0 6px', fontWeight: 700, color: '#0f172a' }}>
              {profileModalStudent.full_name}
            </Title>

            <div style={{ marginBottom: 18 }}>
              <Tag
                color={onlineUserIds.has(profileModalStudent.id) ? 'success' : 'default'}
                style={{
                  borderRadius: '12px',
                  padding: '2px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: onlineUserIds.has(profileModalStudent.id) ? '#52c41a' : '#8c8c8c',
                    marginRight: 6,
                  }}
                />
                {onlineUserIds.has(profileModalStudent.id) ? 'Online' : 'Offline'}
              </Tag>
            </div>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'left',
                border: '1px solid #e2e8f0',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Contact Phone
                </Text>
                <Text strong style={{ fontSize: 14 }}>
                  {profileModalStudent.phone ? (
                    <a
                      href={`tel:${profileModalStudent.phone}`}
                      style={{
                        color: '#2563eb',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <PhoneOutlined /> {profileModalStudent.phone}
                    </a>
                  ) : (
                    'Not available'
                  )}
                </Text>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Active Status
                </Text>
                <Text
                  strong
                  style={{
                    fontSize: 14,
                    color: onlineUserIds.has(profileModalStudent.id) ? '#059669' : '#64748b',
                  }}
                >
                  {onlineUserIds.has(profileModalStudent.id) ? 'Active now' : 'Currently offline'}
                </Text>
              </div>
            </div>

            <Space style={{ width: '100%', justifyContent: 'center' }}>
              <Button
                type="primary"
                icon={<MessageOutlined />}
                onClick={() => {
                  setSelectedStudentId(profileModalStudent.id);
                  setProfileModalStudent(null);
                }}
                style={{
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  paddingLeft: 20,
                  paddingRight: 20,
                }}
              >
                Message
              </Button>
              <Button onClick={() => setProfileModalStudent(null)} style={{ borderRadius: 8 }}>
                Close
              </Button>
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Chat;
