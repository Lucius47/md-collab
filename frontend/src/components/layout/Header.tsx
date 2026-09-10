import { LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../common/Avatar';
import { Modal } from '../common/Modal';

interface HeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
}

export function Header({ sidebarOpen, onToggleSidebar, onOpenSearch }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-paper-border bg-paper px-3 dark:border-night-border dark:bg-night">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
            className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
          >
            <Menu size={18} />
          </button>
          <Link to="/" className="hidden font-serif text-base font-semibold sm:inline">
            Marginalia
          </Link>
        </div>

        <button
          onClick={onOpenSearch}
          className="mx-4 flex max-w-sm flex-1 items-center gap-2 rounded border border-paper-border bg-paper-surface px-3 py-1.5 text-left text-sm text-ink-soft hover:border-pine-400 dark:border-night-border dark:bg-night-surface dark:text-mist-soft"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search your notes…</span>
          <span className="ml-auto hidden rounded border border-paper-border px-1 text-[10px] text-ink-soft/60 dark:border-night-border dark:text-mist-soft/60 sm:inline">
            /
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setProfileOpen(true)}
                aria-label="Open profile details"
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-pine-500 focus:ring-offset-2 dark:focus:ring-offset-night"
              >
                <Avatar userId={user.id} username={user.username} size={26} />
              </button>
              <button
                onClick={logout}
                title="Log out"
                className="rounded p-1.5 text-ink-soft hover:bg-paper-surface dark:text-mist-soft dark:hover:bg-night-surface"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {profileOpen && user && (
        <Modal title="Profile details" onClose={() => setProfileOpen(false)}>
          <div className="flex items-center gap-3">
            <Avatar userId={user.id} username={user.username} size={42} />
            <div>
              <div className="text-base font-semibold">{user.username}</div>
              <div className="text-sm text-ink-soft dark:text-mist-soft">{user.email}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-ink-soft dark:text-mist-soft">
            <div className="flex items-center justify-between gap-4 border-b border-paper-border pb-2 dark:border-night-border">
              <span>User ID</span>
              <span className="font-mono text-xs text-ink dark:text-mist">{user.id}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Email</span>
              <span className="truncate text-right">{user.email}</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
