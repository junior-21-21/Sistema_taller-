/** Acceso a Google Drive desde el navegador: inicio de sesión con Google y lectura/escritura del Excel. */

/** ID de cliente OAuth del proyecto "RunRun" en Google Cloud. Se puede cambiar desde la app (se guarda en este navegador). */
export const GOOGLE_CLIENT_ID = '843270548352-rr7nat2tps45ui3drtoe7reuh7t042ri.apps.googleusercontent.com';

const SCOPE = 'https://www.googleapis.com/auth/drive';
const API = 'https://www.googleapis.com/drive/v3/files';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';
export const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
}
interface TokenClient {
  requestAccessToken(o?: { prompt?: string }): void;
}
type GoogleWindow = Window & {
  google?: { accounts: { oauth2: { initTokenClient(o: object): TokenClient } } };
};

export function clientId(): string {
  try {
    return localStorage.getItem('rr.gcid') || GOOGLE_CLIENT_ID;
  } catch {
    return GOOGLE_CLIENT_ID;
  }
}

export function setClientId(id: string) {
  try {
    localStorage.setItem('rr.gcid', id.trim());
  } catch {
    /* nada */
  }
}

let gisLoading: Promise<void> | null = null;
function loadGis(): Promise<void> {
  if ((window as GoogleWindow).google?.accounts) return Promise.resolve();
  gisLoading ??= new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => res();
    s.onerror = () => {
      gisLoading = null;
      rej(new Error('No se pudo cargar el inicio de sesión de Google. Revisa tu internet.'));
    };
    document.head.appendChild(s);
  });
  return gisLoading;
}

export class DriveError extends Error {
  constructor(message: string, readonly status = 0) {
    super(message);
  }
}

export class Drive {
  // El permiso de Google dura 1 hora; se guarda en la pestaña para no pedirlo en cada recarga.
  private token = '';
  private expires = 0;

  constructor() {
    try {
      const t = JSON.parse(sessionStorage.getItem('rr.gtoken') || 'null') as { token: string; expires: number } | null;
      if (t) { this.token = t.token; this.expires = t.expires; }
    } catch { /* nada */ }
  }

  private keep() {
    try { sessionStorage.setItem('rr.gtoken', JSON.stringify({ token: this.token, expires: this.expires })); } catch { /* nada */ }
  }

  get hasToken() {
    return !!this.token && Date.now() < this.expires;
  }

  /** Pide permiso a Google. Debe llamarse desde un toque del usuario (abre una ventana). */
  async login(silent = false): Promise<void> {
    const id = clientId();
    if (!id) throw new DriveError('Falta el ID de cliente de Google.');
    await loadGis();
    await new Promise<void>((res, rej) => {
      const client = (window as GoogleWindow).google!.accounts.oauth2.initTokenClient({
        client_id: id,
        scope: SCOPE,
        callback: (r: TokenResponse) => {
          if (r.error || !r.access_token) return rej(new DriveError('Google no dio permiso.'));
          this.token = r.access_token;
          this.expires = Date.now() + ((r.expires_in || 3600) - 60) * 1000;
          this.keep();
          res();
        },
        error_callback: (e: { type?: string }) =>
          rej(new DriveError(e?.type === 'popup_closed' ? 'Cerraste la ventana de Google.' : 'No se pudo abrir la ventana de Google. Permite las ventanas emergentes.')),
      });
      client.requestAccessToken({ prompt: silent ? '' : 'select_account' });
    });
  }

  private async call(url: string, init: RequestInit = {}): Promise<Response> {
    if (!this.hasToken) throw new DriveError('Tu sesión de Google venció.', 401);
    const r = await fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${this.token}` } });
    if (r.status === 401) {
      this.token = '';
      throw new DriveError('Tu sesión de Google venció.', 401);
    }
    if (r.status === 404) throw new DriveError('No encontré el archivo en Drive. ¿Lo borraste o lo moviste a la papelera?', 404);
    if (!r.ok) throw new DriveError('Google Drive respondió con un error (' + r.status + ').', r.status);
    return r;
  }

  /** Archivos .xlsx de tu Drive, los más recientes primero. */
  async list(): Promise<DriveFile[]> {
    const q = encodeURIComponent(`mimeType='${XLSX_TYPE}' and trashed=false`);
    const r = await this.call(`${API}?q=${q}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime)`);
    return ((await r.json()) as { files: DriveFile[] }).files;
  }

  async info(id: string): Promise<DriveFile> {
    return (await this.call(`${API}/${id}?fields=id,name,modifiedTime`)).json();
  }

  async download(id: string): Promise<ArrayBuffer> {
    return (await this.call(`${API}/${id}?alt=media`)).arrayBuffer();
  }

  async update(id: string, data: ArrayBuffer): Promise<DriveFile> {
    const r = await this.call(`${UPLOAD}/${id}?uploadType=media&fields=id,name,modifiedTime`, {
      method: 'PATCH',
      headers: { 'Content-Type': XLSX_TYPE },
      body: data,
    });
    return r.json();
  }

  async create(name: string, data: ArrayBuffer): Promise<DriveFile> {
    const meta = new Blob([JSON.stringify({ name, mimeType: XLSX_TYPE })], { type: 'application/json' });
    const body = new FormData();
    body.append('metadata', meta);
    body.append('file', new Blob([data], { type: XLSX_TYPE }));
    const r = await this.call(`${UPLOAD}?uploadType=multipart&fields=id,name,modifiedTime`, { method: 'POST', body });
    return r.json();
  }
}
