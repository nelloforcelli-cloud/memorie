
import React, { useState, useEffect, useRef } from 'react';
import { ShoppingItem, QuickItem } from '../types';
import { extractShoppingItems } from '../services/geminiService';
import { playClickSound } from '../App';

interface ShoppingViewProps {
  list: ShoppingItem[];
  setList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  quickItems: QuickItem[];
  setQuickItems: React.Dispatch<React.SetStateAction<QuickItem[]>>;
  onBack?: () => void;
}

const ShoppingView: React.FC<ShoppingViewProps> = ({ list, setList, quickItems, setQuickItems, onBack }) => {
  const [otherItem, setOtherItem] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (lastAddedId) {
      const timer = setTimeout(() => setLastAddedId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [lastAddedId]);

  const toggleListening = () => {
    playClickSound();
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);
      try {
        const items = await extractShoppingItems(transcript);
        items.forEach(name => addItem(name));
      } catch (err) { console.error(err); } finally { setIsProcessing(false); }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const addItem = (name: string, icon?: string, image?: string) => {
    if (!name.trim()) return;
    playClickSound();
    const exists = list.some(i => i.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      const existing = list.find(i => i.name.toLowerCase() === name.toLowerCase());
      if (existing) setLastAddedId(existing.id);
      return;
    }
    const quickMatch = quickItems.find(q => q.name.toLowerCase() === name.toLowerCase());
    const finalImage = image || (quickMatch?.image);
    const newId = crypto.randomUUID();
    const newItem: ShoppingItem = {
      id: newId,
      name: name.charAt(0).toUpperCase() + name.slice(1),
      image: finalImage || undefined
    };
    setList(prev => [newItem, ...prev]);
    setLastAddedId(newId);
    setOtherItem('');
  };

  const removeItem = (id: string) => {
    playClickSound();
    setList(prev => prev.filter(item => item.id !== id));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingItemId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setQuickItems(prev => prev.map(item => 
          item.id === editingItemId ? { ...item, image: base64String } : item
        ));
        setEditingItemId(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = (id: string) => {
    playClickSound();
    setEditingItemId(id);
    fileInputRef.current?.click();
  };

  return (
    <div className="animate-fade-in py-2 space-y-4 pb-24 bg-[#F0F9FF] min-h-screen">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="flex items-start gap-3 mb-2 px-2">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-500 shadow-md active:scale-90 transition-all border border-orange-50">
          <i className="fas fa-arrow-left text-sm"></i>
        </button>
        <div className="pt-0.5">
          <h2 className="text-lg font-black text-[#D41C6A] leading-tight flex items-center gap-2">
            <i className="fas fa-shopping-cart text-base text-[#D41C6A]"></i>
            Spesa
          </h2>
          <p className="text-[#FCA5A5] font-bold text-[10px] uppercase tracking-wider">
            {list.length} prodotti
          </p>
        </div>
      </div>

      <section className="bg-white rounded-[2.5rem] p-5 shadow-xl border border-rose-50/50 space-y-6 relative">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Aggiungi Rapido</h3>
        
        <div className="grid grid-cols-4 gap-4">
          {quickItems.map((item) => (
            <div key={item.id} className="relative group flex flex-col items-center gap-2">
              <button
                onClick={() => addItem(item.name, undefined, item.image)}
                className="w-full flex flex-col items-center gap-2 active:scale-95 transition-all"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden shadow-sm border-2 border-slate-50 relative bg-slate-100">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=' + item.name;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                       <i className="fas fa-image text-xl"></i>
                    </div>
                  )}
                </div>
                <span className="font-black text-[10px] text-slate-700 uppercase tracking-tight text-center leading-tight truncate w-full">
                  {item.name}
                </span>
              </button>
              
              <button 
                onClick={(e) => { e.stopPropagation(); triggerFileUpload(item.id); }}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-lg shadow-md flex items-center justify-center text-[#D41C6A] hover:bg-rose-500 hover:text-white transition-all z-10 border border-rose-100"
                title="Cambia foto"
              >
                <i className="fas fa-camera text-[8px]"></i>
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 items-center mt-6">
          <div className="flex-1 relative flex items-center">
            <input 
              type="text" 
              value={otherItem}
              onChange={(e) => setOtherItem(e.target.value)}
              placeholder="Altro..."
              className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-rose-200 focus:bg-white font-bold text-lg text-black placeholder:text-slate-400 shadow-inner transition-all"
              onKeyDown={(e) => e.key === 'Enter' && addItem(otherItem)}
            />
            <button 
              onClick={toggleListening}
              className={`absolute right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-rose-500 shadow-sm'}`}
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone-lines'} text-sm`}></i>
            </button>
          </div>
          <button 
            onClick={() => addItem(otherItem)}
            className="w-14 h-14 bg-gradient-to-r from-[#FB7185] to-[#D41C6A] text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
          >
            <i className="fas fa-plus text-xl"></i>
          </button>
        </div>
      </section>

      {list.length > 0 && (
        <section className="space-y-3 animate-fade-in px-2 mt-4">
          <div className="flex justify-between items-center px-4">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nel Carrello</h3>
             <button onClick={() => setList([])} className="text-[10px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600">Svuota</button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {list.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-3xl flex items-center justify-between shadow-md border border-slate-50 hover:shadow-lg transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center border border-slate-100 shadow-inner">
                    {item.image ? (
                      <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                    ) : (
                      <i className="fas fa-shopping-basket text-slate-200 text-xl"></i>
                    )}
                  </div>
                  <span className="text-xl font-black text-slate-800 group-hover:text-[#D41C6A] transition-colors">{item.name}</span>
                </div>
                <button onClick={() => removeItem(item.id)} className="w-10 h-10 rounded-full text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90 flex items-center justify-center">
                  <i className="fas fa-trash-alt text-lg"></i>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ShoppingView;
