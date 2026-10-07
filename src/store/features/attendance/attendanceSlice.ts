
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AttendanceRecord {
  id?: string;
  student_id: string;
  organization_key: string;
  date: string;
  class: string;
  section: string;
  academic_year: string;
  roll_no?: string;
  register_no: string;
  name: string;
  forenoon_status: string | null;
  afternoon_status: string | null;
  attendace_status: string | null;
  created_at?: string;
}

export interface UpdateSingleAttendancePayload {
  student_id: string;
  date: string;
  attendace_status: string | null;
  forenoon_status: string | null;
  afternoon_status: string | null;
}

interface FetchAttendancePayload {
    organizationKey: string;
    date?: string;
    studentIds?: string[];
    startDate?: string;
    endDate?: string;
    className?: string;
    sectionName?: string;
    academicYear?: string;
}

interface AttendanceState {
  attendance: AttendanceRecord[];
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  attendance: [],
  loading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    fetchAttendanceRequest: (state, _action: PayloadAction<Partial<FetchAttendancePayload>>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAttendanceSuccess: (state, action: PayloadAction<AttendanceRecord[]>) => {
      state.loading = false;
      state.attendance = action.payload;
    },
    fetchAttendanceFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    markForenoonAttendanceRequest: (state, _action: PayloadAction<Partial<AttendanceRecord>[]>) => {
      state.loading = true;
    },
    markForenoonAttendanceSuccess: (state) => {
      state.loading = false;
    },
    markForenoonAttendanceFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    markAfternoonAttendanceRequest: (state, _action: PayloadAction<Partial<AttendanceRecord>[]>) => {
        state.loading = true;
    },
    markAfternoonAttendanceSuccess: (state) => {
        state.loading = false;
    },
    markAfternoonAttendanceFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    updateSingleAttendanceRequest: (state, _action: PayloadAction<UpdateSingleAttendancePayload>) => {
      state.loading = true;
      state.error = null;
    },
    updateSingleAttendanceSuccess: (state) => {
      state.loading = false;
    },
    updateSingleAttendanceFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchAttendanceRequest,
  fetchAttendanceSuccess,
  fetchAttendanceFailure,
  markForenoonAttendanceRequest,
  markForenoonAttendanceSuccess,
  markForenoonAttendanceFailure,
  markAfternoonAttendanceRequest,
  markAfternoonAttendanceSuccess,
  markAfternoonAttendanceFailure,
  updateSingleAttendanceRequest,
  updateSingleAttendanceSuccess,
  updateSingleAttendanceFailure,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
