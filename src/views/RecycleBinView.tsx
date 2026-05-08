
import React, { useState, useEffect, useMemo } from 'react';
import { Academy, User } from '../types';
import ApiService from '../services/api';
import {
  Trash2,
  RotateCcw,
  Search,
  Users,
  Award,
  CalendarDays,
  X,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Trash,
  CheckSquare,
  Square,
  Check,
  Loader2
} from 'lucide-react';
import ConfirmModal from '../components/common/ConfirmModal';

interface BinItem {
  id: string;
  academyId: string;
  type: 'student' | 'instructor' | 'template';
  name: string;
  deletedAt: string;
  [key: string]: any;
}

const RecycleBinView: React.FC<{ academy: Academy; user: User }> = ({ academy }) => {
  const [items, setItems] = useState<BinItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'delete'} | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; message: string; action: (() => void) | null }>({ isOpen: false, message: '', action: null });

  const openConfirm = (message: string, action: () => void) => setConfirmState({ isOpen: true, message, action });
  const closeConfirm = () => setConfirmState({ isOpen: false, message: '', action: null });

  const showNotification = (message: string, type: 'success' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getRecycleBin();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar lixeira:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, [academy?.id]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const matchesSearch = name.includes(search.toLowerCase());
      const matchesType = typeFilter === 'All' || item.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [items, search, typeFilter]);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map(i => i.id)));
  };

  const restoreItem = async (item: BinItem) => {
    try {
      await ApiService.restoreRecycleBinItem(item.type, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      showNotification('Item restaurado com sucesso!');
    } catch (e) {
      showNotification('Erro ao restaurar item.', 'delete');
    }
  };

  const restoreMany = async (toRestore: BinItem[]) => {
    setIsLoading(true);
    try {
      await Promise.all(toRestore.map(i => ApiService.restoreRecycleBinItem(i.type, i.id)));
      setItems(prev => prev.filter(i => !toRestore.find(r => r.id === i.id)));
      setSelectedIds(new Set());
      showNotification(`${toRestore.length} item(s) restaurado(s)!`);
    } catch (e) {
      showNotification('Erro ao restaurar itens.', 'delete');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (item: BinItem) => {
    try {
      await ApiService.permanentDeleteRecycleBinItem(item.type, item.id);
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
      showNotification('Item excluído permanentemente.', 'delete');
    } catch (e) {
      showNotification('Erro ao excluir item.', 'delete');
    }
  };

  const deleteMany = async (ids: string[]) => {
    setIsLoading(true);
    const toDelete = items.filter(i => ids.includes(i.id));
    try {
      await Promise.all(toDelete.map(i => ApiService.permanentDeleteRecycleBinItem(i.type, i.id)));
      setItems(prev => prev.filter(i => !ids.includes(i.id)));
      setSelectedIds(new Set());
      showNotification(`${ids.length} item(s) excluído(s) permanentemente.`, 'delete');
    } catch (e) {
      showNotification('Erro ao excluir itens.', 'delete');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRestore = () => {
    const selected = items.filter(i => selectedIds.has(i.id));
    if (selected.length === 0) return;
    restoreMany(selected);
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    openConfirm(`Deseja excluir permanentemente os ${selectedIds.size} itens selecionados?`, () => {
      deleteMany(Array.from(selectedIds));
    });
  };

  const handleEmptyBin = () => {
    if (items.length === 0) return;
    openConfirm("Deseja realmente esvaziar a lixeira? Todos os dados serão perdidos para sempre.", () => {
      deleteMany(items.map(i => i.id));
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        onConfirm={() => { confirmState.action?.(); closeConfirm(); }}
        onCancel={closeConfirm}
        confirmLabel="Excluir"
      />
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-indigo-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Lixeira</h1>
          <p className="text-slate-500 dark:text-slate-400">Gerencie itens removidos. Restaure ou exclua em massa.</p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <button
              onClick={handleEmptyBin}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-2xl font-bold hover:bg-red-100 transition-all border border-red-100 dark:border-red-900/30"
            >
              <Trash size={18} />
              Limpar Tudo
            </button>
          )}
        </div>
      </header>

      <div className="sticky top-0 z-20 py-2">
        {selectedIds.size > 0 ? (
          <div className="bg-indigo-600 p-4 rounded-[28px] shadow-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-4 text-white">
              <button onClick={() => setSelectedIds(new Set())} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors">
                <X size={18} />
              </button>
              <span className="font-black text-sm uppercase tracking-widest">{selectedIds.size} selecionado(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleBulkRestore} className="flex items-center gap-2 bg-white text-indigo-600 px-5 py-2.5 rounded-2xl font-bold text-xs shadow-sm hover:bg-indigo-50 transition-all active:scale-95">
                <RotateCcw size={16} />
                Restaurar
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-sm hover:bg-red-600 transition-all active:scale-95 border border-red-400">
                <Trash2 size={16} />
                Excluir
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Buscar na lixeira..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 shadow-sm w-fit">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 outline-none bg-transparent"
                >
                  <option value="All">Todos os tipos</option>
                  <option value="student">Alunos</option>
                  <option value="instructor">Instrutores</option>
                  <option value="template">Turmas</option>
                </select>
              </div>
              {filteredItems.length > 0 && (
                <button onClick={toggleSelectAll} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-indigo-500 transition-all flex items-center gap-2">
                  {selectedIds.size === filteredItems.length ? <CheckSquare size={16} className="text-indigo-600" /> : <Square size={16} />}
                  Todos
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.length > 0 ? filteredItems.map(item => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => toggleSelect(item.id)}
                className={`bg-white dark:bg-slate-900 p-5 rounded-[32px] border flex items-center justify-between shadow-sm transition-all group cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/10 bg-indigo-50/10 dark:bg-indigo-900/5'
                    : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`shrink-0 transition-all ${isSelected ? 'scale-110' : ''}`}>
                    {isSelected ? (
                      <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-600/30"><Check size={24} /></div>
                    ) : (
                      <>
                        {item.type === 'student' && <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400"><Users size={24} /></div>}
                        {item.type === 'instructor' && <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400"><Award size={24} /></div>}
                        {item.type === 'template' && <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded-2xl text-amber-600 dark:text-amber-400"><CalendarDays size={24} /></div>}
                      </>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 dark:text-white">{item.name}</h4>
                      <span className="text-[10px] font-black uppercase tracking-tighter bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400">
                        {item.type === 'student' ? 'Atleta' : item.type === 'instructor' ? 'Professor' : 'Turma'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                      Excluído em {new Date(item.deletedAt).toLocaleDateString()} • {new Date(item.deletedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => restoreItem(item)}
                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all"
                    title="Restaurar este item"
                  >
                    <RotateCcw size={18} />
                  </button>
                  <button
                    onClick={() => openConfirm("Excluir permanentemente?", () => deleteItem(item))}
                    className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                    title="Excluir Permanentemente"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900/50 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
              <Trash2 size={80} className="mx-auto mb-4 opacity-10" />
              <h3 className="font-bold text-slate-500 dark:text-slate-400">Lixeira Vazia</h3>
              <p className="text-sm max-w-xs mx-auto mt-2 text-slate-400 dark:text-slate-600">Nenhum item encontrado para restaurar.</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-[32px] border border-amber-200 dark:border-amber-900/30 flex items-start gap-4">
        <AlertTriangle className="text-amber-600 shrink-0" size={24} />
        <div>
          <h4 className="font-bold text-amber-800 dark:text-amber-500 text-sm">Armazenamento Persistente</h4>
          <p className="text-xs text-amber-700/80 dark:text-amber-600/70 font-medium leading-relaxed mt-1">
            Os itens na lixeira estão salvos no banco de dados. A limpeza periódica ajuda a manter a performance do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RecycleBinView;
