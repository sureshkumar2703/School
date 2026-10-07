/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Sibling {
  name: string;
  relation: string;
  age: number;
  status: 'Studying' | 'Working' | 'Not Applicable';
  job_title?: string;
  income?: string;
  class?: string;
  school_college?: string;
}

export interface Student {
  id: string;
  organization_key?: string;
  register_no?: string;
  admission_no?: string;
  email?: string;
  password?: string;
  full_name?: string;
  gender?: string;
  dob?: string;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  caste?: string;
  mother_tongue?: string;
  birth_place?: string;
  permanent_address?: string;
  temporary_address?: string;
  city?: string;
  district?: string;
  state?: string;
  pin_code?: string;
  parent_email?: string;
  parent_contact?: string;
  alternate_contact?: string;
  father_name?: string;
  father_occupation?: string;
  father_contact?: string;
  mother_name?: string;
  mother_occupation?: string;
  mother_contact?: string;
  guardian_name?: string;
  guardian_contact?: string;
  family_income?: string;
  previous_school_name?: string;
  last_class_studied?: string;
  board?: string;
  medium?: string;
  result?: string;
  reason_for_leaving?: string;
  height?: string;
  weight?: string;
  vision_test?: string;
  known_allergies?: string;
  medical_history?: string;
  disability?: string;
  extracurricular_skills?: string;
  special_remarks?: string;
  siblings?: Sibling[];
  admitted_class?: string;
  admission_class?: string;
  admission_date?: string;
  admission_type?: string;
  fee_concession?: string;
  status?: string;
  academic_year?: string;
  photo_url?: string;
  notes?: string;
  created_at?: string;
}

export type AddStudentPayload = Omit<Student, 'id' | 'created_at'>;

interface BulkAddSuccessPayload {
    successes: any[];
    failures: { name: string; error: string }[];
    duplicates: string[];
}

interface StudentsState {
  students: Student[];
  loading: boolean;
  error: string | null;
}

const initialState: StudentsState = {
  students: [],
  loading: false,
  error: null,
};

const studentsSlice = createSlice({
  name: 'students',
  initialState,
  reducers: {
    // Fetch
    fetchStudentsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchStudentsSuccess: (state, action: PayloadAction<Student[]>) => {
      state.loading = false;
      state.students = action.payload;
    },
    fetchStudentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addStudentRequest: (state, _action: PayloadAction<AddStudentPayload>) => {
      state.loading = true;
    },
    addStudentSuccess: (state) => {
      state.loading = false;
    },
    addStudentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
     // Bulk Add
    bulkAddStudentsRequest: (state, _action: PayloadAction<AddStudentPayload[]>) => {
      state.loading = true;
    },
    bulkAddStudentsSuccess: (state, _action: PayloadAction<BulkAddSuccessPayload>) => {
      state.loading = false;
    },
    bulkAddStudentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateStudentRequest: (state, _action: PayloadAction<Partial<Student> & { id: string }>) => {
      state.loading = true;
    },
    updateStudentSuccess: (state) => {
      state.loading = false;
    },
    updateStudentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteStudentRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
    },
    deleteStudentSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.students = state.students.filter(student => student.id !== action.payload);
    },
    deleteStudentFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Bulk Delete
    bulkDeleteStudentsRequest: (state, _action: PayloadAction<string[]>) => {
      state.loading = true;
    },
    bulkDeleteStudentsSuccess: (state, action: PayloadAction<string[]>) => {
      state.loading = false;
      const deletedIds = new Set(action.payload);
      state.students = state.students.filter(student => !deletedIds.has(student.id));
    },
    bulkDeleteStudentsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchStudentsRequest,
  fetchStudentsSuccess,
  fetchStudentsFailure,
  addStudentRequest,
  addStudentSuccess,
  addStudentFailure,
  bulkAddStudentsRequest,
  bulkAddStudentsSuccess,
  bulkAddStudentsFailure,
  updateStudentRequest,
  updateStudentSuccess,
  updateStudentFailure,
  deleteStudentRequest,
  deleteStudentSuccess,
  deleteStudentFailure,
  bulkDeleteStudentsRequest,
  bulkDeleteStudentsSuccess,
  bulkDeleteStudentsFailure,
} = studentsSlice.actions;

export default studentsSlice.reducer;

    