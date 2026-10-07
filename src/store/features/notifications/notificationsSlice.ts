
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
    id: string;
    created_at: string;
    organization_key: string;
    sender_email?: string;
    recipients?: string[];
    subject?: string;
    body?: string;
    status?: string;
}

export type SendNotificationPayload = Omit<Notification, 'id' | 'created_at'>;

interface NotificationsState {
    notifications: Notification[];
    loading: boolean;
    error: string | null;
}

const initialState: NotificationsState = {
    notifications: [],
    loading: false,
    error: null,
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        // Fetch functionality is removed to prevent errors.
        fetchNotificationsRequest: (state) => {
            state.loading = false;
        },
        fetchNotificationsSuccess: (state) => {
            state.loading = false;
        },
        fetchNotificationsFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },

        // Send Notification
        sendNotificationRequest: (state, _action: PayloadAction<SendNotificationPayload>) => {
            state.loading = true;
            state.error = null;
        },
        sendNotificationSuccess: (state) => {
            state.loading = false;
        },
        sendNotificationFailure: (state, action: PayloadAction<string>) => {
            state.loading = false;
            state.error = action.payload;
        },
    },
});

export const {
    fetchNotificationsRequest,
    fetchNotificationsSuccess,
    fetchNotificationsFailure,
    sendNotificationRequest,
    sendNotificationSuccess,
    sendNotificationFailure,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;
