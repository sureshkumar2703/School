
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ClassTeacherAssignment {
    class_name: string;
    section_name: string;
    academic_year: string;
    male_students: number;
    female_students: number;
}

export interface TeacherStats {
    totalClasses: number;
    classTeacherAssignment: ClassTeacherAssignment | null; // For the current active year
    allClassTeacherAssignments?: ClassTeacherAssignment[]; // New: For all years
    subjects: string[];
    activeAcademicYear: string | null;
    academicYears: string[];
}

interface FetchStatsPayload {
    organizationKey: string;
    teacherName: string;
}

interface TeacherStatsState {
    stats: TeacherStats;
    loading: boolean;
    error: string | null;
}

const initialState: TeacherStatsState = {
    stats: {
        totalClasses: 0,
        classTeacherAssignment: null,
        allClassTeacherAssignments: [],
        subjects: [],
        activeAcademicYear: null,
        academicYears: [],
    },
    loading: false,
    error: null,
};

const teacherStatsSlice = createSlice({
  name: 'teacherStats',
  initialState,
  reducers: {
    fetchTeacherStatsRequest: (state, _action: PayloadAction<FetchStatsPayload>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTeacherStatsSuccess: (state, action: PayloadAction<TeacherStats>) => {
      state.loading = false;
      state.stats = action.payload;
    },
    fetchTeacherStatsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTeacherStatsRequest,
  fetchTeacherStatsSuccess,
  fetchTeacherStatsFailure,
} = teacherStatsSlice.actions;

export default teacherStatsSlice.reducer;
