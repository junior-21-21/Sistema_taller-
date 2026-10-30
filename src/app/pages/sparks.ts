import { AfterViewInit, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';

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
