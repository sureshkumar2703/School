import { all, fork } from 'redux-saga/effects';
import authSaga from './features/auth/authSaga';
import studentsSaga from './features/students/studentsSaga';
import studentDocumentsSaga from './features/student-documents/studentDocumentsSaga';
import attendanceSaga from './features/attendance/attendanceSaga';
import studentPromotionsSaga from './features/student-promotions/studentPromotionsSaga';
import organizationsSaga from './features/organizations/organizationsSaga';
import organizationsAdminsSaga from './features/organizations-admins/organizationsAdminsSaga';
import subjectsSaga from './features/subjects/subjectsSaga';
import classesSaga from './features/classes/classesSaga';
import classMappingsSaga from './features/class-mappings/classMappingsSaga';
import classMappingsViewSaga from './features/class-mappings-view/classMappingsViewSaga';
import adminsSaga from './features/admins/adminsSaga';
import teachersSaga from './features/teachers/teachersSaga';
import teacherDocumentsSaga from './features/teacher-documents/teacherDocumentsSaga';
import classTimetablesSaga from './features/class-timetables/classTimetablesSaga';
import timetableHistorySaga from './features/timetable-history/timetableHistorySaga';
import classSectionsSaga from './features/class-sections/classSectionsSaga';
import classSectionsViewSaga from './features/class-sections-view/classSectionsViewSaga';
import teacherDashboardSaga from './features/teacher-dashboard/teacherDashboardSaga';
import teacherTimetableSaga from './features/teacher-timetable/teacherTimetableSaga';
import teacherStatsSaga from './features/teacher-stats/teacherStatsSaga';
import eventsSaga from './features/events/eventsSaga';
import rollNoSaga from './features/roll-no/rollNoSaga';
import academicCalendarSaga from './features/academic-calendar/academicCalendarSaga';
import studentDashboardSaga from './features/student-dashboard/studentDashboardSaga';
import schoolDetailsSaga from './features/school-details/schoolDetailsSaga';
import driversSaga from './features/drivers/driversSaga';
import notesSaga from './features/notes/notesSaga';
import busSaga from './features/buses/busSaga';
import busFeesSaga from './features/bus-fees/busFeesSaga';
import studentTransportSaga from './features/student-transport/studentTransportSaga';
import studentNotesSaga from './features/student-notes/studentNotesSaga';
import studentTransportDataSaga from './features/student-transport-data/studentTransportDataSaga';
import assignmentsSaga from './features/assignments/assignmentsSaga';
import oneMarkQuestionsSaga from './features/one-mark-questions/oneMarkQuestionsSaga';
import questionBankSaga from './features/question-bank/questionBankSaga';
import questionPaperTemplatesSaga from './features/question-paper-templates/questionPaperTemplatesSaga';
import circularsSaga from './features/circulars/circularsSaga';
import mcqTestDataSaga from './features/daily-mcq-test/mcqTestDataSaga';
import mcqTestHistorySaga from './features/mcq-test-history/mcqTestHistorySaga';
import mainImagesSaga from './features/main-images/mainImagesSaga';
import booksSaga from './features/books/booksSaga';
import libraryStaffSaga from './features/library-staff/libraryStaffSaga';
import notificationsSaga from './features/notifications/notificationsSaga';
import mcqResultsSaga from './features/mcq-results/mcqResultsSaga';
import chatSaga from './features/chat/chatSaga';
import fingerprintSetSaga from './features/fingerprint/fingerprintSetSaga';
import setfeesSaga from './features/setfees/setfeesSaga';
import studentFeesPaySaga from './features/student-fees-pay/studentFeesPaySaga';
import studentFeePaymentsSaga from './features/student-fee-payments/studentFeePaymentsSaga';
import staffSalarySaga from './features/staff-salary/staffSalarySaga';
import staffSalaryHistorySaga from './features/staff-salary-history/staffSalaryHistorySaga';
import pfSalaryHistorySaga from './features/pf-salary-history/pfSalaryHistorySaga';
import setRegulationSaga from './features/set-regulation/setRegulationSaga';
import setUnitMarkSaga from './features/set-unit-mark/setUnitMarkSaga';
import homeTestSaga from './features/home-test/homeTestSaga';
import homeTestReportSaga from './features/home-test-report/homeTestReportSaga';
import homeworkSaga from './features/homework/homeworkSaga';
import homeworkReportSaga from './features/homework-report/homeworkReportSaga';
import examTitleSaga from './features/exam-title/examTitleSaga';
import examTimetableAdminSaga from './features/exam-timetable-admin/examTimetableAdminSaga';
import questionPaperSaga from './features/question-paper/questionPaperSaga';
import feesPendingHistorySaga from './features/fees-pending-history/feesPendingHistorySaga';
import feesCompleteHistorySaga from './features/fees-complete-history/feesCompleteHistorySaga';
import questionPaperListSaga from './features/question-paper-list/questionPaperListSaga';
import examMarksSaga from './features/exam-marks/examMarksSaga';
import studentFeesSaga from './features/student-fees/studentFeesSaga';


export default function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(studentsSaga),
    fork(studentDocumentsSaga),
    fork(attendanceSaga),
    fork(studentPromotionsSaga),
    fork(organizationsSaga),
    fork(organizationsAdminsSaga),
    fork(subjectsSaga),
    fork(classesSaga),
    fork(classMappingsSaga),
    fork(classMappingsViewSaga),
    fork(adminsSaga),
    fork(teachersSaga),
    fork(teacherDocumentsSaga),
    fork(classTimetablesSaga),
    fork(timetableHistorySaga),
    fork(classSectionsSaga),
    fork(classSectionsViewSaga),
    fork(teacherDashboardSaga),
    fork(teacherTimetableSaga),
    fork(teacherStatsSaga),
    fork(eventsSaga),
    fork(rollNoSaga),
    fork(academicCalendarSaga),
    fork(studentDashboardSaga),
    fork(schoolDetailsSaga),
    fork(driversSaga),
    fork(notesSaga),
    fork(busSaga),
    fork(busFeesSaga),
    fork(studentTransportSaga),
    fork(studentNotesSaga),
    fork(studentTransportDataSaga),
    fork(assignmentsSaga),
    fork(oneMarkQuestionsSaga),
    fork(questionBankSaga),
    fork(questionPaperTemplatesSaga),
    fork(circularsSaga),
    fork(mcqTestDataSaga),
    fork(mcqTestHistorySaga),
    fork(mainImagesSaga),
    fork(booksSaga),
    fork(libraryStaffSaga),
    fork(notificationsSaga),
    fork(mcqResultsSaga),
    fork(chatSaga),
    fork(fingerprintSetSaga),
    fork(setfeesSaga),
    fork(studentFeesPaySaga),
    fork(staffSalarySaga),
    fork(staffSalaryHistorySaga),
    fork(pfSalaryHistorySaga),
    fork(studentFeePaymentsSaga),
    fork(setRegulationSaga),
    fork(setUnitMarkSaga),
    fork(homeTestSaga),
    fork(homeTestReportSaga),
    fork(homeworkSaga),
    fork(homeworkReportSaga),
    fork(examTitleSaga),
    fork(examTimetableAdminSaga),
    fork(questionPaperSaga),
    fork(feesPendingHistorySaga),
    fork(feesCompleteHistorySaga),
    fork(questionPaperListSaga),
    fork(examMarksSaga),
    fork(studentFeesSaga),
  ]);
}