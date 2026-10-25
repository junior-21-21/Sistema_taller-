import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store.service';
import { AREA } from '../core/models';
import { addDays, fmt, fmtDate, fmtQty, inWords, lineTotal, qty, totals, waLink } from '../core/calc';

const CLAUSES = ['PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'UNDÉCIMA', 'DUODÉCIMA'];

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
  protected t = computed(() => (this.q() ? totals(this.q()!) : null));
  protected shop = this.store.shop;
  protected isContract = computed(() => this.tipo() === 'contrato');
  protected conNum = computed(() => this.num().replace('COT', 'CON'));

  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected fmtQty = fmtQty;
  protected qty = qty;
  protected lineTotal = lineTotal;
  protected inWords = inWords;
  protected addDays = addDays;
  protected AREA = AREA;
  protected blank = '______________';

  /** Numeración de cláusulas: la de multa solo aparece si hay multa. */
  protected clause = computed(() => {
    const names = ['objeto', 'precio', 'pago', 'plazo', 'contratista', 'cliente', 'cambios', 'garantia'];
    if (this.q()?.penalty) names.push('multa');
    names.push('desiste', 'controversias');
    return Object.fromEntries(names.map((n, i) => [n, CLAUSES[i]])) as Record<string, string>;
  });

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
