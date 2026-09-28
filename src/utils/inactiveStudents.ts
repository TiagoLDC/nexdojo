import type { Student } from '@/types';

/**
 * Alunos "inativados": quem saiu da lista de ativos, seja por inativação manual na ficha
 * (`Inactive`) ou por evasão (`Dropped`). `Pending` fica de fora — é cadastro que ainda não
 * começou a treinar, não alguém a reconquistar.
 */
export const INACTIVE_STATUSES = ['Inactive', 'Dropped'] as const;

export interface InactiveStudentEntry {
  student: Student;
  /** Dias desde a última presença registrada; `null` quando o aluno nunca treinou. */
  daysSinceLastAttendance: number | null;
}

export const isInactiveStudent = (s: Student) =>
  (INACTIVE_STATUSES as readonly string[]).includes(s.status);

/**
 * Lista os alunos inativados ordenada pelo afastamento mais recente primeiro — quem parou de
 * treinar há pouco é quem tem mais chance de voltar. Quem nunca registrou presença vai ao fim.
 */
export function getInactiveStudents(students: Student[]): InactiveStudentEntry[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return students
    .filter(isInactiveStudent)
    .map(student => {
      let daysSinceLastAttendance: number | null = null;
      if (student.lastAttendance) {
        const last = new Date(student.lastAttendance.slice(0, 10) + 'T12:00:00');
        last.setHours(0, 0, 0, 0);
        daysSinceLastAttendance = Math.round((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
      }
      return { student, daysSinceLastAttendance };
    })
    .sort((a, b) => {
      if (a.daysSinceLastAttendance === null) return b.daysSinceLastAttendance === null ? 0 : 1;
      if (b.daysSinceLastAttendance === null) return -1;
      return a.daysSinceLastAttendance - b.daysSinceLastAttendance;
    });
}

/**
 * Mensagem de reengajamento ("O Caminho do Samurai"), definida pela academia. O nome entra nos
 * três pontos em que o texto original trazia o placeholder da academia.
 */
export function buildReturnMessage(academyName: string): string {
  const academia = academyName?.trim() || 'nossa academia';
  return `🥋⚔️ ${academia} ⚔️🥋

🥷 O CAMINHO DO SAMURAI – O RETORNO DO GUERREIRO 🥷

Guerreiro não é aquele que nunca cai. É aquele que sempre encontra forças para se levantar!

Assim como um samurai, cada praticante de Jiu Jitsu carrega dentro de si a força da disciplina, a honra de suas atitudes e a determinação de nunca desistir.

🔥 É HORA DE VOLTAR AOS TREINOS! 🔥

O tatame está esperando por você!

Seja você um guerreiro ou uma guerreira, cada treino é uma oportunidade de evoluir, superar seus limites e fortalecer não apenas o corpo, mas também a mente e o caráter.

⚔️ O verdadeiro samurai não busca apenas vencer uma luta. Ele busca vencer a si mesmo todos os dias.

Não importa se você está começando ou retornando. O importante é dar o primeiro passo, vestir o kimono e continuar sua jornada.

🥋 DISCIPLINA • HONRA • LEALDADE • CARÁTER • FOCO • DETERMINAÇÃO

Na ${academia}, formamos guerreiros e guerreiras preparados para os desafios do tatame e da vida.

O caminho é árduo. A evolução é diária. A honra é para sempre!

🔥 Volte aos treinos. Retome seus objetivos. Reacenda o espírito guerreiro que existe em você!

${academia}

O caminho do guerreiro começa com um passo.

OSS! 🥋⚔️`;
}

/**
 * Link do WhatsApp com a mensagem de retorno já preenchida. Usa o telefone do aluno e, na
 * falta dele, o do responsável — mesma ordem do relatório de mensalidades. Sem nenhum dos
 * dois não há para onde enviar, e o botão não deve ser renderizado.
 */
export function getReturnWhatsappUrl(student: Student, academyName: string): string | null {
  const contactPhone = student.phone || student.guardianPhone;
  if (!contactPhone) return null;
  return `https://wa.me/55${contactPhone.replace(/\D/g, '')}?text=${encodeURIComponent(buildReturnMessage(academyName))}`;
}
