import { Layout, Avatar, Dropdown, Space, Button, Typography, type MenuProps, Grid } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined, BellOutlined, UserOutlined, LogoutOutlined, ArrowLeftOutlined, MenuOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/features/auth/authSlice';
import { RootState } from '../../store/store';
import Sidebar from './Sidebar';
import { setCurrentPage } from '../../store/features/navigation/navigationSlice';
import StudentDashboard from '../../pages/student/StudentDashboard';
import AdminDashboard from '../../pages/admin/AdminDashboard';
import SuperadminDashboard from '../../pages/superadmin/SuperadminDashboard';
import ParentDashboard from '../../pages/admin/ParentDashboard';
import LibraryDashboard from '../../pages/library_staff/LibraryDashboard';
import Placeholder from '../../pages/admin/Placeholder';
import Students from '../../pages/admin/Students';
import Admins from '../../pages/admin/Admins';
import StudentDocument from '../../pages/admin/StudentDocument';
import ApplicationForm from '../../pages/admin/ApplicationForm';
import OverallAttendance from '../../pages/admin/OverallAttendance';
import PresentDayAttendance from '../../pages/admin/PresentDayAttendance';
import StudentPromotion from '../../pages/admin/StudentPromotion';
import Organizations from '../../pages/superadmin/Organizations';
import OrganizationsAdmins from '../../pages/superadmin/OrganizationsAdmins';
import SubjectCreate from '../../pages/admin/SubjectCreate';
import ClassSection from '../../pages/admin/ClassSection';
import ClassSectionView from '../../pages/admin/ClassSectionView';
import ClassTeacherManagement from '../../pages/admin/ClassTeacherManagement';
import TeacherDashboard from '../../pages/teacher/TeacherDashboard';
import Teachers from '../../pages/admin/Teachers';
import TeacherDocument from '../../pages/admin/TeacherDocument';
import TeacherApplicationForm from '../../pages/admin/TeacherApplicationForm';
import ClassTeacherMappingView from '../../pages/admin/ClassTeacherMappingView';
import SubjectTimetable from '../../pages/admin/SubjectTimetable';
import TimetableHistory from '../../pages/admin/TimetableHistory';
import FreeTeachers from '../../pages/admin/FreeTeachers';
import ClassSectionHistory from '../../pages/admin/ClassSectionHistory';
import TeacherMyClasses from '../../pages/teacher/MyClasses';
import TeacherMyTimetable from '../../pages/teacher/MyClassTimetable';
import PersonalTimetable from '../../pages/teacher/PersonalTimetable';
import MyStudents from '../../pages/teacher/MyStudents';
import MyClassStudents from '../../pages/teacher/MyClassStudents';
import StudentAttendance from '../../pages/teacher/StudentAttendance';
import ClassNotes from '../../pages/teacher/ClassNotes';
import CreateTeacherAttendance from '../../pages/teacher/CreateTeacherAttendance';
import Events from '../../pages/admin/Events';
import Circular from '../../pages/admin/Circular';
import TeacherEvents from '../../pages/teacher/TeacherEvents';
import RollNoCreate from '../../pages/admin/rollNocreate';
import RollNoHistory from '../../pages/admin/rollNoHistory';
import AcademicCalendar from '../../pages/admin/AcademicCalendar';
import AcademicEventsCalendar from '../../pages/admin/AcademicEventsCalendar';
import StudentMyTeachers from '../../pages/student/MyTeachers';
import StudentMyTimetable from '../../pages/student/MyTimetable';
import StudentTransportAllocate from '../../pages/teacher/StudentTransportAllocate';
import SchoolDetailsPage from '../../pages/admin/schoolDetails';
import CreateDriver from '../../pages/admin/CreateDriver';
import CreateBus from '../../pages/admin/createBus';
import BusFeesSetup from '../../pages/admin/BusFeesSetup';
import StudentMyNotes from '../../pages/student/StudentMyNotes';
import BussDriverAllocate from '../../pages/admin/BussDriverAllocate';
import StudentTransportStatement from '../../pages/admin/student_transport_statement';
import HomeTest from '../../pages/teacher/HomeTest';
import UploadOneMark from '../../pages/teacher/UploadOneMark';
import QuestionBank from '../../pages/teacher/QuestionBank';
import ExamQuestionPaperTemplates from '../../pages/teacher/Templates';
import DailyMCQTest from '../../pages/student/DailyMCQTest';
import MCQtestmarkhistory from '../../pages/student/MCQtestmarkhistory';
import MCQTestReport from '../../pages/admin/MCQTestReport';
import MainImages from '../../pages/admin/mainimages';
import BooksCreate from '../../pages/admin/BooksCreate';
import LibraryStaffCreate from '../../pages/admin/LibraryStaffCreate';
import Gmail from '../../pages/admin/Notifications';
import ViewCirculars from '../../pages/common/ViewCirculars';
import TeacherChat from '../../pages/teacher/Chat';
import StudentChat from '../../pages/student/Chat';
import FingerprintSet from '../../pages/admin/FingerprintSet';
import SchoolFees from '../../pages/admin/SchoolFees';
import SchoolFeesStudent from '../../pages/admin/SchoolFeesStudent';
import MyClassTimetable from '../../pages/teacher/MyClassTimetable';
import MapView from '../../pages/admin/MapView';
import TeacherHomework from '../../pages/teacher/TeacherHomework';
import StudentHomework from '../../pages/student/StudentHomework';
import StudentHomeTest from '../../pages/student/StudentHomeTest';
import StaffSalaryDetails from '../../pages/admin/StaffSalaryDetails';
import StaffSalaryHistory from '../../pages/admin/StaffSalaryHistory';
import PfSalaryHistory from '../../pages/admin/PfSalaryHistory';
import StudentFeesPay from '../../pages/admin/StudentFeesPay';
import FeesPendingHistory from '../../pages/admin/FeesPendingHistory';
import BusFeesPendingHistory from '../../pages/admin/BusFeesPendingHistory';
import FeeCompleteHistory from '../../pages/admin/FeeCompleteHistory';
import SetRegulation from '../../pages/admin/SetRegulation';
import SetUnitMark from '../../pages/teacher/SetUnitMark';
import HomeTestManagement from '../../pages/teacher/HomeTestManagement';
import HomeworkHistory from '../../pages/teacher/HomeworkHistory';
import ExamQuestionPaper from '../../pages/teacher/ExamQuestionPaper';
import ExamTitle from '../../pages/admin/ExamTitle';
import ExamTimetable from '../../pages/admin/ExamTimetable';
import ExamList from '../../pages/admin/ExamList';
import Studentmcqreport from '../../pages/teacher/StudentMCQTestReport';
import ExamMarkUpload from '../../pages/teacher/ExamMarkUpload';
import StaffBarcodeList from '../../pages/admin/StaffBarcodeList';


