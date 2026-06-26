import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import TabBar from './components/TabBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PageTransition from './components/PageTransition.jsx';
import Browse from './pages/Browse.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import Storefront from './pages/Storefront.jsx';
import CreateListing from './pages/CreateListing.jsx';
import EditListing from './pages/EditListing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Profile from './pages/Profile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import Wallet from './pages/Wallet.jsx';
import Saved from './pages/Saved.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import Messages from './pages/Messages.jsx';
import Conversation from './pages/Conversation.jsx';
import Notifications from './pages/Notifications.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

const wrap = (el) => <PageTransition>{el}</PageTransition>;

export default function App() {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={wrap(<Browse />)} />
            <Route path="/listings/:id" element={wrap(<ListingDetail />)} />
            <Route path="/sellers/:id" element={wrap(<Storefront />)} />
            <Route
              path="/listings/:id/edit"
              element={
                <ProtectedRoute roles={['seller', 'admin']}>
                  {wrap(<EditListing />)}
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={wrap(<Login />)} />
            <Route path="/register" element={wrap(<Register />)} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute roles={['seller', 'admin']}>
                  {wrap(<Dashboard />)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/create"
              element={
                <ProtectedRoute roles={['seller', 'admin']}>
                  {wrap(<CreateListing />)}
                </ProtectedRoute>
              }
            />
            <Route
              path="/wallet"
              element={<ProtectedRoute>{wrap(<Wallet />)}</ProtectedRoute>}
            />
            <Route
              path="/orders"
              element={<ProtectedRoute>{wrap(<Orders />)}</ProtectedRoute>}
            />
            <Route
              path="/orders/:id"
              element={<ProtectedRoute>{wrap(<OrderDetail />)}</ProtectedRoute>}
            />
            <Route
              path="/messages"
              element={<ProtectedRoute>{wrap(<Messages />)}</ProtectedRoute>}
            />
            <Route
              path="/messages/:id"
              element={<ProtectedRoute>{wrap(<Conversation />)}</ProtectedRoute>}
            />
            <Route
              path="/notifications"
              element={<ProtectedRoute>{wrap(<Notifications />)}</ProtectedRoute>}
            />
            <Route
              path="/profile"
              element={<ProtectedRoute>{wrap(<Profile />)}</ProtectedRoute>}
            />
            <Route
              path="/saved"
              element={<ProtectedRoute>{wrap(<Saved />)}</ProtectedRoute>}
            />
            <Route
              path="/profile/edit"
              element={<ProtectedRoute>{wrap(<EditProfile />)}</ProtectedRoute>}
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  {wrap(<Admin />)}
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <TabBar />
    </>
  );
}
