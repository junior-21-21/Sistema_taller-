import { AREA, Client, isCompany, Quote, QuoteItem, SaleItem, Shop } from './models';

/** Reglas de los campos. Cada función devuelve el mensaje de error, o '' si está bien. */

const digits = (s: unknown) => String(s ?? '').replace(/[\s.-]/g, '');
const num = (v: unknown) => (v === null || v === undefined || v === '' ? NaN : +v);

export function vName(s: string, label = 'el nombre del cliente'): string {
  const t = (s || '').trim();
  if (!t) return `Escribe ${label}.`;
  if (t.length < 3) return 'Escribe el nombre completo (mínimo 3 letras).';
  return '';
}

/** DNI: 8 números. RUC: 11 números que empiezan con 10, 15, 17 o 20. Vacío está bien. */
export function vDoc(s: string): string {
  const d = digits(s);
  if (!d) return '';
  if (!/^\d+$/.test(d)) return 'Solo números: 8 para DNI u 11 para RUC.';
  if (d.length === 8) return '';
  if (d.length === 11) return /^(10|15|17|20)/.test(d) ? '' : 'El RUC empieza con 10 o 20.';
  return `Tiene ${d.length} números. El DNI tiene 8 y el RUC 11.`;
}

export function vDni(s: string): string {
  const d = digits(s);
  if (!d) return '';
  return /^\d{8}$/.test(d) ? '' : 'El DNI tiene 8 números.';
}

export function vRuc(s: string): string {
  const d = digits(s);
  if (!d) return '';
  return /^(10|15|17|20)\d{9}$/.test(d) ? '' : 'El RUC tiene 11 números y empieza con 10 o 20.';
}

/** Celular peruano: 9 números que empiezan con 9 (acepta +51 delante). Vacío está bien. */
export function vTel(s: string): string {
  let d = digits(s).replace(/^\+/, '');
  if (!d) return '';
  if (d.length === 11 && d.startsWith('51')) d = d.slice(2);
  if (!/^\d+$/.test(d)) return 'Solo números, por ejemplo 966 123 456.';
  return /^9\d{8}$/.test(d) ? '' : 'El celular tiene 9 números y empieza con 9.';
}

/** Número dentro de un rango. */
export function vRange(v: unknown, min: number, max: number, unit = ''): string {
  const n = num(v);
  if (isNaN(n)) return 'Pon un número.';
  if (n < min) return `No puede ser menor a ${min}${unit}.`;
  if (n > max) return `No puede ser mayor a ${max}${unit}.`;
  return '';
}

export function vPositive(v: unknown, what = 'un número mayor a 0'): string {
  const n = num(v);
  return isNaN(n) || n <= 0 ? `Pon ${what}.` : '';
}

export function vEmail(s: string | undefined): string {
  const t = (s || '').trim();
  if (!t) return '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t) ? '' : 'Revisa el correo, por ejemplo nombre@gmail.com.';
}

export function clientErrors(c: Client, nameRequired = true) {
  const company = isCompany(c);
  return {
    name: nameRequired ? vName(c.name, company ? 'la razón social o el nombre de la empresa' : 'el nombre del cliente') : '',
    doc: company ? vRuc(c.doc) : vDoc(c.doc),
    tel: vTel(c.tel),
    email: vEmail(c.email),
  };
}

export function itemErrors(it: QuoteItem) {
  const area = it.unit === AREA;
  return {
    name: it.code === 'OTRO' && !(it.name || '').trim() ? 'Escribe el nombre del trabajo.' : '',
    w: area ? vPositive(it.w, 'el ancho en metros') : '',
    h: area ? vPositive(it.h, 'el alto o largo en metros') : '',
    q: vPositive(it.q, area ? 'cuántas piezas' : 'la cantidad'),
    price: vPositive(it.price, 'el precio'),
  };
}

export function payErrors(q: Quote, shop: Shop) {
  return {
    discount: vRange(q.discount, 0, shop.maxDiscount, '%'),
    advance: vRange(q.advance, 0, 100, '%'),
    days: vRange(q.days, 1, 365, ' días'),
    validity: vRange(q.validity, 1, 365, ' días'),
    warranty: vRange(q.warranty, 0, 120, ' meses'),
    penalty: q.penalty === null || (q.penalty as unknown) === '' ? '' : vRange(q.penalty, 0, 2, '%'),
  };
}

export function saleItemErrors(it: SaleItem) {
  return {
    desc: (it.desc || '').trim() ? '' : 'Escribe qué se cobra.',
    qty: vPositive(it.qty, 'la cantidad'),
    price: vPositive(it.price, 'el precio'),
  };
}

export function shopErrors(s: Shop) {
  return {
    name: vName(s.name, 'el nombre del taller'),
    ruc: vRuc(s.ruc),
    tel: vTel(s.tel),
    tel2: vTel(s.tel2),
    repDni: vDni(s.repDni),
    serie: /^[A-Z0-9]{1,6}$/i.test((s.serie || '').trim()) ? '' : 'Usa letras y números sin espacios, por ejemplo NV01.',
    advance: vRange(s.advance, 0, 100, '%'),
    validity: vRange(s.validity, 1, 365, ' días'),
    warranty: vRange(s.warranty, 0, 120, ' meses'),
    maxDiscount: vRange(s.maxDiscount, 0, 100, '%'),
  };
}

/** true si algún mensaje del objeto (o de la lista de objetos) tiene texto. */
export function hasErrors(e: Record<string, string> | Record<string, string>[]): boolean {
  return (Array.isArray(e) ? e : [e]).some((o) => Object.values(o).some(Boolean));
}

/** Lleva la pantalla al primer campo marcado con error. */
export function focusFirstError() {
  setTimeout(() => {
    const el = document.querySelector<HTMLElement>('.bad input, .bad select, .bad textarea, input.bad');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus({ preventScroll: true });
  });
}
