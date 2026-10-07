
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RootState as AppRootState } from '../../store';

export interface AcademicCalendar {
  id: string;
  organization_key: string;
  academic_year: string;
  status: 'Active' | 'Inactive';
  is_current: boolean;
  created_at?: string;
}

export type AddCalendarPayload = Omit<AcademicCalendar, 'id' | 'created_at' | 'is_current'>;
export type UpdateCalendarPayload = Pick<AcademicCalendar, 'id' | 'status' | 'academic_year' | 'is_current'>;
export type SetCurrentCalendarPayload = { organizationKey: string, calendarId: string };

interface AcademicCalendarState {
  calendars: AcademicCalendar[];
  loading: boolean;
  error: string | null;
}

const initialState: AcademicCalendarState = {
  calendars: [],
  loading: false,
  error: null,
};

const academicCalendarSlice = createSlice({
  name: 'academicCalendar',
  initialState,
  reducers: {
    // Fetch
    fetchAcademicCalendarsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchAcademicCalendarsSuccess: (state, action: PayloadAction<AcademicCalendar[]>) => {
      state.loading = false;
      state.calendars = action.payload;
    },
    fetchAcademicCalendarsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addAcademicCalendarRequest: (state, _action: PayloadAction<AddCalendarPayload>) => {
      state.loading = true;
    },
    addAcademicCalendarSuccess: (state) => {
      state.loading = false;
    },
    addAcademicCalendarFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateAcademicCalendarRequest: (state, _action: PayloadAction<UpdateCalendarPayload>) => {
        state.loading = true;
    },
    updateAcademicCalendarSuccess: (state) => {
        state.loading = false;
    },
    updateAcademicCalendarFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Delete
    deleteAcademicCalendarRequest: (state, _action: PayloadAction<string>) => {
        state.loading = true;
    },
    deleteAcademicCalendarSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.calendars = state.calendars.filter(cal => cal.id !== action.payload);
    },
    deleteAcademicCalendarFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Set Current
    setCurrentAcademicCalendarRequest: (state, _action: PayloadAction<SetCurrentCalendarPayload>) => {
        state.loading = true;
    },
    setCurrentAcademicCalendarSuccess: (state) => {
        state.loading = false;
    },
    setCurrentAcademicCalendarFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    }
  },
});

export const {
    fetchAcademicCalendarsRequest,
    fetchAcademicCalendarsSuccess,
    fetchAcademicCalendarsFailure,
    addAcademicCalendarRequest,
    addAcademicCalendarSuccess,
    addAcademicCalendarFailure,
    updateAcademicCalendarRequest,
    updateAcademicCalendarSuccess,
    updateAcademicCalendarFailure,
    deleteAcademicCalendarRequest,
    deleteAcademicCalendarSuccess,
    deleteAcademicCalendarFailure,
    setCurrentAcademicCalendarRequest,
    setCurrentAcademicCalendarSuccess,
    setCurrentAcademicCalendarFailure,
} = academicCalendarSlice.actions;

export type RootState = AppRootState;
export default academicCalendarSlice.reducer;
