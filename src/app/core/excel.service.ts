import { Injectable, inject } from '@angular/core';
import type { Workbook, Worksheet } from 'exceljs';
import { Store } from './store.service';
import { ESTADOS } from './models';
import { lineTotal, qty, saleTotals, totals } from './calc';

const FILE_NAME = 'runrun-datos.xlsx';
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MONEY = '"S/" #,##0.00';
const ORANGE = 'FFE8650F';

/** Arma una copia en Excel (.xlsx) de todo lo que hay en la hoja de Google, para descargar. */
@Injectable({ providedIn: 'root' })
export class ExcelService {
  private store = inject(Store);

  /** Descarga una copia del Excel (sirve en cualquier navegador y celular). */
  async download() {
    const buf = await this.build();
    const url = URL.createObjectURL(new Blob([buf], { type: XLSX_TYPE }));
    const a = document.createElement('a');
    a.href = url;
    a.download = FILE_NAME;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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
      ['Nombre', s.name], ['RUC', s.ruc], ['Teléfono', s.tel], ['Teléfono 2', s.tel2], ['Dirección', s.address],
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
}
