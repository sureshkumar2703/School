
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Represents an individual student's result within the JSONB array
export interface StudentMarkEntry {
    student_id: string;
    register_no: string;
    roll_no: string | null;
    student_name: string;
    get_mark: number | null;
    status: 'Pass' | 'Fail' | 'Absent';
}

// Represents the entire row in the 'exam_marks' table
export interface ExamMark {
    id: string;
    organization_key: string;
    staff_code: string;
    exam_id: string;
    exam_title: string;
    total_marks: number;
    class_name: string;
    section_name: string;
    subject: string;
    academic_year: string;
    test_date: string;
    student_marks: StudentMarkEntry[];
}

export interface StudentForExamMarks {
    id: string; // This is the student's primary UUID from the 'students' table
    register_no: string;
    roll_no: string | null;
    full_name: string;
}

export interface FetchStudentsPayload {
    organizationKey: string;
    academicYear: string;
    className: string;
    sectionName: string;
}

// The payload for uploading marks will now be a single object
export interface UploadExamMarksPayload {
    organization_key: string;
    staff_code: string;
    exam_id: string;
    exam_title: string;
    total_marks: number;
    class_name: string;
    section_name: string;
    subject: string;
    academic_year: string;
    test_date: string;
    student_marks: StudentMarkEntry[];
}


interface ExamMarksState {
    students: StudentForExamMarks[];
    allMarks: ExamMark[]; // Changed from marks to allMarks
    loading: boolean;
    error: string | null;
}

const initialState: ExamMarksState = {
    students: [],
    allMarks: [],
    loading: false,
    error: null,
};

const examMarksSlice = createSlice({
    name: 'examMarks',
    initialState,
    reducers: {
        uploadExamMarksRequest: (state, _action: PayloadAction<UploadExamMarksPayload>) => {
            state.loading = true;
            state.error = null;
        },
        uploadExamMarksSuccess: (state) => {
            state.loading = false;
        },
        uploadExamMarksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        fetchStudentsByClassRequest: (state, _action: PayloadAction<FetchStudentsPayload>) => {
            state.loading = true;
            state.error = null;
        },
        fetchStudentsByClassSuccess: (state, action: PayloadAction<StudentForExamMarks[]>) => {
            state.loading = false;
            state.students = action.payload;
        },
        fetchStudentsByClassFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
        // New actions to fetch all marks
        fetchAllExamMarksRequest: (state, _action: PayloadAction<string>) => {
            state.loading = true;
            state.error = null;
        },
        fetchAllExamMarksSuccess: (state, action: PayloadAction<ExamMark[]>) => {
            state.loading = false;
            state.allMarks = action.payload;
        },
        fetchAllExamMarksFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    uploadExamMarksRequest,
    uploadExamMarksSuccess,
    uploadExamMarksFailure,
    fetchStudentsByClassRequest,
    fetchStudentsByClassSuccess,
    fetchStudentsByClassFailure,
    fetchAllExamMarksRequest,
    fetchAllExamMarksSuccess,
    fetchAllExamMarksFailure,
} = examMarksSlice.actions;

export default examMarksSlice.reducer;
