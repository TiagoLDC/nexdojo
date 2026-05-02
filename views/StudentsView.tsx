
import React, { useState, useEffect, useRef } from 'react';
import { Student, Belt, StudentDocument, ClassTemplate, Academy, User } from '../types';
import { StorageService } from '../services/storage';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { PrivacyValue } from '../components/PrivacyValue';
import { 
  Plus, 
  UserPlus, 
  Search, 
  MoreVertical, 
  X, 
  Trash2, 
  Save, 
  GraduationCap, 
  Minus, 
  Plus as PlusIcon,
  Phone,
  MessageCircle,
  FileText,
  UserCheck,
  Activity,
  Calendar,
  Mail,
  MapPin,
  Fingerprint,
  Users as UsersIcon,
  Upload,
  Download,
  FileIcon,
  AlertCircle,
  Printer,
  Briefcase,
  Filter,
  Check,
  QrCode,
  Share2,
  Camera,
  User as UserIcon,
  CalendarClock,
  Shirt,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Medal,
  Star,
  Loader2,
  Eye,
  EyeOff,
  Book
} from 'lucide-react';
import { BeltBadge } from '../components/BeltBadge';
import { BELT_COLORS } from '../constants';

// Funções utilitárias para máscaras removidas daqui e movidas para services/cep.ts

/**
 * Função para redimensionar e comprimir imagem Base64
 */
const compressImage = (base64Str: string, maxWidth = 400, maxHeight = 400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
};

