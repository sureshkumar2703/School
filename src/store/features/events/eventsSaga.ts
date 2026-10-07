
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
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
  type AddEventPayload,
  type UpdateEventPayload,
} from './eventsSlice';
import { message } from 'antd';
import type { RootState } from '../../store';

const BUCKET_NAME = 'event-images';

function* handleFetchEvents(action: ReturnType<typeof fetchEventsRequest>) {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() => 
        supabase
            .from('events')
            .select('*')
            .eq('organization_key', organizationKey)
            .order('event_date', { ascending: false })
    );
    if (error) throw error;
    yield put(fetchEventsSuccess(data));
  } catch (err: any) {
    yield put(fetchEventsFailure(err.message));
  }
}

function* handleAddEvent(action: ReturnType<typeof addEventRequest>): Generator<any, void, any> {
  try {
    const { file, organizationKey, ...eventData } = action.payload as AddEventPayload;
    const user = yield select((state: RootState) => state.auth.user);
    
    if (!organizationKey || !user?.id) {
      throw new Error("Organization key or User ID is missing.");
    }
    
    const dataToInsert: any = {
      ...eventData,
      organization_key: organizationKey,
    };

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `event-${Date.now()}.${fileExt}`;
      const filePath = `${organizationKey}/${user.id}/${fileName}`;

      const { error: uploadError } = yield call(() =>
        supabase.storage.from(BUCKET_NAME).upload(filePath, file)
      );

      if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
      dataToInsert.image_url = urlData.publicUrl;
      dataToInsert.file_path = filePath;
    }

    const { data, error } = yield call(() => 
      supabase.from('events').insert(dataToInsert).select().single()
    );

    if (error) {
       throw new Error(`Database Error: ${error.message}`);
    }
    yield put(addEventSuccess(data));
    message.success("Event added successfully!");

  } catch (err: any) {
    yield put(addEventFailure(err.message));
    message.error(`Failed to add event: ${err.message}`);
  }
}

function* handleUpdateEvent(action: ReturnType<typeof updateEventRequest>): Generator<any, void, any> {
    try {
        const { id, organizationKey, file, old_file_path, ...updateData } = action.payload as UpdateEventPayload;
        const user = yield select((state: RootState) => state.auth.user);
        
        if (!organizationKey || !user?.id) {
            throw new Error("Organization key or User ID is missing.");
        }
            
        const finalUpdateData: any = { ...updateData };

        if (file) {
            // A new file is being uploaded. Delete the old one if it exists.
            if (old_file_path) {
                yield call(() => supabase.storage.from(BUCKET_NAME).remove([old_file_path]));
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `event-${Date.now()}.${fileExt}`;
            const filePath = `${organizationKey}/${user.id}/${fileName}`;

            const { error: uploadError } = yield call(() => 
                supabase.storage.from(BUCKET_NAME).upload(filePath, file)
            );

            if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);
            
            const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            finalUpdateData.image_url = urlData.publicUrl;
            finalUpdateData.file_path = filePath;
        }
        
        const { data, error } = yield call(() =>
            supabase.from('events').update(finalUpdateData).eq('id', id).select().single()
        );

        if (error) {
           throw new Error(`Database Error: ${error.message}`);
        }

        yield put(updateEventSuccess(data));
        message.success("Event updated successfully!");

    } catch (err: any) {
        yield put(updateEventFailure(err.message));
        message.error(`Failed to update event: ${err.message}`);
    }
}

function* handleDeleteEvent(action: ReturnType<typeof deleteEventRequest>) {
  try {
    const { eventId, filePath } = action.payload;

    if (filePath) {
        const { error: storageError } = yield call(() => supabase.storage.from(BUCKET_NAME).remove([filePath]));
        if (storageError) {
             console.error("Could not delete storage file, but proceeding...", storageError.message);
        }
    }

    const { error } = yield call(() => 
        supabase.from('events').delete().eq('id', eventId)
    );
    if (error) throw error;
    yield put(deleteEventSuccess(eventId));
    message.success("Event deleted successfully.");
  } catch (err: any) {
    yield put(deleteEventFailure(err.message));
    message.error(`Failed to delete event: ${err.message}`);
  }
}

function* eventsSaga() {
  yield all([
    takeLatest(fetchEventsRequest.type, handleFetchEvents),
    takeLatest(addEventRequest.type, handleAddEvent),
    takeLatest(updateEventRequest.type, handleUpdateEvent),
    takeLatest(deleteEventRequest.type, handleDeleteEvent),
  ]);
}

export default eventsSaga;
