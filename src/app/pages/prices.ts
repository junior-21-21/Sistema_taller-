import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, Toast } from '../core/store.service';
import { CatalogItem, Detail, UNITS } from '../core/models';
import { detailLines, emptyDetail, fixDetail, hasDetail } from '../core/detail';
import { DetailEditor } from './detail-editor';
import { DEFAULT_CATALOG, SUGERIDOS } from '../core/default-data';
import { fmt, norm } from '../core/calc';
import { focusFirstError } from '../core/validate';
import { Icon, catIcon } from './icon';

type Form = { code: string; cat: string; name: string; inc: string; unit: string; material: number | null; labor: number | null; detail?: Detail };
const EMPTY: Form = { code: '', cat: '', name: '', inc: '', unit: 'm²', material: null, labor: null };

/** Lista de precios: tarjetas por categoría, con formulario para agregar, editar y borrar. Cada cambio se guarda solo. */
@Component({
  selector: 'app-prices',
  imports: [FormsModule, Icon, DetailEditor],
  // Los cambios aquí se guardan solos: no deben activar "Tienes cambios sin guardar" de la página.
  host: { '(input)': '$event.stopPropagation()', '(change)': '$event.stopPropagation()' },
  template: `
    <section class="card pl">
      <div class="top">
        <div>
          <h2>Lista de precios</h2>
          <p class="muted small">{{ store.catalog().length }} servicios · Precio = material + mano de obra. Cada cambio se guarda solo en la hoja.</p>
        </div>
        <button type="button" class="btn primary" (click)="openNew()"><app-icon name="plus" [size]="18" /> Agregar servicio</button>
      </div>

      @if (sugeridos().length) {
        <details class="sug" [open]="!store.catalog().length">
          <summary><app-icon name="tools" [size]="16" /> Servicios para agregar rápido <span class="muted">({{ sugeridos().length }})</span></summary>
          <p class="muted small">Toca uno, pon tu precio y listo. Ej.: solo techado sobre una estructura que ya existe.</p>
          <div class="chips">
            @for (s of sugeridos(); track s.name) {
              <button type="button" class="chip cchip" (click)="openSug(s)"><app-icon [name]="catIcon(s.cat)" [size]="15" /> {{ s.name }}</button>
            }
          </div>
        </details>
      }

      @if (samples().length) {
        <div class="sample">
          <span>⚠ Tienes <b>{{ samples().length }} precios de ejemplo</b> sin cambiar. Edítalos con tus precios reales o quítalos.</span>
          <button type="button" class="btn danger sm" (click)="removeSamples()">{{ armedAll() ? '¿Seguro? Toca otra vez' : 'Quitar ejemplos' }}</button>
        </div>
      }

      @if (store.catalog().length) {
        <div class="tools">
          <label class="searchbox"><app-icon name="search" />
            <input type="search" placeholder="Buscar servicio" [ngModel]="q()" (ngModelChange)="q.set($event)" aria-label="Buscar servicio">
          </label>
          <div class="chips">
            <button type="button" class="chip" [class.on]="!cat()" (click)="cat.set('')">Todos</button>
            @for (c of store.categories(); track c) {
              <button type="button" class="chip cchip" [class.on]="cat() === c" (click)="cat.set(c)"><app-icon [name]="catIcon(c)" [size]="15" /> {{ c }}</button>
            }
          </div>
        </div>
      }

      @for (g of groups(); track g.cat) {
        <div class="grp">
          <h3><span class="gi"><app-icon [name]="catIcon(g.cat)" [size]="18" /></span> {{ g.cat }} <span class="cnt">{{ g.items.length }}</span></h3>
          <div class="cards">
            @for (c of g.items; track c.code) {
              <article class="sv" [class.ex]="isSample(c)">
                <div class="sh">
                  <b class="nm">{{ c.name }}</b>
                  @if (isSample(c)) { <span class="tag">Ejemplo</span> }
                </div>
                @if (c.inc) { <p class="inc">{{ c.inc }}</p> }
                @if (c.detail && detailLines(c.detail).length) {
                  <p class="spec" [title]="detailLines(c.detail).join('\n')"><app-icon name="bars" [size]="14" /> {{ specSummary(c) }}</p>
                }
                <div class="pr">
                  <span class="big money">{{ fmt(c.material + c.labor) }}</span><span class="u">/ {{ c.unit }}</span>
                </div>
                <div class="split">
                  <span>Material <b class="money">{{ fmt(c.material) }}</b></span>
                  <span>Mano de obra <b class="money">{{ fmt(c.labor) }}</b></span>
                </div>
                <div class="act">
                  <button type="button" class="iconbtn" (click)="openEdit(c)"><app-icon name="edit" [size]="16" /> Editar</button>
                  <button type="button" class="iconbtn danger" (click)="del(c)"><app-icon name="trash" [size]="16" /> {{ armed() === c.code ? '¿Seguro?' : 'Borrar' }}</button>
                </div>
              </article>
            }
          </div>
        </div>
      } @empty {
        <div class="empty">
          @if (store.catalog().length) { Ningún servicio coincide con esa búsqueda. }
          @else {
            <app-icon name="torch" [size]="32" />
            <p>Todavía no tienes servicios. Agrega el primero con su precio real.</p>
            <button type="button" class="btn primary" (click)="openNew()">+ Agregar servicio</button>
          }
        </div>
      }
    </section>

    @if (form(); as f) {
      <div class="back" (click)="close()"></div>
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="editing() ? 'Editar servicio' : 'Nuevo servicio'">
        <div class="mh">
          <span class="mi"><app-icon [name]="catIcon(f.cat || '')" [size]="22" /></span>
          <h2>{{ editing() ? 'Editar servicio' : 'Nuevo servicio' }}</h2>
          <button type="button" class="xbtn" (click)="close()" aria-label="Cerrar"><app-icon name="close" /></button>
        </div>
        <div class="mb">
          <label class="f" [class.bad]="tried() && !f.name.trim()">
            <span>Nombre del servicio <span class="req">*</span></span>
            <input id="sv-name" [(ngModel)]="f.name" placeholder="Ej: Puerta metálica de plancha" autocomplete="off">
            @if (tried() && !f.name.trim()) { <span class="fe">Escribe el nombre del servicio.</span> }
          </label>
          <label class="f" [class.bad]="tried() && !f.cat.trim()">
            <span>Categoría <span class="req">*</span></span>
            <input [(ngModel)]="f.cat" list="cats" placeholder="Elige o escribe una nueva" autocomplete="off">
            @if (tried() && !f.cat.trim()) { <span class="fe">Elige una categoría o escribe una nueva.</span> }
          </label>
          <datalist id="cats">@for (c of store.categories(); track c) { <option [value]="c"></option> }</datalist>
          <div class="cat-pick">
            @for (c of store.categories(); track c) {
              <button type="button" class="chip cchip" [class.on]="f.cat === c" (click)="f.cat = c"><app-icon [name]="catIcon(c)" [size]="14" /> {{ c }}</button>
            }
          </div>
          <label class="f"><span>Qué incluye <span class="muted">(sale en la cotización)</span></span>
            <textarea [(ngModel)]="f.inc" rows="2" placeholder="Ej: Marco de tubo 2x2, plancha LAF 1/40, pintura anticorrosiva"></textarea>
          </label>
          <button type="button" class="dt" [class.on]="showDet()" (click)="toggleDet()">
            <app-icon name="bars" [size]="16" /> Materiales, espesores y chapa que usa <span class="muted">(opcional)</span>
            <span class="car">{{ showDet() ? '▲' : '▼' }}</span>
          </button>
          @if (showDet() && f.detail) {
            <p class="muted small hint">Se copian solos a cada cotización con este servicio; ahí los puedes cambiar.</p>
            <app-detail-editor [detail]="f.detail" />
          }
          <div class="f">
            <span class="f-l">Se cobra por <span class="req">*</span></span>
            <div class="chips">
              @for (u of units; track u) { <button type="button" class="chip" [class.on]="f.unit === u" (click)="f.unit = u">{{ u }}</button> }
            </div>
          </div>
          <div class="two">
            <label class="f" [class.bad]="tried() && bad(f.material)">
              <span>Material S/ <span class="req">*</span></span>
              <input type="number" min="0" step="0.5" inputmode="decimal" [(ngModel)]="f.material" placeholder="0.00">
              @if (tried() && bad(f.material)) { <span class="fe">Pon el costo del material (0 o más).</span> }
            </label>
            <label class="f" [class.bad]="tried() && bad(f.labor)">
              <span>Mano de obra S/ <span class="req">*</span></span>
              <input type="number" min="0" step="0.5" inputmode="decimal" [(ngModel)]="f.labor" placeholder="0.00">
              @if (tried() && bad(f.labor)) { <span class="fe">Pon la mano de obra (0 o más).</span> }
            </label>
          </div>
          <div class="total" [class.zero]="!total(f)">
            <span>Precio al cliente</span>
            <b class="money">{{ fmt(total(f)) }} <small>/ {{ f.unit }}</small></b>
          </div>
          @if (tried() && !total(f) && !bad(f.material) && !bad(f.labor)) { <span class="fe">El precio debe ser mayor a S/ 0.00.</span> }
        </div>
        <div class="mf">
          <button type="button" class="btn ghost" (click)="close()">Cancelar</button>
          <button type="button" class="btn primary" (click)="submit()">{{ editing() ? 'Guardar cambios' : 'Agregar servicio' }}</button>
        </div>
      </div>
    }
  `,
  styles: `
    .pl { display: grid; gap: 16px; }
    .top { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
    .top p { margin: 4px 0 0; }
    .sample { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: var(--warn-soft); color: var(--warn); border: 1px solid #f0c48a; border-radius: 10px; padding: 10px 14px; font-weight: 600; }
    .btn.sm { min-height: 38px; padding: 7px 14px; }
    .tools { display: grid; gap: 10px; }
    .sug { border: 1.5px dashed var(--line); border-radius: 12px; padding: 10px 14px; }
    .sug summary { cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 8px; }
    .sug p { margin: 8px 0; }
    .cchip { display: inline-flex; align-items: center; gap: 6px; }
    .grp { display: grid; gap: 10px; }
    .grp h3 { display: flex; align-items: center; gap: 8px; margin: 6px 0 0; font: 800 18px var(--f-display); text-transform: uppercase; letter-spacing: .04em; }
    .gi { width: 30px; height: 30px; border-radius: 8px; background: var(--steel); color: var(--amber); display: grid; place-items: center; }
    .cnt { font: 700 12px var(--f-body); background: var(--bg); color: var(--muted); border-radius: 999px; padding: 2px 8px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
    .sv { position: relative; display: grid; gap: 8px; align-content: start; background: var(--panel); border: 1.5px solid var(--line); border-radius: 12px; padding: 14px; box-shadow: var(--shadow); border-top: 4px solid var(--fire); }
    .sv:hover { border-color: var(--fire); }
    .sv.ex { border-top-color: var(--amber); background: linear-gradient(#fffaf2, #fff); }
    .sh { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; }
    .nm { font-size: 16px; line-height: 1.25; }
    .tag { font-size: 11px; font-weight: 700; background: var(--warn-soft); color: var(--warn); border-radius: 999px; padding: 2px 8px; white-space: nowrap; }
    .inc { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pr { display: flex; align-items: baseline; gap: 6px; }
    .pr .big { font: 800 26px var(--f-display); color: var(--fire-dark); }
    .pr .u { color: var(--muted); font-weight: 600; }
    .split { display: flex; gap: 6px 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); border-top: 1px dashed var(--line); padding-top: 8px; }
    .split b { color: var(--ink); font-size: 13px; }
    .act { display: flex; gap: 8px; }
    .empty { display: grid; justify-items: center; gap: 8px; text-align: center; }
    .empty app-icon { color: var(--fire); }

    .back { position: fixed; inset: 0; background: rgba(15, 18, 22, .55); z-index: 70; backdrop-filter: blur(2px); }
    .modal { position: fixed; z-index: 71; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, calc(100% - 24px));
      max-height: calc(100dvh - 24px); display: grid; grid-template-rows: auto 1fr auto; background: var(--panel); border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.4); }
    .mh { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--steel); background-image: var(--plate); color: #fff; border-bottom: 4px solid transparent; border-image: var(--hazard) 1; }
    .mh h2 { margin: 0; color: #fff; flex: 1; }
    .mh h2::after { display: none; }
    .mi { width: 38px; height: 38px; border-radius: 9px; background: var(--molten); display: grid; place-items: center; }
    .xbtn { background: none; border: none; color: #fff; cursor: pointer; padding: 6px; border-radius: 8px; }
    .xbtn:hover { background: rgba(255,255,255,.12); }
    .mb { overflow: auto; padding: 16px; display: grid; gap: 14px; }
    .f { display: grid; gap: 6px; }
    .f-l { font-size: 13px; font-weight: 600; color: var(--muted); }
    .cat-pick { display: flex; gap: 6px; flex-wrap: wrap; margin-top: -6px; }
    .cat-pick .chip { padding: 5px 10px; font-size: 13px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .total { display: flex; justify-content: space-between; align-items: baseline; background: var(--soft); border: 1.5px solid #f6c59a; border-radius: 12px; padding: 12px 14px; font-weight: 700; }
    .total b { font: 800 28px var(--f-display); color: var(--fire-dark); }
    .total small { font: 600 14px var(--f-body); color: var(--muted); }
    .total.zero b { color: var(--muted); }
    .spec { margin: 0; display: flex; gap: 5px; align-items: center; font-size: 12px; font-weight: 600; color: var(--steel-3); background: var(--bg); border-radius: 8px; padding: 5px 8px; }
    .spec app-icon { color: var(--fire); }
    .dt { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; border: 1.5px dashed var(--line); background: var(--bg); color: var(--ink);
      border-radius: 10px; padding: 10px 12px; font: 600 14px var(--f-body); cursor: pointer; }
    .dt:hover, .dt.on { border-color: var(--fire); background: var(--soft); }
    .dt app-icon { color: var(--fire); }
    .dt .car { margin-left: auto; font-size: 11px; color: var(--muted); }
    .hint { margin: -6px 0 0; }
    .mf { display: flex; gap: 10px; justify-content: flex-end; padding: 12px 16px; border-top: 1px solid var(--line); background: var(--bg); }
    @media (max-width: 560px) { .modal { top: auto; bottom: 0; transform: translateX(-50%); border-radius: 16px 16px 0 0; width: 100%; } .mf .btn { flex: 1; } }
  `,
})
export class Prices {
  protected store = inject(Store);
  private toast = inject(Toast);
  protected fmt = fmt;
  protected catIcon = catIcon;
  protected units = UNITS;

