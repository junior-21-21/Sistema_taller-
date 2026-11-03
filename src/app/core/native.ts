import { Capacitor, registerPlugin } from '@capacitor/core';

/** true cuando corre dentro de la APK de Android (no en el navegador). */
export const isNative = Capacitor.isNativePlatform();

interface TallerPlugin {
  print(o: { name: string }): Promise<void>;
  openUrl(o: { url: string }): Promise<void>;
}
const Taller = registerPlugin<TallerPlugin>('Taller');

/** Imprimir o guardar PDF: en la APK abre el diálogo de Android ("Guardar como PDF"). */
export function printPage(name: string) {
  const prev = document.title;
  document.title = name;
  if (isNative) Taller.print({ name }).catch(() => undefined);
  else window.print();
  document.title = prev;
}

/** Abre un enlace afuera de la app (WhatsApp, la hoja de Google, la descarga de la APK). */
export function openExternal(url: string) {
  if (isNative) return Taller.openUrl({ url }).catch(() => undefined);
  window.open(url, '_blank', 'noopener');
  return Promise.resolve();
}

/** Guarda un archivo (Excel) y deja elegir dónde mandarlo: WhatsApp, Drive, Descargas… */
export async function saveFile(name: string, data: ArrayBuffer, type: string) {
  if (!isNative) {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return;
  }
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const res = await Filesystem.writeFile({ path: name, data: toBase64(data), directory: Directory.Cache });
  await Share.share({ title: name, files: [res.uri] });
}

function toBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** En la APK, los enlaces externos (target=_blank) se abren con su app: WhatsApp, Chrome… */
function interceptLinks() {
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.href;
      if (!/^(https?:|whatsapp:|tel:|mailto:)/i.test(href) || href.startsWith(location.origin)) return;
      e.preventDefault();
      openExternal(href);
    },
    true,
  );
}

// ---------------------------------------------------------------- copia de seguridad en el celular
const BACKUP = 'runrun-datos.json';
const PREFIX = 'rr.';

/**
 * Todo lo del sistema vive en el almacenamiento del navegador. En la APK, además, se copia
 * a un archivo propio de la app: si Android limpia el navegador interno, se recupera al abrir.
 */
async function setupBackup() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const keys = () => Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));

  if (!keys().length) {
    try {
      const r = await Filesystem.readFile({ path: BACKUP, directory: Directory.Data, encoding: Encoding.UTF8 });
      const data = JSON.parse(String(r.data)) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
    } catch {
      /* primera vez: no hay copia */
    }
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const data: Record<string, string> = {};
      for (const k of keys()) data[k] = localStorage.getItem(k) ?? '';
      Filesystem.writeFile({ path: BACKUP + '.tmp', data: JSON.stringify(data), directory: Directory.Data, encoding: Encoding.UTF8 })
        .then(() => Filesystem.rename({ from: BACKUP + '.tmp', to: BACKUP, directory: Directory.Data, toDirectory: Directory.Data }))
        .catch(() => undefined);
    }, 1500);
  };
  const proto = Storage.prototype;
  const set = proto.setItem;
  const del = proto.removeItem;
  proto.setItem = function (k: string, v: string) {
    set.call(this, k, v);
    if (this === localStorage && k.startsWith(PREFIX)) save();
  };
  proto.removeItem = function (k: string) {
    del.call(this, k);
    if (this === localStorage && k.startsWith(PREFIX)) save();
  };
  // Al mandar la app al fondo se guarda enseguida.
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && save());
}

/** Se llama antes de arrancar Angular. En la web no hace nada. */
export async function prepareNative() {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  interceptLinks();
  try {
    await setupBackup();
  } catch {
    /* sin copia, igual funciona con el almacenamiento normal */
  }
}
