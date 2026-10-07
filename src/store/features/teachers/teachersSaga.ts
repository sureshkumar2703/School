

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchTeachersRequest,
  fetchTeachersSuccess,
  fetchTeachersFailure,
  addTeacherRequest,
  addTeacherSuccess,
  addTeacherFailure,
  updateTeacherRequest,
  updateTeacherSuccess,
  updateTeacherFailure,
  deleteTeacherRequest,
  deleteTeacherSuccess,
  deleteTeacherFailure,
  bulkDeleteTeachersRequest,
  bulkDeleteTeachersSuccess,
  bulkDeleteTeachersFailure,
  bulkAddTeachersRequest,
  bulkAddTeachersSuccess,
  bulkAddTeachersFailure,
  updateTeacherAttendanceRequest,
  type Teacher,
} from './teachersSlice';
import { Modal, message } from 'antd';
import type { RootState } from '../../store';
import React from 'react';

const extractClassNumber = (className: string | undefined): number => {
    if (!className) return Infinity; // Put students with no class at the end
    const match = className.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
};

// This function now directly inserts the student into the database.
function* createTeacher(teacherData: Omit<Teacher, 'id' | 'created_at' | 'updated_at'>) {
    const { email, password, ...teacherDetails } = teacherData;

    if (!email) {
        throw new Error("Email is required for teacher creation.");
    }
    const finalPassword = password || teacherDetails.staff_code;
    if (!finalPassword) {
        throw new Error("Password or Staff Code is required.");
    }
    
    // Step 1: Attempt to create the user in Supabase Auth.
    const { data: authData, error: authError } = yield call([supabase.auth, 'signUp'], { email, password: String(finalPassword) });
    
    // Step 2: Handle the result of the signUp attempt
    if (authError) {
        if (authError.message.includes('User already registered')) {
            throw new Error(`A user with the email '${email}' already exists.`);
        }
        throw new Error(authError.message || 'Failed to create authentication user.');
    }

    if (!authData.user) {
        throw new Error('Sign up did not return a user object, but also did not error.');
    }

    // Step 3: Create the teacher record in the database using the auth user's ID
    const teacherPayload = {
        ...teacherDetails,
        id: authData.user.id, // Use the auth user's ID
        email: email,
        organization_key: teacherDetails.organization_key,
        status: teacherDetails.status || 'Active',
    };

    const { error: dbError } = yield call(() => supabase.from('teachers').insert([teacherPayload]));

    if (dbError) {
        // If the DB insert fails, we need to clean up the user we just created in Auth.
        // This requires an admin client, which we don't have securely here.
        // This is a limitation of the current architecture.
        console.error(`DB insert failed for ${email} after auth user creation. Manual cleanup of auth user ${authData.user.id} may be required.`);
        throw new Error(`Failed to save DB record for ${email}: ${dbError.message}.`);
    }

    return { ...teacherPayload };
}


function* handleFetchTeachers(action: ReturnType<typeof fetchTeachersRequest>): Generator<any, void, any> {
  try {
    const organizationKey = action.payload;
    if (!organizationKey) {
        yield put(fetchTeachersSuccess([]));
        return;
    }
    const { data, error } = yield call(() => 
        supabase.from('teachers')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('created_at', { ascending: false })
    );
    if (error) throw error;
    yield put(fetchTeachersSuccess(data));
  } catch (err: any) {
    yield put(fetchTeachersFailure(err.message));
  }
}

function* handleAddTeacher(action: ReturnType<typeof addTeacherRequest>): Generator<any, void, any> {
  try {
    yield call(createTeacher, action.payload);
    yield put(addTeacherSuccess());
    message.success('Teacher added successfully!');
    yield put(fetchTeachersRequest(action.payload.organization_key!));
  } catch (err: any) {
    message.error(err.message);
    yield put(addTeacherFailure(err.message));
  }
}

function* handleBulkAddTeachers(action: ReturnType<typeof bulkAddTeachersRequest>) {
    const { teachers, organizationKey } = action.payload;
    let successCount = 0;
    const failures: { name: string; error: string }[] = [];
    const duplicates: string[] = [];

    if (!organizationKey) {
        yield put(bulkAddTeachersFailure("Organization key not found. Cannot process bulk upload."));
        message.error("Could not identify your organization. Please log out and log in again.");
        return;
    }
    
    if (teachers.length === 0) {
        message.info("The uploaded file is empty or does not contain any data to upload.");
        yield put(bulkAddTeachersFailure("Uploaded file is empty."));
        return;
    }

    for (const teacher of teachers) {
        try {
            const { full_name, email, password, ...teacherData } = teacher;

            if (!full_name || !email || !password) {
                failures.push({ name: full_name || email || 'Unknown', error: 'Missing required fields (Name, Email, Password).' });
                continue;
            }

            // Step 1: Attempt to create the user in Supabase Auth.
            const { data: authData, error: authError } = yield call([supabase.auth, 'signUp'], { email, password: String(password) });

            if (authError) {
                if (authError.message.includes('User already registered')) {
                    duplicates.push(full_name);
                } else {
                    throw new Error(authError.message || 'Failed to create authentication user.');
                }
                continue; // Skip to the next teacher if auth fails for any reason
            }
            
            if (!authData.user) {
                 throw new Error('Sign up did not return a user object, but also did not error.');
            }

            // Step 2: Create the teacher record in the database
            const teacherPayload = {
                ...teacherData,
                id: authData.user.id, // CRITICAL FIX: Use the new auth user's ID
                full_name: full_name,
                email: email,
                staff_code: teacher.staff_code || `ST${Math.floor(100000 + Math.random() * 900000)}`,
                organization_key: organizationKey,
                status: teacher.status || 'Active',
            };
            
            const { error: dbError } = yield call(() => supabase.from('teachers').insert([teacherPayload]));
            
            if (dbError) {
                // If the DB insert fails, we need to clean up the user we just created in Auth.
                // This requires admin privileges not available on the client.
                console.error(`DB insert failed for ${email} after auth user creation. Manual cleanup of auth user ${authData.user.id} may be required.`);
                throw new Error(`Failed to save DB record for ${email}: ${dbError.message}`);
            }
            
            successCount++;

        } catch (err: any) {
            failures.push({ name: teacher.full_name || teacher.email || 'Unknown', error: err.message });
        }
    }

    if (successCount > 0) {
        yield put(fetchTeachersRequest(organizationKey));
    }
    
    yield put(bulkAddTeachersSuccess({ successes: successCount, failures, duplicates }));

    let modalMessage = ``;
    if (successCount > 0) {
        modalMessage += `Successfully uploaded and created auth users for ${successCount} new teachers.\n\n`;
    }
    if (duplicates.length > 0) {
        modalMessage += `Skipped ${duplicates.length} duplicate teachers (based on email).\n\n`;
    }
    if (failures.length > 0) {
        const failureContent = failures.map((f, i) => `${i + 1}. ${f.name}: ${f.error}`).join('\n');
        modalMessage += `Failed to upload ${failures.length} teachers:\n${failureContent}`;
    }

    if (modalMessage) {
        Modal.info({
            title: 'Bulk Upload Complete',
            content: React.createElement('pre', { style: { whiteSpace: 'pre-wrap' } }, modalMessage),
            width: 600,
        });
    } else {
        message.info("No new teachers were uploaded.");
    }

    if (failures.length > 0 && successCount === 0) {
        yield put(bulkAddTeachersFailure("All teachers failed to upload."));
    }
}


