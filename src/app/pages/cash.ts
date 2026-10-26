import { Component, HostListener, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store, Toast } from '../core/store.service';
import { SheetService } from '../core/sheet.service';
import { EXPENSE_CATS, Expense, PAY_METHODS, Quote } from '../core/models';
import { fmt, fmtDate, norm, saleTotals, todayIso, totals } from '../core/calc';
import { Icon } from './icon';

type Period = 'mes' | 'pasado' | 'año' | 'todo';
interface Move { date: string; kind: 'in' | 'out'; desc: string; job: string; amount: number; link: string[]; jobNum: string; exp?: Expense }

/** Ingresos (lo cobrado), gastos y ganancia de cada trabajo y del taller. */
@Component({
  selector: 'app-cash',
  imports: [FormsModule, RouterLink, Icon],
  template: `
    <div class="page">
      <div class="ph">
        <div>
          <h1>Ingresos y gastos</h1>
          <p class="muted">Lo que cobraste, lo que gastaste y cuánto te queda de cada trabajo.</p>
        </div>
        <button type="button" class="btn primary" (click)="newExpense('')"><app-icon name="plus" /> Registrar gasto</button>
      </div>

      @if (sheet.loaded() && !sheet.hasGastos()) {
        <details class="warn">
          <summary><b>Falta un paso para guardar los gastos en la hoja de Google.</b> Mientras tanto se guardan en este equipo y se suben solos después.</summary>
          <ol>
            <li>Abre tu hoja de Google y entra a <b>Extensiones › Apps Script</b>.</li>
            <li>Borra el código y pega el nuevo (te lo paso en el chat como <b>Codigo-apps-script.txt</b>). Guarda.</li>
            <li><b>Implementar › Gestionar implementaciones</b> › lápiz (editar) › Versión: <b>Nueva versión</b> › <b>Implementar</b>. La dirección no cambia.</li>
            <li>Recarga esta página: aparece la pestaña <b>Gastos</b> en la hoja.</li>
          </ol>
        </details>
      }

      <div class="chips per" role="radiogroup" aria-label="Periodo">
        @for (p of periods; track p.id) {
          <button type="button" class="chip" role="radio" [class.on]="period() === p.id" [attr.aria-checked]="period() === p.id" (click)="period.set(p.id)">{{ p.label }}</button>
        }
      </div>

      <div class="stats">
        <div class="st in"><span>Ingresos (cobrado)</span><b class="money">{{ fmt(sumIn()) }}</b></div>
        <div class="st out"><span>Gastos</span><b class="money">{{ fmt(sumOut()) }}</b></div>
        <div class="st" [class.neg]="sumIn() - sumOut() < 0"><span>Ganancia</span><b class="money">{{ fmt(sumIn() - sumOut()) }}</b></div>
      </div>

      <section class="card">
        <div class="hd">
          <h2>Por trabajo</h2>
          <label class="searchbox"><app-icon name="search" />
            <input type="search" placeholder="Buscar cliente o número" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Buscar trabajo"></label>
        </div>
        <p class="muted small">Trabajos aceptados o con cobros o gastos. La ganancia es lo cobrado menos lo gastado; "al terminar" es el precio menos lo gastado.</p>
        <div class="jobs">
          @for (j of jobs(); track j.q.num) {
            <article class="job" [class.open]="openJob() === j.q.num">
              <button type="button" class="jh" (click)="openJob.set(openJob() === j.q.num ? '' : j.q.num)" [attr.aria-expanded]="openJob() === j.q.num">
                <span class="who"><b>{{ j.q.client.name || 'Sin nombre' }}</b><span class="muted small">{{ j.q.num }} · {{ j.q.estado }}</span></span>
                <span class="nums">
                  <span><small>Precio</small><b class="money">{{ fmt(j.tot) }}</b></span>
                  <span><small>Cobrado</small><b class="money in">{{ fmt(j.paid) }}</b></span>
                  <span><small>Falta cobrar</small><b class="money">{{ fmt(j.left) }}</b></span>
                  <span><small>Gastos</small><b class="money out">{{ fmt(j.spent) }}</b></span>
                  <span><small>Ganancia</small><b class="money" [class.neg]="j.paid - j.spent < 0">{{ fmt(j.paid - j.spent) }}</b></span>
                </span>
              </button>
              @if (openJob() === j.q.num) {
                <div class="jb">
                  <div class="bar2" [attr.aria-label]="'Gastado ' + pct(j.spent, j.tot) + '% del precio'">
                    <span class="sp" [style.width.%]="pct(j.spent, j.tot)"></span>
                  </div>
                  <p class="small">Gastado <b>{{ pct(j.spent, j.tot) }}%</b> del precio · Ganancia al terminar <b class="money" [class.neg]="j.tot - j.spent < 0">{{ fmt(j.tot - j.spent) }}</b></p>
                  <ul class="mv">
                    @for (m of jobMoves(j.q.num); track $index) {
                      <li [class]="m.kind">
                        <span class="sg">{{ m.kind === 'in' ? '+' : '−' }}</span>
                        <span class="d"><b>{{ m.desc }}</b><span class="muted small">{{ fmtDate(m.date) }}</span></span>
                        <b class="money">{{ fmt(m.amount) }}</b>
                        @if (m.exp; as e) {
                          <button type="button" class="iconbtn" (click)="edit(e)" aria-label="Editar gasto"><app-icon name="edit" [size]="15" /></button>
                        } @else { <a class="iconbtn" [routerLink]="m.link" aria-label="Ver nota de venta"><app-icon name="receipt" [size]="15" /></a> }
                      </li>
                    } @empty { <li class="muted">Aún no hay cobros ni gastos.</li> }
                  </ul>
                  <div class="acts">
                    <button type="button" class="btn" (click)="newExpense(j.q.num)"><app-icon name="plus" [size]="16" /> Gasto de este trabajo</button>
                    @if (j.left > 0) { <a class="btn" routerLink="/venta" [queryParams]="{ cot: j.q.num }"><app-icon name="cash" [size]="16" /> Cobrar</a> }
                    <a class="btn ghost" [routerLink]="['/cotizar', j.q.num]">Ver cotización</a>
                  </div>
                </div>
              }
            </article>
          } @empty {
            <div class="empty">Cuando aceptes un trabajo o registres un gasto, aparece aquí.</div>
          }
        </div>
      </section>

      <section class="card">
        <h2>Movimientos</h2>
        <ul class="mv all">
          @for (m of moves(); track $index) {
            <li [class]="m.kind">
              <span class="sg">{{ m.kind === 'in' ? '+' : '−' }}</span>
              <span class="d"><b>{{ m.desc }}</b><span class="muted small">{{ fmtDate(m.date) }} · {{ m.job }}</span></span>
              <b class="money">{{ fmt(m.amount) }}</b>
              @if (m.exp; as e) {
                <button type="button" class="iconbtn" (click)="edit(e)" aria-label="Editar gasto"><app-icon name="edit" [size]="15" /></button>
              } @else { <a class="iconbtn" [routerLink]="m.link" aria-label="Ver nota de venta"><app-icon name="receipt" [size]="15" /></a> }
            </li>
          } @empty { <li class="empty">No hay movimientos en este periodo.</li> }
        </ul>
      </section>
    </div>

    @if (form(); as f) {
      <div class="back" (click)="form.set(null)"></div>
      <div class="modal" role="dialog" aria-modal="true" aria-label="Gasto">
        <div class="mh">
          <span class="mi"><app-icon name="cash" [size]="22" /></span>
          <h2>{{ f.id ? 'Editar gasto' : 'Registrar gasto' }}</h2>
          <button type="button" class="xbtn" (click)="form.set(null)" aria-label="Cerrar"><app-icon name="close" /></button>
        </div>
        <div class="mb">
          <label class="f"><span>¿De qué trabajo?</span>
            <select [(ngModel)]="f.quoteNum">
              <option value="">General del taller (luz, local, herramientas…)</option>
              @for (x of pickable(); track x.num) { <option [value]="x.num">{{ x.num }} · {{ x.client.name || 'Sin nombre' }}</option> }
            </select></label>
          <div class="f"><span>Tipo de gasto</span>
            <div class="chips">
              @for (c of cats; track c) { <button type="button" class="chip" [class.on]="f.cat === c" (click)="f.cat = c">{{ c }}</button> }
            </div></div>
          <label class="f"><span>Detalle <span class="muted">(opcional)</span></span>
            <input [(ngModel)]="f.desc" placeholder="Ej: 6 tubos cuadrados 2x2 de 1.5 mm"></label>
          <div class="row2">
            <label class="f" [class.bad]="tried() && !!amountErr()"><span>Monto (S/) <span class="req">*</span></span>
              <input id="g-amt" type="number" min="0" step="any" inputmode="decimal" [(ngModel)]="f.amount" placeholder="0.00">
              @if (tried() && amountErr(); as m) { <span class="fe">{{ m }}</span> }</label>
            <label class="f" [class.bad]="tried() && !f.date"><span>Fecha <span class="req">*</span></span>
              <input type="date" [(ngModel)]="f.date" [max]="today"></label>
          </div>
          <div class="f"><span>¿Cómo pagaste?</span>
            <div class="chips">
              @for (p of methods; track p) { <button type="button" class="chip" [class.on]="f.pay === p" (click)="f.pay = p">{{ p }}</button> }
            </div></div>
        </div>
        <div class="mf">
          @if (f.id) {
            <button type="button" class="btn danger" (click)="del(f)">{{ confirmDel() ? '¿Seguro? Toca otra vez' : 'Borrar' }}</button>
          }
          <span class="spacer"></span>
          <button type="button" class="btn ghost" (click)="form.set(null)">Cancelar</button>
          <button type="button" class="btn primary" (click)="save(f)">Guardar gasto</button>
        </div>
      </div>
    }
  `,
  styles: `
    .warn { background: #fff4e5; border: 1.5px solid #f6c59a; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; }
    .warn summary { cursor: pointer; }
    .warn ol { margin: 10px 0 0; padding-left: 20px; display: grid; gap: 4px; }
    .per { margin-bottom: 14px; }
    .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
    .st { background: var(--panel); border-radius: 14px; padding: 14px 16px; display: grid; gap: 4px; border-left: 5px solid var(--steel-3); box-shadow: 0 1px 2px rgba(0,0,0,.06); }
    .st span { font-size: 13px; color: var(--muted); }
    .st b { font-size: 24px; }
    .st.in { border-left-color: var(--ok); }
    .st.out { border-left-color: var(--bad); }
    .neg { color: var(--bad) !important; }
    @media (max-width: 640px) { .stats { grid-template-columns: 1fr; } .st b { font-size: 21px; } }
    .card { margin-bottom: 20px; }
    .hd { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .hd h2 { margin: 0; }
    .jobs { display: grid; gap: 10px; margin-top: 10px; }
    .job { border: 1.5px solid var(--line); border-radius: 12px; overflow: hidden; }
    .job.open { border-color: var(--fire); }
    .jh { width: 100%; display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: 12px 14px;
      background: var(--panel); border: none; cursor: pointer; text-align: left; font: inherit; color: var(--ink); }
    .who { display: grid; min-width: 160px; }
    .nums { display: grid; grid-template-columns: repeat(5, minmax(84px, auto)); gap: 12px; }
    .nums span { display: grid; text-align: right; }
    .nums small { font-size: 11.5px; color: var(--muted); }
    .in { color: var(--ok); }
    .out { color: var(--bad); }
    @media (max-width: 760px) { .nums { grid-template-columns: repeat(3, minmax(0, 1fr)); width: 100%; } .nums span { text-align: left; } }
    .jb { padding: 4px 14px 14px; background: var(--bg); display: grid; gap: 8px; }
    .bar2 { height: 8px; background: #dfe4e8; border-radius: 99px; overflow: hidden; margin-top: 8px; }
    .bar2 .sp { display: block; height: 100%; background: var(--fire); max-width: 100%; }
    .jb p { margin: 0; }
    .acts { display: flex; gap: 8px; flex-wrap: wrap; }
    .mv { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .mv li { display: flex; align-items: center; gap: 10px; background: var(--panel); border-radius: 10px; padding: 8px 10px; }
    .mv.all li { border: 1px solid var(--line); }
    .mv .sg { width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; flex: none; }
    .mv li.in .sg { background: #e3f4e8; color: var(--ok); }
    .mv li.out .sg { background: var(--bad-soft); color: var(--bad); }
    .mv li.out > b { color: var(--bad); }
    .mv li.in > b { color: var(--ok); }
    .mv .d { flex: 1; display: grid; min-width: 0; }
    .mv .d b { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .back { position: fixed; inset: 0; background: rgba(15, 18, 22, .55); z-index: 70; }
    .modal { position: fixed; z-index: 71; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(540px, calc(100% - 24px));
      max-height: calc(100dvh - 24px); display: grid; grid-template-rows: auto 1fr auto; background: var(--panel); border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.4); }
    .mh { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--steel); background-image: var(--plate); color: #fff; border-bottom: 4px solid transparent; border-image: var(--hazard) 1; }
    .mh h2 { margin: 0; color: #fff; flex: 1; }
    .mh h2::after { display: none; }
    .mi { width: 38px; height: 38px; border-radius: 9px; background: var(--molten); display: grid; place-items: center; }
    .xbtn { background: none; border: none; color: #fff; cursor: pointer; padding: 6px; }
    .mb { overflow: auto; padding: 16px; display: grid; gap: 14px; }
    .f { display: grid; gap: 6px; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .chips .chip { padding: 6px 11px; font-size: 13px; }
    .mf { display: flex; gap: 10px; align-items: center; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--bg); flex-wrap: wrap; }
    @media (max-width: 560px) { .modal { top: auto; bottom: 0; transform: translateX(-50%); border-radius: 16px 16px 0 0; width: 100%; } }
  `,
})
export class CashPage implements OnInit {
  /** ?cot=COT-2026-0001 abre ese trabajo. */
  readonly cot = input<string>('');

