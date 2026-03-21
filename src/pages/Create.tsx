import { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Image as ImageIcon, Loader2, Sparkles, Coins, Edit3, Share2 } from 'lucide-react';
import { compressImage } from '../utils/imageUtils';
import ImageEditor from '../components/ImageEditor';


export default function Create() {
  const { user, profile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [markedImage, setMarkedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const handleGenerate = async (useCredits: boolean = false) => {
    if (!user || !profile || !prompt) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const currentApiKey = process.env.GEMINI_API_KEY;
      if (!currentApiKey) {
        throw new Error('Gemini API key is missing. Please ensure it is set.');
      }
      const aiClient = new GoogleGenAI({ apiKey: currentApiKey });

      // Check credits
      if (!useCredits && profile.imagesLeft <= 0) {
        throw new Error('No image credits left. Please upgrade to Premium or use ArCredits.');
      }
      if (useCredits && (profile.arCredits || 0) < 1000) {
        throw new Error('Not enough ArCredits. You need 1000 ArCredits to generate a photo.');
      }

      let generatedUrl = '';

      const response = await aiClient.models.generateContent({
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
      setMarkedImage(null);
      setIsEditing(false);
      setEditPrompt('');

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
      // Don't clear result so they can keep editing if they want
    } catch (err) {
      console.error('Share failed', err);
      alert('Failed to share.');
    }
  };

  const handleEditGenerate = async () => {
    if (!user || !profile || !markedImage || !editPrompt) return;
    setEditLoading(true);
    setError(null);

    try {
      const currentApiKey = process.env.GEMINI_API_KEY;
      if (!currentApiKey) {
        throw new Error('Gemini API key is missing. Please ensure it is set.');
      }
      const aiClient = new GoogleGenAI({ apiKey: currentApiKey });

      // Check credits for editing (costs 1 image credit)
      if (profile.imagesLeft <= 0 && (profile.arCredits || 0) < 1000) {
        throw new Error('No credits left to edit. Please upgrade or use ArCredits.');
      }

      const base64Data = markedImage.split(',')[1];
      const mimeType = markedImage.split(';')[0].split(':')[1];

      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            },
            {
              text: `Edit this image based on the following instruction. Note that the area to change is marked with a red semi-transparent brush. Instruction: ${editPrompt}`,
            },
          ],
        },
      });

      let generatedUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
          generatedUrl = await compressImage(rawBase64, 512, 0.7);
          break;
        }
      }

      if (!generatedUrl) throw new Error('Edit generation failed.');

      setResult(generatedUrl);
      setIsEditing(false);
      setMarkedImage(null);
      setEditPrompt('');

      // Deduct credit
      const userRef = doc(db, 'users', user.uid);
      if (profile.imagesLeft > 0) {
        await updateDoc(userRef, { imagesLeft: increment(-1) });
      } else {
        await updateDoc(userRef, { arCredits: increment(-1000) });
      }

    } catch (err: any) {
      let errorMessage = err.message || 'An error occurred during editing.';
      setError(errorMessage);
    } finally {
      setEditLoading(false);
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

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-sm text-zinc-400 flex flex-col gap-1 w-full sm:w-auto">
            <span>Credits remaining: <strong className="text-white">{profile?.imagesLeft}</strong></span>
            <span className="flex items-center gap-1"><Coins size={14} className="text-yellow-500"/> ArCredits: <strong className="text-white">{profile?.arCredits || 0}</strong> <span className="text-xs ml-1">(= {Math.floor((profile?.arCredits || 0) / 1000)} Photos)</span></span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => handleGenerate(false)}
              disabled={loading || !prompt}
              className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              Generate
            </button>
            <button
              onClick={() => handleGenerate(true)}
              disabled={loading || !prompt || (profile?.arCredits || 0) < 1000}
              className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
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
          <h2 className="text-xl font-bold mb-4 text-white">Sonuç</h2>
          
          {isEditing ? (
            <div className="mb-4">
              {!markedImage ? (
                <ImageEditor 
                  imageUrl={result} 
                  onSave={(img) => setMarkedImage(img)} 
                  onCancel={() => setIsEditing(false)} 
                />
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-700">
                    <img src={markedImage} alt="Marked" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm text-zinc-400 font-medium">Nasıl bir değişiklik istiyorsunuz?</label>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      placeholder="Örn: İşaretli alanı sevimli bir kediye dönüştür..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setMarkedImage(null); setIsEditing(false); }}
                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-semibold transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleEditGenerate}
                      disabled={editLoading || !editPrompt}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {editLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                      Düzenle
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden mb-4 flex items-center justify-center">
                <img src={result} alt="Generated" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Edit3 size={18} />
                  Fotoğrafı Düzenle
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 bg-white text-black hover:bg-zinc-200 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={18} />
                  Paylaş
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
