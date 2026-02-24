import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const merchantPassword = await bcrypt.hash('merchant123', 10);
  const merchant = await prisma.merchant.upsert({
    where: { email: 'demo@coffeeshop.com' },
    update: {},
    create: {
      name: 'Demo Coffee Shop',
      category: 'Food & Beverage',
      email: 'demo@coffeeshop.com',
      passwordHash: merchantPassword,
    },
  });

  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.upsert({
    where: { phone: '+1555000001' },
    update: {},
    create: {
      phone: '+1555000001',
      name: 'Demo User',
      email: 'demo@user.com',
      passwordHash: userPassword,
    },
  });

  console.log('Seeded merchant:', merchant.name, '| API Key:', merchant.apiKey);
  console.log('Seeded user:', user.name, '| Phone:', user.phone);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
