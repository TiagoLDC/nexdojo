import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Sem isso, uma exceção durante o render derruba a árvore inteira do React e o usuário fica
 * olhando uma tela branca — sem mensagem na tela e sem nenhum registro do lado do servidor.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    const { user } = useAuthStore.getState();

    // Best-effort: se o backend estiver fora, o relatório se perde, mas a tela de erro continua de pé
    api.post('/client-errors', {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      url: window.location.href,
      userId: user?.id,
      academyId: user?.academyId,
    }).catch(() => {});
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center dark:bg-slate-950">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-500 dark:bg-red-900/30">
          <AlertTriangle size={28} />
        </span>
        <div>
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            Algo deu errado
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
            A tela não pôde ser carregada. O erro já foi registrado. Recarregue a página para tentar novamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Recarregar página
        </button>
      </div>
    );
  }
}
