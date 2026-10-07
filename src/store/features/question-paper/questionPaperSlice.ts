

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// This slice handles saving the generated question paper to the database.

export interface QuestionPaper {
    id: string;
    created_at: string;
    organization_key: string;
    staff_code: string;
    academic_year?: string;
    class_name?: string;
    section_name?: string;
    subject?: string;
    exam_title?: string;
    exam_date?: string;
    exam_time?: string;
    total_mark?: number;
    school_details?: any;
    paper_content?: string; // Changed from any to string to store HTML
    status?: string;
    admin_name?: string;
}


interface QuestionPaperState {
    questionPapers: Partial<QuestionPaper>[]; // To store the list of existing papers
    loading: boolean;
    error: string | null;
}

const initialState: QuestionPaperState = {
    questionPapers: [],
    loading: false,
    error: null,
};

const questionPaperSlice = createSlice({
    name: 'questionPaper',
    initialState,
    reducers: {
        saveQuestionPaperRequest: (state, _action: PayloadAction<any>) => {
            state.loading = true;
            state.error = null;
        },
        saveQuestionPaperSuccess: (state) => {
            state.loading = false;
        },
        saveQuestionPaperFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Actions for fetching existing papers
        fetchQuestionPapersRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchQuestionPapersSuccess: (state, action: PayloadAction<Partial<QuestionPaper>[]>) => {
            state.loading = false;
            state.questionPapers = action.payload;
        },
        fetchQuestionPapersFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    saveQuestionPaperRequest,
    saveQuestionPaperSuccess,
    saveQuestionPaperFailure,
    fetchQuestionPapersRequest,
    fetchQuestionPapersSuccess,
    fetchQuestionPapersFailure,
} = questionPaperSlice.actions;

export default questionPaperSlice.reducer;

