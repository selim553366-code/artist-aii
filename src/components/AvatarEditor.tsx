import { useState, useEffect } from 'react';
import { X, Save, RefreshCw, Check, ShoppingCart } from 'lucide-react';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG, generateCompositeAvatar } from '../utils/avatar';

interface AvatarEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newUrl: string, newConfig: AvatarConfig) => Promise<void>;
  currentConfig?: AvatarConfig;
  uid: string;
}

const CATEGORIES = [
  { id: 'top', label: 'Hair & Hats' },
  { id: 'face', label: 'Face' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'facialHair', label: 'Facial Hair' },
  { id: 'shoes', label: 'Shoes' },
  { id: 'brand', label: 'Brand' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const OPTIONS: Record<CategoryId, string[]> = {
  top: ['shortFlat', 'shortRound', 'shortWaved', 'sides', 'theCaesar', 'theCaesarAndSidePart', 'bigHair', 'bob', 'bun', 'curly', 'curvy', 'dreads', 'frida', 'fro', 'froBand', 'longButNotTooLong', 'miaWallace', 'shavedSides', 'straight02', 'straight01', 'straightAndStrand', 'dreads01', 'dreads02', 'frizzle', 'shaggy', 'shaggyMullet', 'shortCurly', 'hat', 'hijab', 'turban', 'winterHat1', 'winterHat02', 'winterHat03', 'winterHat04'],
  face: ['default', 'smile', 'cry', 'dizzy', 'rollEyes', 'surprised', 'wink', 'winkWacky', 'squint', 'sad'],
  clothing: ['shirtCrewNeck', 'blazerAndShirt', 'blazerAndSweater', 'collarAndSweater', 'graphicShirt', 'hoodie', 'overall', 'shirtScoopNeck', 'shirtVNeck'],
  accessories: ['blank', 'kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers', 'eyepatch'],
  facialHair: ['blank', 'beardMedium', 'beardLight', 'beardMajestic', 'moustacheMagnum', 'moustacheFancy'],
  shoes: ['default', 'nike', 'gucci'],
  brand: ['none', 'nike', 'gucci']
};

const PREMIUM_ITEMS = ['nike', 'gucci'];

export default function AvatarEditor({ isOpen, onClose, onSave, currentConfig, uid }: AvatarEditorProps) {
  const [selections, setSelections] = useState<AvatarConfig>({ ...DEFAULT_AVATAR_CONFIG, ...currentConfig });
  const [activeTab, setActiveTab] = useState<CategoryId>('top');
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelections({ ...DEFAULT_AVATAR_CONFIG, ...currentConfig });
    }
  }, [isOpen, currentConfig]);

  useEffect(() => {
    if (isOpen) {
      generateCompositeAvatar(uid, selections).then(setPreviewUrl);
    }
  }, [selections, uid, isOpen]);

  if (!isOpen) return null;

  const totalCost = (PREMIUM_ITEMS.includes(selections.shoes) ? 1 : 0) + (PREMIUM_ITEMS.includes(selections.brand) ? 1 : 0);

  const handleSave = async () => {
    if (totalCost > 0) {
      setShowPayment(true);
      return;
    }
    await executeSave();
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      await onSave(previewUrl, selections);
    } catch (err) {
      console.error(err);
      alert('Failed to save avatar');
    } finally {
      setSaving(false);
      setShowPayment(false);
    }
  };

  if (showPayment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/95 backdrop-blur-md p-4">
        <div className="bg-zinc-900 rounded-3xl p-8 max-w-md w-full border border-zinc-800 shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-400">
            <ShoppingCart size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Premium Items Selected</h2>
          <p className="text-zinc-400 mb-6">You have selected premium branded items for your avatar.</p>
          
          <div className="bg-zinc-950 rounded-xl p-4 mb-6 text-left">
            {PREMIUM_ITEMS.includes(selections.shoes) && (
              <div className="flex justify-between text-zinc-300 mb-2">
                <span className="capitalize">{selections.shoes} Shoes</span>
                <span>$1.00</span>
              </div>
            )}
            {PREMIUM_ITEMS.includes(selections.brand) && (
              <div className="flex justify-between text-zinc-300 mb-2">
                <span className="capitalize">{selections.brand} Shirt Logo</span>
                <span>$1.00</span>
              </div>
            )}
            <div className="border-t border-zinc-800 pt-2 mt-2 flex justify-between text-white font-bold">
              <span>Total</span>
              <span>${totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={executeSave}
              disabled={saving}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={20} /> : 'Pay with Lemon Squeezy'}
            </button>
            <button 
              onClick={() => setShowPayment(false)}
              disabled={saving}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur-md sm:p-4">
      <div className="flex-1 flex flex-col bg-zinc-900 sm:rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full mx-auto border border-zinc-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white">Customize Avatar</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800">
            <X size={24} />
          </button>
        </div>

        {/* Main Preview */}
        <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950/50 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
          <div className="h-full max-h-[40vh] aspect-[3/4] bg-zinc-800/50 rounded-3xl border border-zinc-700/50 shadow-2xl flex items-center justify-center p-4 relative z-10">
            {previewUrl ? (
              <img src={previewUrl} alt="Avatar Preview" className="w-full h-full object-contain drop-shadow-2xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <RefreshCw className="animate-spin" size={32} />
              </div>
            )}
          </div>
        </div>

        {/* Editor Controls */}
        <div className="bg-zinc-900 border-t border-zinc-800 pb-safe">
          {/* Tabs */}
          <div className="flex overflow-x-auto hide-scrollbar border-b border-zinc-800 p-2 gap-2">
            {CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveTab(cat.id)}
                className={`px-5 py-2.5 rounded-full whitespace-nowrap font-semibold text-sm transition-all ${
                  activeTab === cat.id 
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' 
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Options Scroller */}
          <div className="p-4 bg-zinc-900/50">
            <div className="flex overflow-x-auto hide-scrollbar gap-3 pb-2 snap-x">
              {OPTIONS[activeTab].map((opt, index) => {
                const isSelected = selections[activeTab] === opt;
                const isPremium = PREMIUM_ITEMS.includes(opt);
                
                return (
                  <button
                    key={`${opt}-${index}`}
                    onClick={() => setSelections(s => ({ ...s, [activeTab]: opt }))}
                    className={`relative flex-shrink-0 w-24 h-32 rounded-2xl border-2 overflow-hidden bg-zinc-800 transition-all snap-center flex items-center justify-center ${
                      isSelected 
                        ? 'border-indigo-500 scale-105 shadow-lg shadow-indigo-500/30 z-10' 
                        : 'border-transparent hover:border-zinc-600 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="text-xs font-medium text-zinc-300 capitalize text-center px-2">{opt || 'None'}</span>
                    
                    {isPremium && (
                      <div className="absolute top-2 left-2 bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        $1
                      </div>
                    )}
                    
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 shadow-md">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer / Save */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900">
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/25"
            >
              {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Saving...' : 'Save Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
