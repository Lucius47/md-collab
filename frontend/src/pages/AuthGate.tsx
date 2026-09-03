import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../components/auth/LoginScreen';
import { FullScreenSpinner } from '../components/common/Spinner';
import { AppShell } from '../components/layout/AppShell';
import { NodeView } from './NodeView';
import { FavoritesView } from './FavoritesView';
import { SharedWithMeView } from './SharedWithMeView';
import { TrashView } from './TrashView';

export function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (!user) return <LoginScreen />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<NodeView />} />
        <Route path="nodes/:nodeId" element={<NodeView />} />
        <Route path="favorites" element={<FavoritesView />} />
        <Route path="shared" element={<SharedWithMeView />} />
        <Route path="trash" element={<TrashView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
