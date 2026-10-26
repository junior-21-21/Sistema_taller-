import { Injectable, inject, signal } from '@angular/core';
import { Store, StoreOp, Toast } from './store.service';
import { CatalogItem, ESTADOS, Estado, Quote, Sale, Shop } from './models';
import { lineTotal, qty, saleTotals, totals } from './calc';
import { detailLines, fixDetail } from './detail';

/**
 * Dirección de la hoja de Google del taller (Apps Script publicado como aplicación web).
 * Todo se lee y se guarda ahí: cualquiera que abra el sistema ve los mismos datos.
 */
export const SHEET_URL = 'https://script.google.com/macros/s/AKfycbxil0zDdGGsEYMacLPP-ZyzIJ0BlOmMLrWKTuIzBbIGbuwJRAZbO3cHw2H-D3jtSIsXUQ/exec';

const QUEUE = 'rr.queue';
const REFRESH_MS = 60_000;

type Cell = string | number | boolean | null;
type Op =
  | { type: 'upsert'; sheet: string; key: string; row: Cell[]; detailSheet?: string; detail?: Cell[][] }
  | { type: 'remove'; sheet: string; key: string; detailSheet?: string }
  | { type: 'replace'; sheet: string; rows: Cell[][]; asText?: boolean };

const str = (v: unknown) => String(v ?? '').trim();
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Convierte una hoja (lista de filas) en objetos usando los títulos de la fila 1. */
function rows(sheet: Cell[][] | undefined): Record<string, Cell>[] {
  if (!sheet?.length) return [];
  const head = sheet[0].map((h) => str(h).toLowerCase());
  return sheet
    .slice(1)
    .filter((r) => r.some((c) => str(c)))
    // Columnas sin título quedan con la llave '' (por ejemplo, datos agregados en hojas antiguas).
    .map((r) => Object.fromEntries(r.map((v, i) => [head[i] ?? '', v ?? '']).filter(([h, v], i) => h || i >= head.length || str(v))));
}

@Injectable({ providedIn: 'root' })
export class SheetService {
  private store = inject(Store);
  private toast = inject(Toast);

  readonly configured = !!SHEET_URL;
  /** none: falta la dirección · loading: leyendo · ok: al día · saving: guardando · offline: sin conexión (se guardará al volver). */
  readonly status = signal<'none' | 'loading' | 'ok' | 'saving' | 'offline'>(SHEET_URL ? 'loading' : 'none');
  /** Enlace para abrir la hoja de Google. */
  readonly sheetUrl = signal('');
  readonly loaded = signal(false);