  protected q = signal('');
  protected cat = signal('');
  protected form = signal<Form | null>(null);
  protected editing = signal(false);
  protected tried = signal(false);
  protected armed = signal('');
  protected armedAll = signal(false);
  protected showDet = signal(false);
  protected detailLines = detailLines;

  specSummary(c: CatalogItem) {
    const n = c.detail!.mats.filter((m) => m.name.trim()).length;
    return [n ? `${n} material${n === 1 ? '' : 'es'}` : '', c.detail!.chapa ? 'con chapa' : 'sin chapa', c.detail!.pintura].filter(Boolean).join(' · ');
  }

  toggleDet() {
    const f = this.form();
    if (f && !f.detail) f.detail = emptyDetail();
    this.showDet.update((v) => !v);
  }

  protected groups = computed(() => {
    const words = norm(this.q()).split(/\s+/).filter(Boolean);
    const list = this.store.catalog().filter(
      (c) => (!this.cat() || c.cat === this.cat()) && words.every((w) => norm(`${c.name} ${c.inc} ${c.cat}`).includes(w)),
    );
    const map = new Map<string, CatalogItem[]>();
    for (const c of list) map.set(c.cat, [...(map.get(c.cat) || []), c]);
    return [...map].map(([cat, items]) => ({ cat, items }));
  });

