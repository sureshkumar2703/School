
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ClassSectionAllocation } from '../class-sections-view/classSectionsViewSlice';


// This is the payload we'll send to the saga. It includes the generated roll_no and status.
export interface RollNoUpdatePayload extends ClassSectionAllocation {
    roll_no: string;
    status: 'Active';
}

interface RollNoState {
  loading: boolean;
  error: string | null;
}

const initialState: RollNoState = {
  loading: false,
  error: null,
};

const rollNoSlice = createSlice({
  name: 'rollNo',
  initialState,
  reducers: {
    generateRollNosRequest: (state, _action: PayloadAction<RollNoUpdatePayload[]>) => {
      state.loading = true;
      state.error = null;
    },
    generateRollNosSuccess: (state) => {
      state.loading = false;
    },
    generateRollNosFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  generateRollNosRequest,
  generateRollNosSuccess,
  generateRollNosFailure,
} = rollNoSlice.actions;

export default rollNoSlice.reducer;