const { Header, Content } = Layout;
const { Title } = Typography;
const { useBreakpoint } = Grid;

const pageComponents = {
  studentdashboard: <StudentDashboard />,
  staffdashboard: <TeacherDashboard />,
  admindashboard: <AdminDashboard />,
  superadmindashboard: <SuperadminDashboard />,
  parentdashboard: <ParentDashboard />,
  librarystaffdashboard: <LibraryDashboard />,
  profile: <Placeholder title="Profile" />,
  allstudents: <Students />,
  studentdocument: <StudentDocument />,
  applicationform: <ApplicationForm />,
  presentdayattendance: <PresentDayAttendance />,
  overallattendance: <OverallAttendance />,
  studentpromotion: <StudentPromotion />,
  alladmins: <Admins />,
  allteachers: <Teachers />,
  teacherdocument: <TeacherDocument />,
  teacherapplicationform: <TeacherApplicationForm />,
  staffbarcodes: <StaffBarcodeList />,
  myclasses: <TeacherMyClasses />,
  personaltimetable: <PersonalTimetable />,
  mystudents: <MyStudents />,
  myclasstimetable: <MyClassTimetable />,
  myclassstudents: <MyClassStudents />,
  studentattendance: <StudentAttendance />,
  classnotes: <ClassNotes />,
  hometest: <HomeTest />,
  hometestmanagement: <HomeTestManagement />,
  homework: <TeacherHomework />,
  studentHomework: <StudentHomework />,
  studentHometest: <StudentHomeTest />,
  studenttransportallocate: <StudentTransportAllocate />,
  academics: <Placeholder title="Academics" />,
  schooldetails: <SchoolDetailsPage />,
  academiccalendar: <AcademicCalendar />,
  academiceventscalendar: <AcademicEventsCalendar />,
  subjectcreate: <SubjectCreate />,
  classsection: <ClassSection />,
  classsectionhistory: <ClassSectionHistory />,
  classteachermanagement: <ClassTeacherManagement />,
  classsectionview: <ClassSectionView />,
  classteachermappingview: <ClassTeacherMappingView />,
  subjecttimetable: <SubjectTimetable />,
  timetablehistory: <TimetableHistory />,
  freeteachers: <FreeTeachers />,
  createteacherattendance: <CreateTeacherAttendance />,
  teacherattendance: <Placeholder title="Teacher Attendance Report (Biometric)" />,
  events_page: <Events />,
  teacherEvents: <TeacherEvents />,
  studentEvents: <TeacherEvents />,
  circular: <Circular />,
  studentCircular: <ViewCirculars />,
  teacherCircular: <ViewCirculars />,
  parentCircular: <ViewCirculars />,
  exams: <Placeholder title="Exams" />,
  mcqtestreport: <MCQTestReport />,
  transport: <Placeholder title="Transport" />,
  library: <Placeholder title="Library" />,
  bookscreate: <BooksCreate />,
  librarystaffcreate: <LibraryStaffCreate />,
  expenses: <Placeholder title="Expenses" />,
  schoolfees: <SchoolFees />,
  schoolfeesstudent: <SchoolFeesStudent />,
  studentfeespay: <StudentFeesPay />,
  feespendinghistory: <FeesPendingHistory />,
  busfeespendinghistory: <BusFeesPendingHistory />,
  feecompletehistory: <FeeCompleteHistory />,
  staffsalarydetails: <StaffSalaryDetails />,
  staffsalaryhistory: <StaffSalaryHistory />,
  pfsalaryhistory: <PfSalaryHistory />,
  formprivileges: <Placeholder title="Form Privileges" />,
  usercreation: <Admins />,
  map: <MapView />,
  gmail: <Gmail />,
  organizations: <Organizations />,
  organizationsadmins: <OrganizationsAdmins />,
  rollnocreate: <RollNoCreate />,
  rollnohistory: <RollNoHistory />,
  studentmyteachers: <StudentMyTeachers />,
  studentmytimetable: <StudentMyTimetable />,
  studentclassnotes: <StudentMyNotes />,
  dailymcqtest: <DailyMCQTest />,
  mcqtesthistory: <MCQtestmarkhistory />,
  createdriver: <CreateDriver />,
  buscreate: <CreateBus />,
  busfeessetup: <BusFeesSetup />,
  bussdriverallocate: <BussDriverAllocate />,
  studenttransportstatement: <StudentTransportStatement />,
  uploadonemark: <UploadOneMark />,
  questionbank: <QuestionBank />,
  templates: <ExamQuestionPaperTemplates />,
  mainimages: <MainImages />,
  exam: <Placeholder title="Exam Tools" />,
  chat: <TeacherChat />,
  studentchat: <StudentChat />,
  fingerprintset: <FingerprintSet />,
  setregulation: <SetRegulation />,
  setunitmark: <SetUnitMark />,
  settings: <Placeholder title="Settings" />,
  homeworkhistory: <HomeworkHistory />,
  examquestionpaper: <ExamQuestionPaper />,
  createexamtitle: <ExamTitle />,
  examtimetable: <ExamTimetable />,
  exams_list: <ExamList />,
  studentmcqreport: <Studentmcqreport />,
  exammarkupload: <ExamMarkUpload />,
};

