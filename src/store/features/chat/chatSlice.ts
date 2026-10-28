
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ChatStudent {
  id: string;
  full_name: string;
  phone?: string;
  photo_url?: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
  last_message_date?: string;
}

export interface FetchStudentsPayload {
    organizationKey: string;
    className: string;
    sectionName: string;
    academicYear: string;
}

interface ChatState {
  students: ChatStudent[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  students: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    fetchStudentsForClassRequest: (state, _action: PayloadAction<FetchStudentsPayload>) => {
      state.loading = true;
      state.error = null;
      state.students = [];
    },
    fetchStudentsForClassSuccess: (state, action: PayloadAction<ChatStudent[]>) => {
      state.loading = false;
      state.students = action.payload;
    },
    fetchStudentsForClassFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    setUnreadCount: (state, action: PayloadAction<number>) => {
      if (state.unreadCount !== action.payload) {
        state.unreadCount = action.payload;
      }
    },
  },
});

export const {
  fetchStudentsForClassRequest,
  fetchStudentsForClassSuccess,
  fetchStudentsForClassFailure,
  setUnreadCount,
} = chatSlice.actions;

export default chatSlice.reducer;

