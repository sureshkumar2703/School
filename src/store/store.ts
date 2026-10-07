import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootSaga from './saga';
import authReducer from './features/auth/authSlice';
import navigationReducer from './features/navigation/navigationSlice';
import studentsReducer from './features/students/studentsSlice';
import studentDocumentsReducer from './features/student-documents/studentDocumentsSlice';
import teacherDocumentsReducer from './features/teacher-documents/teacherDocumentsSlice';
import attendanceReducer from './features/attendance/attendanceSlice';
import studentPromotionsReducer from './features/student-promotions/studentPromotionsSlice';
import organizationsReducer from './features/organizations/organizationsSlice';
import organizationsAdminsReducer from './features/organizations-admins/organizationsAdminsSlice';
import subjectsReducer from './features/subjects/subjectsSlice';
import classesReducer from './features/classes/classesSlice';
import classMappingsReducer from './features/class-mappings/classMappingsSlice';
import classMappingsViewReducer from './features/class-mappings-view/classMappingsViewSlice';
import adminsReducer from './features/admins/adminsSlice';
import teachersReducer from './features/teachers/teachersSlice';
import classTimetablesReducer from './features/class-timetables/classTimetablesSlice';
import timetableHistoryReducer from './features/timetable-history/timetableHistorySlice';
import classSectionsReducer from './features/class-sections/classSectionsSlice';
import classSectionsViewReducer from './features/class-sections-view/classSectionsViewSlice';
import teacherDashboardReducer from './features/teacher-dashboard/teacherDashboardSlice';
import teacherTimetableReducer from './features/teacher-timetable/teacherTimetableSlice';
import teacherStatsReducer from './features/teacher-stats/teacherStatsSlice';
import eventsReducer from './features/events/eventsSlice';
import rollNoReducer from './features/roll-no/rollNoSlice';
import academicCalendarReducer from './features/academic-calendar/academicCalendarSlice';
import studentDashboardReducer from './features/student-dashboard/studentDashboardSlice';
import schoolDetailsReducer from './features/school-details/schoolDetailsSlice';
import driversReducer from './features/drivers/driversSlice';
import busReducer from './features/buses/busSlice';
import busFeesReducer from './features/bus-fees/busFeesSlice';
import studentTransportReducer from './features/student-transport/studentTransportSlice';
import notesReducer from './features/notes/notesSlice';
import studentNotesReducer from './features/student-notes/studentNotesSlice';
import studentTransportDataReducer from './features/student-transport-data/studentTransportDataSlice';
import assignmentsReducer from './features/assignments/assignmentsSlice';
import oneMarkQuestionsReducer from './features/one-mark-questions/oneMarkQuestionsSlice';
import questionBankReducer from './features/question-bank/questionBankSlice';
import questionPaperTemplatesReducer from './features/question-paper-templates/questionPaperTemplatesSlice';
import circularsReducer from './features/circulars/circularsSlice';
import mcqTestDataReducer from './features/daily-mcq-test/mcqTestDataSlice';
import mcqTestHistoryReducer from './features/mcq-test-history/mcqTestHistorySlice';
import mainImagesReducer from './features/main-images/mainImagesSlice';
import booksReducer from './features/books/booksSlice';
import libraryStaffReducer from './features/library-staff/libraryStaffSlice';
import notificationsReducer from './features/notifications/notificationsSlice';
import mcqResultsReducer from './features/mcq-results/mcqResultsSlice';
import chatReducer from './features/chat/chatSlice';
import fingerprintSetReducer from './features/fingerprint/fingerprintSetSlice';
import setfeesReducer from './features/setfees/setfeesSlice';
import studentFeesReducer from './features/student-fees/studentFeesSlice';
import studentFeesPayReducer from './features/student-fees-pay/studentFeesPaySlice';
import studentFeePaymentsReducer from './features/student-fee-payments/studentFeePaymentsSlice';
import staffSalaryReducer from './features/staff-salary/staffSalarySlice';
import staffSalaryHistoryReducer from './features/staff-salary-history/staffSalaryHistorySlice';
import pfSalaryHistoryReducer from './features/pf-salary-history/pfSalaryHistorySlice';
import feesPendingHistoryReducer from './features/fees-pending-history/feesPendingHistorySlice';
import feesCompleteHistoryReducer from './features/fees-complete-history/feesCompleteHistorySlice';
import setRegulationReducer from './features/set-regulation/setRegulationSlice';
import setUnitMarkReducer from './features/set-unit-mark/setUnitMarkSlice';
import homeTestReducer from './features/home-test/homeTestSlice';
import homeTestReportReducer from './features/home-test-report/homeTestReportSlice';
import homeworkReducer from './features/homework/homeworkSlice';
import homeworkReportReducer from './features/homework-report/homeworkReportSlice';
import examTitleReducer from './features/exam-title/examTitleSlice';
import examTimetableAdminReducer from './features/exam-timetable-admin/examTimetableAdminSlice';
import questionPaperReducer from './features/question-paper/questionPaperSlice';
import questionPaperListReducer from './features/question-paper-list/questionPaperListSlice';
import analysisReducer from './features/analysis/analysisSlice';
import examMarksReducer from './features/exam-marks/examMarksSlice';


