

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ClassTimetable } from '../class-timetables/classTimetablesSlice';
import type { ClassMapping as TeacherClassMapping } from '../teacher-dashboard/teacherDashboardSlice';

// Re-exporting for easy access in components
export type { ClassTimetable, TimetableEntry, Day } from '../class-timetables/classTimetablesSlice';
export type { TeacherClassMapping };

interface FetchPayload {
    organizationKey: string;
}

interface FetchSuccessPayload {
    timetables: ClassTimetable[];
    mappings: TeacherClassMapping[];
}

interface TeacherTimetableState {
  timetables: ClassTimetable[];
  mappings: TeacherClassMapping[];
  loading: boolean;
  error: string | null;
}

const initialState: TeacherTimetableState = {
  timetables: [],
  mappings: [],
  loading: false,
  error: null,
};

const teacherTimetableSlice = createSlice({
  name: 'teacherTimetable',
  initialState,
  reducers: {
    fetchTeacherTimetableDataRequest: (state, _action: PayloadAction<FetchPayload>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTeacherTimetableDataSuccess: (state, action: PayloadAction<FetchSuccessPayload>) => {
      state.loading = false;
      state.mappings = action.payload.mappings;
      state.timetables = action.payload.timetables;
    },
    fetchTeacherTimetableDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTeacherTimetableDataRequest,
  fetchTeacherTimetableDataSuccess,
  fetchTeacherTimetableDataFailure,
} = teacherTimetableSlice.actions;

export default teacherTimetableSlice.reducer;
