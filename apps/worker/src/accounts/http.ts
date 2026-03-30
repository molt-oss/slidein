import type { Context } from 'hono';

export function getAccountIdFromRequest(c: Context): string {
  return c.req.header('X-Account-Id') ?? c.req.query('accountId') ?? 'default';
}
