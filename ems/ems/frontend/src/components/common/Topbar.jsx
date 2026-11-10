import { LogOut, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';

export default function Topbar({ collapsed, onToggleCollapse, onOpenMobile }) {
  const { user, employee, logout } = useAuth();
  const displayName = employee?.fullName || 'Administrator';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMobile}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <button
          onClick={onToggleCollapse}
          className="hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right leading-tight sm:block">
          <p className="text-sm font-medium text-slate-900">{displayName}</p>
          <p className="text-xs capitalize text-slate-500">{user?.role?.toLowerCase()}</p>
        </div>
        <Avatar name={displayName} src={employee?.profilePicture} size="sm" />
        <button onClick={logout} className="btn-secondary !px-3" title="Log out">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
