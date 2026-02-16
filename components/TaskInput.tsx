
import React, { useState, useEffect, useRef } from 'react';
import { Task, Category, Priority } from '../types';
import { playClickSound } from '../App';

interface TaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  onVoiceInput: (transcript: string) => void;
  isProcessing: boolean;
  preFillData: { title: string; deadline: string; category: Category; priority: Priority } | null;
}

const TaskInput: React.FC<TaskInputProps> = ({ onAddTask, onVoiceInput, isProcessing, preFillData }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(''); // Nota: Aggiunto campo descrizione sebbene non nel tipo Task originale, lo useremo per arricchire il titolo o lo ignoreremo nel salvataggio finale se il tipo non lo supporta
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [category, setCategory] = useState<Category>('personale');
  const [priority, setPriority] = useState<Priority>('media');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (preFillData) {
      setTitle(preFillData.title);
      setCategory(preFillData.category);
      setPriority(preFillData.priority);
      if (preFillData.deadline) {
        const d = new Date(preFillData.deadline);
        setDate(d.toISOString().split('T')[0]);
        setTime(d.toTimeString().slice(0, 5));
      }
    } else {
      // Default date to today
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
    }
  }, [preFillData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date || !time) return;
    
    playClickSound();
    const fullDeadline = new Date(`${date}T${time}`).toISOString();
    
    onAddTask({
      title: title.trim(),
      deadline: fullDeadline,
      category,
      priority
    });

    setTitle('');
    setDescription('');
    setPriority('media');
    setCategory('personale');
  };

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
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setTitle(transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
      {/* Titolo */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-black text-[#7C3AED] ml-1">Titolo *</label>
        <div className="relative group">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cosa devi fare?"
            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-400 pr-14"
          />
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${
              isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-[#EDE9FE] text-[#7C3AED]'
            }`}
          >
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
          </button>
        </div>
      </div>

      {/* Descrizione */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-black text-[#7C3AED] ml-1">Descrizione</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Dettagli (opzionale)"
          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none transition-all font-semibold text-slate-700 placeholder:text-slate-400 min-h-[120px] resize-none"
        />
      </div>

      {/* Data e Ora */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-[#7C3AED] ml-1">Data *</label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-purple-200 outline-none font-semibold text-slate-700 appearance-none pl-12"
            />
            <i className="far fa-calendar absolute left-5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none"></i>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-[#7C3AED] ml-1">Ora</label>
          <div className="relative">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-purple-200 outline-none font-semibold text-slate-700 appearance-none pl-12"
            />
            <i className="far fa-clock absolute left-5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* Assegna a e Priorità */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-[#7C3AED] ml-1">Assegna a</label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-purple-200 outline-none font-semibold text-slate-700 appearance-none pl-12"
            >
              <option value="personale">Io</option>
              <option value="familiare">Famiglia</option>
            </select>
            <i className="far fa-user absolute left-5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none"></i>
            <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xs"></i>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-black text-[#7C3AED] ml-1">Priorità</label>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-[1.5rem] focus:ring-2 focus:ring-purple-200 outline-none font-semibold text-slate-700 appearance-none pl-12"
            >
              <option value="bassa">Bassa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
            <div className={`absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full pointer-events-none ${
              priority === 'alta' ? 'bg-red-500' : priority === 'media' ? 'bg-amber-400' : 'bg-emerald-400'
            }`}></div>
            <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-xs"></i>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!title || !date || isProcessing}
        className="w-full bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#EC4899] text-white font-black py-6 rounded-[1.5rem] transition-all shadow-xl shadow-purple-100 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-xl mt-4"
      >
        <i className="far fa-save"></i>
        Salva Attività
      </button>
    </form>
  );
};

export default TaskInput;
