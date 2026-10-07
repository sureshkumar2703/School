

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchMappingsRequest,
  fetchMappingsSuccess,
  fetchMappingsFailure,
  updateMappingRequest,
  updateMappingSuccess,
  updateMappingFailure,
  fetchTimetableMappingsRequest,
  fetchTimetableMappingsSuccess,
  fetchTimetableMappingsFailure,
} from './classMappingsSlice';
import { message } from 'antd';

function* handleFetchMappings(action: ReturnType<typeof fetchMappingsRequest>) {
  try {
    const { className, sectionName, academicYear, organizationKey } = action.payload;
    const query = supabase.from('class_subject_teacher_mapping')
        .select('*')
        .eq('organization_key', organizationKey)
        .eq('class_name', className)
        .eq('section_name', sectionName)
        .eq('academic_year', academicYear);
        
    const { data, error } = yield call(() => query);
    if (error) throw error;
    yield put(fetchMappingsSuccess(data));
  } catch (err: any) {
    yield put(fetchMappingsFailure(err.message));
  }
}

function* handleUpdateMapping(action: ReturnType<typeof updateMappingRequest>) {
  try {
    const { assignments } = action.payload;
    
    if (assignments.length === 0) {
        yield put(updateMappingSuccess([]));
        message.info("No assignments to save.");
        return;
    }

    const { organization_key, class_name, section_name, academic_year } = assignments[0];

    // Step 1: Delete all existing assignments for this specific class, section, and year.
    // This ensures a clean slate and avoids constraint issues.
    const { error: deleteError } = yield call(() => 
        supabase.from('class_subject_teacher_mapping')
            .delete()
            .eq('organization_key', organization_key)
            .eq('class_name', class_name)
            .eq('section_name', section_name)
            .eq('academic_year', academic_year)
    );

    if (deleteError) {
        message.error(`Failed to clear existing assignments: ${deleteError.message}`);
        throw deleteError;
    }

    // Step 2: Insert the new set of assignments.
    const { data, error: insertError } = yield call(() => 
        supabase.from('class_subject_teacher_mapping')
        .insert(assignments)
        .select()
    );

    if (insertError) {
        message.error(`Failed to save new assignments: ${insertError.message}`);
        throw insertError;
    }

    yield put(updateMappingSuccess(data));
    // Success message moved to the component to allow for form clearing.

  } catch (err: any) {
    yield put(updateMappingFailure(err.message));
  }
}

// This saga fetches the available class/section/subject/teacher combinations
// to populate the dropdowns in the timetable creation UI.
function* handleFetchTimetableMappings(action: ReturnType<typeof fetchTimetableMappingsRequest>) {
  try {
    const { organization_key } = action.payload;
    const { data, error } = yield call(() =>
      supabase
        .from('class_subject_teacher_mapping')
        .select('id, class_name, section_name, subject_name, teacher_name, academic_year')
        .eq('organization_key', organization_key)
    );
    if (error) throw error;
    yield put(fetchTimetableMappingsSuccess(data));
  } catch (err: any) {
    yield put(fetchTimetableMappingsFailure(err.message));
  }
}


function* classMappingsSaga() {
  yield all([
    takeLatest(fetchMappingsRequest.type, handleFetchMappings),
    takeLatest(updateMappingRequest.type, handleUpdateMapping),
    takeLatest(fetchTimetableMappingsRequest.type, handleFetchTimetableMappings),
  ]);
}

export default classMappingsSaga;
