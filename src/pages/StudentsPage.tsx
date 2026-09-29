/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProfileStore, hasStudentsAccess } from '@/stores/profileStore';
import StudentsView from '../../views/StudentsView';

const StudentsPage: React.FC = () => {
  const { user, academy } = useAuthStore();
  const { profiles, profilesLoaded } = useProfileStore();
  if (!user || !academy) return null;

  // Admin, superusuário e colaborador entram pelo role, checado no RoleGuard da rota. Para o
  // instrutor há a permissão individual da ficha (instructors.can_view_students), que chega em
  // GET /auth/profiles — e é por isso que a decisão mora aqui e não no RoleGuard: enquanto a
  // resposta não voltou, a lista de perfis está vazia e redirecionar expulsaria justamente quem
  // TEM a permissão. Sem perfis carregados, espera; com eles, decide.
  if (user.role === 'instructor') {
    if (!profilesLoaded) return null;
    if (!hasStudentsAccess(user.role, profiles)) return <Navigate to="/" replace />;
  }

  return <StudentsView user={user as any} academy={academy as any} />;
};

export default StudentsPage;
