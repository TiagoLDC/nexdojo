/**
 * Migração pontual do legado "GUERREIROS ICP" (Firebase/planilhas exportadas) para o banco
 * relacional do NexDojo, na academia acad_2dyvabe88.
 *
 * Fontes (já convertidas de CSV para JSON em LEGADO GUERREIROS/_parsed/ por conveniência de parsing):
 *   users.json        -> contas de login legadas (role, email, status)
 *   students.json     -> fichas de alunos (perfil rico: faixa, cpf, responsável em texto livre, etc.)
 *   instructors.json  -> fichas de instrutores
 *   staff.json        -> fichas de colaboradores (staff)
 *   guardians.json    -> fichas de responsáveis (sem tabela própria no schema atual — vira
 *                        users(role='guardian') + guardianships, com dados extras em profile_data)
 *
 * Decisões confirmadas com o usuário antes de rodar:
 *   1) Senha: aleatória seguraleatória + requires_password_change=1 (pessoa usa "esqueci minha senha").
 *   2) 5 pessoas já cadastradas manualmente nesta academia (piloto prévio) -> mantidas, apenas
 *      completando campos vazios com dados do legado (nunca sobrescrevendo o que já existe).
 *   3) 3 pessoas cujo e-mail já pertence a uma conta de OUTRA academia (contato@tnadigital.com.br,
 *      thi_machado88@hotmail.com, athos_henriques@hotmail.com) -> puladas completamente (nem ficha,
 *      nem login), incluindo qualquer ficha própria delas (staff/instrutor/aluno). Filhos delas que
 *      tenham ficha própria de aluno continuam sendo criados normalmente, só sem o vínculo formal de
 *      responsável (guardianship) — o contato do responsável fica salvo nos campos de texto livre
 *      guardian_name/guardian_phone/guardian_email etc. do próprio aluno.
 *
 * Uso:
 *   npx ts-node --transpile-only src/scripts/migrate_legado_guerreiros.ts --dry-run   (simula, não escreve)
 *   npx ts-node --transpile-only src/scripts/migrate_legado_guerreiros.ts             (executa de verdade)
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { PoolConnection } from 'mysql2/promise';
import pool from '../db';
import { withTransaction } from '../utils/withTransaction';

const ACADEMY_ID = 'acad_2dyvabe88';
const LEGACY_DIR = path.resolve(__dirname, '../../../LEGADO GUERREIROS/_parsed');
const SKIP_EMAILS = new Set(['contato@tnadigital.com.br', 'thi_machado88@hotmail.com', 'athos_henriques@hotmail.com']);
const ROLE_PRIORITY = ['admin', 'instructor', 'staff', 'student', 'guardian'];
const DRY_RUN = process.argv.includes('--dry-run');

// Ficha de aluno já existente no piloto cujo e-mail de login não bate com o e-mail da própria ficha
// (login usa o e-mail da mãe "aluno@email.com" de teste) — mapeada manualmente por _id do legado.
const MANUAL_STUDENT_ID_MAP: Record<string, string> = {
  's_g_mo31usnz': '1dc103c1-3ffd-47d7-9608-5a5d944b1ee6', // Esther Félix dos Santos
};

const BELT_VALUES = new Set([
  'Branca', 'Cinza e Branca', 'Cinza', 'Cinza e Preta',
  'Amarela e Branca', 'Amarela', 'Amarela e Preta',
  'Laranja e Branca', 'Laranja', 'Laranja e Preta',
  'Verde e Branca', 'Verde', 'Verde e Preta',
  'Azul', 'Roxa', 'Marrom', 'Preta', 'Coral', 'Vermelha',
]);
const ENTITY_STATUS_VALUES = new Set(['Active', 'Inactive', 'Dropped', 'Pending']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const norm = (v?: string | null) => (v ?? '').trim();
const nn = (v?: string | null): string | null => { const s = norm(v); return s || null; };
const normEmail = (v?: string | null): string | null => { const s = norm(v).toLowerCase(); return s || null; };
const normName = (n?: string) => norm(n).replace(/\s+/g, ' ').toLowerCase();
/** Casamento de nome tolerante (um contém o outro) — usado para não confundir pessoas diferentes
 * que por acaso compartilham e-mail (ex.: filhos usando o e-mail do pai como contato). */
