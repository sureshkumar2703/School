
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  saveClassSectionRequest,
  saveClassSectionSuccess,
  saveClassSectionFailure,
  fetchAllocationsRequest,
  fetchAllocationsSuccess,
  fetchAllocationsFailure,
  updateAllocationRequest,
  updateAllocationSuccess,
  updateAllocationFailure,
  type FetchAllocationsPayload,
} from './classSectionsSlice';
import { message } from 'antd';

// Saga to save the individual student allocations
function* handleSaveClassSection(action: ReturnType<typeof saveClassSectionRequest>) {
  try {
    const allocations = action.payload;

    // Use upsert to either insert a new allocation or update an existing one
    // based on the unique constraint (org, year, register_no)
    const { error } = yield call(() =>
      supabase
        .from('class_section_allocations')
        .upsert(allocations, { onConflict: 'organization_key,academic_year,register_no' })
    );

    if (error) {
      throw error;
    }

    yield put(saveClassSectionSuccess());
    message.success(`${allocations.length} student(s) allocated successfully!`);

    // After saving, refetch the allocations for the current view
    if (allocations.length > 0) {
        yield put(fetchAllocationsRequest({
            organizationKey: allocations[0].organization_key,
            className: allocations[0].class_name,
            academicYear: allocations[0].academic_year,
        }));
    }

  } catch (err: any) {
    message.error(`Failed to save section allocation: ${err.message}`);
    yield put(saveClassSectionFailure(err.message));
  }
}

// Saga to fetch all existing allocations for a given class and academic year
function* handleFetchAllocations(action: ReturnType<typeof fetchAllocationsRequest>) {
    try {
        const { organizationKey, className, academicYear } = action.payload as FetchAllocationsPayload;
        const { data, error } = yield call(() =>
            supabase
                .from('class_section_allocations')
                .select('*')
                .eq('organization_key', organizationKey)
                .eq('class_name', className)
                .eq('academic_year', academicYear)
        );
        if (error) throw error;
        yield put(fetchAllocationsSuccess(data));
    } catch (err: any) {
        yield put(fetchAllocationsFailure(err.message));
    }
}

// Saga to update a single student's section
function* handleUpdateAllocation(action: ReturnType<typeof updateAllocationRequest>) {
    try {
        const { id, ...updateData } = action.payload;
        const { data, error } = yield call(() => 
            supabase
                .from('class_section_allocations')
                .update({ section_name: updateData.section_name })
                .eq('id', id)
                .select()
                .single()
        );

        if (error) throw error;
        
        yield put(updateAllocationSuccess(data));
        message.success("Student's section updated successfully!");

    } catch (err: any) {
        message.error(`Failed to update section: ${err.message}`);
        yield put(updateAllocationFailure(err.message));
    }
}


function* classSectionsSaga() {
  yield all([
    takeLatest(saveClassSectionRequest.type, handleSaveClassSection),
    takeLatest(fetchAllocationsRequest.type, handleFetchAllocations),
    takeLatest(updateAllocationRequest.type, handleUpdateAllocation),
  ]);
}

export default classSectionsSaga;
