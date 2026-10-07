
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

// For simple text-based homework
export interface Homework {
    id?: string;
    organization_key: string;
    staff_code: string;
    academic_year: string;
    class_name: string;
    section_name: string;
    subject: string;
    homework_items: string[];
    homework_date: string;
}

export type AddHomeworkPayload = Omit<Homework, 'id'>;

// For more complex assignments with individual questions
export interface AssignmentQuestion {
    id: string;
    assignment_id: string;
    question_text: string;
    mark?: number;
}

export interface Assignment {
    id: string;
    organization_key: string;
    teacher_id: string;
    class_name: string;
    section_name: string;
    academic_year: string;
    subject: string;
    total_marks: number;
}

export interface AddAssignmentPayload extends Omit<Assignment, 'id'> {
    questions: Omit<AssignmentQuestion, 'id' | 'assignment_id'>[];
}


interface AssignmentsState {
  loading: boolean;
  error: string | null;
}

const initialState: AssignmentsState = {
  loading: false,
  error: null,
};

const assignmentsSlice = createSlice({
  name: 'assignments',
  initialState,
  reducers: {
    addHomeworkRequest: (state, _action: PayloadAction<AddHomeworkPayload>) => {
      state.loading = true;
      state.error = null;
    },
    addHomeworkSuccess: (state) => {
      state.loading = false;
    },
    addHomeworkFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addAssignmentRequest: (state, _action: PayloadAction<AddAssignmentPayload>) => {
        state.loading = true;
        state.error = null;
    },
    addAssignmentSuccess: (state) => {
        state.loading = false;
    },
    addAssignmentFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
  addHomeworkRequest,
  addHomeworkSuccess,
  addHomeworkFailure,
  addAssignmentRequest,
  addAssignmentSuccess,
  addAssignmentFailure,
} = assignmentsSlice.actions;

export default assignmentsSlice.reducer;

    