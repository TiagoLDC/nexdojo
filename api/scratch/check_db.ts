
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const academies = await prisma.academy.findMany();
  console.log(JSON.stringify(academies, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
