import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Guards a route. Pass `roles` to additionally require one of those roles.
export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="empty">
        <div className="big-icon">🔒</div>
        <h2>Not allowed</h2>
        <p className="muted">
          This area requires a {roles.join(' or ')} account.
        </p>
      </div>
    );
  }
  return children;
}
