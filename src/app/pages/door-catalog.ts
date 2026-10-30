import { Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from './icon';
import { GRUPOS, MODELOS, Modelo } from '../core/catalogo';
import { fmt, norm } from '../core/calc';

/** Catálogo de puertas con fotos: búsqueda, filtros y ficha de cada modelo. */
@Component({
  selector: 'app-door-catalog',
  imports: [FormsModule, Icon],
  template: `
    <div class="tools">
      <label class="searchbox"><app-icon name="search" />
        <input type="search" placeholder="Buscar: PM 12, vidrio, negro, medio punto…" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Buscar modelo">
      </label>
      <div class="chips">
        <button type="button" class="chip" [class.on]="!g()" (click)="g.set('')">Todas ({{ all.length }})</button>
        @for (x of grupos; track x.name) {
          <button type="button" class="chip" [class.on]="g() === x.name" (click)="g.set(x.name)">{{ x.name }}</button>
        }
      </div>
    </div>

    <div class="grid">
      @for (m of list(); track m.code) {
        <button type="button" class="door" (click)="sel.set(m)">
          <span class="ph"><img [src]="m.img" [alt]="m.title + ' ' + m.code" loading="lazy"><span class="code">{{ m.code }}</span></span>
          <span class="tx">
            <b>{{ m.title }}</b>
            @if (m.notes) { <span class="nt">{{ m.notes }}</span> }
            <span class="pr">@if (m.price) { <b class="money">{{ fmt(m.price) }}</b> } @else { <b>Precio según medida</b> }</span>
          </span>
        </button>
      } @empty {
        <p class="muted empty">Ningún modelo coincide con esa búsqueda.</p>
      }
    </div>
    <p class="muted small foot">Precios sin IGV · Medida aproximada 2.40 × 1 m, salvo que se indique otra.</p>

    @if (sel(); as m) {
      <div class="back" (click)="sel.set(null)"></div>
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="m.title">
        <button type="button" class="xbtn" (click)="sel.set(null)" aria-label="Cerrar"><app-icon name="close" /></button>
        <div class="big"><img [src]="m.img" [alt]="m.title + ' ' + m.code"></div>
        <div class="info">
          <span class="code2">{{ m.code }}</span>
          <h2>{{ m.title }}</h2>
          <div class="price">@if (m.price) { <b class="money">{{ fmt(m.price) }}</b> <span class="muted">sin IGV</span> } @else { <b>Precio según modelo y medida</b> }</div>
          <ul>
            <li><app-icon name="rulers" [size]="16" /> Medida aproximada: {{ m.size }}</li>
            <li><app-icon name="layers" [size]="16" /> {{ isPlain(m) ? 'Sin contraplacar (diseño en 1 sola cara)' : 'Contraplacado' }}</li>
            @for (n of notes(m); track $index) { <li><app-icon name="spark" [size]="16" /> {{ n }}</li> }
          </ul>
          <div class="acts">
            <button type="button" class="btn primary" (click)="choose(m)"><app-icon name="plus" [size]="18" /> {{ pickLabel() }}</button>
            <button type="button" class="btn ghost" (click)="sel.set(null)">Ver otros modelos</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    :host { display: grid; gap: 14px; }
    .tools { display: grid; gap: 10px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 12px; }
    .door { display: grid; grid-template-rows: auto 1fr; text-align: left; padding: 0; border: 1.5px solid var(--line); border-radius: 12px; background: var(--panel);
      overflow: hidden; cursor: pointer; box-shadow: var(--shadow); font: inherit; color: inherit; }
    .door:hover, .door:focus-visible { border-color: var(--fire); transform: translateY(-1px); }
    .ph { position: relative; display: block; aspect-ratio: 3 / 4; background: #1b2126; }
    .ph img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .code { position: absolute; top: 8px; left: 8px; background: #1f3a8a; color: #fff; font: 800 12px var(--f-num); padding: 3px 8px; border-radius: 6px; }
    .tx { display: grid; gap: 4px; padding: 10px; align-content: start; }
    .tx b { font-size: 14px; line-height: 1.2; }
    .nt { font-size: 12px; color: var(--muted); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pr { margin-top: 2px; }
    .pr b { color: var(--fire-dark); font-size: 16px; }
    .empty { grid-column: 1 / -1; text-align: center; }
    .foot { margin: 0; }
    .back { position: fixed; inset: 0; background: rgba(15, 18, 22, .6); z-index: 80; backdrop-filter: blur(2px); }
    .modal { position: fixed; z-index: 81; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(820px, calc(100% - 24px)); max-height: calc(100dvh - 24px);
      overflow: auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); background: var(--panel); border-radius: 16px; box-shadow: 0 30px 80px rgba(0,0,0,.45); }
    .big { background: #1b2126; display: grid; place-items: center; }
    .big img { width: 100%; max-height: calc(100dvh - 24px); object-fit: contain; display: block; }
    .info { padding: 22px; display: grid; gap: 10px; align-content: start; }
    .info h2 { margin: 0; }
    .code2 { justify-self: start; background: #1f3a8a; color: #fff; font: 800 13px var(--f-num); padding: 3px 10px; border-radius: 6px; }
    .price { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
    .price b { font: 800 28px var(--f-display); color: var(--fire-dark); }
    ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    li { display: flex; gap: 8px; align-items: flex-start; font-size: 14px; }
    li app-icon { color: var(--fire); margin-top: 2px; }
    .acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px; }
    .xbtn { position: absolute; top: 8px; right: 8px; z-index: 1; background: rgba(0,0,0,.55); color: #fff; border: none; border-radius: 999px; padding: 8px; cursor: pointer; }
    @media (max-width: 640px) {
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
      .modal { grid-template-columns: 1fr; top: auto; bottom: 0; transform: translateX(-50%); width: 100%; border-radius: 16px 16px 0 0; max-height: 92dvh; }
      .big img { max-height: 46dvh; }
      .info { padding: 16px; }
    }
  `,
})
export class DoorCatalog {
  /** Texto del botón principal de la ficha. */
  readonly pickLabel = input('Cotizar este modelo');
  readonly pick = output<Modelo>();

  protected readonly all = MODELOS;
  protected readonly grupos = GRUPOS;
  protected q = signal('');
  protected g = signal('');
  protected sel = signal<Modelo | null>(null);
  protected fmt = fmt;

  protected list = computed(() => {
    const words = norm(this.q()).split(/\s+/).filter(Boolean);
    const grp = GRUPOS.find((x) => x.name === this.g());
    return MODELOS.filter((m) => (!grp || grp.test(m)) && words.every((w) => norm(`${m.code} ${m.code.replace(' ', '')} ${m.title} ${m.notes}`).includes(w)));
  });

  isPlain(m: Modelo) {
    return /sin contraplacar/i.test(m.title);
  }

  notes(m: Modelo) {
    return m.notes ? m.notes.split(' · ') : [];
  }

  choose(m: Modelo) {
    this.sel.set(null);
    this.pick.emit(m);
  }
}
