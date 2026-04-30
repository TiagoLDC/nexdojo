
import React, { useState, useEffect, useRef } from 'react';
import { User, ChatMessage, Academy } from '../types';
import { StorageService } from '../services/storage';
import { Send, User as UserIcon, MessageSquare, Clock, ShieldCheck, Award, Bell } from 'lucide-react';

interface ChatViewProps {
  academy: Academy;
  user: User;
}

const ChatView: React.FC<ChatViewProps> = ({ academy, user }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (academy) {
      const msgs = StorageService.getChatMessages(academy.id);
      setMessages(msgs);
      
      // Marcar como lido
      if (msgs.length > 0) {
        const latestTimestamp = msgs[msgs.length - 1].timestamp;
        localStorage.setItem(`oss_chat_last_read_${academy.id}`, latestTimestamp);
      }
    }
  }, [academy]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      academyId: academy.id,
      senderId: user.id,
      senderName: user.name,
      senderRole: user.role,
      content: newMessage.trim(),
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, message];
    setMessages(updatedMessages);
    StorageService.saveChatMessages(updatedMessages);
    localStorage.setItem(`oss_chat_last_read_${academy.id}`, message.timestamp);
    setNewMessage('');
  };

  const formatTime = (isoDate: string) => {
    return new Date(isoDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white dark:bg-slate-900 rounded-[40px] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
      {/* Header do Chat */}
      <header className="p-6 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-3 rounded-2xl text-white">
            <MessageSquare size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">Mural Interno</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Comunicação Oficial da Equipe</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Canal Ativo</span>
        </div>
      </header>

      {/* Lista de Mensagens */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
            <MessageSquare size={64} className="mb-4 text-slate-400" />
            <p className="font-bold text-slate-500 italic">Inicie uma conversa com a equipe.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            const isSystem = msg.senderId === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex flex-col items-center justify-center py-4 animate-in zoom-in duration-500">
                  <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-6 rounded-[32px] max-w-[85%] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Bell size={80} className="text-amber-600" />
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="bg-amber-500 text-white p-2 rounded-xl">
                        <Bell size={16} />
                      </div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em]">Notificação de Cadastro</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                      {msg.content}
                    </p>
                    <div className="mt-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(msg.timestamp).toLocaleDateString()} às {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div className={`flex items-center gap-2 mb-1 px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    msg.senderRole === 'admin' 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                      : msg.senderRole === 'instructor'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                  }`}>
                    {msg.senderRole === 'admin' ? 'Administrador' : msg.senderRole === 'instructor' ? 'Instrutor' : 'Equipe'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                    {msg.senderName}
                  </span>
                </div>
                
                <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium shadow-sm transition-all ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-600/10' 
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
                
                <div className={`flex items-center gap-1 mt-1 px-1 text-[9px] font-bold text-slate-400`}>
                  <Clock size={10} />
                  {formatTime(msg.timestamp)}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      {user.role !== 'student' ? (
        <footer className="p-6 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 transition-colors">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite um aviso para a equipe..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 dark:text-white"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white p-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
            >
              <Send size={24} />
            </button>
          </form>
        </footer>
      ) : (
        <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center justify-center gap-2">
            <ShieldCheck size={14} className="text-indigo-500" />
            Mural Somente Leitura para Alunos
          </p>
        </footer>
      )}
    </div>
  );
};

export default ChatView;
