
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
    sendNotificationRequest,
    sendNotificationSuccess,
    sendNotificationFailure,
} from './notificationsSlice';
import { message } from 'antd';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function* handleSendNotification(action: ReturnType<typeof sendNotificationRequest>) {
    try {
        const payload = action.payload;
        // This function now only handles sending. It assumes a 'notifications' table exists,
        // but no longer fetches from it, preventing the crash.
        // The user must create the 'notifications' table for the send to succeed.
        const { error } = yield call(() => supabase.from('notifications').insert([payload]));
        if (error) {
            // Provide a more helpful error message to the user.
            if (error.message.includes('relation "public.notifications" does not exist')) {
                 message.error("Sending failed: The 'notifications' table does not exist in the database. Please contact your administrator.", 10);
                 throw new Error("Notifications table not found.");
            }
            throw error;
        };
        yield put(sendNotificationSuccess());
        message.success('Notification sent successfully!');
    } catch (err: any) {
        yield put(sendNotificationFailure(err.message));
        // Don't show generic error if specific one was already shown.
        if (err.message && !err.message.includes("Notifications table not found.")) {
            message.error(`Failed to send notification: ${err.message}`);
        }
    }
}

function* notificationsSaga() {
    yield all([
        takeLatest(sendNotificationRequest.type, handleSendNotification),
    ]);
}

export default notificationsSaga;
