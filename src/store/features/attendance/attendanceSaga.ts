/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAttendanceRequest,
  fetchAttendanceSuccess,
  fetchAttendanceFailure,
  markForenoonAttendanceRequest,
  markForenoonAttendanceSuccess,
  markForenoonAttendanceFailure,
  markAfternoonAttendanceRequest,
  markAfternoonAttendanceSuccess,
  markAfternoonAttendanceFailure,
  updateSingleAttendanceRequest,
  updateSingleAttendanceSuccess,
  updateSingleAttendanceFailure,
  type AttendanceRecord,
  type UpdateSingleAttendancePayload,
} from './attendanceSlice';
import { message } from 'antd';
import type { RootState } from '../../store';

function* handleFetchAttendance(action: ReturnType<typeof fetchAttendanceRequest>) {
  try {
    const { organizationKey, date, startDate, endDate, studentIds, className, sectionName, academicYear } = action.payload;

    let query = supabase.from('student_attendance').select('*');

    if (organizationKey) query = query.eq('organization_key', organizationKey);
    if (date) query = query.eq('date', date);
    if (startDate && endDate) query = query.gte('date', startDate).lte('date', endDate);
    if (className) query = query.eq('class', className);
    if (sectionName) query = query.eq('section', sectionName);
    if (academicYear) query = query.eq('academic_year', academicYear);
    
    if (studentIds && studentIds.length > 0) {
        query = query.in('student_id', studentIds);
    }
    
    const { data, error } = yield call(() => query.order('roll_no', { ascending: true, nullsFirst: false }));
    if (error) throw error;
    yield put(fetchAttendanceSuccess(data));
  } catch (err: any) {
    yield put(fetchAttendanceFailure(err.message));
  }
}

function* handleMarkForenoonAttendance(action: ReturnType<typeof markForenoonAttendanceRequest>) {
  try {
    const attendanceData = action.payload;
    if (attendanceData.length === 0) {
      yield put(markForenoonAttendanceSuccess());
      return;
    }
    
    const { error } = yield call(() => 
      supabase.from('student_attendance').upsert(attendanceData, { onConflict: 'student_id, date' })
    );

    if (error) throw error;

    yield put(markForenoonAttendanceSuccess());
    message.success('Forenoon attendance submitted successfully!');
    
    if (attendanceData.length > 0) {
        yield put(fetchAttendanceRequest({
            organizationKey: attendanceData[0].organization_key,
            date: attendanceData[0].date,
            studentIds: attendanceData.map(a => a.student_id),
        }));
    }

  } catch (err: any) {
    message.error(`Failed to submit forenoon attendance: ${err.message}`);
    yield put(markForenoonAttendanceFailure(err.message));
  }
}

function* handleMarkAfternoonAttendance(action: ReturnType<typeof markAfternoonAttendanceRequest>) {
  try {
    const attendanceData = action.payload;
     if (attendanceData.length === 0) {
      yield put(markAfternoonAttendanceSuccess());
      return;
    }
    const recordsToUpdate: Partial<AttendanceRecord>[] = [];

    const studentIds = attendanceData.map(a => a.student_id);
    const date = attendanceData[0]?.date;
    if (!date || studentIds.length === 0) {
        throw new Error("Missing date or student information.");
    }
    
    const { data: existingRecords, error: fetchError } = yield call(() =>
        supabase.from('student_attendance').select('student_id, forenoon_status').eq('date', date).in('student_id', studentIds)
    );
    if (fetchError) throw fetchError;
    
    const forenoonStatusMap = new Map(existingRecords.map((r: any) => [r.student_id, r.forenoon_status]));

    for (const record of attendanceData) {
        const forenoon_status = forenoonStatusMap.get(record.student_id);
        const afternoon_status = record.afternoon_status;

        // If either session is marked as Absent, the overall status is Absent
        const negativeStatuses = ['Absent', 'Cancel'];
        let finalStatus: 'Present' | 'Absent' = 'Present';
        if (negativeStatuses.includes(forenoon_status as string) || negativeStatuses.includes(afternoon_status as string)) {
            finalStatus = 'Absent';
        }
        
        recordsToUpdate.push({
            ...record,
            attendace_status: finalStatus
        });
    }

    const { error } = yield call(() => 
      supabase.from('student_attendance').upsert(recordsToUpdate, { onConflict: 'student_id, date' })
    );
    
    if (error) throw error;

    yield put(markAfternoonAttendanceSuccess());
    message.success('Afternoon attendance submitted successfully!');
    
     if (attendanceData.length > 0) {
        yield put(fetchAttendanceRequest({
            organizationKey: attendanceData[0].organization_key,
            date: attendanceData[0].date,
            studentIds: attendanceData.map(a => a.student_id),
        }));
    }

  } catch (err: any) {
    message.error(`Failed to submit afternoon attendance: ${err.message}`);
    yield put(markAfternoonAttendanceFailure(err.message));
  }
}

function* handleUpdateSingleAttendance(action: ReturnType<typeof updateSingleAttendanceRequest>) {
    try {
        const payload = action.payload as UpdateSingleAttendancePayload;
        
        const { error } = yield call(() =>
            supabase
                .from('student_attendance')
                .upsert(payload, { onConflict: 'student_id, date' })
        );

        if (error) throw error;

        yield put(updateSingleAttendanceSuccess());
        message.success('Attendance updated successfully!');
        
        const academicYear: string | null = yield select((state: RootState) => state.academicCalendar.calendars.find(c => c.is_current)?.academic_year || null);
        const organizationKey: string | null = yield select((state: RootState) => state.auth.user?.organization_key);
        
        if (academicYear && organizationKey) {
            yield put(fetchAttendanceRequest({
                organizationKey: organizationKey,
                academicYear: academicYear,
            }));
        }

    } catch (err: any) {
        message.error(`Failed to update attendance: ${err.message}`);
        yield put(updateSingleAttendanceFailure(err.message));
    }
}

function* attendanceSaga() {
  yield all([
    takeLatest(fetchAttendanceRequest.type, handleFetchAttendance),
    takeLatest(markForenoonAttendanceRequest.type, handleMarkForenoonAttendance),
    takeLatest(markAfternoonAttendanceRequest.type, handleMarkAfternoonAttendance),
    takeLatest(updateSingleAttendanceRequest.type, handleUpdateSingleAttendance),
  ]);
}

export default attendanceSaga;