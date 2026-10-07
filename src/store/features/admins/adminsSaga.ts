
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  fetchAdminsRequest,
  fetchAdminsSuccess,
  fetchAdminsFailure,
  addAdminRequest,
  addAdminSuccess,
  addAdminFailure,
  updateAdminRequest,
  updateAdminSuccess,
  updateAdminFailure,
  deleteAdminRequest,
  deleteAdminSuccess,
  deleteAdminFailure,
} from './adminsSlice';
import { message } from 'antd';

function* handleFetchAdmins() {
  try {
    // Reading can be done with the public client
    const { data, error } = yield call(() => supabase.from('admin_data').select('*').order('created_at'));
    if (error) throw error;
    yield put(fetchAdminsSuccess(data));
  } catch (err: any) {
    yield put(fetchAdminsFailure(err.message));
  }
}

function* handleAddAdmin(action: ReturnType<typeof addAdminRequest>) {
  try {
    const { email, password, ...adminDetails } = action.payload;

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }
    
    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = yield call(() =>
        supabase.auth.signUp({ email, password })
    );

    if (authError) throw authError;
    if (!authData.user) throw new Error("Could not create authentication user.");

    // Step 2: Insert into admin_data table, including the password and auth user ID
    const payloadToInsert = {
      ...adminDetails,
      id: authData.user.id, // Use the ID from the newly created auth user
      email: email,
      password: password, // Save the password to the table
      status: 'Inactive',
    };

    const { error: dbError } = yield call(() => supabase.from('admin_data').insert([payloadToInsert]));

    if (dbError) {
      console.error("DB insert failed after auth user creation. Manual cleanup of auth user may be required:", authData.user.id);
      throw dbError;
    }
    
    yield put(addAdminSuccess());
    message.success("Admin created successfully! They must be activated by a superadmin.");
    yield put(fetchAdminsRequest()); // Refetch

  } catch (err: any) {
    yield put(addAdminFailure(err.message));
    message.error(`Failed to add admin: ${err.message}`);
  }
}

function* handleUpdateAdmin(action: ReturnType<typeof updateAdminRequest>) {
  try {
    const { password, ...updateData } = action.payload;
    // We don't handle password changes here. This is a complex and sensitive operation.
    if (password) {
        console.warn("Password updates are not handled in this form.");
    }

    const { error } = yield call(() =>
      supabase.from('admin_data').update(updateData).eq('id', updateData.id)
    );
    if (error) throw error;
    yield put(updateAdminSuccess());
    yield put(fetchAdminsRequest()); // Refetch
  } catch (err: any) {
    yield put(updateAdminFailure(err.message));
  }
}

function* handleDeleteAdmin(action: ReturnType<typeof deleteAdminRequest>) {
  try {
    const adminId = action.payload;

    // This is a simplified delete. In a real-world scenario, you would need
    // to use a service role key on a secure backend to delete the auth.users record.
    // The client-side cannot delete users from the auth schema.
    console.warn(`Attempting to delete admin ${adminId}. The corresponding auth user cannot be deleted from the client and may require manual cleanup.`);

    const { error: dbError } = yield call(() => supabase.from('admin_data').delete().eq('id', adminId));
    if (dbError) throw dbError;

    yield put(deleteAdminSuccess(adminId));
    message.success('Admin record deleted successfully!');

  } catch (err: any) {
    message.error(err.message);
    yield put(deleteAdminFailure(err.message));
  }
}


function* adminsSaga() {
  yield all([
    takeLatest(fetchAdminsRequest.type, handleFetchAdmins),
    takeLatest(addAdminRequest.type, handleAddAdmin),
    takeLatest(updateAdminRequest.type, handleUpdateAdmin),
    takeLatest(deleteAdminRequest.type, handleDeleteAdmin),
  ]);
}

export default adminsSaga;