const nameMatches = (a?: string, b?: string): boolean => {
  const na = normName(a); const nb = normName(b);
  return !!na && !!nb && (na === nb || na.includes(nb) || nb.includes(na));
};
const onlyDate = (v?: string | null): string | null => { const s = norm(v); return s ? s.split('T')[0] : null; };
const toInt = (v?: string | null): number => { const n = parseInt(norm(v), 10); return Number.isFinite(n) ? n : 0; };
const mapGender = (g?: string | null): 'Masculino' | 'Feminino' | null =>
  g === 'M' ? 'Masculino' : g === 'F' ? 'Feminino' : null;
const mapUserStatus = (s?: string | null): 'Active' | 'Blocked' => (s === 'Blocked' ? 'Blocked' : 'Active');
const mapEntityStatus = (s?: string | null): string => (ENTITY_STATUS_VALUES.has(norm(s)) ? norm(s) : 'Active');
const mapBelt = (b?: string | null, fallback = 'Branca'): string => (b && BELT_VALUES.has(b) ? b : fallback);

function load<T = any>(fn: string): T[] {
  return JSON.parse(fs.readFileSync(path.join(LEGACY_DIR, fn), 'utf-8'));
}
function randomPassword(): string {
  return crypto.randomBytes(24).toString('base64url');
}
function parseDocs(raw?: string | null): Array<{ name: string; url: string }> {
  const s = norm(raw);
  if (!s || s === '[]') return [];
  try {
    const arr = JSON.parse(s);
    if (!Array.isArray(arr)) return [];
    return arr
      .map((d: any) => ({ name: norm(d?.name) || 'documento', url: norm(d?.base64) }))
      .filter(d => d.url);
  } catch {
    return [];
  }
}

