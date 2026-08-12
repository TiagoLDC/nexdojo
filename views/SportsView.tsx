import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck, ArrowUp, ArrowDown } from 'lucide-react';
import { User } from '../types';
import type { Sport, BeltRank, BeltCategory } from '@/types';
import { sportService, BeltRankInput } from '@/features/sports/services/sportService';
import { BELT_VISUAL_CONFIG_BY_COLOR_KEY, DEFAULT_BELT_VISUAL_CONFIG } from '../constants';
import { Modal } from '@/components/ui/Modal';
import { useTranslation } from '../services/LanguageContext';

interface SportsViewProps {
  user: User;
}

const CATEGORY_LABELS: Record<BeltCategory, string> = {
  kids: 'Infantil',
  adult: 'Adulto',
  both: 'Ambos',
};

// Mesmo vocabulário de cor usado pelo BeltBadge (constants.ts) — escolher uma cor aqui
// tem efeito real na exibição, em vez de uma paleta genérica desconectada do render.
const COLOR_KEYS = Object.keys(BELT_VISUAL_CONFIG_BY_COLOR_KEY);

const emptyBeltForm = (nextOrderIndex: number): BeltRankInput => ({
  name: '',
  colorKey: COLOR_KEYS[0],
  orderIndex: nextOrderIndex,
  degreeCount: 4,
  category: 'adult',
  minAge: null,
  maxAge: null,
});

