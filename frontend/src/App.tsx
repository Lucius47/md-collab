import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AuthGate } from './pages/AuthGate';
import { PublicPage } from './pages/PublicPage';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/public/:publicLinkId" element={<PublicPage />} />
          <Route
            path="/*"
            element={
              <AuthProvider>
                <AuthGate />
              </AuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
