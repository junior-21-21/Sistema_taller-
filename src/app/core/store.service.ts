import { Injectable, computed, effect, signal } from '@angular/core';
import { DEFAULT_SHOP } from './default-data';
import { CatalogItem, Client, Estado, Expense, Foto, Quote, Sale, Shop } from './models';
import { fixRef } from './referencias';
import { clientKey, nowTime, saleTotals, suggestDays, todayIso, totals } from './calc';

function load<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

/** Código corto de este equipo: no cambia aunque se cierre la app. */
function deviceCode() {
  const KEY = 'rr.device';
  try {
    let c = localStorage.getItem(KEY);
    if (!c) {
      c = Math.random().toString(36).slice(2, 4).toUpperCase().padEnd(2, 'X');
      localStorage.setItem(KEY, c);
    }
    return c;
  } catch {
    return 'X';
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* sin espacio o almacenamiento bloqueado: el Excel sigue siendo la copia principal */
  }
}

export interface ClientSummary {
  key: string;
  client: Client;
  quotes: Quote[];
  sales: Sale[];
  quoted: number;
  bought: number;
  last: string;
}

/** Servicio borrado: se puede recuperar durante 30 días. */
export interface TrashItem { item: CatalogItem; fotos: Foto[]; at: string; }
export const TRASH_DAYS = 30;
const DAY = 86_400_000;
const fresh = (list: TrashItem[]) => list.filter((x) => Date.now() - Date.parse(x.at) < TRASH_DAYS * DAY);

/** Código de las fotos propias del cliente en una cotización. */
export const quoteFotoCode = (num: string) => 'Q:' + num;

export type StoreOp =
  | { t: 'quote' | 'delQuote' | 'sale'; num: string }
  | { t: 'expense' | 'delExpense'; id: string }
  | { t: 'foto' | 'delFoto'; id: string }
  | { t: 'catalog' | 'shop' };

/** Estado de la app. Se guarda en el navegador como copia de trabajo y el
 *  SheetService lo guarda en la hoja de Google. */
@Injectable({ providedIn: 'root' })
export class Store {
  /** Sin conexión con la hoja: lo que se cree aquí todavía no se puede comparar con otros equipos. */
  readonly offline = signal(false);
  readonly catalog = signal<CatalogItem[]>(load('rr.catalog') ?? []);
  readonly quotes = signal<Quote[]>(load('rr.quotes') ?? []);
  readonly sales = signal<Sale[]>(load('rr.sales') ?? []);
  readonly expenses = signal<Expense[]>(load('rr.expenses') ?? []);
  readonly fotos = signal<Foto[]>(load('rr.fotos') ?? []);
  /** Papelera de servicios borrados (en este equipo). */
  readonly trash = signal<TrashItem[]>(fresh(load('rr.trash') ?? []));
  readonly shop = signal<Shop>({ ...DEFAULT_SHOP, ...(load<Partial<Shop>>('rr.shop') ?? {}) });
  /** Hay cambios que todavía no están en el Excel. */
  readonly dirty = signal<boolean>(load('rr.dirty') ?? false);
  /** Cuenta los cambios hechos aquí. */
  readonly changes = signal(0);

