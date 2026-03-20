import { useState, useEffect } from 'react';
import { X, Save, RefreshCw } from 'lucide-react';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newUrl: string) => Promise<void>;
  currentUrl: string;
  uid: string;
}

const TOP_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Short Curly', value: 'shortHairShortCurly' },
  { label: 'Short Flat', value: 'shortHairShortFlat' },
  { label: 'Short Round', value: 'shortHairShortRound' },
  { label: 'Long Straight', value: 'longHairStraight' },
  { label: 'Long Curly', value: 'longHairCurly' },
  { label: 'Bob', value: 'longHairBob' },
  { label: 'Bun', value: 'longHairBun' },
  { label: 'Dreads', value: 'shortHairDreads01' },
  { label: 'Hat', value: 'hat' },
  { label: 'Hijab', value: 'hijab' },
  { label: 'Turban', value: 'turban' },
  { label: 'Winter Hat', value: 'winterHat1' },
];

const ACCESSORY_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Kurt', value: 'kurt' },
  { label: 'Prescription 1', value: 'prescription01' },
  { label: 'Prescription 2', value: 'prescription02' },
  { label: 'Round', value: 'round' },
  { label: 'Sunglasses', value: 'sunglasses' },
  { label: 'Wayfarers', value: 'wayfarers' },
];

const CLOTHING_OPTIONS = [
  { label: 'Default', value: '' },
  { label: 'Blazer & Shirt', value: 'blazerAndShirt' },
  { label: 'Blazer & Sweater', value: 'blazerAndSweater' },
  { label: 'Collar & Sweater', value: 'collarAndSweater' },
  { label: 'Graphic Shirt', value: 'graphicShirt' },
  { label: 'Hoodie', value: 'hoodie' },
  { label: 'Overall', value: 'overall' },
  { label: 'Crew Neck', value: 'shirtCrewNeck' },
  { label: 'V-Neck', value: 'shirtVNeck' },
];

const FACIAL_HAIR_OPTIONS = [
  { label: 'None', value: '' },
  { label: 'Light Beard', value: 'beardLight' },
  { label: 'Medium Beard', value: 'beardMedium' },
  { label: 'Majestic Beard', value: 'beardMagestic' },
  { label: 'Fancy Moustache', value: 'moustaceFancy' },
  { label: 'Magnum Moustache', value: 'moustacheMagnum' },
];

export default function AvatarEditor({ isOpen, onClose, onSave, currentUrl, uid }: AvatarEditorProps) {
  const [top, setTop] = useState('');
  const [accessories, setAccessories] = useState('');
  const [clothing, setClothing] = useState('');
  const [facialHair, setFacialHair] = useState('');
  const [saving, setSaving] = useState(false);

  // Parse existing URL if it's a DiceBear avataaars URL
  useEffect(() => {
    if (isOpen && currentUrl.includes('api.dicebear.com') && currentUrl.includes('avataaars')) {
      try {
        const urlObj = new URL(currentUrl);
        setTop(urlObj.searchParams.get('top') || '');
        setAccessories(urlObj.searchParams.get('accessories') || '');
        setClothing(urlObj.searchParams.get('clothing') || '');
        setFacialHair(urlObj.searchParams.get('facialHair') || '');
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const generatePreviewUrl = () => {
    const params = new URLSearchParams();
    params.append('seed', uid);
    if (top) params.append('top', top);
    if (accessories) params.append('accessories', accessories);
    if (clothing) params.append('clothing', clothing);
    if (facialHair) params.append('facialHair', facialHair);
    
    return `https://api.dicebear.com/7.x/avataaars/svg?${params.toString()}`;
  };

  const previewUrl = generatePreviewUrl();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(previewUrl);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Customize Avatar</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-center mb-8">
            <div className="w-40 h-40 rounded-full border-4 border-indigo-500 overflow-hidden bg-zinc-800 shadow-lg shadow-indigo-500/20">
              <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Hair & Headgear</label>
              <select
                value={top}
                onChange={(e) => setTop(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TOP_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Accessories</label>
              <select
                value={accessories}
                onChange={(e) => setAccessories(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {ACCESSORY_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Clothing</label>
              <select
                value={clothing}
                onChange={(e) => setClothing(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CLOTHING_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Facial Hair</label>
              <select
                value={facialHair}
                onChange={(e) => setFacialHair(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FACIAL_HAIR_OPTIONS.map(opt => (
                  <option key={opt.label} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/25"
          >
            {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {saving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}
