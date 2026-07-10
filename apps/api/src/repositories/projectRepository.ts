import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const projectInclude = {
  customer: true,
  warehouses: true,
} satisfies Prisma.ProjectInclude;

export function findProjects(where: Prisma.ProjectWhereInput, skip: number, take: number) {
  return prisma.project.findMany({
    where,
    skip,
    take,
    include: projectInclude,
    orderBy: { startDate: "desc" },
  });
}

export function countProjects(where: Prisma.ProjectWhereInput) {
  return prisma.project.count({ where });
}

export function findProjectById(id: string) {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
}

export function findProjectByCode(code: string) {
  return prisma.project.findUnique({ where: { code } });
}

export function createProject(data: Prisma.ProjectCreateInput) {
  return prisma.project.create({ data, include: projectInclude });
}

export function updateProject(id: string, data: Prisma.ProjectUpdateInput) {
  return prisma.project.update({ where: { id }, data, include: projectInclude });
}