const PrintHeader: React.FC<{ title: string }> = ({ title }) => {
  const academy = StorageService.getAcademy();
  return (
    <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">{academy.name}</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{academy.address}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-black text-indigo-600 uppercase italic leading-none">{title}</h2>
          <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
};

interface StudentsViewProps {
  academy: Academy;
  user: User;
}

const StudentsView: React.FC<StudentsViewProps> = ({ academy, user }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const currentUser = user;
  const canEditTotalClasses = currentUser?.role === 'admin' || currentUser?.role === 'instructor';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'delete'} | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [beltFilter, setBeltFilter] = useState<string>('All');
  const [readinessFilter, setReadinessFilter] = useState<string>('All');
  const [absenceFilter, setAbsenceFilter] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [showSensitive, setShowSensitive] = useState<{[key: string]: boolean}>({});

  const toggleSensitive = (field: string) => {
    setShowSensitive(prev => ({ ...prev, [field]: !prev[field] }));
  };

  useEffect(() => {
    if (academy?.id) {
      setStudents(StorageService.getStudents(academy.id));
      setTemplates(StorageService.getTemplates(academy.id));
    }
  }, [academy?.id]);

  const showNotification = (message: string, type: 'success' | 'error' | 'delete' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const exportStudentsToCSV = () => {
    if (students.length === 0) return;
    
    // Header for CSV
    const headers = ['Nome', 'Email', 'Telefone', 'Faixa', 'Graus', 'Status', 'Data Nascimento', 'CPF', 'RG', 'CEP', 'Endereco', 'Cidade', 'UF'];
    const csvRows = students.map(s => [
      s.name,
      s.email,
      s.phone || '',
      s.belt,
      s.degree || 0,
      s.status,
      s.birthDate || '',
      s.cpf || '',
      s.rg || '',
      s.addressCep || '',
      s.address || '',
      s.addressCity || '',
      s.addressState || ''
    ]);
    
    const csvString = [
      headers.join(','),
      ...csvRows.map(row => row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alunos_${academy.name.replace(/\s+/g, '_').toLowerCase()}.csv`;
    link.click();
    showNotification('Lista de alunos exportada com sucesso!', 'success');
  };

  const handleOpenNewStudent = () => {
    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      academyId: academy.id, // Garantindo vínculo com a academia atual
      name: '',
      photo: undefined,
      belt: Belt.WHITE,
      stripes: 0,
      lastGraduationDate: undefined,
      birthDate: '',
      phone: '',
      cpf: '',
      documents: [],
      totalClasses: 0,
      totalHours: 0,
      absentCount: 0,
      status: 'Active',
      hasLoanedKimono: false,
      joinDate: new Date().toISOString()
    };
    setEditingStudent(newStudent);
    setIsEditModalOpen(true);
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStudent) return;
    const value = maskCEP(e.target.value);
    setEditingStudent({ ...editingStudent, cep: value });

    if (value.replace(/\D/g, '').length === 8) {
      setIsLoadingCep(true);
      const addressData = await fetchAddressByCep(value);
      if (addressData) {
        setEditingStudent(prev => prev ? {
          ...prev,
          address: addressData.fullAddress
        } : null);
      }
      setIsLoadingCep(false);
    }
  };

  const handleSaveStudent = () => {
    if (!editingStudent) return;

    const age = calculateAge(editingStudent.birthDate);
    const isMinor = editingStudent.birthDate ? age < 18 : false;

    // Campos obrigatórios base
    const requiredFields = [
      { key: 'name', label: 'Nome Completo' },
      { key: 'birthDate', label: 'Data de Nascimento' },
      { key: 'gender', label: 'Sexo' },
      { key: 'phone', label: 'WhatsApp' },
      { key: 'cpf', label: 'CPF' },
      { key: 'address', label: 'Endereço' },
    ];

    for (const field of requiredFields) {
      if (!editingStudent[field.key as keyof Student]) {
        showNotification(`${field.label} é obrigatório.`, 'error');
        return;
      }
    }

    // Validação de Responsável para menores
    if (isMinor) {
      if (!editingStudent.guardianName || !editingStudent.guardianPhone || !editingStudent.guardianCpf) {
        showNotification("Para menores de idade, os dados do responsável são obrigatórios.", 'error');
        return;
      }
    }
    
    try {
      const currentStudents = StorageService.getStudents();
      const existingIndex = currentStudents.findIndex(s => s.id === editingStudent.id);
      
      let updated;
      if (existingIndex >= 0) {
        updated = currentStudents.map(s => s.id === editingStudent.id ? editingStudent : s);
        showNotification("Ficha atualizada com sucesso!");
      } else {
        updated = [...currentStudents, editingStudent];
        showNotification("Atleta cadastrado com sucesso!");
      }

      StorageService.saveStudents(updated);
      setStudents(updated);
      
      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (e) {
      console.error(e);
      showNotification("Limite de armazenamento excedido! Remova fotos ou documentos.", 'error');
    }
  };

  const handleDeleteStudent = () => {
    if (!editingStudent) return;
    
    try {
      const id = editingStudent.id;
      const currentStudents = StorageService.getStudents();
      const studentToDelete = currentStudents.find(s => s.id === id);
      
      if (studentToDelete) {
        StorageService.moveToBin('student', studentToDelete, academy.id);
        const updated = currentStudents.filter(s => s.id !== id);
        StorageService.saveStudents(updated);
        setStudents(updated.filter(s => s.academyId === academy.id));
        showNotification("Atleta movido para a lixeira.", 'delete');
      }
      
      setIsDeleteModalOpen(false);
      setIsEditModalOpen(false);
      setEditingStudent(null);
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
      showNotification("Erro ao processar exclusão.", 'error');
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStudent) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const compressed = await compressImage(base64String);
      setEditingStudent({ ...editingStudent, photo: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingStudent) return;

    if (file.size > 1000000) { 
      alert("Arquivo muito grande. O limite para documentos é de 1MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const newDoc: StudentDocument = {
        id: Math.random().toString(36).substr(2, 9),
        name: file.name,
        type: file.type,
        size: file.size,
        base64: base64String,
        uploadedAt: new Date().toISOString()
      };

      setEditingStudent({
        ...editingStudent,
        documents: [...(editingStudent.documents || []), newDoc]
      });
      showNotification("Documento anexado!");
    };
    reader.readAsDataURL(file);
  };

  const downloadFile = (doc: StudentDocument) => {
    const link = document.createElement('a');
    link.href = doc.base64;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportStudentData = () => {
    if (!editingStudent) return;
    const { photo, ...dataWithoutPhoto } = editingStudent;
    const data = JSON.stringify(dataWithoutPhoto, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ficha_${editingStudent.name.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteDocument = (docId: string) => {
    if (!editingStudent) return;
    setEditingStudent({
      ...editingStudent,
      documents: editingStudent.documents?.filter(d => d.id !== docId) || []
    });
    showNotification("Documento removido.", 'delete');
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent({ ...student });
    setIsEditModalOpen(true);
  };

  const openQRModal = (student: Student) => {
    setQrStudent(student);
    setIsQRModalOpen(true);
  };

  const isReadyForGraduation = (student: Student) => {
    const age = calculateAge(student.birthDate);
    // Regras básicas (podem ser ajustadas conforme a academia)
    if (student.belt === Belt.WHITE) {
      const readyForBelt = student.totalClasses >= 80;
      const readyForStripe = student.totalClasses >= 20 && Math.floor(student.totalClasses / 20) > student.stripes && student.stripes < 4;
      return { readyForBelt, readyForStripe };
    }
    if ([Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN].includes(student.belt)) {
      const readyForBelt = student.totalClasses >= 100;
      const readyForStripe = student.totalClasses >= 25 && Math.floor(student.totalClasses / 25) > student.stripes && student.stripes < 4;
      return { readyForBelt, readyForStripe };
    }
    if ([Belt.BLUE, Belt.PURPLE, Belt.BROWN].includes(student.belt)) {
      const readyForBelt = student.totalClasses >= 160;
      const readyForStripe = student.totalClasses >= 40 && Math.floor(student.totalClasses / 40) > student.stripes && student.stripes < 4;
      return { readyForBelt, readyForStripe };
    }
    if (student.belt === Belt.BLACK) {
      // Faixa preta: graus a cada 300 aulas (simplificado)
      const readyForStripe = student.totalClasses >= 300 && Math.floor(student.totalClasses / 300) > student.stripes && student.stripes < 6;
      return { readyForBelt: false, readyForStripe };
    }
    return { readyForBelt: false, readyForStripe: false };
  };

  const getEffectiveAbsenceLimit = (student: Student) => {
    if (student.absenceLimit) return student.absenceLimit;
    
    // Encontrar turmas que o aluno participa
    const studentTemplates = templates.filter(t => t.assignedStudentIds.includes(student.id));
    const classLimits = studentTemplates
      .map(t => t.absenceLimit)
      .filter((limit): limit is number => limit !== undefined && limit !== null);
    
    if (classLimits.length > 0) return Math.min(...classLimits);
    
    return academy?.absenceLimit || 3;
  };

  const filtered = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? s.status !== 'Inactive' : s.status === statusFilter;
    const matchesBelt = beltFilter === 'All' || s.belt === beltFilter;
    
    let matchesReadiness = true;
    if (readinessFilter !== 'All') {
      const { readyForBelt, readyForStripe } = isReadyForGraduation(s);
      if (readinessFilter === 'Stripe') matchesReadiness = readyForStripe;
      if (readinessFilter === 'Belt') matchesReadiness = readyForBelt;
      if (readinessFilter === 'Any') matchesReadiness = readyForStripe || readyForBelt;
    }

    const matchesAbsence = !absenceFilter || (s.absentCount >= getEffectiveAbsenceLimit(s));

    return matchesSearch && matchesStatus && matchesBelt && matchesReadiness && matchesAbsence;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const kidsBelts = [Belt.WHITE, Belt.GREY, Belt.YELLOW, Belt.ORANGE, Belt.GREEN];
  const adultBelts = [Belt.BLUE, Belt.PURPLE, Belt.BROWN, Belt.BLACK, Belt.CORAL, Belt.RED];
  const allBeltOptions = [...kidsBelts, ...adultBelts];

  const studentAge = editingStudent ? calculateAge(editingStudent.birthDate) : 0;
  const isMinor = editingStudent ? (editingStudent.birthDate ? studentAge < 18 : false) : false;
  const isNewStudent = editingStudent && !students.find(s => s.id === editingStudent.id);

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      <PrintHeader title="Listagem Geral de Atletas" />
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[110] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top duration-300 ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 
          toast.type === 'delete' ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm tracking-tight">{toast.message}</span>
        </div>
      )}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print px-1">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">Alunos</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Gestão de atletas e documentos.</p>
        </div>
        <div className="grid grid-cols-3 md:flex gap-2">
          <button 
            onClick={exportStudentsToCSV}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <Download size={18} className="text-emerald-500" />
            CSV
          </button>
          <button 
            onClick={() => {
              window.focus();
              setTimeout(() => window.print(), 300);
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <Printer size={18} className="text-indigo-600" />
            Imprimir
          </button>
          <button 
            onClick={handleOpenNewStudent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <UserPlus size={18} />
            Novo
          </button>
        </div>
      </header>

      <div className="space-y-4 no-print px-1">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl pl-12 pr-4 py-4.5 focus:ring-4 focus:ring-indigo-500/10 outline-none shadow-sm dark:text-white transition-all"
          />
        </div>

        <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-start gap-2 no-print">
          <div className="flex items-center gap-2 flex-1 md:flex-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm min-w-0">
            <Filter size={14} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-black text-slate-700 dark:text-slate-300 outline-none bg-transparent uppercase tracking-tighter w-full"
            >
              <option value="All">Todos (Ativos/Pendentes)</option>
              <option value="Active">Ativos</option>
              <option value="Inactive">Inativos</option>
              <option value="Pending">Pendentes</option>
              <option value="Pending">Pendentes</option>
              <option value="Dropped">Desistentes</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm min-w-0">
            <GraduationCap size={14} className="text-slate-400" />
            <select 
              value={beltFilter}
              onChange={(e) => setBeltFilter(e.target.value)}
              className="text-xs font-black text-slate-700 dark:text-slate-300 outline-none bg-transparent uppercase tracking-tighter w-full"
            >
              <option value="All">Todas Faixas</option>
              {allBeltOptions.map(belt => (
                <option key={belt} value={belt}>{belt}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 flex-1 md:flex-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm min-w-0">
              <Star size={14} className="text-amber-500" />
              <select 
                value={readinessFilter}
                onChange={(e) => setReadinessFilter(e.target.value)}
                className="text-xs font-black text-slate-700 dark:text-slate-300 outline-none bg-transparent uppercase tracking-tighter w-full"
              >
                <option value="All">Pronto p/...</option>
                <option value="Stripe">Grau</option>
                <option value="Belt">Faixa</option>
                <option value="Any">Qualquer</option>
              </select>
            </div>

            <button 
              onClick={() => setAbsenceFilter(!absenceFilter)}
              className={`flex items-center justify-center gap-2 border rounded-2xl px-4 py-3 shadow-sm transition-all flex-1 md:flex-none ${
                absenceFilter 
                  ? 'bg-red-500 border-red-500 text-white' 
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle size={14} />
              <span className="text-xs font-black uppercase tracking-tighter">Faltas</span>
            </button>
          </div>
        </div>

        {(statusFilter !== 'All' || beltFilter !== 'All' || readinessFilter !== 'All' || search !== '' || absenceFilter) && (
          <button 
            onClick={() => { setStatusFilter('All'); setBeltFilter('All'); setReadinessFilter('All'); setSearch(''); setAbsenceFilter(false); }}
            className="w-full py-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 text-center tracking-widest"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      <div className="bg-transparent md:bg-white md:rounded-3xl md:border md:border-slate-100 md:shadow-sm overflow-hidden">
        {/* Mobile Card View - REESTILIZADO PARA MODO MOBILE "APP-LIKE" */}
        <div className="md:hidden space-y-4 px-1 pb-20">
          {filtered.length > 0 ? (
            filtered.map(student => {
              const contactPhone = student.phone || student.guardianPhone;
              const { readyForBelt, readyForStripe } = isReadyForGraduation(student);
              const effectiveLimit = getEffectiveAbsenceLimit(student);
              
              return (
                <div 
                  key={student.id} 
                  className="bg-white dark:bg-slate-900 rounded-[32px] p-5 shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.98] transition-all relative overflow-hidden"
                  onClick={() => handleOpenEdit(student)}
                >
                  {/* Indicadores de Graduação/Status no topo do card */}
                  <div className="absolute top-0 right-0 p-4 flex gap-1.5">
                    {readyForBelt && <div className="bg-indigo-600 text-white p-1.5 rounded-full shadow-lg shadow-indigo-500/30 animate-bounce"><Trophy size={14} /></div>}
                    {readyForStripe && <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-lg shadow-amber-500/30 animate-pulse"><Medal size={14} /></div>}
                  </div>

                  <div className="flex gap-4 items-start mb-4">
                    <div className="relative shrink-0">
                      {student.photo ? (
                        <img src={student.photo} className="w-24 h-24 rounded-[32px] object-cover border-2 border-white dark:border-slate-800 shadow-md" />
                      ) : (
                        <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-4xl shadow-md ${BELT_COLORS[student.belt]}`}>
                          {student.name.charAt(0)}
                        </div>
                      )}
                      
                      {student.hasLoanedKimono && (
                        <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white p-1.5 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm">
                          <Shirt size={12} fill="currentColor" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-10">
                      <h3 className="font-black text-slate-800 dark:text-white text-lg truncate leading-tight uppercase italic">{student.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <BeltBadge belt={student.belt} stripes={student.stripes} />
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                          student.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 
                          student.status === 'Pending' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 animate-pulse' :
                          student.status === 'Inactive' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {student.status === 'Active' ? 'Ativo' : student.status === 'Pending' ? 'Pendente' : student.status === 'Inactive' ? 'Inativo' : 'Desistente'}
                        </span>
                      </div>
                      {student.planId && (
                        <div className="mt-2 flex items-center gap-1.5">
                          <Book size={10} className="text-indigo-500" />
                          <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                            Plano: {academy.plans?.find(p => p.id === student.planId)?.name || 'N/A'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Estatísticas Rápidas */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Treinos</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">{student.totalClasses}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Faltas</p>
                      <p className={`text-sm font-black ${student.absentCount >= effectiveLimit ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'}`}>
                        {student.absentCount}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 text-center border border-slate-100 dark:border-slate-800/50">
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5">Idade</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200">{calculateAge(student.birthDate) || '--'}</p>
                    </div>
                  </div>

                  {/* Ações Inferiores */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openQRModal(student);
                      }}
                      className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-widest"
                    >
                      <QrCode size={14} />
                      Carteirinha
                    </button>

                    <div className="flex gap-2">
                      <a 
                        href={contactPhone ? `https://wa.me/55${contactPhone.replace(/\D/g, '')}` : '#'} 
                        target={contactPhone ? "_blank" : "_self"}
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!contactPhone) e.preventDefault();
                        }}
                        className={`p-2.5 rounded-xl transition-all ${
                          contactPhone 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <MessageCircle size={18} fill={contactPhone ? "currentColor" : "none"} />
                      </a>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(student);
                        }}
                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 p-2.5 rounded-xl transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center">
              <div className="bg-slate-100 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Search size={32} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold">Nenhum aluno encontrado.</p>
              <p className="text-xs text-slate-400 mt-1">Tente ajustar seus filtros de busca.</p>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Aluno</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Idade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Treinos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Faltas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map(student => {
                const age = calculateAge(student.birthDate);
                const contactPhone = student.phone || student.guardianPhone;
                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0 z-0 hover:z-50">
                          {student.photo ? (
                            <img 
                              src={student.photo} 
                              alt={student.name} 
                              className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm transition-all duration-300 transform hover:scale-[2.5] hover:shadow-2xl hover:rounded-lg cursor-zoom-in relative"
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm transition-all duration-300 transform hover:scale-[2.5] hover:shadow-2xl hover:rounded-lg cursor-zoom-in relative ${BELT_COLORS[student.belt]}`}>
                              {student.name.charAt(0)}
                            </div>
                          )}
                          {student.hasLoanedKimono && (
                            <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white p-1 rounded-full border-2 border-white animate-pulse shadow-sm" title="Quimono Emprestado">
                              <Shirt size={10} fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800">{student.name}</div>
                            {student.hasLoanedKimono && (
                              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">
                                <Shirt size={8} /> Quimono
                              </span>
                            )}
                            {(() => {
                              const { readyForBelt, readyForStripe } = isReadyForGraduation(student);
                              const effectiveLimit = getEffectiveAbsenceLimit(student);
                              const isAbsentee = student.absentCount >= effectiveLimit;
                              
                              return (
                                <>
                                  {readyForBelt && <Trophy size={14} className="text-indigo-600 animate-bounce" title="Pronto para trocar de faixa!" />}
                                  {readyForStripe && <Medal size={14} className="text-amber-500 animate-pulse" title="Pronto para ganhar grau!" />}
                                  {isAbsentee && <AlertTriangle size={14} className="text-red-500 animate-pulse" title={`Alerta: ${student.absentCount}/${effectiveLimit} faltas consecutivas!`} />}
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <BeltBadge belt={student.belt} stripes={student.stripes} />
                            {student.planId && (
                              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Book size={8} className="text-indigo-500" />
                                {academy.plans?.find(p => p.id === student.planId)?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-bold text-slate-500">{age || '--'} anos</span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-bold text-slate-800">{student.totalClasses}</span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className={`text-sm font-bold ${student.absentCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {student.absentCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-black uppercase ${
                        student.status === 'Active' ? 'bg-green-100 text-green-700' : 
                        student.status === 'Pending' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                        student.status === 'Inactive' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {student.status === 'Active' ? 'Ativo' : student.status === 'Pending' ? 'Pendente' : student.status === 'Inactive' ? 'Inativo' : 'Desistente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a 
                          href={contactPhone ? `https://wa.me/55${contactPhone.replace(/\D/g, '')}` : '#'} 
                          target={contactPhone ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          onClick={(e) => !contactPhone && e.preventDefault()}
                          className={`p-2 rounded-xl transition-all shadow-sm ${
                            contactPhone 
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 hover:scale-105 active:scale-95' 
                              : 'bg-slate-100 text-slate-300 cursor-not-allowed opacity-50'
                          }`}
                          title={contactPhone ? `Chamar no WhatsApp (${contactPhone})` : "Nenhum telefone cadastrado"}
                        >
                          <MessageCircle size={18} fill={contactPhone ? "currentColor" : "none"} />
                        </a>
                        <button 
                          onClick={() => openQRModal(student)}
                          className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Ver QR Code"
                        >
                          <QrCode size={18} />
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(student)}
                          className="text-slate-400 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Editar Ficha"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                  Nenhum aluno encontrado para estes filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

      {/* Modal QR Code / Carteirinha Digital */}
      {isQRModalOpen && qrStudent && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[150] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsQRModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl overflow-hidden relative cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 w-full h-24 bg-slate-900 -z-10"></div>
            
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center justify-between w-full mb-6 text-white">
                <span className="text-[10px] font-black uppercase tracking-widest">Carteirinha de Atleta</span>
                <button 
                  onClick={() => setIsQRModalOpen(false)} 
                  className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className={`w-20 h-20 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4 ${BELT_COLORS[qrStudent.belt]}`}>
                {qrStudent.photo ? (
                  <img src={qrStudent.photo} alt={qrStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black">{qrStudent.name.charAt(0)}</span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-800">{qrStudent.name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{qrStudent.belt}</p>
              
              <div className="my-8 p-4 bg-white rounded-3xl border-2 border-slate-100 flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrStudent.id}`} 
                  alt="QR Code do Aluno"
                  className="w-56 h-56 md:w-64 md:h-64"
                />
              </div>

              <p className="text-[10px] text-slate-400 font-medium mb-8 leading-relaxed">
                Apresente este código no tatame para realizar sua chamada automática.
              </p>

              <div className="grid grid-cols-1 gap-3 w-full">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>
                  <button 
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Share2 size={18} />
                    Enviar
                  </button>
                </div>
                <button 
                  onClick={() => setIsQRModalOpen(false)}
                  className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl hover:bg-slate-900 transition-all mt-2"
                >
                  Fechar Carteirinha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ficha Completa */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[150] flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-4xl rounded-t-3xl md:rounded-3xl p-6 md:p-8 animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white py-2 z-10 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  {isNewStudent ? <UserPlus size={24} /> : <GraduationCap size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{isNewStudent ? 'Novo Aluno' : 'Ficha do Aluno'}</h2>
                  <p className="text-xs text-slate-400 font-medium">
                    {isNewStudent ? 'Preencha os dados obrigatórios (*)' : `Cadastrado em ${new Date(editingStudent.joinDate).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isNewStudent && (
                  <>
                    <button 
                      onClick={() => openQRModal(editingStudent)}
                      title="Ver Carteirinha Digital"
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                    >
                      <QrCode size={20} />
                    </button>
                    <button 
                      onClick={exportStudentData}
                      title="Exportar Dados (JSON)"
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                    >
                      <Printer size={20} />
                    </button>
                  </>
                )}
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="space-y-8 pb-10">
              {/* ALERTA DE QUIMONO EMPRESTADO */}
              {editingStudent.hasLoanedKimono && (
                <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border-2 border-amber-500/30 p-6 rounded-[32px] flex items-center justify-between animate-in zoom-in duration-500">
                  <div className="flex items-center gap-5">
                    <div className="bg-amber-500 p-4 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                      <Shirt size={28} />
                    </div>
                    <div>
                      <h3 className="font-black text-amber-800 text-lg uppercase tracking-tight">Quimono Emprestado</h3>
                      <p className="text-amber-700/70 text-sm font-medium">Este atleta está utilizando um quimono da academia no momento.</p>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <span className="bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm">Pendente</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck size={14} /> Dados Pessoais
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div 
                        className="w-32 h-32 rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden relative group shadow-sm"
                      >
                        {editingStudent.photo ? (
                          <img src={editingStudent.photo} alt={editingStudent.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                            <UserIcon size={40} />
                            <span className="text-[10px] font-black uppercase tracking-widest mt-2">Sem Foto</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white gap-2">
                          <button 
                            onClick={() => editPhotoInputRef.current?.click()}
                            className="bg-indigo-600 p-2 rounded-full hover:bg-indigo-700 transition-all"
                            title="Escolher Foto ou Tirar Foto"
                          >
                            <Camera size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 w-full">
                        <button 
                          onClick={() => {
                            if (editPhotoInputRef.current) {
                              editPhotoInputRef.current.removeAttribute('capture');
                              editPhotoInputRef.current.click();
                            }
                          }}
                          className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Upload size={12} /> Galeria / Camera
                        </button>
                      </div>
                      <input 
                        type="file" 
                        ref={editPhotoInputRef} 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handlePhotoCapture} 
                      />
                    </div>
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Sexo <span className="text-red-500">*</span></label>
                      <select 
                        value={editingStudent.gender || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, gender: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700"
                      >
                        <option value="">Selecionar</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nascimento <span className="text-red-500">*</span></label>
                      <input 
                        type="date" 
                        value={editingStudent.birthDate}
                        onChange={(e) => setEditingStudent({...editingStudent, birthDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 text-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                        <span>CPF <span className="text-red-500">*</span></span>
                        <button onClick={() => toggleSensitive('cpf')} className="text-slate-400">
                          {showSensitive['cpf'] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input 
                        type={showSensitive['cpf'] ? "text" : "password"} 
                        placeholder="000.000.000-00"
                        value={editingStudent.cpf || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, cpf: maskCPF(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                        RG
                        <button onClick={() => toggleSensitive('rg')} className="text-slate-400">
                          {showSensitive['rg'] ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input 
                        type={showSensitive['rg'] ? "text" : "password"} 
                        placeholder="00.000.000-0"
                        value={editingStudent.rg || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, rg: maskRG(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Peso (kg)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 80"
                        value={editingStudent.weight || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, weight: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Altura (cm)</label>
                      <input 
                        type="text" 
                        placeholder="Ex: 180"
                        value={editingStudent.height || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, height: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tipo Sanguíneo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: O+"
                        value={editingStudent.bloodType || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, bloodType: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={14} /> Contato & Endereço
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">WhatsApp <span className="text-red-500">*</span></label>
                    <input 
                      type="tel" 
                      value={editingStudent.phone || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, phone: maskPhone(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:col-span-2">
                    <div className="md:col-span-4">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                        CEP
                        {isLoadingCep && <Loader2 size={10} className="animate-spin text-indigo-500" />}
                      </label>
                      <input 
                        type="text" 
                        value={editingStudent.cep || ''}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Número</label>
                      <input 
                        type="text" 
                        value={editingStudent.addressNumber || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, addressNumber: e.target.value})}
                        placeholder="Nº"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Endereço Completo <span className="text-red-500">*</span></label>
                      <input 
                        type="text" 
                        value={editingStudent.address || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
                        placeholder="Rua, Bairro, Cidade - UF"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} /> Emergência
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Contato de Emergência</label>
                    <input 
                      type="text" 
                      value={editingStudent.emergencyContact || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, emergencyContact: e.target.value})}
                      placeholder="Nome do contato"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Telefone de Emergência</label>
                    <input 
                      type="tel" 
                      value={editingStudent.emergencyPhone || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, emergencyPhone: maskPhone(e.target.value)})}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className={`space-y-4 p-6 rounded-3xl border transition-all ${isMinor ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isMinor ? 'text-amber-700' : 'text-slate-500'}`}>
                  <UsersIcon size={14} /> Responsável Legal {isMinor && <span className="bg-amber-200 text-amber-800 text-[8px] px-2 py-1 rounded-full ml-2">OBRIGATÓRIO</span>}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome do Responsável <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={editingStudent.guardianName || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianName: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Parentesco</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Mãe"
                      value={editingStudent.guardianRelation || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianRelation: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CPF do Responsável <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      value={editingStudent.guardianCpf || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianCpf: maskCPF(e.target.value)})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">RG do Responsável</label>
                    <input 
                      type="text" 
                      value={editingStudent.guardianRg || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianRg: maskRG(e.target.value)})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">WhatsApp do Responsável <span className="text-red-500">*</span></label>
                    <input 
                      type="tel" 
                      value={editingStudent.guardianPhone || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianPhone: maskPhone(e.target.value)})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail do Responsável</label>
                    <input 
                      type="email" 
                      value={editingStudent.guardianEmail || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianEmail: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Profissão</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                      <input 
                        type="text" 
                        value={editingStudent.guardianProfession || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, guardianProfession: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} /> Documentação e Anexos
                  </h3>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors"
                  >
                    <Upload size={14} /> Anexar Documento
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editingStudent.documents && editingStudent.documents.length > 0 ? (
                    editingStudent.documents.map(doc => (
                      <div key={doc.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                            <FileIcon size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => downloadFile(doc)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
                            title="Download Documento"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => deleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-400">
                      <AlertCircle size={24} className="mb-2 opacity-30" />
                      <p className="text-xs font-medium">Nenhum documento anexado.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14} /> Graduação & Faixa Atual
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2">Graus na Faixa</label>
                      <div className={`flex items-center justify-between border-2 transition-all rounded-2xl px-5 py-4 shadow-inner ${BELT_COLORS[editingStudent.belt || Belt.WHITE]}`}>
                        <button type="button" onClick={() => setEditingStudent({...editingStudent, stripes: Math.max(0, (editingStudent.stripes || 0) - 1)})} className="text-white/50 hover:scale-125 transition-all outline-none md:p-2"><Minus size={20} /></button>
                        <div className={`flex gap-1.5 p-1 rounded-md px-3 bg-opacity-90 ${editingStudent.belt === Belt.BLACK ? 'bg-red-600' : 'bg-zinc-900 shadow-lg'}`}>
                          {[...Array(editingStudent.belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-2.5 h-7 rounded-sm transition-all ${i < (editingStudent.stripes || 0) ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-y-110' : 'bg-white/10'}`} 
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => setEditingStudent({...editingStudent, stripes: Math.min(editingStudent.belt === Belt.BLACK ? 6 : 4, (editingStudent.stripes || 0) + 1)})} className="text-white/50 hover:scale-125 transition-all outline-none md:p-2"><PlusIcon size={20} /></button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium">
                        {editingStudent.belt === Belt.BLACK ? 'Faixa preta possui até 6 graus.' : 'Faixas coloridas possuem até 4 graus.'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 flex items-center gap-1">
                        <CalendarClock size={12} /> Data da Última Graduação
                      </label>
                      <input 
                        type="date" 
                        value={editingStudent.lastGraduationDate || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, lastGraduationDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 flex items-center gap-1">
                        <Activity size={12} /> Total de Aulas na Faixa
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        disabled={!canEditTotalClasses}
                        value={editingStudent.totalClasses}
                        onChange={(e) => setEditingStudent({...editingStudent, totalClasses: parseInt(e.target.value) || 0})}
                        className={`w-full border rounded-xl px-4 py-3 outline-none font-bold ${
                          canEditTotalClasses 
                            ? "bg-slate-50 border-slate-200 focus:ring-2 focus:ring-indigo-500 text-slate-700" 
                            : "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      />
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium italic">
                        {canEditTotalClasses 
                          ? "* Este número é usado para calcular a prontidão para graduação."
                          : "* Somente administradores e professores podem alterar este valor."}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 text-center md:text-left">Selecione a Graduação</label>
                    <div className="grid grid-cols-3 gap-2">
                      {allBeltOptions.map(belt => (
                        <button
                          key={belt}
                          type="button"
                          onClick={() => setEditingStudent({...editingStudent, belt})}
                          className={`px-2 py-3 rounded-2xl border-2 text-[8px] font-black uppercase tracking-widest transition-all ${
                            editingStudent.belt === belt 
                              ? `${BELT_COLORS[belt]} shadow-lg shadow-indigo-500/10 scale-105 ring-4 ring-indigo-500/10` 
                              : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 opacity-60 hover:opacity-100'
                          }`}
                        >
                          {belt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <Activity size={14} /> Observações Médicas
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Status de Matrícula</label>
                    <select 
                      value={editingStudent.status}
                      onChange={(e) => setEditingStudent({...editingStudent, status: e.target.value as any})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                    >
                      <option value="Active">Ativo</option>
                      <option value="Inactive">Inativo</option>
                      <option value="Dropped">Desistente</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Plano de Matrícula</label>
                    <select 
                      value={editingStudent.planId || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, planId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                    >
                      <option value="">Nenhum Plano Vinculado</option>
                      {(academy.plans || []).map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price.toLocaleString('pt-BR')} ({plan.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Próximo Vencimento</label>
                    <input 
                      type="date" 
                      value={editingStudent.nextPaymentDate || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, nextPaymentDate: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Limite de Faltas Personalizado</label>
                    <input 
                      type="number" 
                      min="0"
                      placeholder="Usar padrão da academia"
                      value={editingStudent.absenceLimit || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, absenceLimit: parseInt(e.target.value) || undefined})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium italic">
                      * Deixe vazio para usar o limite padrão da academia.
                    </p>
                  </div>
                </div>
                <textarea 
                  rows={3}
                  placeholder="Informações de saúde relevantes para o treino..."
                  value={editingStudent.medicalNotes || ''}
                  onChange={(e) => setEditingStudent({...editingStudent, medicalNotes: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-8 border-t border-slate-100 md:sticky md:bottom-0 bg-white z-[200] pb-10 md:pb-6 px-4 -mx-6 md:mx-0">
                <div className="flex gap-3 w-full px-2 md:px-0">
                  {!isNewStudent && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex-1 bg-white hover:bg-red-50 text-red-500 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200 hover:border-red-100 active:scale-95"
                    >
                      <Trash2 size={20} />
                      Excluir
                    </button>
                  )}
                  <button 
                    onClick={handleSaveStudent}
                    className={`${isNewStudent ? 'w-full' : 'flex-[2]'} bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest`}
                  >
                    <Save size={20} />
                    {isNewStudent ? 'Finalizar Cadastro' : 'Salvar Ficha Completa'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão de Aluno */}
      {isDeleteModalOpen && editingStudent && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[40px] p-8 animate-in zoom-in duration-300 shadow-2xl text-center">
            <div className="bg-red-100 w-20 h-20 rounded-full flex items-center justify-center text-red-600 mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">Excluir Atleta?</h2>
            <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">
              Deseja realmente mover <span className="text-slate-900 font-bold">{editingStudent.name}</span> para a lixeira? 
              Você poderá restaurá-lo mais tarde na página da Lixeira.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDeleteStudent}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-3xl shadow-xl shadow-red-600/20 transition-all active:scale-95"
              >
                Sim, Remover Atleta
              </button>
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-5 rounded-3xl transition-all active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsView;
