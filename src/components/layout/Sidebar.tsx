import { Layout, Menu, Tag, Typography, Button, Grid, Space, Avatar, Badge } from 'antd';
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
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

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
        { key: 'studentchat', icon: <WechatOutlined />, label: 'Chat' },
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
            { key: 'uploadonemark', label: 'Upload One Mark' },
            { key: 'templates', label: 'Question Paper Templates' },
            { key: 'setunitmark', label: 'Set Unit Mark' },
            { key: 'examquestionpaper', label: 'Exam Question Paper' },
            { key: 'exammarkupload', label: 'Exam Mark Upload' },
          ],
        },
        { key: 'studenttransportallocate', icon: <CarOutlined />, label: 'Student Transport Allocate' },
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
            { key: 'chat', icon: <WechatOutlined />, label: 'Chat' },
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

  const siderStyle: React.CSSProperties = {
    overflow: 'auto',
    height: '100vh',
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    transition: 'width 0.2s',
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
      <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0' }}>
        <Title level={4} style={{ margin: 0, fontWeight: 'bold' }}>
          {collapsed ? 'SMS' : panelTitle}
        </Title>
      </div>

      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[currentPage]}
        onClick={handleMenuClick}
        items={getMenuItems()}
        style={{ flex: 1, borderRight: 0 }}
      />
      
       {!collapsed && (
          <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0'}}>
              <Space align="center" style={{width: '100%'}}>
                  <Avatar src={user?.photo_url} icon={<UserOutlined />} />
                  <div style={{display: 'flex', flexDirection: 'column', lineHeight: 1.2}}>
                     <Text strong>{user?.name}</Text>
                     <Text type="secondary" style={{fontSize: '12px'}}>{user?.email}</Text>
                  </div>
              </Space>
          </div>
       )}

      <div style={{ padding: '16px', borderTop: '1px solid #f0f0f0' }}>
        <Button 
          block 
          icon={<LogoutOutlined />}
          onClick={handleLogout}
        >
          {!collapsed && 'Logout'}
        </Button>
      </div>
    </Sider>
  );
};

export default Sidebar;