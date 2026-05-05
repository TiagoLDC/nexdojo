import React from 'react';
import { motion } from 'motion/react';
import { PrivacyValue } from '../PrivacyValue';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, highlight }) => (
  <motion.div 
    whileHover={{ y: -5, scale: 1.02 }}
    className={`bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[32px] border shadow-sm transition-all hover:shadow-xl ${highlight ? 'border-red-200 dark:border-red-900 ring-2 ring-red-100 dark:ring-red-900/20' : 'border-slate-100 dark:border-slate-800'}`}
  >
    <div className="bg-slate-50 dark:bg-slate-800 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 transition-colors shadow-inner">{icon}</div>
    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em] sm:tracking-[0.2em] leading-none mb-2">{label}</p>
    <div className="flex items-end justify-between gap-1.5 overflow-hidden">
      <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white transition-colors italic tracking-tighter leading-tight shrink-0">{value}</h3>
      {trend && <span className="text-[8px] sm:text-[10px] font-black text-emerald-500 dark:text-emerald-400 mb-1 uppercase tracking-widest whitespace-nowrap shrink-0">{trend}</span>}
    </div>
  </motion.div>
);

interface DetailItemProps {
  label: string;
  value: string;
  isSensitive?: boolean;
  maskType?: 'cpf' | 'rg' | 'generic';
}

export const DetailItem: React.FC<DetailItemProps> = ({ label, value, isSensitive, maskType = 'generic' }) => (
  <div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
    {isSensitive ? (
      <PrivacyValue value={value} maskType={maskType} className="text-base" />
    ) : (
      <p className="text-base font-bold text-slate-800 dark:text-white">{value}</p>
    )}
  </div>
);
