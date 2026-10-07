

/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all, select } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import {
  fetchStudentsRequest,
  fetchStudentsSuccess,
  fetchStudentsFailure,
  addStudentRequest,
  addStudentSuccess,
  addStudentFailure,
  updateStudentRequest,
  updateStudentSuccess,
  updateStudentFailure,
  deleteStudentRequest,
  deleteStudentSuccess,
  deleteStudentFailure,
  bulkDeleteStudentsRequest,
  bulkDeleteStudentsSuccess,
  bulkDeleteStudentsFailure,
  bulkAddStudentsRequest,
  bulkAddStudentsSuccess,
  bulkAddStudentsFailure,
  type AddStudentPayload,
  type Student,
} from './studentsSlice';
import { message, Modal } from 'antd';
import type { RootState } from '../../store';
import React from 'react';

const extractClassNumber = (className: string | undefined): number => {
    if (!className) return Infinity; // Put students with no class at the end
    const match = className.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
};

// This function now directly inserts the student into the database.
function* createStudent(studentData: AddStudentPayload) {
    const { password, ...studentDetails } = studentData;

    if (!studentDetails.email) {
        throw new Error("Email is required for student creation.");
    }
    
    // Ensure the password is a string, whether from the file or auto-generated.
    const finalPassword = String(password || `pass@${Math.floor(10000 + Math.random() * 90000)}`);

    // The user has indicated they want to create an auth user.
    // We will attempt this, knowing it may fail without a secure backend call.
    // Supabase Admin SDK is not used here, so we are relying on RLS and public API.
    const { data: authData, error: authError } = yield call(
        () => supabase.auth.signUp({
            email: studentDetails.email!,
            password: finalPassword,
        })
    );

    if (authError) {
        throw new Error(`Auth error for ${studentDetails.email}: ${authError.message}`);
    }
    
    if (!authData.user) {
        throw new Error(`Could not create auth user for ${studentDetails.email}. User object was null.`);
    }


    const finalStudentDetails = {
        ...studentDetails,
        id: authData.user.id, // Use the auth user's ID as the student's primary key
        register_no: studentDetails.register_no || `REG-${uuidv4().slice(0, 8).toUpperCase()}`,
        admission_no: studentDetails.admission_no || `ADM-${Math.floor(100000 + Math.random() * 900000)}`,
        status: studentDetails.status || 'Active',
    };
    
    // We no longer need to save the password in the students table
    delete (finalStudentDetails as any).password;


    const { error: dbError } = yield call(() => supabase.from('students').insert([finalStudentDetails]));
    
    if (dbError) {
        // If the DB insert fails, we should try to clean up the auth user we just created.
        // This requires an admin client, which we don't have securely here.
        // This is a limitation of the current architecture.
        console.error("DB insert failed after creating auth user. Manual cleanup of auth user may be required:", authData.user.id);
        if (dbError.message.includes('unique constraint')) {
            throw new Error(`A student with this email (${studentDetails.email}) already exists.`);
        }
        throw new Error(`DB error: ${dbError.message}.`);
    }
    
    return { ...finalStudentDetails };
}


function* handleFetchStudents(action: ReturnType<typeof fetchStudentsRequest>) {
  try {
    const organizationKey = action.payload;
    if (!organizationKey) {
      yield put(fetchStudentsSuccess([]));
      return;
    }
    
    // Step 1: Fetch all students
    const { data: studentsData, error: studentsError } = yield call(() => 
      supabase.from('students')
        .select('*')
        .eq('organization_key', organizationKey)
        .order('created_at', { ascending: false })
    );
    if (studentsError) throw studentsError;

    // Step 2: Fetch all passport photos from student_documents
    const { data: documentsData, error: documentsError } = yield call(() =>
        supabase.from('student_documents')
            .select('student_id, public_url')
            .eq('organization_key', organizationKey)
            .eq('doc_type', 'Passport Size Photo')
    );
    if (documentsError) throw documentsError;
    
    // Step 3: Create a map of student_id to photo_url
    const photoMap = new Map(documentsData.map((doc: any) => [doc.student_id, doc.public_url]));

    // Step 4: Merge the photo URLs into the student data
    const studentsWithPhotos = studentsData.map((student: Student) => ({
        ...student,
        photo_url: photoMap.get(student.id) || student.photo_url || null // Use doc photo, fallback to existing, then null
    }));
    
    // Perform natural sort on the client side
    const sortedData = studentsWithPhotos.sort((a: Student, b: Student) => {
        const classA = extractClassNumber(a.admitted_class);
        const classB = extractClassNumber(b.admitted_class);

        // Primary sort: by class number
        const classDifference = classA - classB;
        if (classDifference !== 0) {
            return classDifference;
        }

        // Secondary sort: by full name (A-Z)
        const nameA = a.full_name || '';
        const nameB = b.full_name || '';
        return nameA.localeCompare(nameB);
    });

    yield put(fetchStudentsSuccess(sortedData));
  } catch (err: any) {
    yield put(fetchStudentsFailure(err.message));
  }
}

