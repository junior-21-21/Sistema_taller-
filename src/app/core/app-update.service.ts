import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

/** Pantallas donde se está escribiendo algo: ahí nunca se recarga la app. */
const EDITING = /^\/(cotizar|venta|ajustes)\b/;
/** Cada cuánto se pregunta si se publicó una versión nueva en GitHub. */
const CHECK_MS = 30 * 60_000;
/** Si la versión nueva llega apenas abierta la app, se aplica de frente. */
const JUST_OPENED_MS = 10_000;

/** Actualiza la app sola cuando se publica una versión nueva, sin interrumpir lo que se está haciendo. */
@Injectable({ providedIn: 'root' })
export class AppUpdate {
  private sw = inject(SwUpdate);
  private ready = false;
  private url = '/';
  private openedAt = Date.now();

  /** Se puede instalar en este equipo (Android y computadora; el navegador da el aviso). */
  readonly canInstall = signal(false);
  /** iPhone o iPad en Safari: se instala a mano desde "Compartir". */
  readonly iosInstall = /iphone|ipad|ipod/i.test(navigator.userAgent) && !this.standalone();
  private installEvent: (Event & { prompt(): Promise<void> }) | null = null;

  constructor() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvent = e as AppUpdate['installEvent'];
      this.canInstall.set(!this.standalone());
    });
    window.addEventListener('appinstalled', () => this.canInstall.set(false));

    if (!this.sw.isEnabled) return;
    this.sw.versionUpdates.subscribe((e) => {
      if (e.type !== 'VERSION_READY') return;
      this.ready = true;
      if (Date.now() - this.openedAt < JUST_OPENED_MS) this.apply();
    });
    this.sw.unrecoverable.subscribe(() => location.reload());
    const check = () => {
      if (navigator.onLine) this.sw.checkForUpdate().catch(() => { /* sin señal: se prueba luego */ });
    };
    check();
    setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', () => {
      // Al guardar la app se aplica lo pendiente; al volver a abrirla se busca lo nuevo.
      if (document.visibilityState === 'hidden') this.apply();
      else check();
    });
    window.addEventListener('online', check);
  }

  /** Al cambiar de pantalla es buen momento para aplicar una versión que ya está lista. */
  navigated(url: string) {
    this.url = url;
    this.apply();
  }

  async install() {
    await this.installEvent?.prompt();
    this.installEvent = null;
    this.canInstall.set(false);
  }

  private apply() {
    if (this.ready && !EDITING.test(this.url)) location.reload();
  }

  private standalone() {
    return matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  }
}
