import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon, catIcon } from './icon';
import { DetailEditor } from './detail-editor';
import { CloseDeal } from './close-deal';
import { DoorCatalog } from './door-catalog';
import { ADD_MODEL } from './catalog';
import { MODELOS, Modelo, modeloItem } from '../core/catalogo';
import { detailLines, emptyDetail, fixDetail, hasDetail } from '../core/detail';
import { NeedExcel } from './need-excel';
import { SheetService } from '../core/sheet.service';
import { Router, RouterLink } from '@angular/router';
import { Store, Toast } from '../core/store.service';
import { AREA, CatalogItem, ESTADOS, Quote, QuoteItem, UNITS, isCompany } from '../core/models';
import { advLabel, balLabel, fmt, fmtQty, lineTotal, qty, suggestDays, totals, waLink } from '../core/calc';
import { clientErrors, focusFirstError, hasErrors, itemErrors, payErrors } from '../core/validate';

const DRAFT = 'rr.draft';

@Component({
  selector: 'app-quote',
  imports: [FormsModule, RouterLink, Icon, NeedExcel, DetailEditor, CloseDeal, DoorCatalog],
  templateUrl: './quote.html',
  styleUrl: './quote.css',
})
export class QuotePage implements OnInit {
  /** Número de la cotización a editar (viene de la ruta). */
  readonly num = input<string>();

  protected store = inject(Store);
  protected sheet = inject(SheetService);
  private toast = inject(Toast);
  protected armed = signal(false);
  private router = inject(Router);

  protected q!: Quote;
  protected step = signal(1);
  protected maxStep = signal(1);
  protected saved = signal(false);
  protected isNew = true;
  protected err = signal('');
  /** Último paso en el que se intentó avanzar: desde ahí se marcan en rojo los campos vacíos. */
  protected tried = signal(0);
  protected search = signal('');
  protected cat = signal('');
  protected daysAuto = true;

