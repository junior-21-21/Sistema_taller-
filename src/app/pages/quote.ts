import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon, catIcon } from './icon';
import { Hint } from './guide';
import { Router, RouterLink } from '@angular/router';
import { Store, Toast } from '../core/store.service';
import { AREA, CatalogItem, ESTADOS, Quote, QuoteItem, UNITS } from '../core/models';
import { fmt, fmtQty, lineTotal, parseMessage, qty, suggestDays, totals, waLink } from '../core/calc';
import { clientErrors, focusFirstError, hasErrors, itemErrors, payErrors } from '../core/validate';

const DRAFT = 'rr.draft';

@Component({
  selector: 'app-quote',
  imports: [FormsModule, RouterLink, Icon, Hint],
  templateUrl: './quote.html',
  styleUrl: './quote.css',
})
export class QuotePage implements OnInit {
  /** Número de la cotización a editar (viene de la ruta). */
  readonly num = input<string>();

  protected store = inject(Store);
  private toast = inject(Toast);
  private router = inject(Router);

  protected q!: Quote;
  protected step = signal(1);
  protected maxStep = signal(1);
  protected saved = signal(false);
  protected isNew = true;
  protected msg = '';
  protected err = signal('');
  /** Último paso en el que se intentó avanzar: desde ahí se marcan en rojo los campos vacíos. */
  protected tried = signal(0);
  protected search = signal('');
  protected cat = signal('');
  protected daysAuto = true;

  protected readonly steps = ['Cliente', 'Trabajos', 'Pago', 'Enviar'];
  protected readonly tips = [
    '¿Para quién es? Pega el mensaje de WhatsApp del cliente o escribe su nombre y celular.',
    'Toca los trabajos que pidió y pon las medidas en metros. El precio se calcula solo.',
    'Elige el descuento, el adelanto y el plazo. A la derecha ves cuánto paga y cuándo.',
    '¡Listo! Mándala por WhatsApp, saca la hoja en PDF o cobra el adelanto.',
  ];
  protected catIcon = catIcon;
  protected readonly units = UNITS;
  protected readonly estados = ESTADOS;
  protected readonly AREA = AREA;
  protected fmt = fmt;
  protected fmtQty = fmtQty;
  protected qty = qty;
  protected lineTotal = lineTotal;

  protected catalog = computed(() => {
    const s = this.search().trim().toLowerCase();
    const c = this.cat();
    return this.store.catalog().filter((x) => (!c || x.cat === c) && (!s || (x.name + ' ' + x.inc).toLowerCase().includes(s)));
  });

