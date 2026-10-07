
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Homework {
    id: string; // Changed to non-optional as DB generates it
    organization_key: string;
    staff_code: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject: string;
    homework_items: string[];
    homework_date: string;
    created_at?: string; // Add created_at
}

export type AddHomeworkPayload = Omit<Homework, 'id' | 'created_at'>;

interface HomeworkState {
  homework: Homework[];
  loading: boolean;
  error: string | null;
}

const initialState: HomeworkState = {
  homework: [],
  loading: false,
  error: null,
};

const homeworkSlice = createSlice({
  name: 'homework',
  initialState,
  reducers: {
    addHomeworkRequest: (state, _action: PayloadAction<AddHomeworkPayload>) => {
      state.loading = true;
      state.error = null;
    },
    addHomeworkSuccess: (state, action: PayloadAction<Homework>) => {
      state.loading = false;
      state.homework.unshift(action.payload);
    },
    addHomeworkFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    fetchHomeworkRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
        state.error = null;
    },
    fetchHomeworkSuccess: (state, action: PayloadAction<Homework[]>) => {
        state.loading = false;
        state.homework = action.payload;
    },
    fetchHomeworkFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
  addHomeworkRequest,
  addHomeworkSuccess,
  addHomeworkFailure,
  fetchHomeworkRequest,
  fetchHomeworkSuccess,
  fetchHomeworkFailure,
} = homeworkSlice.actions;

export default homeworkSlice.reducer;
