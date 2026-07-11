import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { employeeRefSelect } from "./employeeRepository.js";

export function createLoginEvent(data: Prisma.LoginEventUncheckedCreateInput) {
  return prisma.loginEvent.create({ data });
}

export function findLoginEvents(where: Prisma.LoginEventWhereInput, skip: number, take: number) {
  return prisma.loginEvent.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    // employee may be null (unknown email); select (not bare `true`) so passwordHash never leaks.
    include: { employee: { select: employeeRefSelect } },
  });
}

export function countLoginEvents(where: Prisma.LoginEventWhereInput) {
  return prisma.loginEvent.count({ where });
}
