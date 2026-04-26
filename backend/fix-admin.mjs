import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { email: "n6179323@gmail.com" },
  select: { id: true, email: true, role: true }
});

console.log("Role hai:", user);
await prisma.$disconnect();