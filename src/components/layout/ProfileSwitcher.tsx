import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, HeartHandshake, X, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, getActiveProfile } from '@/stores/profileStore';

const ROLE_META: Record<string, { label: string; className: string }> = {
  superuser: { label: 'Super Usuário', className: 'bg-indigo-500/20 text-indigo-300' },
  admin: { label: 'Administrador', className: 'bg-violet-500/20 text-violet-300' },
  instructor: { label: 'Instrutor', className: 'bg-sky-500/20 text-sky-300' },
  staff: { label: 'Staff', className: 'bg-teal-500/20 text-teal-300' },
  student: { label: 'Aluno', className: 'bg-emerald-500/20 text-emerald-300' },
  guardian: { label: 'Responsável', className: 'bg-pink-500/20 text-pink-300' },
  guest: { label: 'Convidado', className: 'bg-slate-500/20 text-slate-400' },
};

interface ProfileSwitcherProps {
  /** Versão compacta (mobile header) — mostra só o avatar/tag, sem e-mail */
  compact?: boolean;
}

export const ProfileSwitcher: React.FC<ProfileSwitcherProps> = ({ compact = false }) => {
  const { user } = useAuthStore();
  const { profiles, activeProfileId, setActiveProfileId } = useProfileStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!user) return null;

  // Só é possível alternar quando há de fato mais de uma opção (conta própria + ao menos
  // 1 dependente, ou responsável "puro" com mais de 1 filho vinculado). Caso contrário,
  // mostra a identidade normalmente, mas sem abrir o painel (nada para escolher).
  const canSwitch = profiles.length > 1;

  const activeProfile = canSwitch ? getActiveProfile(profiles, activeProfileId) : null;
  const dependents = profiles.filter((p) => p.kind === 'guardian');
  const selfProfile = profiles.find((p) => p.kind === 'self');

  const isManagingDependent = activeProfile?.kind === 'guardian';
  const displayName = activeProfile?.name ?? user.name;
  const displayPhoto = activeProfile?.photo ?? user.photo;

  const avatar = (
    <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border border-slate-600/50 bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-[12px] font-black text-white uppercase">
      {displayPhoto ? (
        <img src={displayPhoto} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        displayName.charAt(0)
      )}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => canSwitch && setOpen((o) => !o)}
        className={[
          'flex items-center gap-2 rounded-xl transition-all text-left w-full',
          canSwitch ? 'cursor-pointer' : 'cursor-default',
          compact
            ? 'bg-slate-100 dark:bg-slate-800 px-2 py-1.5'
            : 'bg-slate-800/40 px-2 py-2 border border-slate-700/30' + (canSwitch ? ' hover:bg-slate-800/70' : ''),
        ].join(' ')}
      >
        {avatar}
        {!compact && (
          <div className="flex-1 min-w-0">
            <span
              className={[
                'inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-px rounded-full',
                canSwitch
                  ? (isManagingDependent ? 'bg-pink-500/20 text-pink-300' : 'bg-slate-600/30 text-slate-300')
                  : (ROLE_META[user.role]?.className ?? 'bg-slate-500/20 text-slate-400'),
              ].join(' ')}
            >
              {canSwitch
                ? (isManagingDependent ? 'Gerenciando Dependente' : 'Perfil Principal')
                : (ROLE_META[user.role]?.label ?? user.role)}
            </span>
            <p className="text-[11px] font-bold text-slate-100 leading-tight truncate mt-0.5">{displayName}</p>
            {!canSwitch && (
              <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
            )}
          </div>
        )}
        {canSwitch && (
          <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && canSwitch && (
        <div
          className={[
            'absolute z-[60] mt-2 w-72 max-w-[90vw] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden',
            compact ? 'right-0' : 'left-0',
          ].join(' ')}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <HeartHandshake size={15} />
              <span className="font-black text-[11px] uppercase tracking-widest">Alternar Perfil</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>

          {selfProfile && (
            <div className="px-4 pt-3 pb-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Sua Conta Principal</p>
              <button
                type="button"
                onClick={() => { setActiveProfileId(null); setOpen(false); }}
                className={[
                  'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all',
                  !isManagingDependent ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
                ].join(' ')}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[11px] font-black uppercase">
                  {selfProfile.photo ? <img src={selfProfile.photo} alt={selfProfile.name} className="w-full h-full object-cover" /> : selfProfile.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold truncate">{selfProfile.name}</p>
                  <p className={`text-[9px] font-black uppercase tracking-wider ${!isManagingDependent ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {ROLE_META[user.role]?.label ?? user.role}
                  </p>
                </div>
                {!isManagingDependent && <Check size={14} />}
              </button>
            </div>
          )}

          <div className="px-4 pt-2 pb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Dependentes / Filhos</p>
              <span className="text-[9px] font-bold text-slate-400">{dependents.length} cadastrado{dependents.length !== 1 ? 's' : ''}</span>
            </div>

            {!dependents.length ? (
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-3 text-center">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Nenhum dependente vinculado</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Peça a um administrador para vincular o cadastro do seu filho na ficha dele.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {dependents.map((d) => {
                  const active = activeProfile?.entityId === d.entityId;
                  return (
                    <button
                      key={d.entityId}
                      type="button"
                      onClick={() => { setActiveProfileId(d.entityId); setOpen(false); }}
                      className={[
                        'w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition-all',
                        active ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700',
                      ].join(' ')}
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-[11px] font-black uppercase">
                        {d.photo ? <img src={d.photo} alt={d.name} className="w-full h-full object-cover" /> : d.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold truncate">{d.name}</p>
                        <p className={`text-[9px] font-black uppercase tracking-wider truncate ${active ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {[d.belt, d.totalClasses !== undefined ? `${d.totalClasses} aulas` : null].filter(Boolean).join(' · ') || d.relation}
                        </p>
                      </div>
                      {active && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
