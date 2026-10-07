
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Question } from '../question-bank/questionBankSlice';

export interface DefinedUnit {
    unit_name: string; // e.g., "1" or "Introduction"
    unit_title?: string; // e.g., "The Living World"
}

export interface TemplatePart {
    part_name: string;
    unit_name?: string; // Now references a DefinedUnit by its name
    num_questions: number;
    marks_per_question: number;
}

export interface Template {
    id: string;
    organization_key: string;
    staff_code: string;
    template_name: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject_code: string;
    total_marks: number;
    units: DefinedUnit[];
    template_parts: TemplatePart[];
    created_at?: string;
}

export type AddTemplatePayload = Omit<Template, 'id' | 'created_at'>;

export interface GeneratePaperPayload {
    template: Template;
}

export interface GeneratedPaper {
    template: Template;
    paper: Record<string, Question[]>; // e.g., { "A": [question1, question2], "B": [question3] }
}

interface QuestionPaperTemplatesState {
    templates: Template[];
    generatedPaper: GeneratedPaper | null;
    loading: boolean;
    error: string | null;
}

const initialState: QuestionPaperTemplatesState = {
    templates: [],
    generatedPaper: null,
    loading: false,
    error: null,
};

const questionPaperTemplatesSlice = createSlice({
    name: 'questionPaperTemplates',
    initialState,
    reducers: {
        // Fetch
        fetchTemplatesRequest: (state, _action: PayloadAction<{ organizationKey: string, staffCode: string }>) => {
            state.loading = true;
            state.error = null;
        },
        fetchTemplatesSuccess: (state, action: PayloadAction<Template[]>) => {
            state.loading = false;
            state.templates = action.payload;
        },
        fetchTemplatesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addTemplateRequest: (state, _action: PayloadAction<AddTemplatePayload>) => {
            state.loading = true;
        },
        addTemplateSuccess: (state) => {
            state.loading = false;
        },
        addTemplateFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Bulk Add
        bulkAddTemplatesRequest: (state, _action: PayloadAction<AddTemplatePayload[]>) => {
            state.loading = true;
        },
        bulkAddTemplatesSuccess: (state) => {
            state.loading = false;
        },
        bulkAddTemplatesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteTemplateRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteTemplateSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.templates = state.templates.filter(t => t.id !== action.payload);
        },
        deleteTemplateFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Generate Paper
        generatePaperRequest: (state, _action: PayloadAction<GeneratePaperPayload>) => {
            state.loading = true;
            state.error = null;
            state.generatedPaper = null; // Clear previous paper
        },
        generatePaperSuccess: (state, action: PayloadAction<GeneratedPaper>) => {
            state.loading = false;
            state.generatedPaper = action.payload;
        },
        generatePaperFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchTemplatesRequest,
    fetchTemplatesSuccess,
    fetchTemplatesFailure,
    addTemplateRequest,
    addTemplateSuccess,
    addTemplateFailure,
    bulkAddTemplatesRequest,
    bulkAddTemplatesSuccess,
    bulkAddTemplatesFailure,
    deleteTemplateRequest,
    deleteTemplateSuccess,
    deleteTemplateFailure,
    generatePaperRequest,
    generatePaperSuccess,
    generatePaperFailure,
} = questionPaperTemplatesSlice.actions;

export default questionPaperTemplatesSlice.reducer;
