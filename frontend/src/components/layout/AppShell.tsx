import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SearchOverlay } from '../search/SearchOverlay';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export function AppShell() {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable;
      if (e.key === '/' && !typing) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const closeOnMobile = () => {
    if (!isDesktop) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-paper text-ink dark:bg-night dark:text-mist">
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSearch={() => setSearchOpen(true)}
      />
      <div className="relative flex min-h-0 flex-1">
        {sidebarOpen && !isDesktop && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-ink/40 dark:bg-black/60" />
        )}
        {sidebarOpen && (
          <aside
            className={
              isDesktop
                ? 'relative w-64 shrink-0 overflow-y-auto border-r border-paper-border bg-paper dark:border-night-border dark:bg-night'
                : 'fixed inset-y-0 left-0 top-14 z-40 w-72 overflow-y-auto border-r border-paper-border bg-paper dark:border-night-border dark:bg-night'
            }
          >
            <Sidebar onNavigate={closeOnMobile} />
          </aside>
        )}
        <main className="min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