  ngOnInit() {
    const num = this.num();
    const existing = num ? this.store.get(num) : undefined;
    if (existing) {
      this.q = structuredClone(existing);
      this.isNew = false;
      this.daysAuto = false;
      this.maxStep.set(4);
      return;
    }
    if (num) this.toast.show('No encontré esa cotización. Empezamos una nueva.');
    this.q = this.store.newQuote();
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) || 'null') as (Quote & { _step?: number }) | null;
      if (d && !this.store.get(d.num) && (d.items.length || d.client.name)) {
        // Se mantiene el número nuevo por si otra cotización usó el del borrador.
        this.q = { ...d, num: this.q.num, seq: this.q.seq, date: this.q.date };
        this.step.set(Math.min(d._step || 1, 3));
        this.maxStep.set(this.step());
        this.toast.show('Seguimos con la cotización que dejaste a medias.');
      }
    } catch {
      /* sin borrador */
    }
  }

  get t() {
    return totals(this.q);
  }

  // ---- validación
  get ce() {
    return clientErrors(this.q.client);
  }
  get ie() {
    return this.q.items.map(itemErrors);
  }
  get pe() {
    return payErrors(this.q, this.store.shop());
  }
  /** Muestra el error si ya se intentó avanzar o si el campo tiene algo escrito mal. */
  show(step: number, msg: string, value?: unknown) {
    return msg && (this.tried() >= step || (value !== undefined && value !== null && String(value).trim() !== '')) ? msg : '';
  }

  private firstError(upTo: number): { step: number; msg: string } | null {
    if (upTo >= 1 && hasErrors(this.ce)) return { step: 1, msg: 'Revisa los datos del cliente marcados en rojo.' };
    if (upTo >= 2 && !this.q.items.length) return { step: 2, msg: 'Agrega al menos un trabajo.' };
    if (upTo >= 2 && hasErrors(this.ie)) return { step: 2, msg: 'Faltan medidas, cantidades o precios. Están marcados en rojo.' };
    if (upTo >= 3 && hasErrors(this.pe)) return { step: 3, msg: 'Revisa las condiciones de pago marcadas en rojo.' };
    return null;
  }

  /** Guarda el borrador y ajusta el plazo sugerido. */
  touch() {
    if (this.step() === 4) return;
    this.saved.set(false);
    if (this.err() && !this.firstError(this.step())) this.err.set('');
    if (this.daysAuto) this.q.days = suggestDays(this.t.sub);
    if (this.isNew) {
      try {
        localStorage.setItem(DRAFT, JSON.stringify({ ...this.q, _step: this.step() }));
      } catch {
        /* nada */
      }
    }
  }

  // ---- pasos
  go(n: number) {
    if (n > this.step() && !this.check(n - 1)) return;
    if (n === 4) this.save();
    this.step.set(n);
    this.maxStep.update((m) => Math.max(m, n));
    this.err.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  next() {
    this.go(this.step() + 1);
  }

  private check(upTo = this.step()): boolean {
    const e = this.firstError(Math.min(upTo, 3));
    if (!e) return true;
    this.tried.update((t) => Math.max(t, e.step));
    this.step.set(e.step);
    this.err.set(e.msg);
    focusFirstError();
    return false;
  }

  // ---- paso 1
  readMessage() {
    const found = parseMessage(this.msg);
    const names: string[] = [];
    const c = this.q.client;
    if (found.name && !c.name) { c.name = found.name; names.push('nombre'); }
    if (found.doc && !c.doc) { c.doc = found.doc; names.push(found.doc.length === 11 ? 'RUC' : 'DNI'); }
    if (found.tel && !c.tel) { c.tel = found.tel; names.push('teléfono'); }
    if (found.place && !c.place) { c.place = found.place; names.push('lugar'); }
    this.toast.show(names.length ? `Encontré: ${names.join(', ')}. Revisa y completa lo que falte.` : 'No encontré datos claros. Llénalos a mano.');
    this.touch();
  }

  // ---- paso 2
  add(c: CatalogItem) {
    this.q.items.push({ code: c.code, name: c.name, inc: c.inc, unit: c.unit, price: c.material + c.labor, w: null, h: null, q: 1 });
    this.err.set('');
    this.touch();
    this.toast.show(`Agregado: ${c.name}. Pon las medidas.`, 2500);
    setTimeout(() => {
      const els = document.querySelectorAll<HTMLInputElement>('.cart .line:last-child input');
      els[0]?.focus();
    });
  }

  addCustom() {
    this.q.items.push({ code: 'OTRO', name: '', inc: '', unit: 'unidad', price: 0, w: null, h: null, q: 1 });
    this.touch();
  }

  remove(i: number) {
    this.q.items.splice(i, 1);
    this.touch();
  }

  count(code: string) {
    return this.q.items.filter((x) => x.code === code).length;
  }

  // ---- paso 3
  setDiscount(d: number) {
    this.q.discount = Math.min(d, this.store.shop().maxDiscount);
    this.touch();
  }

  setAdvance(a: number) {
    this.q.advance = a;
    this.touch();
  }

  daysEdited() {
    this.daysAuto = false;
    this.touch();
  }

  // ---- paso 4
  save() {
    if (!this.check(3)) return;
    this.store.saveQuote(this.q);
    this.saved.set(true);
    if (this.isNew) {
      try { localStorage.removeItem(DRAFT); } catch { /* nada */ }
      this.isNew = false;
    }
  }

  get waHref() {
    return waLink(this.q, this.store.shop());
  }

  restart() {
    try { localStorage.removeItem(DRAFT); } catch { /* nada */ }
    this.q = this.store.newQuote();
    this.isNew = true;
    this.daysAuto = true;
    this.msg = '';
    this.step.set(1);
    this.maxStep.set(1);
    this.tried.set(0);
    this.err.set('');
    this.saved.set(false);
    this.router.navigate(['/cotizar']);
  }

  isArea(it: QuoteItem) {
    return it.unit === AREA;
  }
}
