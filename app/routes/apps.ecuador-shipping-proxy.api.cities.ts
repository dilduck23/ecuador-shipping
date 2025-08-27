import { json } from "@remix-run/node";
import prisma from "../db.server";

export const loader = async () => {
  const cities = await prisma.city.findMany({
    orderBy: { name: 'asc' },
  });

  // Ya no necesitamos las cabeceras CORS aquí.
  return json({ cities });
};