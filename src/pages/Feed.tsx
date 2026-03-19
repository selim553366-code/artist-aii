import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { Heart, MessageCircle, Share2, MoreHorizontal } from 'lucide-react';
import { db, auth } from '../firebase';
import { useAuth } from '../AuthContext';

interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  prompt: string;
  likesCount: number;
  commentsCount: number;
  createdAt: number;
}

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<{ prompt: string; description: string } | null>(null);

  useEffect(() => {
    // Fetch posts
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(newPosts);
    });

    // Fetch daily challenge (mocked for today)
    const today = new Date().toISOString().split('T')[0];
    const challengeRef = doc(db, 'dailyChallenges', today);
    getDoc(challengeRef).then(docSnap => {
      if (docSnap.exists()) {
        setDailyChallenge(docSnap.data() as any);
      } else {
        setDailyChallenge({
          prompt: "Cyberpunk Cityscape at Dawn",
          description: "Create a neon-lit futuristic city waking up to the morning sun."
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (postId: string) => {
    if (!user) return;
    const likeId = `${postId}_${user.uid}`;
    const likeRef = doc(db, 'likes', likeId);
    const likeSnap = await getDoc(likeRef);

    if (likeSnap.exists()) {
      await deleteDoc(likeRef);
      // In a real app, we'd use a Cloud Function or transaction to decrement likesCount
    } else {
      await setDoc(likeRef, {
        postId,
        userId: user.uid,
        createdAt: Date.now()
      });
      // Increment likesCount
    }
  };

  const handleFollow = async (authorId: string) => {
    if (!user || user.uid === authorId) return;
    const followId = `${user.uid}_${authorId}`;
    const followRef = doc(db, 'follows', followId);
    const followSnap = await getDoc(followRef);

    if (followSnap.exists()) {
      await deleteDoc(followRef);
    } else {
      await setDoc(followRef, {
        followerId: user.uid,
        followingId: authorId,
        createdAt: Date.now()
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Daily Challenge Widget */}
      {dailyChallenge && (
        <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🏆</span> Daily Challenge
            </h2>
            <span className="text-xs font-medium px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded-full">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          <p className="text-xl font-semibold text-white mb-1">"{dailyChallenge.prompt}"</p>
          <p className="text-zinc-400 text-sm mb-4">{dailyChallenge.description}</p>
          <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Participate Now
          </button>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center space-x-3">
                <img src={post.authorPhoto || undefined} alt={post.authorName} className="w-10 h-10 rounded-full bg-zinc-800" />
                <div>
                  <p className="font-semibold text-white flex items-center gap-2">
                    {post.authorName}
                    {user && user.uid !== post.authorId && (
                      <button onClick={() => handleFollow(post.authorId)} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                        Follow
                      </button>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">{new Date(post.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="text-zinc-400 hover:text-white">
                <MoreHorizontal size={20} />
              </button>
            </div>

            {/* Media */}
            <div className="aspect-square bg-zinc-950 relative">
              {post.mediaType === 'video' ? (
                <video src={post.mediaUrl} controls className="w-full h-full object-cover" autoPlay loop muted />
              ) : (
                <img src={post.mediaUrl} alt={post.prompt} className="w-full h-full object-cover" />
              )}
            </div>

            {/* Actions */}
            <div className="p-4">
              <div className="flex items-center space-x-4 mb-3">
                <button onClick={() => handleLike(post.id)} className="flex items-center space-x-1 text-zinc-400 hover:text-red-500 transition-colors">
                  <Heart size={24} />
                  <span className="text-sm font-medium">{post.likesCount}</span>
                </button>
                <button className="flex items-center space-x-1 text-zinc-400 hover:text-white transition-colors">
                  <MessageCircle size={24} />
                  <span className="text-sm font-medium">{post.commentsCount}</span>
                </button>
                <button className="flex items-center space-x-1 text-zinc-400 hover:text-white transition-colors ml-auto">
                  <Share2 size={24} />
                </button>
              </div>
              <p className="text-sm text-zinc-300">
                <span className="font-semibold text-white mr-2">{post.authorName}</span>
                {post.prompt}
              </p>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No posts yet. Be the first to create something!
          </div>
        )}
      </div>
    </div>
  );
}
