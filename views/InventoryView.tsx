import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Academy, User, Product } from '../types';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { financeService } from '@/features/finances/services/financeService';
import { useTranslation } from '../services/LanguageContext';
import { Search, Package, Plus, Edit2, Trash2, X, Tag, DollarSign, Box, Camera, Image as ImageIcon, ShoppingBag, QrCode, Clipboard, CheckCircle2, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmDialog } from '@/components/ui';

const InventoryView: React.FC<{ academy: Academy; user: User }> = ({ academy, user }) => {
  const { t, showNotification } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Card' | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isManagement = user.role === 'superuser' || user.role === 'admin' || user.role === 'staff';

  useEffect(() => {
    if (academy) {
      inventoryService.getAll(academy.id).then((res) => {
        setProducts(Array.isArray(res.data) ? res.data : []);
      }).catch(() => {
        setProducts([]);
      });
    }
  }, [academy]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const nameMatch = p.name.toLowerCase().includes(search.toLowerCase());
      const categoryMatch = (p.category || '').toLowerCase().includes(search.toLowerCase());
      return nameMatch || categoryMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditingProduct(prev => prev ? { ...prev, image: reader.result as string } : null);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct?.name || !editingProduct?.price || editingProduct?.stock === undefined) {
      showNotification("Preencha os campos obrigatórios.", 'error');
      return;
    }

    try {
      if (editingProduct.id) {
        const updated = await inventoryService.update(editingProduct.id, {
          name: editingProduct.name,
          description: editingProduct.description || '',
          price: Number(editingProduct.price),
          stock: Number(editingProduct.stock),
          category: editingProduct.category || '',
          image: editingProduct.image,
        });
        setProducts(prev => prev.map(p => p.id === updated.id ? updated : p));
      } else {
        const created = await inventoryService.create(academy.id, {
          name: editingProduct.name,
          description: editingProduct.description || '',
          price: Number(editingProduct.price),
          stock: Number(editingProduct.stock),
          category: editingProduct.category || '',
          image: editingProduct.image,
        });
        setProducts(prev => [created, ...prev]);
      }

      setIsModalOpen(false);
      setEditingProduct(null);
      showNotification(t.productSaved);
    } catch {
      showNotification("Erro ao salvar produto.", 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await inventoryService.delete(id);
      setProducts(prev => prev.filter(p => p.id !== id));
      setIsDeleting(null);
      showNotification("Produto removido.", 'info');
    } catch {
      showNotification("Erro ao remover produto.", 'error');
    }
  };

  const openAddModal = () => {
    setEditingProduct({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      image: undefined
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handlePurchase = (_product: Product) => {
    showNotification("Para adquirir este produto, procure o administrador.", 'info');
  };

  const copyPixKey = () => {
    if (!academy.pixKey) {
      showNotification("Chave PIX não configurada. Acesse Configurações > Pagamento.", 'error');
      return;
    }
    navigator.clipboard.writeText(academy.pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 2000);
    showNotification("Chave PIX copiada!");
  };

  const confirmPurchase = async () => {
    if (!selectedProduct || !paymentMethod) return;

    setIsConfirmingPurchase(true);
    try {
      const updatedProduct = await inventoryService.update(selectedProduct.id, {
        stock: Math.max(0, selectedProduct.stock - 1),
      });
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));

      await financeService.create(academy.id, {
        description: `Venda — ${selectedProduct.name}`,
        amount: selectedProduct.price,
        type: 'income',
        category: selectedProduct.category || 'Produto',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: paymentMethod === 'Pix' ? 'PIX' : 'Cartão',
        status: 'paid',
        studentId: user.role === 'student' ? user.id : undefined,
      });

      setIsPurchaseModalOpen(false);
      setSelectedProduct(null);
      setPaymentMethod(null);
      showNotification("Pedido confirmado e registrado no financeiro!");
    } catch (e) {
      console.error(e);
      showNotification("Erro ao processar pedido. Tente novamente.", 'error');
    } finally {
      setIsConfirmingPurchase(false);
    }
  };


  if (!isManagement) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-32 transition-colors">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic flex items-center gap-3">
            <ShoppingBag className="text-indigo-600" size={32} />
            {t.inventory}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">Confira nossos produtos e materiais</p>
        </header>

        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
          <input
            type="text"
            placeholder={t.search + "..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] pl-16 pr-6 py-6 font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm text-lg"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(product => (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-xl shadow-slate-200/20 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/10 transition-all flex flex-col group"
              >
                <div className="aspect-square relative overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <ImageIcon size={64} className="opacity-20 mb-2" />
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Sem imagem</span>
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="bg-red-600 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl">Indisponível</span>
                    </div>
                  )}
                </div>
                <div className="p-8 flex flex-col flex-1">
                  <div className="mb-4">
                    <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl mb-3 inline-block">
                      {product.category || t.others}
                    </span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight leading-tight">{product.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 line-clamp-2">{product.description}</p>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic mb-1">Preço Sugerido</span>
                      <span className="text-3xl font-black text-green-600">R$ {product.price.toLocaleString()}</span>
                    </div>
                    {product.stock > 0 && (
                      <button
                        onClick={() => handlePurchase(product)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
                      >
                        Comprar
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-[50px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center">
              <Package className="text-slate-300 mb-6" size={80} />
              <p className="text-xl font-black uppercase italic tracking-tight text-slate-400">{t.noProductsFound}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 transition-colors">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">{t.inventory}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest">{t.inventoryTitle}</p>
        </div>
        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-4 rounded-[24px] shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 font-black text-xs uppercase tracking-widest active:scale-95 whitespace-nowrap"
        >
          <Plus size={18} />
          {t.newProduct}
        </button>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 italic">Itens Diferentes</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">{products.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 italic">Total em Estoque</p>
          <p className="text-3xl font-black text-slate-800 dark:text-white leading-none">
            {products.reduce((acc, p) => acc + p.stock, 0)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 italic">Valor Total</p>
          <p className="text-3xl font-black text-green-600 leading-none">
            R$ {products.reduce((acc, p) => acc + (p.price * p.stock), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 italic">Baixo Estoque</p>
          <p className="text-3xl font-black text-amber-500 leading-none">
            {products.filter(p => p.stock <= 3).length}
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder={t.search + "..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] pl-16 pr-6 py-6 font-bold text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProducts.length > 0 ? (
          filteredProducts.map(product => (
            <motion.div
              layout
              key={product.id}
              className={`bg-white dark:bg-slate-900 p-6 rounded-[32px] border transition-all ${product.stock <= 3 ? 'border-amber-200 dark:border-amber-900/30' : 'border-slate-100 dark:border-slate-800'} flex flex-col justify-between shadow-sm group relative overflow-hidden`}
            >
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex-1 flex gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 border border-slate-100 dark:border-slate-800">
                    {product.image ? (
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        <Package size={32} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
                        {product.category || t.others}
                      </span>
                      {product.stock <= 3 && (
                        <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg animate-pulse">
                          Reposição
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white tracking-tight uppercase italic">{product.name}</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium line-clamp-1">{product.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1 italic">{t.price}</p>
                  <p className="text-xl font-black text-green-600 leading-none">R$ {product.price.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-end justify-between relative z-10">
                <div className="flex items-center gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col items-center min-w-[80px]">
                    <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter mb-1">Qtd. Estoque</p>
                    <p className={`text-lg font-black leading-none ${product.stock === 0 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                      {product.stock}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(product)}
                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-all"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => setIsDeleting(product.id)}
                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                <Package size={120} />
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 flex flex-col items-center">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-none mb-6">
              <Package className="opacity-40" size={64} />
            </div>
            <p className="text-lg font-black uppercase italic tracking-tight">{t.noProductsFound}</p>
            <button
              onClick={openAddModal}
              className="mt-6 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline"
            >
              {t.newProduct}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isPurchaseModalOpen && selectedProduct && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[32px] md:rounded-[40px] p-4 md:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">Finalizar Compra</h2>
                <button onClick={() => setIsPurchaseModalOpen(false)} className="bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full p-2 hover:bg-red-50 hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                <div className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Package size={32} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase italic leading-tight">{selectedProduct.name}</h3>
                    <p className="text-2xl font-black text-green-600 mt-1">R$ {selectedProduct.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 italic">Selecione o Método de Pagamento</p>
                  <button
                    onClick={() => setPaymentMethod('Pix')}
                    className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all ${paymentMethod === 'Pix' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${paymentMethod === 'Pix' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <QrCode size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800 dark:text-white uppercase italic">PIX</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Pagamento imediato via QR Code</p>
                      </div>
                    </div>
                    {paymentMethod === 'Pix' && <CheckCircle2 className="text-indigo-600" size={24} />}
                  </button>

                  <button
                    onClick={() => setPaymentMethod('Card')}
                    className={`w-full flex items-center justify-between p-5 rounded-[24px] border-2 transition-all ${paymentMethod === 'Card' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${paymentMethod === 'Card' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <CreditCard size={24} />
                      </div>
                      <div className="text-left">
                        <p className="font-black text-slate-800 dark:text-white uppercase italic">Cartão / Dinheiro</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Pagar pessoalmente na recepção</p>
                      </div>
                    </div>
                    {paymentMethod === 'Card' && <CheckCircle2 className="text-indigo-600" size={24} />}
                  </button>
                </div>

                {paymentMethod === 'Pix' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-indigo-200 dark:border-indigo-900/50"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-inner shrink-0">
                        <QrCode size={120} className="text-slate-800 dark:text-slate-100" />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Escaneie o código ou copie a chave abaixo</p>
                    </div>

                    <div className="space-y-2">
                      {academy.pixKey ? (
                        <div className="relative">
                          <input
                            readOnly
                            value={academy.pixKey}
                            className="w-full bg-white dark:bg-slate-900 border-none rounded-xl px-4 py-3 text-[10px] font-mono text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap pr-12 focus:ring-0"
                          />
                          <button
                            onClick={copyPixKey}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
                          >
                            {pixCopied ? <CheckCircle2 size={16} /> : <Clipboard size={16} />}
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest text-center py-2">
                          Chave PIX não configurada. Acesse Configurações &gt; Pagamento.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="mt-8 flex gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <button
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest py-5 rounded-2xl"
                >
                  Cancelar
                </button>
                <button
                  disabled={!paymentMethod || isConfirmingPurchase}
                  onClick={confirmPurchase}
                  className={`flex-[2] text-white font-black text-xs uppercase tracking-widest py-5 rounded-2xl shadow-xl transition-all ${paymentMethod && !isConfirmingPurchase ? 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95' : 'bg-slate-300 cursor-not-allowed opacity-50'}`}
                >
                  {isConfirmingPurchase ? 'Processando...' : paymentMethod === 'Pix' ? 'Já realizei o PIX' : 'Confirmar Pedido'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[32px] md:rounded-[40px] p-4 md:p-10 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-4 md:mb-8 shrink-0">
                <h2 className="text-xl md:text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tight">
                  {editingProduct?.id ? t.edit : t.add} {t.products}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full p-2 hover:bg-red-50 hover:text-red-500 transition-all"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="shrink-0 flex flex-col items-center gap-4">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-48 h-48 rounded-[32px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center overflow-hidden cursor-pointer group hover:border-indigo-500 transition-all"
                    >
                      {editingProduct?.image ? (
                        <div className="relative w-full h-full">
                          <img src={editingProduct.image} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="text-white" size={32} />
                          </div>
                        </div>
                      ) : (
                        <>
                          <Camera className="text-slate-300 dark:text-slate-600 mb-2" size={48} />
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center px-4">Adicionar Foto</span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                    {editingProduct?.image && (
                      <button
                        type="button"
                        onClick={() => setEditingProduct(prev => prev ? { ...prev, image: undefined } : null)}
                        className="text-red-500 font-bold text-[10px] uppercase tracking-widest hover:underline"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 italic">{t.productName} *</label>
                      <div className="relative">
                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                          type="text"
                          required
                          value={editingProduct?.name || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="Ex: Kimono Pro Competition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 italic">{t.price} *</label>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input
                            type="number"
                            required
                            step="0.01"
                            value={editingProduct?.price || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="0,00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 italic">{t.stock} *</label>
                        <div className="relative">
                          <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                          <input
                            type="number"
                            required
                            value={editingProduct?.stock || ''}
                            onChange={(e) => setEditingProduct({...editingProduct, stock: parseInt(e.target.value)})}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 italic">{t.category}</label>
                      <div className="relative">
                        <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                          type="text"
                          value={editingProduct?.category || ''}
                          onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl pl-12 pr-4 py-4 font-bold text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="Ex: Kimonos, Acessórios..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-2 italic">{t.description}</label>
                      <textarea
                        value={editingProduct?.description || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-3xl p-4 font-medium text-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 transition-all min-h-[100px] resize-none"
                        placeholder="Detalhes do product..."
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-slate-900 pb-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={() => isDeleting && handleDeleteProduct(isDeleting)}
        title={t.deleteProductQuestion}
        message={t.deleteProductText}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
      />
    </div>
  );
};

export default InventoryView;
