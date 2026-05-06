import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  Award, 
  ShieldCheck, 
  LogOut,
  Settings, 
  Sun, 
  Moon,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { Academy, User, Language } from '../../types';
import { StorageService } from '../../services/storage';
import { getTranslation } from '../../services/translations';

interface SidebarProps {
  academy: Academy | null;
  user: User;
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onLogout: () => void;
  onSwitchAcademy?: (acad: Academy) => void;
  translatedMainMenu: any[];
  translatedManagementMenu: any[];
  pendingCount?: number;
  academies: Academy[];
}

const Sidebar: React.FC<SidebarProps> = ({ 
  academy, 
  user,
  isCollapsed, 
  setIsCollapsed, 
  theme, 
  onToggleTheme, 
  language, 
  onLanguageChange, 
  onLogout,
  onSwitchAcademy, 
  translatedMainMenu, 
  translatedManagementMenu, 
  pendingCount,
  academies
}) => {

  const location = useLocation();
  const t = getTranslation(language);
  
  const languages = [
    { code: 'pt' as Language, label: 'PT', flag: '🇧🇷' },
    { code: 'en' as Language, label: 'EN', flag: '🇺🇸' },
    { code: 'es' as Language, label: 'ES', flag: '🇪🇸' },
  ];

  return (
    <aside className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-slate-900 text-white transition-all duration-300 z-50 shadow-2xl ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6">
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="absolute -right-3 top-10 bg-indigo-600 text-white p-1 rounded-full border-4 border-slate-900 hover:bg-indigo-500 shadow-lg z-10 transition-transform active:scale-90">
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
        <div className={`mb-6 flex flex-col gap-3 ${isCollapsed ? 'items-center' : ''}`}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl overflow-hidden shrink-0 shadow-lg shadow-indigo-500/20 flex items-center justify-center p-0.5">
              {academy?.logo ? (
                <img 
                  src={academy.logo} 
                  alt={academy.name} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Award className="text-white" size={24} />
              )}
            </div>
            {!isCollapsed && (
              <h1 className="text-lg font-black tracking-tighter uppercase italic leading-tight break-words flex-1">
                {academy?.name || 'Gestão Master'}
              </h1>
            )}
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto custom-scrollbar">
        {user.role === 'superuser' && (
          <div className="px-1 mb-4">
            {!isCollapsed && <p className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 px-3 italic">Master Control</p>}
            <div className={`bg-indigo-900/40 rounded-2xl border border-indigo-500/20 p-3 ${isCollapsed ? 'flex justify-center' : ''}`}>
              {isCollapsed ? (
                <ShieldCheck size={20} className="text-indigo-400" />
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <ShieldCheck size={16} />
                    <span className="font-black text-[9px] uppercase tracking-widest">Switch Academy</span>
                  </div>
                  <select 
                    value={academy?.id || ''}
                    onChange={(e) => {
                      const selected = academies.find(a => a.id === e.target.value);
                      if (selected && onSwitchAcademy) onSwitchAcademy(selected);
                    }}
                    className="w-full bg-slate-800 border-none rounded-lg text-[10px] font-bold text-slate-300 py-1.5 px-2 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a Unit</option>
                    {academies.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1">
          {!isCollapsed && <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Links</p>}
          {translatedMainMenu.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.to;
            const hasBadge = item.to === '/' && (pendingCount || 0) > 0;
            
            return (
              <Link key={item.to} to={item.to} className={`flex items-center rounded-xl transition-all h-10 relative ${isActive ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`} title={isCollapsed ? item.label : ''}>
                <div className="relative">
                  {item.icon}
                  {hasBadge && isCollapsed && (
                    <span className="absolute -top-1 -right-1.5 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900 animate-pulse" />
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span className="font-bold text-xs">{item.label}</span>
                    {hasBadge && (
                      <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                        {pendingCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          {!isCollapsed && <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 px-3">Management</p>}
          <div className={!isCollapsed ? "grid grid-cols-2 gap-2" : "space-y-1"}>
            {translatedManagementMenu.filter(item => item.roles.includes(user.role)).map((item) => {
              const isActive = location.pathname === item.to;
              
              if (item.to === '/logout') {
                return (
                  <button 
                    key={item.to} 
                    onClick={onLogout} 
                    className={`flex items-center rounded-xl transition-all cursor-pointer ${!isCollapsed ? 'h-16 flex-col justify-center gap-1 text-center w-full' : 'h-10 justify-center w-10 mx-auto'} text-slate-500 hover:text-red-400 hover:bg-slate-800`}
                    title={isCollapsed ? item.label : ''}
                  >
                    {item.icon}
                    {!isCollapsed && <span className="font-black text-[9px] uppercase tracking-tighter leading-none">{item.label}</span>}
                  </button>
                );
              }

              return (
                <Link key={item.to} to={item.to} className={`flex items-center rounded-xl transition-all ${!isCollapsed ? 'h-16 flex-col justify-center gap-1 text-center' : 'h-10 justify-center w-10 mx-auto'} ${isActive ? 'bg-slate-800 text-indigo-400' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`} title={isCollapsed ? item.label : ''}>
                  {item.icon}
                  {!isCollapsed && <span className="font-black text-[9px] uppercase tracking-tighter leading-none">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="mt-auto space-y-1 p-4 border-t border-slate-800 bg-slate-900/50">
        {!isCollapsed && (
          <div className="flex items-center justify-around mb-3 bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50">
            {languages.map((lang) => (
              <button 
                key={lang.code}
                onClick={() => onLanguageChange(lang.code)}
                className={`flex flex-col items-center gap-1 transition-all ${language === lang.code ? 'scale-110' : 'opacity-40 grayscale group hover:grayscale-0 hover:opacity-100'}`}
              >
                <span className="text-xl leading-none">{lang.flag}</span>
                <span className="text-[7px] font-black uppercase tracking-widest">{lang.label}</span>
              </button>
            ))}
          </div>
        )}
        <Link to="/settings" className={`flex items-center rounded-xl h-10 ${location.pathname === '/settings' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800'} ${isCollapsed ? 'justify-center w-10 mx-auto' : 'px-4 gap-3'}`} title={t.settings}>
          <Settings size={18} />
          {!isCollapsed && <span className="font-bold text-xs">{t.settings}</span>}
        </Link>
        
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-4 justify-between'} h-12 mt-2`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              {theme === 'dark' ? <Moon size={16} className="text-indigo-400" /> : <Sun size={16} className="text-amber-500" />}
              <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">
                {theme === 'dark' ? 'Escuro' : 'Claro'}
              </span>
            </div>
          )}
          
          <button 
            onClick={onToggleTheme}
            className={`relative w-10 h-5 rounded-full transition-colors duration-300 focus:outline-none ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <motion.div 
              animate={{ x: theme === 'dark' ? 22 : 2 }}
              initial={false}
              className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
        {!isCollapsed && (
          <div className="mt-4 px-4 pb-2">
            <div className="bg-amber-500/90 text-black text-[8px] font-black px-2 py-1 rounded text-center uppercase tracking-tighter">
              VERSÃO QAS 06/05/2026 13:42:00
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
