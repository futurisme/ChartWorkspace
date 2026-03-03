import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient; prismaDatabaseUrl?: string };

function parseHostFromDatabaseUrl(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function isPrivateRailwayHost(databaseUrl: string) {
  const host = parseHostFromDatabaseUrl(databaseUrl);
  return host.endsWith('.railway.internal');
}

function getDatabaseUrlCandidates() {
  return [
    process.env.DATABASE_PUBLIC_URL,
    process.env.DATABASE_URL_PUBLIC,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
    process.env.DATABASE_URL,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
}

function resolveDatabaseUrl() {
  const candidates = getDatabaseUrlCandidates();

  if (candidates.length === 0) {
    return null;
  }

  const preferredPublic = candidates.find((value) => !isPrivateRailwayHost(value));
  const selected = preferredPublic ?? candidates[0];

  if (
    process.env.NODE_ENV === 'production' &&
    isPrivateRailwayHost(selected) &&
    typeof console !== 'undefined'
  ) {
    console.warn(
      '[prisma] Runtime DB URL resolves to *.railway.internal. This host is private and usually unreachable from Vercel. ' +
      'Set DATABASE_PUBLIC_URL (or DATABASE_URL_PUBLIC) to Railway proxy/public host.'
    );
  }

  return selected;
}

const resolvedDatabaseUrl = resolveDatabaseUrl();

if (resolvedDatabaseUrl) {
  process.env.DATABASE_URL = resolvedDatabaseUrl;
}

export const prisma =
  globalForPrisma.prisma && globalForPrisma.prismaDatabaseUrl === resolvedDatabaseUrl
    ? globalForPrisma.prisma
    : new PrismaClient({
        datasourceUrl: resolvedDatabaseUrl ?? undefined,
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaDatabaseUrl = resolvedDatabaseUrl ?? undefined;
}

export const activeDatabaseHost = resolvedDatabaseUrl ? parseHostFromDatabaseUrl(resolvedDatabaseUrl) : null;

export default prisma;
