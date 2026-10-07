
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface QuestionResult {
    question_id: string;
    question_text: string;
    selected_answer: string;
    correct_answer: string;
}

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

export interface McqTestSessionData {
    organization_key: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject: string;
    subject_code: string;
    staff_code: string;
    test_date: string;
}

export interface SaveMcqTestPayload {
  sessionData: McqTestSessionData;
  studentResult: StudentResult;
}


interface McqTestDataState {
  loading: boolean;
  error: string | null;
}

const initialState: McqTestDataState = {
  loading: false,
  error: null,
};

const mcqTestDataSlice = createSlice({
  name: 'mcqTestData',
  initialState,
  reducers: {
    saveMcqTestDataRequest: (state, _action: PayloadAction<SaveMcqTestPayload>) => {
      state.loading = true;
      state.error = null;
    },
    saveMcqTestDataSuccess: (state) => {
      state.loading = false;
    },
    saveMcqTestDataFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  saveMcqTestDataRequest,
  saveMcqTestDataSuccess,
  saveMcqTestDataFailure,
} = mcqTestDataSlice.actions;

export default mcqTestDataSlice.reducer;
