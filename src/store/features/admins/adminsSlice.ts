
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Admin {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  password?: string;
  organization_key?: string;
  status?: string;
  created_at?: string;
}

interface AdminsState {
  admins: Admin[];
  loading: boolean;
  error: string | null;
}

const initialState: AdminsState = {
  admins: [],
  loading: false,
  error: null,
};

const adminsSlice = createSlice({
  name: 'admins',
  initialState,
  reducers: {
    fetchAdminsRequest: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchAdminsSuccess: (state, action: PayloadAction<Admin[]>) => {
      state.loading = false;
      state.admins = action.payload;
    },
    fetchAdminsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    addAdminRequest: (state, _action: PayloadAction<Omit<Admin, 'id' | 'created_at'>>) => {
      state.loading = true;
    },
    addAdminSuccess: (state) => {
      state.loading = false;
    },
    addAdminFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    updateAdminRequest: (state, _action: PayloadAction<Partial<Admin> & { id: string }>) => {
      state.loading = true;
    },
    updateAdminSuccess: (state) => {
      state.loading = false;
    },
    updateAdminFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    deleteAdminRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
    },
    deleteAdminSuccess: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.admins = state.admins.filter(admin => admin.id !== action.payload);
    },
    deleteAdminFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchAdminsRequest,
  fetchAdminsSuccess,
  fetchAdminsFailure,
  addAdminRequest,
  addAdminSuccess,
  addAdminFailure,
  updateAdminRequest,
  updateAdminSuccess,
  updateAdminFailure,
  deleteAdminRequest,
  deleteAdminSuccess,
  deleteAdminFailure,
} = adminsSlice.actions;

export default adminsSlice.reducer;
