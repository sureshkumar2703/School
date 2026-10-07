
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Day = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';

export interface TimetableEntry {
  day: Day;
  period: number;
  subject_name: string;
  teacher_name: string;
  status: 'Active' | 'Inactive';
}

export interface ClassTimetable {
  id?: string;
  organization_key: string;
  class_name: string;
  section_name: string;
  academic_year: string;
  number_of_periods: number;
  timetable_data: TimetableEntry[];
  updated_at?: string;
}

interface ClassTimetablesState {
  timetable: ClassTimetable | null;
  loading: boolean;
  error: string | null;
}

interface FetchPayload {
  organizationKey: string;
  className: string;
  sectionName: string;
  academicYear: string;
}

const initialState: ClassTimetablesState = {
  timetable: null,
  loading: false,
  error: null,
};

const classTimetablesSlice = createSlice({
  name: 'classTimetables',
  initialState,
  reducers: {
    fetchClassTimetableRequest: (state, _action: PayloadAction<FetchPayload>) => {
      state.loading = true;
      state.error = null;
      state.timetable = null;
    },
    fetchClassTimetableSuccess: (state, action: PayloadAction<ClassTimetable | null>) => {
      state.loading = false;
      state.timetable = action.payload;
    },
    fetchClassTimetableFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    saveClassTimetableRequest: (state, _action: PayloadAction<ClassTimetable>) => {
      state.loading = true;
      state.error = null;
    },
    saveClassTimetableSuccess: (state) => {
      state.loading = false;
    },
    saveClassTimetableFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchClassTimetableRequest,
  fetchClassTimetableSuccess,
  fetchClassTimetableFailure,
  saveClassTimetableRequest,
  saveClassTimetableSuccess,
  saveClassTimetableFailure,
} = classTimetablesSlice.actions;

export default classTimetablesSlice.reducer;

    