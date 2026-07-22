import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, setApiToken } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { academyService } from '@/features/settings/services/academyService';
import { Lock, Mail, User as UserIcon, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

interface InviteInfo {
  studentId: string;
  studentName: string;
  academyName: string;
  academyAlias: string;
  academyLogo?: string;
  suggestedName?: string;
  suggestedEmail?: string;
  suggestedRelation?: string;
}

const RELATIONS = ['Pai', 'Mãe', 'Tio', 'Tia', 'Responsável', 'Outro'];

const inputCls = "w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500";

const LabelInput: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">
      {label}
    </label>
    {children}
  </div>
);

const GuardianInvitePage: React.FC = () => {
  const { alias, token } = useParams<{ alias: string; token: string }>();
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setLoadError('Link inválido.'); setLoading(false); return; }
    api.get<InviteInfo>(`/auth/guardian-invite/${token}`)
      .then(r => {
        setInfo(r.data);
        if (r.data.suggestedName) setName(r.data.suggestedName);
        if (r.data.suggestedEmail) setEmail(r.data.suggestedEmail);
        if (r.data.suggestedRelation) {
          // Só pré-seleciona se bater exatamente com uma opção do select (o cadastro original é texto livre)
          const match = RELATIONS.find(r2 => r2.toLowerCase() === r.data.suggestedRelation!.toLowerCase());
          if (match) setRelation(match);
        }
        setLoading(false);
      })
      .catch(e => { setLoadError(e.response?.data?.error || 'Link inválido ou já utilizado.'); setLoading(false); });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) { setError('Informe seu e-mail.'); return; }
    if (password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não conferem.'); return; }

    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register/guardian', {
        token, email, password,
        name: name || undefined,
        relation: relation || undefined,
      });

      if (data.token && data.user) {
        // Conta já existia (aluno/colaborador que também é responsável): autentica na hora.
        // Precisa configurar o token ANTES de buscar a academia, senão a chamada sai sem
        // autenticação e a API responde 401 (mesma ordem usada no LoginView).
        setApiToken(data.token);
        let academy = null;
        if (data.user.academyId) {
          try { academy = await academyService.get(data.user.academyId); } catch { /* segue sem branding */ }
        }
        login(data.user, data.token, academy);
        navigate('/', { replace: true });
        return;
      }

      setPendingApproval(true);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao confirmar vínculo.');
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

  if (pendingApproval) {
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
    <div className="fixed inset-0 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="min-h-full py-8 px-4 flex flex-col items-center justify-start">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-xl border border-slate-100 dark:border-slate-800">

          <div className="text-center mb-6">
            {info?.academyLogo ? (
              <img src={info.academyLogo} alt={info.academyName} className="h-12 object-contain mx-auto mb-3" />
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-3">
                <span className="text-indigo-600 font-black text-xl">{info?.academyName?.[0]}</span>
              </div>
            )}
            <h1 className="text-xl font-black text-slate-800 dark:text-white">
              Convite de Responsável
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Vincule sua conta ao aluno <strong>{info?.studentName}</strong> em <strong>{info?.academyName}</strong>.
              Se você já tem cadastro (como aluno ou colaborador), use o mesmo e-mail e senha — o vínculo é adicionado à sua conta existente.
            </p>
            {info?.suggestedEmail && (
              <p className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-2 italic">
                Pré-preenchemos com os dados do responsável já cadastrados na ficha — confira e ajuste se precisar.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <LabelInput label="Seu grau de parentesco">
              <select
                value={relation}
                onChange={e => setRelation(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar...</option>
                {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </LabelInput>

            <LabelInput label="Seu nome (caso ainda não tenha cadastro)">
              <div className="relative">
                <UserIcon size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Seu nome completo"
                  className={`${inputCls} pl-10`}
                />
              </div>
            </LabelInput>

            <LabelInput label="E-mail *">
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

            <LabelInput label="Senha *">
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
              Confirmar Vínculo
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GuardianInvitePage;
