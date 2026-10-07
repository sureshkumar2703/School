

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, AllEffect, CallEffect } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchTeacherDashboardDataRequest,
  fetchTeacherDashboardDataSuccess,
  fetchTeacherDashboardDataFailure,
} from './teacherDashboardSlice';
import type { PostgrestResponse } from '@supabase/supabase-js';
import type { ClassMapping } from './teacherDashboardSlice';
import type { AcademicCalendar } from '../academic-calendar/academicCalendarSlice';


function* handleFetchTeacherDashboardData(action: ReturnType<typeof fetchTeacherDashboardDataRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    
    // Fetch all mappings and all calendars for the entire organization in parallel
    const [mappingsResponse, calendarsResponse] = yield all([
        call(() =>
            supabase
                .from('class_subject_teacher_mapping')
                .select('id, class_name, section_name, subject_name, teacher_name, academic_year, role')
                .eq('organization_key', organizationKey)
        ),
        call(() =>
            supabase
                .from('academic_year')
                .select('*')
                .eq('organization_key', organizationKey)
        )
    ]);

    const { data: mappings, error: mappingsError } = mappingsResponse;
    const { data: calendars, error: calendarsError } = calendarsResponse;

    if (mappingsError) throw mappingsError;
    if (calendarsError) throw calendarsError;

    yield put(fetchTeacherDashboardDataSuccess({ mappings: mappings || [], calendars: calendars || [] }));
  } catch (err: any) {
    yield put(fetchTeacherDashboardDataFailure(err.message));
  }
}

function* teacherDashboardSaga() {
  yield all([
    takeLatest(fetchTeacherDashboardDataRequest.type, handleFetchTeacherDashboardData),
  ]);
}

export default teacherDashboardSaga;
