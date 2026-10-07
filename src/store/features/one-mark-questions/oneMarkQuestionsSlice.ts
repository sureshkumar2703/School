
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// This interface represents a single question object within the JSONB array
export interface OneMarkQuestionItem {
    id: string; // Unique ID for each question, e.g., uuid
    questions: string;
    option1?: string;
    option2?: string;
    option3?: string;
    option4?: string;
    answer: string;
}

// This interface represents the entire row in the database
export interface OneMarkQuestionBatch {
    id: string;
    organization_key: string;
    staff_code: string;
    academic_year: string;
    class: string;
    section: string;
    subject: string;
    title: string; // e.g., 'Choose the correct answer'
    questions: OneMarkQuestionItem[]; // The array of questions
    status?: string;
    created_at?: string;
}


export interface FetchQuestionsPayload {
    organizationKey: string;
    staffCode: string;
    academicYear: string;
    className: string;
    sectionName: string;
    subject: string;
}

// The payload for uploading will now include the context and the array of questions
export interface UploadQuestionsPayload {
    organization_key: string;
    staff_code: string;
    academic_year: string;
    class: string;
    section: string;
    subject: string;
    title: string;
    questions: Omit<OneMarkQuestionItem, 'id'>[];
}


interface OneMarkQuestionsState {
  questions: OneMarkQuestionBatch[]; // State now holds an array of batches
  loading: boolean;
  error: string | null;
}

const initialState: OneMarkQuestionsState = {
  questions: [],
  loading: false,
  error: null,
};

const oneMarkQuestionsSlice = createSlice({
  name: 'oneMarkQuestions',
  initialState,
  reducers: {
    uploadQuestionsRequest: (state, _action: PayloadAction<UploadQuestionsPayload>) => {
      state.loading = true;
      state.error = null;
    },
    uploadQuestionsSuccess: (state) => {
      state.loading = false;
    },
    uploadQuestionsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchOneMarkQuestionsRequest: (state, _action: PayloadAction<FetchQuestionsPayload>) => {
        state.loading = true;
        state.error = null;
    },
    fetchOneMarkQuestionsSuccess: (state, action: PayloadAction<OneMarkQuestionBatch[]>) => {
        state.loading = false;
        state.questions = action.payload;
    },
    fetchOneMarkQuestionsFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    updateOneMarkQuestionRequest: (state, _action: PayloadAction<OneMarkQuestionBatch>) => {
        state.loading = true;
        state.error = null;
    },
    updateOneMarkQuestionSuccess: (state, action: PayloadAction<OneMarkQuestionBatch>) => {
        state.loading = false;
        const index = state.questions.findIndex(q => q.id === action.payload.id);
        if (index !== -1) {
            state.questions[index] = action.payload;
        }
    },
    updateOneMarkQuestionFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    deleteOneMarkQuestionRequest: (state, _action: PayloadAction<{batchId: string, questionId: string}>) => {
        state.loading = true;
        state.error = null;
    },
    deleteOneMarkQuestionSuccess: (state) => {
        state.loading = false;
    },
    deleteOneMarkQuestionFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
  uploadQuestionsRequest,
  uploadQuestionsSuccess,
  uploadQuestionsFailure,
  fetchOneMarkQuestionsRequest,
  fetchOneMarkQuestionsSuccess,
  fetchOneMarkQuestionsFailure,
  updateOneMarkQuestionRequest,
  updateOneMarkQuestionSuccess,
  updateOneMarkQuestionFailure,
  deleteOneMarkQuestionRequest,
  deleteOneMarkQuestionSuccess,
  deleteOneMarkQuestionFailure,
} = oneMarkQuestionsSlice.actions;

export default oneMarkQuestionsSlice.reducer;
