import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados NexDojo...\n');

  // ── 1. ACADEMY ──────────────────────────────────────────────────────────────
  const academy = await prisma.academy.upsert({
    where: { id: 'mock_acad_1' },
    update: {},
    create: {
      id: 'mock_acad_1',
      name: 'NexDojo',
      ownerName: 'Prof. Carlos Gracie Jr.',
      email: 'admin@oss.com',
      logo: 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?q=80&w=400&h=400&auto=format&fit=crop',
      phone: '',
      cep: '',
      address: '',
      addressNumber: '',
    }
  });
  console.log(`✅ Academia: ${academy.name}`);

  // ── 2. USERS (com senhas criptografadas) ────────────────────────────────────
  const senhaAdmin     = await bcrypt.hash('oss123', 10);
  const senhaInstrutor = await bcrypt.hash('oss123', 10);
  const senhaStaff     = await bcrypt.hash('oss123', 10);
  const senhaAluno     = await bcrypt.hash('oss123', 10);
  const senhaSuper     = await bcrypt.hash('super', 10);

  const users = [
    { id: 'mock_user_1',         academyId: 'mock_acad_1', role: 'admin',     name: 'Admin Teste',        email: 'admin@oss.com',  password: senhaAdmin,     status: 'Active' },
    { id: 'mock_instr_1',        academyId: 'mock_acad_1', role: 'instructor', name: 'Prof. Renato Silva', email: 'instru@oss.com', password: senhaInstrutor, status: 'Active' },
    { id: 'mock_staff_1',        academyId: 'mock_acad_1', role: 'staff',      name: 'Ana Secretaria',     email: 'colab@oss.com',  password: senhaStaff,     status: 'Active' },
    { id: 'mock_student_user_1', academyId: 'mock_acad_1', role: 'student',    name: 'Carlos Oliveira',    email: 'aluno@oss.com',  password: senhaAluno,     status: 'Active' },
    { id: 'mock_superuser_1',    academyId: null,           role: 'superuser',  name: 'Super User OSS',     email: 'super@oss.com',  password: senhaSuper,     status: 'Active' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.password },
      create: u,
    });
    console.log(`✅ Usuário: ${u.name} (${u.role}) — senha criptografada`);
  }

  // ── 3. STUDENTS ─────────────────────────────────────────────────────────────
  const students = [
    { id: 's1',  academyId: 'mock_acad_1', name: 'Carlos Oliveira', email: 'aluno@oss.com',   belt: 'WHITE',  stripes: 2, lastGraduationDate: '2024-01-10', birthDate: '1995-04-12', totalClasses: 45,   totalHours: 67,  absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2023-10-01'), phone: '11988887777', photo: 'https://picsum.photos/seed/s1/400/400' },
    { id: 's2',  academyId: 'mock_acad_1', name: 'Juliana Santos',  belt: 'BLUE',   stripes: 1, lastGraduationDate: '2023-11-20', birthDate: '1998-08-22', totalClasses: 120,  totalHours: 180, absentCount: 4, status: 'Active', hasLoanedKimono: true,  joinDate: new Date('2022-05-15'), phone: '11977776666', photo: 'https://picsum.photos/seed/s2/400/400' },
    { id: 's3',  academyId: 'mock_acad_1', name: 'Marcos Pereira',  belt: 'PURPLE', stripes: 3, lastGraduationDate: '2023-06-15', birthDate: '1990-01-30', totalClasses: 350,  totalHours: 525, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2020-02-10'), phone: '11966665555', photo: 'https://picsum.photos/seed/s3/400/400' },
    { id: 's4',  academyId: 'mock_acad_1', name: 'Arthur Silva',    belt: 'GREY',   stripes: 3, lastGraduationDate: '2024-03-05', birthDate: '2016-05-10', totalClasses: 30,   totalHours: 30,  absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2023-12-01'), emergencyPhone: '11955554444', photo: 'https://picsum.photos/seed/s4/400/400' },
    { id: 's5',  academyId: 'mock_acad_1', name: 'Mariana Costa',   belt: 'YELLOW', stripes: 1, lastGraduationDate: '2024-02-12', birthDate: '2014-02-20', totalClasses: 80,   totalHours: 80,  absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2023-01-15'), emergencyPhone: '11944443333', photo: 'https://picsum.photos/seed/s5/400/400' },
    { id: 's6',  academyId: 'mock_acad_1', name: 'Ricardo Mendes',  belt: 'BROWN',  stripes: 0, lastGraduationDate: '2022-08-25', birthDate: '1988-11-05', totalClasses: 500,  totalHours: 750, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2018-03-20'), phone: '11933332222', photo: 'https://picsum.photos/seed/s6/400/400' },
    { id: 's7',  academyId: 'mock_acad_1', name: 'Beatriz Lima',    belt: 'BLACK',  stripes: 1, lastGraduationDate: '2021-12-01', birthDate: '1985-07-14', totalClasses: 1200, totalHours: 1800,absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2010-01-10'), phone: '11922221111', photo: 'https://picsum.photos/seed/s7/400/400' },
    { id: 's8',  academyId: 'mock_acad_1', name: 'Pedro Rocha',     belt: 'ORANGE', stripes: 4, lastGraduationDate: '2023-10-15', birthDate: '2011-03-25', totalClasses: 150,  totalHours: 150, absentCount: 5, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2021-06-12'), emergencyPhone: '11911110000', photo: 'https://picsum.photos/seed/s8/400/400' },
    { id: 's9',  academyId: 'mock_acad_1', name: 'Sofia Amaral',    belt: 'GREEN',  stripes: 2, lastGraduationDate: '2023-12-20', birthDate: '2009-09-02', totalClasses: 210,  totalHours: 210, absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2020-11-05'), emergencyPhone: '11900009999', photo: 'https://picsum.photos/seed/s9/400/400' },
    { id: 's10', academyId: 'mock_acad_1', name: 'Lucas Ferreira',  belt: 'WHITE',  stripes: 0, birthDate: '2000-01-15',         totalClasses: 5,    totalHours: 7,   absentCount: 0, status: 'Active', hasLoanedKimono: false, joinDate: new Date('2024-02-01'), phone: '11987654321', photo: 'https://picsum.photos/seed/s10/400/400' },
  ];

  for (const s of students) {
    await prisma.student.upsert({
      where: { id: s.id },
      update: {},
      create: s as any,
    });
    console.log(`✅ Aluno: ${s.name} (${s.belt}${s.stripes > 0 ? ' / ' + s.stripes + ' graus' : ''})`);
  }

  console.log('\n🥋 Seed concluído com sucesso! OSS!');
  console.log('\n📋 Credenciais de acesso criadas:');
  console.log('   admin@oss.com   / oss123  → Admin');
  console.log('   instru@oss.com  / oss123  → Instrutor');
  console.log('   colab@oss.com   / oss123  → Staff');
  console.log('   aluno@oss.com   / oss123  → Aluno');
  console.log('   super@oss.com   / super   → Superuser');
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
