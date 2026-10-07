
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ExamTitle {
    id: string;
    created_at: string;
    created_by: string;
    organization_key: string;
    exam_title: string;
    status: 'Active' | 'Inactive';
}

export type AddExamTitlePayload = Omit<ExamTitle, 'id' | 'created_at'>;
export type UpdateExamTitlePayload = Partial<Omit<ExamTitle, 'id' | 'created_at' | 'created_by' | 'organization_key'>> & { id: string };


interface ExamTitleState {
    titles: ExamTitle[];
    loading: boolean;
    error: string | null;
}

const initialState: ExamTitleState = {
    titles: [],
    loading: false,
    error: null,
};

const examTitleSlice = createSlice({
    name: 'examTitle',
    initialState,
    reducers: {
        // Fetch
        fetchExamTitlesRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchExamTitlesSuccess: (state, action: PayloadAction<ExamTitle[]>) => {
            state.loading = false;
            state.titles = action.payload;
        },
        fetchExamTitlesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Add
        addExamTitleRequest: (state, _action: PayloadAction<AddExamTitlePayload>) => {
            state.loading = true;
        },
        addExamTitleSuccess: (state) => {
            state.loading = false;
        },
        addExamTitleFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Update
        updateExamTitleRequest: (state, _action: PayloadAction<UpdateExamTitlePayload>) => {
            state.loading = true;
        },
        updateExamTitleSuccess: (state) => {
            state.loading = false;
        },
        updateExamTitleFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Delete
        deleteExamTitleRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
        },
        deleteExamTitleSuccess: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.titles = state.titles.filter(t => t.id !== action.payload);
        },
        deleteExamTitleFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchExamTitlesRequest,
    fetchExamTitlesSuccess,
    fetchExamTitlesFailure,
    addExamTitleRequest,
    addExamTitleSuccess,
    addExamTitleFailure,
    updateExamTitleRequest,
    updateExamTitleSuccess,
    updateExamTitleFailure,
    deleteExamTitleRequest,
    deleteExamTitleSuccess,
    deleteExamTitleFailure,
} = examTitleSlice.actions;

export default examTitleSlice.reducer;
