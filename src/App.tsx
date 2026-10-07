

import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAuth, loginSuccess, logout } from './store/features/auth/authSlice';
import type { RootState, AppDispatch } from './store/store';
import { fetchStudentsRequest } from './store/features/students/studentsSlice';
import { fetchTeachersRequest } from './store/features/teachers/teachersSlice';
import { supabase } from './service/supabaseClient';
import dayjs from 'dayjs';
import { fetchEventsRequest } from './store/features/events/eventsSlice';
import { fetchAcademicCalendarsRequest } from './store/features/academic-calendar/academicCalendarSlice';
import { WifiOutlined } from '@ant-design/icons';
import { Alert, Result } from 'antd';
import { fetchHomeworkRequest } from './store/features/homework/homeworkSlice';
import { fetchHomeworkReportsRequest } from './store/features/homework-report/homeworkReportSlice';


/* Theme variables */
import './theme/variables.css';

const App: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOnline, setIsOnline] = useState(navigator.onLine);


  // This effect runs once on app startup to check for a stored user session.
  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // If there's no user, no need to subscribe
    if (!user) return;

    // --- REALTIME CHECK FOR USER'S OWN STATUS ---
    const getUserTableName = (role: string | undefined) => {
      switch (role) {
        case 'superadmin': return 'superAdmin_data';
        case 'admin': return 'admin_data';
        case 'staff': return 'teachers';
        case 'student': return 'students';
        case 'parent': return 'parents';
        case 'library_staff': return 'library_staff';
        default: return null;
      }
    };

      // 2. Set up a channel to listen for the user's own status changes.
      const userTableName = getUserTableName(user.role);
      let userChannel: any = null;
      if (userTableName) {
          userChannel = supabase
          .channel(`user-status-channel-for-${user.id}`)
          .on(
              'postgres_changes',
              { event: 'UPDATE', schema: 'public', table: userTableName, filter: `id=eq.${user.id}` },
              (payload: any) => {
                if (payload.new && payload.new.status === 'Inactive') {
                    dispatch(logout());
                }
              }
          )
          .subscribe();
      }
        
      // 3. Set up channels for organizational data if the user belongs to an organization.
      let orgChannel: any = null;
      let studentChanges: any = null;
      let teacherChanges: any = null;
      let eventChanges: any = null;
      let academicCalendarChanges: any = null;
      let homeworkChanges: any = null;
      let homeworkReportChanges: any = null;

      if (user.organization_key) {
        // --- INITIAL DATA FETCHING for ALL users in an org ---
        dispatch(fetchAcademicCalendarsRequest(user.organization_key));
        dispatch(fetchEventsRequest(user.organization_key));
        
        if (user.role === 'student' && user.id) {
            dispatch(fetchHomeworkRequest(user.organization_key));
            dispatch(fetchHomeworkReportsRequest({ studentId: user.id }));
        }

        
        // Fetch role-specific initial data
        if (user.role === 'admin' || user.role === 'staff' || user.role === 'superadmin') {
            dispatch(fetchStudentsRequest(user.organization_key));
            dispatch(fetchTeachersRequest(user.organization_key));
            dispatch(fetchHomeworkRequest(user.organization_key));
        }

        // --- REALTIME SUBSCRIPTION FOR ORGANIZATION ---
        orgChannel = supabase
            .channel(`org-status-channel-for-${user.organization_key}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'organizations', filter: `organization_key=eq.${user.organization_key}` },
                (payload: any) => {
                    const orgData = payload.new;
                    if (orgData) {
                        const isExpired = dayjs().isAfter(dayjs(orgData.expire_date));
                        const isInactive = orgData.status !== 'Active';
                        
                        if (isExpired || isInactive) {
                            dispatch(logout());
                        } else {
                            const updatedUser = { ...user, org_status: orgData.status, org_expire_date: orgData.expire_date };
                            dispatch(loginSuccess(updatedUser));
                        }
                    }
                }
            )
            .subscribe();

        // --- REALTIME SUBSCRIPTIONS FOR DATA TABLES ---
        studentChanges = supabase
          .channel('student-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'students', filter: `organization_key=eq.${user.organization_key}` }, 
            () => dispatch(fetchStudentsRequest(user.organization_key!))
          )
          .subscribe();
          
        teacherChanges = supabase
          .channel('teacher-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'teachers', filter: `organization_key=eq.${user.organization_key}` },
            () => dispatch(fetchTeachersRequest(user.organization_key!))
          )
          .subscribe();

        eventChanges = supabase
          .channel('events-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `organization_key=eq.${user.organization_key}` },
            () => dispatch(fetchEventsRequest(user.organization_key!))
          )
          .subscribe();

        academicCalendarChanges = supabase
          .channel('academic-calendar-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_year', filter: `organization_key=eq.${user.organization_key}` },
            () => dispatch(fetchAcademicCalendarsRequest(user.organization_key!))
          )
          .subscribe();
        
        homeworkChanges = supabase
          .channel('homework-db-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'homework', filter: `organization_key=eq.${user.organization_key}` },
            () => {
                if(user.role === 'student' || user.role === 'admin' || user.role === 'staff'){
                    dispatch(fetchHomeworkRequest(user.organization_key!))
                }
            }
          )
          .subscribe();
          
        if (user.id) {
          homeworkReportChanges = supabase
            .channel('homework-report-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_report', filter: `student_id=eq.${user.id}` },
              () => {
                  if(user.role === 'student'){
                     dispatch(fetchHomeworkReportsRequest({ studentId: user.id! }));
                  }
              }
            )
            .subscribe();
        }

      }


    // Cleanup function to remove the channels when the component unmounts or user changes
    return () => {
      if(userChannel) supabase.removeChannel(userChannel);
      if (orgChannel) supabase.removeChannel(orgChannel);
      if (studentChanges) supabase.removeChannel(studentChanges);
      if (teacherChanges) supabase.removeChannel(teacherChanges);
      if (eventChanges) supabase.removeChannel(eventChanges);
      if (academicCalendarChanges) supabase.removeChannel(academicCalendarChanges);
      if (homeworkChanges) supabase.removeChannel(homeworkChanges);
      if (homeworkReportChanges) supabase.removeChannel(homeworkReportChanges);
    };

  }, [user, dispatch]);


  if (!isOnline) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <Result
          icon={<WifiOutlined />}
          title="You are offline"
          subTitle="Please check your internet connection. Some features may not be available."
        />
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

export default App;
