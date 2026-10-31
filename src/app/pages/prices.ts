import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Store, Toast } from '../core/store.service';
import { CatalogItem, Detail, Foto, UNITS } from '../core/models';
import { detailLines, emptyDetail, fixDetail, hasDetail } from '../core/detail';
import { DetailEditor } from './detail-editor';
import { SUGERIDOS } from '../core/default-data';
import { fmt, norm } from '../core/calc';
import { focusFirstError } from '../core/validate';
import { Icon, catIcon } from './icon';
import { DoorCatalog } from './door-catalog';
import { newFotoId, shrinkPhoto } from '../core/foto';
import { REFS, refFor, refSrc } from '../core/referencias';
import { SheetService } from '../core/sheet.service';

type Form = { code: string; cat: string; name: string; inc: string; unit: string; material: number | null; labor: number | null; detail?: Detail; fotos: Foto[] };
const EMPTY: Omit<Form, 'fotos'> = { code: '', cat: '', name: '', inc: '', unit: 'm²', material: null, labor: null };
const MAX_FOTOS = 8;

/** Lista de precios: tarjetas por categoría, con formulario para agregar, editar y borrar. Cada cambio se guarda solo. */
@Component({
  selector: 'app-prices',
  imports: [FormsModule, Icon, DetailEditor, DoorCatalog],
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

      @if (noPhoto().length) {
        <div class="refbar">
          <span><app-icon name="images" [size]="18" /> <b>{{ noPhoto().length }} servicios sin foto.</b> Ponles su dibujo de referencia y se guardan en la hoja (luego los cambias por fotos de tus trabajos).</span>
          <button type="button" class="btn sm" (click)="fillRefs()">Poner dibujos</button>
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
              <article class="sv">
                @let fs = store.fotosOf(c.code);
                <button type="button" class="cover" (click)="openEdit(c)" [attr.aria-label]="'Fotos de ' + c.name">
                  <img [src]="fs.length ? fs[0].src : refFor(c.name, c.cat)" alt="" loading="lazy">
                  @if (fs.length > 1) { <span class="nf"><app-icon name="images" [size]="13" /> {{ fs.length }}</span> }
                  @if (!fs.length) { <span class="nf ref">Referencia</span> }
                </button>
                <div class="sh">
                  <b class="nm">{{ c.name }}</b>
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
          <div class="f">
            <span class="f-l">Fotos del trabajo <span class="muted">(al cotizar eliges cuál sale en la hoja)</span></span>
            <div class="fotos">
              @for (x of f.fotos; track x.id; let i = $index) {
                <div class="fo" [class.first]="i === 0">
                  <img [src]="x.src" alt="">
                  @if (i === 0) { <span class="pri">Principal</span> } @else {
                    <button type="button" class="star" (click)="first(f, i)" aria-label="Poner como principal" title="Poner como principal"><app-icon name="star" [size]="14" /></button>
                  }
                  <button type="button" class="del" (click)="f.fotos.splice(i, 1)" aria-label="Quitar foto"><app-icon name="close" [size]="14" /></button>
                </div>
              }
              @if (f.fotos.length < maxFotos) {
                <label class="add" [class.busy]="busy()">
                  <input type="file" accept="image/*" multiple (change)="upload(f, $event)" [disabled]="busy()">
                  <app-icon name="camera" [size]="22" /><span>{{ busy() ? 'Cargando…' : 'Subir foto' }}</span>
                </label>
                <button type="button" class="add" (click)="pickDoor.set(true)"><app-icon name="door" [size]="22" /><span>Del catálogo de puertas</span></button>
                <button type="button" class="add" (click)="pickRef.set(!pickRef())"><app-icon name="images" [size]="22" /><span>Dibujos de referencia</span></button>
              }
            </div>
            @if (pickRef()) {
              <div class="refs">
                @for (x of refsFor(f); track x.key) {
                  <button type="button" class="rf" (click)="addRef(f, x.key)"><img [src]="refSrc(x.key)" alt=""><span>{{ x.title }}</span></button>
                }
              </div>
            }
            @if (needsScript()) { <span class="fe">Para guardar fotos en la hoja falta actualizar el código de Apps Script (pestaña Fotos). Mientras tanto se quedan en este equipo.</span> }
          </div>
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
      @if (pickDoor()) {
        <div class="dsheet" role="dialog" aria-modal="true" aria-label="Elegir foto del catálogo de puertas">
          <div class="dsh"><b>Elige una foto</b><button type="button" class="btn ghost" (click)="pickDoor.set(false)">Cerrar</button></div>
          <app-door-catalog pickLabel="Usar esta foto" (pick)="addDoor(f, $event.img)" />
        </div>
      }
    }
  `,
  styles: `
    .pl { display: grid; gap: 16px; }
    .top { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; }
    .top p { margin: 4px 0 0; }
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
    .sh { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; }
    .nm { font-size: 16px; line-height: 1.25; }
    .inc { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .pr { display: flex; align-items: baseline; gap: 6px; }
    .pr .big { font: 800 26px var(--f-display); color: var(--fire-dark); }
    .pr .u { color: var(--muted); font-weight: 600; }
    .split { display: flex; gap: 6px 14px; flex-wrap: wrap; font-size: 12.5px; color: var(--muted); border-top: 1px dashed var(--line); padding-top: 8px; }
    .split b { color: var(--ink); font-size: 13px; }
    .act { display: flex; gap: 8px; }
    .cover { position: relative; margin: -14px -14px 0; padding: 0; border: none; cursor: pointer; display: block; height: 160px; background: #1b2126; border-radius: 8px 8px 0 0; overflow: hidden; }
    .cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .nf.ref { background: rgba(43, 49, 56, .75); }
    .refbar { display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap; background: var(--soft); border: 1px solid #f6c9a3; border-radius: 10px; padding: 10px 14px; }
    .refbar span { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .refbar app-icon { color: var(--fire); }
    .refs { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; margin-top: 4px; padding: 10px; background: var(--bg); border-radius: 10px; }
    .rf { display: grid; gap: 4px; padding: 4px; border: 1.5px solid var(--line); border-radius: 8px; background: var(--panel); cursor: pointer; font: 600 12px var(--f-body); color: var(--ink); }
    .rf:hover { border-color: var(--fire); }
    .rf img { width: 100%; aspect-ratio: 4 / 3; display: block; border-radius: 5px; }
    .nf { position: absolute; right: 8px; bottom: 8px; display: inline-flex; gap: 4px; align-items: center; background: rgba(0,0,0,.65); color: #fff; font: 700 12px var(--f-body); padding: 3px 8px; border-radius: 999px; }
    .fotos { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
    .fo { position: relative; aspect-ratio: 3 / 4; border-radius: 10px; overflow: hidden; background: #1b2126; border: 2px solid var(--line); }
    .fo.first { border-color: var(--fire); }
    .fo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pri { position: absolute; left: 4px; bottom: 4px; background: var(--fire); color: #fff; font: 700 11px var(--f-body); padding: 2px 6px; border-radius: 6px; }
    .fo button { position: absolute; top: 4px; width: 28px; height: 28px; border-radius: 50%; border: none; background: rgba(0,0,0,.65); color: #fff; display: grid; place-items: center; cursor: pointer; padding: 0; }
    .fo .del { right: 4px; }
    .fo .star { left: 4px; }
    .add { aspect-ratio: 3 / 4; border: 2px dashed var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); display: grid; place-content: center; justify-items: center; gap: 6px;
      text-align: center; font: 600 12.5px var(--f-body); cursor: pointer; padding: 6px; }
    .add:hover { border-color: var(--fire); background: var(--soft); }
    .add app-icon { color: var(--fire); }
    .add input { display: none; }
    .add.busy { opacity: .6; cursor: progress; }
    .dsheet { position: fixed; z-index: 90; inset: 0; background: var(--bg); overflow: auto; padding: 0 16px 24px; }
    .dsh { position: sticky; top: 0; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 0; background: var(--bg); font-size: 18px; }
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
  protected showDet = signal(false);
  protected pickDoor = signal(false);
  protected pickRef = signal(false);
  protected refFor = refFor;
  protected refSrc = refSrc;
  protected noPhoto = computed(() => this.store.catalog().filter((c) => !this.store.fotosOf(c.code).length));
  protected busy = signal(false);
  protected readonly maxFotos = MAX_FOTOS;
  private sheet = inject(SheetService);
  /** La hoja de Google todavía no tiene la pestaña Fotos. */
  protected needsScript = () => this.sheet.loaded() && !this.sheet.hasFotos() && !!this.form()?.fotos.length;
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

  bad = (v: number | null) => v === null || (v as unknown) === '' || isNaN(+v) || +v < 0;
  total = (f: Form) => (this.bad(f.material) ? 0 : +f.material!) + (this.bad(f.labor) ? 0 : +f.labor!);

  protected sugeridos = computed(() => {
    const have = new Set(this.store.catalog().map((c) => norm(c.name)));
    return SUGERIDOS.filter((s) => !have.has(norm(s.name)));
  });

  openSug(s: (typeof SUGERIDOS)[number]) {
    this.openNew();
    this.form.set({ ...EMPTY, cat: s.cat, name: s.name, inc: s.inc, unit: s.unit, fotos: [] });
  }

  openNew() {
    this.form.set({ ...EMPTY, cat: this.cat() || '', fotos: [] });
    this.showDet.set(false);
    this.editing.set(false);
    this.tried.set(false);
    setTimeout(() => document.getElementById('sv-name')?.focus());
  }

  openEdit(c: CatalogItem) {
    this.form.set({ ...structuredClone(c), detail: structuredClone(fixDetail(c.detail)), fotos: [...this.store.fotosOf(c.code)] });
    this.showDet.set(false);
    this.editing.set(true);
    this.tried.set(false);
  }

  close() {
    this.form.set(null);
    this.pickDoor.set(false);
    this.pickRef.set(false);
  }

  async upload(f: Form, e: Event) {
    const input = e.target as HTMLInputElement;
    const files = [...(input.files ?? [])].slice(0, MAX_FOTOS - f.fotos.length);
    input.value = '';
    this.busy.set(true);
    let bad = 0;
    for (const file of files) {
      try {
        f.fotos.push({ id: newFotoId(), code: f.code, n: f.fotos.length, src: await shrinkPhoto(file) });
      } catch {
        bad++;
      }
    }
    this.busy.set(false);
    if (bad) this.toast.show(bad === 1 ? 'No pude abrir esa foto. Prueba con otra.' : `No pude abrir ${bad} fotos. Prueba con otras.`);
  }

  addDoor(f: Form, src: string) {
    if (f.fotos.length < MAX_FOTOS && !f.fotos.some((x) => x.src === src)) f.fotos.push({ id: newFotoId(), code: f.code, n: f.fotos.length, src });
    this.pickDoor.set(false);
  }

  /** Los dibujos, con el que más se parece al servicio primero. */
  refsFor(f: Form) {
    const best = refFor(f.name, f.cat);
    return [...REFS].sort((a, b) => +(refSrc(b.key) === best) - +(refSrc(a.key) === best));
  }

  addRef(f: Form, key: string) {
    const src = refSrc(key);
    if (f.fotos.length < MAX_FOTOS && !f.fotos.some((x) => x.src === src)) f.fotos.push({ id: newFotoId(), code: f.code, n: f.fotos.length, src });
    this.pickRef.set(false);
  }

  /** Guarda en la hoja el dibujo de referencia de cada servicio sin foto. */
  fillRefs() {
    const list = this.noPhoto();
    list.forEach((c, i) => this.store.saveFoto({ id: newFotoId() + i, code: c.code, n: 0, src: refFor(c.name, c.cat) }));
    this.toast.show(`Listo: ${list.length} servicios con su dibujo de referencia.`);
  }

  first(f: Form, i: number) {
    f.fotos.unshift(...f.fotos.splice(i, 1));
  }

  /** Guarda en la hoja solo las fotos nuevas, quitadas o que cambiaron de lugar. */
  private saveFotos(code: string, fotos: Foto[]) {
    const old = this.store.fotosOf(code);
    for (const o of old) if (!fotos.some((x) => x.id === o.id)) this.store.deleteFoto(o.id);
    fotos.forEach((x, n) => {
      const o = old.find((y) => y.id === x.id);
      if (!o || o.n !== n || o.code !== code) this.store.saveFoto({ ...x, code, n });
    });
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
    this.saveFotos(item.code, f.fotos);
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
    for (const x of this.store.fotosOf(c.code)) this.store.deleteFoto(x.id);
    this.toast.show(`Borrado: ${c.name}.`);
  }
}