  protected store = inject(Store);
  protected sheet = inject(SheetService);
  private toast = inject(Toast);
  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected cats = EXPENSE_CATS;
  protected methods = PAY_METHODS;
  protected today = todayIso();
  protected periods: { id: Period; label: string }[] = [
    { id: 'mes', label: 'Este mes' }, { id: 'pasado', label: 'Mes pasado' }, { id: 'año', label: 'Este año' }, { id: 'todo', label: 'Todo' },
  ];
  protected period = signal<Period>('mes');
  protected q = signal('');
  protected openJob = signal('');
  protected form = signal<Expense | null>(null);
  protected tried = signal(false);
  protected confirmDel = signal(false);

  ngOnInit() {
    if (this.cot()) this.openJob.set(this.cot());
  }

  @HostListener('document:keydown.escape') esc() {
    this.form.set(null);
  }

  private inPeriod = (date: string) => {
    const t = this.today;
    switch (this.period()) {
      case 'mes': return date.startsWith(t.slice(0, 7));
      case 'pasado': {
        const d = new Date(+t.slice(0, 4), +t.slice(5, 7) - 2, 1);
        return date.startsWith(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      case 'año': return date.startsWith(t.slice(0, 4));
      default: return true;
    }
  };

  private allMoves = computed<Move[]>(() => {
    const igv = this.store.shop().igv;
    const name = (num: string) => (num ? `${num} · ${this.store.get(num)?.client.name || ''}` : 'General');
    const ins: Move[] = this.store.sales().filter((s) => !s.void).map((s) => ({
      date: s.date, kind: 'in' as const, amount: saleTotals(s, igv).tot, link: ['/boleta', s.num],
      desc: s.quoteNum ? `${s.concept === 'A cuenta' ? 'Pago a cuenta' : s.concept} · ${s.client.name || ''}` : `Venta ${s.num} · ${s.client.name || 'Clientes varios'}`,
      job: s.quoteNum ? name(s.quoteNum) : 'Venta suelta', jobNum: s.quoteNum,
    }));
    const outs: Move[] = this.store.expenses().map((e) => ({
      date: e.date, kind: 'out' as const, amount: e.amount, link: [], jobNum: e.quoteNum, exp: e,
      desc: e.desc ? `${e.cat}: ${e.desc}` : e.cat, job: name(e.quoteNum),
    }));
    return [...ins, ...outs].sort((a, b) => b.date.localeCompare(a.date));
  });

  protected moves = computed(() => this.allMoves().filter((m) => this.inPeriod(m.date)));
  protected sumIn = computed(() => Math.round(this.moves().filter((m) => m.kind === 'in').reduce((a, m) => a + m.amount, 0) * 100) / 100);
  protected sumOut = computed(() => Math.round(this.moves().filter((m) => m.kind === 'out').reduce((a, m) => a + m.amount, 0) * 100) / 100);

  protected jobs = computed(() => {
    const paid = this.store.paidByQuote();
    const spent = this.store.spentByQuote();
    const s = norm(this.q());
    return this.store.sortedQuotes()
      .filter((q) => q.estado === 'Aceptada' || paid[q.num] || spent[q.num])
      .filter((q) => !s || norm(`${q.num} ${q.client.name}`).includes(s))
      .map((q) => {
        const tot = totals(q).tot;
        const p = Math.round((paid[q.num] || 0) * 100) / 100;
        return { q, tot, paid: p, left: Math.max(0, Math.round((tot - p) * 100) / 100), spent: spent[q.num] || 0 };
      });
  });

  protected jobMoves(num: string) {
    return this.allMoves().filter((m) => m.jobNum === num);
  }

  /** Trabajos a los que se les puede cargar un gasto. */
  protected pickable = computed<Quote[]>(() => this.store.sortedQuotes().filter((q) => q.estado !== 'Rechazada'));

  protected pct(a: number, b: number) {
    return b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0;
  }

  protected amountErr() {
    const f = this.form();
    return !f || +f.amount > 0 ? '' : 'Pon cuánto gastaste.';
  }

  newExpense(quoteNum: string) {
    this.tried.set(false);
    this.confirmDel.set(false);
    this.form.set({ id: '', date: this.today, quoteNum, cat: 'Materiales', desc: '', amount: null as unknown as number, pay: 'Efectivo', updatedAt: '' });
    setTimeout(() => document.getElementById('g-amt')?.focus());
  }

  edit(e: Expense) {
    this.tried.set(false);
    this.confirmDel.set(false);
    this.form.set(structuredClone(e));
  }

  save(f: Expense) {
    this.tried.set(true);
    if (this.amountErr() || !f.date) return;
    const saved = this.store.saveExpense(f);
    this.form.set(null);
    if (saved.quoteNum) this.openJob.set(saved.quoteNum);
    this.toast.show(`Gasto de ${fmt(saved.amount)} guardado.`);
  }

  del(f: Expense) {
    if (!this.confirmDel()) return this.confirmDel.set(true);
    this.store.deleteExpense(f.id);
    this.form.set(null);
    this.toast.show('Gasto borrado.');
  }
}
