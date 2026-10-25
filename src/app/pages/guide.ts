import { AfterViewInit, Component, ElementRef, HostListener, Injectable, OnDestroy, effect, inject, input, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';

/** Recuerda qué explicaciones ya cerró la persona. */
@Injectable({ providedIn: 'root' })
export class GuideService {
  private read(): string[] {
    try {
      return JSON.parse(localStorage.getItem('rr.guides') || '[]');
    } catch {
      return [];
    }
  }
  readonly closed = signal<string[]>(this.read());
  readonly tourOpen = signal(this.firstTime());

  private firstTime() {
    try {
      return !localStorage.getItem('rr.tour');
    } catch {
      return false;
    }
  }

  close(id: string) {
    this.closed.update((l) => [...new Set([...l, id])]);
    try { localStorage.setItem('rr.guides', JSON.stringify(this.closed())); } catch { /* nada */ }
  }

  showAll() {
    this.closed.set([]);
    try { localStorage.removeItem('rr.guides'); } catch { /* nada */ }
  }

  endTour() {
    this.tourOpen.set(false);
    try { localStorage.setItem('rr.tour', '1'); } catch { /* nada */ }
  }
}

/** Botón "?" que explica un dato con una burbuja. */
@Component({
  selector: 'app-hint',
  template: `
    <button type="button" class="q" (click)="toggle($event)" [attr.aria-expanded]="open()" aria-label="¿Qué es esto?">?</button>
    @if (open()) { <span class="bubble" role="tooltip"><ng-content /></span> }
  `,
  styles: `
    :host { position: relative; display: inline-flex; vertical-align: middle; }
    .q { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid currentColor; background: transparent; color: inherit; opacity: .6;
      font: 700 12px var(--f-body); cursor: pointer; display: grid; place-items: center; padding: 0; }
    .q:hover, .q[aria-expanded='true'] { opacity: 1; color: var(--fire); }
    .bubble { position: absolute; z-index: 40; top: calc(100% + 8px); left: 50%; transform: translateX(-50%); width: max-content; max-width: min(260px, 80vw);
      background: var(--steel); color: #fff; font: 500 14px/1.4 var(--f-body); text-transform: none; letter-spacing: 0; padding: 10px 12px; border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .3); border-top: 3px solid var(--fire); white-space: normal; text-align: left; }
  `,
})
export class Hint {
  protected open = signal(false);
  private el = inject(ElementRef<HTMLElement>);
  toggle(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.open.update((v) => !v);
  }
  @HostListener('document:click', ['$event'])
  outside(e: Event) {
    if (this.open() && !this.el.nativeElement.contains(e.target as Node)) this.open.set(false);
  }
}

/** Explicación de la pantalla: qué ves y cómo se usa. Se puede cerrar. */
@Component({
  selector: 'app-guide',
  imports: [Icon],
  template: `
    @if (!svc.closed().includes(id())) {
      <aside class="guide" role="note">
        <span class="ic"><app-icon name="helmet" [size]="26" /></span>
        <div class="body">
          <b>{{ title() }}</b>
          <ng-content />
        </div>
        <button type="button" class="ok" (click)="svc.close(id())">Entendido</button>
      </aside>
    }
  `,
  styles: `
    .guide { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: start; background: var(--soft); border: 1px solid #f6c9a3;
      border-left: 6px solid var(--fire); border-radius: var(--r); padding: 14px 16px; }
    .ic { width: 44px; height: 44px; border-radius: 10px; background: var(--steel); color: var(--amber); display: grid; place-items: center; }
    .body { display: grid; gap: 6px; min-width: 0; }
    .body b { font: 700 18px var(--f-display); text-transform: uppercase; letter-spacing: .03em; }
    .body ::ng-deep ol, .body ::ng-deep ul { margin: 0; padding-left: 20px; display: grid; gap: 3px; }
    .body ::ng-deep p { margin: 0; }
    .ok { border: 1.5px solid var(--fire); background: #fff; color: var(--fire-dark); font: 700 14px var(--f-body); border-radius: 9px; padding: 8px 14px; cursor: pointer; white-space: nowrap; }
    .ok:hover { background: var(--fire); color: #fff; }
    @media (max-width: 560px) { .guide { grid-template-columns: 1fr; } .ic { display: none; } .ok { justify-self: start; } }
  `,
})
export class Guide {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  protected svc = inject(GuideService);
}

const SLIDES = [
  { icon: 'helmet', title: 'Bienvenido a tu taller digital', text: 'Aquí haces cotizaciones, contratos y notas de venta de Run Run, y todo queda guardado en tu Excel. Te muestro cómo funciona en 4 pasos.' },
  { icon: 'quote', title: '1. El cliente pide precio', text: 'Toca el botón naranja "+". Pega su mensaje de WhatsApp, elige los trabajos (portón, reja, techo…) y pon las medidas. El precio se calcula solo.' },
  { icon: 'wa', title: '2. Envíale la cotización', text: 'Con un toque le llega por WhatsApp, o sacas una hoja con tu logo para imprimir o guardar en PDF.' },
  { icon: 'cash', title: '3. Acepta y paga', text: 'En Cotizaciones toca "Cobrar". Sale la nota de venta del adelanto, y después la del saldo cuando entregas. Si hace falta, imprime el contrato.' },
  { icon: 'file', title: '4. Todo queda en tu Excel', text: 'Conecta el archivo runrun-datos.xlsx en "Precios y taller". Cada cambio se guarda solo. Si te pierdes, toca "Ayuda" o los botones "?".' },
];

/** Bienvenida paso a paso la primera vez. */
@Component({
  selector: 'app-tour',
  imports: [Icon, RouterLink],
  template: `
    @if (svc.tourOpen()) {
      <div class="back" (click)="svc.endTour()"></div>
      <div class="tour" role="dialog" aria-modal="true" [attr.aria-label]="slide().title">
        <div class="head steel">
          <canvas #sparks aria-hidden="true"></canvas>
          <span class="big"><app-icon [name]="slide().icon" [size]="44" /></span>
        </div>
        <div class="txt">
          <h2>{{ slide().title }}</h2>
          <p>{{ slide().text }}</p>
        </div>
        <div class="dots">@for (s of slides; track $index) { <span [class.on]="$index === i()"></span> }</div>
        <div class="acts">
          <button type="button" class="btn ghost" (click)="svc.endTour()">Saltar</button>
          @if (i() > 0) { <button type="button" class="btn" (click)="i.set(i() - 1)">Atrás</button> }
          @if (i() < slides.length - 1) {
            <button type="button" class="btn primary" (click)="i.set(i() + 1)">Siguiente</button>
          } @else {
            <a class="btn primary" routerLink="/ajustes" fragment="excel" (click)="svc.endTour()">Conectar mi Excel</a>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .back { position: fixed; inset: 0; background: rgba(10, 12, 14, .6); z-index: 60; }
    .tour { position: fixed; z-index: 61; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(460px, calc(100% - 32px));
      background: var(--panel); border-radius: 16px; overflow: hidden; box-shadow: 0 30px 80px rgba(0, 0, 0, .45); display: grid; }
    .head { position: relative; height: 150px; display: grid; place-items: center; }
    .head canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
    .big { position: relative; width: 84px; height: 84px; border-radius: 20px; background: var(--molten); color: #fff; display: grid; place-items: center;
      box-shadow: 0 0 0 6px rgba(248, 160, 28, .2), 0 10px 30px rgba(236, 106, 18, .5); }
    .txt { padding: 20px 22px 4px; display: grid; gap: 8px; }
    .txt p { margin: 0; color: var(--muted); font-size: 17px; }
    .dots { display: flex; gap: 6px; justify-content: center; padding: 10px; }
    .dots span { width: 8px; height: 8px; border-radius: 50%; background: var(--line); }
    .dots span.on { background: var(--fire); width: 22px; border-radius: 8px; }
    .acts { display: flex; gap: 8px; justify-content: flex-end; padding: 6px 18px 18px; }
    .acts .ghost { margin-right: auto; }
  `,
})
export class Tour implements OnDestroy {
  protected svc = inject(GuideService);
  protected slides = SLIDES;
  protected i = signal(0);
  protected slide = () => SLIDES[this.i()];
  private canvas = viewChild<ElementRef<HTMLCanvasElement>>('sparks');
  private stop = () => {};

  constructor() {
    // Las chispas arrancan cuando el lienzo aparece y paran al cerrar.
    effect(() => {
      if (this.svc.tourOpen()) {
        this.i.set(0);
        setTimeout(() => this.wait());
      } else {
        this.stop();
      }
    });
  }
  private wait(tries = 0) {
    const c = this.canvas()?.nativeElement;
    if (c) this.stop = sparks(c);
    else if (tries < 40 && this.svc.tourOpen()) setTimeout(() => this.wait(tries + 1), 50);
  }
  ngOnDestroy() {
    this.stop();
  }
}

/** Fondo de chispas de soldadura para la cabecera de Inicio. */
@Component({
  selector: 'app-sparks',
  template: `<canvas #c aria-hidden="true"></canvas>`,
  styles: `:host { position: absolute; inset: 0; pointer-events: none; } canvas { width: 100%; height: 100%; display: block; }`,
})
export class Sparks implements AfterViewInit, OnDestroy {
  private c = viewChild.required<ElementRef<HTMLCanvasElement>>('c');
  private stop = () => {};
  ngAfterViewInit() {
    this.stop = sparks(this.c().nativeElement);
  }
  ngOnDestroy() {
    this.stop();
  }
}

/** Dibuja chispas que saltan desde un punto (como un arco de soldadura). Devuelve la función para detenerlas. */
export function sparks(canvas: HTMLCanvasElement, origin = { x: 0.82, y: 0.78 }): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let w = 0, h = 0, raf = 0;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const size = () => {
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size();
  type P = { x: number; y: number; vx: number; vy: number; life: number; max: number };
  const ps: P[] = [];
  const spawn = () => {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
    const v = 1.5 + Math.random() * 4.5;
    ps.push({ x: w * origin.x, y: h * origin.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 30 + Math.random() * 40 });
  };
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    // brillo del arco
    const g = ctx.createRadialGradient(w * origin.x, h * origin.y, 0, w * origin.x, h * origin.y, 60);
    g.addColorStop(0, 'rgba(255,240,200,.9)');
    g.addColorStop(0.2, 'rgba(255,170,60,.45)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 4; k++) spawn();
    ctx.lineCap = 'round';
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life++;
      p.vy += 0.12;
      p.x += p.vx;
      p.y += p.vy;
      const t = 1 - p.life / p.max;
      if (t <= 0 || p.y > h + 10) { ps.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(255,${150 + Math.floor(t * 100)},${Math.floor(t * 80)},${t})`;
      ctx.lineWidth = 1.6 * t + 0.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
      ctx.stroke();
    }
  };
  if (reduce) {
    for (let k = 0; k < 25; k++) draw();
    return () => {};
  }
  const loop = () => { draw(); raf = requestAnimationFrame(loop); };
  loop();
  const onResize = () => size();
  window.addEventListener('resize', onResize);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
}
