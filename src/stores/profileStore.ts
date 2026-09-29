import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/types';

interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string | null;
  // Fica false entre o login e a resposta de GET /auth/profiles. Necessário para telas como
  // DashboardPage não decidirem um redirect (ex.: responsável puro -> /profile) usando uma
  // lista de perfis ainda vazia por não ter carregado — isso mandava a conta pro lugar errado
  // antes mesmo do perfil do dependente chegar da API.
  profilesLoaded: boolean;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfileId: (id: string | null) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profiles: [],
      activeProfileId: null,
      profilesLoaded: false,
      setProfiles: (profiles) => set({ profiles, profilesLoaded: true }),
      setActiveProfileId: (id) => set({ activeProfileId: id }),
      reset: () => set({ profiles: [], activeProfileId: null, profilesLoaded: false }),
    }),
    { name: 'nexdojo-profile' },
  ),
);

// Perfil próprio (self) é o padrão; se a conta não tiver ficha própria (responsável "puro"),
// cai no primeiro perfil disponível (o único filho vinculado, ou o primeiro de vários).
export function getActiveProfile(profiles: Profile[], activeProfileId: string | null): Profile | null {
  if (!profiles.length) return null;
  const selected = activeProfileId ? profiles.find((p) => p.entityId === activeProfileId) : undefined;
  if (selected) return selected;
  return profiles.find((p) => p.kind === 'self') ?? profiles[0];
}

// Roles "efetivos" para checagem de acesso a rotas/menus: o role da conta logada, mais o
// entityType do dependente selecionado no "Alternar Perfil" (quando gerenciando um dependente).
// Isso garante que uma conta com role diferente de 'student'/'guardian' (ex.: instructor que
// também é responsável por um filho) enxergue as telas do dependente ao trocar de perfil.
export function getEffectiveRoles(userRole: string, activeProfile: Profile | null): string[] {
  if (activeProfile?.kind === 'guardian') return [userRole, activeProfile.entityType];
  return [userRole];
}

// Acesso à tela de Alunos. Para admin, superusuário e colaborador a regra continua sendo só o
// role. Para instrutor existe uma segunda chave, marcada individualmente na ficha dele
// (instructors.can_view_students): sem ela o item some do menu e a rota redireciona.
//
// A marca chega junto do perfil próprio em GET /auth/profiles — o mesmo payload que o AppLayout
// já rebusca ao voltar o foco. Por isso dar ou tirar a permissão reflete na sessão aberta do
// instrutor sem exigir novo login, e não dá para guardá-la no objeto `user` do authStore, que é
// congelado no login e nunca mais revalidado.
export function hasStudentsAccess(userRole: string, profiles: Profile[]): boolean {
  if (['superuser', 'admin', 'staff'].includes(userRole)) return true;
  if (userRole !== 'instructor') return false;
  return profiles.some(
    (p) => p.kind === 'self' && p.entityType === 'instructor' && p.canViewStudents === true,
  );
}
