
import React, { useState } from 'react';
import { Task, Priority, Contact } from '../types';
import { playClickSound } from '../App';

interface TaskListProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  contacts: Contact[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks, onToggle, onDelete, contacts }) => {
  const [filterStatus, setFilterStatus] = useState<'tutti' | 'attivi' | 'completati'>('tutti');
  const [filterScope, setFilterScope] = useState<'tutti' | 'io'>('tutti');
  const [activeShareId, setActiveShareId] = useState<string | null>(null);
  const [showAgendaShare, setShowAgendaShare] = useState(false);

  // Filtro logico
  const filteredTasks = tasks.filter(t => {
    const statusMatch = filterStatus === 'tutti' || (filterStatus === 'attivi' ? !t.completed : t.completed);
    const scopeMatch = filterScope === 'tutti' || (filterScope === 'io' ? t.category === 'personale' : true);
    return statusMatch && scopeMatch;
  });

  // Funzione di raggruppamento
  const groupTasks = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();

    const groups: { [key: string]: { label: string; tasks: Task[]; isExpired?: boolean; isToday?: boolean } } = {
      expired: { label: 'SCADUTI', tasks: [], isExpired: true },
      today: { label: 'OGGI', tasks: [], isToday: true },
      future: { label: 'PROSSIMI', tasks: [] }
    };

    filteredTasks.forEach(task => {
      const taskDate = new Date(task.deadline);
      taskDate.setHours(0, 0, 0, 0);
      const taskTime = taskDate.getTime();

      if (!task.completed && taskTime < today) {
        groups.expired.tasks.push(task);
      } else if (taskTime === today) {
        groups.today.tasks.push(task);
      } else {
        groups.future.tasks.push(task);
      }
    });

