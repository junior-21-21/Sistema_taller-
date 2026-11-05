import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SheetService } from '../core/sheet.service';
import { ANDROID_WEB, APK_URL } from '../core/apk-update.service';
import { Store } from '../core/store.service';
import { Quote } from '../core/models';
import { fmt, fmtDate, saleTotals, shopTels, totals, waPhone } from '../core/calc';
import { ExcelPanel } from './excel-panel';
import { Icon } from './icon';
import { Sparks } from './sparks';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ExcelPanel, Icon, Sparks],
  template: `
    <section class="hero steel">
      <app-sparks />
      <div class="in">
        <div class="hi">
          <span class="eyebrow"><app-icon name="torch" [size]="15" /> {{ today() }}</span>
          <h1>{{ greeting() }}</h1>
          <p class="sum">{{ summary() }}</p>
        </div>
        <a class="month" routerLink="/ventas" aria-label="Cobrado este mes">
          <span class="ml">Cobrado este mes</span>
          <b class="money">{{ fmt(stats().cashed) }}</b>
          <span class="mbar" aria-hidden="true"><span [style.width.%]="cashPct()"></span></span>
          @if (stats().cashed + stats().owed > 0) {
            <small>{{ cashPct() }}% de lo aceptado{{ stats().owed > 0 ? ' · faltan ' + fmt(stats().owed) : ' · ¡todo cobrado!' }}</small>
          } @else { <small>Aún no hay cobros este mes</small> }
        </a>
      </div>
    </section>

    <div class="page">
      <section class="acts" aria-label="Acciones rápidas">
        <a class="act main" routerLink="/cotizar">
          <span class="ai"><app-icon name="quote" [size]="28" /></span>
          <span class="at"><b>Nueva cotización</b><small>Cliente, trabajos, pago y WhatsApp</small></span>
          <app-icon class="go" name="plus" [size]="22" />
        </a>
        <a class="act" routerLink="/venta">
          <span class="ai g"><app-icon name="receipt" [size]="24" /></span>
          <span class="at"><b>Nueva venta</b><small>Cobrar y dar nota de venta</small></span>
        </a>
        <a class="act" routerLink="/caja">
          <span class="ai b"><app-icon name="cash" [size]="24" /></span>
          <span class="at"><b>Anotar gasto</b><small>Material, pasajes, sueldos</small></span>
        </a>
        <a class="act" routerLink="/catalogo">
          <span class="ai s"><app-icon name="door" [size]="24" /></span>
          <span class="at"><b>Catálogo</b><small>Puertas con foto y precio</small></span>
        </a>
      </section>

      @if (sheet.status() === 'none' || sheet.status() === 'offline') {
        <section class="card warnbox"><app-excel-panel /></section>
      }

      @if (androidWeb) {
        <section class="card apkbox">
          <span class="ai"><app-icon name="download" [size]="22" /></span>
          <div class="atx">
            <b>Descarga la app Run Run para Android</b>
            <small>Se instala como cualquier app, guarda todo en tu celular y funciona sin internet. Si Android pregunta, permite «instalar apps de esta fuente».</small>
          </div>
          <a class="btn primary" [href]="apkUrl" rel="noopener">Descargar APK</a>
        </section>
      }

      @if (pending().length) {
        <section class="card todo">
          <div class="th">
            <span class="ring" [style.--p]="readyPct()" aria-hidden="true"><b>{{ readyPct() }}%</b></span>
            <div><h2>Completa tus datos</h2><p class="muted small">Salen en tus cotizaciones, contratos y notas de venta.</p></div>
          </div>
          <div class="tl">
            @for (p of pending(); track p.t) {
              <a class="ti" routerLink="/ajustes" [fragment]="p.go"><span class="tdot" aria-hidden="true"></span><span><b>{{ p.t }}</b><small>{{ p.d }}</small></span><app-icon name="edit" [size]="16" /></a>
            }
          </div>
        </section>
      }

      <section aria-labelledby="mes">
        <h2 class="sec" id="mes">Este mes</h2>
        <div class="stats">
          <a routerLink="/cotizaciones" class="st">
            <span class="si"><app-icon name="quote" [size]="20" /></span>
            <span class="lbl">Cotizado</span>
            <b class="money">{{ fmt(stats().quoted) }}</b><small>{{ plural(stats().count, 'cotización', 'cotizaciones') }}</small>
          </a>
          <a routerLink="/cotizaciones" [queryParams]="{ estado: 'Aceptada' }" class="st ac">
            <span class="si"><app-icon name="check" [size]="18" /></span>
            <span class="lbl">Aceptado</span>
            <b class="money">{{ fmt(stats().wonAmount) }}</b><small>{{ plural(stats().won, 'trabajo', 'trabajos') }} · {{ winPct() }}% cierran</small>
          </a>
          <a routerLink="/ventas" class="st in">
            <span class="si"><app-icon name="cash" [size]="20" /></span>
            <span class="lbl">Cobrado</span>
            <b class="money">{{ fmt(stats().cashed) }}</b><small>{{ plural(stats().salesCount, 'venta', 'ventas') }}</small>
          </a>
          <a routerLink="/cotizaciones" [queryParams]="{ estado: 'Aceptada' }" class="st due">
            <span class="si"><app-icon name="receipt" [size]="20" /></span>
            <span class="lbl">Por cobrar</span>
            <b class="money">{{ fmt(stats().owed) }}</b><small>de trabajos aceptados</small>
          </a>
        </div>
      </section>

      <div class="two">
        <section class="card">
          <div class="row"><h2><app-icon name="cash" [size]="20" /> Por cobrar</h2><span class="spacer"></span><a routerLink="/cotizaciones" [queryParams]="{ estado: 'Aceptada' }">Ver todo</a></div>
          @for (d of debts(); track d.q.num) {
            <div class="li">
              <a class="lm" [routerLink]="['/cotizar', d.q.num]">
                <span class="av">{{ initials(d.q.client.name) }}</span>
                <span class="lt"><b>{{ d.q.client.name || 'Sin nombre' }}</b><small>{{ d.q.num }} · debe {{ fmt(d.due) }} de {{ fmt(d.tot) }}</small>
                  <span class="pbar" aria-hidden="true"><span [style.width.%]="d.pct"></span></span></span>
              </a>
              @if (d.q.client.tel) {
                <a class="iconbtn wa" [href]="remind(d.q, d.due)" target="_blank" rel="noopener" [attr.aria-label]="'Recordar pago a ' + d.q.client.name"><app-icon name="wa" [size]="16" /><span class="rl">Recordar</span></a>
              } @else {
                <a class="iconbtn" routerLink="/venta" [queryParams]="{ cot: d.q.num }">Cobrar</a>
              }
            </div>
          } @empty {
            <div class="empty"><span class="ok"><app-icon name="check" [size]="26" /></span><p>Nadie te debe. ¡Todo cobrado!</p></div>
          }
        </section>

        <section class="card">
          <div class="row"><h2><app-icon name="quote" [size]="20" /> Esperando respuesta</h2><span class="spacer"></span><a routerLink="/cotizaciones" [queryParams]="{ estado: 'Pendiente' }">Ver todo</a></div>
          @for (q of waiting(); track q.num) {
            <a class="li lm" [routerLink]="['/cotizar', q.num]">
              <span class="av w">{{ initials(q.client.name) }}</span>
              <span class="lt"><b>{{ q.client.name || 'Sin nombre' }}</b><small>{{ q.num }} · {{ ago(q.date) }}</small></span>
              <b class="money r">{{ fmt(tot(q)) }}</b>
            </a>
          } @empty {
            <div class="empty"><span class="ok"><app-icon name="quote" [size]="24" /></span><p>No hay cotizaciones pendientes.</p><a class="btn primary" routerLink="/cotizar">Hacer una</a></div>
          }
        </section>
      </div>

      <section class="card">
        <div class="row"><h2><app-icon name="layers" [size]="20" /> Lo último</h2></div>
        <ol class="feed">
          @for (e of feed(); track e.key) {
            <li>
              <a [routerLink]="e.link">
                <span class="fi" [class]="'fi ' + e.kind"><app-icon [name]="e.icon" [size]="16" /></span>
                <span class="lt"><b>{{ e.title }}</b><small>{{ e.sub }}</small></span>
                <span class="fr"><b class="money" [class.void]="e.void">{{ fmt(e.amount) }}</b><small>{{ short(e.date) }}</small></span>
              </a>
            </li>
          } @empty {
            <li class="empty"><p>Aquí verás tus cotizaciones y ventas más recientes.</p></li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: `
    .hero { position: relative; overflow: hidden; border-bottom: 1px solid var(--line); }
    .hero .in { position: relative; max-width: 1180px; margin: 0 auto; padding: 30px 16px 34px; display: flex; align-items: center; gap: 24px; justify-content: space-between; flex-wrap: wrap; }
    .hi { display: grid; gap: 6px; min-width: 0; flex: 1 1 320px; }
    .eyebrow { display: inline-flex; align-items: center; gap: 6px; font: 700 13px var(--f-body); letter-spacing: .14em; text-transform: uppercase; color: var(--amber); }
    .hero h1 { font-size: clamp(32px, 6vw, 52px); color: #fff; margin: 0; background: linear-gradient(180deg, #ffd27a 0%, #ff8a1e 55%, #e04400 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 2px 10px rgba(255, 106, 0, .25)); }
    .hero h1::after { width: 90px; }
    .sum { margin: 4px 0 0; color: #e6dacd; font-size: 17px; max-width: 560px; }
    .month { flex: 0 1 320px; display: grid; gap: 6px; text-decoration: none; color: #fff; padding: 16px 18px; border-radius: 16px;
      background: rgba(255, 255, 255, .06); border: 1px solid rgba(255, 255, 255, .14); backdrop-filter: blur(4px); }
    .month:hover { border-color: var(--amber); }
    .ml { font: 700 12px var(--f-body); letter-spacing: .1em; text-transform: uppercase; color: #b8a999; }
    .month b { font-size: 32px; color: #4ade80; line-height: 1.1; }
    .month small { color: #d8cbbd; }
    .mbar { height: 8px; border-radius: 8px; background: rgba(255, 255, 255, .12); overflow: hidden; }
    .mbar span { display: block; height: 100%; background: linear-gradient(90deg, #22c55e, #4ade80); border-radius: 8px; }
    @media (max-width: 700px) { .month { flex-basis: 100%; } .hero .in { padding: 24px 16px 26px; gap: 16px; } .sum { font-size: 15.5px; } }

    .acts { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 12px; margin-top: -2px; }
    .act { position: relative; display: flex; align-items: center; gap: 12px; text-decoration: none; color: var(--ink); background: var(--panel);
      border: 1.5px solid var(--line); border-radius: 16px; padding: 14px; box-shadow: var(--shadow); min-width: 0; transition: transform .12s, border-color .12s; }
    .act:hover { border-color: var(--fire); transform: translateY(-2px); }
    .act:active { transform: translateY(0); }
    .ai { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--soft); color: var(--fire-dark); }
    .ai.g { background: var(--ok-soft); color: var(--ok); }
    .ai.b { background: rgba(127, 216, 255, .12); color: var(--cyan); }
    .ai.s { background: var(--tile); color: var(--ink); }
    .at { display: grid; min-width: 0; }
    .at b { font-size: 16.5px; line-height: 1.25; }
    .at small { color: var(--muted); font-size: 13px; line-height: 1.3; }
    .act.main { background: var(--molten); border-color: #c4520a; color: #fff; box-shadow: 0 8px 20px -8px rgba(236, 106, 18, .7); }
    .act.main .ai { background: rgba(255, 255, 255, .2); color: #fff; width: 56px; height: 56px; }
    .act.main .at b { font-size: 19px; }
    .act.main .at small { color: rgba(255, 255, 255, .88); }
    .act.main .go { margin-left: auto; opacity: .9; }
    @media (max-width: 960px) { .acts { grid-template-columns: repeat(3, minmax(0, 1fr)); } .act.main { grid-column: 1 / -1; } }
    @media (max-width: 480px) { .rl { display: none; } .li .iconbtn.wa { padding: 10px 12px; } }
    @media (max-width: 640px) {
      .act { flex-direction: column; align-items: flex-start; gap: 8px; padding: 12px; }
      .act.main { flex-direction: row; align-items: center; }
      .ai { width: 42px; height: 42px; }
      .at small { display: none; }
      .at b { font-size: 15px; }
      .act.main .at b { font-size: 18px; }
      .act.main .at small { display: block; }
    }

    .warnbox { border-color: var(--fire); background: var(--soft); }
    .todo { border-left: 5px solid var(--amber); gap: 12px; }
    .th { display: flex; align-items: center; gap: 14px; }
    .th h2 { font-size: 20px; margin: 0; }
    .th h2::after { display: none; }
    .th p { margin: 0; }
    .ring { --p: 0; width: 58px; height: 58px; border-radius: 50%; flex: none; display: grid; place-items: center;
      background: conic-gradient(var(--fire) calc(var(--p) * 1%), var(--line) 0); }
    .ring b { width: 44px; height: 44px; border-radius: 50%; background: var(--panel); display: grid; place-items: center; font: 700 13px var(--f-num); }
    .tl { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; }
    .ti { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); border: 1.5px solid var(--line); border-radius: 12px; padding: 10px 12px; background: var(--bg); min-height: 52px; }
    .ti:hover { border-color: var(--fire); }
    .ti > span:nth-child(2) { display: grid; flex: 1; min-width: 0; }
    .ti small { color: var(--muted); font-size: 12.5px; }
    .ti app-icon { color: var(--fire); }
    .tdot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--amber); flex: none; }

    .sec { font-size: 20px; margin-bottom: 10px; }
    .sec::after { display: none; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .st { position: relative; background: var(--panel); border: 1px solid var(--line); border-radius: 16px; padding: 14px 16px; display: grid; gap: 2px;
      text-decoration: none; color: var(--ink); min-width: 0; box-shadow: var(--shadow); overflow: hidden; }
    .st::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--steel-3); }
    .st:hover { border-color: var(--fire); }
    .si { width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center; background: var(--tile); color: var(--ink); margin-bottom: 6px; }
    .st.ac::before { background: var(--fire); } .st.ac .si { background: var(--soft); color: var(--fire-dark); }
    .st.in::before { background: var(--ok); } .st.in .si { background: var(--ok-soft); color: var(--ok); } .st.in b { color: var(--ok); }
    .st.due::before { background: var(--amber); } .st.due .si { background: var(--warn-soft); color: var(--warn); } .st.due b { color: var(--warn); }
    .lbl { font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
    .st b { font-size: 22px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .st small { color: var(--muted); }
    @media (max-width: 760px) { .stats { grid-template-columns: 1fr 1fr; } .st b { font-size: 18px; } .st { padding: 12px; } }

    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 860px) { .two { grid-template-columns: 1fr; } }
    .card h2 { display: inline-flex; align-items: center; gap: 8px; }
    .card h2 app-icon { color: var(--fire); }
    .li { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-top: 1px solid var(--line); text-decoration: none; color: var(--ink); }
    .lm { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; text-decoration: none; color: var(--ink); }
    .lm:hover b { color: var(--fire-dark); }
    .av { width: 42px; height: 42px; border-radius: 50%; flex: none; display: grid; place-items: center; font: 700 15px var(--f-body);
      background: var(--warn-soft); color: var(--warn); }
    .av.w { background: var(--tile); color: var(--ink); }
    .lt { display: grid; min-width: 0; flex: 1; gap: 1px; }
    .lt b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .lt small { color: var(--muted); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pbar { height: 6px; border-radius: 6px; background: var(--warn-soft); overflow: hidden; margin-top: 4px; }
    .pbar span { display: block; height: 100%; background: var(--ok); border-radius: 6px; }
    .r { flex: none; }
    .empty { display: grid; justify-items: center; gap: 8px; padding: 10px 0; text-align: center; }
    .empty p { margin: 0; color: var(--muted); }
    .ok { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--ok-soft); color: var(--ok); }

    .feed { list-style: none; margin: 0; padding: 0; display: grid; }
    .feed li + li { border-top: 1px solid var(--line); }
    .feed a { display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; color: var(--ink); min-width: 0; }
    .feed a:hover b { color: var(--fire-dark); }
    .fi { width: 34px; height: 34px; border-radius: 10px; flex: none; display: grid; place-items: center; background: var(--tile); color: var(--ink); }
    .fi.q { background: var(--soft); color: var(--fire-dark); }
    .fi.s { background: var(--ok-soft); color: var(--ok); }
    .fr { display: grid; justify-items: end; flex: none; }
    .fr small { color: var(--muted); font-size: 12px; }
    .apkbox { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; border-left: 4px solid var(--fire); }
    .apkbox .atx { flex: 1 1 220px; min-width: 0; display: grid; gap: 3px; }
    .apkbox small { color: var(--muted); }
    .void { text-decoration: line-through; color: var(--muted); }
    @media (prefers-reduced-motion: reduce) { .act { transition: none; } .act:hover { transform: none; } }
  `,
})
export class HomePage {
  protected store = inject(Store);
  protected sheet = inject(SheetService);
  protected readonly androidWeb = ANDROID_WEB;
  protected readonly apkUrl = APK_URL;
  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected stats = computed(() => (this.store.quotes(), this.store.sales(), this.store.monthStats()));

  /** Datos que faltan para que los documentos salgan completos. */
  private checks = computed(() => {
    const s = this.store.shop();
    const cat = this.store.catalog();
    const noPrice = cat.filter((c) => !(c.material + c.labor)).length;
    return [
      { ok: !!s.ruc.trim(), t: 'RUC del taller', d: 'Sale en la cotización y el contrato', go: 'taller' },
      { ok: !!s.rep.trim(), t: 'Quién firma los contratos', d: 'Nombre completo del dueño', go: 'taller' },
      { ok: !!s.repDni.trim(), t: 'DNI de quien firma', d: 'Va en el contrato', go: 'taller' },
      { ok: !!s.payInfo.trim(), t: 'Yape / Plin o cuenta', d: 'Para que el cliente sepa dónde pagar', go: 'taller' },
      cat.length
        ? { ok: !noPrice, t: `${noPrice} servicio${noPrice > 1 ? 's' : ''} sin precio`, d: 'Ponles tu precio real', go: 'precios' }
        : { ok: false, t: 'Tu lista de precios', d: 'Agrega tus servicios con su precio', go: 'precios' },
    ];
  });
  protected pending = computed(() => this.checks().filter((c) => !c.ok));
  protected readyPct = computed(() => Math.round(((this.checks().length - this.pending().length) / this.checks().length) * 100));

  protected tot = (q: Quote) => totals(q).tot;

  /** Trabajos aceptados que todavía deben plata, los que más deben primero. */
  protected debts = computed(() => {
    const paid = this.store.paidByQuote();
    return this.store
      .quotes()
      .filter((q) => q.estado === 'Aceptada')
      .map((q) => {
        const tot = totals(q).tot;
        const due = Math.round(Math.max(0, tot - (paid[q.num] || 0)) * 100) / 100;
        return { q, tot, due, pct: tot ? Math.round(((tot - due) / tot) * 100) : 0 };
      })
      .filter((d) => d.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, 5);
  });

  protected waiting = computed(() => this.store.sortedQuotes().filter((q) => q.estado === 'Pendiente').slice(0, 5));

  /** Cotizaciones y ventas mezcladas, lo más nuevo arriba. */
  protected feed = computed(() => {
    const igv = this.store.shop().igv;
    const qs = this.store.sortedQuotes().slice(0, 6).map((q) => ({
      key: 'q' + q.num, kind: 'q', icon: 'quote', link: ['/cotizar', q.num], date: q.date, at: q.updatedAt,
      title: q.client.name || 'Sin nombre', sub: `Cotización ${q.num} · ${q.estado}`, amount: totals(q).tot, void: q.estado === 'Rechazada',
    }));
    const ss = this.store.sortedSales().slice(0, 6).map((s) => ({
      key: 's' + s.num, kind: 's', icon: 'receipt', link: ['/boleta', s.num], date: s.date, at: s.updatedAt,
      title: s.client.name || 'Clientes varios', sub: `${s.concept} · ${s.pay}${s.void ? ' · Anulada' : ''}`, amount: saleTotals(s, igv).tot, void: s.void,
    }));
    return [...qs, ...ss].sort((a, b) => (b.at || b.date).localeCompare(a.at || a.date)).slice(0, 6);
  });

  protected cashPct = computed(() => {
    const st = this.stats();
    const base = st.cashed + st.owed;
    return base ? Math.min(100, Math.round((st.cashed / base) * 100)) : 0;
  });
  protected winPct = computed(() => {
    const st = this.stats();
    return st.count ? Math.round((st.won / st.count) * 100) : 0;
  });

  protected summary = computed(() => {
    const st = this.stats();
    const parts: string[] = [];
    if (st.pending) parts.push(st.pending > 1 ? `${st.pending} cotizaciones esperando respuesta` : '1 cotización esperando respuesta');
    if (st.owed > 0) parts.push(`${fmt(st.owed)} por cobrar`);
    return parts.length ? `Tienes ${parts.join(' y ')}.` : '¿Qué hacemos hoy en el taller?';
  });

  protected today = () => new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  protected greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
  };
  protected initials = (name: string) =>
    (name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || '?';
  protected plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  protected short(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
  }
  protected ago(iso: string) {
    const d = Math.round((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 86_400_000);
    return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} días`;
  }

  /** Mensaje amable de WhatsApp para recordar el saldo. */
  protected remind(q: Quote, due: number) {
    const shop = this.store.shop();
    const first = (q.client.name || '').split(' ')[0];
    const text = [
      `Hola${first ? ' ' + first : ''}, le saluda ${shop.name}.`,
      `Le recordamos el saldo pendiente de su trabajo (${q.num}): *${fmt(due)}*.`,
      ...(shop.payInfo ? [`Puede pagar por ${shop.payInfo}.`] : []),
      ...(shopTels(shop) ? [`Consultas: ${shopTels(shop)}`] : []),
      '¡Gracias por su confianza!',
    ].join('\n');
    return `https://wa.me/${waPhone(q.client.tel)}?text=${encodeURIComponent(text)}`;
  }
}
