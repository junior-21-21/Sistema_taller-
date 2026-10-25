import { Injectable, computed, effect, signal } from '@angular/core';
import { DEFAULT_SHOP } from './default-data';
import { CatalogItem, Client, Estado, Quote, Sale, Shop } from './models';
import { clientKey, nowTime, saleTotals, suggestDays, todayIso, totals } from './calc';

function load<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
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

export type StoreOp =
  | { t: 'quote' | 'delQuote' | 'sale'; num: string }
  | { t: 'catalog' | 'shop' };

/** Estado de la app. Se guarda en el navegador como copia de trabajo y el
 *  SheetService lo guarda en la hoja de Google. */
@Injectable({ providedIn: 'root' })
export class Store {
  readonly catalog = signal<CatalogItem[]>(load('rr.catalog') ?? []);
  readonly quotes = signal<Quote[]>(load('rr.quotes') ?? []);
  readonly sales = signal<Sale[]>(load('rr.sales') ?? []);
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
        e.client = { name: c.name || e.client.name, doc: c.doc || e.client.doc, tel: c.tel || e.client.tel, place: c.place || e.client.place };
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
    effect(() => persist('rr.shop', this.shop()));
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

  private nextQuoteSeq(year: string) {
    return Math.max(0, ...this.quotes().filter((q) => q.date.startsWith(year)).map((q) => q.seq)) + 1;
  }

  newQuote(): Quote {
    const s = this.shop();
    const date = todayIso();
    const year = date.slice(0, 4);
    const seq = this.nextQuoteSeq(year);
    return {
      num: `COT-${year}-${String(seq).padStart(4, '0')}`,
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
      num: `${serie}-${String(seq).padStart(8, '0')}`,
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
  replaceAll(data: { catalog?: CatalogItem[]; quotes?: Quote[]; sales?: Sale[]; shop?: Partial<Shop> }) {
    if (data.catalog) this.catalog.set(data.catalog);
    if (data.quotes) this.quotes.set(data.quotes);
    if (data.sales) this.sales.set(data.sales);
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