const SportsView: React.FC<SportsViewProps> = ({ user }) => {
  const { showNotification } = useTranslation();

  const [sports, setSports] = useState<Sport[]>([]);
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [beltRanks, setBeltRanks] = useState<BeltRank[]>([]);
  const [loading, setLoading] = useState(true);

  const [isSportModalOpen, setIsSportModalOpen] = useState(false);
  const [editingSport, setEditingSport] = useState<Sport | null>(null);
  const [sportForm, setSportForm] = useState({ name: '', active: true });

  const [isBeltModalOpen, setIsBeltModalOpen] = useState(false);
  const [editingBelt, setEditingBelt] = useState<BeltRank | null>(null);
  const [beltForm, setBeltForm] = useState<BeltRankInput>(emptyBeltForm(0));

  const loadSports = async () => {
    try {
      const data = await sportService.getAll();
      setSports(data);
      if (!selectedSportId && data.length) setSelectedSportId(data[0].id);
    } catch {
      showNotification('Erro ao carregar esportes.', 'error');
    }
  };

  const loadBeltRanks = async (sportId: string) => {
    try {
      const data = await sportService.getBeltRanks(sportId);
      setBeltRanks(data);
    } catch {
      showNotification('Erro ao carregar faixas.', 'error');
    }
  };

  useEffect(() => {
    setLoading(true);
    loadSports().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedSportId) loadBeltRanks(selectedSportId);
    else setBeltRanks([]);
  }, [selectedSportId]);

  if (user.role !== 'superuser') return null;

  const openNewSport = () => {
    setEditingSport(null);
    setSportForm({ name: '', active: true });
    setIsSportModalOpen(true);
  };

  const openEditSport = (sport: Sport) => {
    setEditingSport(sport);
    setSportForm({ name: sport.name, active: sport.active });
    setIsSportModalOpen(true);
  };

  const handleSaveSport = async () => {
    if (!sportForm.name.trim()) { showNotification('Informe o nome do esporte.', 'error'); return; }
    try {
      if (editingSport) {
        await sportService.update(editingSport.id, sportForm);
      } else {
        await sportService.create(sportForm);
      }
      setIsSportModalOpen(false);
      await loadSports();
      showNotification('Esporte salvo com sucesso!', 'success');
    } catch {
      showNotification('Erro ao salvar esporte.', 'error');
    }
  };

  const openNewBelt = () => {
    const nextOrder = beltRanks.length ? Math.max(...beltRanks.map(b => b.orderIndex)) + 1 : 0;
    setEditingBelt(null);
    setBeltForm(emptyBeltForm(nextOrder));
    setIsBeltModalOpen(true);
  };

  const openEditBelt = (belt: BeltRank) => {
    setEditingBelt(belt);
    setBeltForm({
      name: belt.name,
      colorKey: belt.colorKey,
      orderIndex: belt.orderIndex,
      degreeCount: belt.degreeCount,
      category: belt.category,
      minAge: belt.minAge ?? null,
      maxAge: belt.maxAge ?? null,
    });
    setIsBeltModalOpen(true);
  };

  const handleSaveBelt = async () => {
    if (!selectedSportId) return;
    if (!beltForm.name.trim()) { showNotification('Informe o nome da faixa.', 'error'); return; }
    try {
      if (editingBelt) {
        await sportService.updateBeltRank(selectedSportId, editingBelt.id, beltForm);
      } else {
        await sportService.createBeltRank(selectedSportId, beltForm);
      }
      setIsBeltModalOpen(false);
      await loadBeltRanks(selectedSportId);
      showNotification('Faixa salva com sucesso!', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao salvar faixa.', 'error');
    }
  };

  const handleDeleteBelt = async (belt: BeltRank) => {
    if (!selectedSportId) return;
    if (!window.confirm(`Remover a faixa "${belt.name}"? Só é possível se ela não estiver em uso.`)) return;
    try {
      await sportService.deleteBeltRank(selectedSportId, belt.id);
      await loadBeltRanks(selectedSportId);
      showNotification('Faixa removida.', 'success');
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Erro ao remover faixa.', 'error');
    }
  };

  // Troca de order_index com o vizinho (reordenar sem drag-and-drop)
  const handleMoveBelt = async (belt: BeltRank, direction: -1 | 1) => {
    if (!selectedSportId) return;
    const sorted = [...beltRanks].sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = sorted.findIndex(b => b.id === belt.id);
    const swapWith = sorted[idx + direction];
    if (!swapWith) return;
    try {
      // Índice temporário (fora da faixa em uso) para não colidir com o UNIQUE(sport_id, order_index)
      // durante a troca — precisa ser >= 0 pois a validação do backend rejeita negativos.
      const TEMP_ORDER_INDEX = 999999;
      await sportService.updateBeltRank(selectedSportId, belt.id, { orderIndex: TEMP_ORDER_INDEX });
      await sportService.updateBeltRank(selectedSportId, swapWith.id, { orderIndex: belt.orderIndex });
      await sportService.updateBeltRank(selectedSportId, belt.id, { orderIndex: swapWith.orderIndex });
      await loadBeltRanks(selectedSportId);
    } catch {
      showNotification('Erro ao reordenar faixas.', 'error');
    }
  };

  const selectedSport = sports.find(s => s.id === selectedSportId) ?? null;
  const sortedBelts = [...beltRanks].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 p-2 sm:p-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter leading-tight">Esportes</h1>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] sm:text-[10px]">Template global de faixas e graus por esporte</p>
          </div>
        </div>
        <button
          onClick={openNewSport}
          className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
        >
          <Plus size={14} /> Novo Esporte
        </button>
      </header>

      {/* Seletor de esporte */}
      <div className="flex flex-wrap gap-2">
        {sports.map(sport => (
          <button
            key={sport.id}
            onClick={() => setSelectedSportId(sport.id)}
            className={[
              'px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all',
              selectedSportId === sport.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800',
            ].join(' ')}
          >
            {sport.name}{!sport.active ? ' (inativo)' : ''}
          </button>
        ))}
        {!loading && !sports.length && (
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum esporte cadastrado ainda.</p>
        )}
      </div>

      {selectedSport && (
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-black text-slate-800 dark:text-white uppercase italic text-base">{selectedSport.name}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sequência de graduação ({sortedBelts.length} faixas)</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openEditSport(selectedSport)}
                className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Pencil size={12} /> Editar Esporte
              </button>
              <button
                onClick={openNewBelt}
                className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
              >
                <Plus size={12} /> Nova Faixa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sortedBelts.map((belt, idx) => (
              <div
                key={belt.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50"
              >
                <span
                  className={`w-8 h-8 rounded-full border shrink-0 ${(BELT_VISUAL_CONFIG_BY_COLOR_KEY[belt.colorKey] ?? DEFAULT_BELT_VISUAL_CONFIG).bg} ${(BELT_VISUAL_CONFIG_BY_COLOR_KEY[belt.colorKey] ?? DEFAULT_BELT_VISUAL_CONFIG).border}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 dark:text-white text-xs uppercase truncate">{belt.name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    {CATEGORY_LABELS[belt.category]} · {belt.degreeCount}º graus
                    {belt.minAge ? ` · min. ${belt.minAge}a` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleMoveBelt(belt, -1)} disabled={idx === 0} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowUp size={13} />
                  </button>
                  <button onClick={() => handleMoveBelt(belt, 1)} disabled={idx === sortedBelts.length - 1} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                    <ArrowDown size={13} />
                  </button>
                  <button onClick={() => openEditBelt(belt)} className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => handleDeleteBelt(belt)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
            {!sortedBelts.length && (
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest col-span-full text-center py-6">Nenhuma faixa cadastrada para este esporte ainda.</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Esporte */}
      <Modal
        open={isSportModalOpen}
        onClose={() => setIsSportModalOpen(false)}
        title={editingSport ? 'Editar Esporte' : 'Novo Esporte'}
        footer={
          <>
            <button onClick={() => setIsSportModalOpen(false)} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
            <button onClick={handleSaveSport} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700">Salvar</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome</label>
            <input
              type="text"
              value={sportForm.name}
              onChange={e => setSportForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Judô"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {editingSport && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sportForm.active}
                onChange={e => setSportForm(f => ({ ...f, active: e.target.checked }))}
                className="rounded"
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Ativo</span>
            </label>
          )}
        </div>
      </Modal>

      {/* Modal: Faixa */}
      <Modal
        open={isBeltModalOpen}
        onClose={() => setIsBeltModalOpen(false)}
        title={editingBelt ? 'Editar Faixa' : 'Nova Faixa'}
        footer={
          <>
            <button onClick={() => setIsBeltModalOpen(false)} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">Cancelar</button>
            <button onClick={handleSaveBelt} className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-700">Salvar</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nome</label>
            <input
              type="text"
              value={beltForm.name}
              onChange={e => setBeltForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Azul"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBeltForm(f => ({ ...f, colorKey: key }))}
                  className={`w-8 h-8 rounded-full transition-all ${BELT_VISUAL_CONFIG_BY_COLOR_KEY[key].bg} ${
                    beltForm.colorKey === key ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : `border-2 ${BELT_VISUAL_CONFIG_BY_COLOR_KEY[key].border}`
                  }`}
                  title={key}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Categoria</label>
              <select
                value={beltForm.category}
                onChange={e => setBeltForm(f => ({ ...f, category: e.target.value as BeltCategory }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="kids">Infantil</option>
                <option value="adult">Adulto</option>
                <option value="both">Ambos</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nº de Graus</label>
              <input
                type="number"
                min={0}
                value={beltForm.degreeCount}
                onChange={e => setBeltForm(f => ({ ...f, degreeCount: Number(e.target.value) }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Idade Mínima</label>
              <input
                type="number"
                min={0}
                value={beltForm.minAge ?? ''}
                onChange={e => setBeltForm(f => ({ ...f, minAge: e.target.value === '' ? null : Number(e.target.value) }))}
                placeholder="Sem limite"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Idade Máxima</label>
              <input
                type="number"
                min={0}
                value={beltForm.maxAge ?? ''}
                onChange={e => setBeltForm(f => ({ ...f, maxAge: e.target.value === '' ? null : Number(e.target.value) }))}
                placeholder="Sem limite"
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SportsView;
