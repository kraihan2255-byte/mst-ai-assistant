import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Development sample locations from Malappuram district, Kerala, India
// These are development sample areas, not a claim that MST Tengapal currently serves every location.
const DEFAULT_SAMPLE_AREAS = [
  'Malappuram',
  'Manjeri',
  'Perinthalmanna',
  'Tirur',
  'Tirurangadi',
  'Kottakkal',
  'Kondotty',
  'Ponnani',
  'Parappanangadi',
  'Tanur',
  'Valanchery',
  'Nilambur',
  'Edappal',
  'Areekode',
  'Wandoor',
];

const LEGACY_COIMBATORE_AREAS = [
  'Gandhipuram',
  'RS Puram',
  'Saibaba Colony',
  'Town Hall',
  'Peelamedu',
];

async function main() {
  const isProduction = process.env.NODE_ENV === 'production';
  // In production pilot, sample locations from Malappuram district are enabled by default
  // unless explicitly disabled with SEED_SAMPLE_AREAS=false.
  const shouldSeedSampleAreas = process.env.SEED_SAMPLE_AREAS !== 'false';

  const shouldSeedSampleCustomers =
    !isProduction && process.env.SEED_SAMPLE_CUSTOMERS === 'true';

  console.log(
    `🌱 Starting MST Tengapal seed (Environment: ${process.env.NODE_ENV || 'development'})...`,
  );

  // 1. Clean up legacy Coimbatore sample areas if present (safely unlinking any customer associations)
  const legacyAreas = await prisma.area.findMany({
    where: { name: { in: LEGACY_COIMBATORE_AREAS } },
  });

  if (legacyAreas.length > 0) {
    const legacyAreaIds = legacyAreas.map((a) => a.id);

    await prisma.customer.updateMany({
      where: { areaId: { in: legacyAreaIds } },
      data: { areaId: null },
    });

    await prisma.area.deleteMany({
      where: { id: { in: legacyAreaIds } },
    });
    console.log(
      `🧹 Cleaned up ${legacyAreas.length} legacy Coimbatore sample areas.`,
    );
  }

  // 2. Seed Official Product Catalog (Always seeded with verified business products and initial prices)
  const product500g = await prisma.product.upsert({
    where: { sku: 'CM-500G' },
    update: { isActive: true },
    create: {
      name: 'Coconut Milk 500g',
      size: '500g',
      sku: 'CM-500G',
      isActive: true,
    },
  });

  const existingPrice500g = await prisma.productPriceHistory.findFirst({
    where: { productId: product500g.id },
  });
  if (!existingPrice500g) {
    await prisma.productPriceHistory.create({
      data: {
        productId: product500g.id,
        pricePaise: 15500, // ₹155
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
      },
    });
  }

  const product1kg = await prisma.product.upsert({
    where: { sku: 'CM-1KG' },
    update: { isActive: true },
    create: {
      name: 'Coconut Milk 1kg',
      size: '1kg',
      sku: 'CM-1KG',
      isActive: true,
    },
  });

  const existingPrice1kg = await prisma.productPriceHistory.findFirst({
    where: { productId: product1kg.id },
  });
  if (!existingPrice1kg) {
    await prisma.productPriceHistory.create({
      data: {
        productId: product1kg.id,
        pricePaise: 29000, // ₹290
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
      },
    });
  }

  const product200ml = await prisma.product.upsert({
    where: { sku: 'CM-200ML' },
    update: { isActive: true },
    create: {
      name: 'Coconut Milk 200ml',
      size: '200ml',
      sku: 'CM-200ML',
      isActive: true,
    },
  });

  const existingPrice200ml = await prisma.productPriceHistory.findFirst({
    where: { productId: product200ml.id },
  });
  if (!existingPrice200ml) {
    await prisma.productPriceHistory.create({
      data: {
        productId: product200ml.id,
        pricePaise: 6500, // ₹65
        effectiveFrom: new Date('2026-01-01T00:00:00Z'),
      },
    });
  }
  console.log('✅ Verified core products: Coconut Milk 200ml (₹65), 500g (₹155) & 1kg (₹290).');

  // 3. Seed Configurable Development Sample Areas (Malappuram District)
  if (shouldSeedSampleAreas) {
    const areasToSeed = process.env.CUSTOM_AREAS
      ? process.env.CUSTOM_AREAS.split(',').map((s) => s.trim()).filter(Boolean)
      : DEFAULT_SAMPLE_AREAS;

    for (const name of areasToSeed) {
      await prisma.area.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }
    console.log(`✅ Seeded ${areasToSeed.length} sample areas (idempotent upsert).`);
  } else {
    console.log('ℹ️  Sample areas seeding skipped per configuration.');
  }

  // 4. Seed / Verify Administrator Account
  const existingAdmin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
  });

  if (!existingAdmin) {
    const adminUser = await prisma.user.upsert({
      where: { username: 'raihan' },
      update: {},
      create: {
        username: 'raihan',
        passwordHash:
          process.env.ADMIN_PASSWORD_HASH ||
          '$argon2id$v=19$m=19456,t=2,p=1$73CpwTtGwVZTMQ1g5huwhw$KVqFpNmXIbwA9IZmJ7T1EGYaxEztZ+Is+XfBID97C/E',
        role: 'ADMIN',
      },
    });
    console.log(`✅ Administrator account "${adminUser.username}" created.`);
  } else {
    console.log(`✅ Existing administrator account "${existingAdmin.username}" preserved.`);
  }

  // 4. Production Safety Guard: Never create fake customers in production
  if (shouldSeedSampleCustomers) {
    console.log('ℹ️  Sample customers explicitly enabled for dev testing.');
  } else {
    console.log('🛡️  Production safeguard: No fake customer records created.');
  }

  console.log('✨ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
