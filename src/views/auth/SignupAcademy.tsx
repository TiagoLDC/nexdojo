import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '../../services/storage';
import { fetchAddressByCep, maskCEP, maskPhone } from '../../services/cep';
import { User, Academy } from '../../types';
import Input from '../../components/common/Input';
import { ArrowLeft, Camera, Phone, MapPin, Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';

interface SignupAcademyProps {
  onLogin: (user: User, academy: Academy) => void;
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

const SignupAcademy: React.FC<SignupAcademyProps> = ({ onLogin, showNotification }) => {
  const navigate = useNavigate();
  const photoRef = useRef<HTMLInputElement>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [academyData, setAcademyData] = useState({ 
    name: '', 
    logo: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?q=80&w=400&h=400&auto=format&fit=crop', 
    owner: '', 
    email: '', 
    password: '', 
    cep: '', 
    address: '', 
    addressNumber: '', 
    phone: '' 
  });

  const handleRegisterAcademy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!academyData.password || academyData.password !== confirmPassword) {
      showNotification("As senhas não coincidem ou são inválidas.", 'error');
      return;
    }
    
    const academyId = 'acad_' + Math.random().toString(36).substr(2, 5);
    const academy: Academy = { ...academyData, id: academyId, ownerName: academyData.owner };
    const user: User = { 
      id: 'user_' + Math.random().toString(36).substr(2, 5), 
      academyId, 
      role: 'admin', 
      name: academyData.owner, 
      email: academyData.email, 
      password: academyData.password,
      status: 'Active'
    };
    
    StorageService.saveAcademy(academy);
    StorageService.saveUsers([...StorageService.getUsers(), user]);
    onLogin(user, academy);
    navigate('/');
  };

  const handleCepLookup = async (cep: string) => {
    const masked = maskCEP(cep);
    if (masked.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const data = await fetchAddressByCep(masked);
      if (data) setAcademyData(prev => ({...prev, cep: masked, address: data.fullAddress}));
      setIsLoadingCep(false);
    } else setAcademyData(prev => ({...prev, cep: masked, address: ''}));
  };

  return (
    <AuthLayout showLogo={false}>
      <form onSubmit={handleRegisterAcademy} className="max-w-md mx-auto bg-white dark:bg-slate-900 rounded-[40px] p-6 md:p-10 shadow-2xl space-y-6 animate-in zoom-in duration-300 pb-32">
        <div className="flex items-center gap-4 mb-4 sticky top-0 bg-white dark:bg-slate-900 py-2 z-10 border-b dark:border-slate-800">
          <button type="button" onClick={() => navigate('/cadastro')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"><ArrowLeft size={20} /></button>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">Criar Academia</h2>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 mb-6">
            <div onClick={() => photoRef.current?.click()} className="w-32 h-32 bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[32px] overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500 transition-all shadow-inner group relative">
              {academyData.logo ? <img src={academyData.logo} className="w-full h-full object-contain p-2" /> : <Camera size={32} className="text-slate-400" />}
            </div>
            <input type="file" ref={photoRef} className="hidden" accept="image/*" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const compressed = await compressImage(await new Promise(r => {
                  const reader = new FileReader();
                  reader.onloadend = () => r(reader.result as string);
                  reader.readAsDataURL(file);
                }));
                setAcademyData({...academyData, logo: compressed});
              }
            }} />
          </div>
          <Input label="Seu Nome" value={academyData.owner} onChange={e => setAcademyData({...academyData, owner: e.target.value})} placeholder="Mestre Hélio" />
          <Input label="Nome da Unidade" value={academyData.name} onChange={e => setAcademyData({...academyData, name: e.target.value})} placeholder="Ex: NexDojo" />
          <Input label="E-mail de Contato" type="email" value={academyData.email} onChange={e => setAcademyData({...academyData, email: e.target.value})} placeholder="ct@oss.com" />
          <Input label="WhatsApp / Telefone" value={academyData.phone} onChange={e => setAcademyData({...academyData, phone: maskPhone(e.target.value)})} placeholder="(00) 00000-0000" icon={<Phone size={16} />} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="CEP" value={academyData.cep} onChange={e => handleCepLookup(e.target.value)} placeholder="00000-000" icon={isLoadingCep ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />} />
            <Input label="Número" value={academyData.addressNumber} onChange={e => setAcademyData({...academyData, addressNumber: e.target.value})} placeholder="Ex: 123" />
          </div>
          <Input label="Endereço (Auto)" value={academyData.address} onChange={e => setAcademyData({...academyData, address: e.target.value})} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Definir Senha Admin" type="password" value={academyData.password} onChange={e => setAcademyData({...academyData, password: e.target.value})} />
            <Input label="Confirmar Senha" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          </div>
        </div>
        <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">Finalizar Cadastro</button>
      </form>
    </AuthLayout>
  );
};

export default SignupAcademy;
