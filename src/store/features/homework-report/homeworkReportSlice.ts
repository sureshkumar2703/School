

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface HomeworkReport {
  id: string;
  created_at: string;
  organization_key: string;
  academic_year: string;
  class_name: string;
  section_name: string;
  subject: string;
  homework_date: string;
  questions: string[];
  student_id: string;
  student_name?: string;
  roll_no?: string;
  register_no?: string;
  homework_id: string;
  status: 'Pending' | 'Confirm' | 'Completed' | 'Cancel'; // Added 'Cancel'
  get_mark?: number | null;
}

export type SaveHomeworkReportPayload = Omit<HomeworkReport, 'id' | 'created_at'>;

export interface UpdateStatusPayload {
    reportId: string;
    status: 'Confirm' | 'Completed' | 'Cancel';
}

export interface FetchHomeworkReportsPayload {
    studentId?: string;
    organizationKey?: string;
}

interface HomeworkReportState {
  reports: HomeworkReport[];
  loading: boolean;
  error: string | null;
}

const initialState: HomeworkReportState = {
  reports: [],
  loading: false,
  error: null,
};

const homeworkReportSlice = createSlice({
  name: 'homeworkReport',
  initialState,
  reducers: {
    fetchHomeworkReportsRequest: (state, _action: PayloadAction<FetchHomeworkReportsPayload>) => {
      state.loading = true;
      state.error = null;
    },
    fetchHomeworkReportsSuccess: (state, action: PayloadAction<HomeworkReport[]>) => {
      state.loading = false;
      state.reports = action.payload;
    },
    fetchHomeworkReportsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    saveHomeworkReportRequest: (state, _action: PayloadAction<SaveHomeworkReportPayload>) => {
      state.loading = true;
      state.error = null;
    },
    saveHomeworkReportSuccess: (state, action: PayloadAction<HomeworkReport | null>) => {
      state.loading = false;
      if (action.payload && !state.reports.some(r => r.id === action.payload!.id)) {
        state.reports.push(action.payload);
      }
    },
    saveHomeworkReportFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateHomeworkReportStatusRequest: (state, _action: PayloadAction<UpdateStatusPayload>) => {
        state.loading = true;
    },
    updateHomeworkReportStatusSuccess: (state, action: PayloadAction<HomeworkReport>) => {
        state.loading = false;
        const index = state.reports.findIndex(r => r.id === action.payload.id);
        if (index !== -1) {
            state.reports[index] = action.payload;
        } else {
            state.reports.push(action.payload);
        }
    },
    updateHomeworkReportStatusFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
  fetchHomeworkReportsRequest,
  fetchHomeworkReportsSuccess,
  fetchHomeworkReportsFailure,
  saveHomeworkReportRequest,
  saveHomeworkReportSuccess,
  saveHomeworkReportFailure,
  updateHomeworkReportStatusRequest,
  updateHomeworkReportStatusSuccess,
  updateHomeworkReportStatusFailure,
} = homeworkReportSlice.actions;

export default homeworkReportSlice.reducer;
