
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AcademicCalendar } from '../academic-calendar/academicCalendarSlice';

// Re-using the mapping structure from other parts of the app
export interface ClassMapping {
  id: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  teacher_name: string;
  academic_year: string;
  organization_key?: string;
  role?: 'Class Teacher' | 'Subject Teacher';
  created_at?: string;
}

interface FetchSuccessPayload {
    mappings: ClassMapping[];
    calendars: AcademicCalendar[];
}

interface TeacherDashboardState {
  mappings: ClassMapping[];
  calendars: AcademicCalendar[];
  loading: boolean;
  error: string | null;
}

const initialState: TeacherDashboardState = {
  mappings: [],
  calendars: [],
  loading: false,
  error: null,
};

const teacherDashboardSlice = createSlice({
  name: 'teacherDashboard',
  initialState,
  reducers: {
    fetchTeacherDashboardDataRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTeacherDashboardDataSuccess: (state, action: PayloadAction<FetchSuccessPayload>) => {
      state.loading = false;
      state.mappings = action.payload.mappings;
      state.calendars = action.payload.calendars;
    },
    fetchTeacherDashboardDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTeacherDashboardDataRequest,
  fetchTeacherDashboardDataSuccess,
  fetchTeacherDashboardDataFailure,
} = teacherDashboardSlice.actions;

export default teacherDashboardSlice.reducer;