  protected samples = computed(() => this.store.catalog().filter((c) => this.isSample(c)));

  isSample(c: CatalogItem) {
    return DEFAULT_CATALOG.some((d) => d.code === c.code && d.name === c.name && d.material === c.material && d.labor === c.labor);
  }

  bad = (v: number | null) => v === null || (v as unknown) === '' || isNaN(+v) || +v < 0;
  total = (f: Form) => (this.bad(f.material) ? 0 : +f.material!) + (this.bad(f.labor) ? 0 : +f.labor!);

  protected sugeridos = computed(() => {
    const have = new Set(this.store.catalog().map((c) => norm(c.name)));
    return SUGERIDOS.filter((s) => !have.has(norm(s.name)));
  });

  openSug(s: (typeof SUGERIDOS)[number]) {
    this.openNew();
    this.form.set({ ...EMPTY, cat: s.cat, name: s.name, inc: s.inc, unit: s.unit });
  }

  openNew() {
    this.form.set({ ...EMPTY, cat: this.cat() || '' });
    this.showDet.set(false);
    this.editing.set(false);
    this.tried.set(false);
    setTimeout(() => document.getElementById('sv-name')?.focus());
  }

  openEdit(c: CatalogItem) {
    this.form.set({ ...structuredClone(c), detail: structuredClone(fixDetail(c.detail)) });
    this.showDet.set(false);
    this.editing.set(true);
    this.tried.set(false);
  }

