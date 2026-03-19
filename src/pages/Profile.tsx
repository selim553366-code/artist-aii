import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Heart, MessageCircle, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

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
    });
    return () => unsubscribe();
  }, [user]);

  if (!user || !profile) {
    return <div className="p-8 text-center text-zinc-400">Please sign in to view your profile.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
        <img
          src={profile.photoURL || undefined}
          alt={profile.displayName}
          className="w-32 h-32 rounded-full border-4 border-zinc-800 shadow-xl"
        />
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-3xl font-bold text-white mb-2">{profile.displayName}</h1>
          <p className="text-indigo-400 font-medium mb-6 uppercase tracking-wider text-sm">
            {profile.plan} Artist
          </p>
          
          <div className="flex justify-center md:justify-start gap-8 text-zinc-300">
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
          </div>
        </div>
        <div className="flex gap-4">
          <button className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 rounded-xl font-medium transition-colors">
            Edit Profile
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {posts.map(post => (
          <div key={post.id} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden relative group cursor-pointer">
            {post.mediaType === 'video' ? (
              <video src={post.mediaUrl} className="w-full h-full object-cover" muted loop />
            ) : (
              <img src={post.mediaUrl} alt="Post" className="w-full h-full object-cover" />
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
    </div>
  );
}
