
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
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
} from './academicCalendarSlice';
import type { RootState } from '../../store';
import { message } from 'antd';

function* handleFetchAcademicCalendars(action: ReturnType<typeof fetchAcademicCalendarsRequest>) {
  try {
    const organizationKey = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('academic_year')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('created_at', { ascending: false })
    );
    if (error) throw error;
    yield put(fetchAcademicCalendarsSuccess(data));
  } catch (err: any) {
    yield put(fetchAcademicCalendarsFailure(err.message));
    message.error(`Failed to fetch academic years: ${err.message}`);
  }
}

function* handleAddAcademicCalendar(action: ReturnType<typeof addAcademicCalendarRequest>) {
  try {
    const { error } = yield call(() =>
      supabase.from('academic_year').insert([action.payload])
    );
    if (error) throw error;
    yield put(addAcademicCalendarSuccess());
    message.success('Academic year created successfully!');
    yield put(fetchAcademicCalendarsRequest(action.payload.organization_key));
  } catch (err: any) {
    yield put(addAcademicCalendarFailure(err.message));
    message.error(`Failed to create academic year: ${err.message}`);
  }
}

function* handleUpdateAcademicCalendar(action: ReturnType<typeof updateAcademicCalendarRequest>) {
    try {
        const { id, ...updateData } = action.payload;
        const { error } = yield call(() =>
            supabase
                .from('academic_year')
                .update(updateData)
                .eq('id', id)
        );
        if (error) throw error;
        yield put(updateAcademicCalendarSuccess());
        message.success('Academic year updated successfully!');
        const user: { organization_key?: string } | null = yield select((state: RootState) => state.auth.user);
        if(user?.organization_key) {
            yield put(fetchAcademicCalendarsRequest(user.organization_key));
        }

    } catch (err: any) {
        yield put(updateAcademicCalendarFailure(err.message));
        message.error(`Failed to update academic year: ${err.message}`);
    }
}

function* handleDeleteAcademicCalendar(action: ReturnType<typeof deleteAcademicCalendarRequest>) {
    try {
        const id = action.payload;
        const { error } = yield call(() =>
            supabase.from('academic_year').delete().eq('id', id)
        );
        if (error) throw error;
        yield put(deleteAcademicCalendarSuccess(id));
        message.success('Academic year deleted successfully!');
    } catch (err: any) {
        yield put(deleteAcademicCalendarFailure(err.message));
        message.error(`Failed to delete academic year: ${err.message}`);
    }
}

function* handleSetCurrentAcademicCalendar(action: ReturnType<typeof setCurrentAcademicCalendarRequest>) {
    const { organizationKey, calendarId } = action.payload;
    try {
        // Step 1: Set all to false for the organization
        const { error: unsetError } = yield call(() =>
            supabase
                .from('academic_year')
                .update({ is_current: false })
                .eq('organization_key', organizationKey)
        );
        if (unsetError) throw unsetError;

        // Step 2: Set the selected one to true
        const { error: setError } = yield call(() =>
            supabase
                .from('academic_year')
                .update({ is_current: true })
                .eq('id', calendarId)
        );
        if (setError) throw setError;
        
        yield put(setCurrentAcademicCalendarSuccess());
        message.success("Successfully set the current academic year.");
        yield put(fetchAcademicCalendarsRequest(organizationKey));

    } catch (err: any) {
        yield put(setCurrentAcademicCalendarFailure(err.message));
        message.error(`Failed to set current academic year: ${err.message}`);
    }
}


function* academicCalendarSaga() {
  yield all([
    takeLatest(fetchAcademicCalendarsRequest.type, handleFetchAcademicCalendars),
    takeLatest(addAcademicCalendarRequest.type, handleAddAcademicCalendar),
    takeLatest(updateAcademicCalendarRequest.type, handleUpdateAcademicCalendar),
    takeLatest(deleteAcademicCalendarRequest.type, handleDeleteAcademicCalendar),
    takeLatest(setCurrentAcademicCalendarRequest.type, handleSetCurrentAcademicCalendar),
  ]);
}

export default academicCalendarSaga;
