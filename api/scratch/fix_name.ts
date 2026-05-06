
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.academy.update({
    where: { id: 'mock_acad_1' },
    data: { name: 'NexDojo TESTE' }
  });
  console.log('Updated:', updated.name);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
