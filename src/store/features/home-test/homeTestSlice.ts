import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Question } from '../question-bank/questionBankSlice';

export interface GenerateHomeTestPayload {
    organizationKey: string;
    staffCode: string;
    academicYear: string;
    className: string;
    sectionName: string;
    subjectCode: string;
    unit: string | number;
    totalMarks: number;
    markTypes: number[];
    class_key: string;
    questionCounts: { [key: string]: number };
}

export interface GeneratedPaper {
    template: GenerateHomeTestPayload;
    paper: Record<string, Question[]>; // e.g., { "5": [question1], "10": [question2, question3] }
}

export interface HomeTest {
    id: string;
    organization_key: string;
    staff_code: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject_code: string;
    unit: string;
    total_marks: number;
    test_date: string;
    questions: Record<string, Question[]>;
}

export type SaveHomeTestPayload = Omit<HomeTest, 'id'>;

export interface FetchHomeTestsPayload {
    organizationKey: string;
    staffCode: string;
}

export interface FetchStudentHomeTestsPayload {
    organizationKey: string;
    className?: string;
    sectionName?: string;
    academicYear?: string;
}


interface HomeTestState {
    generatedPaper: GeneratedPaper | null;
    savedHomeTests: HomeTest[];
    studentHomeTests: HomeTest[]; 
    loading: boolean;
    error: string | null;
}

const initialState: HomeTestState = {
    generatedPaper: null,
    savedHomeTests: [],
    studentHomeTests: [],
    loading: false,
    error: null,
};

const homeTestSlice = createSlice({
    name: 'homeTest',
    initialState,
    reducers: {
        generateHomeTestRequest: (state, _action: PayloadAction<GenerateHomeTestPayload>) => {
            state.loading = true;
            state.error = null;
            state.generatedPaper = null;
        },
        generateHomeTestSuccess: (state, action: PayloadAction<GeneratedPaper>) => {
            state.loading = false;
            state.generatedPaper = action.payload;
        },
        generateHomeTestFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        clearGeneratedPaper: (state) => {
            state.generatedPaper = null;
            state.error = null;
        },
        saveHomeTestRequest: (state, _action: PayloadAction<SaveHomeTestPayload>) => {
            state.loading = true;
            state.error = null;
        },
        saveHomeTestSuccess: (state) => {
            state.loading = false;
        },
        saveHomeTestFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        fetchHomeTestsRequest: (state, _action: PayloadAction<FetchHomeTestsPayload>) => {
            state.loading = true;
            state.error = null;
        },
        fetchHomeTestsSuccess: (state, action: PayloadAction<HomeTest[]>) => {
            state.loading = false;
            state.savedHomeTests = action.payload;
        },
        fetchHomeTestsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        fetchStudentHomeTestsRequest: (state, _action: PayloadAction<FetchStudentHomeTestsPayload>) => {
            state.loading = true;
            state.error = null;
        },
        fetchStudentHomeTestsSuccess: (state, action: PayloadAction<HomeTest[]>) => {
            state.loading = false;
            state.studentHomeTests = action.payload;
        },
        fetchStudentHomeTestsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    generateHomeTestRequest,
    generateHomeTestSuccess,
    generateHomeTestFailure,
    clearGeneratedPaper,
    saveHomeTestRequest,
    saveHomeTestSuccess,
    saveHomeTestFailure,
    fetchHomeTestsRequest,
    fetchHomeTestsSuccess,
    fetchHomeTestsFailure,
    fetchStudentHomeTestsRequest,
    fetchStudentHomeTestsSuccess,
    fetchStudentHomeTestsFailure,
} = homeTestSlice.actions;

export default homeTestSlice.reducer;