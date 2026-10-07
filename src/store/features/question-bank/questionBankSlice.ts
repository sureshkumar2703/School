

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Question {
    id: string;
    organization_key: string;
    staff_code: string;
    academic_year: string;
    class: string;
    section: string;
    subject_code: string;
    unit: number;
    question: string;
    level: 'Easy' | 'Medium' | 'Hard';
    question_type: number; // Storing marks as a number
    regulation: string;
    status: 'Active' | 'Inactive';
    created_at?: string;

    // New fields for different question formats
    title?: 'Choose the correct answer' | 'Match the Following' | 'Fill in the blanks';
    option1?: string;
    option2?: string;
    option3?: string;
    option4?: string;
    answer?: string;
}

export interface GeneratedPaper {
    template: any;
    paper: Record<string, Question[]>;
}

export type AddQuestionPayload = Omit<Question, 'id' | 'created_at'>;

interface FetchQuestionsPayload {
    organizationKey: string;
    staffCode: string;
    academicYear?: string;
    className?: string;
    sectionName?: string;
    subject?: string;
}


interface QuestionBankState {
    questions: Question[];
    loading: boolean;
    error: string | null;
    generatedPaper: GeneratedPaper | null;
}

const initialState: QuestionBankState = {
    questions: [],
    loading: false,
    error: null,
    generatedPaper: null,
};

const questionBankSlice = createSlice({
    name: 'questionBank',
    initialState,
    reducers: {
        // Fetch
        fetchQuestionsRequest: (state, _action: PayloadAction<FetchQuestionsPayload>) => {
            state.loading = true;
            state.error = null;
        },
        fetchQuestionsSuccess: (state, action: PayloadAction<Question[]>) => {
            state.loading = false;
            state.questions = action.payload;
        },
        fetchQuestionsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addQuestionRequest: (state, _action: PayloadAction<AddQuestionPayload>) => {
            state.loading = true;
        },
        addQuestionSuccess: (state) => {
            state.loading = false;
        },
        addQuestionFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Bulk Add
        bulkAddQuestionsRequest: (state, _action: PayloadAction<AddQuestionPayload[]>) => {
            state.loading = true;
        },
        bulkAddQuestionsSuccess: (state) => {
            state.loading = false;
        },
        bulkAddQuestionsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update
        updateQuestionRequest: (state, _action: PayloadAction<Partial<Question> & { id: string }>) => {
            state.loading = true;
        },
        updateQuestionSuccess: (state) => {
            state.loading = false;
        },
        updateQuestionFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteQuestionRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteQuestionSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.questions = state.questions.filter(q => q.id !== action.payload);
        },
        deleteQuestionFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Generate Paper
        generatePaperRequest: (state, _action: PayloadAction<any>) => {
            state.loading = true;
            state.error = null;
            state.generatedPaper = null;
        },
        generatePaperSuccess: (state, action: PayloadAction<GeneratedPaper>) => {
            state.loading = false;
            state.generatedPaper = action.payload;
        },
        generatePaperFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearGeneratedPaper: (state) => {
            state.generatedPaper = null;
        },
    },
});

export const {
    fetchQuestionsRequest,
    fetchQuestionsSuccess,
    fetchQuestionsFailure,
    addQuestionRequest,
    addQuestionSuccess,
    addQuestionFailure,
    bulkAddQuestionsRequest,
    bulkAddQuestionsSuccess,
    bulkAddQuestionsFailure,
    updateQuestionRequest,
    updateQuestionSuccess,
    updateQuestionFailure,
    deleteQuestionRequest,
    deleteQuestionSuccess,
    deleteQuestionFailure,
    generatePaperRequest,
    generatePaperSuccess,
    generatePaperFailure,
    clearGeneratedPaper,
} = questionBankSlice.actions;

export default questionBankSlice.reducer;
