// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const initialRoutes = [
  { name: "Local", start_kg_price: 2.55, extra_kg_price: 0.35 },
  { name: "Cantonal/Provincial", start_kg_price: 3.90, extra_kg_price: 0.54 },
  { name: "Regional", start_kg_price: 4.44, extra_kg_price: 0.72 },
  { name: "Especial", start_kg_price: 5.25, extra_kg_price: 0.89 },
  { name: "Galápagos", start_kg_price: 8.70, extra_kg_price: 2.54 },
];

const initialCities = [
  { name: "Alausi", province: "Chimborazo", routeName: "Regional" },
  { name: "Alfredo Baquerizo Moreno (Jujan)", province: "Guayas", routeName: "Cantonal/Provincial" },
  { name: "Ambato", province: "Tungurahua", routeName: "Regional" },
  { name: "Guayaquil", province: "Guayas", routeName: "Local" },
  { name: "Quito", province: "Pichincha", routeName: "Cantonal/Provincial" },
  { name: "Cuenca", province: "Azuay", routeName: "Regional" },
  { name: "Santa Cruz", province: "Galápagos", routeName: "Galápagos" },
];

async function main() {
  console.log('Start seeding...');

  for (const route of initialRoutes) {
    const existingRoute = await db.shippingRoute.findUnique({
      where: { name: route.name },
    });
    if (!existingRoute) {
      await db.shippingRoute.create({
        data: route,
      });
      console.log(`Created route: ${route.name}`);
    } else {
      console.log(`Route already exists: ${route.name}`);
    }
  }

  for (const city of initialCities) {
    const route = await db.shippingRoute.findUnique({
      where: { name: city.routeName },
    });

    if (route) {
      const existingCity = await db.city.findFirst({
        where: { name: city.name, province: city.province },
      });
      if (!existingCity) {
        await db.city.create({
          data: {
            name: city.name,
            province: city.province,
            routeId: route.id,
          },
        });
        console.log(`Created city: ${city.name}`);
      } else {
        console.log(`City already exists: ${city.name}`);
      }
    } else {
      console.error(`Route not found for city: ${city.name}`);
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });