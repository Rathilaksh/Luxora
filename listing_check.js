const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const count = await prisma.listing.count();
  const first = await prisma.listing.findMany({ take: 2, orderBy: { id: 'asc' } });
  console.log('Listing count:', count);
  console.log('Sample listings:', first.map(l => ({ id: l.id, title: l.title, city: l.city, price: l.price })));
  await prisma.$disconnect();
})();
