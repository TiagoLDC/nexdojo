
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Student, Belt, StudentDocument, ClassTemplate, Academy, User } from '../types';
import { studentService } from '@/features/students/services/studentService';
import { financeService } from '@/features/finances/services/financeService';
import { usersService } from '@/features/users/services/usersService';
import { GuardianAccessSection } from '@/components/students/GuardianAccessSection';
import { fetchAddressByCep, maskCEP, maskPhone, maskCPF, maskRG } from '../services/cep';
import { advancePaymentDate } from '@/utils/paymentUtils';
import { getTodayBrasilia } from '@/utils/date';
import { calculateAge, getNextRank, BELT_LIST, isReadyForGraduationByBeltRank, getGraduationProgressByBeltRank, isCloseToGraduationByBeltRank } from '../services/graduation';
import { useTranslation } from '../services/LanguageContext';
import { beltRankService, AcademyBeltRank } from '@/features/settings/services/beltRankService';
import type { Sport } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
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
  AlertTriangle,
  Trophy,
  Medal,
  Star,
  Loader2,
  Eye,
  EyeOff,
  Book,
  ChevronRight,
  Clipboard,
  LockKeyhole,
  BookX,
  CalendarOff,
  ShieldOff,
  ShieldCheck as ShieldCheckIcon,
  CreditCard,
  CheckCircle2,
  Shirt,
  RotateCcw,
  Clock
} from 'lucide-react';
import { BeltBadge } from '../components/BeltBadge';
import { getBeltClassName } from '../constants';
import { DateSelectInput, ConfirmDialog } from '@/components/ui';
import { kimonoLoanService } from '@/features/kimonoLoans/services/kimonoLoanService';

// Funções utilitárias para máscaras removidas daqui e movidas para services/cep.ts

const fmtDate = (d?: string | null) => {
  if (!d) return '—';
  const part = d.split('T')[0];
  const [y, m, day] = part.split('-');
  return `${day}/${m}/${y}`;
};

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

