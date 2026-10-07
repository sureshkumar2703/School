
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface TimetableMapping {
  id: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  teacher_name: string;
  academic_year: string;
}

export interface ClassMapping extends TimetableMapping {
  organization_key?: string;
  role?: 'Class Teacher' | 'Subject Teacher';
  created_at?: string;
}

interface ClassMappingsState {
  mappings: ClassMapping[];
  loading: boolean;
  error: string | null;
}

const initialState: ClassMappingsState = {
  mappings: [],
  loading: false,
  error: null,
};

const classMappingsSlice = createSlice({
  name: 'classMappings',
  initialState,
  reducers: {
    // Fetch for class teacher management
    fetchMappingsRequest: (state, _action: PayloadAction<{ className: string; sectionName: string; academicYear: string, organizationKey: string }>) => {
      state.loading = true;
      state.error = null;
    },
    fetchMappingsSuccess: (state, action: PayloadAction<ClassMapping[]>) => {
      state.loading = false;
      state.mappings = action.payload;
    },
    fetchMappingsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Upsert (Create/Update) in bulk
    updateMappingRequest: (state, _action: PayloadAction<{ assignments: Omit<ClassMapping, 'id' | 'created_at'>[] }>) => {
      state.loading = true;
    },
    updateMappingSuccess: (state, _action: PayloadAction<ClassMapping[]>) => {
      state.loading = false;
    },
    updateMappingFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
     // Fetch all possible mappings for the timetable dropdowns
    fetchTimetableMappingsRequest: (state, _action: PayloadAction<{organization_key: string}>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTimetableMappingsSuccess: (state, action: PayloadAction<TimetableMapping[]>) => {
      state.loading = false;
      state.mappings = action.payload;
    },
    fetchTimetableMappingsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchMappingsRequest,
  fetchMappingsSuccess,
  fetchMappingsFailure,
  updateMappingRequest,
  updateMappingSuccess,
  updateMappingFailure,
  fetchTimetableMappingsRequest,
  fetchTimetableMappingsSuccess,
  fetchTimetableMappingsFailure,
} = classMappingsSlice.actions;

export default classMappingsSlice.reducer;
