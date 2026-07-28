import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '@/types';

interface ProfileStore {
  profiles: Profile[];
  activeProfileId: string | null;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfileId: (id: string | null) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set) => ({
      profiles: [],
      activeProfileId: null,
      setProfiles: (profiles) => set({ profiles }),
      setActiveProfileId: (id) => set({ activeProfileId: id }),
      reset: () => set({ profiles: [], activeProfileId: null }),
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