  protected readonly steps = ['Cliente', 'Trabajos', 'Pago', 'Enviar'];
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
    // Viene del catálogo de puertas con un modelo elegido.
    let code: string | null = null;
    try {
      code = localStorage.getItem(ADD_MODEL);
      localStorage.removeItem(ADD_MODEL);
    } catch {
      /* sin almacenamiento */
    }
    const m = MODELOS.find((x) => x.code === code);
    if (m) {
      this.addModel(m);
      if (this.step() === 1 && !this.q.client.name) this.toast.show(`Agregado ${m.code}. Ahora escribe los datos del cliente.`, 3000);
    }
  }

  get t() {
    return totals(this.q);
  }

  // ---- validación
  // ---- cliente
  protected company = () => isCompany(this.q.client);
  protected known = signal(false);

  setKind(k: 'persona' | 'empresa') {
    this.q.client.kind = k;
    this.touch();
  }

  /** Si el nombre es de un cliente que ya existe, llena sus datos. */
  pick(name: string) {
    const c = this.store.clients().find((x) => x.client.name.trim().toLowerCase() === (name || '').trim().toLowerCase())?.client;
    this.known.set(!!c);
    if (!c) return;
    const me = this.q.client;
    me.kind ||= c.kind;
    me.doc ||= c.doc;
    me.tel ||= c.tel;
    me.place ||= c.place;
    me.contact ||= c.contact;
    me.email ||= c.email;
  }

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
    if (upTo >= 3 && this.advErr()) return { step: 3, msg: 'Revisa el adelanto: es más que el total.' };
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

  // ---- paso 2
  add(c: CatalogItem) {
    this.q.items.push({ code: c.code, name: c.name, inc: c.inc, unit: c.unit, price: c.material + c.labor, w: null, h: null, q: 1, detail: structuredClone(fixDetail(c.detail)) });
    this.err.set('');
    this.touch();
    this.toast.show(`Agregado: ${c.name}. Pon las medidas.`, 2500);
    setTimeout(() => {
      const els = document.querySelectorAll<HTMLInputElement>('.cart .line:last-child input');
      els[0]?.focus();
    });
  }

  /** Catálogo de puertas abierto encima del paso 2. */
  protected doors = signal(false);
  protected readonly modelCount = MODELOS.length;

  addModel(m: Modelo) {
    this.q.items.push(modeloItem(m));
    this.doors.set(false);
    this.err.set('');
    this.touch();
    this.toast.show(m.price ? `Agregado: ${m.code}.` : `Agregado: ${m.code}. Pon el precio según la medida.`, 2500);
  }

  addCustom() {
    this.q.items.push({ code: 'OTRO', name: '', inc: '', unit: 'unidad', price: 0, w: null, h: null, q: 1 });
    this.touch();
  }

  // ---- detalle técnico de cada trabajo
  /** Índice del trabajo con el detalle abierto (-1 = ninguno). */
  protected open = signal(-1);
  protected detailLines = detailLines;

  toggleDetail(i: number) {
    const it = this.q.items[i];
    if (this.open() !== i) it.detail = fixDetail(it.detail) ?? emptyDetail();
    this.open.set(this.open() === i ? -1 : i);
    this.touch();
  }

  /** Los demás trabajos con detalle, para copiarlo. */
  others(i: number) {
    return this.q.items.flatMap((x, j) => (j !== i && hasDetail(x.detail) ? [{ name: x.name, detail: x.detail }] : []));
  }

  remove(i: number) {
    if (this.open() === i) this.open.set(-1);
    this.q.items.splice(i, 1);
    this.touch();
  }

  count(code: string) {
    return this.q.items.filter((x) => x.code === code).length;
  }

  // ---- paso 3
  // ---- redondear el precio final (se guarda como descuento especial)
  /** Totales sin el descuento especial. */
  protected base = () => totals({ ...this.q, special: 0 });
  protected finalIn = signal<number | null>(null);
  protected finalErr = signal('');

  /** Números cerrados por debajo del total: a la decena, a 50 y a 100. */
  rounds(): number[] {
    const tot = this.base().tot;
    const out = new Set<number>();
    for (const step of [10, 50, 100]) {
      const r = Math.floor(tot / step) * step;
      if (r > 0 && r < tot && tot - r <= tot * 0.1) out.add(r);
    }
    return [...out].sort((a, b) => b - a);
  }

  /** Deja el total exactamente en "precio" bajando la diferencia como descuento especial. */
  setFinal(precio: number) {
    precio = +precio;
    const b = this.base();
    if (!precio || precio <= 0) return this.finalErr.set('');
    if (precio >= b.tot) return this.finalErr.set(`Tiene que ser menor que ${fmt(b.tot)}.`);
    if (precio < b.tot * 0.5) return this.finalErr.set('Es menos de la mitad del precio. Revisa el número.');
    this.finalErr.set('');
    const pre = b.sub - b.dsc;
    const target = this.q.igv ? precio / 1.18 : precio;
    // Con IGV, se busca el centavo exacto para que el total quede justo en el número elegido.
    const first = Math.round((pre - target) * 100) / 100;
    this.q.special = [0, 0.01, -0.01, 0.02, -0.02].map((d) => Math.round((first + d) * 100) / 100)
      .find((e) => totals({ ...this.q, special: e }).tot === precio) ?? first;
    this.finalIn.set(null);
    this.touch();
  }

  /** Si cambia el descuento o el IGV, el número redondo ya no cuadra: se quita para elegirlo otra vez. */
  resetRound() {
    if (!this.q.special) return;
    this.q.special = undefined;
    this.toast.show('Cambió el precio: vuelve a elegir el redondeo.');
  }

  clearFinal() {
    this.q.special = undefined;
    this.finalErr.set('');
    this.touch();
  }

  setDiscount(d: number) {
    this.q.discount = Math.min(d, this.store.shop().maxDiscount);
    this.resetRound();
    this.touch();
  }

  setAdvance(a: number) {
    this.q.advance = a;
    this.q.advanceAmt = undefined;
    this.touch();
  }

  /** Adelanto en soles (cuando el cliente da una cantidad que no es un porcentaje). */
  setAdvanceAmt(v: number | null) {
    this.q.advanceAmt = v === null || (v as unknown) === '' || +v <= 0 ? undefined : +v;
    this.touch();
  }

  protected advErr = () => (this.q.advanceAmt && this.q.advanceAmt > totals({ ...this.q, advanceAmt: undefined }).tot ? `No puede ser más que el total (${fmt(this.t.tot)}).` : '');
  protected advLabel = advLabel;
  protected balLabel = balLabel;

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
    this.step.set(1);
    this.maxStep.set(1);
    this.tried.set(0);
    this.err.set('');
    this.saved.set(false);
    this.router.navigate(['/cotizar']);
  }

  /** Borrar con dos toques. No se puede si ya tiene cobros. */
  del() {
    if (!this.armed()) {
      this.armed.set(true);
      setTimeout(() => this.armed.set(false), 3500);
      return;
    }
    this.armed.set(false);
    if (!this.store.deleteQuote(this.q.num)) {
      this.toast.show('No se puede borrar: tiene cobros. Anula primero sus notas de venta en Ventas.', 6000);
      return;
    }
    try { localStorage.removeItem(DRAFT); } catch { /* nada */ }
    this.toast.show(`Cotización ${this.q.num} borrada de la hoja.`);
    this.router.navigate(['/cotizaciones']);
  }

  // ---- descuento especial al aceptar
  protected deal = signal(false);

  openDeal() {
    this.save();
    this.deal.set(true);
  }

  /** La ventana guarda en la lista: se trae la versión guardada para no pisarla. */
  closeDeal() {
    this.deal.set(false);
    const saved = this.store.get(this.q.num);
    if (saved) this.q = structuredClone(saved);
  }

  isArea(it: QuoteItem) {
    return it.unit === AREA;
  }
}
