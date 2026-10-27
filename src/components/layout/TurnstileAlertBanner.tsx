import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, WifiOff } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { turnstileService } from '@/features/turnstile/services/turnstileService';

/**
 * Aviso ao admin quando a catraca deixa de ser atualizada: o middleware NexDojo-Catraca está
 * sem contato há mais minutos do que o configurado, ou está vivo mas não alcança uma catraca.
 * Nesses casos a catraca segue funcionando com o último status recebido — quem pagou continua
 * bloqueado e quem venceu continua passando —, e ninguém perceberia sem este aviso.
 * Só aparece para academia que configurou a integração (tem credencial ativa).
 */
export const TurnstileAlertBanner: React.FC = () => {
  const { user, academy } = useAuthStore();
  const enabled = !!academy?.id && (user?.role === 'admin' || user?.role === 'superuser');

  const { data } = useQuery({
    queryKey: ['turnstile-alert', academy?.id],
    queryFn: turnstileService.getAlert,
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  if (!enabled || !data?.configured) return null;

  if (data.stale) {
    const since = data.lastSeenAt
      ? `desde ${new Date(data.lastSeenAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
      : 'desde que a credencial foi criada';
    return (
      <Link to="/catraca" className="mb-4 flex items-start gap-3 rounded-[24px] border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/30 p-4 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
        <AlertTriangle size={20} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider">Catraca sem atualização</p>
          <p className="text-[11px] font-bold mt-0.5">
            O NexDojo-Catraca não se comunica {since}. Bloqueios por mensalidade e liberações não estão chegando à catraca.
            Verifique se o computador da recepção está ligado e conectado à internet.
          </p>
        </div>
      </Link>
    );
  }

  if (data.offlineDevices.length) {
    return (
      <Link to="/catraca" className="mb-4 flex items-start gap-3 rounded-[24px] border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
        <WifiOff size={20} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wider">Catraca fora do ar</p>
          <p className="text-[11px] font-bold mt-0.5">
            O NexDojo-Catraca está funcionando, mas não consegue falar com: {data.offlineDevices.join(', ')}. Verifique se a catraca está ligada e na rede.
          </p>
        </div>
      </Link>
    );
  }

  return null;
};
