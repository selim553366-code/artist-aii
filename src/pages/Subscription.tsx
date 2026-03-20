import { useState } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Check, Crown, Zap } from 'lucide-react';

export default function Subscription() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!user || !profile) return;
    setLoading(true);
    try {
      const checkoutUrl = (import.meta as any).env.VITE_LEMON_SQUEEZY_CHECKOUT_URL;
      if (checkoutUrl) {
        // Redirect to Lemon Squeezy checkout with user ID as custom data
        // This allows your webhook to know which user made the purchase
        const url = new URL(checkoutUrl);
        url.searchParams.append('checkout[custom][user_id]', user.uid);
        window.open(url.toString(), '_blank');
        return;
      }

      // Fallback: Mock upgrade if no Lemon Squeezy URL is provided
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        plan: 'premium',
        imagesLeft: 50
      });
      alert('Successfully upgraded to Premium! (Mock Mode)');
    } catch (err) {
      console.error('Upgrade failed', err);
      alert('Failed to upgrade.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-zinc-400">Please sign in to view subscriptions.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-white mb-4">Choose Your Plan</h1>
        <p className="text-xl text-zinc-400">Unlock the full potential of Artist AI.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Standard Plan */}
        <div className={`bg-zinc-900 border ${profile?.plan === 'standard' ? 'border-indigo-500' : 'border-zinc-800'} rounded-3xl p-8 relative flex flex-col`}>
          {profile?.plan === 'standard' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase">
              Current Plan
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-zinc-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Standard</h2>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-white">Free</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-zinc-300">
              <Check className="text-indigo-500" size={20} />
              <span>10 Images per month</span>
            </li>
            <li className="flex items-center gap-3 text-zinc-300">
              <Check className="text-indigo-500" size={20} />
              <span>Standard Generation Speed</span>
            </li>
            <li className="flex items-center gap-3 text-zinc-300">
              <Check className="text-indigo-500" size={20} />
              <span>Access to Daily Challenges</span>
            </li>
          </ul>
          <button
            disabled
            className="w-full bg-zinc-800 text-zinc-400 py-4 rounded-xl font-bold transition-colors cursor-not-allowed"
          >
            Included
          </button>
        </div>

        {/* Premium Plan */}
        <div className={`bg-gradient-to-b from-indigo-900/50 to-zinc-900 border ${profile?.plan === 'premium' ? 'border-indigo-400' : 'border-indigo-500/30'} rounded-3xl p-8 relative flex flex-col`}>
          {profile?.plan === 'premium' && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-400 text-white px-4 py-1 rounded-full text-sm font-bold tracking-wide uppercase shadow-lg shadow-indigo-500/20">
              Current Plan
            </div>
          )}
          <div className="flex items-center gap-3 mb-4">
            <Crown className="text-indigo-400" size={28} />
            <h2 className="text-2xl font-bold text-white">Premium</h2>
          </div>
          <div className="mb-6">
            <span className="text-4xl font-extrabold text-white">$8.99</span>
            <span className="text-zinc-400">/month</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-center gap-3 text-zinc-300">
              <Check className="text-indigo-400" size={20} />
              <span className="font-medium text-white">50 Images per week</span>
            </li>
            <li className="flex items-center gap-3 text-zinc-300">
              <Check className="text-indigo-400" size={20} />
              <span>Priority Generation Speed</span>
            </li>
            <li className="flex items-center gap-3 text-zinc-300">
              <Check className="text-indigo-400" size={20} />
              <span>Early Access to New Models</span>
            </li>
          </ul>
          <button
            onClick={handleUpgrade}
            disabled={loading || profile?.plan === 'premium'}
            className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/25"
          >
            {loading ? 'Processing...' : profile?.plan === 'premium' ? 'Active' : 'Upgrade to Premium'}
          </button>
        </div>
      </div>
    </div>
  );
}
