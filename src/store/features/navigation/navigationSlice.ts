import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Page =
  | 'login'
  | 'studentdashboard'
  | 'staffdashboard'
  | 'admindashboard'
  | 'superadmindashboard'
  | 'parentdashboard'
  | 'librarystaffdashboard'
  | 'profile'
  | 'allstudents'
  | 'studentdocument'
  | 'applicationform'
  | 'presentdayattendance'
  | 'overallattendance'
  | 'studentpromotion'
  | 'alladmins'
  | 'allteachers'
  | 'teacherdocument'
  | 'teacherapplicationform'
  | 'staffbarcodes'
  | 'myclasses'
  | 'myclasstimetable'
  | 'personaltimetable'
  | 'mystudents'
  | 'myclassstudents'
  | 'studentattendance'
  | 'classnotes'
  | 'hometest'
  | 'hometestmanagement'
  | 'homework'
  | 'studentHomework'
  | 'studentHometest'
  | 'studenttransportallocate'
  | 'academics'
  | 'schooldetails'
  | 'academiccalendar'
  | 'subjectcreate'
  | 'classsection'
  | 'classsectionhistory'
  | 'classteachermanagement'
  | 'subjecttimetable'
  | 'timetablehistory'
  | 'freeteachers'
  | 'createteacherattendance'
  | 'teacherattendance'
  | 'classteachermappingview'
  | 'classsectionview'
  | 'events_page'
  | 'teacherEvents'
  | 'studentEvents'
  | 'circular'
  | 'studentCircular'
  | 'teacherCircular'
  | 'parentCircular'
  | 'exams'
  | 'mcqtestreport'
  | 'transport'
  | 'library'
  | 'bookscreate'
  | 'librarystaffcreate'
  | 'expenses'
  | 'schoolfees'
  | 'schoolfeesstudent'
  | 'studentfeespay'
  | 'feespendinghistory'
  | 'busfeespendinghistory'
  | 'feecompletehistory'
  | 'staffsalarydetails'
  | 'staffsalaryhistory'
  | 'pfsalaryhistory'
  | 'formprivileges'
  | 'usercreation'
  | 'map'
  | 'gmail'
  | 'organizations'
  | 'organizationsadmins'
  | 'rollnocreate'
  | 'rollnohistory'
  | 'studentmyteachers'
  | 'studentmytimetable'
  | 'studentclassnotes'
  | 'dailymcqtest'
  | 'mcqtesthistory'
  | 'createdriver'
  | 'buscreate'
  | 'busfeessetup'
  | 'bussdriverallocate'
  | 'studenttransportstatement'
  | 'uploadonemark'
  | 'questionbank'
  | 'templates'
  | 'mainimages'
  | 'exam'
  | 'analysis'
  | 'studentAnalysis'
  | 'chat'
  | 'studentchat'
  | 'fingerprintset'
  | 'settings'
  | 'examquestionpaper'
  | 'createexamtitle'
  | 'homeworkhistory'
  | 'examtimetable'
  | 'exams_list'
  | 'studentmcqreport'
  | 'exammarkupload';

interface NavigationState {
  currentPage: Page;
}

const initialState: NavigationState = {
  currentPage: 'login',
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setCurrentPage: (state, action: PayloadAction<Page>) => {
      state.currentPage = action.payload;
    },
  },
});

export const { setCurrentPage } = navigationSlice.actions;

export default navigationSlice.reducer;