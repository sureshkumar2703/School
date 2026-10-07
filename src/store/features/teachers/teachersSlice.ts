

/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Teacher {
  id: string; // This is the public.teachers table ID
  staff_code?: string;
  organization_key?: string;
  full_name?: string;
  dob?: string;
  gender?: string;
  email?: string;
  password?: string;
  mobile_number?: string;
  alternate_number?: string;
  permanent_address?: string;
  temporary_address?: string;
  blood_group?: string;
  nationality?: string;
  religion?: string;
  marital_status?: string;
  
  highest_qualification?: string;
  graduation_details?: string;

  designation?: string;
  department?: string;
  experience_years?: number;
  joining_date?: string;
  subjects_handled?: string[];
  
  bank_name?: string;
  branch?: string;
  bank_account_no?: string;
  salary?: string;
  pf_salary?: number;
  total_salary?: number;
  pf_number?: string;
  uan_no?: string;

  photo_url?: string;
  
  status?: 'Active' | 'Inactive';
  remarks?: string;
  aadhar_number?: string;
  pan_number?: string;
  biometric?: string;

  created_at?: string;
  updated_at?: string;
}

interface UpdateAttendancePayload {
    teacherId: string;
    biometric: string;
    organizationKey: string;
}

interface BulkAddSuccessPayload {
    successes: number;
    failures: { name: string; error: string }[];
    duplicates: string[];
}


interface TeachersState {
  teachers: Teacher[];
  loading: boolean;
  error: string | null;
}

const initialState: TeachersState = {
  teachers: [],
  loading: false,
  error: null,
};

const teachersSlice = createSlice({
  name: 'teachers',
  initialState,
  reducers: {
    // Fetch
    fetchTeachersRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchTeachersSuccess: (state, action: PayloadAction<Teacher[]>) => {
      state.loading = false;
      state.teachers = action.payload;
    },
    fetchTeachersFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addTeacherRequest: (state, _action: PayloadAction<Omit<Teacher, 'id' | 'created_at' | 'updated_at'>>) => {
      state.loading = true;
      state.error = null;
    },
    addTeacherSuccess: (state) => {
      state.loading = false;
    },
    addTeacherFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateTeacherRequest: (state, _action: PayloadAction<Partial<Teacher> & { id: string }>) => {
      state.loading = true;
    },
    updateTeacherSuccess: (state) => {
      state.loading = false;
    },
    updateTeacherFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Delete
    deleteTeacherRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
    },
    deleteTeacherSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.teachers = state.teachers.filter(teacher => teacher.id !== action.payload);
    },
    deleteTeacherFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Bulk Delete
    bulkDeleteTeachersRequest: (state, _action: PayloadAction<string[]>) => {
      state.loading = true;
    },
    bulkDeleteTeachersSuccess: (state, action: PayloadAction<string[]>) => {
      state.loading = false;
      const deletedIds = new Set(action.payload);
      state.teachers = state.teachers.filter(teacher => !deletedIds.has(teacher.id));
    },
    bulkDeleteTeachersFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Bulk Add
    bulkAddTeachersRequest: (state, _action: PayloadAction<{ teachers: Omit<Teacher, 'id'>[], organizationKey: string }>) => {
        state.loading = true;
        state.error = null;
    },
    bulkAddTeachersSuccess: (state, _action: PayloadAction<BulkAddSuccessPayload>) => {
        state.loading = false;
    },
    bulkAddTeachersFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Real-time updates
    setTeachers: (state, action: PayloadAction<Teacher[]>) => {
      state.teachers = action.payload;
    },
    // Attendance Update
    updateTeacherAttendanceRequest: (state, _action: PayloadAction<UpdateAttendancePayload>) => {
      // No state change needed here, saga will handle it and refetch
    },
  },
});

export const {
  fetchTeachersRequest,
  fetchTeachersSuccess,
  fetchTeachersFailure,
  addTeacherRequest,
  addTeacherSuccess,
  addTeacherFailure,
  updateTeacherRequest,
  updateTeacherSuccess,
  updateTeacherFailure,
  deleteTeacherRequest,
  deleteTeacherSuccess,
  deleteTeacherFailure,
  bulkDeleteTeachersRequest,
  bulkDeleteTeachersSuccess,
  bulkDeleteTeachersFailure,
  bulkAddTeachersRequest,
  bulkAddTeachersSuccess,
  bulkAddTeachersFailure,
  updateTeacherAttendanceRequest,
  setTeachers,
} = teachersSlice.actions;

export default teachersSlice.reducer;
