import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, onSnapshot, doc, updateDoc, increment, deleteDoc, addDoc, where } from 'firebase/firestore';
import { Coins, TrendingUp, TrendingDown, Edit3, Trash2, ShoppingBag, ArrowRightLeft, Tag } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { compressImage } from '../utils/imageUtils';

let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  console.error("Failed to initialize Gemini API", e);
}

interface NFT {
  id: string;
  ownerId: string;
  creatorId: string;
  creatorName: string;
  ownerName: string;
  imageUrl: string;
  prompt: string;
  price: number;
  isListed: boolean;
  createdAt: number;
}

interface TradeOffer {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  offeredNftId: string;
  offeredNftPrompt: string;
  offeredNftImageUrl: string;
  requestedNftId: string;
  requestedNftPrompt: string;
  requestedNftImageUrl: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export default function NFTMarket() {
  const { user, profile } = useAuth();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [tradeOffers, setTradeOffers] = useState<TradeOffer[]>([]);
  const [editingNft, setEditingNft] = useState<NFT | null>(null);
  const [tradingNft, setTradingNft] = useState<NFT | null>(null);
  const [selectedOfferNftId, setSelectedOfferNftId] = useState<string>('');
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isTrading, setIsTrading] = useState(false);
  const [pricingNft, setPricingNft] = useState<NFT | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'nfts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const nftData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NFT[];
      setNfts(nftData);
    }, (error) => {
      console.error("Error fetching NFTs:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tradeOffers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const offers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TradeOffer[];
      setTradeOffers(offers.filter(o => o.fromUserId === user.uid || o.toUserId === user.uid));
    }, (error) => {
      console.error("Error fetching trade offers:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleList = async (nft: NFT) => {
    if (!user || nft.ownerId !== user.uid) return;
    await updateDoc(doc(db, 'nfts', nft.id), { isListed: !nft.isListed });
  };

  const handleUpdatePrice = async () => {
    if (!pricingNft || !newPrice) return;
    const priceNum = parseInt(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Please enter a valid price greater than 0.');
      return;
    }
    try {
      await updateDoc(doc(db, 'nfts', pricingNft.id), { price: priceNum });
      setPricingNft(null);
      setNewPrice('');
    } catch (err) {
      console.error('Failed to update price', err);
      alert('Failed to update price.');
    }
  };

  const handleBuy = async (nft: NFT) => {
    if (!user || !profile) return;
    if (nft.ownerId === user.uid) return;
    if ((profile.arCredits || 0) < nft.price) {
      alert('Not enough ArCredits!');
      return;
    }

    try {
      // Deduct from buyer
      await updateDoc(doc(db, 'users', user.uid), {
        arCredits: increment(-nft.price)
      });

      // Add to seller
      await updateDoc(doc(db, 'users', nft.ownerId), {
        arCredits: increment(nft.price)
      });

      // Transfer ownership
      await updateDoc(doc(db, 'nfts', nft.id), {
        ownerId: user.uid,
        ownerName: profile.displayName,
        isListed: false
      });

      alert('NFT purchased successfully!');
    } catch (err) {
      console.error('Purchase failed', err);
      alert('Failed to purchase NFT.');
    }
  };

  const handleEditNFT = async () => {
    if (!user || !profile || !editingNft || !editPrompt) return;
    if ((profile.arCredits || 0) < 500) {
      alert('You need 500 ArCredits to edit an NFT.');
      return;
    }

    setIsEditing(true);
    try {
      if (!ai) throw new Error('Gemini API not initialized');

      let generatedUrl = '';
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: editingNft.imageUrl.split(',')[1],
                mimeType: 'image/png'
              }
            },
            { text: editPrompt }
          ]
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const rawBase64 = `data:image/png;base64,${part.inlineData.data}`;
          generatedUrl = await compressImage(rawBase64, 512, 0.7);
          break;
        }
      }

      if (!generatedUrl) throw new Error('Edit failed');

      // Update NFT
      await updateDoc(doc(db, 'nfts', editingNft.id), {
        imageUrl: generatedUrl,
        prompt: editPrompt
      });

      // Deduct credits
      await updateDoc(doc(db, 'users', user.uid), {
        arCredits: increment(-500)
      });

      setEditingNft(null);
      setEditPrompt('');
      alert('NFT edited successfully!');
    } catch (err) {
      console.error('Edit failed', err);
      alert('Failed to edit NFT.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async (nft: NFT) => {
    if (!user || nft.ownerId !== user.uid) return;
    if (confirm('Are you sure you want to delete this NFT?')) {
      await deleteDoc(doc(db, 'nfts', nft.id));
    }
  };

  const handleProposeTrade = async () => {
    if (!user || !profile || !tradingNft || !selectedOfferNftId) return;
    setIsTrading(true);
    try {
      const offeredNft = nfts.find(n => n.id === selectedOfferNftId);
      if (!offeredNft) throw new Error("Offered NFT not found");

      await addDoc(collection(db, 'tradeOffers'), {
        fromUserId: user.uid,
        fromUserName: profile.displayName,
        toUserId: tradingNft.ownerId,
        offeredNftId: offeredNft.id,
        offeredNftPrompt: offeredNft.prompt,
        offeredNftImageUrl: offeredNft.imageUrl,
        requestedNftId: tradingNft.id,
        requestedNftPrompt: tradingNft.prompt,
        requestedNftImageUrl: tradingNft.imageUrl,
        status: 'pending',
        createdAt: Date.now()
      });
      alert('Trade offer sent!');
      setTradingNft(null);
      setSelectedOfferNftId('');
    } catch (err) {
      console.error('Trade proposal failed', err);
      alert('Failed to send trade offer.');
    } finally {
      setIsTrading(false);
    }
  };

  const handleAcceptTrade = async (offer: TradeOffer) => {
    if (!user || !profile) return;
    try {
      // Update offer status
      await updateDoc(doc(db, 'tradeOffers', offer.id), { status: 'accepted' });
      
      // Swap ownership
      await updateDoc(doc(db, 'nfts', offer.offeredNftId), {
        ownerId: offer.toUserId,
        ownerName: profile.displayName,
        isListed: false
      });
      
      await updateDoc(doc(db, 'nfts', offer.requestedNftId), {
        ownerId: offer.fromUserId,
        ownerName: offer.fromUserName,
        isListed: false
      });

      // Reject other pending offers involving these NFTs
      const otherOffers = tradeOffers.filter(o => 
        o.id !== offer.id && 
        o.status === 'pending' && 
        (o.offeredNftId === offer.offeredNftId || o.offeredNftId === offer.requestedNftId || o.requestedNftId === offer.offeredNftId || o.requestedNftId === offer.requestedNftId)
      );
      
      for (const other of otherOffers) {
        await updateDoc(doc(db, 'tradeOffers', other.id), { status: 'rejected' });
      }

      alert('Trade accepted successfully!');
    } catch (err) {
      console.error('Accept trade failed', err);
      alert('Failed to accept trade.');
    }
  };

  const handleRejectTrade = async (offer: TradeOffer) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'tradeOffers', offer.id), { status: 'rejected' });
    } catch (err) {
      console.error('Reject trade failed', err);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-zinc-400">Please sign in to view the NFT Market.</div>;
  }

  const myNfts = nfts.filter(n => n.ownerId === user.uid);
  const marketNfts = nfts.filter(n => n.isListed && n.ownerId !== user.uid);
  const incomingOffers = tradeOffers.filter(o => o.toUserId === user.uid && o.status === 'pending');
  const outgoingOffers = tradeOffers.filter(o => o.fromUserId === user.uid && o.status === 'pending');

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShoppingBag className="text-purple-500" /> NFT Market
        </h1>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 flex items-center gap-2 w-full sm:w-auto">
          <Coins className="text-yellow-500" size={20} />
          <span className="text-white font-bold">{profile?.arCredits || 0} ArCredits</span>
          <span className="text-zinc-500 text-sm ml-2">= {Math.floor((profile?.arCredits || 0) / 1000)} Photos</span>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold text-white mb-6">Marketplace</h2>
        {marketNfts.length === 0 ? (
          <p className="text-zinc-500">No NFTs currently listed on the market.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketNfts.map(nft => (
              <div key={nft.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-colors">
                <div className="aspect-square bg-zinc-950">
                  <img src={nft.imageUrl} alt={nft.prompt} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <p className="text-sm text-zinc-400 mb-2 truncate">"{nft.prompt}"</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs text-zinc-500">Creator: {nft.creatorName}</span>
                    <span className="text-xs text-zinc-500">Owner: {nft.ownerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-yellow-500 font-bold">
                      <Coins size={16} />
                      {nft.price}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setTradingNft(nft)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                        title="Propose Trade"
                      >
                        <ArrowRightLeft size={16} />
                      </button>
                      <button
                        onClick={() => handleBuy(nft)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Buy NFT
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-6">My Collection</h2>
        {myNfts.length === 0 ? (
          <p className="text-zinc-500">You don't own any NFTs yet. Create one or buy from the market!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myNfts.map(nft => (
              <div key={nft.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="aspect-square bg-zinc-950 relative group">
                  <img src={nft.imageUrl} alt={nft.prompt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button
                      onClick={() => { setPricingNft(nft); setNewPrice(nft.price.toString()); }}
                      className="bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full transition-colors"
                      title="Set Price"
                    >
                      <Tag size={20} />
                    </button>
                    <button
                      onClick={() => setEditingNft(nft)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-full transition-colors"
                      title="Edit NFT (500 ArCredits)"
                    >
                      <Edit3 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(nft)}
                      className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white p-3 rounded-full transition-colors"
                      title="Delete NFT"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-zinc-400 mb-4 truncate">"{nft.prompt}"</p>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-yellow-500 font-bold">
                      <Coins size={16} />
                      {nft.price}
                    </div>
                    <button
                      onClick={() => handleList(nft)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        nft.isListed 
                          ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700' 
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                    >
                      {nft.isListed ? 'Unlist' : 'List on Market'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Trade Offers Section */}
      {(incomingOffers.length > 0 || outgoingOffers.length > 0) && (
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <ArrowRightLeft className="text-indigo-500" /> Trade Offers
          </h2>
          
          {incomingOffers.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-zinc-300 mb-4">Incoming Offers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incomingOffers.map(offer => (
                  <div key={offer.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
                    <p className="text-sm text-zinc-400">
                      <strong className="text-white">{offer.fromUserName}</strong> wants to trade:
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 text-center">
                        <img src={offer.offeredNftImageUrl} alt="Offered" className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 truncate">"{offer.offeredNftPrompt}"</p>
                      </div>
                      <ArrowRightLeft className="text-zinc-500" />
                      <div className="flex-1 text-center">
                        <img src={offer.requestedNftImageUrl} alt="Requested" className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 truncate">"{offer.requestedNftPrompt}"</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleRejectTrade(offer)}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAcceptTrade(offer)}
                        className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
                      >
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outgoingOffers.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-zinc-300 mb-4">Outgoing Offers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outgoingOffers.map(offer => (
                  <div key={offer.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-4 opacity-75">
                    <p className="text-sm text-zinc-400">
                      You offered to trade for an NFT:
                    </p>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 text-center">
                        <img src={offer.offeredNftImageUrl} alt="Offered" className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 truncate">"{offer.offeredNftPrompt}"</p>
                      </div>
                      <ArrowRightLeft className="text-zinc-500" />
                      <div className="flex-1 text-center">
                        <img src={offer.requestedNftImageUrl} alt="Requested" className="w-20 h-20 object-cover rounded-lg mx-auto mb-2" />
                        <p className="text-xs text-zinc-500 truncate">"{offer.requestedNftPrompt}"</p>
                      </div>
                    </div>
                    <div className="text-center mt-2">
                      <span className="text-xs font-semibold text-yellow-500 uppercase tracking-wider">Pending Response</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Set Price Modal */}
      {pricingNft && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-white mb-4">Set NFT Price</h3>
            <p className="text-sm text-zinc-400 mb-4">Set a new price for "{pricingNft.prompt}" in ArCredits.</p>
            <input
              type="number"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-6"
              placeholder="Enter price..."
              min="1"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPricingNft(null); setNewPrice(''); }}
                className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 py-2 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePrice}
                disabled={!newPrice}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded-xl font-semibold transition-colors"
              >
                Update Price
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingNft && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Edit NFT</h3>
            <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden mb-4">
              <img src={editingNft.imageUrl} alt="Current" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm text-zinc-400 mb-4">Cost: 500 ArCredits</p>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="Describe how to edit this image..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none h-24 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setEditingNft(null)}
                className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 py-2 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditNFT}
                disabled={isEditing || !editPrompt}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white py-2 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isEditing ? 'Editing...' : 'Apply Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Trade Modal */}
      {tradingNft && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Propose a Trade</h3>
            <p className="text-sm text-zinc-400 mb-6">Select one of your NFTs to offer in exchange for "{tradingNft.prompt}".</p>
            
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-zinc-300 mb-3 text-center">You want</h4>
                <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden border-2 border-purple-500/50">
                  <img src={tradingNft.imageUrl} alt="Target" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRightLeft className="text-zinc-500 rotate-90 md:rotate-0" size={32} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-zinc-300 mb-3 text-center">You offer</h4>
                {selectedOfferNftId ? (
                  <div className="aspect-square bg-zinc-950 rounded-xl overflow-hidden border-2 border-indigo-500">
                    <img src={myNfts.find(n => n.id === selectedOfferNftId)?.imageUrl} alt="Offered" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-square bg-zinc-950 rounded-xl border-2 border-dashed border-zinc-700 flex items-center justify-center text-zinc-500">
                    Select below
                  </div>
                )}
              </div>
            </div>

            <h4 className="text-sm font-semibold text-zinc-300 mb-3">Your Collection</h4>
            {myNfts.length === 0 ? (
              <p className="text-zinc-500 text-sm mb-6">You don't have any NFTs to trade.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                {myNfts.map(nft => (
                  <div 
                    key={nft.id} 
                    onClick={() => setSelectedOfferNftId(nft.id)}
                    className={`aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
                      selectedOfferNftId === nft.id ? 'border-indigo-500' : 'border-transparent hover:border-zinc-600'
                    }`}
                  >
                    <img src={nft.imageUrl} alt={nft.prompt} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setTradingNft(null); setSelectedOfferNftId(''); }}
                className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleProposeTrade}
                disabled={isTrading || !selectedOfferNftId}
                className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {isTrading ? 'Sending...' : 'Send Trade Offer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
