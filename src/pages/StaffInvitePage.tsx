import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { Lock, Mail, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff, MapPin, User as UserIcon } from 'lucide-react';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../../services/cep';

interface InviteInfo {
  staffId: string;
  staffName: string;
  staffPosition?: string;
  staffPhone?: string;
  staffWhatsapp?: string;
  academyName: string;
  academyAlias: string;
  academyLogo?: string;
}

const LabelInput: React.FC<{
  label: string;
  children: React.ReactNode;
  hint?: string;
}> = ({ label, hint, children }) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
      {label}
    </label>
    {children}
    {hint && <p className="text-[10px] text-slate-400 mt-1 ml-1">{hint}</p>}
  </div>
);

const inputCls = "w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center gap-2 my-4">
    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{children}</span>
    <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
  </div>
);

const StaffInvitePage: React.FC = () => {
  const { alias, token } = useParams<{ alias: string; token: string }>();
  const navigate = useNavigate();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // Acesso
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Pessoal
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');

  // Endereço
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setLoadError('Link inválido.'); setLoading(false); return; }
    api.get<InviteInfo>(`/auth/staff-invite/${token}`)
      .then(r => {
        setInfo(r.data);
        if (r.data.staffPhone) setPhone(maskPhone(r.data.staffPhone));
        setLoading(false);
      })
      .catch(e => { setLoadError(e.response?.data?.error || 'Link inválido ou expirado.'); setLoading(false); });
  }, [token]);

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = maskCEP(e.target.value);
    setCep(val);
    if (val.replace(/\D/g, '').length === 8) {
      setLoadingCep(true);
      const data = await fetchAddressByCep(val);
      if (data) {
        setAddress(data.street || '');
        setAddressNeighborhood(data.neighborhood || '');
        setAddressCity(data.city || '');
        setAddressState(data.state || '');
      }
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Informe seu e-mail.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não conferem.'); return; }
    setSubmitting(true);
    try {
      await api.post('/auth/register/staff', {
        token,
        email,
        password,
        phone: phone || undefined,
        birthDate: birthDate || undefined,
        cpf: cpf || undefined,
        rg: rg || undefined,
        cep: cep || undefined,
        address: address || undefined,
        addressNumber: addressNumber || undefined,
        addressNeighborhood: addressNeighborhood || undefined,
        addressCity: addressCity || undefined,
        addressState: addressState || undefined,
      });
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao realizar cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-indigo-500" size={40} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-100 dark:border-slate-800">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Link Inválido</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{loadError}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-xl border border-slate-100 dark:border-slate-800">
          <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
          <h2 className="text-xl font-black text-slate-800 dark:text-white mb-2">Cadastro Enviado!</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Aguarde a aprovação do administrador da <strong>{info?.academyName}</strong>. Você receberá acesso em breve.
          </p>
          <button
            onClick={() => navigate(`/login/${alias ?? ''}`)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-sm uppercase tracking-widest transition-all"
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg mx-auto shadow-xl border border-slate-100 dark:border-slate-800">

        {/* Header da academia */}
        <div className="text-center mb-6">
          {info?.academyLogo ? (
            <img src={info.academyLogo} alt={info.academyName} className="h-12 object-contain mx-auto mb-3" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
              <span className="text-indigo-600 font-black text-xl">{info?.academyName?.[0]}</span>
            </div>
          )}
          <h1 className="text-xl font-black text-slate-800 dark:text-white">
            Bem-vindo(a), {info?.staffName}!
          </h1>
          {info?.staffPosition && (
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mt-0.5">{info.staffPosition}</p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete seu cadastro como colaborador em <strong>{info?.academyName}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Acesso */}
          <SectionTitle>Dados de Acesso</SectionTitle>

          <LabelInput label="E-mail de acesso *">
            <div className="relative">
              <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={`${inputCls} pl-10`}
                required
              />
            </div>
          </LabelInput>

          <LabelInput label="Criar senha (mín. 6 caracteres) *">
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pl-10 pr-12`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(p => !p)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </LabelInput>

          <LabelInput label="Confirmar senha *">
            <div className="relative">
              <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPass ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`${inputCls} pl-10`}
                required
              />
            </div>
          </LabelInput>

          {/* Dados pessoais */}
          <SectionTitle>
            <UserIcon size={11} className="inline -mt-0.5 mr-1" />
            Dados Pessoais (opcional)
          </SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput label="Telefone">
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 00000-0000"
                className={inputCls}
              />
            </LabelInput>

            <LabelInput label="Data de Nascimento">
              <input
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                className={inputCls}
              />
            </LabelInput>

            <LabelInput label="CPF">
              <input
                type="text"
                value={cpf}
                onChange={e => setCpf(maskCPF(e.target.value))}
                placeholder="000.000.000-00"
                className={inputCls}
              />
            </LabelInput>

            <LabelInput label="RG">
              <input
                type="text"
                value={rg}
                onChange={e => setRg(maskRG(e.target.value))}
                placeholder="00.000.000-0"
                className={inputCls}
              />
            </LabelInput>
          </div>

          {/* Endereço */}
          <SectionTitle>
            <MapPin size={11} className="inline -mt-0.5 mr-1" />
            Endereço (opcional)
          </SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LabelInput
              label={loadingCep ? 'CEP (buscando...)' : 'CEP'}
              hint="Preencha o CEP para auto-completar."
            >
              <div className="relative">
                {loadingCep && <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-500 animate-spin" />}
                <input
                  type="text"
                  value={cep}
                  onChange={handleCepChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className={inputCls}
                />
              </div>
            </LabelInput>

            <LabelInput label="Número">
              <input
                type="text"
                value={addressNumber}
                onChange={e => setAddressNumber(e.target.value)}
                placeholder="123"
                className={inputCls}
              />
            </LabelInput>

            <LabelInput label="Rua / Logradouro">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua Exemplo"
                className={`${inputCls} sm:col-span-2`}
              />
            </LabelInput>

            <LabelInput label="Bairro">
              <input
                type="text"
                value={addressNeighborhood}
                onChange={e => setAddressNeighborhood(e.target.value)}
                placeholder="Centro"
                className={inputCls}
              />
            </LabelInput>

            <LabelInput label="Cidade">
              <input
                type="text"
                value={addressCity}
                onChange={e => setAddressCity(e.target.value)}
                placeholder="São Paulo"
                className={inputCls}
              />
            </LabelInput>

            <LabelInput label="Estado">
              <input
                type="text"
                value={addressState}
                onChange={e => setAddressState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="SP"
                maxLength={2}
                className={inputCls}
              />
            </LabelInput>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl px-4 py-3 text-xs font-bold">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
            Finalizar Cadastro
          </button>
        </form>
      </div>
    </div>
  );
};

export default StaffInvitePage;
