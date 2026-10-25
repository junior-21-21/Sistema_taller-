import { AREA, Client, Quote, QuoteItem, Sale, Shop } from './models';

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function qty(it: QuoteItem): number {
  return it.unit === AREA ? (it.w || 0) * (it.h || 0) * (it.q || 0) : it.q || 0;
}

export const lineTotal = (it: QuoteItem) => round2(qty(it) * (it.price || 0));

export interface Totals {
  sub: number;
  dsc: number;
  igv: number;
  tot: number;
  advM: number;
  balM: number;
}

export function totals(q: Quote): Totals {
  const sub = round2(q.items.reduce((a, it) => a + lineTotal(it), 0));
  const dsc = round2((sub * (q.discount || 0)) / 100);
  const igv = q.igv ? round2((sub - dsc) * 0.18) : 0;
  const tot = round2(sub - dsc + igv);
  const advM = round2((tot * (q.advance || 0)) / 100);
  return { sub, dsc, igv, tot, advM, balM: round2(tot - advM) };
}

/** Plazo sugerido: más días mientras más grande el trabajo. */
export const suggestDays = (sub: number) => Math.max(5, Math.min(45, 3 + Math.ceil(sub / 1200)));

export const fmt = (n: number) =>
  'S/ ' + (n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtQty = (n: number) => (Math.round(n * 100) / 100).toLocaleString('es-PE', { maximumFractionDigits: 2 });

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('es-PE');
}

// ---- Monto en letras, como se escribe en contratos peruanos ----
const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE',
  'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS',
  'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const D = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS',
  'OCHOCIENTOS', 'NOVECIENTOS'];

function w999(n: number): string {
  if (n === 100) return 'CIEN';
  const r = n % 100;
  let s = C[Math.floor(n / 100)];
  if (r) s += (s ? ' ' : '') + (r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : ''));
  return s;
}

function words(n: number): string {
  if (n === 0) return 'CERO';
  const m = Math.floor(n / 1e6), k = Math.floor((n % 1e6) / 1000), r = n % 1000;
  const s: string[] = [];
  if (m) s.push(m === 1 ? 'UN MILLÓN' : w999(m).replace(/UNO$/, 'UN') + ' MILLONES');
  if (k) s.push(k === 1 ? 'MIL' : w999(k).replace(/UNO$/, 'UN') + ' MIL');
  if (r) s.push(w999(r));
  return s.join(' ');
}

export function inWords(n: number): string {
  const c = Math.round(n * 100);
  return `${words(Math.floor(c / 100))} CON ${String(c % 100).padStart(2, '0')}/100 SOLES`;
}

/** Saca datos del cliente de un mensaje de WhatsApp pegado. Es una lectura simple
 *  por patrones: lo que no encuentra queda vacío para llenarlo a mano. */
export function parseMessage(txt: string): Partial<Client> {
  const out: Partial<Client> = {};
  const ruc = txt.match(/\b(10|15|17|20)\d{9}\b/);
  const dni = txt.match(/\b\d{8}\b/);
  if (ruc) out.doc = ruc[0];
  else if (dni) out.doc = dni[0];
  const tel = txt.replace(/(\d)[\s-](?=\d)/g, '$1').match(/(?:\+?51)?(9\d{8})\b/);
  if (tel) out.tel = tel[1].replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
  const name = txt.match(/(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ]+(?:\s+[A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ]+){0,3})/i);
  if (name) out.name = name[1].trim();
  const place = txt.match(/\b(?:en|ubicad[oa] en|dirección:?)\s+((?:jr|av|calle|psje|pasaje|mz|urb|asoc)\.?\s[^,.\n]+(?:,\s*[A-ZÁÉÍÓÚ][^,.\n]+)?)/i);
  if (place) out.place = place[1].trim();
  return out;
}

export function waPhone(tel: string): string {
  let t = (tel || '').replace(/\D/g, '');
  if (t.length === 9) t = '51' + t;
  return t;
}

export function waText(q: Quote, shop: Shop): string {
  const t = totals(q);
  const lines = q.items.map((it) => `• ${it.name}: ${fmtQty(qty(it))} ${it.unit} → ${fmt(lineTotal(it))}`).join('\n');
  return [
    `*${shop.name}*`,
    `Cotización ${q.num}`,
    '',
    `Hola ${q.client.name || ''}, te envío la cotización:`,
    lines,
    '',
    `Subtotal: ${fmt(t.sub)}`,
    ...(t.dsc ? [`Descuento ${q.discount}%: −${fmt(t.dsc)}`] : []),
    ...(t.igv ? [`IGV 18%: ${fmt(t.igv)}`] : []),
    `*TOTAL: ${fmt(t.tot)}*`,
    '',
    `Adelanto ${q.advance}%: ${fmt(t.advM)}`,
    `Entrega: ${q.days} días hábiles`,
    `Garantía: ${q.warranty} meses`,
    `Válida hasta: ${addDays(q.date, q.validity)}`,
  ].join('\n');
}

export function waLink(q: Quote, shop: Shop): string {
  return `https://wa.me/${waPhone(q.client.tel)}?text=${encodeURIComponent(waText(q, shop))}`;
}

// ---- Notas de venta ----
export interface SaleTotals {
  sub: number;
  tot: number;
  /** Solo si el taller trabaja con IGV: el precio ya lo incluye. */
  base: number;
  igv: number;
  change: number;
}

export function saleTotals(s: Sale, withIgv: boolean): SaleTotals {
  const sub = round2(s.items.reduce((a, it) => a + (+it.qty || 0) * (+it.price || 0), 0));
  const tot = round2(Math.max(0, sub - (+s.discount || 0)));
  const base = withIgv ? round2(tot / 1.18) : tot;
  return { sub, tot, base, igv: withIgv ? round2(tot - base) : 0, change: round2(Math.max(0, (+s.received || 0) - tot)) };
}

export function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Clave para agrupar a un cliente: su DNI/RUC o, si no tiene, su nombre. */
export const clientKey = (c: Client) => (c.doc || '').trim() || (c.name || '').trim().toLowerCase();

/** Busca sin importar mayúsculas ni tildes. */
export const norm = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
