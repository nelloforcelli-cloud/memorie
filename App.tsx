
import React, { useState, useEffect, useRef } from 'react';
import { Task, Category, Priority, ShoppingItem, Contact, QuickItem } from './types';
import { extractTaskData, getAiAssistantResponse } from './services/geminiService';
import { 
  saveQuickItemsToDB, 
  getQuickItemsFromDB, 
  saveShoppingListToDB, 
  getShoppingListFromDB 
} from './services/storageService';
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import TodayOverview from './components/TodayOverview';
import ShoppingView from './components/ShoppingView';
import ChatView from './components/ChatView';
import { GoogleGenAI, Modality } from "@google/genai";

export type View = 'home' | 'tasks' | 'shopping' | 'contacts' | 'chat';

const DEFAULT_QUICK_ITEMS: QuickItem[] = [
  { id: 'pane', name: 'Pane', image: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&h=400&fit=crop', color: 'from-amber-400 to-orange-500' },
  { id: 'latte', name: 'Latte', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop', color: 'from-sky-300 to-blue-400' },
  { id: 'zucchero', name: 'Zucchero', image: 'https://purepng.com/public/uploads/large/purepng.com-sugar-packetfood-sugar-packet-941524611413o8970.png', color: 'from-gray-100 to-gray-200' },
  { id: 'caffe', name: 'Caffè', image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop', color: 'from-amber-700 to-amber-900' },
  { id: 'carta', name: 'Carta Igienica', image: 'https://images.unsplash.com/photo-1584556812952-905ffd0c611a?w=400&h=400&fit=crop', color: 'from-sky-100 to-sky-300' },
  { id: 'yogurt', name: 'Yogurt', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop', color: 'from-pink-300 to-pink-500' },
  { id: 'parmigiano', name: 'Parmigiano', image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop', color: 'from-yellow-400 to-amber-500' },
  { id: 'fazzoletti', name: 'Fazzoletti', image: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=400&fit=crop', color: 'from-teal-300 to-teal-500' }
];

let audioContext: AudioContext | null = null;

function decodeBase64(base64: string) {
  const parts = base64.split(',');
  const binaryString = atob(parts[1] || parts[0]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

export const playClickSound = () => {
  const isEnabled = localStorage.getItem('forcelli_sound_enabled') !== 'false';
  if (!isEnabled) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now); 
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {}
};

const speakText = async (text: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      if (!audioContext) audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') await audioContext.resume();
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
    }
  } catch (err) {}
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isDbLoading, setIsDbLoading] = useState(true);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [quickItems, setQuickItems] = useState<QuickItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [aiAssistantResponse, setAiAssistantResponse] = useState<string | null>(null);
  const [isAiListening, setIsAiListening] = useState(false);
  const [showTaskInput, setShowTaskInput] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Caricamento Iniziale
  useEffect(() => {
    const loadInitialData = async () => {
      const savedTasks = localStorage.getItem('forcelli_todo_tasks');
      const savedContacts = localStorage.getItem('forcelli_todo_contacts');
      setTasks(savedTasks ? JSON.parse(savedTasks) : []);
      setContacts(savedContacts ? JSON.parse(savedContacts) : [
        { id: '1', name: 'Nello', phone: '3338642224' },
        { id: '2', name: 'Teresa', phone: '3473600325' }
      ]);

      const storedQuick = await getQuickItemsFromDB();
      const storedShopping = await getShoppingListFromDB();
      const storedMap = new Map(storedQuick.map(item => [item.id, item]));
      const mergedQuick = DEFAULT_QUICK_ITEMS.map(def => {
        const stored = storedMap.get(def.id);
        return stored ? { ...def, ...stored } : def;
      });
      setQuickItems(mergedQuick);
      setShoppingList(storedShopping);
      
      setIsDbLoading(false);
    };
    loadInitialData();
  }, []);

  // Timer sparizione risposta AI
  useEffect(() => {
    if (aiAssistantResponse) {
      const timer = setTimeout(() => setAiAssistantResponse(null), 30000);
      return () => clearTimeout(timer);
    }
  }, [aiAssistantResponse]);

  // Auto-salvataggio locale
  useEffect(() => {
    if (!isDbLoading) {
      localStorage.setItem('forcelli_todo_tasks', JSON.stringify(tasks));
      saveQuickItemsToDB(quickItems);
      saveShoppingListToDB(shoppingList);
    }
  }, [tasks, shoppingList, quickItems, isDbLoading]);

  const navigateTo = (view: View) => {
    playClickSound();
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const addTask = (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    playClickSound();
    const newTask: Task = { ...task, id: crypto.randomUUID(), completed: false, createdAt: new Date().toISOString() };
    setTasks(prev => [newTask, ...prev]);
    setShowTaskInput(false);
  };

  const toggleTask = (id: string) => {
    playClickSound();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    playClickSound();
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const toggleAiAssistant = () => {
    playClickSound();
    if (isAiListening) {
      recognitionRef.current?.stop();
      setIsAiListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.onstart = () => { setIsAiListening(true); setAiAssistantResponse(null); };
    recognition.onend = () => setIsAiListening(false);
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);
      const lowerTranscript = transcript.toLowerCase();
      const isTaskIntent = lowerTranscript.includes('segna') || lowerTranscript.includes('ricorda') || lowerTranscript.includes('aggiungi') || lowerTranscript.includes('impegno');
      try {
        if (isTaskIntent) {
           const extracted = await extractTaskData(transcript);
           if (extracted && extracted.title) {
              addTask({ title: extracted.title, deadline: extracted.deadline || new Date().toISOString(), category: extracted.category, priority: extracted.priority });
              const textResp = `Certamente! Ho segnato: "${extracted.title}".`;
              setAiAssistantResponse(textResp);
              await speakText(textResp);
              return;
           }
        }
        const response = await getAiAssistantResponse(transcript);
        setAiAssistantResponse(response);
        await speakText(response);
      } catch (err) {
        setAiAssistantResponse("Problema tecnico con l'AI.");
      } finally {
        setIsProcessing(false);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const todayTasks = tasks.filter(task => {
    const today = new Date();
    const taskDate = new Date(task.deadline);
    return taskDate.toLocaleDateString('it-IT') === today.toLocaleDateString('it-IT');
  });

  if (isDbLoading) {
    return (
      <div className="min-h-screen bg-[#F0F9FF] flex flex-col items-center justify-center p-10 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
        <h1 className="text-xl font-black text-blue-900 tracking-widest uppercase">Caricamento Nellone...</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 relative overflow-x-hidden flex flex-col bg-[#F0F9FF]">
      <main className="max-w-md mx-auto px-6 w-full pt-16">
        {currentView === 'home' && (
          <div className="space-y-8 animate-fade-in">
            <div className="mb-2">
              <div className="flex items-center gap-4">
                <h1 className="text-5xl font-black text-[#7C3AED] flex items-center gap-3">
                  Ciao! <span className="animate-bounce">👋</span>
                </h1>
                <button 
                  onClick={() => navigateTo('chat')}
                  className="w-12 h-12 bg-white rounded-2xl shadow-xl flex items-center justify-center text-[#10A37F] active:scale-90 transition-all border border-green-50 mt-1"
                  title="Apri Chat GPT"
                >
                  <i className="fas fa-robot text-xl"></i>
                </button>
              </div>
              <p className="text-[#A78BFA] font-bold text-lg mt-1 lowercase first-letter:uppercase">
                {new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
              </p>
            </div>

            <div className="bg-[#8B5CF6] p-6 rounded-[2.5rem] text-white shadow-xl shadow-purple-200/50 flex flex-col gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                <i className="far fa-calendar-alt"></i>
              </div>
              <div>
                <div className="text-4xl font-black">{todayTasks.filter(t => !t.completed).length}</div>
                <div className="text-xs font-bold opacity-80 leading-tight uppercase tracking-widest">Impegni Oggi</div>
              </div>
            </div>
            
            <button 
              onClick={() => { setShowTaskInput(true); navigateTo('tasks'); }}
              className="w-full bg-[#A855F7] text-white py-8 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-xl shadow-purple-100 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <i className="fas fa-plus text-xl"></i>
              <span className="text-2xl font-black tracking-tight uppercase">✨ NUOVA ATTIVITÀ</span>
            </button>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => navigateTo('shopping')} className="bg-[#FB7185] text-white p-6 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-xl shadow-rose-100 active:scale-95 transition-all">
                <i className="fas fa-shopping-cart text-xl"></i>
                <span className="text-xl font-black">SPESA</span>
              </button>
              <button onClick={() => { setShowTaskInput(false); navigateTo('tasks'); }} className="bg-[#3B82F6] text-white p-6 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-xl shadow-blue-100 active:scale-95 transition-all">
                <i className="fas fa-clipboard-list text-xl"></i>
                <span className="text-xl font-black">IMPEGNI</span>
              </button>
            </div>

            <button 
              onClick={toggleAiAssistant}
              className={`w-full py-7 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 ${
                isAiListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#10B981] text-white'
              }`}
            >
              <i className={`fas ${isAiListening ? 'fa-stop' : 'fa-microphone'} text-xl`}></i>
              <span className="text-xl font-black uppercase">🤖 USA COMANDO VOCALE</span>
            </button>

            {aiAssistantResponse && (
              <div className="bg-white p-6 rounded-[2rem] border border-purple-100 shadow-lg animate-entry">
                <p className="text-[#7C3AED] font-bold italic">"{aiAssistantResponse}"</p>
              </div>
            )}

            <section className="mt-4">
              <TodayOverview tasks={todayTasks} onToggle={toggleTask} onDelete={deleteTask} contacts={contacts} />
            </section>
          </div>
        )}

        {currentView === 'tasks' && (
          <div className="animate-fade-in py-6">
            {!showTaskInput ? (
               <>
                 <div className="flex items-center gap-6 mb-8">
                    <button onClick={() => navigateTo('home')} className="w-14 h-14 rounded-3xl bg-white flex items-center justify-center text-blue-600 shadow-xl active:scale-90 transition-all">
                      <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <h2 className="text-3xl font-black text-blue-700 leading-none">Tutti gli Impegni</h2>
                 </div>
                 <TaskList tasks={tasks} onToggle={toggleTask} onDelete={deleteTask} contacts={contacts} />
               </>
            ) : (
               <div className="animate-fade-in">
                  <div className="flex items-center gap-6 mb-8">
                    <button onClick={() => setShowTaskInput(false)} className="w-14 h-14 rounded-3xl bg-white flex items-center justify-center text-purple-600 shadow-xl active:scale-90 transition-all">
                      <i className="fas fa-arrow-left text-lg"></i>
                    </button>
                    <h2 className="text-3xl font-black text-purple-700">Nuova Attività</h2>
                  </div>
                  <TaskInput onAddTask={addTask} onVoiceInput={() => {}} isProcessing={isProcessing} preFillData={null} />
               </div>
            )}
          </div>
        )}

        {currentView === 'shopping' && (
          <ShoppingView 
            list={shoppingList} 
            setList={setShoppingList} 
            quickItems={quickItems}
            setQuickItems={setQuickItems}
            onBack={() => navigateTo('home')} 
          />
        )}

        {currentView === 'chat' && (
          <ChatView onBack={() => navigateTo('home')} />
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl border border-blue-50 px-8 py-4 rounded-full flex gap-10 items-center z-50 shadow-2xl">
        <button onClick={() => navigateTo('home')} className={`transition-all ${currentView === 'home' ? 'text-[#7C3AED] scale-125' : 'text-slate-300'}`}>
          <i className="fas fa-house text-2xl"></i>
        </button>
        <button onClick={() => navigateTo('tasks')} className={`transition-all ${currentView === 'tasks' ? 'text-[#3B82F6] scale-125' : 'text-slate-300'}`}>
          <i className="fas fa-clipboard-list text-2xl"></i>
        </button>
        <button onClick={() => navigateTo('shopping')} className={`transition-all ${currentView === 'shopping' ? 'text-[#FB7185] scale-125' : 'text-slate-300'}`}>
          <i className="fas fa-shopping-basket text-2xl"></i>
        </button>
      </nav>
    </div>
  );
};

export default App;
