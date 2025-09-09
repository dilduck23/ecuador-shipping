import { json } from "@remix-run/node";
import prisma from "../db.server";

export const action = async ({ request }) => {
  try {
    // Obtenemos todas las ciudades en cada request. 
    // Para una futura optimización, se podría implementar un caché aquí.
    const allDbCities = await prisma.city.findMany({ include: { route: true } });
    const { rate } = await request.json();
    if (!rate?.destination?.city) {
      // Si no hay ciudad, no hay tarifas.
      return json({ rates: [] });
    }

    // 1. Limpiamos y convertimos a mayúsculas la ciudad que envía Shopify.
    const shopifyCityName = rate.destination.city.trim().toUpperCase();

    if (shopifyCityName === "") {
        return json({ rates: [] });
    }

    // 2. Buscamos la ciudad en nuestra lista (súper rápido).
    const destinationCity = allDbCities.find(dbCity => dbCity.name.toUpperCase() === shopifyCityName);

    // 3. Si no hay ciudad o no tiene una ruta asignada, no hay tarifas.
    if (!destinationCity || !destinationCity.route) {
      console.log(`❌ No se encontró ruta para: "${shopifyCityName}"`);
      return json({ rates: [] });
    }

    // 4. Si encontramos la ciudad, calculamos el precio.
    const route = destinationCity.route;
    const cityName = destinationCity.name;
    const totalWeightInGrams = rate.items.reduce((total, item) => total + (item.grams * item.quantity), 0);
    const totalWeightInKg = totalWeightInGrams / 1000;

    let finalPrice = route.start_kg_price;
    if (totalWeightInKg > 2) {
      const extraWeight = totalWeightInKg - 2;
      finalPrice += Math.ceil(extraWeight) * route.extra_kg_price;
    }

    // 5. Devolvemos la tarifa formateada a Shopify.
    const calculatedRates = [{
      service_name: `Envío Estándar (${route.name})`,
      service_code: `ESTANDAR-${route.id}`,
      total_price: Math.round(finalPrice * 100), // En centavos
      currency: "USD",
      description: `Entrega en ${cityName}`,
    }];

    console.log(`✅ Tarifa calculada para ${cityName}: $${finalPrice}`);
    return json({ rates: calculatedRates });

  } catch (error) {
    console.error("💥 ¡ERROR INESPERADO EN EL ENDPOINT!", error);
    return json({ rates: [] });
  }
};