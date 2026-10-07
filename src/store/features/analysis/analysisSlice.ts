
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Student } from '../students/studentsSlice';

export interface Mark {
    id: string;
    organization_key: string;
    student_id: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject: string;
    test_type: string;
    test_name: string;
    marks_obtained: number;
    total_marks: number;
    test_date: string;
}

interface AnalysisState {
    students: Partial<Student>[];
    marks: Mark[];
    loading: boolean;
    error: string | null;
}

const initialState: AnalysisState = {
    students: [],
    marks: [],
    loading: false,
    error: null,
};

const analysisSlice = createSlice({
    name: 'analysis',
    initialState,
    reducers: {
        uploadMarksRequest: (state, _action: PayloadAction<{ marksData: Omit<Mark, 'id'>[] }>) => {
            state.loading = true;
            state.error = null;
        },
        uploadMarksSuccess: (state) => {
            state.loading = false;
        },
        uploadMarksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        fetchStudentsForClassRequest: (state, _action: PayloadAction<{ organizationKey: string, className: string, sectionName: string, academicYear: string }>) => {
            state.loading = true;
            state.error = null;
        },
        fetchStudentsForClassSuccess: (state, action: PayloadAction<Partial<Student>[]>) => {
            state.loading = false;
            state.students = action.payload;
        },
        fetchStudentsForClassFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    uploadMarksRequest,
    uploadMarksSuccess,
    uploadMarksFailure,
    fetchStudentsForClassRequest,
    fetchStudentsForClassSuccess,
    fetchStudentsForClassFailure,
} = analysisSlice.actions;

export default analysisSlice.reducer;