  private queue: Op[] = [];
  private flushing = false;
  private retry: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    if (!SHEET_URL) return;
    try {
      this.queue = JSON.parse(localStorage.getItem(QUEUE) || '[]');
    } catch {
      this.queue = [];
    }
    this.store.onChange = (op) => this.enqueue(op);
    this.start();
    window.addEventListener('online', () => this.flush());
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && this.refresh());
    setInterval(() => document.visibilityState === 'visible' && this.refresh(), REFRESH_MS);
  }

  private async start() {
    if (this.queue.length) await this.flush();
    await this.load(false);
  }

  /** Trae los cambios que hicieron otras personas (solo si aquí no hay nada por guardar). */
  async refresh() {
    if (!this.queue.length && !this.flushing) await this.load(true);
  }

  async load(quiet: boolean) {
    if (!quiet) this.status.set('loading');
    try {
      const r = await fetch(SHEET_URL);
      const data = (await r.json()) as { ok: boolean; sheets: Record<string, Cell[][]>; url: string; error?: string };
      if (!data.ok) throw new Error(data.error);
      // Si mientras tanto alguien guardó aquí, no se pisa lo nuevo.
      if (this.queue.length) return;
      this.apply(data.sheets);
      this.sheetUrl.set(data.url);
      this.loaded.set(true);
      this.status.set('ok');
    } catch {
      if (!quiet) {
        this.status.set('offline');
        this.toast.show(this.loaded() ? 'Sin conexión con la hoja de Google.' : 'No pude leer la hoja de Google. Revisa tu internet; trabajas con lo último que se guardó en este equipo.', 6000);
      }
    }
  }

  private apply(sheets: Record<string, Cell[][]>) {
    // La columna I guarda los materiales del servicio (en hojas antiguas puede no tener título).
    const catalog: CatalogItem[] = rows(sheets['Precios'])
      .map((r) => {
        const c: CatalogItem = {
          code: str(r['código']), cat: str(r['categoría']) || 'Otros', name: str(r['trabajo']), inc: str(r['qué incluye']),
          unit: str(r['unidad']) || 'unidad', material: num(r['material']), labor: num(r['mano de obra']),
        };
        const raw = str(r['detalle (no editar)'] || r['']);
        try {
          if (raw) c.detail = fixDetail(JSON.parse(raw));
        } catch {
          /* texto escrito a mano: se ignora */
        }
        return c;
      })
      .filter((c) => c.name);
    catalog.forEach((c, i) => (c.code ||= `X-${String(i + 1).padStart(2, '0')}`));

    const quotes: Quote[] = [];
    for (const r of rows(sheets['Cotizaciones'])) {
      try {
        const q = JSON.parse(str(r['datos (no editar)'])) as Quote;
        const est = str(r['estado']) as Estado;
        if (ESTADOS.includes(est)) q.estado = est;
        quotes.push(q);
      } catch {
        /* fila escrita a mano sin datos */
      }
    }

    const sales: Sale[] = [];
    for (const r of rows(sheets['Ventas'])) {
      try {
        const v = JSON.parse(str(r['datos (no editar)'])) as Sale;
        v.void = /^s[ií]/i.test(str(r['anulada']));
        sales.push(v);
      } catch {
        /* fila sin datos */
      }
    }

    const t: Record<string, string> = {};
    for (const r of rows(sheets['Taller'])) t[str(r['dato']).toLowerCase()] = str(r['valor']);
    const shop: Partial<Shop> = {};
    if (t['nombre']) shop.name = t['nombre'];
    shop.ruc = t['ruc'] ?? '';
    shop.tel = t['teléfono'] ?? '';
    if (t['dirección']) shop.address = t['dirección'];
    shop.rep = t['representante'] ?? '';
    shop.repDni = t['dni del representante'] ?? '';
    if (t['adelanto %']) shop.advance = +t['adelanto %'] || 50;
    if (t['validez (días)']) shop.validity = +t['validez (días)'] || 15;
    if (t['garantía (meses)']) shop.warranty = +t['garantía (meses)'] || 0;
    if (t['descuento máximo %']) shop.maxDiscount = +t['descuento máximo %'] || 15;
    if (t['incluir igv']) shop.igv = /^s[ií]/i.test(t['incluir igv']);
    if (t['serie de notas de venta']) shop.serie = t['serie de notas de venta'];
    if (t['pie de la boleta'] !== undefined) shop.footer = t['pie de la boleta'];
    shop.payInfo = t['yape / plin / cuenta'] ?? '';

    this.store.replaceAll({ catalog, quotes, sales, shop: Object.keys(t).length ? shop : undefined });
  }

  // ------------------------------------------------------------------ guardar
  private enqueue(change: StoreOp) {
    const op = this.toOp(change);
    if (!op) return;
    // Solo importa el último cambio de cada cosa.
    const same = (o: Op) =>
      o.sheet === op.sheet && (op.type === 'replace' ? o.type === 'replace' : o.type !== 'replace' && 'key' in op && o.key === op.key);
    this.queue = [...this.queue.filter((o) => !same(o)), op];
    this.persist();
    this.flush();
  }

  private toOp(c: StoreOp): Op | null {
    const igv = this.store.shop().igv;
    switch (c.t) {
      case 'quote': {
        const q = this.store.get(c.num);
        if (!q) return null;
        const t = totals(q);
        return {
          type: 'upsert', sheet: 'Cotizaciones', key: q.num,
          row: [q.num, q.date, q.client.name, q.client.doc, q.client.tel, q.client.place, q.desc, t.sub, q.discount, t.igv, t.tot,
            q.advance, q.days, q.estado, q.notes, JSON.stringify(q)],
          detailSheet: 'Detalle',
          detail: q.items.map((it) => [q.num, q.client.name, it.code, it.name, it.unit, it.w ?? '', it.h ?? '', it.q,
            Math.round(qty(it) * 100) / 100, it.price, lineTotal(it), q.estado, detailLines(it.detail).join('; ')]),
        };
      }
      case 'delQuote':
        return { type: 'remove', sheet: 'Cotizaciones', key: c.num, detailSheet: 'Detalle' };
      case 'sale': {
        const v = this.store.getSale(c.num);
        if (!v) return null;
        return {
          type: 'upsert', sheet: 'Ventas', key: v.num,
          row: [v.num, v.date, v.time, v.client.name, v.client.doc, v.concept, v.quoteNum, v.pay, +v.discount || 0,
            saleTotals(v, igv).tot, v.void ? 'Sí' : 'No', JSON.stringify(v)],
          detailSheet: 'Ventas detalle',
          detail: v.void ? [] : v.items.map((it) => [v.num, v.date, it.desc, it.unit, +it.qty || 0, +it.price || 0,
            Math.round((+it.qty || 0) * (+it.price || 0) * 100) / 100]),
        };
      }
      case 'catalog':
        return {
          type: 'replace', sheet: 'Precios',
          rows: this.store.catalog().map((x) => [x.code, x.cat, x.name, x.inc, x.unit, x.material, x.labor, x.material + x.labor, x.detail ? JSON.stringify(x.detail) : '']),
        };
      case 'shop': {
        const s = this.store.shop();
        const kv: [string, string | number][] = [
          ['Nombre', s.name], ['RUC', s.ruc], ['Teléfono', s.tel], ['Dirección', s.address],
          ['Representante', s.rep], ['DNI del representante', s.repDni], ['Adelanto %', s.advance],
          ['Validez (días)', s.validity], ['Garantía (meses)', s.warranty], ['Descuento máximo %', s.maxDiscount],
          ['Incluir IGV', s.igv ? 'Sí' : 'No'], ['Serie de notas de venta', s.serie], ['Pie de la boleta', s.footer],
          ['Yape / Plin / cuenta', s.payInfo],
        ];
        return { type: 'replace', sheet: 'Taller', rows: kv.map(([k, v]) => [k, String(v ?? '')]), asText: true };
      }
    }
  }

  private persist() {
    try {
      localStorage.setItem(QUEUE, JSON.stringify(this.queue));
    } catch {
      /* nada */
    }
  }

  async flush() {
    if (this.flushing || !this.queue.length) return;
    this.flushing = true;
    clearTimeout(this.retry);
    this.status.set('saving');
    const batch = [...this.queue];
    try {
      // text/plain evita el permiso previo del navegador (CORS) que Apps Script no responde.
      const r = await fetch(SHEET_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ ops: batch }) });
      const res = (await r.json()) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error);
      // Se quitan solo los que se mandaron (pudieron entrar otros mientras tanto).
      this.queue = this.queue.filter((o) => !batch.includes(o));
      this.persist();
      if (!this.queue.length) {
        this.store.dirty.set(false);
        this.status.set('ok');
      }
    } catch {
      this.status.set('offline');
      this.retry = setTimeout(() => this.flush(), 15_000);
    } finally {
      this.flushing = false;
    }
    if (this.queue.length && this.status() !== 'offline') this.flush();
  }
}
