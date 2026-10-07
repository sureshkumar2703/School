
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// Interface for the data we expect from the 'class_notes' table
export interface StudentNote {
  id: string;
  created_at: string;
  teacher_name: string;
  subject: string;
  file_name: string;
  file_url: string;
  file_type?: string; // Added optional file_type
}

export interface FetchStudentNotesPayload {
    organizationKey: string;
    className: string;
    sectionName: string;
    academicYear: string;
}

interface StudentNotesState {
  notes: StudentNote[];
  loading: boolean;
  error: string | null;
}

const initialState: StudentNotesState = {
  notes: [],
  loading: false,
  error: null,
};

const studentNotesSlice = createSlice({
  name: 'studentNotes',
  initialState,
  reducers: {
    fetchStudentNotesRequest: (state, _action: PayloadAction<FetchStudentNotesPayload>) => {
      state.loading = true;
      state.error = null;
    },
    fetchStudentNotesSuccess: (state, action: PayloadAction<StudentNote[]>) => {
      state.loading = false;
      state.notes = action.payload;
    },
    fetchStudentNotesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchStudentNotesRequest,
  fetchStudentNotesSuccess,
  fetchStudentNotesFailure,
} = studentNotesSlice.actions;

export default studentNotesSlice.reducer;
