import React, { useEffect, useState } from 'react';
import { Save, Mail, Server, Lock, AtSign, Send, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { systemConfigService, type SmtpConfig } from '../services/systemConfigService';
import { useTranslation } from '../../../../services/LanguageContext';

const EMPTY_CONFIG: SmtpConfig = {
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPass: '',
  smtpFromName: 'NexDojo',
  smtpFromEmail: '',
  smtpSecure: 'false',
};

const SystemConfigView: React.FC = () => {
  const { showNotification } = useTranslation();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [testing, setTesting]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [config, setConfig]     = useState<SmtpConfig>(EMPTY_CONFIG);
  const [passSet, setPassSet]   = useState(false);
  const [passDirty, setPassDirty] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const res = await systemConfigService.getAll();
        if (cancel) return;
        const merged: SmtpConfig = { ...EMPTY_CONFIG, ...res.config };
        // Backend retorna '***' quando senha já existe — mantemos no estado
        setConfig(merged);
        setPassSet(res.smtpPassSet);
      } catch (err: any) {
        showNotification(err?.response?.data?.error || 'Falha ao carregar configurações', 'error');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const handleChange = (field: keyof SmtpConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    if (field === 'smtpPass') setPassDirty(true);
    setTestResult(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Se a senha não foi editada, não envia (mantém a do banco)
      const payload: Partial<SmtpConfig> = { ...config };
      if (!passDirty) delete payload.smtpPass;

      await systemConfigService.save(payload);
      showNotification('Configurações salvas com sucesso', 'success');
      setPassDirty(false);
      // Recarrega para refletir o estado correto da senha (mascarada)
      const res = await systemConfigService.getAll();
      setConfig({ ...EMPTY_CONFIG, ...res.config });
      setPassSet(res.smtpPassSet);
    } catch (err: any) {
      showNotification(err?.response?.data?.error || 'Falha ao salvar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await systemConfigService.testSmtp();
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.response?.data?.message || err?.response?.data?.error || 'Falha ao enviar e-mail de teste',
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Spinner size="lg" className="text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Configurações do Sistema
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Estas configurações são globais e afetam todas as academias do sistema.
        </p>
      </header>

      <Card padding="lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">Configurações de SMTP</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Servidor de e-mail usado para envio de notificações e recuperação de senha
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Servidor SMTP (host)"
            placeholder="smtp.gmail.com"
            value={config.smtpHost}
            onChange={(e) => handleChange('smtpHost', e.target.value)}
            leading={<Server size={16} />}
          />
          <Input
            label="Porta"
            type="number"
            placeholder="587"
            value={config.smtpPort}
            onChange={(e) => handleChange('smtpPort', e.target.value)}
          />
          <Input
            label="Usuário (login)"
            placeholder="seuemail@dominio.com"
            value={config.smtpUser}
            onChange={(e) => handleChange('smtpUser', e.target.value)}
            leading={<AtSign size={16} />}
          />
          <Input
            label="Senha"
            type={showPass ? 'text' : 'password'}
            placeholder={passSet && !passDirty ? '••••••••' : 'Digite a senha SMTP'}
            value={passDirty ? config.smtpPass : (passSet ? '' : config.smtpPass)}
            onChange={(e) => handleChange('smtpPass', e.target.value)}
            leading={<Lock size={16} />}
            helper={passSet && !passDirty ? 'Senha já cadastrada. Preencha apenas para alterar.' : undefined}
          />
          <Input
            label="Nome do remetente"
            placeholder="NexDojo"
            value={config.smtpFromName}
            onChange={(e) => handleChange('smtpFromName', e.target.value)}
          />
          <Input
            label="E-mail do remetente"
            type="email"
            placeholder="noreply@dominio.com"
            value={config.smtpFromEmail}
            onChange={(e) => handleChange('smtpFromEmail', e.target.value)}
            leading={<Mail size={16} />}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5"
          >
            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            {showPass ? 'Ocultar senha' : 'Mostrar senha'}
          </button>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none ml-auto">
            <input
              type="checkbox"
              checked={config.smtpSecure === 'true'}
              onChange={(e) => handleChange('smtpSecure', e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Usar TLS/SSL (porta 465)
          </label>
        </div>

        {testResult && (
          <div
            className={[
              'mt-5 p-3 rounded-lg flex items-start gap-3 text-sm',
              testResult.ok
                ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            ].join(' ')}
          >
            {testResult.ok ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
            <div className="break-words">{testResult.message}</div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <Button
            variant="outline"
            onClick={handleTest}
            loading={testing}
            icon={<Send size={16} />}
          >
            Testar Conexão
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            icon={<Save size={16} />}
          >
            Salvar Configurações
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default SystemConfigView;