    return groups;
  };

  const groups = groupTasks();

  const handleShareTask = (task: Task, contact: Contact) => {
    let phone = contact.phone.replace(/\s+/g, '');
    if (phone.startsWith('3') && phone.length === 10) phone = '39' + phone;
    const formattedDate = new Date(task.deadline).toLocaleString('it-IT', { day: '2-digit', month: 'long' });
    const message = encodeURIComponent(`Ciao ${contact.name}! Ti ricordo: *${task.title}* per il ${formattedDate}.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setActiveShareId(null);
  };

  const handleShareAgenda = (contact: Contact) => {
    const todayTasks = groups.today.tasks.filter(t => !t.completed);
    if (todayTasks.length === 0) {
      alert("Non ci sono impegni attivi per oggi da condividere.");
      return;
    }

    let phone = contact.phone.replace(/\s+/g, '');
    if (phone.startsWith('3') && phone.length === 10) phone = '39' + phone;

    const taskListString = todayTasks.map((t, idx) => {
      const time = new Date(t.deadline).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      return `${idx + 1}. *${t.title}* alle ore ${time}`;
    }).join('\n');

    const message = encodeURIComponent(`Ciao ${contact.name}! Ecco i miei impegni di oggi:\n\n${taskListString}`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    setShowAgendaShare(false);
  };

  const renderGroup = (key: string, label: string, groupTasks: Task[], isExpired?: boolean, isToday?: boolean) => {
    if (groupTasks.length === 0) return null;

    const displayLabel = isExpired 
      ? new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(groupTasks[0].deadline)).toUpperCase() 
      : label;

    const colorClass = isExpired ? 'text-[#FB7185]' : (isToday ? 'text-[#7C3AED]' : 'text-[#3B82F6]');
    const bgColorIcon = isExpired ? 'bg-[#FFE4E6]' : (isToday ? 'bg-[#F5F3FF]' : 'bg-[#EFF6FF]');

    return (
      <div key={key} className="mb-10 animate-fade-in">
        <div className="flex items-center justify-between mb-5 px-2">
          <div className="flex items-center gap-4">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${bgColorIcon} ${colorClass}`}>
                <i className={`far fa-calendar-check text-xl`}></i>
             </div>
             <div className="flex flex-col">
               <h3 className={`text-2xl font-black tracking-tight ${colorClass}`}>
                 {displayLabel}
               </h3>
               {isExpired && (
                 <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-[#FB7185] text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">SCADUTO</span>
                 </div>
               )}
             </div>
          </div>
          <span className="text-sm font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{groupTasks.length} {groupTasks.length === 1 ? 'attività' : 'attività'}</span>
        </div>

        <div className="space-y-4">
          {groupTasks.map(task => (
            <div key={task.id} className="group bg-white rounded-[2rem] p-6 flex items-center gap-5 shadow-sm border border-slate-50 hover:shadow-md transition-all active:scale-[0.98]">
              <button 
                onClick={() => onToggle(task.id)}
                className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center transition-all flex-shrink-0 ${
                  task.completed 
                  ? 'bg-[#7C3AED] border-[#7C3AED] text-white' 
                  : 'border-slate-200'
                }`}
              >
                {task.completed && <i className="fas fa-check text-xs"></i>}
              </button>
              
              <div className="flex-1">
                <h4 className={`font-black text-2xl leading-snug ${task.completed ? 'line-through text-slate-300' : 'text-slate-800'}`}>
                  {task.title}
                </h4>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-[11px] font-black uppercase tracking-widest ${
                    task.priority === 'alta' ? 'text-red-500' : task.priority === 'media' ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    {task.priority}
                  </span>
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">
                    {task.category}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setActiveShareId(task.id)} className="w-11 h-11 rounded-full bg-green-50 text-green-500 flex items-center justify-center hover:bg-green-100 transition-colors">
                  <i className="fab fa-whatsapp text-xl"></i>
                </button>
                <button onClick={() => onDelete(task.id)} className="w-11 h-11 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-6">
      {/* Header con pulsante Invia Agenda */}
      <div className="flex items-center justify-between mb-8 px-2">
         <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtri e Opzioni</h2>
         {groups.today.tasks.some(t => !t.completed) && (
           <button 
             onClick={() => { playClickSound(); setShowAgendaShare(true); }}
             className="bg-green-500 text-white px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
           >
             <i className="fab fa-whatsapp"></i> Invia Agenda
           </button>
         )}
      </div>

      {/* Filtri Row 1 */}
      <div className="flex gap-2 mb-4 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] w-fit shadow-sm border border-slate-50">
        {(['tutti', 'attivi', 'completati'] as const).map(s => (
          <button 
            key={s}
            onClick={() => { playClickSound(); setFilterStatus(s); }}
            className={`px-7 py-3.5 rounded-2xl text-base font-black capitalize transition-all ${filterStatus === s ? 'bg-[#7C3AED] shadow-lg shadow-purple-200 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Filtri Row 2 */}
      <div className="flex gap-2 mb-12 bg-white/80 backdrop-blur-md p-2 rounded-[2rem] w-fit shadow-sm border border-slate-50">
        {(['tutti', 'io'] as const).map(s => (
          <button 
            key={s}
            onClick={() => { playClickSound(); setFilterScope(s); }}
            className={`px-10 py-3.5 rounded-2xl text-base font-black capitalize transition-all ${filterScope === s ? 'bg-[#3B82F6] shadow-lg shadow-blue-200 text-white' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {s === 'io' ? 'Io' : 'Tutti'}
          </button>
        ))}
      </div>

      {/* Liste raggruppate */}
      <div className="pb-24">
        {renderGroup('expired', groups.expired.label, groups.expired.tasks, groups.expired.isExpired)}
        {renderGroup('today', groups.today.label, groups.today.tasks, false, true)}
        {renderGroup('future', groups.future.label, groups.future.tasks)}
        
        {filteredTasks.length === 0 && (
          <div className="text-center py-24 bg-white/50 rounded-[4rem] border-2 border-dashed border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-wind text-4xl text-slate-200"></i>
            </div>
            <p className="font-black text-2xl text-slate-300">Nulla da mostrare...</p>
          </div>
        )}
      </div>

      {/* Share Overlay Singolo Task */}
      {activeShareId && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end p-6" onClick={() => setActiveShareId(null)}>
          <div className="bg-white w-full rounded-[3.5rem] p-10 animate-slide-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">Condividi con...</h3>
              <button onClick={() => setActiveShareId(null)} className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
              {contacts.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => handleShareTask(filteredTasks.find(t => t.id === activeShareId)!, c)}
                  className="w-full flex items-center justify-between p-6 bg-slate-50 rounded-[2.5rem] hover:bg-green-50 hover:border-green-100 border border-transparent transition-all active:scale-95"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                      <i className="fas fa-user text-xl"></i>
                    </div>
                    <span className="font-black text-xl text-slate-800">{c.name}</span>
                  </div>
                  <i className="fab fa-whatsapp text-green-500 text-3xl"></i>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Overlay Agenda Giornaliera */}
      {showAgendaShare && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end p-6" onClick={() => setShowAgendaShare(false)}>
          <div className="bg-white w-full rounded-[3.5rem] p-10 animate-slide-in shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-black text-slate-900">Invia Agenda a...</h3>
              <button onClick={() => setShowAgendaShare(false)} className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <p className="text-slate-400 font-bold mb-8 ml-1">Verranno inviati tutti gli impegni di oggi.</p>
            <div className="space-y-4">
              {contacts.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => handleShareAgenda(c)}
                  className="w-full flex items-center justify-between p-7 bg-green-50/50 rounded-[2.5rem] border border-green-100/50 hover:bg-green-100 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-green-600 shadow-sm">
                      <i className="fas fa-paper-plane text-2xl"></i>
                    </div>
                    <div className="text-left">
                      <span className="font-black text-2xl text-slate-800">{c.name}</span>
                      <p className="text-xs font-bold text-green-600 uppercase tracking-widest mt-0.5">WhatsApp</p>
                    </div>
                  </div>
                  <i className="fab fa-whatsapp text-green-500 text-4xl"></i>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