const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    navigation: navigationReducer,
    students: studentsReducer,
    studentDocuments: studentDocumentsReducer,
    teacherDocuments: teacherDocumentsReducer,
    attendance: attendanceReducer,
    studentPromotions: studentPromotionsReducer,
    organizations: organizationsReducer,
    organizationsAdmins: organizationsAdminsReducer,
    subjects: subjectsReducer,
    classes: classesReducer,
    classMappings: classMappingsReducer,
    classMappingsView: classMappingsViewReducer,
    admins: adminsReducer,
    teachers: teachersReducer,
    classTimetables: classTimetablesReducer,
    timetableHistory: timetableHistoryReducer,
    classSections: classSectionsReducer,
    classSectionsView: classSectionsViewReducer,
    teacherDashboard: teacherDashboardReducer,
    teacherTimetable: teacherTimetableReducer,
    teacherStats: teacherStatsReducer,
    events: eventsReducer,
    rollNo: rollNoReducer,
    academicCalendar: academicCalendarReducer,
    studentDashboard: studentDashboardReducer,
    schoolDetails: schoolDetailsReducer,
    drivers: driversReducer,
    buses: busReducer,
    busFees: busFeesReducer,
    studentTransport: studentTransportReducer,
    notes: notesReducer,
    studentNotes: studentNotesReducer,
    studentTransportData: studentTransportDataReducer,
    assignments: assignmentsReducer,
    homeTest: homeTestReducer,
    oneMarkQuestions: oneMarkQuestionsReducer,
    questionBank: questionBankReducer,
    circulars: circularsReducer,
    mcqTestData: mcqTestDataReducer,
    mcqTestHistory: mcqTestHistoryReducer,
    mainImages: mainImagesReducer,
    books: booksReducer,
    libraryStaff: libraryStaffReducer,
    notifications: notificationsReducer,
    mcqResults: mcqResultsReducer,
    chat: chatReducer,
    fingerprintSet: fingerprintSetReducer,
    setfees: setfeesReducer,
    studentFees: studentFeesReducer,
    studentFeesPay: studentFeesPayReducer,
    studentFeePayments: studentFeePaymentsReducer,
    staffSalary: staffSalaryReducer,
    staffSalaryHistory: staffSalaryHistoryReducer,
    pfSalaryHistory: pfSalaryHistoryReducer,
    feesPendingHistory: feesPendingHistoryReducer,
    feesCompleteHistory: feesCompleteHistoryReducer,
    setRegulation: setRegulationReducer,
    setUnitMark: setUnitMarkReducer,
    homeTestReport: homeTestReportReducer,
    homework: homeworkReducer,
    homeworkReport: homeworkReportReducer,
    examTitle: examTitleReducer,
    examTimetableAdmin: examTimetableAdminReducer,
    questionPaper: questionPaperReducer,
    questionPaperList: questionPaperListReducer,
    analysis: analysisReducer,
    examMarks: examMarksReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false, serializableCheck: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
