import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClientSummary, Store } from '../core/store.service';
import { fmt, fmtDate, norm, saleTotals, totals, waPhone } from '../core/calc';
import { Icon } from './icon';
import { Guide } from './guide';

@Component({
  selector: 'app-clients',
  imports: [FormsModule, RouterLink, Icon, Guide],
  template: `
    <div class="page">
      <div class="ph">
        <div>
          <h1>Clientes</h1>
          <p class="muted">Se arman solos con tus cotizaciones y ventas. Toca un cliente para ver todo lo que le cotizaste y vendiste.</p>
        </div>
      </div>
      <app-guide id="clientes" title="Tus clientes se guardan solos">
        <p>Cada vez que haces una cotización o una venta con nombre, el cliente aparece aquí. Toca uno para ver su celular,
          lo que le cotizaste, lo que te compró y escribirle por WhatsApp.</p>
      </app-guide>
      <label class="searchbox"><app-icon name="search" />
        <input type="search" placeholder="Buscar por nombre, DNI, RUC o celular" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Buscar cliente">
      </label>

      <div class="grid2">
        <div class="list">
          @for (c of list(); track c.key) {
            <button type="button" class="cl" [class.on]="sel()?.key === c.key" (click)="sel.set(c)">
              <span class="av" aria-hidden="true">{{ initials(c) }}</span>
              <span class="who"><b>{{ c.client.name || 'Sin nombre' }}</b><span class="muted small">{{ c.client.doc || 'Sin DNI' }} · {{ c.client.tel || 'sin celular' }}</span></span>
              <span class="r"><b class="money">{{ fmt(c.bought) }}</b><span class="muted small">{{ c.quotes.length }} cot. · {{ c.sales.length }} ventas</span></span>
            </button>
          } @empty {
            <div class="empty">@if (store.clients().length) { Nadie coincide con esa búsqueda. } @else { Aquí aparecerán tus clientes cuando hagas cotizaciones o ventas. }</div>
          }
        </div>

        @if (sel(); as c) {
          <section class="card detail">
            <div class="row">
              <span class="av big" aria-hidden="true">{{ initials(c) }}</span>
              <div class="who"><h2>{{ c.client.name || 'Sin nombre' }}</h2>
                <span class="muted">{{ c.client.doc ? 'DNI/RUC ' + c.client.doc : '' }} {{ c.client.place ? '· ' + c.client.place : '' }}</span></div>
            </div>
            <div class="row">
              @if (c.client.tel) { <a class="iconbtn wa" [href]="'https://wa.me/' + phone(c.client.tel)" target="_blank" rel="noopener"><app-icon name="wa" [size]="16" /> {{ c.client.tel }}</a> }
              <a class="iconbtn" routerLink="/cotizar"><app-icon name="plus" [size]="16" /> Nueva cotización</a>
            </div>
            <div class="kp">
              <div><span>Cotizado</span><b class="money">{{ fmt(c.quoted) }}</b></div>
              <div><span>Comprado</span><b class="money money-in">{{ fmt(c.bought) }}</b></div>
              <div><span>Último contacto</span><b>{{ fmtDate(c.last) }}</b></div>
            </div>
            <h3>Cotizaciones</h3>
            @for (q of c.quotes; track q.num) {
              <a class="li" [routerLink]="['/cotizar', q.num]"><span>{{ q.num }} · {{ fmtDate(q.date) }}</span><span class="pill" [class]="q.estado">{{ q.estado }}</span><b class="money">{{ fmt(qt(q)) }}</b></a>
            } @empty { <p class="muted small">Sin cotizaciones.</p> }
            <h3>Ventas</h3>
            @for (s of c.sales; track s.num) {
              <a class="li" [routerLink]="['/boleta', s.num]"><span>{{ s.num }} · {{ fmtDate(s.date) }}</span><span class="muted small">{{ s.concept }}</span><b class="money">{{ fmt(st(s)) }}</b></a>
            } @empty { <p class="muted small">Sin ventas.</p> }
          </section>
        } @else if (list().length) {
          <div class="empty pick">Elige un cliente de la lista.</div>
        }
      </div>
    </div>
  `,
  styles: `
    .grid2 { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
    @media (max-width: 860px) { .grid2 { grid-template-columns: 1fr; } .pick { display: none; } }
    .list { display: grid; gap: 8px; }
    .cl { display: flex; align-items: center; gap: 12px; text-align: left; background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 12px; cursor: pointer; font: inherit; color: var(--ink); }
    .cl:hover, .cl.on { border-color: var(--fire); }
    .av { width: 40px; height: 40px; border-radius: 50%; background: var(--soft); color: var(--fire-dark); display: grid; place-items: center; font: 800 16px var(--f-display); flex: none; }
    .av.big { width: 56px; height: 56px; font-size: 22px; }
    .who { display: grid; min-width: 0; flex: 1; }
    .who b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .r { display: grid; justify-items: end; }
    .detail { position: sticky; top: 80px; }
    @media (max-width: 860px) { .detail { position: static; order: -1; } }
    .kp { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .kp div { border: 1px solid var(--line); border-radius: 10px; padding: 8px 10px; display: grid; }
    .kp span { font-size: 11px; color: var(--muted); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .li { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--line); text-decoration: none; color: var(--ink); }
    .li:hover { color: var(--fire-dark); }
  `,
})
export class ClientsPage {
  protected store = inject(Store);
  protected fmt = fmt;
  protected fmtDate = fmtDate;
  protected q = signal('');
  protected sel = signal<ClientSummary | null>(null);

  protected list = computed(() => {
    const words = norm(this.q()).split(/\s+/).filter(Boolean);
    return this.store.clients().filter((c) => {
      const hay = norm([c.client.name, c.client.doc, c.client.tel, c.client.place].join(' '));
      return words.every((w) => hay.includes(w));
    });
  });

  initials = (c: ClientSummary) => (c.client.name || '?').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  phone = waPhone;
  qt = (q: Parameters<typeof totals>[0]) => totals(q).tot;
  st = (s: Parameters<typeof saleTotals>[0]) => saleTotals(s, this.store.shop().igv).tot;
}
