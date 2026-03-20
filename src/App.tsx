import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Image, Video, User, Crown, LogOut, Coins } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { logout } from './firebase';
import Feed from './pages/Feed';
import Create from './pages/Create';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import Gallery from './pages/Gallery';
import NFTMarket from './pages/NFTMarket';
import AuthModal from './components/AuthModal';

function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navItems = [
    { path: '/', icon: Home, label: 'Feed' },
    { path: '/create', icon: Image, label: 'Create' },
    { path: '/gallery', icon: Video, label: 'Gallery' },
    { path: '/nfts', icon: Coins, label: 'NFT Market' },
    { path: '/profile', icon: User, label: 'Profile' },
    { path: '/subscription', icon: Crown, label: 'Premium' },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 flex flex-col p-4">
        <h1 className="text-2xl font-bold mb-8 bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Artist AI</h1>
        
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
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Feed />} />
            <Route path="/create" element={<Create />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/nfts" element={<NFTMarket />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/subscription" element={<Subscription />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
