
import React from 'react';
import { Task, Contact } from '../types';
import TaskList from './TaskList';

interface TodayOverviewProps {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  contacts: Contact[];
}

const TodayOverview: React.FC<TodayOverviewProps> = ({ tasks, onToggle, onDelete, contacts }) => {
  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50/50 p-7 rounded-[2.5rem] shadow-sm border-2 border-blue-100">
        <div className="flex justify-between items-start mb-5">
          <div>
            <h2 className="text-2xl font-black text-blue-900 tracking-tight">Oggi</h2>
            <p className="text-blue-600/60 text-sm font-bold">{tasks.length} {tasks.length === 1 ? 'impegno' : 'impegni'}</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-blue-600">{Math.round(progress)}%</span>
            <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest">Fatto</p>
          </div>
        </div>
        <div className="w-full bg-white h-3 rounded-full overflow-hidden border border-blue-100 shadow-inner">
          <div 
            className="bg-blue-500 h-full transition-all duration-1000 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white/40 rounded-[2.5rem] border border-blue-50">
        {tasks.length > 0 ? (
          <TaskList tasks={tasks} onToggle={onToggle} onDelete={onDelete} contacts={contacts} />
        ) : (
          <div className="p-16 text-center">
            <div className="w-20 h-20 bg-blue-50 text-blue-400 rounded-[2rem] flex items-center justify-center mx-auto mb-5 shadow-inner">
              <i className="fas fa-smile text-2xl"></i>
            </div>
            <h3 className="font-black text-blue-800 text-lg">Tutto Calmo!</h3>
            <p className="text-blue-600/50 text-sm mt-1 font-medium">Non hai scadenze per oggi.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodayOverview;
