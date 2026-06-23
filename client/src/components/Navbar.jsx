import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { peso } from '../constants.js';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  const canSell = user && (user.role === 'seller' || user.role === 'admin');

  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="logo-dot" />
        Circuit<span className="grad">Vision</span>
      </Link>

      <div className="nav-links">
        <NavLink to="/" end>
          Browse
        </NavLink>
        {canSell && <NavLink to="/create">Sell</NavLink>}
        {user && <NavLink to="/orders">Orders</NavLink>}
        {user && <NavLink to="/wallet">Wallet</NavLink>}
        {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}

        {user ? (
          <div className="nav-pill">
            <span className="nav-wallet mono">{peso(user.walletBalance)}</span>
            <Link to="/profile" title={user.name}>
              <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            </Link>
            <button className="link-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <>
            <NavLink to="/login">Log in</NavLink>
            <Link to="/register" className="btn sm">
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
