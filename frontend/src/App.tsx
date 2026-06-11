import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api/client';
import type { EnvironmentInfo } from './api/types';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const WalletsPage = lazy(() =>
  import('./pages/WalletsPage').then((m) => ({ default: m.WalletsPage })),
);
const VaultsPage = lazy(() =>
  import('./pages/VaultsPage').then((m) => ({ default: m.VaultsPage })),
);
const PortfolioPage = lazy(() =>
  import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })),
);
const ActivityPage = lazy(() =>
  import('./pages/ActivityPage').then((m) => ({ default: m.ActivityPage })),
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader label="Authenticating" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  const [env, setEnv] = useState<EnvironmentInfo | null>(null);

  useEffect(() => {
    api.getEnvironment().then(setEnv).catch(() => {});
  }, []);

  const isTestnet = env ? !env.allowMainnetTransactions : true;

  return (
    <WalletProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoader />}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          element={
            <ProtectedRoute>
              <Layout environment={env?.environment} isTestnet={isTestnet} />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <Suspense fallback={<PageLoader />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="wallets"
            element={
              <Suspense fallback={<PageLoader />}>
                <WalletsPage />
              </Suspense>
            }
          />
          <Route
            path="vaults"
            element={
              <Suspense fallback={<PageLoader />}>
                <VaultsPage />
              </Suspense>
            }
          />
          <Route
            path="vaults/:vaultId"
            element={
              <Suspense fallback={<PageLoader />}>
                <VaultsPage />
              </Suspense>
            }
          />
          <Route
            path="portfolio"
            element={
              <Suspense fallback={<PageLoader />}>
                <PortfolioPage />
              </Suspense>
            }
          />
          <Route
            path="activity"
            element={
              <Suspense fallback={<PageLoader />}>
                <ActivityPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </WalletProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}
