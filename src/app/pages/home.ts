import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SheetService } from '../core/sheet.service';
import { Store } from '../core/store.service';
import { fmt, fmtDate, saleTotals, totals } from '../core/calc';
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
        <span class="eyebrow">Taller Run Run · Huamanga</span>
        <h1>{{ greeting() }}</h1>
        <p>¿Qué hacemos hoy en el taller?</p>
        <div class="cta">
          <a class="btn primary big" routerLink="/cotizar"><app-icon name="quote" /> Nueva cotización</a>
          <a class="btn big ghost-l" routerLink="/venta"><app-icon name="receipt" /> Nueva venta</a>
        </div>
      </div>
    </section>

    <div class="page">
      @if (sheet.status() === 'none' || sheet.status() === 'offline') {
        <section class="card warnbox"><app-excel-panel /></section>
      }

      <section>
        <h2 class="sec">Este mes</h2>
        <div class="stats">
          <a routerLink="/cotizaciones" class="st">
            <span class="lbl">Cotizado</span>
            <b class="money">{{ fmt(stats().quoted) }}</b><small>{{ stats().count }} cotizaciones</small>
          </a>
          <a routerLink="/cotizaciones" [queryParams]="{ estado: 'Aceptada' }" class="st">
            <span class="lbl">Aceptado</span>
            <b class="money">{{ fmt(stats().wonAmount) }}</b><small>{{ stats().won }} trabajos</small>
          </a>
          <a routerLink="/ventas" class="st in">
            <span class="lbl">Cobrado</span>
            <b class="money">{{ fmt(stats().cashed) }}</b><small>{{ stats().salesCount }} ventas</small>
          </a>
          <a routerLink="/cotizaciones" [queryParams]="{ estado: 'Aceptada' }" class="st due">
            <span class="lbl">Por cobrar</span>
            <b class="money">{{ fmt(stats().owed) }}</b><small>de trabajos aceptados</small>
          </a>
        </div>
      </section>

      <section class="more">
        <a class="qa" routerLink="/cotizaciones"><app-icon name="search" [size]="26" /><b>Buscar cotización</b><span>Por cliente, número o fecha</span></a>
        <a class="qa" routerLink="/clientes"><app-icon name="users" [size]="26" /><b>Clientes</b><span>Historial de cada uno</span></a>
        <a class="qa" routerLink="/ajustes"><app-icon name="gear" [size]="26" /><b>Precios y taller</b><span>Tus precios y tus datos</span></a>
        <a class="qa" routerLink="/catalogo"><app-icon name="door" [size]="26" /><b>Catálogo de puertas</b><span>73 modelos con foto y precio</span></a>
      </section>

      <div class="two">
        <section class="card">
          <div class="row"><h2>Últimas cotizaciones</h2><span class="spacer"></span><a routerLink="/cotizaciones">Ver todas</a></div>
          @for (q of recentQuotes(); track q.num) {
            <a class="li" [routerLink]="['/cotizar', q.num]">
              <div><b>{{ q.client.name || 'Sin nombre' }}</b><span class="muted small">{{ q.num }} · {{ fmtDate(q.date) }}</span></div>
              <div class="r"><b class="money">{{ fmt(tot(q)) }}</b><span class="pill" [class]="q.estado">{{ q.estado }}</span></div>
            </a>
          } @empty {
            <div class="empty"><app-icon name="quote" [size]="34" /><p>Aún no hay cotizaciones.</p><a class="btn primary" routerLink="/cotizar">Hacer la primera</a></div>
          }
        </section>
        <section class="card">
          <div class="row"><h2>Últimas ventas</h2><span class="spacer"></span><a routerLink="/ventas">Ver todas</a></div>
          @for (s of recentSales(); track s.num) {
            <a class="li" [routerLink]="['/boleta', s.num]">
              <div><b>{{ s.client.name || 'Clientes varios' }}</b><span class="muted small">{{ s.num }} · {{ s.concept }} · {{ s.pay }}</span></div>
              <div class="r"><b class="money" [class.void]="s.void">{{ fmt(saleTot(s)) }}</b>@if (s.void) {<span class="pill Rechazada">Anulada</span>}</div>
            </a>
          } @empty {
            <div class="empty"><app-icon name="receipt" [size]="34" /><p>Aún no hay ventas.</p><a class="btn" routerLink="/venta">Registrar una venta</a></div>
          }
        </section>
      </div>
    </div>
  `,
  styles: `
    .hero { position: relative; overflow: hidden; border-bottom: 1px solid #0d1013; }
    .hero .in { position: relative; max-width: 1180px; margin: 0 auto; padding: 34px 16px 38px; display: grid; gap: 8px; }
    .eyebrow { font: 700 13px var(--f-body); letter-spacing: .16em; text-transform: uppercase; color: var(--amber); }
    .hero h1 { font-size: clamp(34px, 6vw, 54px); color: #fff; }
    .hero h1::after { width: 90px; }
    .hero p { margin: 0; color: #c9d1d8; font-size: 18px; }
    .cta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
    .ghost-l { background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, .25); color: #fff; }
    .ghost-l:hover { border-color: #fff; }
    @media (max-width: 560px) { .cta .btn { flex: 1 1 100%; } }
    .warnbox { border-color: var(--fire); background: var(--soft); }
    .sec { font-size: 20px; margin-bottom: 10px; }
    .sec::after { display: none; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .st { background: var(--panel); border: 1px solid var(--line); border-top: 4px solid var(--steel-3); border-radius: var(--r); padding: 14px 16px; display: grid; gap: 2px;
      text-decoration: none; color: var(--ink); min-width: 0; box-shadow: var(--shadow); }
    .st:hover { border-color: var(--fire); }
    .st.in { border-top-color: var(--ok); }
    .st.in b { color: var(--ok); }
    .st.due { border-top-color: var(--amber); }
    .st.due b { color: var(--warn); }
    .lbl { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
    .st b { font-size: 22px; overflow: hidden; text-overflow: ellipsis; }
    .st small { color: var(--muted); }
    @media (max-width: 760px) { .stats { grid-template-columns: 1fr 1fr; } .st b { font-size: 18px; } }
    .more { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
    .qa { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 12px; align-items: center; text-decoration: none; color: var(--ink);
      background: var(--panel); border: 1.5px solid var(--line); border-radius: var(--r); padding: 14px; box-shadow: var(--shadow); }
    .qa:hover { border-color: var(--fire); }
    .qa app-icon { grid-row: 1 / 3; color: var(--fire); }
    .qa span { color: var(--muted); font-size: 13px; }
    @media (max-width: 860px) { .more { grid-template-columns: 1fr 1fr; } }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
    @media (max-width: 860px) { .two { grid-template-columns: 1fr; } }
    .li { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid var(--line); text-decoration: none; color: var(--ink); }
    .li > div { display: grid; min-width: 0; }
    .li b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .li .r { justify-items: end; gap: 2px; }
    .li:hover b { color: var(--fire-dark); }
    .empty { display: grid; justify-items: center; gap: 8px; }
    .empty p { margin: 0; }
    .void { text-decoration: line-through; color: var(--muted); }
  `,
})
export class HomePage {
  protected store = inject(Store);
  protected sheet = inject(SheetService);
  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected stats = computed(() => (this.store.quotes(), this.store.sales(), this.store.monthStats()));
  protected recentQuotes = computed(() => this.store.sortedQuotes().slice(0, 5));
  protected recentSales = computed(() => this.store.sortedSales().slice(0, 5));
  protected greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? '¡Buenos días!' : h < 19 ? '¡Buenas tardes!' : '¡Buenas noches!';
  };
  tot = (q: Parameters<typeof totals>[0]) => totals(q).tot;
  saleTot = (s: Parameters<typeof saleTotals>[0]) => saleTotals(s, this.store.shop().igv).tot;
}
