
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Subject {
  id: string;
  organization_key?: string;
  subject_code: string;
  subject_name: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

interface SubjectsState {
  subjects: Subject[];
  loading: boolean;
  error: string | null;
}

const initialState: SubjectsState = {
  subjects: [],
  loading: false,
  error: null,
};

const subjectsSlice = createSlice({
  name: 'subjects',
  initialState,
  reducers: {
    // Fetch
    fetchSubjectsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchSubjectsSuccess: (state, action: PayloadAction<Subject[]>) => {
      state.loading = false;
      state.subjects = action.payload;
    },
    fetchSubjectsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addSubjectRequest: (state, _action: PayloadAction<Omit<Subject, 'id' | 'created_at'>>) => {
      state.loading = true;
    },
    addSubjectSuccess: (state, action: PayloadAction<Subject>) => {
      state.loading = false;
      state.subjects.push(action.payload);
    },
    addSubjectFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateSubjectRequest: (state, _action: PayloadAction<Subject>) => {
        state.loading = true;
    },
    updateSubjectSuccess: (state, action: PayloadAction<Subject>) => {
        state.loading = false;
        const index = state.subjects.findIndex(s => s.id === action.payload.id);
        if (index !== -1) {
            state.subjects[index] = action.payload;
        }
    },
    updateSubjectFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Delete
    deleteSubjectRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
    },
    deleteSubjectSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.subjects = state.subjects.filter(s => s.id !== action.payload);
    },
    deleteSubjectFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  fetchSubjectsRequest,
  fetchSubjectsSuccess,
  fetchSubjectsFailure,
  addSubjectRequest,
  addSubjectSuccess,
  addSubjectFailure,
  updateSubjectRequest,
  updateSubjectSuccess,
  updateSubjectFailure,
  deleteSubjectRequest,
  deleteSubjectSuccess,
  deleteSubjectFailure,
} = subjectsSlice.actions;

export default subjectsSlice.reducer;

    