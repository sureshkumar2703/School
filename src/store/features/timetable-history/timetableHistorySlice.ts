
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ClassTimetable } from '../class-timetables/classTimetablesSlice';

export type { ClassTimetable };

interface TimetableHistoryState {
  timetables: ClassTimetable[];
  loading: boolean;
  error: string | null;
}

const initialState: TimetableHistoryState = {
  timetables: [],
  loading: false,
  error: null,
};

const timetableHistorySlice = createSlice({
  name: 'timetableHistory',
  initialState,
  reducers: {
    fetchTimetablesHistoryRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTimetablesHistorySuccess: (state, action: PayloadAction<ClassTimetable[]>) => {
      state.loading = false;
      state.timetables = action.payload;
    },
    fetchTimetablesHistoryFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchTimetablesHistoryRequest,
  fetchTimetablesHistorySuccess,
  fetchTimetablesHistoryFailure,
} = timetableHistorySlice.actions;

export default timetableHistorySlice.reducer;
