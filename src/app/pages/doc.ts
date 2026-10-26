import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store.service';
import { AREA, isCompany } from '../core/models';
import { detailLines } from '../core/detail';
import { addDays, fmt, fmtDate, fmtQty, inWords, lineTotal, qty, shopTels, totals, waLink } from '../core/calc';

const CLAUSES = [
  'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
  'UNDÉCIMA', 'DUODÉCIMA', 'DECIMOTERCERA', 'DECIMOCUARTA', 'DECIMOQUINTA', 'DECIMOSEXTA',
];

@Component({
  selector: 'app-doc',
  imports: [RouterLink],
  templateUrl: './doc.html',
  styleUrl: './doc.css',
})
export class DocPage {
  readonly num = input.required<string>();
  readonly tipo = input<string>('cotizacion');

  protected store = inject(Store);
  protected q = computed(() => this.store.get(this.num()));
  protected co = computed(() => { const q = this.q(); return !!q && isCompany(q.client); });
  protected t = computed(() => (this.q() ? totals(this.q()!) : null));
  protected shop = this.store.shop;
  protected tels = computed(() => shopTels(this.shop()));
  protected isContract = computed(() => this.tipo() === 'contrato');
  protected conNum = computed(() => this.num().replace('COT', 'CON'));

  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected fmtQty = fmtQty;
  protected qty = qty;
  protected lineTotal = lineTotal;
  protected inWords = inWords;
  protected detailLines = detailLines;
  protected addDays = addDays;
  protected AREA = AREA;
  protected blank = '______________';

  /** Numeración de cláusulas: la de multa solo aparece si hay multa. */
  protected clause = computed(() => {
    const names = ['objeto', 'precio', 'pago', 'plazo', 'contratista', 'cliente', 'entrega', 'cambios', 'garantia'];
    if (this.q()?.penalty) names.push('multa');
    names.push('fuerza', 'desiste', 'domicilio');
    if (this.q()?.notes) names.push('notas');
    return Object.fromEntries(names.map((n, i) => [n, CLAUSES[i]])) as Record<string, string>;
  });

  /** Lo cobrado con notas de venta y lo que falta. */
  protected paid = computed(() => Math.round((this.store.paidByQuote()[this.num()] || 0) * 100) / 100);
  protected left = computed(() => Math.max(0, Math.round(((this.t()?.tot ?? 0) - this.paid()) * 100) / 100));
  protected anyInstall = computed(() => !!this.q()?.items.some((it) => !it.detail || it.detail.instalacion));
  protected amtErr = signal('');

  protected pct(a: number, b: number) {
    return b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
  }

  /** Cambia el adelanto desde la hoja del contrato (se guarda en la cotización). */
  setPct(p: number) {
    const q = this.q();
    if (!q) return;
    this.amtErr.set('');
    this.store.saveQuote({ ...q, advance: p, advanceAmt: undefined });
  }

  setAmt(v: string) {
    const q = this.q();
    if (!q) return;
    const n = Math.round(+v * 100) / 100;
    if (!v || !(n > 0)) {
      this.amtErr.set('');
      if (q.advanceAmt) this.store.saveQuote({ ...q, advanceAmt: undefined });
      return;
    }
    if (n > this.t()!.tot) return this.amtErr.set(`No puede ser más que el total (${fmt(this.t()!.tot)}).`);
    this.amtErr.set('');
    this.store.saveQuote({ ...q, advanceAmt: n });
  }

  protected wa = computed(() => (this.q() ? waLink(this.q()!, this.shop()) : '#'));

  print() {
    const prev = document.title;
    document.title = `${this.isContract() ? this.conNum() : this.num()} ${this.q()?.client.name ?? ''}`.trim();
    window.print();
    document.title = prev;
  }

  trimDot(s: string) {
    return s.trim().replace(/\.+$/, '');
  }
}
