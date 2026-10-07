
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Represents a single question's result for a student
export interface QuestionResult {
    question_id: string;
    question_text: string;
    selected_answer: string;
    correct_answer: string;
}

// Represents a student's full attempt within a session
export interface StudentResult {
    student_id: string;
    student_name?: string;
    roll_no?: string;
    register_no?: string;
    time_taken: string;
    score: number;
    total_questions: number;
    results: QuestionResult[];
}

// This represents the raw data structure from the `mcqtestdata` table
export interface McqTestSession {
    id: string;
    organization_key: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    test_date: string;
    subject: string;
    student_results: StudentResult[];
}

// Represents a student's completed test session for display in their history.
export interface TestSession {
    test_date: string;
    subject: string;
    time_taken: string;
    score: number;
    totalQuestions: number;
    questions: QuestionResult[]; // This contains the detailed question-by-question results
}

interface McqTestHistoryState {
  history: TestSession[];
  loading: boolean;
  error: string | null;
}

const initialState: McqTestHistoryState = {
  history: [],
  loading: false,
  error: null,
};

const mcqTestHistorySlice = createSlice({
  name: 'mcqTestHistory',
  initialState,
  reducers: {
    // This is for the student's own view
    fetchMcqTestHistoryRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    // This is for the teacher's view of a specific student
    fetchMcqTestHistoryForStudentRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchMcqTestHistorySuccess: (state, action: PayloadAction<TestSession[]>) => {
      state.loading = false;
      state.history = action.payload;
    },
    fetchMcqTestHistoryFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchMcqTestHistoryRequest,
  fetchMcqTestHistoryForStudentRequest,
  fetchMcqTestHistorySuccess,
  fetchMcqTestHistoryFailure,
} = mcqTestHistorySlice.actions;

export default mcqTestHistorySlice.reducer;
