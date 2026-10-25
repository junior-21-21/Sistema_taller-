import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import type { Workbook, Worksheet, CellValue } from 'exceljs';
import { Store, Toast } from './store.service';
import { CatalogItem, ESTADOS, Estado, Quote, Sale, Shop } from './models';
import { lineTotal, qty, saleTotals, totals } from './calc';

const FILE_NAME = 'runrun-datos.xlsx';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const PICKER_TYPES = [{ description: 'Archivo de Excel', accept: { [XLSX_TYPE]: ['.xlsx'] } }];
const MONEY = '"S/" #,##0.00';
const ORANGE = 'FFE8650F';

// ---- Guardar el "permiso" al archivo entre visitas (IndexedDB) ----
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('runrun', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idb();
  return new Promise((res) => {
    const r = db.transaction('kv').objectStore('kv').get(key);
    r.onsuccess = () => res(r.result as T);
    r.onerror = () => res(undefined);
  });
}
async function idbSet(key: string, value: unknown) {
  const db = await idb();
  return new Promise<void>((res) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

function val(v: CellValue): unknown {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('result' in v) return (v as { result: unknown }).result;
    if ('richText' in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join('');
    if ('text' in v) return (v as { text: string }).text;
  }
  return v;
}
const str = (v: CellValue) => String(val(v) ?? '').trim();
const num = (v: CellValue) => {
  const n = parseFloat(String(val(v) ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Lee una hoja usando los títulos de la fila 1, así no importa si se mueven las columnas. */
function readRows(ws: Worksheet | undefined): Record<string, CellValue>[] {
  if (!ws) return [];
  const head: Record<number, string> = {};
  ws.getRow(1).eachCell((c, i) => (head[i] = str(c.value).toLowerCase()));
  const rows: Record<string, CellValue>[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const r: Record<string, CellValue> = {};
    row.eachCell((c, i) => head[i] && (r[head[i]] = c.value));
    if (Object.keys(r).length) rows.push(r);
  });
  return rows;
}

type Handle = FileSystemFileHandle & {
  queryPermission(o: { mode: string }): Promise<PermissionState>;
  requestPermission(o: { mode: string }): Promise<PermissionState>;
  createWritable(): Promise<{ write(d: BlobPart): Promise<void>; close(): Promise<void> }>;
};
type PickerWindow = Window & {
  showSaveFilePicker(o: object): Promise<Handle>;
  showOpenFilePicker(o: object): Promise<Handle[]>;
};

@Injectable({ providedIn: 'root' })
export class ExcelService {
  private store = inject(Store);
  private toast = inject(Toast);
  private handle: Handle | null = null;

  /** Chrome y Edge en computadora pueden escribir directo en el archivo. */
  readonly canLink = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  readonly fileName = signal<string | null>(null);
  readonly status = signal<'none' | 'linked' | 'needs-permission'>('none');
  readonly saving = signal(false);

  constructor() {
    this.restore();
    // Cada cambio se escribe en el Excel enlazado.
    effect(() => {
      if (this.store.changes() === 0) return;
      untracked(() => this.autosave());
    });
  }

  private async restore() {
    if (!this.canLink) return;
    const h = await idbGet<Handle>('excel').catch(() => undefined);
    if (!h) return;
    this.handle = h;
    this.fileName.set(h.name);
    const p = await h.queryPermission({ mode: 'readwrite' }).catch(() => 'prompt' as PermissionState);
    this.status.set(p === 'granted' ? 'linked' : 'needs-permission');
  }

  private timer: ReturnType<typeof setTimeout> | undefined;
  private autosave() {
    if (this.status() !== 'linked') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.saveNow(), 600);
  }

  /** Vuelve a dar permiso al archivo después de cerrar el navegador. */
  async reconnect() {
    if (!this.handle) return;
    const p = await this.handle.requestPermission({ mode: 'readwrite' });
    if (p !== 'granted') return;
    this.status.set('linked');
    if (this.store.dirty()) await this.saveNow();
    else await this.importBuffer(await (await this.handle.getFile()).arrayBuffer(), false);
  }

  async createFile() {
    try {
      const h = await (window as unknown as PickerWindow).showSaveFilePicker({ suggestedName: FILE_NAME, types: PICKER_TYPES });
      await this.link(h);
      await this.saveNow();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') this.toast.show('No se pudo crear el archivo.');
    }
  }

  async openFile() {
    try {
      const [h] = await (window as unknown as PickerWindow).showOpenFilePicker({ types: PICKER_TYPES });
      const p = await h.requestPermission({ mode: 'readwrite' });
      await this.importBuffer(await (await h.getFile()).arrayBuffer(), true);
      await this.link(h, p === 'granted');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') this.toast.show('No se pudo abrir ese archivo. ¿Es un Excel de Run Run?');
    }
  }

  private async link(h: Handle, granted = true) {
    this.handle = h;
    this.fileName.set(h.name);
    this.status.set(granted ? 'linked' : 'needs-permission');
    await idbSet('excel', h).catch(() => undefined);
  }

  /** Para celulares y navegadores sin acceso directo: subir un Excel. */
  async importFile(file: File) {
    try {
      await this.importBuffer(await file.arrayBuffer(), true);
    } catch {
      this.toast.show('No se pudo leer ese archivo. ¿Es un Excel de Run Run?');
    }
  }

  async saveNow(): Promise<boolean> {
    if (!this.handle || this.status() !== 'linked') return false;
    this.saving.set(true);
    try {
      const buf = await this.build();
      const w = await this.handle.createWritable();
      await w.write(buf);
      await w.close();
      this.store.dirty.set(false);
      return true;
    } catch (e) {
      const name = (e as Error).name;
      if (name === 'NotAllowedError') this.status.set('needs-permission');
      this.toast.show(
        name === 'NoModificationAllowedError' || name === 'InvalidStateError'
          ? 'No se pudo guardar: cierra el Excel si lo tienes abierto y vuelve a intentar.'
          : 'No se pudo guardar en el Excel. Tus datos siguen guardados en este navegador.',
        6000,
      );
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  /** Descarga una copia del Excel (sirve en cualquier navegador y celular). */
  async download() {
    const buf = await this.build();
    const url = URL.createObjectURL(new Blob([buf], { type: XLSX_TYPE }));
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (this.status() !== 'linked') this.store.dirty.set(false);
  }

  private async lib() {
    const mod = (await import('exceljs')) as unknown as { default?: typeof import('exceljs') } & typeof import('exceljs');
    return mod.default ?? mod;
  }

  // ------------------------------------------------------------------ escribir
  private async build(): Promise<ArrayBuffer> {
    const ExcelJS = await this.lib();
    const wb: Workbook = new ExcelJS.Workbook();
    wb.creator = 'Cotizador Run Run';
    const s = this.store.shop();
    const quotes = this.store.sortedQuotes();

    const head = (ws: Worksheet) => {
      const r = ws.getRow(1);
      r.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } };
      r.alignment = { vertical: 'middle', wrapText: true };
      r.height = 30;
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    };

    // Cotizaciones: una fila por cotización
    const wq = wb.addWorksheet('Cotizaciones');
    wq.columns = [
      { header: 'Número', key: 'num', width: 16 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Cliente', key: 'name', width: 28 },
      { header: 'DNI / RUC', key: 'doc', width: 14 },
      { header: 'Teléfono', key: 'tel', width: 14 },
      { header: 'Lugar de la obra', key: 'place', width: 28 },
      { header: 'Trabajo', key: 'desc', width: 40 },
      { header: 'Subtotal', key: 'sub', width: 13, style: { numFmt: MONEY } },
      { header: 'Descuento %', key: 'discount', width: 11 },
      { header: 'IGV', key: 'igv', width: 11, style: { numFmt: MONEY } },
      { header: 'Total', key: 'tot', width: 14, style: { numFmt: MONEY } },
      { header: 'Adelanto %', key: 'advance', width: 10 },
      { header: 'Plazo (días)', key: 'days', width: 10 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Notas', key: 'notes', width: 30 },
      { header: 'Datos (no editar)', key: 'json', width: 12 },
    ];
    for (const q of quotes) {
      const t = totals(q);
      wq.addRow({
        num: q.num, date: q.date, name: q.client.name, doc: q.client.doc, tel: q.client.tel, place: q.client.place,
        desc: q.desc, sub: t.sub, discount: q.discount, igv: t.igv, tot: t.tot, advance: q.advance, days: q.days,
        estado: q.estado, notes: q.notes, json: JSON.stringify(q),
      });
    }
    head(wq);
    wq.getColumn('json').hidden = true;
    for (let r = 2; r <= Math.max(quotes.length + 1, 200); r++) {
      wq.getCell(r, 14).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${ESTADOS.join(',')}"`] };
    }

    // Detalle: una fila por trabajo, para filtrar y sumar en Excel
    const wd = wb.addWorksheet('Detalle');
    wd.columns = [
      { header: 'Número', key: 'num', width: 16 },
      { header: 'Cliente', key: 'name', width: 24 },
      { header: 'Código', key: 'code', width: 9 },
      { header: 'Trabajo', key: 'work', width: 36 },
      { header: 'Unidad', key: 'unit', width: 9 },
      { header: 'Ancho (m)', key: 'w', width: 10 },
      { header: 'Alto (m)', key: 'h', width: 10 },
      { header: 'Piezas / cantidad', key: 'q', width: 12 },
      { header: 'Cantidad total', key: 'qty', width: 12 },
      { header: 'Precio unitario', key: 'price', width: 14, style: { numFmt: MONEY } },
      { header: 'Importe', key: 'line', width: 14, style: { numFmt: MONEY } },
      { header: 'Estado', key: 'estado', width: 12 },
    ];
    for (const q of quotes)
      for (const it of q.items)
        wd.addRow({
          num: q.num, name: q.client.name, code: it.code, work: it.name, unit: it.unit, w: it.w, h: it.h, q: it.q,
          qty: Math.round(qty(it) * 100) / 100, price: it.price, line: lineTotal(it), estado: q.estado,
        });
    head(wd);

    // Ventas: una fila por nota de venta
    const sales = this.store.sortedSales();
    const wv = wb.addWorksheet('Ventas');
    wv.columns = [
      { header: 'Número', key: 'num', width: 18 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Hora', key: 'time', width: 8 },
      { header: 'Cliente', key: 'name', width: 28 },
      { header: 'DNI / RUC', key: 'doc', width: 14 },
      { header: 'Concepto', key: 'concept', width: 11 },
      { header: 'Cotización', key: 'quote', width: 16 },
      { header: 'Forma de pago', key: 'pay', width: 14 },
      { header: 'Descuento', key: 'discount', width: 12, style: { numFmt: MONEY } },
      { header: 'Total', key: 'tot', width: 14, style: { numFmt: MONEY } },
      { header: 'Anulada', key: 'void', width: 9 },
      { header: 'Datos (no editar)', key: 'json', width: 12 },
    ];
    for (const v of sales) {
      wv.addRow({
        num: v.num, date: v.date, time: v.time, name: v.client.name, doc: v.client.doc, concept: v.concept, quote: v.quoteNum,
        pay: v.pay, discount: +v.discount || 0, tot: saleTotals(v, s.igv).tot, void: v.void ? 'Sí' : 'No', json: JSON.stringify(v),
      });
    }
    head(wv);
    wv.getColumn('json').hidden = true;

    const wvd = wb.addWorksheet('Ventas detalle');
    wvd.columns = [
      { header: 'Número', key: 'num', width: 18 },
      { header: 'Fecha', key: 'date', width: 12 },
      { header: 'Descripción', key: 'desc', width: 50 },
      { header: 'Unidad', key: 'unit', width: 10 },
      { header: 'Cantidad', key: 'qty', width: 10 },
      { header: 'Precio unitario', key: 'price', width: 14, style: { numFmt: MONEY } },
      { header: 'Importe', key: 'line', width: 14, style: { numFmt: MONEY } },
    ];
    for (const v of sales)
      if (!v.void)
        for (const it of v.items)
          wvd.addRow({ num: v.num, date: v.date, desc: it.desc, unit: it.unit, qty: +it.qty || 0, price: +it.price || 0, line: Math.round((+it.qty || 0) * (+it.price || 0) * 100) / 100 });
    head(wvd);

    // Precios: aquí se cambian los precios
    const wp = wb.addWorksheet('Precios');
    wp.columns = [
      { header: 'Código', key: 'code', width: 9 },
      { header: 'Categoría', key: 'cat', width: 20 },
      { header: 'Trabajo', key: 'name', width: 38 },
      { header: 'Qué incluye', key: 'inc', width: 46 },
      { header: 'Unidad', key: 'unit', width: 9 },
      { header: 'Material', key: 'material', width: 12, style: { numFmt: MONEY } },
      { header: 'Mano de obra', key: 'labor', width: 13, style: { numFmt: MONEY } },
      { header: 'Precio total', key: 'total', width: 13, style: { numFmt: MONEY } },
    ];
    this.store.catalog().forEach((c, i) => {
      const r = i + 2;
      wp.addRow({ ...c, total: { formula: `F${r}+G${r}`, result: c.material + c.labor } });
      wp.getCell(r, 6).font = { color: { argb: 'FF0000FF' } };
      wp.getCell(r, 7).font = { color: { argb: 'FF0000FF' } };
    });
    head(wp);

    // Taller: datos del negocio y valores por defecto
    const wt = wb.addWorksheet('Taller');
    wt.columns = [
      { header: 'Dato', key: 'k', width: 30 },
      { header: 'Valor', key: 'v', width: 36 },
    ];
    const shopRows: [string, string | number][] = [
      ['Nombre', s.name], ['RUC', s.ruc], ['Teléfono', s.tel], ['Dirección', s.address],
      ['Representante', s.rep], ['DNI del representante', s.repDni], ['Adelanto %', s.advance],
      ['Validez (días)', s.validity], ['Garantía (meses)', s.warranty], ['Descuento máximo %', s.maxDiscount],
      ['Incluir IGV', s.igv ? 'Sí' : 'No'], ['Serie de notas de venta', s.serie], ['Pie de la boleta', s.footer],
      ['Yape / Plin / cuenta', s.payInfo],
    ];
    shopRows.forEach(([k, v]) => wt.addRow({ k, v }));
    head(wt);
    wt.getColumn(1).font = { bold: true };
    wt.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  }

  // ------------------------------------------------------------------ leer
  private async importBuffer(buf: ArrayBuffer, announce: boolean) {
    const ExcelJS = await this.lib();
    const wb: Workbook = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);

    const catalog: CatalogItem[] = readRows(wb.getWorksheet('Precios'))
      .map((r) => ({
        code: str(r['código']), cat: str(r['categoría']) || 'Otros', name: str(r['trabajo']), inc: str(r['qué incluye']),
        unit: str(r['unidad']) || 'unidad', material: num(r['material']), labor: num(r['mano de obra']),
      }))
      .filter((c) => c.name);
    catalog.forEach((c, i) => (c.code ||= `X-${String(i + 1).padStart(2, '0')}`));

    const quotes: Quote[] = [];
    for (const r of readRows(wb.getWorksheet('Cotizaciones'))) {
      try {
        const q = JSON.parse(str(r['datos (no editar)'])) as Quote;
        const est = str(r['estado']) as Estado;
        if (ESTADOS.includes(est)) q.estado = est;
        quotes.push(q);
      } catch {
        /* fila escrita a mano sin datos: se ignora */
      }
    }

    const sales: Sale[] = [];
    for (const r of readRows(wb.getWorksheet('Ventas'))) {
      try {
        const v = JSON.parse(str(r['datos (no editar)'])) as Sale;
        v.void = /^s[ií]/i.test(str(r['anulada']));
        sales.push(v);
      } catch {
        /* fila sin datos */
      }
    }

    const t: Record<string, string> = {};
    for (const r of readRows(wb.getWorksheet('Taller'))) t[str(r['dato']).toLowerCase()] = str(r['valor']);
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
    if (announce) this.toast.show(`Excel cargado: ${quotes.length} cotizaciones, ${sales.length} ventas y ${catalog.length} precios.`);
  }
}
