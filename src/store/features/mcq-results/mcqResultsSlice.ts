
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { QuestionResult } from '../mcq-test-history/mcqTestHistorySlice';


export interface StudentForReport {
    id: string; // This will be the student's primary UUID from the 'students' table
    full_name: string;
    register_no: string;
    roll_no: string | null;
}

export interface FetchStudentsByClassPayload {
    organizationKey: string;
    academicYear: string;
    className: string;
    sectionName: string;
}

export interface StudentResult {
    student_id: string;
    student_name?: string;
    roll_no?: string;
    register_no?: string;
}

export interface McqTestResult {
    id: string;
    organization_key: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject: string;
    test_date: string;
    score: number;
    total_questions: number;
    time_taken: string;
    student: StudentResult;
    questions: QuestionResult[];
}

interface McqResultsState {
  results: McqTestResult[];
  students: StudentForReport[];
  loading: boolean;
  error: string | null;
}

const initialState: McqResultsState = {
  results: [],
  students: [],
  loading: false,
  error: null,
};

const mcqResultsSlice = createSlice({
  name: 'mcqResults',
  initialState,
  reducers: {
    fetchMcqResultsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchMcqResultsSuccess: (state, action: PayloadAction<McqTestResult[]>) => {
      state.loading = false;
      state.results = action.payload;
    },
    fetchMcqResultsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchStudentsByClassRequest: (state, _action: PayloadAction<FetchStudentsByClassPayload>) => {
        state.loading = true;
        state.error = null;
        state.students = [];
    },
    fetchStudentsByClassSuccess: (state, action: PayloadAction<StudentForReport[]>) => {
        state.loading = false;
        state.students = action.payload;
    },
    fetchStudentsByClassFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
  fetchMcqResultsRequest,
  fetchMcqResultsSuccess,
  fetchMcqResultsFailure,
  fetchStudentsByClassRequest,
  fetchStudentsByClassSuccess,
  fetchStudentsByClassFailure,
} = mcqResultsSlice.actions;

export default mcqResultsSlice.reducer;
