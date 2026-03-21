import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Image, Video, User, Crown, LogOut, Coins, Monitor } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { logout } from './firebase';
import Feed from './pages/Feed';
import Create from './pages/Create';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import Gallery from './pages/Gallery';
import Designer from './pages/Designer';
import AuthModal from './components/AuthModal';

class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Something went wrong.</h1>
          <pre className="bg-zinc-900 p-4 rounded-xl text-sm text-zinc-300 max-w-2xl overflow-auto w-full">
            {this.state.error?.message}
            {'\n'}
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Feed' },
    { path: '/create', icon: Image, label: 'Create' },
    { path: '/designer', icon: Monitor, label: 'AI Designer' },
    { path: '/gallery', icon: Video, label: 'Gallery' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/subscription', icon: Crown, label: 'Premium' },
  ];

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-950 text-white font-sans overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 z-40 shrink-0">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Flix Ai</h1>
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg">
              <Coins size={14} className="text-yellow-500" />
              <span className="text-xs font-bold text-yellow-500">{profile?.arCredits || 0}</span>
            </div>
            <Link to="/profile">
              <img src={profile?.photoURL || undefined} alt="Profile" className="w-8 h-8 rounded-full object-cover object-top bg-zinc-800" />
            </Link>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-zinc-200 transition-colors"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Sidebar (Desktop) */}
      <div className="hidden md:flex w-64 border-r border-zinc-800 flex-col p-4 shrink-0">
        <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Flix Ai</h1>
        
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user ? (
          <div className="mt-auto pt-4 border-t border-zinc-800">
            <div className="flex items-center space-x-3 mb-4 px-2">
              <Coins size={20} className="text-yellow-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-yellow-500">{profile?.arCredits || 0} ArCredits</p>
                <p className="text-xs text-zinc-400">= {Math.floor((profile?.arCredits || 0) / 1000)} Photos</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 mb-4">
              <img src={profile?.photoURL || undefined} alt="Profile" className="w-10 h-10 rounded-full object-cover object-top bg-zinc-800" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile?.displayName}</p>
                <p className="text-xs text-zinc-400 truncate">{profile?.plan === 'premium' ? 'Premium' : 'Standard'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 text-zinc-400 hover:text-white w-full px-4 py-2 rounded-xl hover:bg-zinc-900 transition-colors"
            >
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        ) : (
          <div className="mt-auto">
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex justify-around items-center px-1 py-2 z-50 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center px-1 py-1 rounded-xl transition-colors ${
                isActive ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] mt-1 font-medium truncate max-w-[50px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Feed />} />
              <Route path="/create" element={<Create />} />
              <Route path="/designer" element={<Designer />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/subscription" element={<Subscription />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}
