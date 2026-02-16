
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { playClickSound } from '../App';

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

interface ChatViewProps {
  onBack: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ onBack }) => {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = sessionStorage.getItem('forcelli_chat_history');
    return saved ? JSON.parse(saved) : [{
      role: 'model',
      text: 'Ciao! Sono Nellone. Come posso aiutarti oggi?',
      timestamp: Date.now()
    }];
  });
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatInstance = useRef<any>(null);

  useEffect(() => {
    sessionStorage.setItem('forcelli_chat_history', JSON.stringify(messages));
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const initChat = () => {
    if (!chatInstance.current) {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatInstance.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: "Sei Nellone, un assistente domestico gentile, premuroso e un po' spiritoso. Rispondi in italiano. Aiuta l'utente a gestire la sua vita quotidiana. Se ti chiedono di segnare impegni o spesa, dì loro che possono farlo premendo i tasti appositi nell'app per maggiore precisione.",
        },
      });
    }
    return chatInstance.current;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isTyping) return;
    
    playClickSound();
    const userMessage: Message = { role: 'user', text: inputText, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const chat = initChat();
      const response = await chat.sendMessage({ message: inputText });
      const botMessage: Message = { role: 'model', text: response.text || "Ops, qualcosa è andato storto!", timestamp: Date.now() };
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error("Chat Error:", err);
      setMessages(prev => [...prev, { role: 'model', text: "Scusami, ho avuto un piccolo problema di connessione.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[75vh] animate-fade-in bg-white rounded-[3rem] shadow-2xl border border-blue-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white text-xl">
             <i className="fas fa-robot"></i>
          </div>
          <div>
            <h3 className="text-white font-black text-xl leading-none">Chat AI</h3>
            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Sempre Disponibile</span>
          </div>
        </div>
        <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all">
          <i className="fas fa-times"></i>
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide bg-slate-50/50">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-entry`}>
            <div className={`max-w-[85%] px-6 py-4 rounded-[2rem] shadow-sm font-semibold text-base ${
              m.role === 'user' 
                ? 'bg-[#4F46E5] text-white rounded-tr-none' 
                : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-white border border-slate-100 px-6 py-4 rounded-[2rem] rounded-tl-none">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-slate-100">
        <div className="flex gap-3 bg-slate-50 p-2 rounded-[2rem] border border-slate-100 focus-within:border-blue-300 focus-within:bg-white transition-all">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Scrivi un messaggio..."
            className="flex-1 bg-transparent px-4 py-3 outline-none font-bold text-slate-600"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim() || isTyping}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              inputText.trim() && !isTyping ? 'bg-[#4F46E5] text-white shadow-lg' : 'bg-slate-200 text-slate-400'
            }`}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