function* handleAddStudent(action: ReturnType<typeof addStudentRequest>) {
  try {
    yield call(createStudent, action.payload);
    yield put(addStudentSuccess());
    message.success('Student added successfully!');
    yield put(fetchStudentsRequest(action.payload.organization_key!));
  } catch (err: any) {
    message.error(err.message);
    yield put(addStudentFailure(err.message));
  }
}

function* handleUpdateStudent(action: ReturnType<typeof updateStudentRequest>) {
  try {
    const { id, password, ...restOfPayload } = action.payload;

    if (password) {
        // We need an admin client to update user passwords.
        // This is not available securely on the client.
        // We will skip password updates from this flow.
        console.warn("Password updates from the student form are not supported in this architecture.");
    }
    
    // Remove password from the object being sent to the DB
    const updatePayload = { ...restOfPayload };
    delete (updatePayload as any).password;

    const { error: dbError } = yield call(() =>
      supabase.from('students').update(updatePayload).eq('id', id)
    );
    
    if (dbError) {
      throw dbError;
    }

    yield put(updateStudentSuccess());
    message.success('Student updated successfully.');
    yield put(fetchStudentsRequest(restOfPayload.organization_key!));

  } catch (err: any) {
    message.error(err.message);
    yield put(updateStudentFailure(err.message));
  }
}

function* handleDeleteStudent(action: ReturnType<typeof deleteStudentRequest>) {
  try {
    const studentId = action.payload;

    // This also requires an admin client to delete a user from auth.
    // This will fail without a secure backend context.
    console.warn("Student record will be deleted, but the corresponding auth user may need to be manually deleted in your Supabase dashboard.");

    // Delete related data first
    yield call(() => supabase.from('student_documents').delete().eq('student_id', studentId));
    yield call(() => supabase.from('student_attendance').delete().eq('student_id', studentId));

    // Now, delete the student record itself
    const { error: dbError } = yield call(() => supabase.from('students').delete().eq('id', studentId));
    if (dbError) throw dbError;

    yield put(deleteStudentSuccess(studentId));
    message.success('Student and all related data deleted successfully!');

  } catch (err: any) {
    message.error(err.message);
    yield put(deleteStudentFailure(err.message));
  }
}

function* handleBulkDeleteStudents(action: ReturnType<typeof bulkDeleteStudentsRequest>) {
  try {
    const studentIds = action.payload;
    const { error } = yield call(() => supabase.from('students').delete().in('id', studentIds));
    if (error) throw error;
    yield put(bulkDeleteStudentsSuccess(studentIds));
  } catch (err: any) {
    yield put(bulkDeleteStudentsFailure(err.message));
  }
}


function* handleBulkAddStudents(action: ReturnType<typeof bulkAddStudentsRequest>) {
    const studentsToUpload = action.payload;
    const successes: any[] = [];
    const failures: { name: string; error: string }[] = [];
    const duplicates: string[] = [];

    // Get existing students from the state to check for duplicates
    const existingStudents: Student[] = yield select((state: RootState) => state.students.students);
    const existingEmails = new Set(existingStudents.map(s => s.email));

    for (const student of studentsToUpload) {
        if (!student.email) {
            failures.push({ name: student.full_name || 'Unknown', error: 'Missing email address.' });
            continue;
        }

        if (existingEmails.has(student.email)) {
            duplicates.push(student.full_name || student.email);
            continue;
        }

        try {
            yield call(createStudent, student);
            successes.push(student);
            existingEmails.add(student.email); // Add to set to prevent duplicate adds from same sheet
        } catch (e: any) {
            failures.push({ name: student.full_name || student.email || 'Unknown', error: e.message });
        }
    }

    if (successes.length > 0 && studentsToUpload[0]?.organization_key) {
        yield put(fetchStudentsRequest(studentsToUpload[0].organization_key));
    }
    
    yield put(bulkAddStudentsSuccess({ successes, failures, duplicates }));

    let modalMessage = ``;
    if (successes.length > 0) {
        modalMessage += `Successfully uploaded and created auth users for ${successes.length} new students.\n\n`;
    }
    if (duplicates.length > 0) {
        modalMessage += `Skipped ${duplicates.length} duplicate students (based on email).\n\n`;
    }
    if (failures.length > 0) {
        const failureContent = failures.map((f, i) => `${i + 1}. ${f.name}: ${f.error}`).join('\n');
        modalMessage += `Failed to upload ${failures.length} students:\n${failureContent}`;
    }

    if(modalMessage) {
        Modal.info({
            title: 'Bulk Upload Complete',
            content: React.createElement('pre', { style: { whiteSpace: 'pre-wrap' } }, modalMessage),
            width: 600,
        });
    } else {
        message.info("No new students were uploaded.");
    }
}


// Watcher Saga
function* studentsSaga() {
  yield all([
    takeLatest(fetchStudentsRequest.type, handleFetchStudents),
    takeLatest(addStudentRequest.type, handleAddStudent),
    takeLatest(updateStudentRequest.type, handleUpdateStudent),
    takeLatest(deleteStudentRequest.type, handleDeleteStudent),
    takeLatest(bulkDeleteStudentsRequest.type, handleBulkDeleteStudents),
    takeLatest(bulkAddStudentsRequest.type, handleBulkAddStudents),
  ]);
}

export default studentsSaga;
