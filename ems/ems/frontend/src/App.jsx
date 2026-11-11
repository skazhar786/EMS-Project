import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './routes/ProtectedRoute';
import PageLoader from './components/common/PageLoader';
import AdminLayout from './layouts/AdminLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import Login from './pages/auth/Login';
import SystemStatus from './pages/SystemStatus';
import NotFound from './pages/NotFound';
import AdminDashboard from './pages/admin/Dashboard';
import AdminSettings from './pages/admin/Settings';
import Employees from './pages/admin/Employees';
import EmployeeDetails from './pages/admin/EmployeeDetails';
import Departments from './pages/admin/Departments';
import Tasks from './pages/admin/Tasks';
import AdminAttendance from './pages/admin/Attendance';
import MyAttendance from './pages/employee/MyAttendance';
import AdminLeaves from './pages/admin/Leaves';
import MyLeaves from './pages/employee/MyLeaves';
import AdminPayroll from './pages/admin/Payroll';
import ActivityLog from './pages/admin/ActivityLog';
import MySalary from './pages/employee/MySalary';
import AdminNotifications from './pages/admin/Notifications';
import MyTasks from './pages/employee/MyTasks';
import EmployeeNotifications from './pages/employee/Notifications';
import EmployeeDashboard from './pages/employee/Dashboard';
import EmployeeProfile from './pages/employee/Profile';
import { homePathFor, ROLES } from './utils/roles';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/status" element={<SystemStatus />} />

      {/* Admin portal */}
      <Route
        path="/admin"
        element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><AdminLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="employees/:id" element={<EmployeeDetails />} />
        <Route path="departments" element={<Departments />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="leaves" element={<AdminLeaves />} />
        <Route path="payroll" element={<AdminPayroll />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="activity" element={<ActivityLog />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Employee portal */}
      <Route
        path="/employee"
        element={<ProtectedRoute allowedRoles={[ROLES.EMPLOYEE]}><EmployeeLayout /></ProtectedRoute>}
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<EmployeeDashboard />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="tasks" element={<MyTasks />} />
        <Route path="attendance" element={<MyAttendance />} />
        <Route path="leaves" element={<MyLeaves />} />
        <Route path="salary" element={<MySalary />} />
        <Route path="notifications" element={<EmployeeNotifications />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
