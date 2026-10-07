
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Interface matching the 'question_paper' table
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
    paper_content?: string;
    status?: string;
    admin_name?: string;
}

export interface UpdateStatusPayload {
    paperId: string;
    status: 'Confirm' | 'Pending';
    adminName: string;
}

interface QuestionPaperListState {
    papers: QuestionPaper[];
    loading: boolean;
    error: string | null;
}

const initialState: QuestionPaperListState = {
    papers: [],
    loading: false,
    error: null,
};

const questionPaperListSlice = createSlice({
    name: 'questionPaperList',
    initialState,
    reducers: {
        fetchAllQuestionPapersRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchAllQuestionPapersSuccess: (state, action: PayloadAction<QuestionPaper[]>) => {
            state.loading = false;
            state.papers = action.payload;
        },
        fetchAllQuestionPapersFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // Actions for updating status
        updateQuestionPaperStatusRequest: (state, _action: PayloadAction<UpdateStatusPayload>) => {
            state.loading = true;
            state.error = null;
        },
        updateQuestionPaperStatusSuccess: (state, action: PayloadAction<QuestionPaper>) => {
            state.loading = false;
            const index = state.papers.findIndex(p => p.id === action.payload.id);
            if (index !== -1) {
                state.papers[index] = action.payload;
            }
        },
        updateQuestionPaperStatusFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchAllQuestionPapersRequest,
    fetchAllQuestionPapersSuccess,
    fetchAllQuestionPapersFailure,
    updateQuestionPaperStatusRequest,
    updateQuestionPaperStatusSuccess,
    updateQuestionPaperStatusFailure,
} = questionPaperListSlice.actions;

export default questionPaperListSlice.reducer;