const pageTitles: { [key: string]: string } = {
  studentdashboard: 'Student Dashboard',
  staffdashboard: 'Staff Dashboard',
  admindashboard: 'Admin Dashboard',
  parentdashboard: 'Parent Dashboard',
  superadmindashboard: 'Super Admin Dashboard',
  librarystaffdashboard: 'Library Dashboard',
  profile: 'Profile',
  allstudents: 'All Students',
  studentdocument: 'Student Documents',
  applicationform: 'Student Application Form',
  presentdayattendance: 'Student - Present Day Attendance',
  overallattendance: 'Student - Overall Attendance',
  studentpromotion: 'Student Promotion',
  alladmins: 'All Admins',
  allteachers: 'All Teachers',
  teacherdocument: 'Teacher Documents',
  teacherapplicationform: 'Teacher Application Form',
  staffbarcodes: 'Staff Barcode List',
  myclasses: 'My Classes',
  personaltimetable: 'Handling Class Time Table',
  mystudents: 'My Students',
  myclasstimetable: 'My Class Timetable',
  myclassstudents: 'My Class Students',
  studentattendance: 'Student Attendance',
  classnotes: 'Class Notes',
  hometest: 'Home Test',
  hometestmanagement: 'Home Test Management',
  homework: 'Homework',
  studentHomework: 'Homework',
  studentHometest: 'Home Test',
  studenttransportallocate: 'Student Transport Allocate',
  academics: 'Academics',
  schooldetails: 'School Details',
  academiccalendar: 'Academic Calendar',
  academiceventscalendar: 'Academic Events Calendar',
  subjectcreate: 'Class & Subject Management',
  classsection: 'Class Section',
  classsectionhistory: 'Class Section History',
  classteachermanagement: 'Class Teacher Management',
  classsectionview: 'Class Section Report',
  classteachermappingview: 'Class & Teacher Report',
  subjecttimetable: 'Subject Timetable',
  timetablehistory: 'Timetable History',
  freeteachers: 'Free Teachers Report',
  createteacherattendance: 'Create Teacher Attendance',
  teacherattendance: 'Teacher Attendance Report (Biometric)',
  events_page: 'Events',
  teacherEvents: 'Events & Notices',
  studentEvents: 'Events & Notices',
  circular: 'Circulars',
  studentCircular: 'Circulars',
  teacherCircular: 'Circulars',
  parentCircular: 'Circulars',
  exams: 'Exams',
  mcqtestreport: 'MCQ Test Report',
  transport: 'Transport',
  library: 'Library',
  bookscreate: 'Create Book',
  librarystaffcreate: 'Library Staff',
  expenses: 'Expenses',
  schoolfees: 'School Fees',
  schoolfeesstudent: 'Student Fees',
  studentfeespay: 'Student Fees Pay',
  feespendinghistory: 'Fees Pending History',
  busfeespendinghistory: 'Bus Fees Pending History',
  feecompletehistory: 'Fee Complete History',
  staffsalarydetails: 'Staff Salary Details',
  staffsalaryhistory: 'Staff Salary History',
  pfsalaryhistory: 'PF Salary History',
  formprivileges: 'Form Privileges',
  usercreation: 'User Creation',
  map: 'School Location Map',
  gmail: 'Gmail',
  organizations: 'Organizations',
  organizationsadmins: 'Organization Admins',
  rollnocreate: 'Roll No. Create',
  rollnohistory: 'Roll No. History',
  studentmyteachers: 'My Teachers',
  studentmytimetable: 'My Timetable',
  studentclassnotes: 'Class Notes',
  dailymcqtest: 'Daily MCQ Test',
  mcqtesthistory: 'MCQ Test Mark History',
  createdriver: 'Create Driver',
  buscreate: 'Bus Create',
  busfeessetup: 'Bus Fees Setup',
  bussdriverallocate: 'Bus & Driver Allocate',
  studenttransportstatement: 'Student Transport Statement',
  uploadonemark: 'Upload One Mark Questions',
  questionbank: 'Question Bank',
  templates: 'Exam Question Paper Templates',
  mainimages: 'Main Images',
  exam: 'Exam Tools',
  chat: 'Chat',
  studentchat: 'Chat with Teachers',
  fingerprintset: 'Fingerprint Set',
  setregulation: 'Set Regulation',
  setunitmark: 'Set Unit Mark',
  settings: 'Settings',
  homeworkhistory: 'Homework History',
  examquestionpaper: 'Exam Question Paper',
  createexamtitle: 'Create Exam Title',
  examtimetable: 'Create Exam Timetable',
  exams_list: 'Exam List',
  studentmcqreport: 'Student MCQ Report',
  exammarkupload: 'Exam Mark Upload',
};

