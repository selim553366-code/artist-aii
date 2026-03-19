import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Image as ImageIcon, Video as VideoIcon, Loader2, Sparkles } from 'lucide-react';

let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini API", e);
}

export default function Create() {
  const { user, profile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [videoLength, setVideoLength] = useState<'5s' | '10s'>('5s');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!user || !profile || !prompt) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!ai) {
        throw new Error('Gemini API key is missing. Please set GEMINI_API_KEY in your Vercel Environment Variables.');
      }

      // Check credits
      if (type === 'image' && profile.imagesLeft <= 0) {
        throw new Error('No image credits left. Please upgrade to Premium.');
      }
      if (type === 'video' && profile.videosLeft <= 0) {
        throw new Error('No video credits left. Please upgrade to Premium.');
      }

      let generatedUrl = '';

      if (type === 'image') {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
              imageSize: "1K"
            }
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            generatedUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } else {
        // Video Generation
        const isPremium = profile.plan === 'premium';
        if (videoLength === '10s' && !isPremium) {
          throw new Error('10s videos are only available on Premium plan.');
        }

        const resolution = isPremium ? '1080p' : '720p'; // Simulating 4K with 1080p since API limits
        const finalPrompt = videoLength === '10s' ? `${prompt} (10 seconds long)` : prompt;
        
        let operation = await ai.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: finalPrompt,
          config: {
            numberOfVideos: 1,
            resolution: resolution as any,
            aspectRatio: '16:9'
          }
        });

        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          operation = await ai.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error('Failed to generate video.');

        // Fetch the video to get a base64 or blob URL (simplified for demo, usually we'd upload to Storage)
        const videoResponse = await fetch(downloadLink, {
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY || '' }
        });
        const blob = await videoResponse.blob();
        generatedUrl = URL.createObjectURL(blob);
      }

      if (!generatedUrl) throw new Error('Generation failed.');

      setResult(generatedUrl);

      // Deduct credit
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [type === 'image' ? 'imagesLeft' : 'videosLeft']: increment(-1)
      });

    } catch (err: any) {
      setError(err.message || 'An error occurred during generation.');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!user || !profile || !result) return;
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        mediaUrl: result,
        mediaType: type,
        prompt,
        likesCount: 0,
        commentsCount: 0,
        createdAt: Date.now()
      });
      alert('Shared to feed successfully!');
      setResult(null);
      setPrompt('');
    } catch (err) {
      console.error('Share failed', err);
      alert('Failed to share.');
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-zinc-400">Please sign in to create art.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-white flex items-center gap-3">
        <Sparkles className="text-indigo-500" /> Create Masterpiece
      </h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setType('image')}
            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              type === 'image' ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <ImageIcon size={20} /> Image
          </button>
          <button
            onClick={() => setType('video')}
            className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
              type === 'video' ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            <VideoIcon size={20} /> Video
          </button>
        </div>

        {type === 'video' && (
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => setVideoLength('5s')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                videoLength === '5s' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              5 Seconds
            </button>
            <button
              onClick={() => setVideoLength('10s')}
              disabled={profile?.plan !== 'premium'}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                videoLength === '10s' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              } ${profile?.plan !== 'premium' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              10 Seconds {profile?.plan !== 'premium' && '(Premium)'}
            </button>
          </div>
        )}

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 mb-4"
        />

        <div className="flex items-center justify-between">
          <div className="text-sm text-zinc-400">
            Credits remaining: <strong className="text-white">{type === 'image' ? profile?.imagesLeft : profile?.videosLeft}</strong>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>

      {result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-white">Result</h2>
          <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
            {type === 'video' ? (
              <video src={result} controls className="w-full h-full object-contain" autoPlay loop />
            ) : (
              <img src={result} alt="Generated" className="w-full h-full object-contain" />
            )}
          </div>
          <button
            onClick={handleShare}
            className="w-full bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-semibold transition-colors"
          >
            Share to Feed
          </button>
        </div>
      )}
    </div>
  );
}