  close() {
    this.form.set(null);
  }

  submit() {
    const f = this.form();
    if (!f) return;
    this.tried.set(true);
    if (!f.name.trim() || !f.cat.trim() || this.bad(f.material) || this.bad(f.labor) || !this.total(f)) {
      focusFirstError();
      return;
    }
    const item: CatalogItem = {
      code: f.code || this.nextCode(), cat: f.cat.trim(), name: f.name.trim(), inc: f.inc.trim(), unit: f.unit,
      material: +f.material!, labor: +f.labor!,
      ...(f.detail && hasDetail(f.detail) ? { detail: { ...f.detail, mats: f.detail.mats.filter((m) => m.name.trim()) } } : {}),
    };
    const list = this.store.catalog();
    this.store.setCatalog(this.editing() ? list.map((c) => (c.code === item.code ? item : c)) : [...list, item]);
    this.toast.show(this.editing() ? `Guardado: ${item.name}.` : `Agregado: ${item.name}.`);
    this.close();
  }

  private nextCode() {
    const used = new Set(this.store.catalog().map((c) => c.code));
    let n = 1;
    while (used.has(`SV-${String(n).padStart(3, '0')}`)) n++;
    return `SV-${String(n).padStart(3, '0')}`;
  }

  del(c: CatalogItem) {
    if (this.armed() !== c.code) {
      this.armed.set(c.code);
      setTimeout(() => this.armed() === c.code && this.armed.set(''), 3500);
      return;
    }
    this.armed.set('');
    this.store.setCatalog(this.store.catalog().filter((x) => x.code !== c.code));
    this.toast.show(`Borrado: ${c.name}.`);
  }

  removeSamples() {
    if (!this.armedAll()) {
      this.armedAll.set(true);
      setTimeout(() => this.armedAll.set(false), 4000);
      return;
    }
    this.armedAll.set(false);
    const n = this.samples().length;
    this.store.setCatalog(this.store.catalog().filter((c) => !this.isSample(c)));
    this.toast.show(`Se quitaron ${n} precios de ejemplo.`);
  }
}
