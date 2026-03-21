import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Download, Send, Bot, User as UserIcon, Loader2, Layout } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export default function Designer() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', text: 'Hi! I am your AI Web Designer. What kind of website would you like to create today?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // For the Gemini API history
  const [chatHistory, setChatHistory] = useState<{role: string, parts: {text: string}[]}[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userText = input.trim();
    setInput('');
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsTyping(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error('API key missing');
      const ai = new GoogleGenAI({ apiKey });

      const newHistory = [...chatHistory, { role: 'user', parts: [{ text: userText }] }];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: newHistory,
        config: {
          systemInstruction: "You are an expert web design AI assistant. The user wants to design a website. Talk to them to understand their requirements. When they are ready to see a design or want to change a design, output a JSON object with `reply` (your text response) and `imagePrompt` (a highly detailed prompt for an image generator to create the UI mockup. If no image generation is needed right now, leave imagePrompt empty string). The image prompt should describe a high-quality, modern website UI design, including colors, layout, and specific elements. Always reply in JSON.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: { type: Type.STRING, description: "Your conversational reply to the user." },
              imagePrompt: { type: Type.STRING, description: "Highly detailed prompt for an image generator to create the UI mockup. Empty string if no image needed." }
            },
            required: ["reply", "imagePrompt"]
          }
        }
      });

      const responseText = response.text || '{}';
      let parsed;
      try {
        const cleanText = responseText.replace(/```json\n?|\n?```/g, '').trim();
        parsed = JSON.parse(cleanText);
      } catch (e) {
        parsed = { reply: responseText, imagePrompt: "" };
      }
      
      const assistantReply = parsed.reply || "I'm not sure what to say.";
      const imagePrompt = parsed.imagePrompt || "";

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: assistantReply }]);
      setChatHistory([...newHistory, { role: 'model', parts: [{ text: responseText }] }]);

      if (imagePrompt) {
        if ((profile?.designerUsesLeft || 0) <= 0) {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: "You have run out of AI Designer uses for this month. Please upgrade to Premium for more." }]);
          setIsTyping(false);
          return;
        }

        setIsGeneratingImage(true);
        try {
          const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: "A high quality modern website UI design mockup. " + imagePrompt }] },
            config: {
              imageConfig: {
                aspectRatio: "16:9"
              }
            }
          });

          for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              const base64EncodeString = part.inlineData.data;
              const imageUrl = `data:image/png;base64,${base64EncodeString}`;
              setCurrentImage(imageUrl);
              
              // Deduct credit
              const userRef = doc(db, 'users', user.uid);
              await updateDoc(userRef, { designerUsesLeft: increment(-1) });
              
              break;
            }
          }
        } catch (imgErr) {
          console.error("Image generation failed", imgErr);
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: "I tried to generate the design, but something went wrong with the image generator." }]);
        } finally {
          setIsGeneratingImage(false);
        }
      }

    } catch (err) {
      console.error("Chat failed", err);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', text: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!user) {
    return <div className="p-8 text-center text-zinc-400">Please sign in to use the AI Designer.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] md:h-screen bg-zinc-950">
      {/* Chat Section */}
      <div className="w-full md:w-1/3 border-r border-zinc-800 flex flex-col bg-zinc-900/50 h-1/2 md:h-full">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex items-center gap-2 shrink-0">
          <Bot className="text-indigo-400" />
          <h2 className="font-bold text-white">AI Designer</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(m => (
            <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-500' : 'bg-zinc-800'}`}>
                {m.role === 'user' ? <UserIcon size={16} className="text-white" /> : <Bot size={16} className="text-indigo-400" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${m.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-zinc-800 text-zinc-200 rounded-tl-none'}`}>
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                <Bot size={16} className="text-indigo-400" />
              </div>
              <div className="bg-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-zinc-400" />
                <span className="text-zinc-400 text-sm">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Describe your dream website..."
              className="flex-1 bg-zinc-800 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isTyping || isGeneratingImage}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping || isGeneratingImage}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white p-3 rounded-xl transition-colors shrink-0"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="w-full md:w-2/3 flex flex-col bg-zinc-950 relative h-1/2 md:h-full border-t md:border-t-0 border-zinc-800">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <Layout className="text-zinc-400" />
            <h2 className="font-bold text-white">Design Preview</h2>
            <span className="text-xs text-zinc-500 ml-2">({profile?.designerUsesLeft || 0} uses left)</span>
          </div>
          {currentImage && (
            <a
              href={currentImage}
              download="website-design.png"
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Download
            </a>
          )}
        </div>
        
        <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
          {isGeneratingImage ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={48} className="animate-spin text-indigo-500" />
              <p className="text-zinc-400 font-medium animate-pulse text-center">Generating your design...<br/><span className="text-sm text-zinc-500">This might take a few seconds</span></p>
            </div>
          ) : currentImage ? (
            <div className="relative group max-w-full">
              <img 
                src={currentImage} 
                alt="Generated Design" 
                className="rounded-xl shadow-2xl shadow-black/50 max-h-[80vh] object-contain border border-zinc-800"
              />
            </div>
          ) : (
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layout size={32} className="text-zinc-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Design Yet</h3>
              <p className="text-zinc-400">
                Chat with the AI Designer on the left to generate a beautiful website mockup. You can ask for specific styles, colors, and layouts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
