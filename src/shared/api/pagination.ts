export interface PaginatedResult<T> {
  items: T[];
  currentPage: number;
  totalPages: number;
  perPage: number;
  total: number;
  from: number | null;
  to: number | null;
  raw: unknown;
}

export type PaginationParams = Record<string, string | number | boolean | null | undefined>;

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const toRecord = (value: unknown): UnknownRecord => (isRecord(value) ? value : {});

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

export const extractPayload = <T = unknown>(raw: unknown): T => {
  const root = toRecord(raw);
  return (root.data ?? raw) as T;
};

const defaultGuard = <T>(item: unknown): item is T =>
  item !== null && typeof item === "object";

export const extractArrayPayload = <T>(
  raw: unknown,
  guard: (item: unknown) => item is T = defaultGuard<T>
): T[] => {
  if (Array.isArray(raw)) {
    return raw.filter(guard);
  }

  const payload = extractPayload(raw);

  if (Array.isArray(payload)) {
    return payload.filter(guard);
  }

  const payloadRecord = toRecord(payload);
  const candidates = [
    payloadRecord.items,
    payloadRecord.rows,
    payloadRecord.data,
    payloadRecord.results,
    payloadRecord.calendar,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(guard);
    }
  }

  return [];
};

const resolvePaginator = (raw: unknown): UnknownRecord => {
  const payload = extractPayload(raw);
  const payloadRecord = toRecord(payload);

  if (
    "current_page" in payloadRecord ||
    "last_page" in payloadRecord ||
    "per_page" in payloadRecord ||
    "total" in payloadRecord
  ) {
    return payloadRecord;
  }

  return toRecord(raw);
};

export const parsePaginatedResponse = <T>(
  raw: unknown,
  guard: (item: unknown) => item is T = defaultGuard<T>
): PaginatedResult<T> => {
  const paginator = resolvePaginator(raw);
  const items = extractArrayPayload(raw, guard);
  const perPage = toNumber(paginator.per_page, items.length || 10);
  const total = toNumber(paginator.total, items.length);
  const totalPages = toNumber(
    paginator.last_page,
    perPage > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1
  );

  return {
    items,
    currentPage: toNumber(paginator.current_page, 1),
    totalPages: Math.max(1, totalPages),
    perPage,
    total,
    from: paginator.from === null ? null : toNumber(paginator.from, items.length ? 1 : 0),
    to: paginator.to === null ? null : toNumber(paginator.to, items.length),
    raw,
  };
};
