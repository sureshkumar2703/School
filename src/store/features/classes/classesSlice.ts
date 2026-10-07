
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Class {
  id: string;
  organization_key?: string;
  class_code: string;
  class_name: string;
  section?: string;
  status: 'Active' | 'Inactive';
  created_at?: string;
}

interface ClassesState {
  classes: Class[];
  loading: boolean;
  error: string | null;
}

const initialState: ClassesState = {
  classes: [],
  loading: false,
  error: null,
};

const classesSlice = createSlice({
  name: 'classes',
  initialState,
  reducers: {
    // Fetch
    fetchClassesRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchClassesSuccess: (state, action: PayloadAction<Class[]>) => {
      state.loading = false;
      state.classes = action.payload;
    },
    fetchClassesFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addClassRequest: (state, _action: PayloadAction<Omit<Class, 'id' | 'created_at'>>) => {
      state.loading = true;
    },
    addClassSuccess: (state, action: PayloadAction<Class>) => {
      state.loading = false;
      state.classes.push(action.payload);
    },
    addClassFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateClassRequest: (state, _action: PayloadAction<Class>) => {
        state.loading = true;
    },
    updateClassSuccess: (state, action: PayloadAction<Class>) => {
        state.loading = false;
        const index = state.classes.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
            state.classes[index] = action.payload;
        }
    },
    updateClassFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Delete
    deleteClassRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
    },
    deleteClassSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.classes = state.classes.filter(c => c.id !== action.payload);
    },
    deleteClassFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  fetchClassesRequest,
  fetchClassesSuccess,
  fetchClassesFailure,
  addClassRequest,
  addClassSuccess,
  addClassFailure,
  updateClassRequest,
  updateClassSuccess,
  updateClassFailure,
  deleteClassRequest,
  deleteClassSuccess,
  deleteClassFailure,
} = classesSlice.actions;

export default classesSlice.reducer;