  readonly categories = computed(() => [...new Set(this.catalog().map((c) => c.cat))]);
  readonly sortedQuotes = computed(() => [...this.quotes()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  readonly sortedSales = computed(() =>
    [...this.sales()].sort((a, b) => (b.date + b.time + b.num).localeCompare(a.date + a.time + a.num)),
  );

  /** Lo cobrado (notas de venta no anuladas) por cada cotización. */
  readonly paidByQuote = computed(() => {
    const m: Record<string, number> = {};
    const igv = this.shop().igv;
    for (const s of this.sales()) if (s.quoteNum && !s.void) m[s.quoteNum] = (m[s.quoteNum] || 0) + saleTotals(s, igv).tot;
    return m;
  });

  readonly clients = computed<ClientSummary[]>(() => {
    const map = new Map<string, ClientSummary>();
    const igv = this.shop().igv;
    const get = (c: Client, date: string) => {
      const k = clientKey(c);
      if (!k) return null;
      let e = map.get(k);
      if (!e) {
        e = { key: k, client: { ...c }, quotes: [], sales: [], quoted: 0, bought: 0, last: date };
        map.set(k, e);
      }
      if (date >= e.last) {
        e.last = date;
        // Se queda con los datos más recientes y completos.
        e.client = {
          kind: c.kind || e.client.kind, name: c.name || e.client.name, doc: c.doc || e.client.doc, tel: c.tel || e.client.tel,
          place: c.place || e.client.place, contact: c.contact || e.client.contact, email: c.email || e.client.email,
        };
      }
      return e;
    };
    for (const q of this.quotes()) {
      const e = get(q.client, q.date);
      if (e) { e.quotes.push(q); e.quoted += totals(q).tot; }
    }
    for (const s of this.sales()) {
      if (s.void) continue;
      const e = get(s.client, s.date);
      if (e) { e.sales.push(s); e.bought += saleTotals(s, igv).tot; }
    }
    return [...map.values()].sort((a, b) => b.last.localeCompare(a.last));
  });

  constructor() {
    effect(() => persist('rr.catalog', this.catalog()));
    effect(() => persist('rr.quotes', this.quotes()));
    effect(() => persist('rr.sales', this.sales()));
    effect(() => persist('rr.expenses', this.expenses()));
    effect(() => persist('rr.fotos', this.fotos()));
    effect(() => persist('rr.shop', this.shop()));
    effect(() => persist('rr.trash', this.trash()));
    effect(() => persist('rr.dirty', this.dirty()));
  }

  /** Lo escucha el servicio de la hoja de Google para guardar cada cambio. */
  onChange: ((op: StoreOp) => void) | null = null;

  private touch(op: StoreOp) {
    this.dirty.set(true);
    this.changes.update((n) => n + 1);
    this.onChange?.(op);
  }

  // ---------------------------------------------------------------- cotizaciones
  get(num: string): Quote | undefined {
    return this.quotes().find((q) => q.num === num);
  }

  /** Sin señal otro equipo puede sacar el mismo número y al subir se pisarían: se agrega el código de este equipo. */
  private numSuffix() {
    return this.offline() || navigator.onLine === false ? '-' + deviceCode() : '';
  }

  private nextQuoteSeq(year: string) {
    return Math.max(0, ...this.quotes().filter((q) => q.date.startsWith(year)).map((q) => q.seq)) + 1;
  }

  newQuote(): Quote {
    const s = this.shop();
    const date = todayIso();
    const year = date.slice(0, 4);
    const seq = this.nextQuoteSeq(year);
    return {
      num: `COT-${year}-${String(seq).padStart(4, '0')}${this.numSuffix()}`,
      seq,
      date,
      client: { name: '', doc: '', tel: '', place: '' },
      desc: '',
      items: [],
      discount: 0,
      advance: s.advance,
      days: suggestDays(0),
      validity: s.validity,
      warranty: s.warranty,
      igv: s.igv,
      penalty: 0,
      notes: '',
      estado: 'Pendiente',
      updatedAt: new Date().toISOString(),
    };
  }

  /** Copia una cotización con número y fecha nuevos. */
  duplicate(num: string): Quote | null {
    const src = this.get(num);
    if (!src) return null;
    const fresh = this.newQuote();
    const copy: Quote = { ...structuredClone(src), num: fresh.num, seq: fresh.seq, date: fresh.date, estado: 'Pendiente' };
    this.saveQuote(copy);
    return copy;
  }

  saveQuote(q: Quote) {
    const copy: Quote = structuredClone({ ...q, updatedAt: new Date().toISOString() });
    this.quotes.update((list) => {
      const i = list.findIndex((x) => x.num === q.num);
      return i < 0 ? [...list, copy] : list.map((x, j) => (j === i ? copy : x));
    });
    this.touch({ t: 'quote', num: q.num });
  }

  setEstado(num: string, estado: Estado) {
    this.quotes.update((list) => list.map((q) => (q.num === num ? { ...q, estado, updatedAt: new Date().toISOString() } : q)));
    this.touch({ t: 'quote', num });
  }

  /** Notas de venta (no anuladas) que cobran esta cotización. */
  salesOf(num: string) {
    return this.sales().filter((s) => s.quoteNum === num && !s.void);
  }

  /** Borra la cotización. No se puede si tiene cobros: primero se anulan sus notas de venta. */
  deleteQuote(num: string): boolean {
    if (this.salesOf(num).length) return false;
    this.quotes.update((list) => list.filter((q) => q.num !== num));
    this.touch({ t: 'delQuote', num });
    for (const f of this.fotosOf(quoteFotoCode(num))) this.deleteFoto(f.id);
    return true;
  }

  // ---------------------------------------------------------------- ventas
  getSale(num: string): Sale | undefined {
    return this.sales().find((s) => s.num === num);
  }

  newSale(): Sale {
    const serie = (this.shop().serie || 'NV01').toUpperCase();
    const seq = Math.max(0, ...this.sales().filter((s) => s.num.startsWith(serie + '-')).map((s) => s.seq)) + 1;
    return {
      num: `${serie}-${String(seq).padStart(8, '0')}${this.numSuffix()}`,
      seq,
      date: todayIso(),
      time: nowTime(),
      client: { name: '', doc: '', tel: '', place: '' },
      items: [],
      discount: 0,
      pay: 'Efectivo',
      received: 0,
      concept: 'Venta',
      quoteNum: '',
      notes: '',
      void: false,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Nota de venta para cobrar el adelanto o el saldo de una cotización. */
  saleFromQuote(num: string): Sale | null {
    const q = this.get(num);
    if (!q) return null;
    const t = totals(q);
    const paid = this.paidByQuote()[num] || 0;
    const concept = paid > 0 ? 'Saldo' : 'Adelanto';
    const amount = Math.max(0, Math.round((concept === 'Adelanto' ? t.advM : t.tot - paid) * 100) / 100);
    const s = this.newSale();
    s.client = { ...q.client };
    s.concept = concept;
    s.quoteNum = num;
    s.items = [{ desc: `${concept} de la cotización ${num}${q.desc ? ': ' + q.desc.slice(0, 80) : ''}`, unit: 'servicio', qty: 1, price: amount }];
    return s;
  }

  saveSale(s: Sale) {
    const copy: Sale = structuredClone({ ...s, updatedAt: new Date().toISOString() });
    this.sales.update((list) => {
      const i = list.findIndex((x) => x.num === s.num);
      return i < 0 ? [...list, copy] : list.map((x, j) => (j === i ? copy : x));
    });
    // Cobrar un adelanto confirma que el cliente aceptó.
    if (s.quoteNum && !s.void && this.get(s.quoteNum)?.estado === 'Pendiente') this.setEstado(s.quoteNum, 'Aceptada');
    this.touch({ t: 'sale', num: s.num });
  }

  voidSale(num: string, value = true) {
    this.sales.update((list) => list.map((s) => (s.num === num ? { ...s, void: value, updatedAt: new Date().toISOString() } : s)));
    this.touch({ t: 'sale', num });
  }

  // ---------------------------------------------------------------- ajustes
  setCatalog(c: CatalogItem[]) {
    this.catalog.set(c);
    this.touch({ t: 'catalog' });
  }

  setShop(s: Shop) {
    this.shop.set(s);
    this.touch({ t: 'shop' });
  }

  /** Reemplaza todo con lo leído del Excel. */
  // ---------------------------------------------------------------- gastos
  saveExpense(e: Expense) {
    const copy: Expense = { ...e, amount: Math.round((+e.amount || 0) * 100) / 100, updatedAt: new Date().toISOString() };
    copy.id ||= 'G-' + Date.now().toString(36).toUpperCase();
    this.expenses.update((list) => {
      const i = list.findIndex((x) => x.id === copy.id);
      return i < 0 ? [...list, copy] : list.map((x, j) => (j === i ? copy : x));
    });
    this.touch({ t: 'expense', id: copy.id });
    return copy;
  }

  deleteExpense(id: string) {
    this.expenses.update((list) => list.filter((x) => x.id !== id));
    this.touch({ t: 'delExpense', id });
  }

  // ---------------------------------------------------------------- fotos de los servicios
  /** Fotos agrupadas por servicio, ya ordenadas: se calcula una vez por cambio, no en cada pantalla. */
  private readonly fotoIndex = computed(() => {
    const byCode = new Map<string, Foto[]>();
    const byId = new Map<string, string>();
    for (const f of this.fotos()) {
      const x = { ...f, src: fixRef(f.src) };
      byId.set(f.id, x.src);
      const list = byCode.get(f.code);
      if (list) list.push(x);
      else byCode.set(f.code, [x]);
    }
    for (const list of byCode.values()) list.sort((a, b) => a.n - b.n);
    return { byCode, byId };
  });
  private static readonly NONE: Foto[] = [];

  fotosOf(code: string): Foto[] {
    return this.fotoIndex().byCode.get(code) ?? Store.NONE;
  }

  /** La imagen de una línea de cotización ('' si la foto se borró). */
  fotoSrc(ref?: string) {
    if (!ref) return '';
    return ref.startsWith('f:') ? (this.fotoIndex().byId.get(ref.slice(2)) ?? '') : fixRef(ref);
  }

  saveFoto(f: Foto) {
    this.fotos.update((list) => [...list.filter((x) => x.id !== f.id), f]);
    this.touch({ t: 'foto', id: f.id });
  }

  deleteFoto(id: string) {
    this.fotos.update((list) => list.filter((x) => x.id !== id));
    this.touch({ t: 'delFoto', id });
  }

  // ---------------------------------------------------------------- papelera de servicios
  /** Quita el servicio de la lista y lo guarda en la papelera con sus fotos. */
  trashService(code: string) {
    const item = this.catalog().find((c) => c.code === code);
    if (!item) return;
    const fotos = this.fotos().filter((f) => f.code === code);
    this.trash.update((list) => [{ item: structuredClone(item), fotos, at: new Date().toISOString() }, ...fresh(list).filter((x) => x.item.code !== code)]);
    this.setCatalog(this.catalog().filter((c) => c.code !== code));
    for (const f of fotos) this.deleteFoto(f.id);
  }

  /** Devuelve el servicio a la lista con sus fotos. Si el código ya se usa, le da uno nuevo. */
  restoreService(at: string): CatalogItem | null {
    const t = this.trash().find((x) => x.at === at);
    if (!t) return null;
    const used = new Set(this.catalog().map((c) => c.code));
    let code = t.item.code;
    if (used.has(code)) {
      let n = 1;
      while (used.has(`SV-${String(n).padStart(3, '0')}`)) n++;
      code = `SV-${String(n).padStart(3, '0')}`;
    }
    const item = { ...t.item, code };
    this.setCatalog([...this.catalog(), item]);
    for (const f of t.fotos) this.saveFoto({ ...f, code });
    this.trash.update((list) => list.filter((x) => x.at !== at));
    return item;
  }

  /** Borra para siempre de la papelera. */
  purgeTrash(at?: string) {
    this.trash.update((list) => (at ? list.filter((x) => x.at !== at) : []));
  }

  /** Gastos por cotización ('' = generales). */
  readonly spentByQuote = computed(() => {
    const m: Record<string, number> = {};
    for (const e of this.expenses()) m[e.quoteNum] = Math.round(((m[e.quoteNum] || 0) + e.amount) * 100) / 100;
    return m;
  });

  replaceAll(data: { catalog?: CatalogItem[]; quotes?: Quote[]; sales?: Sale[]; expenses?: Expense[]; fotos?: Foto[]; shop?: Partial<Shop> }) {
    if (data.catalog) this.catalog.set(data.catalog);
    if (data.quotes) this.quotes.set(data.quotes);
    if (data.sales) this.sales.set(data.sales);
    if (data.expenses) this.expenses.set(data.expenses);
    if (data.fotos) this.fotos.set(data.fotos);
    if (data.shop) this.shop.set({ ...DEFAULT_SHOP, ...data.shop });
    this.dirty.set(false);
  }

  monthStats() {
    const ym = todayIso().slice(0, 7);
    const igv = this.shop().igv;
    const month = this.quotes().filter((q) => q.date.startsWith(ym));
    const won = month.filter((q) => q.estado === 'Aceptada');
    const sold = this.sales().filter((s) => !s.void && s.date.startsWith(ym));
    const paid = this.paidByQuote();
    const owed = this.quotes()
      .filter((q) => q.estado === 'Aceptada')
      .reduce((a, q) => a + Math.max(0, totals(q).tot - (paid[q.num] || 0)), 0);
    return {
      count: month.length,
      quoted: month.reduce((a, q) => a + totals(q).tot, 0),
      won: won.length,
      wonAmount: won.reduce((a, q) => a + totals(q).tot, 0),
      pending: this.quotes().filter((q) => q.estado === 'Pendiente').length,
      salesCount: sold.length,
      cashed: sold.reduce((a, s) => a + saleTotals(s, igv).tot, 0),
      owed,
    };
  }
}

@Injectable({ providedIn: 'root' })
export class Toast {
  readonly msg = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;
  show(m: string, ms = 3500) {
    this.msg.set(m);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.msg.set(null), ms);
  }
}