/** Preenche apenas as colunas que estão vazias/nulas no registro existente. Não sobrescreve nada preenchido. */
async function fillEmptyFields(
  conn: PoolConnection,
  table: 'students' | 'instructors' | 'staff',
  id: string,
  candidate: Record<string, any>
): Promise<string[]> {
  const [rows]: any = await conn.execute(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  const existing = rows[0];
  if (!existing) return [];
  const filled: string[] = [];
  const sets: string[] = [];
  const values: any[] = [];
  for (const [col, val] of Object.entries(candidate)) {
    if (val === null || val === undefined || val === '') continue;
    const cur = existing[col];
    const isEmpty = cur === null || cur === undefined || cur === '';
    if (isEmpty) {
      sets.push(`${col} = ?`);
      values.push(val);
      filled.push(col);
    }
  }
  if (!sets.length) return [];
  values.push(id);
  if (!DRY_RUN) await conn.execute(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, values);
  return filled;
}

// ---------------------------------------------------------------------------
// Relatório
// ---------------------------------------------------------------------------
const report = {
  usersCreated: [] as { email: string; role: string }[],
  usersSkippedManual: [] as string[],
  usersSkippedConflict: [] as { email: string; academyId: string }[],
  usersExisting: [] as { email: string; role: string }[],

  studentsCreated: [] as string[],
  studentsMerged: [] as { name: string; fields: string[] }[],
  studentsSkippedDuplicate: [] as string[],
  studentsEmailNulled: [] as { name: string; email: string }[],

  instructorsCreated: [] as string[],
  instructorsMerged: [] as { name: string; fields: string[] }[],

  staffCreated: [] as string[],
  staffMerged: [] as { name: string; fields: string[] }[],

  studentDocuments: 0,
  instructorDocuments: 0,

  guardianshipsCreated: 0,
  guardianshipsSkippedNoAccount: 0,
  guardianshipsSkippedOrphanStudent: 0,
  guardianshipsSkippedDup: 0,
};

// ---------------------------------------------------------------------------
async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — nenhuma escrita será feita ===\n' : '=== EXECUÇÃO REAL ===\n');

  const legacyUsers = load('users.json');
  const legacyStudents = load('students.json');
  const legacyInstructors = load('instructors.json');
  const legacyStaff = load('staff.json');
  const legacyGuardians = load('guardians.json');

  // ---- 1. Resolver, por e-mail, o papel primário (prioridade admin > instructor > staff > student > guardian) ----
  const emailRoles = new Map<string, Set<string>>();
  for (const u of legacyUsers) {
    const email = normEmail(u.email);
    if (!email) continue;
    if (!emailRoles.has(email)) emailRoles.set(email, new Set());
    emailRoles.get(email)!.add(u.role);
  }
  const primaryRole = (email: string): string => {
    const roles = emailRoles.get(email);
    if (!roles || !roles.size) return 'guardian';
    for (const r of ROLE_PRIORITY) if (roles.has(r)) return r;
    return Array.from(roles)[0];
  };

  const legacyUserByEmail = new Map<string, any>();
  for (const u of legacyUsers) {
    const email = normEmail(u.email);
    if (!email) continue;
    const cur = legacyUserByEmail.get(email);
    if (!cur || u.role === primaryRole(email)) legacyUserByEmail.set(email, u);
  }
  const legacyIdToEmail = new Map<string, string>();
  for (const u of legacyUsers) if (u.email) legacyIdToEmail.set(u._id, normEmail(u.email)!);

  // ---- 2. Estado atual do banco ----
  const [existingAcademyUsers]: any = await pool.execute(
    'SELECT id, role, name, email, status FROM users WHERE academy_id = ?', [ACADEMY_ID]
  );
  const existingUserByEmail = new Map<string, any>();
  existingAcademyUsers.forEach((r: any) => existingUserByEmail.set(normEmail(r.email)!, r));

  const allEmails = Array.from(legacyUserByEmail.keys());
  const [globalRows]: any = allEmails.length
    ? await pool.execute(
        `SELECT id, academy_id, role, name, email FROM users WHERE LOWER(email) IN (${allEmails.map(() => '?').join(',')})`,
        allEmails
      )
    : [[]];
  const globalUserByEmail = new Map<string, any>();
  globalRows.forEach((r: any) => globalUserByEmail.set(normEmail(r.email)!, r));

  type Action = 'create' | 'existing' | 'skip_manual' | 'skip_conflict';
  const resolution = new Map<string, { action: Action; userId: string | null; role: string; name: string }>();

  for (const email of allEmails) {
    const role = primaryRole(email);
    const legacyRow = legacyUserByEmail.get(email);
    const name = norm(legacyRow?.name) || email;

    if (SKIP_EMAILS.has(email)) {
      resolution.set(email, { action: 'skip_manual', userId: null, role, name });
      report.usersSkippedManual.push(email);
      continue;
    }
    const existing = existingUserByEmail.get(email);
    if (existing) {
      resolution.set(email, { action: 'existing', userId: existing.id, role: existing.role, name: existing.name });
      report.usersExisting.push({ email, role: existing.role });
      continue;
    }
    const other = globalUserByEmail.get(email);
    if (other) {
      resolution.set(email, { action: 'skip_conflict', userId: null, role, name });
      report.usersSkippedConflict.push({ email, academyId: other.academy_id });
      continue;
    }
    resolution.set(email, { action: 'create', userId: null, role, name });
  }

  const getUserIdForEmail = (email: string | null): string | null => {
    if (!email) return null;
    const r = resolution.get(email);
    if (!r) return null;
    if (r.action === 'skip_manual' || r.action === 'skip_conflict') return null;
    return r.userId;
  };
  const getUserIdForLegacyId = (legacyId?: string | null): string | null => {
    if (!legacyId) return null;
    const email = legacyIdToEmail.get(legacyId);
    return email ? getUserIdForEmail(email) : null;
  };

  // ---------------------------------------------------------------------------
  await withTransaction(async (conn) => {
    // =========================================================================
    // ETAPA 1 — criar contas de login novas
    // =========================================================================
    for (const [email, r] of resolution) {
      if (r.action !== 'create') continue;
      const legacyRow = legacyUserByEmail.get(email);
      const userId = crypto.randomUUID();
      r.userId = userId; // backfill para as etapas seguintes (vínculo user_id / guardianships)

      const status = mapUserStatus(legacyRow?.status);
      const passwordHash = await bcrypt.hash(randomPassword(), 10);

      // Dados extras de responsável (cpf/rg/telefone/profissão) preservados em profile_data,
      // mesmo quando o papel primário da pessoa não é 'guardian' (ex.: aluno adulto que também é responsável).
      const g = legacyGuardians.find((gg: any) => normEmail(gg.email) === email);
      let profileData: Record<string, any> | null = null;
      if (g) {
        profileData = {};
        if (nn(g.phone)) profileData.phone = nn(g.phone);
        if (nn(g.cpf)) profileData.cpf = nn(g.cpf);
        if (nn(g.rg)) profileData.rg = nn(g.rg);
        if (nn(g.profession)) profileData.profession = nn(g.profession);
      }

      report.usersCreated.push({ email, role: r.role });
      if (!DRY_RUN) {
        await conn.execute(
          `INSERT INTO users (id, academy_id, role, name, email, password_hash, status, requires_password_change, profile_data)
           VALUES (?,?,?,?,?,?,?,1,?)`,
          [userId, ACADEMY_ID, r.role, r.name, email, passwordHash, status, profileData ? JSON.stringify(profileData) : null]
        );
      }
    }

    // =========================================================================
    // ETAPA 2 — alunos (students)
    // =========================================================================
    const [existingStudentRows]: any = await conn.execute(
      'SELECT id, email, name FROM students WHERE academy_id = ?', [ACADEMY_ID]
    );
    const existingStudentByEmail = new Map<string, any>();
    existingStudentRows.forEach((r: any) => { if (r.email) existingStudentByEmail.set(normEmail(r.email)!, r); });

    const claimedStudentEmails = new Set<string>(
      existingStudentRows.filter((r: any) => r.email).map((r: any) => normEmail(r.email)!)
    );
    const seenNameEmail = new Set<string>();
    const legacyStudentIdToTargetId = new Map<string, string>();

    for (const s of legacyStudents) {
      const name = norm(s.name);
      const ownEmailRaw = normEmail(s.email);

      // Pessoa excluída manualmente (ficha própria, e-mail conflitante com outra academia)
      if (ownEmailRaw && SKIP_EMAILS.has(ownEmailRaw)) {
        report.studentsSkippedDuplicate.push(`${name} <${ownEmailRaw}> (excluído manualmente)`);
        continue;
      }

      // Registro já existente manualmente (piloto) — mapeado por _id, ou por e-mail + nome batendo
      // (e-mail sozinho não basta: irmãos podem compartilhar o e-mail do responsável como contato)
      const manualTargetId = MANUAL_STUDENT_ID_MAP[s.id];
      const emailMatch = ownEmailRaw ? existingStudentByEmail.get(ownEmailRaw) : null;
      const matchedExisting = manualTargetId
        ? { id: manualTargetId }
        : (emailMatch && nameMatches(name, emailMatch.name) ? emailMatch : null);

      if (matchedExisting) {
        legacyStudentIdToTargetId.set(s.id, matchedExisting.id);
        const candidate = {
          phone: nn(s.phone), belt: mapBelt(s.belt), stripes: toInt(s.stripes) || null,
          birth_date: onlyDate(s.birthDate), gender: mapGender(s.gender), photo: nn(s.photo),
          cpf: nn(s.cpf), rg: nn(s.rg),
          guardian_name: nn(s.guardianName), guardian_phone: nn(s.guardianPhone), guardian_email: nn(s.guardianEmail),
          guardian_cpf: nn(s.guardianCpf), guardian_rg: nn(s.guardianRg),
          guardian_relation: nn(s.guardianRelation), guardian_profession: nn(s.guardianProfession),
          medical_notes: nn(s.medicalNotes), address: nn(s.address),
          join_date: onlyDate(s.joinDate), last_graduation_date: onlyDate(s.lastGraduationDate),
        };
        const filled = await fillEmptyFields(conn, 'students', matchedExisting.id, candidate);
        if (filled.length) report.studentsMerged.push({ name, fields: filled });
        continue;
      }

      // Deduplicar linhas idênticas do próprio legado (mesmo nome + mesmo e-mail)
      if (ownEmailRaw) {
        const key = `${normName(name)}|${ownEmailRaw}`;
        if (seenNameEmail.has(key)) {
          report.studentsSkippedDuplicate.push(`${name} <${ownEmailRaw}> (linha duplicada no legado)`);
          continue;
        }
        seenNameEmail.add(key);
      }

      // E-mail próprio só é mantido se for realmente exclusivo dessa pessoa (não herdado do responsável
      // e ainda não reivindicado por outro irmão/pessoa nesta importação ou já existente no banco)
      const guardianEmail = normEmail(s.guardianEmail);
      let finalEmail = ownEmailRaw;
      if (finalEmail) {
        const sharedWithGuardian = !!guardianEmail && finalEmail === guardianEmail;
        const alreadyClaimed = claimedStudentEmails.has(finalEmail);
        if (sharedWithGuardian || alreadyClaimed) {
          report.studentsEmailNulled.push({ name, email: finalEmail });
          finalEmail = null;
        } else {
          claimedStudentEmails.add(finalEmail);
        }
      }

      const studentId = crypto.randomUUID();
      legacyStudentIdToTargetId.set(s.id, studentId);
      const userId = finalEmail ? getUserIdForEmail(ownEmailRaw) : null;

      report.studentsCreated.push(name);
      if (!DRY_RUN) {
        await conn.execute(
          `INSERT INTO students (
            id, academy_id, user_id, name, email, phone, belt, stripes, birth_date, gender, photo,
            cpf, rg, address, guardian_name, guardian_phone, guardian_email,
            guardian_cpf, guardian_rg, guardian_relation, guardian_profession,
            medical_notes, total_classes, total_hours, last_attendance, absent_count,
            status, join_date, last_graduation_date
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            studentId, ACADEMY_ID, userId, name, finalEmail, nn(s.phone), mapBelt(s.belt), toInt(s.stripes),
            onlyDate(s.birthDate), mapGender(s.gender), nn(s.photo),
            nn(s.cpf), nn(s.rg), nn(s.address),
            nn(s.guardianName), nn(s.guardianPhone), nn(s.guardianEmail),
            nn(s.guardianCpf), nn(s.guardianRg), nn(s.guardianRelation), nn(s.guardianProfession),
            nn(s.medicalNotes), toInt(s.totalClasses), toInt(s.totalHours),
            onlyDate(s.lastAttendance), toInt(s.absentCount),
            mapEntityStatus(s.status), onlyDate(s.joinDate), onlyDate(s.lastGraduationDate),
          ]
        );
        const docs = parseDocs(s.documents);
        for (const d of docs) {
          await conn.execute(
            'INSERT INTO student_documents (id, student_id, name, url) VALUES (?,?,?,?)',
            [crypto.randomUUID(), studentId, d.name, d.url]
          );
          report.studentDocuments++;
        }
      } else {
        report.studentDocuments += parseDocs(s.documents).length;
      }
    }

    // =========================================================================
    // ETAPA 3 — instrutores
    // =========================================================================
    const [existingInstructorRows]: any = await conn.execute(
      'SELECT id, email, name FROM instructors WHERE academy_id = ?', [ACADEMY_ID]
    );
    const existingInstructorByEmail = new Map<string, any>();
    existingInstructorRows.forEach((r: any) => { if (r.email) existingInstructorByEmail.set(normEmail(r.email)!, r); });

    for (const i of legacyInstructors) {
      const name = norm(i.name);
      const email = normEmail(i.email);
      if (email && SKIP_EMAILS.has(email)) {
        report.studentsSkippedDuplicate.push(`${name} <${email}> (instrutor excluído manualmente)`);
        continue;
      }

      const emailMatchI = email ? existingInstructorByEmail.get(email) : null;
      const existing = emailMatchI && nameMatches(name, emailMatchI.name) ? emailMatchI : null;
      const candidate = {
        phone: nn(i.phone), belt: mapBelt(i.belt, 'Preta'), stripes: toInt(i.stripes) || null,
        birth_date: onlyDate(i.birthDate), gender: mapGender(i.gender), photo: nn(i.photo),
        cpf: nn(i.cpf), rg: nn(i.rg), marital_status: nn(i.maritalStatus),
        address: nn(i.address), specialties: nn(i.specialties), medical_notes: nn(i.medicalNotes),
        join_date: onlyDate(i.joinDate), last_graduation_date: onlyDate(i.lastGraduationDate),
      };

      if (existing) {
        const filled = await fillEmptyFields(conn, 'instructors', existing.id, candidate);
        if (filled.length) report.instructorsMerged.push({ name, fields: filled });
        continue;
      }

      const instructorId = crypto.randomUUID();
      const userId = getUserIdForEmail(email);
      report.instructorsCreated.push(name);
      if (!DRY_RUN) {
        await conn.execute(
          `INSERT INTO instructors (
            id, academy_id, user_id, name, email, phone, belt, stripes, birth_date, gender, photo,
            cpf, rg, marital_status, address, specialties, medical_notes,
            status, join_date, last_graduation_date
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            instructorId, ACADEMY_ID, userId, name, email, nn(i.phone), mapBelt(i.belt, 'Preta'), toInt(i.stripes),
            onlyDate(i.birthDate), mapGender(i.gender), nn(i.photo),
            nn(i.cpf), nn(i.rg), nn(i.maritalStatus), nn(i.address), nn(i.specialties), nn(i.medicalNotes),
            mapEntityStatus(i.status), onlyDate(i.joinDate), onlyDate(i.lastGraduationDate),
          ]
        );
        const docs = parseDocs(i.documents);
        for (const d of docs) {
          await conn.execute(
            'INSERT INTO instructor_documents (id, instructor_id, name, url) VALUES (?,?,?,?)',
            [crypto.randomUUID(), instructorId, d.name, d.url]
          );
          report.instructorDocuments++;
        }
      } else {
        report.instructorDocuments += parseDocs(i.documents).length;
      }
    }

    // =========================================================================
    // ETAPA 4 — staff
    // =========================================================================
    const [existingStaffRows]: any = await conn.execute(
      'SELECT id, email, name FROM staff WHERE academy_id = ?', [ACADEMY_ID]
    );
    const existingStaffByEmail = new Map<string, any>();
    existingStaffRows.forEach((r: any) => { if (r.email) existingStaffByEmail.set(normEmail(r.email)!, r); });

    for (const st of legacyStaff) {
      const name = norm(st.name);
      const email = normEmail(st.email);
      if (email && SKIP_EMAILS.has(email)) {
        report.studentsSkippedDuplicate.push(`${name} <${email}> (staff excluído manualmente)`);
        continue;
      }

      const emailMatchS = email ? existingStaffByEmail.get(email) : null;
      const existing = emailMatchS && nameMatches(name, emailMatchS.name) ? emailMatchS : null;
      const candidate = {
        position: nn(st.position), gender: mapGender(st.gender), birth_date: onlyDate(st.birthDate),
        cpf: nn(st.cpf), rg: nn(st.rg), address: nn(st.address), join_date: onlyDate(st.joinDate),
      };

      if (existing) {
        const filled = await fillEmptyFields(conn, 'staff', existing.id, candidate);
        if (filled.length) report.staffMerged.push({ name, fields: filled });
        continue;
      }

      const staffId = crypto.randomUUID();
      const userId = getUserIdForEmail(email);
      report.staffCreated.push(name);
      if (!DRY_RUN) {
        await conn.execute(
          `INSERT INTO staff (id, academy_id, user_id, name, email, position, gender, birth_date, cpf, rg, address, status, join_date)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            staffId, ACADEMY_ID, userId, name, email, nn(st.position), mapGender(st.gender),
            onlyDate(st.birthDate), nn(st.cpf), nn(st.rg), nn(st.address),
            mapEntityStatus(st.status), onlyDate(st.joinDate),
          ]
        );
      }
    }

    // =========================================================================
    // ETAPA 5 — guardianships (vínculo responsável -> aluno)
    // =========================================================================
    const pairs = new Set<string>();
    const pairList: { guardianUserId: string; studentId: string; relation: string | null }[] = [];

    const addPair = (guardianUserId: string | null, legacyStudentId: string, relation: string | null) => {
      if (!guardianUserId) { report.guardianshipsSkippedNoAccount++; return; }
      const targetStudentId = legacyStudentIdToTargetId.get(legacyStudentId);
      if (!targetStudentId) { report.guardianshipsSkippedOrphanStudent++; return; }
      const key = `${guardianUserId}|${targetStudentId}`;
      if (pairs.has(key)) return;
      pairs.add(key);
      pairList.push({ guardianUserId, studentId: targetStudentId, relation });
    };

    // Direção 1: cada aluno.guardianUserId
    for (const s of legacyStudents) {
      if (!s.guardianUserId) continue;
      const guardianUserId = getUserIdForLegacyId(s.guardianUserId);
      addPair(guardianUserId, s.id, nn(s.guardianRelation));
    }
    // Direção 2: cada responsável.linkedStudentIds (cobre casos sem guardianUserId no aluno)
    for (const g of legacyGuardians) {
      if (!g.guardianUserId) continue;
      const guardianUserId = getUserIdForLegacyId(g.guardianUserId);
      let linked: string[] = [];
      try { linked = JSON.parse(g.linkedStudentIds || '[]'); } catch { linked = []; }
      for (const legacyStudentId of linked) {
        const student = legacyStudents.find((s: any) => s.id === legacyStudentId);
        addPair(guardianUserId, legacyStudentId, student ? nn(student.guardianRelation) : null);
      }
    }

    for (const p of pairList) {
      report.guardianshipsCreated++;
      if (DRY_RUN) continue;
      try {
        await conn.execute(
          'INSERT INTO guardianships (id, guardian_user_id, student_id, relation) VALUES (?,?,?,?)',
          [crypto.randomUUID(), p.guardianUserId, p.studentId, p.relation]
        );
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') { report.guardianshipsCreated--; report.guardianshipsSkippedDup++; continue; }
        throw err;
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Relatório final
  // ---------------------------------------------------------------------------
  console.log('\n================ RELATÓRIO ================\n');
  console.log(`Contas de login criadas: ${report.usersCreated.length}`);
  report.usersCreated.forEach(u => console.log(`   + ${u.email}  [${u.role}]`));
  console.log(`\nContas já existentes (reaproveitadas, não alteradas): ${report.usersExisting.length}`);
  report.usersExisting.forEach(u => console.log(`   = ${u.email}  [${u.role}]`));
  console.log(`\nContas puladas manualmente (conflito de outra academia / exclusão pedida): ${report.usersSkippedManual.length + report.usersSkippedConflict.length}`);
  report.usersSkippedManual.forEach(e => console.log(`   - ${e} (exclusão manual)`));
  report.usersSkippedConflict.forEach(c => console.log(`   - ${c.email} (já usado em ${c.academyId})`));

  console.log(`\nAlunos criados: ${report.studentsCreated.length}`);
  console.log(`Alunos mesclados (piloto existente, campos completados): ${report.studentsMerged.length}`);
  report.studentsMerged.forEach(m => console.log(`   ~ ${m.name}: ${m.fields.join(', ')}`));
  console.log(`Alunos pulados (duplicata legado / exclusão manual): ${report.studentsSkippedDuplicate.length}`);
  report.studentsSkippedDuplicate.forEach(s => console.log(`   - ${s}`));
  console.log(`E-mails de aluno zerados por conflito (herdado do responsável ou já usado por outro): ${report.studentsEmailNulled.length}`);
  report.studentsEmailNulled.forEach(s => console.log(`   ~ ${s.name} <${s.email}>`));
  console.log(`Documentos de aluno migrados: ${report.studentDocuments}`);

  console.log(`\nInstrutores criados: ${report.instructorsCreated.length} (${report.instructorsCreated.join(', ')})`);
  console.log(`Instrutores mesclados: ${report.instructorsMerged.length}`);
  report.instructorsMerged.forEach(m => console.log(`   ~ ${m.name}: ${m.fields.join(', ')}`));
  console.log(`Documentos de instrutor migrados: ${report.instructorDocuments}`);

  console.log(`\nStaff criados: ${report.staffCreated.length} (${report.staffCreated.join(', ')})`);
  console.log(`Staff mesclados: ${report.staffMerged.length}`);
  report.staffMerged.forEach(m => console.log(`   ~ ${m.name}: ${m.fields.join(', ')}`));

  console.log(`\nVínculos de responsável (guardianships) criados: ${report.guardianshipsCreated}`);
  console.log(`Vínculos pulados (responsável sem conta válida): ${report.guardianshipsSkippedNoAccount}`);
  console.log(`Vínculos pulados (aluno referenciado não existe/órfão no legado): ${report.guardianshipsSkippedOrphanStudent}`);
  console.log(`Vínculos pulados (duplicados): ${report.guardianshipsSkippedDup}`);

  console.log(DRY_RUN ? '\n=== FIM DA SIMULAÇÃO (nada foi escrito) ===' : '\n=== MIGRAÇÃO CONCLUÍDA ===');
  process.exit(0);
}

main().catch(err => {
  console.error('\nERRO NA MIGRAÇÃO (nada foi salvo — transação revertida):', err);
  process.exit(1);
});
