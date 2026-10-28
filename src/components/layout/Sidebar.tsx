import { Layout, Menu, Tag, Typography, Button, Grid, Space, Avatar, Badge, Tooltip } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
  FormOutlined,
  CarOutlined,
  BookOutlined,
  AccountBookOutlined,
  SafetyCertificateOutlined,
  UserAddOutlined,
  EnvironmentOutlined,
  ApartmentOutlined,
  SolutionOutlined,
  IdcardOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  NotificationOutlined,
  FileTextOutlined,
  HistoryOutlined,
  PictureOutlined,
  MailOutlined,
  SoundOutlined,
  LineChartOutlined,
  WechatOutlined,
  DollarOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  FileSearchOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import { logout } from '../../store/features/auth/authSlice';
import { setUnreadCount } from '../../store/features/chat/chatSlice';
import { supabase } from '../../service/supabaseClient';
import dayjs from 'dayjs';
import { useEffect, useState, useCallback } from 'react';

const { Sider } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;


const Sidebar = ({ collapsed, setCollapsed }: { collapsed: boolean; setCollapsed: (collapsed: boolean) => void }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentPage } = useSelector((state: RootState) => state.navigation);
  const userRole = user?.role;
  const { events } = useSelector((state: RootState) => state.events);
  const { circulars } = useSelector((state: RootState) => state.circulars);
  const { homework } = useSelector((state: RootState) => state.homework);
  const { reports: homeworkReports } = useSelector((state: RootState) => state.homeworkReport);
  const { unreadCount: unreadChatsCount = 0 } = useSelector((state: RootState) => state.chat);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [viewedCirculars, setViewedCirculars] = useState<Set<string>>(new Set());
  const [viewedEvents, setViewedEvents] = useState<Set<string>>(new Set());

  const updateViewedItems = () => {
    if (user?.id) {
      const viewedCircs = localStorage.getItem(`viewedCirculars_${user.id}`);
      if (viewedCircs) setViewedCirculars(new Set(JSON.parse(viewedCircs)));
      
      const viewedEvts = localStorage.getItem(`viewedEvents_${user.id}`);
      if (viewedEvts) setViewedEvents(new Set(JSON.parse(viewedEvts)));
    }
  };

  useEffect(() => {
    updateViewedItems();
    
    // Listen for storage changes from other tabs/components
    window.addEventListener('storage', updateViewedItems);
    
    return () => {
      window.removeEventListener('storage', updateViewedItems);
    };
  }, [user?.id]);

  // Fetch and subscribe to unread chat messages
  useEffect(() => {
    if (!user?.id || !user?.role) return;

    const fetchUnreadChats = async () => {
      try {
        let query = supabase.from('chats').select('messages');
        if (user.role === 'staff') {
          query = query.eq('teacher_id', user.id);
        } else if (user.role === 'student') {
          query = query.eq('student_id', user.id);
        } else {
          return;
        }

        const { data, error } = await query;
        if (error) {
          console.error('Error fetching unread chat count:', error);
          return;
        }

        let count = 0;
        const myIdentifier = user.role === 'staff' ? user.staff_code : user.register_no;
        if (data && myIdentifier) {
          data.forEach((row: any) => {
            if (Array.isArray(row.messages)) {
              row.messages.forEach((msg: any) => {
                const senderKey = Object.keys(msg)[0];
                if (senderKey !== myIdentifier && msg[senderKey]?.status !== 'Completed') {
                  count++;
                }
              });
            }
          });
        }
        dispatch(setUnreadCount(count));
      } catch (err) {
        console.error('Error in fetchUnreadChats:', err);
      }
    };

    fetchUnreadChats();

    const filter = user.role === 'staff' 
      ? `teacher_id=eq.${user.id}` 
      : user.role === 'student' 
        ? `student_id=eq.${user.id}` 
        : null;

    if (!filter) return;

    const channel = supabase
      .channel(`sidebar-chats-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chats', filter },
        () => {
          fetchUnreadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role, user?.staff_code, user?.register_no, dispatch]);



  const handleMenuClick: MenuProps['onClick'] = (e) => {
    dispatch(setCurrentPage(e.key as any));
    if (isMobile) {
      setCollapsed(true); // Close sidebar on mobile after clicking an item
    }
  };

  const getPanelTitle = (role: string | undefined) => {
    switch (role) {
      case 'student': return 'Student Panel';
      case 'staff': return 'Teacher Panel';
      case 'admin': return 'Admin Panel';
      case 'superadmin': return 'Superadmin Panel';
      case 'parent': return 'Parent Panel';
      case 'library_staff': return 'Library Panel';
      default: return 'Admin Panel';
    }
  };

  const panelTitle = getPanelTitle(userRole);
  
  const handleLogout = () => {
    dispatch(logout());
  };

  const getMenuItems = (): MenuProps['items'] => {
    const upcomingEvents = events.filter(e => e.status === 'Upcoming');
    const unreadEventsCount = upcomingEvents.filter(e => !viewedEvents.has(e.id)).length;
    const eventCount = unreadEventsCount > 0 ? <Badge count={unreadEventsCount} size="small" /> : null;

    // Unread circulars logic
    const relevantCirculars = circulars.filter(c => 
        c.audience.includes('All') || 
        (user?.role && c.audience.some(aud => aud.toLowerCase().includes(user.role!.toLowerCase())))
    );
    const unreadCircularsCount = relevantCirculars.filter(c => !viewedCirculars.has(c.id)).length;
    const circularCount = unreadCircularsCount > 0 ? <Badge count={unreadCircularsCount} size="small" /> : null;

    // Calculate unviewed homework count
    const unviewedHomeworkCount = homework.filter(h => {
        const hasViewed = homeworkReports.some(report => report.homework_id === h.id);
        const isForStudentClass = user?.admitted_class === h.class_name && user?.academic_year === h.academic_year;
        // The section is not available on the user object directly, so we show the badge for the class.
        // The homework page itself will do the final filtering by section.
        return !hasViewed && isForStudentClass;
    }).length;


    const roleSpecificItems: { [key: string]: MenuProps['items'] } = {
      student: [
        { key: 'studentdashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: 'studentmyteachers', icon: <TeamOutlined />, label: 'My Teachers' },
        { key: 'studentmytimetable', icon: <CalendarOutlined />, label: 'My Timetable' },
        { key: 'studentclassnotes', icon: <FileTextOutlined />, label: 'Class Notes' },
        { 
          key: 'studentHomework', 
          icon: <BookOutlined />, 
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Homework</span>
              {unviewedHomeworkCount > 0 && <Badge count={unviewedHomeworkCount} size="small" />}
            </div>
          ),
        },
        { key: 'studentHometest', icon: <FormOutlined />, label: 'Home Test' },
        { key: 'dailymcqtest', icon: <QuestionCircleOutlined />, label: 'Daily MCQ Test' },
        { key: 'mcqtesthistory', icon: <HistoryOutlined />, label: 'MCQ Mark History' },
        {
          key: 'events_and_notices',
          icon: <NotificationOutlined />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Events & Notices</span>
                {(unreadEventsCount > 0 || unreadCircularsCount > 0) && <Badge count={unreadEventsCount + unreadCircularsCount} size="small" />}
            </div>
          ),
          children: [
            { 
              key: 'studentEvents', 
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Events</span>
                  {eventCount}
                </div>
              )
            },
            { 
              key: 'studentCircular', 
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Circulars</span>
                  {circularCount}
                </div>
              )
            },
          ],
        },
        { 
          key: 'studentchat', 
          icon: (
            <Badge count={collapsed && unreadChatsCount > 0 ? unreadChatsCount : 0} size="small" offset={[2, -2]}>
              <WechatOutlined />
            </Badge>
          ), 
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Chat</span>
              {unreadChatsCount > 0 && <Badge count={unreadChatsCount} size="small" />}
            </div>
          ),
        },
      ],
      staff: [
        { key: 'staffdashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        {
          key: 'timetable',
          icon: <CalendarOutlined />,
          label: 'Timetable',
          children: [
            { key: 'myclasstimetable', label: 'My Class Timetable' },
            { key: 'personaltimetable', label: 'Handling Class Time Table' },
          ],
        },
        { key: 'myclasses', icon: <IdcardOutlined />, label: 'My Classes' },
        {
          key: 'students',
          icon: <TeamOutlined />,
          label: 'Students',
          children: [
            { key: 'mystudents', label: 'My Students' },
            { key: 'myclassstudents', label: 'My Class Students' },
            { key: 'studentattendance', label: 'Student Attendance' },
            { key: 'studentmcqreport', label: 'Student MCQ Report' },
          ],
        },
        {
          key: 'academics',
          icon: <BookOutlined />,
          label: 'Academics',
          children: [
            { key: 'classnotes', label: 'Class Notes' },
            { key: 'hometest', label: 'Home Test' },
            { key: 'hometestmanagement', label: 'Home Test Management'},
            { key: 'homework', label: 'Homework' },
            { key: 'homeworkhistory', label: 'Homework History' },
          ],
        },
         {
          key: 'exam',
          icon: <FormOutlined />,
          label: 'Exam Tools',
          children: [
            { key: 'questionbank', label: 'Question Bank' },
            { key: 'uploadonemark', label: 'Daily MCQ Upload' },
            { key: 'templates', label: 'Question Paper Templates' },
            { key: 'setunitmark', label: 'Set Unit Mark' },
            { key: 'examquestionpaper', label: 'Exam Question Paper' },
            { key: 'exammarkupload', label: 'Exam Mark Upload' },
          ],
        },
        { key: 'studenttransportallocate', icon: <CarOutlined />, label: 'Student Transport Allocate' },
        {
          key: 'events_and_notices',
          icon: (
            <Badge 
              count={collapsed && (unreadEventsCount + unreadCircularsCount + unreadChatsCount) > 0 ? (unreadEventsCount + unreadCircularsCount + unreadChatsCount) : 0} 
              size="small" 
              offset={[2, -2]}
            >
              <NotificationOutlined />
            </Badge>
          ),
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Events & Notices</span>
                {(unreadEventsCount > 0 || unreadCircularsCount > 0 || unreadChatsCount > 0) && (
                  <Badge count={unreadEventsCount + unreadCircularsCount + unreadChatsCount} size="small" />
                )}
            </div>
          ),
          children: [
            { 
              key: 'chat', 
              icon: <WechatOutlined />, 
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Chat</span>
                  {unreadChatsCount > 0 && <Badge count={unreadChatsCount} size="small" />}
                </div>
              )
            },
            { 
              key: 'teacherEvents', 
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Events</span>
                  {eventCount}
                </div>
              )
            },
            { 
              key: 'teacherCircular', 
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Circulars</span>
                  {circularCount}
                </div>
              )
            },
          ],
        },
      ],
      parent: [
        { key: 'parentdashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { 
          key: 'parentCircular', 
          icon: <SoundOutlined />, 
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Circulars</span>
                {circularCount}
            </div>
          )
        },
      ],
      superadmin: [
        { key: 'superadmindashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        { key: 'organizations', icon: <ApartmentOutlined />, label: 'Organizations' },
        { key: 'organizationsadmins', icon: <SolutionOutlined />, label: 'Organization Admins' },
      ],
      admin: [
        { key: 'admindashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
        {
          key: 'students',
          icon: <TeamOutlined />,
          label: 'Students',
          children: [
            { key: 'allstudents', label: 'All Students' },
            { key: 'studentdocument', label: 'Student Documents' },
            { key: 'applicationform', label: 'Application Form' },
            { key: 'studentpromotion', label: 'Student Promotion' },
          ],
        },
        {
            key: 'teachers',
            icon: <UserOutlined />,
            label: 'Teachers',
            children: [
              { key: 'allteachers', label: 'All Teachers' },
              { key: 'teacherdocument', label: 'Teacher Documents' },
              { key: 'teacherapplicationform', label: 'Application Form' },
              { key: 'staffbarcodes', label: 'Staff ID Barcodes' },
            ],
        },
        {
            key: 'employee',
            icon: <UserOutlined />,
            label: 'Employee',
            children: [
              { key: 'createdriver', label: 'Create Driver' },
            ],
        },
        {
          key: 'academics',
          icon: <ReadOutlined />,
          label: 'Academics',
          children: [
            { key: 'schooldetails', label: 'School Details'},
            { key: 'mainimages', label: 'Main Images'},
            { key: 'academiccalendar', label: 'Academic Calendar'},
            { key: 'subjectcreate', label: 'Class & Subject' },
            { key: 'classsection', label: 'Class Section' },
            { key: 'classsectionhistory', label: 'Class Section History' },
            { key: 'classteachermanagement', label: 'Class Teacher Mngt' },
            { key: 'classteachermappingview', label: 'Class & Teacher Report' },
            { key: 'classsectionview', label: 'Class Section Report' },
            { key: 'rollnocreate', label: 'Roll No. Create' },
            { key: 'rollnohistory', label: 'Roll No. History' },
          ],
        },
        {
          key: 'timetable',
          icon: <CalendarOutlined />,
          label: 'Timetable',
          children: [
            { key: 'subjecttimetable', label: 'Subject Timetable' },
            { key: 'timetablehistory', label: 'Timetable History' },
            { key: 'freeteachers', label: 'Free Teachers' },
          ]
        },
        {
          key: 'exams',
          icon: <FormOutlined />,
          label: 'Exams',
          children: [
            { key: 'createexamtitle', label: 'Create Exam Title' },
            { key: 'examtimetable', label: 'Create Exam Timetable' },
            { key: 'exams_list', label: 'Exam List' },
            { key: 'mcqtestreport', label: 'MCQ Test Report' },
          ],
        },
        {
          key: 'transport',
          icon: <CarOutlined />,
          label: 'Transport',
          children: [
             { key: 'buscreate', label: 'Bus Create' },
             { key: 'busfeessetup', label: 'Bus Fees Setup' },
             { key: 'bussdriverallocate', label: 'Bus & Driver Allocate' },
             { key: 'studenttransportstatement', label: 'Student Transport Statement' },
          ]
        },
        {
            key: 'attendance',
            icon: <CheckSquareOutlined />,
            label: 'Attendance',
            children: [
                { key: 'presentdayattendance', label: 'Student - Present Day' },
                { key: 'overallattendance', label: 'Student - Overall' },
                { key: 'createteacherattendance', label: 'Create Teacher Attendance' },
                { key: 'teacherattendance', label: 'Teacher Attendance Report' },
            ],
        },
        {
          key: 'events',
          icon: <NotificationOutlined />,
          label: 'Events & Notices',
          children: [
            { key: 'events_page', label: 'Events' },
            { key: 'circular', label: 'Circulars' },
          ],
        },
        { 
          key: 'library', 
          icon: <BookOutlined />, 
          label: 'Library',
          children: [
            { key: 'bookscreate', label: 'Books Create' },
            { key: 'librarystaffcreate', label: 'Library Staff' }
          ]
        },
        {
          key: 'fees',
          icon: <DollarOutlined />,
          label: 'Fees',
          children: [
            { key: 'schoolfees', label: 'School Fees' },
            { key: 'schoolfeesstudent', label: 'Student Fees' },
            { key: 'studentfeespay', label: 'Student Fees Pay' },
            { key: 'feespendinghistory', label: 'Fees Pending History' },
            { key: 'busfeespendinghistory', label: 'Bus Fees Pending' },
            { key: 'feecompletehistory', label: 'Fee Complete History' },
          ]
        },
        {
          key: 'salary',
          icon: <DollarOutlined />,
          label: 'Salary',
          children: [
            { key: 'staffsalarydetails', label: 'Staff Salary Details' },
            { key: 'staffsalaryhistory', label: 'Staff Salary History' },
            { key: 'pfsalaryhistory', label: 'PF Salary History' },
          ]
        },
         {
            key: 'security',
            icon: <SafetyCertificateOutlined />,
            label: 'Security',
            children: [
              { key: 'fingerprintset', label: 'Fingerprint Set' },
            ],
        },
        { 
            key: 'settings', 
            icon: <SettingOutlined />, 
            label: 'Settings',
            children: [
                { key: 'usercreation', icon: <UserAddOutlined />, label: 'User Creation' },
                { key: 'academiceventscalendar', icon: <CalendarOutlined />, label: 'Academic Events Calendar' },
                { key: 'setregulation', label: 'Set Regulation'},
                { key: 'setunitmark', label: 'Set Unit Mark' },
            ]
        },
        { key: 'expenses', icon: <AccountBookOutlined />, label: 'Expenses' },
        { key: 'formprivileges', icon: <SafetyCertificateOutlined />, label: 'Form Privileges' },
        { key: 'map', icon: <EnvironmentOutlined />, label: 'Map' },
        { key: 'gmail', icon: <MailOutlined />, label: 'Gmail' },
      ],
      library_staff: [
          { key: 'librarystaffdashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
          { key: 'bookscreate', icon: <BookOutlined />, label: 'Create Book' },
      ]
    };

    return roleSpecificItems[userRole || 'admin'] || [];
  };

  const getPanelBadge = (role: string | undefined) => {
    switch (role) {
      case 'staff':
        return {
          title: 'Teacher Panel',
          tag: 'FACULTY',
          icon: <ReadOutlined style={{ fontSize: '18px', color: '#ffffff' }} />,
          gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          tagBg: '#eff6ff',
          tagColor: '#2563eb',
        };
      case 'student':
        return {
          title: 'Student Portal',
          tag: 'STUDENT',
          icon: <BookOutlined style={{ fontSize: '18px', color: '#ffffff' }} />,
          gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          tagBg: '#ecfdf5',
          tagColor: '#059669',
        };
      case 'admin':
        return {
          title: 'Admin Console',
          tag: 'ADMIN',
          icon: <ApartmentOutlined style={{ fontSize: '18px', color: '#ffffff' }} />,
          gradient: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
          tagBg: '#eef2ff',
          tagColor: '#4f46e5',
        };
      case 'superadmin':
        return {
          title: 'Super Admin',
          tag: 'ROOT',
          icon: <SafetyCertificateOutlined style={{ fontSize: '18px', color: '#ffffff' }} />,
          gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          tagBg: '#f5f3ff',
          tagColor: '#7c3aed',
        };
      default:
        return {
          title: 'School Panel',
          tag: 'PORTAL',
          icon: <ReadOutlined style={{ fontSize: '18px', color: '#ffffff' }} />,
          gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          tagBg: '#eff6ff',
          tagColor: '#2563eb',
        };
    }
  };

  const panelBadge = getPanelBadge(userRole);

  const siderStyle: React.CSSProperties = {
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    transition: 'width 0.2s, transform 0.2s',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    borderRight: '1px solid #e2e8f0',
    boxShadow: '2px 0 10px rgba(15, 23, 42, 0.03)',
  };

  if (isMobile) {
    siderStyle.transform = collapsed ? 'translateX(-100%)' : 'translateX(0)';
    siderStyle.zIndex = 1001; // Ensure it's above the overlay
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={(value) => setCollapsed(value)}
      trigger={null}
      theme="light"
      width={250}
      collapsedWidth={isMobile ? 0 : 80}
      style={siderStyle}
    >
      <style>{`
        .modern-sidebar-menu .ant-menu-item,
        .modern-sidebar-menu .ant-menu-submenu-title {
          border-radius: 10px !important;
          margin: 3px 10px !important;
          width: calc(100% - 20px) !important;
          height: 42px !important;
          line-height: 42px !important;
          font-weight: 500 !important;
          font-size: 13.5px !important;
          color: #334155 !important;
          transition: all 0.2s ease !important;
        }

        .modern-sidebar-menu .ant-menu-item:hover,
        .modern-sidebar-menu .ant-menu-submenu-title:hover {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        .modern-sidebar-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
          color: #1d4ed8 !important;
          font-weight: 700 !important;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.08) !important;
        }

        .modern-sidebar-menu .ant-menu-item-selected .anticon {
          color: #2563eb !important;
        }

        .modern-sidebar-menu .ant-menu-submenu-selected > .ant-menu-submenu-title {
          color: #1d4ed8 !important;
          font-weight: 600 !important;
        }

        .modern-sidebar-menu::-webkit-scrollbar {
          width: 4px;
        }
        .modern-sidebar-menu::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .modern-sidebar-menu::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>

      {/* 1. BRAND / ROLE HEADER */}
      <div
        style={{
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0' : '0 18px',
          borderBottom: '1px solid #f1f5f9',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: panelBadge.gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            flexShrink: 0,
          }}
        >
          {panelBadge.icon}
        </div>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: '15px',
                color: '#0f172a',
                letterSpacing: '-0.3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {panelBadge.title}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: panelBadge.tagColor,
                letterSpacing: '0.8px',
              }}
            >
              {panelBadge.tag}
            </span>
          </div>
        )}
      </div>

      {/* 2. SCROLLABLE MENU (Header & Footer stay pinned) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '8px',
          paddingBottom: '8px',
        }}
      >
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={handleMenuClick}
          items={getMenuItems()}
          className="modern-sidebar-menu"
          style={{ borderRight: 0, background: 'transparent' }}
        />
      </div>

      {/* 3. PINNED BOTTOM USER PROFILE & LOGOUT */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          padding: collapsed ? '12px 8px' : '12px 14px',
          background: '#ffffff',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* User Card */}
        {collapsed ? (
          <Tooltip title={`${user?.name || 'User'} (${user?.email || ''})`} placement="right">
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Badge dot status="success" offset={[-2, 30]}>
                <Avatar
                  size={38}
                  src={user?.photo_url}
                  icon={<UserOutlined />}
                  style={{
                    border: '2px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                />
              </Badge>
            </div>
          </Tooltip>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: '#f8fafc',
              border: '1px solid #f1f5f9',
              borderRadius: '14px',
              padding: '8px 10px',
            }}
          >
            <Badge dot status="success" offset={[-2, 32]}>
              <Avatar
                size={40}
                src={user?.photo_url}
                icon={<UserOutlined />}
                style={{
                  border: '2px solid #ffffff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                  flexShrink: 0,
                }}
              />
            </Badge>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1, lineHeight: 1.25 }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.name || 'Staff User'}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user?.email || (user?.role === 'staff' ? 'Faculty Member' : 'Teacher')}
              </span>
            </div>
          </div>
        )}

        {/* Logout Button */}
        {collapsed ? (
          <Tooltip title="Logout" placement="right">
            <Button
              type="text"
              icon={<LogoutOutlined style={{ color: '#ef4444' }} />}
              onClick={handleLogout}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '10px',
                background: '#fff1f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          </Tooltip>
        ) : (
          <Button
            block
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{
              height: '38px',
              borderRadius: '10px',
              background: '#fff1f2',
              color: '#e11d48',
              border: '1px solid #ffe4e6',
              fontWeight: 600,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffe4e6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff1f2';
            }}
          >
            Logout
          </Button>
        )}
      </div>
    </Sider>
  );
};

export default Sidebar;