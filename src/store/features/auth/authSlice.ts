
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  organization_key?: string;
  status?: string; // User's own status
  org_status?: string; // Organization's status
  org_expire_date?: string; // Organization's expiry date
  roll_no?: string; // Student's roll number
  staff_code?: string; // Teacher's staff code
  phone_number?: string; // Teacher's phone number
  phone?: string;
  // Add any other user properties you need from your user profile tables
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Attempt to load the initial state from localStorage
const getInitialState = (): AuthState => {
  try {
    const savedUserJson = localStorage.getItem('user');
    if (savedUserJson) {
      const user = JSON.parse(savedUserJson);
      return {
        user,
        isAuthenticated: true,
        loading: false, // Already have user data, no initial load needed
        error: null,
      };
    }
  } catch (e) {
    console.error("Could not parse user from localStorage", e);
  }

  return {
    user: null,
    isAuthenticated: false,
    loading: true, // Start with loading true to handle initial auth check
    error: null,
  };
};


const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    // This action will trigger the saga to check the session
    checkAuth: (state) => {
      state.loading = true;
    },
    loginRequest: (state, _action: PayloadAction<{ email: string; password: string }>) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<User>) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      state.error = null;
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.error = action.payload;
      localStorage.removeItem('user'); // Also clear on failure
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('user'); // Ensure local storage is cleared
    },
    // Action to be called when auth check is complete but user is not logged in
    authCheckCompleted: (state) => {
      state.loading = false;
    }
  },
});

export const {
  checkAuth,
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  authCheckCompleted,
} = authSlice.actions;

export default authSlice.reducer;
