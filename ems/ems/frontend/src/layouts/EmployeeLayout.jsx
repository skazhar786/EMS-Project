import {
  LayoutDashboard, User, ListChecks, CalendarCheck, CalendarOff, Wallet, Bell,
} from 'lucide-react';
import DashboardShell from '../components/common/DashboardShell';

const navItems = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employee/profile', label: 'My Profile', icon: User },
  { to: '/employee/tasks', label: 'My Tasks', icon: ListChecks },
  { to: '/employee/attendance', label: 'My Attendance', icon: CalendarCheck },
  { to: '/employee/leaves', label: 'My Leaves', icon: CalendarOff },
  { to: '/employee/salary', label: 'My Salary', icon: Wallet },
  { to: '/employee/notifications', label: 'Notifications', icon: Bell },
];

export default function EmployeeLayout() {
  return <DashboardShell navItems={navItems} portalLabel="Employee Portal" />;
}
