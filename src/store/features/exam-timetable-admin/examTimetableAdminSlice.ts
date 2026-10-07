import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ExamDay {
    subject: string;
    examdate: string;
    examsession: 'FN' | 'AN';
}

export interface ExamTimetable {
    id: string;
    organization_key: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    exam_title: string;
    exam_time: string;
    exam_total_mark: number;
    exam_days: ExamDay[];
    created_by: string;
}

interface ExamTimetableAdminState {
    timetables: ExamTimetable[];
    loading: boolean;
    error: string | null;
}

const initialState: ExamTimetableAdminState = {
    timetables: [],
    loading: false,
    error: null,
};

const examTimetableAdminSlice = createSlice({
    name: 'examTimetableAdmin',
    initialState,
    reducers: {
        createExamTimetableRequest: (state, _action: PayloadAction<Omit<ExamTimetable, 'id'>>) => {
            state.loading = true;
            state.error = null;
        },
        createExamTimetableSuccess: (state) => {
            state.loading = false;
        },
        createExamTimetableFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        fetchExamTimetablesRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchExamTimetablesSuccess: (state, action: PayloadAction<ExamTimetable[]>) => {
            state.loading = false;
            state.timetables = action.payload;
        },
        fetchExamTimetablesFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        updateExamTimetableRequest: (state, _action: PayloadAction<ExamTimetable>) => {
            state.loading = true;
            state.error = null;
        },
        updateExamTimetableSuccess: (state) => {
            state.loading = false;
        },
        updateExamTimetableFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    createExamTimetableRequest,
    createExamTimetableSuccess,
    createExamTimetableFailure,
    fetchExamTimetablesRequest,
    fetchExamTimetablesSuccess,
    fetchExamTimetablesFailure,
    updateExamTimetableRequest,
    updateExamTimetableSuccess,
    updateExamTimetableFailure,
} = examTimetableAdminSlice.actions;

export default examTimetableAdminSlice.reducer;