const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currentPage } = useSelector((state: RootState) => state.navigation);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false);
    }
  }, [isMobile]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleBack = () => {
    const userRole = user?.role || '';
    const dashboardPage = {
        'admin': 'admindashboard',
        'staff': 'staffdashboard',
        'student': 'studentdashboard',
        'superadmin': 'superadmindashboard',
        'parent': 'parentdashboard',
        'library_staff': 'librarystaffdashboard',
    }[userRole];

    if (dashboardPage) {
        dispatch(setCurrentPage(dashboardPage as any));
    }
  };

  const isDashboard = currentPage.endsWith('dashboard');

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ];

  const pageTitle = pageTitles[currentPage] || 'Dashboard';
  const ComponentToRender = pageComponents[currentPage as keyof typeof pageComponents] || <div>Page not found</div>;
  

  return (
    <Layout style={{ minHeight: '100vh', flexDirection: 'row' }}>
       <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
       {isMobile && !collapsed && (
        <div 
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />
      )}
      <Layout 
        style={{ 
            marginLeft: isMobile ? 0 : collapsed ? 80 : 250, 
            transition: 'margin-left 0.2s',
            display: 'flex',
            flexDirection: 'column'
        }}
      >
        <Header
        style={{
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 10,
        }}
        >
        <Space align="center">
            <Button
            type="text"
            icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={() => setCollapsed(!collapsed)}
            style={{
                fontSize: '16px',
                width: 48,
                height: 48,
            }}
            />
            <Title level={4} style={{ margin: 0, fontSize: '20px' }}>
            {pageTitle}
            </Title>
        </Space>
        <Space align="center" size="large">
            <Button type="text" shape="circle" icon={<BellOutlined style={{ fontSize: 20 }} />} />
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <a onClick={(e) => e.preventDefault()} style={{ display: 'flex', alignItems: 'center' }}>
                <Space>
                <Avatar style={{ cursor: 'pointer' }} src={user?.photo_url} icon={<UserOutlined />} />
                {!isMobile && <Typography.Text>{user?.email || user?.email || 'User'}</Typography.Text>}
                </Space>
            </a>
            </Dropdown>
        </Space>
        </Header>
        <Content style={{ background: '#f9fafb', flex: 1, padding: isMobile ? '8px 6px' : 24, overflowX: 'hidden', width: '100%', maxWidth: '100vw', boxSizing: 'border-box' }}>
            {!isDashboard && isMobile && (
                <Button
                    type="text"
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    style={{ marginBottom: 16 }}
                >
                    Back
                </Button>
            )}
            {ComponentToRender}
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;