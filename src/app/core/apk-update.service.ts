import { Injectable, signal } from '@angular/core';
import { APK_BUILD } from './build-info';
import { isNative, openExternal } from './native';

/** Donde GitHub deja cada APK nueva (la arma .github/workflows/apk.yml). */
const APK_RELEASE = 'https://api.github.com/repos/junior-21-21/Sistema_taller-/releases/tags/android';
const CHECK_MS = 30 * 60_000;

/** Solo en la APK: avisa cuando GitHub armó una APK más nueva que la instalada. */
@Injectable({ providedIn: 'root' })
export class ApkUpdate {
  readonly next = signal<{ build: number; url: string } | null>(null);

  constructor() {
    if (!isNative) return;
    const check = () => navigator.onLine !== false && this.check();
    setTimeout(check, 3_000);
    setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
  }

  private async check() {
    try {
      const r = await fetch(APK_RELEASE, { headers: { Accept: 'application/vnd.github+json' } });
      if (!r.ok) return;
      const rel = (await r.json()) as { name?: string; assets?: { name: string; browser_download_url: string }[] };
      const build = Number(/(\d+)/.exec(rel.name ?? '')?.[1] ?? 0);
      const asset = rel.assets?.find((a) => a.name.endsWith('.apk'));
      if (asset && build > APK_BUILD) this.next.set({ build, url: asset.browser_download_url });
    } catch {
      /* sin internet: se revisa después */
    }
  }

  /** Abre la descarga; Android pregunta si se instala encima (los datos se quedan). */
  download() {
    const n = this.next();
    if (n) openExternal(n.url);
  }
}
