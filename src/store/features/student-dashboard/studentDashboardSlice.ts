
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ClassTimetable } from '../class-timetables/classTimetablesSlice';
import type { ClassMapping } from '../teacher-dashboard/teacherDashboardSlice';

export type { ClassTimetable, ClassMapping };

interface FetchPayload {
    organizationKey: string;
    className: string;
    sectionName: string;
    academicYear: string;
}

interface FetchSuccessPayload {
    timetable: ClassTimetable | null;
    mappings: ClassMapping[];
}

interface StudentDashboardState {
  timetable: ClassTimetable | null;
  mappings: ClassMapping[];
  loading: boolean;
  error: string | null;
}

const initialState: StudentDashboardState = {
  timetable: null,
  mappings: [],
  loading: false,
  error: null,
};

const studentDashboardSlice = createSlice({
  name: 'studentDashboard',
  initialState,
  reducers: {
    fetchStudentDashboardDataRequest: (state, _action: PayloadAction<FetchPayload>) => {
      state.loading = true;
      state.error = null;
    },
    fetchStudentDashboardDataSuccess: (state, action: PayloadAction<FetchSuccessPayload>) => {
      state.loading = false;
      state.timetable = action.payload.timetable;
      state.mappings = action.payload.mappings;
    },
    fetchStudentDashboardDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchStudentDashboardDataRequest,
  fetchStudentDashboardDataSuccess,
  fetchStudentDashboardDataFailure,
} = studentDashboardSlice.actions;

export default studentDashboardSlice.reducer;
