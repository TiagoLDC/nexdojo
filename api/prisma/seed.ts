import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed COMPLETO do banco de dados NexDojo...\n');

  // ── 1. ACADEMIAS ────────────────────────────────────────────────────────────
  const academyIds = ['mock_acad_1', 'mock_acad_2', 'mock_acad_3'];
  const academies = [
    { id: academyIds[0], name: 'NexDojo HQ', ownerName: 'Mestre Carlos Gracie', email: 'hq@nexdojo.com', logo: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop' },
    { id: academyIds[1], name: 'Alliance São Paulo', ownerName: 'Fabio Gurgel', email: 'sp@alliance.com', logo: 'https://images.unsplash.com/photo-1599058917232-d750c1859d7c?q=80&w=400&h=400&auto=format&fit=crop' },
    { id: academyIds[2], name: 'Gracie Barra Rio', ownerName: 'Jefferson Moura', email: 'rio@graciebarra.com', logo: 'https://images.unsplash.com/photo-1549476464-37392f717551?q=80&w=400&h=400&auto=format&fit=crop' }
  ];

  for (const a of academies) {
    await prisma.academy.upsert({
      where: { id: a.id },
      update: {},
      create: { ...a, phone: '11999998888', cep: '01001-000', address: 'Av. Paulista', addressNumber: '1000' }
    });
    console.log(`✅ Academia: ${a.name}`);
  }

  // ── 2. USUÁRIOS ─────────────────────────────────────────────────────────────
  const commonPassword = await bcrypt.hash('oss123', 10);
  const superPassword = await bcrypt.hash('super', 10);

  const users = [
    { id: 'u_super', academyId: null, role: 'superuser', name: 'Super Admin OSS', email: 'super@oss.com', password: superPassword, status: 'Active' },
    { id: 'u_admin_1', academyId: academyIds[0], role: 'admin', name: 'Tiago Admin', email: 'admin@nexdojo.com', password: commonPassword, status: 'Active' },
    { id: 'u_inst_1', academyId: academyIds[0], role: 'instructor', name: 'Prof. Renato', email: 'renato@nexdojo.com', password: commonPassword, status: 'Active' },
    { id: 'u_staff_1', academyId: academyIds[0], role: 'staff', name: 'Ana Secretaria', email: 'ana@nexdojo.com', password: commonPassword, status: 'Active' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.password },
      create: u,
    });
    console.log(`✅ Usuário: ${u.name} (${u.role})`);
  }

  // ── 3. ALUNOS ───────────────────────────────────────────────────────────────
  const belts = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];
  const studentIds: string[] = [];

  for (const academyId of academyIds) {
    for (let i = 1; i <= 10; i++) {
      const studentId = `s_${academyId}_${i}`;
      studentIds.push(studentId);
      await prisma.student.upsert({
        where: { id: studentId },
        update: {},
        create: {
          id: studentId,
          academyId: academyId,
          name: `Aluno ${i} - ${academyId}`,
          email: `aluno${i}@${academyId}.com`,
          belt: belts[Math.floor(Math.random() * belts.length)],
          stripes: Math.floor(Math.random() * 5),
          status: 'Active',
          joinDate: new Date(),
          totalClasses: Math.floor(Math.random() * 100),
          photo: `https://picsum.photos/seed/${studentId}/400/400`,
        }
      });
    }
  }
  console.log(`✅ ${studentIds.length} Alunos criados.`);

  // ── 4. CLASS TEMPLATES & SESSIONS ──────────────────────────────────────────
  for (const academyId of academyIds) {
    const template = await prisma.classTemplate.create({
      data: {
        academyId: academyId,
        name: 'Turma Geral',
        durationMinutes: 90,
        schedules: JSON.stringify([{ dayOfWeek: 1, startTime: '19:00', endTime: '20:30' }])
      }
    });

    const session = await prisma.classSession.create({
      data: {
        academyId: academyId,
        templateId: template.id,
        name: 'Aula de Segunda',
        date: new Date(),
        durationMinutes: 90,
        instructorId: 'u_inst_1',
        status: 'Finalized'
      }
    });

    // Attendance
    await prisma.attendanceRecord.create({
      data: {
        academyId: academyId,
        studentId: `s_${academyId}_1`,
        classId: session.id,
        durationMinutes: 90,
        kimonoTaken: false
      }
    });
  }
  console.log('✅ Turmas, Aulas e Chamadas criadas.');

  // ── 5. MURAL (CHAT) ────────────────────────────────────────────────────────
  for (const academyId of academyIds) {
    await prisma.chatMessage.create({
      data: {
        academyId: academyId,
        senderId: 'u_admin_1',
        senderName: 'Admin',
        senderRole: 'admin',
        content: 'Bem-vindos à nova plataforma NexDojo!',
      }
    });
  }
  console.log('✅ Mensagens no Mural criadas.');

  // ── 6. FINANCEIRO ──────────────────────────────────────────────────────────
  for (const academyId of academyIds) {
    await prisma.financeTransaction.create({
      data: {
        academyId: academyId,
        description: 'Mensalidade Janeiro',
        amount: 150.00,
        type: 'income',
        category: 'Mensalidade',
        paymentMethod: 'Pix',
        status: 'paid',
        studentId: `s_${academyId}_1`
      }
    });
    await prisma.financeTransaction.create({
      data: {
        academyId: academyId,
        description: 'Aluguel do Tatame',
        amount: 1200.00,
        type: 'expense',
        category: 'Infraestrutura',
        paymentMethod: 'Boleto',
        status: 'paid'
      }
    });
  }
  console.log('✅ Transações Financeiras criadas.');

  // ── 7. EMPRÉSTIMO DE KIMONOS ───────────────────────────────────────────────
  for (const academyId of academyIds) {
    await prisma.kimonoLoan.create({
      data: {
        academyId: academyId,
        studentId: `s_${academyId}_2`,
        status: 'Active'
      }
    });
  }
  console.log('✅ Empréstimos de Kimonos criados.');

  console.log('\n🥋 Seed COMPLETO concluído com sucesso! OSS!');
}

main()
  .catch((e) => { console.error('❌ Erro:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