function* handleUpdateTeacher(action: ReturnType<typeof updateTeacherRequest>): Generator<any, void, any> {
  try {
    const { id, password, ...restOfPayload } = action.payload;
    const dbPayload: Partial<Teacher> = { ...restOfPayload };
    
    // --- Database Update ---
    const { error: dbError } = yield call(() =>
      supabase.from('teachers').update(dbPayload).eq('id', id)
    );
    
    if (dbError) throw dbError;

    yield put(updateTeacherSuccess());
    message.success(`Teacher details updated successfully.`);
    
    if(restOfPayload.organization_key) {
        yield put(fetchTeachersRequest(restOfPayload.organization_key));
    }


  } catch (err: any) {
    message.error(err.message);
    yield put(updateTeacherFailure(err.message));
  }
}

function* handleDeleteTeacher(action: ReturnType<typeof deleteTeacherRequest>): Generator<any, void, any> {
  try {
    const teacherId = action.payload;
    // First, get the teacher's record to use for deleting related data
    const { data: teacher, error: fetchError } = yield call(() => 
        supabase.from('teachers').select('full_name').eq('id', teacherId).single()
    );
    if (fetchError && fetchError.code !== 'PGRST116') { // Ignore 'not found' error if already deleted
        throw new Error(`Could not fetch teacher to delete: ${fetchError.message}`);
    }

    // Delete related data first
    yield call(() => supabase.from('teacher_documents').delete().eq('teacher_id', teacherId));
    if (teacher?.full_name) {
      yield call(() => supabase.from('class_subject_teacher_mapping').delete().eq('teacher_name', teacher.full_name));
    }
    
    // Delete the teacher record itself
    const { error: dbError } = yield call(() => supabase.from('teachers').delete().eq('id', teacherId));
    if (dbError) throw dbError;

    yield put(deleteTeacherSuccess(teacherId));
    message.success('Teacher and all related data deleted successfully!');

  } catch (err: any) {
    message.error(err.message);
    yield put(deleteTeacherFailure(err.message));
  }
}

function* handleBulkDeleteTeachers(action: ReturnType<typeof bulkDeleteTeachersRequest>): Generator<any, void, any> {
  try {
    const teacherIds = action.payload;
    // Use service client for bulk deletions
    const { error } = yield call(() => supabase.from('teachers').delete().in('id', teacherIds));
    if (error) throw error;
    yield put(bulkDeleteTeachersSuccess(teacherIds));
  } catch (err: any) {
    message.error(err.message);
    yield put(bulkDeleteTeachersFailure(err.message));
  }
}

function* handleUpdateTeacherAttendance(action: ReturnType<typeof updateTeacherAttendanceRequest>): Generator<any, void, any> {
    try {
        const { teacherId, biometric, organizationKey } = action.payload;
        const { error } = yield call(() =>
            supabase.from('teachers').update({ biometric }).eq('id', teacherId)
        );
        if (error) throw error;
        // No success message to keep UI clean during rapid clicks
        // Refetch all teachers for the org to update the list
        yield put(fetchTeachersRequest(organizationKey));
    } catch (err: any) {
        message.error(`Attendance update failed: ${err.message}`);
        // We don't dispatch a failure action here to avoid showing a global error state for a single failed click
    }
}


// Watcher Saga
function* teachersSaga(): Generator {
  yield all([
    takeLatest(fetchTeachersRequest.type, handleFetchTeachers),
    takeLatest(addTeacherRequest.type, handleAddTeacher),
    takeLatest(updateTeacherRequest.type, handleUpdateTeacher),
    takeLatest(deleteTeacherRequest.type, handleDeleteTeacher),
    takeLatest(bulkDeleteTeachersRequest.type, handleBulkDeleteTeachers),
    takeLatest(bulkAddTeachersRequest.type, handleBulkAddTeachers),
    takeLatest(updateTeacherAttendanceRequest.type, handleUpdateTeacherAttendance),
  ]);
}

export default teachersSaga;
