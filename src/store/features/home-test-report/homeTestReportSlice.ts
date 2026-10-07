

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Question } from '../question-bank/questionBankSlice';

export interface HomeTestReport {
    id?: string;
    created_at?: string;
    organization_key: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject: string;
    unit: string;
    total_marks: number;
    questions: Record<string, Question[]>;
    student_id: string;
    student_name: string | undefined;
    roll_no: string | undefined;
    register_no: string | undefined;
    get_mark: number | null;
    home_test_id: string; // Foreign key to the original home_test
    status?: 'Pending' | 'Confirm' | 'Completed' | 'Cancel';
}

export type SaveHomeTestReportPayload = Omit<HomeTestReport, 'id' | 'created_at'>;

export interface UpdateStatusPayload {
    reportId: string;
    status: 'Confirm' | 'Completed' | 'Cancel';
}

export interface FetchHomeworkReportsPayload {
    studentId?: string;
    organizationKey?: string;
}

interface HomeTestReportState {
  reports: HomeTestReport[];
  loading: boolean;
  error: string | null;
}

const initialState: HomeTestReportState = {
    reports: [],
    loading: false,
    error: null,
};

const homeTestReportSlice = createSlice({
    name: 'homeTestReport',
    initialState,
    reducers: {
        // Fetch reports for a student or organization
        fetchHomeTestReportsRequest: (state, _action: PayloadAction<FetchHomeworkReportsPayload>) => {
            state.loading = true;
            state.error = null;
        },
        fetchHomeTestReportsSuccess: (state, action: PayloadAction<HomeTestReport[]>) => {
            state.loading = false;
            state.reports = action.payload;
        },
        fetchHomeTestReportsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Save a new report
        saveHomeTestReportRequest: (state, _action: PayloadAction<SaveHomeTestReportPayload>) => {
            state.loading = true;
            state.error = null;
        },
        saveHomeTestReportSuccess: (state, action: PayloadAction<HomeTestReport>) => {
            state.loading = false;
            state.reports.push(action.payload);
        },
        saveHomeTestReportFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        updateHomeworkReportStatusRequest: (state, _action: PayloadAction<UpdateStatusPayload>) => {
            state.loading = true;
        },
        updateHomeworkReportStatusSuccess: (state, action: PayloadAction<HomeTestReport>) => {
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
    fetchHomeTestReportsRequest,
    fetchHomeTestReportsSuccess,
    fetchHomeTestReportsFailure,
    saveHomeTestReportRequest,
    saveHomeTestReportSuccess,
    saveHomeTestReportFailure,
    updateHomeworkReportStatusRequest,
    updateHomeworkReportStatusSuccess,
    updateHomeworkReportStatusFailure,
} = homeTestReportSlice.actions;

export default homeTestReportSlice.reducer;
