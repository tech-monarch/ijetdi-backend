// Translates at the API boundary between this backend's internal
// camelCase (matching Prisma's generated client) and the snake_case
// convention docs/API_DOCUMENTATION.md uses for query params (and which
// this backend also adopts for JSON body field names — see the README's
// "Casing convention" note for why: apiClient.js itself has no casing
// opinion, so this was a free choice, and matching the doc's literal
// query-param spelling (`publication_id`, `issue_id`, ...) was judged the
// safer default for whoever implements the real frontend cutover next).

function toCamelKey(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function toSnakeKey(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Date);
}

export function snakeToCamel(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(snakeToCamel);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [toCamelKey(k), snakeToCamel(v)]));
  }
  return value;
}

export function camelToSnake(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(camelToSnake);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [toSnakeKey(k), camelToSnake(v)]));
  }
  return value;
}
