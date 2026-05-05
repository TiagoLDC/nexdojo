import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ApiService } from '../../services/api';
import { Belt } from '../../types';
import Input from '../../components/common/Input';
import { SectionHeader } from './AuthComponents';
import { X, Camera, Users, User as UserIcon, Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';

interface SignupStudentProps {
  showNotification: (message: string, type: 'success' | 'error') => void;
}

const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_SIZE = 400;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
      else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const SignupStudent: React.FC<SignupStudentProps> = ({ showNotification }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const photoRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();

  const [formData, setFormData] = useState({
    name: '', email: '', birthDate: '', gender: 'M', academyId: '',
    belt: Belt.WHITE,
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const academyIdFromUrl = params.get('academyId');
    if (academyIdFromUrl) {
      setFormData(prev => ({ ...prev, academyId: academyIdFromUrl }));
    }
  }, [location]);

  const handleRegisterStudent = async () => {
    if (!formData.name || !formData.email || !regPassword || !formData.academyId) {
      showNotification("Preencha todos os campos obrigatórios.", 'error');
      return;
    }
    if (regPassword !== confirmPassword) {
      showNotification("As senhas não coincidem.", 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      await ApiService.registerStudent({ ...formData, password: regPassword });
      showNotification("Matrícula realizada com sucesso! Aguarde aprovação. OSS!", 'success');
      navigate('/login');
    } catch (err: any) {
      showNotification(err.message || 'Erro ao realizar matrícula.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string);
      setPhoto(compressed);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AuthLayout showLogo={false}>
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-12 shadow-2xl space-y-10 animate-in slide-in-from-bottom duration-500 pb-40">
        <header className="flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 py-4 z-20 border-b dark:border-slate-800 -mx-6 md:-mx-12 px-6 md:px-12">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white"><Users size={28} /></div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">Nova Matrícula</h2>
          </div>
          <button onClick={() => navigate('/cadastro')} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full"><X size={24} /></button>
        </header>
        <div className="space-y-12">
          <div className="flex flex-col items-center gap-4">
            <div onClick={() => photoRef.current?.click()} className="w-40 h-40 rounded-[40px] bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative cursor-pointer shadow-inner">
              {photo ? <img src={photo} className="w-full h-full object-cover" /> : <Camera size={40} className="text-slate-400 m-auto mt-12" />}
            </div>
            <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
          </div>
          <div className="space-y-6">
            <SectionHeader icon={<UserIcon size={16} />} title="Informações Pessoais" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2"><Input label="Nome Completo" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
              <Input label="Data de Nascimento" required type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />
              <Input label="E-mail (Para Login)" required type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <Input label="Definir Senha" required type="password" value={regPassword} onChange={e => setRegPassword(e.target.value)} />
              <Input label="Confirmar Senha" required type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
          </div>
          <button
            onClick={handleRegisterStudent}
            disabled={isSubmitting}
            className="w-full py-6 bg-indigo-600 text-white font-black rounded-3xl shadow-2xl text-xl active:scale-95 transition-transform disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><Loader2 size={22} className="animate-spin" /> Enviando...</> : 'CONCLUIR MATRÍCULA OSS!'}
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default SignupStudent;
