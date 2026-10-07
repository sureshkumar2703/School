
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface StudentPromotionsState {
  loading: boolean;
  error: string | null;
}

const initialState: StudentPromotionsState = {
  loading: false,
  error: null,
};

const studentPromotionsSlice = createSlice({
  name: 'studentPromotions',
  initialState,
  reducers: {
    promoteStudentsRequest: (state, _action: PayloadAction<{ studentIds: string[], newClass: string, newAcademicYear: string }>) => {
      state.loading = true;
      state.error = null;
    },
    promoteStudentsSuccess: (state) => {
      state.loading = false;
    },
    promoteStudentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  promoteStudentsRequest,
  promoteStudentsSuccess,
  promoteStudentsFailure,
} = studentPromotionsSlice.actions;

export default studentPromotionsSlice.reducer;
