import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallets } from '../context/WalletContext';
import { truncateAddress } from '../utils/format';

interface LayoutProps {
  environment?: string;
  isTestnet?: boolean;
}

export function Layout({ environment, isTestnet }: LayoutProps) {
  const { user, logout } = useAuth();
  const { primaryWallet } = useWallets();

  return (
    <div className="app">
      {isTestnet && (
        <div className="banner banner-testnet">
          Testnet · {environment ?? 'development'} · test funds only
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
            <NavLink to="/wallets">Wallets</NavLink>
            <NavLink to="/vaults">Vaults</NavLink>
            <NavLink to="/portfolio">Portfolio</NavLink>
            <NavLink to="/activity">Activity</NavLink>
          </nav>

          <div className="header-actions">
            {primaryWallet && (
              <NavLink to="/wallets" className="header-wallet muted">
                {truncateAddress(primaryWallet.walletAddress)}
              </NavLink>
            )}
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
