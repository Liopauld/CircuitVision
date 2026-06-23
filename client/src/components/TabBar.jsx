import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useMessages } from '../context/MessagesContext.jsx';
import {
  IconBrowse,
  IconSell,
  IconWallet,
  IconOrders,
  IconUser,
  IconShield,
  IconChat,
} from './icons.jsx';

// App-style bottom navigation, shown only on small screens (and in the
// Capacitor mobile build). Tabs adapt to the user's role.
export default function TabBar() {
  const { user } = useAuth();
  const { unread } = useMessages();
  const canSell = user && (user.role === 'seller' || user.role === 'admin');

  const tab = ({ isActive }) => (isActive ? 'tab active' : 'tab');

  return (
    <nav className="tabbar">
      <NavLink to="/" end className={tab}>
        <IconBrowse />
        Browse
      </NavLink>

      {user?.role === 'admin' ? (
        <NavLink to="/admin" className={tab}>
          <IconShield />
          Admin
        </NavLink>
      ) : canSell ? (
        <NavLink to="/create" className={tab}>
          <IconSell />
          Sell
        </NavLink>
      ) : null}

      {user && (
        <NavLink to="/orders" className={tab}>
          <IconOrders />
          Orders
        </NavLink>
      )}
      {user && (
        <NavLink to="/messages" className={tab}>
          <span className="tab-icon-wrap">
            <IconChat />
            {unread > 0 && <span className="tab-badge">{unread}</span>}
          </span>
          Chat
        </NavLink>
      )}
      {user && (
        <NavLink to="/wallet" className={tab}>
          <IconWallet />
          Wallet
        </NavLink>
      )}

      <NavLink to={user ? '/profile' : '/login'} className={tab}>
        <IconUser />
        {user ? 'Me' : 'Log in'}
      </NavLink>
    </nav>
  );
}
