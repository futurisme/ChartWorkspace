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

function resolveDatabaseUrl() {
  const explicitCandidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PUBLIC_URL,
    process.env.DATABASE_URL_PUBLIC,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_URL,
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);

  if (explicitCandidates.length === 0) {
    return null;
  }

  const preferredPublic = explicitCandidates.find((value) => !isPrivateRailwayHost(value));
  const selected = preferredPublic ?? explicitCandidates[0];

  if (
    process.env.NODE_ENV === 'production' &&
    isPrivateRailwayHost(selected) &&
    typeof console !== 'undefined'
  ) {
    console.warn(
      '[prisma] DATABASE_URL points to *.railway.internal in production. This host is private and usually unreachable from Vercel. ' +
      'Set DATABASE_PUBLIC_URL or DATABASE_URL to Railway public/proxy host.'
    );
  }

  return selected;
}

const resolvedDatabaseUrl = resolveDatabaseUrl();

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
