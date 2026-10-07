
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Event {
  id: string;
  organization_key: string;
  title: string;
  description: string;
  event_date: string;
  status?: 'Upcoming' | 'Completed' | 'Cancelled';
  image_url?: string;
  file_path?: string; 
  created_at?: string;
}

export interface AddEventPayload {
  organizationKey: string;
  title: string;
  description: string;
  event_date: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  file?: File;
}

export interface UpdateEventPayload {
  id: string;
  organizationKey: string;
  title: string;
  description: string;
  event_date: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  file?: File;
  old_file_path?: string | null;
}

export interface DeleteEventPayload {
  eventId: string;
  filePath?: string | null;
}

interface EventsState {
  events: Event[];
  loading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  events: [],
  loading: false,
  error: null,
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    // Fetch
    fetchEventsRequest: (state, _action: PayloadAction<string>) => {
      state.loading = true;
      state.error = null;
    },
    fetchEventsSuccess: (state, action: PayloadAction<Event[]>) => {
      state.loading = false;
      state.events = action.payload;
    },
    fetchEventsFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Add
    addEventRequest: (state, _action: PayloadAction<AddEventPayload>) => {
      state.loading = true;
    },
    addEventSuccess: (state, action: PayloadAction<Event>) => {
      state.loading = false;
      state.events.unshift(action.payload);
    },
    addEventFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    // Update
    updateEventRequest: (state, _action: PayloadAction<UpdateEventPayload>) => {
        state.loading = true;
    },
    updateEventSuccess: (state, action: PayloadAction<Event>) => {
        state.loading = false;
        const index = state.events.findIndex(e => e.id === action.payload.id);
        if (index !== -1) {
            state.events[index] = action.payload;
        }
    },
    updateEventFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
    // Delete
    deleteEventRequest: (state, _action: PayloadAction<DeleteEventPayload>) => {
        state.loading = true;
    },
    deleteEventSuccess: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.events = state.events.filter(event => event.id !== action.payload);
    },
    deleteEventFailure: (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.error = action.payload;
    },
  },
});

export const {
  fetchEventsRequest,
  fetchEventsSuccess,
  fetchEventsFailure,
  addEventRequest,
  addEventSuccess,
  addEventFailure,
  updateEventRequest,
  updateEventSuccess,
  updateEventFailure,
  deleteEventRequest,
  deleteEventSuccess,
  deleteEventFailure,
} = eventsSlice.actions;

export default eventsSlice.reducer;
