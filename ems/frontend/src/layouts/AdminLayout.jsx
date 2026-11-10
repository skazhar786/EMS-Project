import {
  LayoutDashboard, Users, Building2, ListChecks, CalendarCheck,
  CalendarOff, Wallet, Bell, Settings,
} from 'lucide-react';
import DashboardShell from '../components/common/DashboardShell';

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
  { to: '/admin/leaves', label: 'Leaves', icon: CalendarOff },
  { to: '/admin/payroll', label: 'Payroll', icon: Wallet },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  return <DashboardShell navItems={navItems} portalLabel="Admin Portal" />;
}
