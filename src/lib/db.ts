'use client';

import type { Filter, OrderSpec, WriteSpec } from '@/lib/neon-engine';

export interface DbResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number | null;
}

type AnyVal = any;

// ---------------------------------------------------------------------------
// Client-side data service backed by Neon (/api/db).
// Provides a Supabase-like fluent API so pages can switch from supabase.from()
// to db.from() with minimal changes. Writes run Neon-first on the server and
// log into /api/db as the authenticated user; Supabase mirroring happens
// server-side so no data is lost.
// ---------------------------------------------------------------------------

class DbQuery<T = any> {
  private table: string;
  private selectStr?: string;
  private selectCalled = false;
  private filters: Filter[] = [];
  private orders: OrderSpec[] = [];
  private limitVal?: number | null;
  private offsetVal?: number | null;
  private mode: 'single' | 'maybeSingle' | null = null;
  private countMode?: 'exact' | 'planned' | 'estimated';
  private headMode = false;
  private write?: WriteSpec;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string, opts?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): this {
    this.selectCalled = true;
    this.selectStr = columns;
    if (opts?.count) this.countMode = opts.count;
    if (opts?.head) this.headMode = true;
    return this;
  }

  eq(col: string, value: AnyVal): this {
    this.filters.push({ type: 'eq', col, val: value });
    return this;
  }
  neq(col: string, value: AnyVal): this {
    this.filters.push({ type: 'neq', col, val: value });
    return this;
  }
  gt(col: string, value: AnyVal): this {
    this.filters.push({ type: 'gt', col, val: value });
    return this;
  }
  gte(col: string, value: AnyVal): this {
    this.filters.push({ type: 'gte', col, val: value });
    return this;
  }
  lt(col: string, value: AnyVal): this {
    this.filters.push({ type: 'lt', col, val: value });
    return this;
  }
  lte(col: string, value: AnyVal): this {
    this.filters.push({ type: 'lte', col, val: value });
    return this;
  }
  like(col: string, value: string): this {
    this.filters.push({ type: 'like', col, val: value });
    return this;
  }
  ilike(col: string, value: string): this {
    this.filters.push({ type: 'ilike', col, val: value });
    return this;
  }
  is(col: string, value: AnyVal): this {
    this.filters.push({ type: 'is', col, val: value });
    return this;
  }
  in(col: string, value: AnyVal): this {
    this.filters.push({ type: 'in', col, val: Array.isArray(value) ? value : Array.from((value ?? []) as Iterable<unknown>) });
    return this;
  }
  not(col: string, op: string, value: AnyVal): this {
    if (op === 'is' && (value === null || value === undefined)) {
      this.filters.push({ type: 'not', col, val: null });
    } else if (op === 'in') {
      this.filters.push({ type: 'not.in', col, val: Array.isArray(value) ? value : [] });
    } else {
      this.filters.push({ type: 'neq', col, val: value });
    }
    return this;
  }
  or(value: string): this {
    this.filters.push({ type: 'or', value });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this.orders.push({ col, asc: opts?.ascending ?? true });
    return this;
  }
  limit(count: number): this {
    this.limitVal = count;
    return this;
  }
  offset(count: number): this {
    this.offsetVal = count;
    return this;
  }
  single(): this {
    this.mode = 'single';
    return this;
  }
  maybeSingle(): this {
    this.mode = 'maybeSingle';
    return this;
  }

  insert(data: AnyVal, opts?: { defaultToNull?: boolean }): this {
    this.write = { kind: 'insert', data, returnEnhanced: false };
    void opts;
    return this;
  }
  upsert(data: AnyVal, opts?: { onConflict?: string; ignoreDuplicates?: boolean }): this {
    this.write = { kind: 'upsert', data, returnEnhanced: false, onConflict: opts?.onConflict };
    return this;
  }
  update(data: AnyVal): this {
    this.write = { kind: 'update', data, returnEnhanced: false };
    return this;
  }
  delete(): this {
    this.write = { kind: 'delete', data: null, returnEnhanced: false };
    return this;
  }

  then<TResult1 = DbResult<T>, TResult2 = never>(
    onfulfilled?: ((value: DbResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    const pending = this.execute();
    return pending.then(onfulfilled, onrejected);
  }
  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null
  ): PromiseLike<DbResult<T> | TResult> {
    return this.execute().catch(onrejected);
  }
  finally(onfinally?: (() => void) | null): PromiseLike<DbResult<T>> {
    return this.execute().finally(onfinally);
  }

  private async execute(): Promise<DbResult<T>> {
    const isWrite = !!this.write;
    const returnEnhanced = isWrite && (this.selectCalled || !!this.selectStr);
    if (this.write) {
      this.write.returnEnhanced = returnEnhanced;
    }

    const payload: Record<string, any> = {
      table: this.table,
      op: isWrite ? 'write' : 'read',
      filters: this.filters,
      order: this.orders,
      limit: this.limitVal ?? undefined,
      offset: this.offsetVal ?? undefined,
      single: this.mode === 'single',
      maybeSingle: this.mode === 'maybeSingle',
      count: this.countMode,
      head: this.headMode,
    };
    if (!isWrite) payload.select = this.selectStr;
    if (isWrite) payload.write = this.write;

    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({ data: null, error: `Server error (${res.status})` }));
      if (!res.ok || json.error) {
        return { data: null, error: new Error(json.error || `Database error (${res.status})`), count: null };
      }
      return { data: json.data ?? null, error: null, count: json.count ?? null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e : new Error('Network error'), count: null };
    }
  }
}

export const db = {
  from<T = any>(table: string) {
    return new DbQuery<T>(table);
  },
  async rpc<T = any>(name: string, args: Record<string, any> = {}): Promise<DbResult<T>> {
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ table: '__rpc__', op: 'rpc', filters: [], rpc: { name, args } }),
      });
      const json = await res.json().catch(() => ({ data: null, error: `Server error (${res.status})` }));
      if (!res.ok || json.error) {
        return { data: null, error: new Error(json.error || `Database error (${res.status})`), count: null };
      }
      return { data: json.data ?? null, error: null, count: json.count ?? null };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e : new Error('Network error'), count: null };
    }
  },
};

export default db;