import { Link, useLocation } from 'react-router-dom';
import { Home, Star, Users, Trash2, type LucideIcon } from 'lucide-react';
import { FileTree } from '../tree/FileTree';

interface SidebarProps {
  onNavigate: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const location = useLocation();

  const navItem = (to: string, label: string, Icon: LucideIcon) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        onClick={onNavigate}
        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
          active
            ? 'bg-pine-50 text-pine-700 dark:bg-pine-700/20 dark:text-pine-300'
            : 'text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface'
        }`}
      >
        <Icon size={15} />
        {label}
      </Link>
    );
  };

  return (
    <nav className="flex h-full flex-col gap-4 px-2 pb-4 pt-1">
      <div className="space-y-0.5">
        {navItem('/', 'Home', Home)}
        {navItem('/favorites', 'Favorites', Star)}
        {navItem('/shared', 'Shared with me', Users)}
        {navItem('/trash', 'Trash', Trash2)}
      </div>
      <FileTree />
    </nav>
  );
}
