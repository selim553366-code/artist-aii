import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db, auth, loginWithGoogle } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { Heart, MessageCircle, Image as ImageIcon, Video as VideoIcon, CheckCircle2 } from 'lucide-react';

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  createdAt: number;
}

export default function Profile() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditProfileClick = () => {
    setEditName(profile?.displayName || '');
    setEditPhotoUrl(profile?.photoURL || '');
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editName.trim(),
        photoURL: editPhotoUrl.trim()
      });
      setIsEditingProfile(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      // Sort locally to avoid needing a composite index in Firestore
      newPosts.sort((a, b) => b.createdAt - a.createdAt);
      setPosts(newPosts);
    }, (error) => {
      console.error("Error fetching profile posts:", error);
    });
    return () => unsubscribe();
  }, [user]);

  if (!user || !profile) {
    return (
      <div className="p-8 text-center text-zinc-400 flex flex-col items-center gap-4">
        <p>Please sign in to view your profile.</p>
        <button 
          onClick={loginWithGoogle}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium transition-colors"
        >
          Log In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <div className="relative">
          <img
            src={profile.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
            alt={profile.displayName}
            className="w-32 h-32 rounded-full border-4 border-zinc-800 shadow-xl object-cover object-top bg-zinc-800"
          />
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center md:justify-start gap-2">
            {profile.displayName}
            {profile.isVerified && <CheckCircle2 className="text-blue-500" size={24} />}
          </h1>
          <p className="text-indigo-400 font-medium mb-6 uppercase tracking-wider text-sm">
            {profile.plan} Artist
          </p>
          
          {profile.plan !== 'premium' && (
            <button 
              onClick={async () => {
                await updateDoc(doc(db, 'users', user.uid), {
                  plan: 'premium',
                  isVerified: true,
                  arCredits: increment(15000)
                });
                alert('Upgraded to Premium! 15,000 ArCredits added.');
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-6 py-2 rounded-xl font-bold transition-colors mb-6"
            >
              Upgrade to Premium ($6.99)
            </button>
          )}
          
          <div className="flex flex-wrap justify-center md:justify-start gap-4 sm:gap-8 text-zinc-300">
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{posts.length}</span>
              <span className="text-sm text-zinc-500">Posts</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{profile.followersCount}</span>
              <span className="text-sm text-zinc-500">Followers</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-white">{profile.followingCount}</span>
              <span className="text-sm text-zinc-500">Following</span>
            </div>
            <div className="text-center">
              <span className="block text-2xl font-bold text-yellow-500">{profile.arCredits || 0}</span>
              <span className="text-sm text-zinc-500">ArCredits</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button 
            onClick={handleEditProfileClick}
            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl font-medium transition-colors"
          >
            Edit Profile
          </button>
          <button 
            onClick={() => signOut(auth)}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-6 py-2 rounded-xl font-medium transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map(post => (
          <div key={post.id} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden relative group cursor-pointer">
            {post.mediaType === 'video' ? (
              <video src={post.mediaUrl || undefined} className="w-full h-full object-cover" muted loop />
            ) : (
              <img src={post.mediaUrl || undefined} alt="Post" className="w-full h-full object-cover" />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
              <div className="flex items-center gap-2 text-white font-bold">
                <Heart size={20} className="fill-white" />
                <span>{post.likesCount}</span>
              </div>
              <div className="flex items-center gap-2 text-white font-bold">
                <MessageCircle size={20} className="fill-white" />
                <span>{post.commentsCount}</span>
              </div>
            </div>

            {/* Type Icon */}
            <div className="absolute top-2 right-2 bg-black/50 p-1.5 rounded-lg backdrop-blur-sm">
              {post.mediaType === 'video' ? <VideoIcon size={16} className="text-white" /> : <ImageIcon size={16} className="text-white" />}
            </div>
          </div>
        ))}
      </div>
      {posts.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          You haven't posted anything yet.
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Edit Profile</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Photo URL</label>
                <input 
                  type="text" 
                  value={editPhotoUrl}
                  onChange={(e) => setEditPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving || !editName.trim()}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded-xl font-medium transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
