
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// This is the same interface as in the other slice, but kept separate for clarity.
export interface ClassMapping {
  id: string;
  organization_key: string;
  academic_year: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  teacher_name: string;
  role?: string;
  created_at?: string;
}

interface ClassMappingsViewState {
  mappings: ClassMapping[];
  loading: boolean;
  error: string | null;
}

const initialState: ClassMappingsViewState = {
  mappings: [],
  loading: false,
  error: null,
};

const classMappingsViewSlice = createSlice({
  name: 'classMappingsView',
  initialState,
  reducers: {
    fetchAllMappingsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAllMappingsSuccess: (state, action: PayloadAction<ClassMapping[]>) => {
      state.loading = false;
      state.mappings = action.payload;
    },
    fetchAllMappingsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchAllMappingsRequest,
  fetchAllMappingsSuccess,
  fetchAllMappingsFailure,
} = classMappingsViewSlice.actions;

export default classMappingsViewSlice.reducer;
