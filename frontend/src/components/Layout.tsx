import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  environment?: string;
  isTestnet?: boolean;
}

export function Layout({ environment, isTestnet }: LayoutProps) {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      {isTestnet && (
        <div className="banner banner-testnet">
          Testnet — {environment ?? 'development'} · transactions use test funds
        </div>
      )}

      <header className="header">
        <div className="header-inner">
          <NavLink to="/" className="logo">
            Earn
          </NavLink>

          <nav className="nav">
            <NavLink to="/" end>
              Dashboard
            </NavLink>
            <NavLink to="/vaults">Vaults</NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/activity">Activity</NavLink>
          </nav>

          <div className="header-actions">
            <span className="user-email">{user?.email}</span>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
