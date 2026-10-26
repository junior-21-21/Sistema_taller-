import { Detail } from './models';

export const CHAPAS = ['Chapa simple', 'Chapa de seguridad (2 golpes)', 'Chapa de 3 golpes', 'Chapa eléctrica', 'Portacandado'];
export const ACCESORIOS = ['Bisagras', 'Garruchas y riel', 'Manijas / jaladores', 'Pasadores', 'Vidrio', 'Policarbonato', 'Malla', 'Pernos de anclaje'];
export const PINTURAS = ['Sin pintura', 'Solo anticorrosivo', 'Anticorrosivo + esmalte', 'Pintura electrostática', 'Galvanizado'];
export const MATERIALES = [
  'Tubo cuadrado', 'Tubo rectangular', 'Tubo redondo', 'Ángulo', 'Platina', 'Fierro liso', 'Fierro cuadrado', 'Fierro corrugado',
  'Plancha LAF', 'Plancha LAC', 'Plancha galvanizada', 'Plancha estriada', 'Viga H', 'Canal U', 'Calamina', 'Teja andina', 'Policarbonato',
];
/** Medidas y espesores comunes para sugerir. */
export const MEDIDAS = [
  '1/2"', '3/4"', '1"', '1 1/2"', '2"', '2"x1"', '2"x2"', '3"x1"', '3"x2"', '4"x2"',
  '0.9 mm', '1.2 mm', '1.5 mm', '2 mm', '2.5 mm', '3 mm', '4.5 mm', '6 mm',
  '1/40"', '1/32"', '1/16"', '1/8"', '3/16"', '1/4"',
];

export function emptyDetail(): Detail {
  return { mats: [], chapa: '', accesorios: [], pintura: 'Anticorrosivo + esmalte', color: '', instalacion: true, transporte: false, notas: '' };
}

/** ¿Tiene algo escrito? */
export function hasDetail(d: Detail | undefined): d is Detail {
  return !!d && (d.mats.some((m) => m.name.trim()) || !!d.chapa || d.accesorios.length > 0 || !!d.color || !!d.notas || !!d.pintura);
}

/** Líneas cortas para la hoja de cotización, el contrato y WhatsApp. */
export function detailLines(d: Detail | undefined): string[] {
  if (!d) return [];
  const out: string[] = [];
  for (const m of d.mats) {
    if (!m.name.trim()) continue;
    out.push([m.name.trim(), m.spec.trim(), m.qty.trim() ? `(${m.qty.trim()})` : ''].filter(Boolean).join(' '));
  }
  out.push(d.chapa ? `Chapa: ${d.chapa}` : 'No incluye chapa');
  if (d.accesorios.length) out.push(`Accesorios: ${d.accesorios.join(', ')}`);
  if (d.pintura) out.push(`Acabado: ${d.pintura}${d.color ? `, color ${d.color}` : ''}`);
  else if (d.color) out.push(`Color: ${d.color}`);
  out.push(d.instalacion ? 'Incluye instalación' : 'No incluye instalación');
  if (d.transporte) out.push('Incluye transporte');
  if (d.notas.trim()) out.push(d.notas.trim());
  return out;
}

/** Arreglo para datos viejos o escritos a mano. */
export function fixDetail(d: Partial<Detail> | undefined): Detail | undefined {
  if (!d) return undefined;
  const e = emptyDetail();
  return {
    ...e, ...d,
    mats: (d.mats || []).map((m) => ({ name: m?.name || '', spec: m?.spec || '', qty: m?.qty || '' })),
    accesorios: d.accesorios || [],
  };
}
