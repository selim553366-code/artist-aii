import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { Heart, MessageCircle, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

interface Post {
  id: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  likesCount: number;
  commentsCount: number;
  authorName: string;
}

export default function Gallery() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(newPosts);
    }, (error) => {
      console.error("Error fetching gallery posts:", error);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-6xl mx-auto py-12 px-4">
      <h1 className="text-4xl font-extrabold text-white mb-8 text-center">Global Gallery</h1>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {posts.map(post => (
          <div key={post.id} className="aspect-square bg-zinc-900 rounded-xl overflow-hidden relative group cursor-pointer">
            {post.mediaType === 'video' ? (
              <video src={post.mediaUrl || undefined} className="w-full h-full object-cover" muted loop />
            ) : (
              <img src={post.mediaUrl || undefined} alt="Post" className="w-full h-full object-cover" />
            )}
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
              <span className="text-white font-bold text-lg">{post.authorName}</span>
              <div className="flex gap-6">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Heart size={20} className="fill-white" />
                  <span>{post.likesCount}</span>
                </div>
                <div className="flex items-center gap-2 text-white font-bold">
                  <MessageCircle size={20} className="fill-white" />
                  <span>{post.commentsCount}</span>
                </div>
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
          No masterpieces in the gallery yet.
        </div>
      )}
    </div>
  );
}