const PrintHeader: React.FC<{ title: string; academy: Academy }> = ({ title, academy }) => {
  return (
    <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter">{academy.name}</h1>
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
  const { t, language, showNotification } = useTranslation();
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, _setTemplates] = useState<ClassTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const currentUser = user;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [qrStudent, setQrStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');

  const [isGraduationCenterOpen, setIsGraduationCenterOpen] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);

  // Faixas e Graduação por academia (substitui os baldes fixos — ver PLANO_GRADUACAO.md Fase 7)
  const [beltRanksConfig, setBeltRanksConfig] = useState<AcademyBeltRank[]>([]);
  const [beltSettingsSport, setBeltSettingsSport] = useState<Sport | null>(null);
  const getBeltConfig = (student: Student) => beltRanksConfig.find(b => b.name === student.belt);

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [beltFilter, setBeltFilter] = useState<string>('All');
  const [readinessFilter, setReadinessFilter] = useState<string>('All');
  const [absenceFilter, setAbsenceFilter] = useState<boolean>(false);
  const [noPlanFilter, setNoPlanFilter] = useState<boolean>(false);
  const [noDueDateFilter, setNoDueDateFilter] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const editCameraInputRef = useRef<HTMLInputElement>(null);

  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState('');
  const [gradDateInput, setGradDateInput] = useState('');
  const [newStudentPassword, setNewStudentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);
  const [isReturningKimono, setIsReturningKimono] = useState(false);
  const [isMarkingPayment, setIsMarkingPayment] = useState(false);

  const markPaymentAsPaid = async () => {
    if (!editingStudent?.id || !editingStudent.nextPaymentDate) return;
    const oldDueDate = editingStudent.nextPaymentDate;
    const plan = (academy.plans || []).find(p => p.id === editingStudent.planId);
    setIsMarkingPayment(true);
    try {
      const nextDate = advancePaymentDate(oldDueDate);
      const updated = await studentService.update(editingStudent.id, { nextPaymentDate: nextDate } as any);
      await financeService.create(academy.id, {
        description: plan?.name ?? 'Mensalidade',
        amount: plan?.price ?? 0,
        type: 'income',
        category: 'Mensalidade',
        date: getTodayBrasilia(),
        paymentMethod: 'Admin',
        status: 'paid',
        studentId: editingStudent.id,
        dueDate: oldDueDate,
      });
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      setEditingStudent(prev => prev ? { ...prev, nextPaymentDate: nextDate } : prev);
      showNotification(
        `Mensalidade registrada. Próx. vencimento: ${new Date(nextDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
      );
    } catch {
      showNotification('Erro ao registrar pagamento.', 'error');
    } finally {
      setIsMarkingPayment(false);
    }
  };

  useEffect(() => {
    if (editingStudent?.birthDate) {
      const [year, month, day] = editingStudent.birthDate.split('T')[0].split('-');
      if (year && month && day) {
        setBirthDateInput(`${day}/${month}/${year}`);
      } else {
        setBirthDateInput('');
      }
    } else {
      setBirthDateInput('');
    }

    if (editingStudent?.lastGraduationDate) {
      const [year, month, day] = editingStudent.lastGraduationDate.split('T')[0].split('-');
      if (year && month && day) {
        setGradDateInput(`${day}/${month}/${year}`);
      } else {
        setGradDateInput('');
      }
    } else {
      setGradDateInput('');
    }
  }, [editingStudent?.id]);

  const handleGradDateChange = (val: string) => {
    // Remove non-digits
    const clean = val.replace(/\D/g, '').slice(0, 8);
    let masked = clean;
    if (clean.length > 2) masked = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) masked = masked.slice(0, 5) + '/' + masked.slice(5);

    setGradDateInput(masked);

    // If complete, update student
    if (clean.length === 8) {
      const d = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      const y = clean.slice(4, 8);
      setEditingStudent(prev => prev ? {...prev, lastGraduationDate: `${y}-${m}-${d}`} : null);
    }
  };

  const handleBirthDateChange = (val: string) => {
    // Remove non-digits
    const clean = val.replace(/\D/g, '').slice(0, 8);
    let masked = clean;
    if (clean.length > 2) masked = clean.slice(0, 2) + '/' + clean.slice(2);
    if (clean.length > 4) masked = masked.slice(0, 5) + '/' + masked.slice(5);

    setBirthDateInput(masked);

    // If complete, update student
    if (clean.length === 8) {
      const d = clean.slice(0, 2);
      const m = clean.slice(2, 4);
      const y = clean.slice(4, 8);
      setEditingStudent(prev => prev ? {...prev, birthDate: `${y}-${m}-${d}`} : null);
    }
  };


  useEffect(() => {
    if (academy?.id) {
      setIsLoading(true);
      studentService.getAll(academy.id, { limit: 1000 })
        .then(res => setStudents(res.data))
        .catch(err => {
          console.error('Erro ao carregar alunos:', err);
          showNotification(language === 'pt' ? 'Erro ao carregar alunos.' : 'Error loading students.', 'error');
        })
        .finally(() => setIsLoading(false));
    }
  }, [academy?.id]);

  useEffect(() => {
    if ((location.state as { openGraduationCenter?: boolean } | null)?.openGraduationCenter) {
      setIsGraduationCenterOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!academy?.id) return;
    beltRankService.getAcademyBeltSettings(academy.id)
      .then(res => {
        setBeltSettingsSport(res.sport);
        setBeltRanksConfig(res.beltRanks);
      })
      .catch(err => console.error('Erro ao carregar faixas e graduação:', err));
  }, [academy?.id]);

  const exportStudentsToCSV = () => {
    if (students.length === 0) return;

    // Header for CSV
    const headers = [t.students.slice(0, -1), 'Email', t.phone, t.belt, 'Graus', t.status, t.birthDate, 'CPF', 'RG', 'CEP', t.address, 'Cidade', 'UF'];
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

    const blob = new Blob(["﻿" + csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alunos_${academy.name.replace(/\s+/g, '_').toLowerCase()}.csv`;
    link.click();
    showNotification(language === 'pt' ? 'Lista de alunos exportada com sucesso!' : 'Student list exported successfully!', 'success');
  };

  const handleOpenNewStudent = () => {
    const newStudent: Student = {
      id: '',
      academyId: academy.id,
      name: '',
      photo: undefined,
      belt: Belt.WHITE,
      stripes: 0,
      lastGraduationDate: undefined,
      birthDate: '',
      email: '',
      phone: '',
      cpf: '',
      documents: [],
      totalClasses: 0,
      totalHours: 0,
      absentCount: 0,
      status: 'Active',
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

  const handleSaveStudent = async () => {
    if (!editingStudent) return;

    const age = calculateAge(editingStudent.birthDate);
    const isMinor = editingStudent.birthDate ? age < 18 : false;

    const requiredFields = [
      { key: 'name', label: 'Nome Completo' },
      { key: 'birthDate', label: 'Data de Nascimento' },
    ];

    for (const field of requiredFields) {
      if (!editingStudent[field.key as keyof Student]) {
        showNotification(language === 'pt' ? `${field.label} é obrigatório.` : `${field.label} is required.`, 'error');
        return;
      }
    }

    const isNew = !editingStudent.id;
    if (isNew && editingStudent.email && !newStudentPassword) {
      showNotification(language === 'pt' ? "Senha é obrigatória quando o e-mail de login é informado." : "Password is required when login email is provided.", 'error');
      return;
    }
    if (newStudentPassword && newStudentPassword.length < 6) {
      showNotification(language === 'pt' ? "A senha deve ter no mínimo 6 caracteres." : "Password must be at least 6 characters.", 'error');
      return;
    }

    if (isMinor) {
      if (!editingStudent.guardianName || !editingStudent.guardianPhone || !editingStudent.guardianCpf) {
        showNotification(language === 'pt' ? "Para menores de idade, os dados do responsável são obrigatórios." : "For minors, guardian details are required.", 'error');
        return;
      }
    }

    try {
      if (isNew) {
        const created = await studentService.create(academy.id, { ...editingStudent, password: newStudentPassword || undefined } as any);
        setStudents(prev => [...prev, created]);
        showNotification(language === 'pt' ? "Atleta cadastrado com sucesso!" : "Athlete registered successfully!");
      } else {
        const payload: any = { ...editingStudent };
        if (newStudentPassword) payload.password = newStudentPassword;
        const updated = await studentService.update(editingStudent.id, payload);

        const newDocs = (editingStudent.documents || []).filter(d => d.id.length < 32);
        for (const doc of newDocs) {
          await studentService.addDocument(editingStudent.id, {
            name: doc.name,
            type: doc.type,
            size: doc.size,
            base64: doc.base64,
          });
        }

        setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
        showNotification(language === 'pt' ? "Ficha atualizada com sucesso!" : "Profile updated successfully!");
      }

      setIsEditModalOpen(false);
      setEditingStudent(null);
      setNewStudentPassword('');
    } catch (e) {
      console.error(e);
      showNotification(language === 'pt' ? "Erro ao salvar atleta." : "Error saving athlete.", 'error');
    }
  };

  const handleToggleStudentAccess = async (student: Student) => {
    if (!student.userId) return;
    const newStatus = student.userStatus === 'Blocked' ? 'Active' : 'Blocked';
    // Backend cascateia esse status para students.status (bloqueado -> Inactive, desbloqueado -> Active
    // apenas se estava Inactive por causa do bloqueio; não mexe em Dropped/Pending).
    const newStudentStatus = newStatus === 'Blocked' ? 'Inactive' : (student.status === 'Inactive' ? 'Active' : student.status);
    setAccountActionLoading(student.userId);
    try {
      await usersService.update(student.userId, { status: newStatus });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, userStatus: newStatus, status: newStudentStatus } : s));
      setEditingStudent(prev => prev?.id === student.id ? { ...prev, userStatus: newStatus, status: newStudentStatus } : prev);
      showNotification(newStatus === 'Blocked' ? 'Acesso bloqueado' : 'Acesso ativado', 'success');
    } catch {
      showNotification('Erro ao alterar acesso', 'error');
    } finally {
      setAccountActionLoading(null);
    }
  };

  const handleReturnKimono = async (student: Student) => {
    setIsReturningKimono(true);
    try {
      await kimonoLoanService.return(academy.id, { personType: 'student', personId: student.id });
      setStudents(prev => prev.map(s => s.id === student.id ? { ...s, hasLoanedKimono: false, kimonoLoanDate: null } : s));
      setEditingStudent(prev => prev?.id === student.id ? { ...prev, hasLoanedKimono: false, kimonoLoanDate: null } : prev);
      showNotification('Kimono devolvido com sucesso!');
    } catch {
      showNotification('Erro ao devolver kimono.', 'error');
    } finally {
      setIsReturningKimono(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!editingStudent?.id) return;

    try {
      await studentService.delete(editingStudent.id);
      setStudents(prev => prev.filter(s => s.id !== editingStudent.id));
      showNotification("Atleta removido com sucesso.", 'delete');

      setIsDeleteModalOpen(false);
      setIsEditModalOpen(false);
      setEditingStudent(null);
      setNewStudentPassword('');
    } catch (error) {
      console.error("Erro ao excluir aluno:", error);
      showNotification("Erro ao processar exclusão.", 'error');
    }
  };

  const handleApproveStudent = async (student: Student) => {
    try {
      const updated = await studentService.update(student.id, { status: 'Active' } as any);
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      showNotification('Aluno aprovado com sucesso!');
    } catch (e) {
      console.error(e);
      showNotification('Erro ao aprovar aluno.', 'error');
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

  const deleteDocument = async (docId: string) => {
    if (!editingStudent) return;
    if (docId.length >= 32) {
      try {
        await studentService.deleteDocument(editingStudent.id, docId);
      } catch {
        showNotification("Erro ao remover documento.", 'error');
        return;
      }
    }
    setEditingStudent({
      ...editingStudent,
      documents: editingStudent.documents?.filter(d => d.id !== docId) || []
    });
    showNotification("Documento removido.", 'delete');
  };

  const handleOpenEdit = async (student: Student) => {
    setEditingStudent({ ...student });
    setIsEditModalOpen(true);
    try {
      const full = await studentService.getById(student.id);
      setEditingStudent(full as any);
    } catch {
      // mantém os dados básicos já setados
    }
  };

  const openQRModal = (student: Student) => {
    setQrStudent(student);
    setIsQRModalOpen(true);
  };

  const handlePromoteStudent = async (student: Student, newBelt: Belt, newStripes: number, notes: string = '') => {
    try {
      setIsPromoting(true);
      const updated = await studentService.graduate(student.id, {
        newBelt,
        newStripes,
        notes,
        instructorId: currentUser.id,
        date: new Date().toISOString()
      });

      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));

      if (editingStudent?.id === student.id) {
        setEditingStudent(updated);
      }

      showNotification(`Promoção realizada: ${student.name} agora é ${newBelt}${newStripes > 0 ? ` (${newStripes}º grau)` : ''}!`);
    } catch (e) {
      console.error(e);
      showNotification("Erro ao realizar promoção.", 'error');
    } finally {
      setIsPromoting(false);
    }
  };

  const getEffectiveAbsenceLimit = (student: Student) => {
    if (student.absenceLimit) return student.absenceLimit;

    // Encontrar turmas que o aluno participa
    const studentTemplates = templates.filter(t => t.assignedStudentIds?.includes(student.id));
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
      const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(s, getBeltConfig(s));
      if (readinessFilter === 'Stripe') matchesReadiness = readyForStripe;
      if (readinessFilter === 'Belt') matchesReadiness = readyForBelt;
      if (readinessFilter === 'Any') matchesReadiness = readyForStripe || readyForBelt;
    }

    const matchesAbsence = !absenceFilter || (s.absentCount >= getEffectiveAbsenceLimit(s));
    const matchesNoPlan = !noPlanFilter || !s.planId;
    const matchesNoDueDate = !noDueDateFilter || !s.nextPaymentDate;

    return matchesSearch && matchesStatus && matchesBelt && matchesReadiness && matchesAbsence && matchesNoPlan && matchesNoDueDate;
  }).sort((a, b) => a.name.localeCompare(b.name));

  // Fonte única da sequência de faixas — ver services/graduation.ts (BELT_LIST)
  const allBeltOptions = BELT_LIST;

  const studentAge = editingStudent ? calculateAge(editingStudent.birthDate) : 0;
  const isMinor = editingStudent ? (editingStudent.birthDate ? studentAge < 18 : false) : false;
  const isNewStudent = editingStudent && !editingStudent.id;

  return (
    <div className="w-full space-y-6 relative">
      <PrintHeader title="Listagem Geral de Atletas" academy={academy} />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white uppercase italic tracking-tighter">{t.students}</h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t.manageAccess}</p>
        </div>
        <div className="grid grid-cols-3 md:flex gap-2">
          {(['admin', 'superuser', 'instructor', 'staff'] as const).includes(user.role as any) && (
          <button
            onClick={() => setIsGraduationCenterOpen(true)}
            className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 text-xs uppercase tracking-widest border border-indigo-100 dark:border-indigo-800"
          >
            <Trophy size={18} />
            {t.graduationJourney.split(' ')[0]}
          </button>
          )}
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
            {language === 'pt' ? 'Imprimir' : 'Print'}
          </button>
          <button
            onClick={handleOpenNewStudent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-xs uppercase tracking-widest"
          >
            <Plus size={18} />
            {t.add}
          </button>
        </div>
      </header>

      <div className="space-y-4 no-print px-2">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder={`${t.search}...`}
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
              <option value="All">{t.allStatus}</option>
              <option value="Active">{language === 'pt' ? 'Ativos' : 'Active'}</option>
              <option value="Inactive">{language === 'pt' ? 'Inativos' : 'Inactive'}</option>
              <option value="Pending">{language === 'pt' ? 'Pendentes' : 'Pending'}</option>
              <option value="Dropped">{language === 'pt' ? 'Desistentes' : 'Dropped'}</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-1 md:flex-none bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm min-w-0">
            <GraduationCap size={14} className="text-slate-400" />
            <select
              value={beltFilter}
              onChange={(e) => setBeltFilter(e.target.value)}
              className="text-xs font-black text-slate-700 dark:text-slate-300 outline-none bg-transparent uppercase tracking-tighter w-full"
            >
              <option value="All">{t.allBelts}</option>
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

            <button
              onClick={() => setNoPlanFilter(!noPlanFilter)}
              className={`flex items-center justify-center gap-2 border rounded-2xl px-4 py-3 shadow-sm transition-all flex-1 md:flex-none ${
                noPlanFilter
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
              }`}
            >
              <BookX size={14} />
              <span className="text-xs font-black uppercase tracking-tighter">Sem Plano</span>
            </button>

            <button
              onClick={() => setNoDueDateFilter(!noDueDateFilter)}
              className={`flex items-center justify-center gap-2 border rounded-2xl px-4 py-3 shadow-sm transition-all flex-1 md:flex-none ${
                noDueDateFilter
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400'
              }`}
            >
              <CalendarOff size={14} />
              <span className="text-xs font-black uppercase tracking-tighter">Sem Vencimento</span>
            </button>
          </div>
        </div>

        {(statusFilter !== 'All' || beltFilter !== 'All' || readinessFilter !== 'All' || search !== '' || absenceFilter || noPlanFilter || noDueDateFilter) && (
          <button
            onClick={() => { setStatusFilter('All'); setBeltFilter('All'); setReadinessFilter('All'); setSearch(''); setAbsenceFilter(false); setNoPlanFilter(false); setNoDueDateFilter(false); }}
            className="w-full py-2 text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 text-center tracking-widest"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      <div className="bg-transparent md:bg-white dark:md:bg-slate-800 md:rounded-3xl md:border md:border-slate-100 dark:md:border-slate-700/50 md:shadow-sm overflow-hidden">
        {/* Mobile Card View - REESTILIZADO PARA MODO MOBILE "APP-LIKE" */}
        <div className="md:hidden space-y-4 px-2 pb-24">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="text-slate-400 font-bold text-sm">Carregando alunos...</p>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map(student => {
              const contactPhone = student.phone || student.guardianPhone;
              const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(student, getBeltConfig(student));
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
                    {academy.kimonoLoanEnabled && !!student.hasLoanedKimono && (
                      <div title="Kimono emprestado" className="bg-blue-500 text-white p-1.5 rounded-full shadow-lg shadow-blue-500/30"><Shirt size={14} /></div>
                    )}
                  </div>

                  <div className="flex gap-4 items-start mb-4">
                    <div className="relative shrink-0">
                      {student.photo ? (
                        <img src={student.photo} className="w-24 h-24 rounded-[32px] object-cover border-2 border-white dark:border-slate-800 shadow-md" />
                      ) : (
                        <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center font-black text-4xl shadow-md ${getBeltClassName(student.belt, getBeltConfig(student)?.colorKey)}`}>
                          {student.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-10">
                      <h3 className="font-black text-slate-800 dark:text-white text-lg truncate leading-tight uppercase italic">{student.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <BeltBadge belt={student.belt} stripes={student.stripes} colorKey={getBeltConfig(student)?.colorKey} />
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${
                          student.status === 'Active' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          student.status === 'Pending' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 animate-pulse' :
                          student.status === 'Inactive' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {student.status === 'Active' ? 'Ativo' : student.status === 'Pending' ? 'Pendente' : student.status === 'Inactive' ? 'Inativo' : 'Desistente'}
                        </span>
                        {student.userId
                          ? <span title="Tem conta de acesso"><LockKeyhole size={11} className="text-green-500" /></span>
                          : <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Sem usuário</span>
                        }
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
                      {student.status === 'Pending' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveStudent(student);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-1"
                        >
                          <Check size={12} /> Aprovar
                        </button>
                      ) : (
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
                      )}
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
            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Aluno</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Idade</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Treinos</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Faltas</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:table-cell">Vencimento</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center">
                  <Loader2 size={24} className="animate-spin text-indigo-500 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Carregando alunos...</p>
                </td>
              </tr>
            ) : filtered.length > 0 ? (
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
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl shadow-sm transition-all duration-300 transform hover:scale-[2.5] hover:shadow-2xl hover:rounded-lg cursor-zoom-in relative ${getBeltClassName(student.belt, getBeltConfig(student)?.colorKey)}`}>
                              {student.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{student.name}</div>
                            {(() => {
                              const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(student, getBeltConfig(student));
                              const effectiveLimit = getEffectiveAbsenceLimit(student);
                              const isAbsentee = student.absentCount >= effectiveLimit;

                              return (
                                <>
                                  {readyForBelt && <Trophy size={14} className="text-indigo-600 animate-bounce" />}
                                  {readyForStripe && <Medal size={14} className="text-amber-500 animate-pulse" />}
                                  {isAbsentee && <AlertTriangle size={14} className="text-red-500 animate-pulse" />}
                                </>
                              );
                            })()}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <BeltBadge belt={student.belt} stripes={student.stripes} colorKey={getBeltConfig(student)?.colorKey} />
                            {student.planId && (
                              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Book size={8} className="text-indigo-500" />
                                {academy.plans?.find(p => p.id === student.planId)?.name}
                              </span>
                            )}
                            {student.userId
                              ? <span title="Tem conta de acesso"><LockKeyhole size={11} className="text-green-500" /></span>
                              : <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Sem usuário</span>
                            }
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-bold text-slate-500">{age || '--'} anos</span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{student.totalClasses}</span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className={`text-sm font-bold ${student.absentCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {student.absentCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-sm font-bold text-slate-500">
                        {student.nextPaymentDate ? fmtDate(student.nextPaymentDate) : ''}
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
                        {student.status === 'Pending' ? (
                          <button
                            onClick={() => handleApproveStudent(student)}
                            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl transition-all flex items-center gap-1 shadow-sm"
                            title="Aprovar cadastro"
                          >
                            <Check size={14} /> Aprovar
                          </button>
                        ) : (
                          <a
                            href={contactPhone ? `https://wa.me/55${contactPhone.replace(/\D/g, '')}` : '#'}
                            target={contactPhone ? "_blank" : "_self"}
                            rel="noopener noreferrer"
                            onClick={(e) => !contactPhone && e.preventDefault()}
                            className={`p-2 rounded-xl transition-all shadow-sm ${
                              contactPhone
                                ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200 hover:scale-105 active:scale-95'
                                : 'bg-slate-100 dark:bg-slate-800/50 text-slate-300 cursor-not-allowed opacity-50'
                            }`}
                            title={contactPhone ? `Chamar no WhatsApp (${contactPhone})` : "Nenhum telefone cadastrado"}
                          >
                            <MessageCircle size={18} fill={contactPhone ? "currentColor" : "none"} />
                          </a>
                        )}
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
                <td colSpan={7} className="px-6 py-10 text-center text-slate-400">
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
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[400] flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsQRModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[40px] p-6 animate-in zoom-in duration-300 shadow-2xl overflow-hidden relative cursor-default"
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

              <div className={`w-20 h-20 rounded-full border-4 border-white shadow-xl flex items-center justify-center overflow-hidden mb-4 ${getBeltClassName(qrStudent.belt, getBeltConfig(qrStudent)?.colorKey)}`}>
                {qrStudent.photo ? (
                  <img src={qrStudent.photo} alt={qrStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black">{qrStudent.name.charAt(0)}</span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{qrStudent.name}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">{qrStudent.belt}</p>

              <div className="my-4 p-2 bg-white dark:bg-slate-800 rounded-3xl border-2 border-slate-100 dark:border-slate-700/50 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrStudent.id}`}
                  alt="QR Code do Aluno"
                  className="w-36 h-36 md:w-48 md:h-48"
                />
              </div>

              <p className="text-[10px] text-slate-400 font-medium mb-4 leading-relaxed">
                Apresente este código no tatame para realizar sua chamada automática.
              </p>

              <div className="grid grid-cols-1 gap-3 w-full">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold py-3 rounded-2xl transition-all"
                  >
                    <Printer size={18} />
                    Imprimir
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20"
                  >
                    <Share2 size={18} />
                    Enviar
                  </button>
                </div>
                <button
                  onClick={() => setIsQRModalOpen(false)}
                  className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl hover:bg-slate-900 transition-all mt-1"
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-t-3xl md:rounded-3xl p-4 md:p-8 animate-in slide-in-from-bottom duration-300 max-h-[95vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-white dark:bg-slate-800 py-2 z-10 border-b border-slate-50">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                  {isNewStudent ? <UserPlus size={24} /> : <GraduationCap size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{isNewStudent ? 'Novo Aluno' : 'Ficha do Aluno'}</h2>
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
                <button onClick={() => { setIsEditModalOpen(false); setNewStudentPassword(''); }} className="text-slate-400 p-2 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-full">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="space-y-8 pb-10">
              {!isNewStudent && academy.kimonoLoanEnabled && (
                <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border ${editingStudent.hasLoanedKimono ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${editingStudent.hasLoanedKimono ? 'bg-blue-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <Shirt size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Kimono</p>
                      <p className="text-sm font-bold text-slate-700 dark:text-white">
                        {editingStudent.hasLoanedKimono
                          ? `Emprestado em ${editingStudent.kimonoLoanDate ? fmtDate(editingStudent.kimonoLoanDate) : '—'}`
                          : 'Nenhum kimono emprestado'}
                      </p>
                    </div>
                  </div>
                  {editingStudent.hasLoanedKimono && (
                    <button
                      type="button"
                      onClick={() => handleReturnKimono(editingStudent)}
                      disabled={isReturningKimono}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {isReturningKimono ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      Devolver
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                  <UserCheck size={14} /> Dados Pessoais
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <div className="w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 overflow-hidden relative group shadow-sm">
                        {editingStudent.photo ? (
                          <img src={editingStudent.photo} alt={editingStudent.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                            <UserIcon size={40} />
                            <span className="text-[10px] font-black uppercase tracking-widest mt-2">Sem Foto</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                          <button onClick={() => editCameraInputRef.current?.click()} className="bg-indigo-600 p-2 rounded-full hover:bg-indigo-700 transition-all" title="Tirar Foto"><Camera size={18} /></button>
                          <button onClick={() => editPhotoInputRef.current?.click()} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-all" title="Escolher da Galeria"><Upload size={16} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1 w-full">
                        <button onClick={() => editCameraInputRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-white bg-indigo-600 py-2 rounded-xl flex items-center justify-center gap-1.5"><Camera size={12} /> Câmera</button>
                        <button onClick={() => editPhotoInputRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 py-2 rounded-xl border border-indigo-100 flex items-center justify-center gap-1.5"><Upload size={12} /> Galeria</button>
                      </div>
                      <input type="file" ref={editPhotoInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
                      <input type="file" ref={editCameraInputRef} accept="image/*" capture="user" className="hidden" onChange={handlePhotoCapture} />
                    </div>

                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nome Completo <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editingStudent.name}
                        onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">{t.studentLoginEmail} {isNewStudent && <span className="text-red-500">*</span>}</label>
                      <input
                        type="email"
                        autoComplete="off"
                        value={editingStudent.email || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, email: e.target.value.toLowerCase()})}
                        placeholder="aluno@email.com"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-indigo-600"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1 flex items-center justify-between">
                        <span>{isNewStudent ? 'Senha de Acesso' : 'Redefinir Senha'} {isNewStudent && <span className="text-red-500">*</span>}</span>
                        <button type="button" onClick={() => setShowPassword(p => !p)} className="text-slate-400">
                          {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                      </label>
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={newStudentPassword}
                        onChange={(e) => setNewStudentPassword(e.target.value)}
                        placeholder={isNewStudent ? "Mín. 6 caracteres" : "Nova senha (opcional)"}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                      {!isNewStudent && <p className="text-[9px] text-slate-400 mt-1 ml-1 italic">O aluno será obrigado a trocar na próxima entrada.</p>}
                    </div>
                    {!isNewStudent && (
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1 flex items-center gap-1.5">
                          <ShieldCheckIcon size={10} /> Acesso ao Sistema
                        </label>
                        {editingStudent.userId ? (
                          <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-tight ${
                              editingStudent.userStatus === 'Blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              editingStudent.userStatus === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              {editingStudent.userStatus === 'Blocked' ? 'Conta bloqueada' : editingStudent.userStatus === 'Pending' ? 'Conta pendente' : 'Conta ativa'}
                            </span>
                            {(['admin', 'superuser'] as const).includes(user.role as any) && (
                              <button
                                type="button"
                                onClick={() => handleToggleStudentAccess(editingStudent)}
                                disabled={accountActionLoading === editingStudent.userId}
                                className={`ml-auto text-[10px] font-black uppercase tracking-tight px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
                                  editingStudent.userStatus === 'Blocked'
                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                                }`}
                              >
                                {accountActionLoading === editingStudent.userId ? (
                                  <Loader2 size={11} className="animate-spin" />
                                ) : editingStudent.userStatus === 'Blocked' ? (
                                  <><ShieldCheckIcon size={11} /> Ativar acesso</>
                                ) : (
                                  <><ShieldOff size={11} /> Bloquear acesso</>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <LockKeyhole size={13} className="text-slate-300 dark:text-slate-600 shrink-0" />
                            <span className="text-xs text-slate-400 font-medium">Sem conta de acesso</span>
                            {(['admin', 'superuser'] as const).includes(user.role as any) && editingStudent.email && (
                              <span className="ml-auto text-[10px] text-slate-400 italic">Defina uma senha acima para criar o acesso</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Sexo <span className="text-red-500">*</span></label>
                      <select
                        value={editingStudent.gender || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, gender: e.target.value as any})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 dark:text-slate-200"
                      >
                        <option value="">Selecionar</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Nascimento <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="DD/MM/AAAA"
                        value={birthDateInput}
                        onChange={(e) => handleBirthDateChange(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800 dark:text-slate-100 text-lg appearance-none"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium italic">Digite a data manualmente no formato DD/MM/AAAA.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">
                        CPF <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="000.000.000-00"
                        value={editingStudent.cpf || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, cpf: maskCPF(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">RG</label>
                      <input
                        type="text"
                        placeholder="00.000.000-0"
                        value={editingStudent.rg || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, rg: maskRG(e.target.value)})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Peso (kg)</label>
                      <input
                        type="text"
                        placeholder="Ex: 80"
                        value={editingStudent.weight || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, weight: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Altura (cm)</label>
                      <input
                        type="text"
                        placeholder="Ex: 180"
                        value={editingStudent.height || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, height: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tipo Sanguíneo</label>
                      <input
                        type="text"
                        placeholder="Ex: O+"
                        value={editingStudent.bloodType || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, bloodType: e.target.value})}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
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
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
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
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Número</label>
                      <input
                        type="text"
                        value={editingStudent.addressNumber || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, addressNumber: e.target.value})}
                        placeholder="Nº"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Endereço Completo <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={editingStudent.address || ''}
                        onChange={(e) => setEditingStudent({...editingStudent, address: e.target.value})}
                        placeholder="Rua, Bairro, Cidade - UF"
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
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
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Telefone de Emergência</label>
                    <input
                      type="tel"
                      value={editingStudent.emergencyPhone || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, emergencyPhone: maskPhone(e.target.value)})}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className={`space-y-4 p-6 rounded-3xl border transition-all ${isMinor ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-700/50 opacity-60'}`}>
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
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Parentesco</label>
                    <input
                      type="text"
                      placeholder="Ex: Mãe"
                      value={editingStudent.guardianRelation || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianRelation: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">CPF do Responsável <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={editingStudent.guardianCpf || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianCpf: maskCPF(e.target.value)})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">RG do Responsável</label>
                    <input
                      type="text"
                      value={editingStudent.guardianRg || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianRg: maskRG(e.target.value)})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">WhatsApp do Responsável <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      value={editingStudent.guardianPhone || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianPhone: maskPhone(e.target.value)})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">E-mail do Responsável</label>
                    <input
                      type="email"
                      value={editingStudent.guardianEmail || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, guardianEmail: e.target.value})}
                      className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
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
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {editingStudent.id && (
                <GuardianAccessSection studentId={editingStudent.id} onNotify={showNotification} />
              )}

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
                      <div key={doc.id} className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 p-4 rounded-2xl flex items-center justify-between group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="bg-white dark:bg-slate-800 p-2 rounded-xl text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                            <FileIcon size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{doc.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium">
                              {doc.size ? `${(doc.size / 1024).toFixed(1)} KB • ` : ''}{new Date((doc as any).uploadedAt || (doc as any).createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => downloadFile(doc)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Download Documento"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => deleteDocument(doc.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400">
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
                      <div className={`flex items-center justify-between border-2 transition-all rounded-2xl px-5 py-4 shadow-inner ${getBeltClassName(editingStudent.belt || Belt.WHITE, getBeltConfig(editingStudent)?.colorKey)}`}>
                        <button type="button" onClick={() => setEditingStudent({...editingStudent, stripes: Math.max(0, (editingStudent.stripes || 0) - 1)})} className="bg-black/30 hover:bg-black/50 border border-white/20 text-white rounded-xl p-2 transition-all outline-none"><Minus size={20} /></button>
                        <div className={`flex gap-1.5 p-1 rounded-md px-3 bg-opacity-90 ${editingStudent.belt === Belt.BLACK ? 'bg-red-600' : 'bg-zinc-900 shadow-lg'}`}>
                          {[...Array(editingStudent.belt === Belt.BLACK ? 6 : 4)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-2.5 h-7 rounded-sm transition-all ${i < (editingStudent.stripes || 0) ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] scale-y-110' : 'bg-white/10'}`}
                            />
                          ))}
                        </div>
                        <button type="button" onClick={() => setEditingStudent({...editingStudent, stripes: Math.min(editingStudent.belt === Belt.BLACK ? 6 : 4, (editingStudent.stripes || 0) + 1)})} className="bg-black/30 hover:bg-black/50 border border-white/20 text-white rounded-xl p-2 transition-all outline-none"><PlusIcon size={20} /></button>
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
                        type="text"
                        inputMode="numeric"
                        placeholder="DD/MM/AAAA"
                        value={gradDateInput}
                        onChange={(e) => handleGradDateChange(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium italic">Digite manualmente DD/MM/AAAA.</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 flex items-center gap-1">
                        <Activity size={12} /> Total de Aulas na Faixa
                        <span className="ml-1 text-[8px] font-black text-indigo-400 normal-case tracking-normal">(Campo Calculado)</span>
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          disabled
                          value={editingStudent.totalClasses}
                          className="flex-1 border rounded-xl px-4 py-3 outline-none font-bold bg-slate-100 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50 text-slate-400 cursor-not-allowed"
                        />
                        {(['admin', 'superuser', 'instructor', 'staff'] as const).includes(user.role as any) && (() => {
                           const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(editingStudent, getBeltConfig(editingStudent));
                           if (readyForBelt || readyForStripe) {
                             const { nextBelt, nextStripes } = getNextRank(editingStudent.belt, editingStudent.stripes);
                             return (
                               <button
                                 onClick={() => handlePromoteStudent(editingStudent, nextBelt, nextStripes)}
                                 disabled={isPromoting}
                                 className="bg-amber-500 text-slate-900 dark:text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all disabled:opacity-60"
                               >
                                 {isPromoting ? <Loader2 size={14} className="animate-spin" /> : 'Promover'}
                               </button>
                             );
                           }
                           return null;
                        })()}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium italic">
                        * Calculado automaticamente pela frequência do aluno; usado para calcular a prontidão para graduação.
                      </p>
                    </div>

                    {/* Histórico Local do Aluno */}
                    {editingStudent.graduationHistory && editingStudent.graduationHistory.length > 0 && (
                      <div className="mt-8 border-t border-slate-100 dark:border-slate-700/50 pt-6">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase ml-1 mb-4 flex items-center gap-1">
                          <Activity size={12} /> Histórico de Graduações
                        </label>
                        <div className="space-y-3">
                          {editingStudent.graduationHistory.slice().reverse().map(h => (
                            <div key={h.id} className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg text-emerald-600 shadow-sm"><Check size={14} /></div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{h.previousBelt}</span>
                                    <ChevronRight size={10} className="text-slate-300" />
                                    <span className="text-[10px] font-black text-emerald-600 uppercase italic">{h.newBelt}</span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                                    {h.newStripes}º Grau • {fmtDate(h.date)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                              ? `${getBeltClassName(belt, beltRanksConfig.find(b => b.name === belt)?.colorKey)} shadow-lg shadow-indigo-500/10 scale-105 ring-4 ring-indigo-500/10`
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
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-slate-200"
                    >
                      <option value="Active">Ativo</option>
                      <option value="Inactive">Inativo</option>
                      <option value="Dropped">Desistente</option>
                    </select>
                  </div>
                  {['admin', 'superuser', 'staff'].includes(user.role) ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Plano de Matrícula</label>
                    <select
                      value={editingStudent.planId || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, planId: e.target.value})}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-slate-200"
                    >
                      <option value="">Nenhum Plano Vinculado</option>
                      {(academy.plans || []).map(plan => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price.toLocaleString('pt-BR')} ({plan.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  ) : editingStudent.planId ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Plano de Matrícula</label>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-slate-500 dark:text-slate-400 text-sm">
                      {(academy.plans || []).find(p => p.id === editingStudent.planId)?.name || 'Plano vinculado'}
                    </div>
                  </div>
                  ) : null}
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <DateSelectInput
                          label="Próximo Vencimento"
                          labelClassName="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1"
                          value={(editingStudent.nextPaymentDate || '').split('T')[0]}
                          onChange={v => setEditingStudent({...editingStudent, nextPaymentDate: v})}
                          yearFrom={new Date().getFullYear() - 1}
                          yearTo={new Date().getFullYear() + 5}
                        />
                      </div>
                      {!isNewStudent && editingStudent.nextPaymentDate && (
                        <button
                          type="button"
                          disabled={isMarkingPayment}
                          onClick={markPaymentAsPaid}
                          title="Marcar mensalidade deste mês como paga e avançar vencimento"
                          className="shrink-0 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-3 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-60 border border-emerald-200 dark:border-emerald-900/30 cursor-pointer whitespace-nowrap"
                        >
                          {isMarkingPayment
                            ? <Loader2 size={14} className="animate-spin" />
                            : <CheckCircle2 size={14} />}
                          <span className="hidden sm:inline">Pago</span>
                        </button>
                      )}
                    </div>
                    {!isNewStudent && editingStudent.nextPaymentDate && (
                      <p className="text-[9px] text-slate-400 mt-1 ml-1 font-medium italic flex items-center gap-1">
                        <CreditCard size={9} />
                        Clique em "Pago" para registrar pagamento e avançar o vencimento.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Limite de Faltas Personalizado</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Usar padrão da academia"
                      value={editingStudent.absenceLimit || ''}
                      onChange={(e) => setEditingStudent({...editingStudent, absenceLimit: parseInt(e.target.value) || undefined})}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700 dark:text-slate-200"
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
                  className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-4 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
                />
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-8 border-t border-slate-100 dark:border-slate-700/50 md:sticky md:bottom-0 bg-white dark:bg-slate-800 z-[200] pb-24 md:pb-6 px-4 -mx-6 md:mx-0">
                <div className="flex gap-3 w-full px-2 md:px-0">
                  {!isNewStudent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDeleteModalOpen(true);
                      }}
                      className="flex-1 bg-white dark:bg-slate-800 hover:bg-red-50 text-red-500 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 hover:border-red-100 active:scale-95"
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

      <ConfirmDialog
        open={isDeleteModalOpen && !!editingStudent}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteStudent}
        title="Excluir Atleta?"
        message={<>Deseja realmente excluir <strong className="text-slate-900 dark:text-white">{editingStudent?.name}</strong>? Esta ação não pode ser desfeita.</>}
        confirmLabel="Sim, Excluir Atleta"
      />

      {/* CENTRAL DE GRADUAÇÃO */}
      <AnimatePresence>
        {isGraduationCenterOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[300] flex flex-col no-print"
          >
            <div className="p-6 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-amber-500 p-3 rounded-2xl text-white shadow-lg shadow-amber-500/20">
                  <Trophy size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase italic tracking-tight leading-none">Central de Graduação</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Controle de Promoções e Graus</p>
                </div>
              </div>
              <button onClick={() => setIsGraduationCenterOpen(false)} className="p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* STATUS CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prontos p/ Grau</p>
                    <p className="text-3xl font-black text-amber-500 leading-none">
                      {students.filter(s => isReadyForGraduationByBeltRank(s, getBeltConfig(s)).readyForStripe).length}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Prontos p/ Faixa</p>
                    <p className="text-3xl font-black text-indigo-500 leading-none">
                      {students.filter(s => isReadyForGraduationByBeltRank(s, getBeltConfig(s)).readyForBelt).length}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ativos</p>
                    <p className="text-3xl font-black text-white leading-none">
                      {students.filter(s => s.status === 'Active').length}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Graduações (30d)</p>
                    <p className="text-3xl font-black text-emerald-500 leading-none">
                      {students.filter(s => {
                        if (!s.lastGraduationDate) return false;
                        const [y, m, d] = s.lastGraduationDate.split('-').map(Number);
                        const date = new Date(y, m - 1, d);
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        return date > thirtyDaysAgo;
                      }).length}
                    </p>
                  </div>
                </div>

                {/* CONFIGURAÇÃO ATIVA */}
                {beltSettingsSport ? (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Esporte</p>
                      <p className="text-sm font-black text-white">{beltSettingsSport.name}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Faixas Configuradas</p>
                      <p className="text-sm font-black text-white">
                        {beltRanksConfig.filter(b => b.monthsRequired != null || b.classesRequired != null).length} de {beltRanksConfig.length}
                      </p>
                    </div>
                    <Link to="/settings" className="text-[9px] font-black text-indigo-300 hover:text-white uppercase tracking-widest underline underline-offset-2">
                      Ajustar em Configurações →
                    </Link>
                  </div>
                ) : (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-400 text-xs font-bold">
                    Esporte ainda não definido para esta academia.
                  </div>
                )}

                {/* FILA DE PROMOÇÃO */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
                    <div className="flex flex-col flex-1 min-w-0">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <UsersIcon size={16} className="text-indigo-500" /> Fila de Promoção Sugerida
                      </h3>
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none mt-1">Alunos recomendados para graduação</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const ready = students.filter(s => {
                            const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(s, getBeltConfig(s));
                            return readyForBelt || readyForStripe;
                          });
                          const names = ready.map(s => s.name).join('\n');
                          navigator.clipboard.writeText(names);
                          showNotification(`${ready.length} nomes copiados para certificados!`);
                        }}
                        className="bg-indigo-500 hover:bg-indigo-400 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                      >
                        <Clipboard size={12} /> Copiar Todos
                      </button>
                      <button
                        onClick={() => {
                          const ready = students.filter(s => isReadyForGraduationByBeltRank(s, getBeltConfig(s)).readyForBelt);
                          const names = ready.map(s => s.name).join('\n');
                          navigator.clipboard.writeText(names);
                          showNotification(`${ready.length} nomes de Faixa copiados!`);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap"
                      >
                        Faixas
                      </button>
                      <button
                        onClick={() => {
                          const ready = students.filter(s => isReadyForGraduationByBeltRank(s, getBeltConfig(s)).readyForStripe);
                          const names = ready.map(s => s.name).join('\n');
                          navigator.clipboard.writeText(names);
                          showNotification(`${ready.length} nomes de Graus copiados!`);
                        }}
                        className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap"
                      >
                        Graus
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(() => {
                      const getProgressRatio = (s: Student) => {
                        const p = getGraduationProgressByBeltRank(s, getBeltConfig(s));
                        return p ? p.current / p.target : 0;
                      };
                      return students
                        .filter(s => {
                          const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(s, getBeltConfig(s));
                          return readyForBelt || readyForStripe;
                        })
                        .sort((a, b) => getProgressRatio(b) - getProgressRatio(a))
                        .map(student => {
                          const { nextBelt, nextStripes } = getNextRank(student.belt, student.stripes);
                          const progress = getGraduationProgressByBeltRank(student, getBeltConfig(student));

                        return (
                          <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-[32px] p-5 md:p-6 flex items-start gap-3 md:gap-4 hover:bg-white/10 transition-all border-l-4 border-l-amber-500"
                          >
                            <div className="relative shrink-0">
                              {student.photo ? (
                                <img src={student.photo} className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover" />
                              ) : (
                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-black text-2xl md:text-3xl ${getBeltClassName(student.belt, getBeltConfig(student)?.colorKey)}`}>
                                  {student.name.charAt(0)}
                                </div>
                              )}
                              <div className="absolute -bottom-2 -right-2 bg-slate-900 border border-white/20 p-1.5 rounded-full text-amber-500 shadow-xl">
                                <Star size={12} fill="currentColor" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-black text-white text-base md:text-lg truncate uppercase italic">{student.name}</h4>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(student.name);
                                    showNotification('Nome copiado!');
                                  }}
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all flex-shrink-0"
                                  title="Copiar Nome"
                                >
                                  <Clipboard size={14} />
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2 mb-3">
                                <BeltBadge belt={student.belt} stripes={student.stripes} colorKey={getBeltConfig(student)?.colorKey} />
                                <ChevronRight size={14} className="text-slate-500 shrink-0" />
                                <BeltBadge belt={nextBelt} stripes={nextStripes} colorKey={beltRanksConfig.find(b => b.name === nextBelt)?.colorKey} />
                              </div>
                              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
                                <div className="shrink-0">
                                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">
                                    Progresso ({progress?.unit === 'meses' ? 'meses desde a última graduação' : 'aulas nesta faixa'})
                                  </p>
                                  <p className="text-sm font-black text-white">{progress ? `${progress.current} / ${progress.target} ${progress.unit}` : '—'}</p>
                                </div>
                                <button
                                  onClick={() => handlePromoteStudent(student, nextBelt, nextStripes)}
                                  disabled={isPromoting}
                                  className="bg-amber-500 hover:bg-amber-400 text-slate-900 dark:text-white px-4 md:px-6 py-2.5 rounded-xl font-black text-[10px] md:text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all text-center disabled:opacity-60"
                                >
                                  {isPromoting ? <Loader2 size={14} className="animate-spin" /> : 'Promover'}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      });
                    })()}

                    {students.filter(s => {
                      const { readyForBelt, readyForStripe } = isReadyForGraduationByBeltRank(s, getBeltConfig(s));
                      return readyForBelt || readyForStripe;
                    }).length === 0 && (
                      <div className="col-span-full py-20 text-center text-slate-500">
                        <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                          <Check size={32} />
                        </div>
                        <p className="font-bold">Todos os alunos estão em dia!</p>
                        <p className="text-xs mt-1">Nenhum aluno atingiu os critérios mínimos para promoção hoje.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* QUASE LÁ (aviso antecipado) */}
                {(() => {
                  const close = students.filter(s => isCloseToGraduationByBeltRank(s, getBeltConfig(s)));
                  if (!close.length) return null;
                  return (
                    <div>
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" /> Quase Lá
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {close.map(student => {
                          const progress = getGraduationProgressByBeltRank(student, getBeltConfig(student));
                          return (
                            <div key={student.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                              <BeltBadge belt={student.belt} stripes={student.stripes} colorKey={getBeltConfig(student)?.colorKey} showText={false} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{student.name}</p>
                                {progress && (
                                  <p className="text-[10px] font-black text-amber-400">{progress.current} / {progress.target} {progress.unit}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* HISTÓRICO RECENTE */}
                <div className="pb-20">
                  <h3 className="text-sm font-black text-white uppercase italic tracking-widest mb-6 flex items-center gap-2">
                    <Activity size={16} className="text-emerald-500" /> Últimas Promoções (Academia)
                  </h3>

                  <div className="space-y-3">
                    {students
                      .filter(s => s.graduationHistory && s.graduationHistory.length > 0)
                      .flatMap(s => (s.graduationHistory || []).map(h => ({ ...h, studentName: s.name, studentId: s.id })))
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 10)
                      .map(history => (
                        <div key={history.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                              <Check size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{history.studentName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                  {history.previousBelt} ({history.previousStripes}º)
                                </span>
                                <ChevronRight size={10} className="text-slate-600 dark:text-slate-300" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                  {history.newBelt} ({history.newStripes}º)
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-medium text-slate-500">{fmtDate(history.date)}</p>
                          </div>
                        </div>
                      ))}

                    {students.every(s => !s.graduationHistory || s.graduationHistory.length === 0) && (
                      <p className="text-center py-10 text-slate-600 dark:text-slate-300 text-sm italic">Nenhum histórico de graduação registrado recentemente.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/10 bg-slate-950 shrink-0">
               <button
                onClick={() => setIsGraduationCenterOpen(false)}
                className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all active:scale-[0.98] uppercase tracking-widest shadow-xl"
               >
                 Sair da Central
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentsView;
