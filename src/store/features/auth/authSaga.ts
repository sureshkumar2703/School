
/* eslint-disable @typescript-eslint/no-explicit-any */
import { call, put, takeLatest, all } from 'redux-saga/effects';
import { supabase } from '../../../service/supabaseClient';
import {
  loginRequest,
  loginSuccess,
  loginFailure,
  logout,
  checkAuth,
  authCheckCompleted,
} from './authSlice';
import { setCurrentPage } from '../navigation/navigationSlice';
import dayjs from 'dayjs';

// Helper to fetch user profile from a specific table by email and password
function* findUserInTable(table: string, email: string, password: string): Generator<any, any, any> {
    // We must select the 'id' field to ensure it's available for the user session
    const { data, error } = yield call(
        () => supabase.from(table).select('*, id').eq('email', email).eq('password', password).single()
    );
    // Do not throw error here, just return null if not found
    if (error || !data) {
        return null;
    }
    return data;
}

const getDashboardPage = (role: string) => {
    switch (role) {
      case 'student': return 'studentdashboard';
      case 'staff': return 'staffdashboard';
      case 'admin': return 'admindashboard';
      case 'superadmin': return 'superadmindashboard';
      case 'parent': return 'parentdashboard';
      case 'library_staff': return 'librarystaffdashboard';
      default: return 'login';
    }
};

const getRoleFromTable = (table: string): string => {
    if (table === 'superAdmin_data') return 'superadmin';
    if (table === 'admin_data') return 'admin';
    if (table === 'teachers') return 'staff';
    if (table === 'students') return 'student';
    if (table === 'parents') return 'parent';
 if (table === 'library_staff') return 'library_staff';
    return '';
}

function* handleLogin(action: ReturnType<typeof loginRequest>): Generator<any, void, any> {
  try {
    const { email, password } = action.payload;
    const tables = ['superAdmin_data', 'admin_data', 'teachers', 'students', 'parents', 'library_staff'];
    let userProfile: any = null;
    let foundRole: string | null = null;

    for (const table of tables) {
      const profile = yield call(findUserInTable, table, email, password);
      if (profile) {
        userProfile = profile;
        foundRole = getRoleFromTable(table);
        break;
      }
    }
    
    if (!userProfile) {
        throw new Error('Invalid email or password.');
    }
    
    if (userProfile.status === 'Inactive') {
        yield put(logout()); // Clear state
        throw new Error('Your account is inactive. Please contact your super admin.');
    }
    
    // For non-superadmins, fetch their organization details and check for expiration
    if (foundRole !== 'superadmin' && userProfile.organization_key) {
        const { data: orgData, error: orgError } = yield call(() => 
            supabase.from('organizations').select('status, expire_date').eq('organization_key', userProfile.organization_key).single()
        );

        if (orgError || !orgData) {
            yield put(logout());
            throw new Error('Could not verify your organization. Please contact support.');
        }

        const isExpired = dayjs().isAfter(dayjs(orgData.expire_date));
        const isInactive = orgData.status !== 'Active';

        if (isExpired || isInactive) {
            yield put(logout());
            throw new Error('Your panel has expired. Please contact the super admin.');
        }

        userProfile.org_status = orgData.status;
        userProfile.org_expire_date = orgData.expire_date;
    }
    
    // If user is a student, fetch their roll number
    if (foundRole === 'student' && userProfile.organization_key && userProfile.register_no && userProfile.academic_year) {
        const { data: allocationData, error: allocationError } = yield call(() =>
            supabase
                .from('class_section_allocations')
                .select('roll_no')
                .eq('organization_key', userProfile.organization_key)
                .eq('register_no', userProfile.register_no)
                .eq('academic_year', userProfile.academic_year)
                .single()
        );
        if (allocationError && allocationError.code !== 'PGRST116') {
            console.error("Error fetching roll number:", allocationError.message);
        }
        if (allocationData) {
            userProfile.roll_no = allocationData.roll_no;
        }
    }


    const userData = { ...userProfile, role: foundRole, name: userProfile.full_name || userProfile.name };
    
    // Save session to localStorage
    localStorage.setItem('user', JSON.stringify(userData));

    yield put(loginSuccess(userData));
    const dashboardPage = getDashboardPage(foundRole as string);
    yield put(setCurrentPage(dashboardPage as any));

  } catch (err: any) {
    yield put(loginFailure(err.message || 'Login failed. Please check your credentials.'));
  }
}

function* handleLogout() {
  try {
    // Clear session from localStorage
    localStorage.removeItem('user');
    yield put(setCurrentPage('login'));
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

function* handleCheckAuth() {
  try {
    // Check for a user session in localStorage
    const savedUserJson = localStorage.getItem('user');
    if (savedUserJson) {
      const savedUser = JSON.parse(savedUserJson);
      // Re-validate the session (optional but good practice)
      // For now, we'll just trust the localStorage data
      yield put(loginSuccess(savedUser));
      const dashboardPage = getDashboardPage(savedUser.role);
      yield put(setCurrentPage(dashboardPage as any));
    }
  } catch (error: any) {
    yield put(loginFailure(error.message));
  } finally {
    yield put(authCheckCompleted());
  }
}

function* authSaga() {
  yield all([
    takeLatest(checkAuth.type, handleCheckAuth),
    takeLatest(loginRequest.type, handleLogin),
    takeLatest(logout.type, handleLogout),
  ]);
}

export default authSaga;
