
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// This interface matches the new, normalized table structure
export interface ClassSectionAllocation {
  id: string;
  created_at: string;
  organization_key: string;
  academic_year: string;
  class_name: string;
  section_name: string;
  register_no: string;
  full_name: string;
  roll_no?: string;
  status?: string;
  student_id?: string;
}

interface ClassSectionsViewState {
  allocations: ClassSectionAllocation[];
  loading: boolean;
  error: string | null;
}

const initialState: ClassSectionsViewState = {
  allocations: [],
  loading: false,
  error: null,
};

const classSectionsViewSlice = createSlice({
  name: 'classSectionsView',
  initialState,
  reducers: {
    fetchAllClassSectionsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAllClassSectionsSuccess: (state, action: PayloadAction<ClassSectionAllocation[]>) => {
      state.loading = false;
      state.allocations = action.payload;
    },
    fetchAllClassSectionsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchAllClassSectionsRequest,
  fetchAllClassSectionsSuccess,
  fetchAllClassSectionsFailure,
} = classSectionsViewSlice.actions;

export default classSectionsViewSlice.reducer;
