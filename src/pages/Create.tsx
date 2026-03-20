import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Image as ImageIcon, Loader2, Sparkles, Coins } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';

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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nftName, setNftName] = useState('');
  const [isMinting, setIsMinting] = useState(false);

  const handleGenerate = async (useCredits: boolean = false) => {
    if (!user || !profile || !prompt) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!ai) {
        throw new Error('Gemini API key is missing. Please set GEMINI_API_KEY in your Vercel Environment Variables.');
      }

      // Check credits
      if (!useCredits && profile.imagesLeft <= 0) {
        throw new Error('No image credits left. Please upgrade to Premium or use ArCredits.');
      }
      if (useCredits && (profile.arCredits || 0) < 1000) {
        throw new Error('Not enough ArCredits. You need 1000 ArCredits to generate a photo.');
      }

      let generatedUrl = '';

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: "1:1"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
          generatedUrl = await compressImage(rawBase64, 512, 0.7);
          break;
        }
      }

      if (!generatedUrl) throw new Error('Generation failed.');

      setResult(generatedUrl);

      // Deduct credit
      const userRef = doc(db, 'users', user.uid);
      if (useCredits) {
        await updateDoc(userRef, {
          arCredits: increment(-1000)
        });
      } else {
        await updateDoc(userRef, {
          imagesLeft: increment(-1)
        });
      }

    } catch (err: any) {
      let errorMessage = err.message || 'An error occurred during generation.';
      if (errorMessage.includes('403') || errorMessage.includes('PERMISSION_DENIED')) {
        errorMessage = 'API Key permission denied. Please ensure your Gemini API key is correct and has the Generative Language API enabled.';
      }
      setError(errorMessage);
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
        mediaType: 'image',
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

  const handleMintNFT = async () => {
    if (!user || !profile || !result) return;
    if (!nftName.trim()) {
      alert('Please enter a name for your NFT.');
      return;
    }
    
    setIsMinting(true);
    try {
      // Initial random price between 100 and 1000 ArCredits
      const initialPrice = Math.floor(Math.random() * 900) + 100;
      
      await addDoc(collection(db, 'nfts'), {
        ownerId: user.uid,
        creatorId: user.uid,
        creatorName: profile.displayName,
        ownerName: profile.displayName,
        imageUrl: result,
        prompt: nftName.trim(), // Using the name as the primary identifier/prompt
        originalPrompt: prompt, // Keep the original prompt for reference
        price: initialPrice,
        isListed: true, // List immediately as requested
        createdAt: Date.now()
      });
      
      // Also share to feed
      await addDoc(collection(db, 'posts'), {
        authorId: user.uid,
        authorName: profile.displayName,
        authorPhoto: profile.photoURL,
        mediaUrl: result,
        mediaType: 'image',
        prompt: `Minted new NFT: ${nftName.trim()}`,
        likesCount: 0,
        commentsCount: 0,
        createdAt: Date.now()
      });

      alert('Minted and shared successfully!');
      setResult(null);
      setPrompt('');
      setNftName('');
    } catch (err) {
      console.error('Mint failed', err);
      alert('Failed to mint NFT.');
    } finally {
      setIsMinting(false);
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
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create..."
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-32 mb-4"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-zinc-400 flex flex-col gap-1">
            <span>Credits remaining: <strong className="text-white">{profile?.imagesLeft}</strong></span>
            <span className="flex items-center gap-1"><Coins size={14} className="text-yellow-500"/> ArCredits: <strong className="text-white">{profile?.arCredits || 0}</strong> <span className="text-xs ml-1">(= {Math.floor((profile?.arCredits || 0) / 1000)} Photos)</span></span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading || !prompt}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Generate
            </button>
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || !prompt || (profile?.arCredits || 0) < 1000}
              className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-colors"
              title="Cost: 1000 ArCredits"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Coins size={20} />}
              Generate (1000)
            </button>
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>

      {result && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-white">Result</h2>
          <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
            <img src={result} alt="Generated" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={nftName}
              onChange={(e) => setNftName(e.target.value)}
              placeholder="Enter a name for your NFT..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex gap-4">
              <button
                onClick={handleShare}
                className="flex-1 bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-semibold transition-colors"
              >
                Share to Feed
              </button>
              <button
                onClick={handleMintNFT}
                disabled={isMinting || !nftName.trim()}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isMinting ? <Loader2 className="animate-spin" size={20} /> : <Coins size={20} />}
                Mint & Share NFT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
