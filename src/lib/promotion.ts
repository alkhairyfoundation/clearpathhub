export type ClassRow = { id: string; name: string; level: unknown; next_class_id: string | null };

// School stream ladder, youngest -> oldest. A class is promoted to the first
// class that sits strictly higher in this ordering.
//   0 = pre-primary (playgroup / creche / nursery / kindergarten)
//   1 = primary (Primary 1-6, Basic 1-6)
//   2 = junior secondary (JSS 1-3, Basic 7-9)
//   3 = senior secondary (SS 1-3)
//   99 = unranked names: never receive inferred promotions, only explicit ones.
export function hierarchyKey(cls: { name: string; level: unknown }): { stream: number; num: number; name: string } {
  const raw = String(cls.name || '').toLowerCase();
  const levelStr = String(cls.level ?? '');
  const nameDigits = raw.match(/\d+/);
  let num = nameDigits ? parseInt(nameDigits[0], 10) : 0;
  let stream: number;
  if (/playgroup|creche|nursery|kindergarten|pre\s*-?\s*primary|preschool/.test(raw)) stream = 0;
  else if (/primary|basic\s*([1-6])/.test(raw)) stream = 1;
  else if (/jss|junior secondary|upper basic|basic\s*[789]/.test(raw)) stream = 2;
  else if (/sss|\bss\b|^ss\d|senior secondary|senior basic/.test(raw)) stream = 3;
  else stream = 99;
  // Only fall back to the level column for unranked class names; a recognized
  // stream class with no digits in its name (e.g. "Playgroup") is its stream's start.
  if (num === 0 && stream === 99) {
    const lv = levelStr.match(/\d+/);
    num = lv ? parseInt(lv[0], 10) : 0;
  }
  return { stream, num, name: String(cls.name || '') };
}

export function isRanked(k: { stream: number }): boolean {
  return k.stream <= 3;
}

export function isStrictlyHigher(k2: { stream: number; num: number }, k1: { stream: number; num: number }): boolean {
  return k2.stream > k1.stream || (k2.stream === k1.stream && k2.num > k1.num);
}

export function compareClasses(a: ClassRow, b: ClassRow): number {
  const ka = hierarchyKey(a);
  const kb = hierarchyKey(b);
  if (ka.stream !== kb.stream) return ka.stream - kb.stream;
  if (ka.num !== kb.num) return ka.num - kb.num;
  return ka.name.localeCompare(kb.name);
}

export function buildNextClassMap(classes: ClassRow[]): Record<string, string | null> {
  const sorted = [...classes].sort(compareClasses);
  const byId = new Map(classes.map((c) => [c.id, c]));

  const next: Record<string, string | null> = {};
  for (const c of sorted) {
    const k = hierarchyKey(c);

    // 1. Explicit next_class_id, only honored when the target ranks strictly
    //    higher than the source (rejects misconfigured/backwards links).
    const explicit = c.next_class_id && byId.get(c.next_class_id);
    if (explicit && isStrictlyHigher(hierarchyKey(explicit), k)) {
      next[c.id] = c.next_class_id;
      continue;
    }

    // 2. Infer: first ranked class that is strictly higher in the ordering.
    const i = sorted.indexOf(c);
    let found: string | null = null;
    for (let j = i + 1; j < sorted.length; j++) {
      const k2 = hierarchyKey(sorted[j]);
      if (!isRanked(k2)) continue;
      if (isStrictlyHigher(k2, k)) {
        found = sorted[j].id;
        break;
      }
    }
    next[c.id] = found;
  }
  return next;
}