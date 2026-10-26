import { Detail, Mat } from './models';

export const CHAPAS = ['Chapa simple', 'Chapa de seguridad (2 golpes)', 'Chapa de 3 golpes', 'Chapa eléctrica', 'Portacandado'];
export const ACCESORIOS = [
  'Bisagras', 'Garruchas y riel', 'Manijas / jaladores', 'Pasadores', 'Picaporte', 'Cerrojo', 'Topes', 'Brazo hidráulico',
  'Motor de portón', 'Mirilla', 'Vidrio', 'Policarbonato', 'Malla', 'Pernos de anclaje',
];
/** Acabados finales. */
export const PINTURAS = [
  'Esmalte sintético', 'Esmalte gloss (brillante)', 'Esmalte mate', 'Esmalte satinado', 'Pintura epóxica', 'Poliuretano',
  'Pintura electrostática (al horno)', 'Martillado', 'Galvanizado en caliente', 'Solo anticorrosivo', 'Sin pintura',
];
export const BASES = ['', '1 mano', '2 manos'];
export const COLORES = ['Negro', 'Negro mate', 'Gris', 'Plomo', 'Blanco', 'Marrón', 'Verde', 'Azul', 'Rojo', 'Dorado'];
export const SOLDADURAS = ['Eléctrica (arco)', 'MIG', 'TIG', 'Autógena'];
export const DISENOS = ['Liso', 'Barrotes', 'Rombos', 'Ornamental / forjado', 'Plancha ciega', 'Persiana', 'Con vidrio'];
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

/** Puntos de partida por tipo de trabajo: solo llenan lo que falta y todo se puede cambiar. */
export const PLANTILLAS: { name: string; mats: [string, string][]; fill: Partial<Detail> }[] = [
  { name: 'Puerta', mats: [['Tubo cuadrado', '2"x2" · 1.5 mm'], ['Tubo rectangular', '2"x1" · 1.2 mm'], ['Plancha LAF', '1/40"']],
    fill: { accesorios: ['Bisagras', 'Manijas / jaladores'], diseno: 'Plancha ciega' } },
  { name: 'Portón', mats: [['Tubo cuadrado', '3"x3" · 2 mm'], ['Tubo rectangular', '2"x1" · 1.5 mm'], ['Plancha LAF', '1/32"']],
    fill: { pliegues: 2, accesorios: ['Bisagras', 'Pasadores', 'Topes'], diseno: 'Plancha ciega' } },
  { name: 'Puerta plegable', mats: [['Tubo cuadrado', '1 1/2" · 1.5 mm'], ['Plancha LAF', '1/40"']],
    fill: { pliegues: 4, accesorios: ['Garruchas y riel', 'Pasadores'] } },
  { name: 'Reja / ventana', mats: [['Tubo cuadrado', '1" · 1.2 mm'], ['Fierro cuadrado', '1/2"']],
    fill: { diseno: 'Barrotes', accesorios: ['Pernos de anclaje'] } },
  { name: 'Baranda', mats: [['Tubo redondo', '2" · 1.5 mm'], ['Tubo redondo', '1" · 1.2 mm']],
    fill: { diseno: 'Barrotes', accesorios: ['Pernos de anclaje'] } },
  { name: 'Escalera', mats: [['Tubo rectangular', '4"x2" · 2 mm'], ['Plancha estriada', '1/8"'], ['Ángulo', '1 1/2" · 3/16"']],
    fill: { accesorios: ['Pernos de anclaje'] } },
  { name: 'Solo techado', mats: [['Calamina', '0.30 mm'], ['Tornillo autoperforante', 'con capuchón']],
    fill: {} },
  { name: 'Techo', mats: [['Tubo rectangular', '2"x1" · 1.5 mm'], ['Tubo cuadrado', '2"x2" · 2 mm'], ['Calamina', '0.30 mm']],
    fill: { accesorios: ['Pernos de anclaje'] } },
];

export function emptyDetail(): Detail {
  return {
    mats: [], pliegues: 0, chapa: '', accesorios: [], pintura: 'Esmalte sintético', manos: 0, base: '1 mano', color: '',
    soldadura: '', diseno: '', instalacion: true, transporte: false, notas: '',
  };
}

/** Aplica una plantilla sin borrar lo que ya se escribió. */
export function applyTemplate(d: Detail, name: string) {
  const t = PLANTILLAS.find((p) => p.name === name);
  if (!t) return;
  d.mats = d.mats.filter((m) => m.name.trim());
  for (const [n, spec] of t.mats) if (!d.mats.some((m) => m.name === n && m.spec === spec)) d.mats.push({ name: n, spec, qty: '' } as Mat);
  if (t.fill.pliegues && !+d.pliegues) d.pliegues = t.fill.pliegues;
  if (t.fill.diseno && !d.diseno) d.diseno = t.fill.diseno;
  for (const a of t.fill.accesorios ?? []) if (!d.accesorios.includes(a)) d.accesorios = [...d.accesorios, a];
}

/** ¿Tiene algo escrito? */
export function hasDetail(raw: Detail | undefined): raw is Detail {
  const d = fixDetail(raw);
  return !!d && (d.mats.some((m) => m.name.trim()) || +d.pliegues > 0 || !!d.chapa || d.accesorios.length > 0 || !!d.color || !!d.notas
    || !!d.pintura || !!d.soldadura || !!d.diseno);
}

/** Texto del acabado: "Esmalte sintético, 2 manos, color negro, sobre base anticorrosiva (1 mano)". */
export function finishText(d: Detail): string {
  const p = d.pintura.trim();
  if (/^sin pintura$/i.test(p)) return 'Sin pintura';
  const parts = [p, +d.manos > 0 ? `${d.manos} ${+d.manos === 1 ? 'mano' : 'manos'}` : '', d.color.trim() ? `color ${d.color.trim()}` : ''].filter(Boolean);
  if (d.base && !/anticorrosivo|galvaniz/i.test(p)) parts.push(`sobre base anticorrosiva (${d.base})`);
  return parts.join(', ');
}

/** Líneas cortas para la hoja de cotización, el contrato y WhatsApp. */
export function detailLines(raw: Detail | undefined): string[] {
  const d = fixDetail(raw);
  if (!d) return [];
  const out: string[] = [];
  for (const m of d.mats) {
    if (!m.name.trim()) continue;
    out.push([m.name.trim(), m.spec.trim(), m.qty.trim() ? `(${m.qty.trim()})` : ''].filter(Boolean).join(' '));
  }
  if (+d.pliegues > 0) out.push(`${d.pliegues} ${+d.pliegues === 1 ? 'hoja' : 'pliegues'}`);
  if (d.diseno.trim()) out.push(`Diseño: ${d.diseno.trim()}`);
  out.push(d.chapa ? `Chapa: ${d.chapa}` : 'No incluye chapa');
  if (d.accesorios.length) out.push(`Accesorios: ${d.accesorios.join(', ')}`);
  const fin = finishText(d);
  if (fin) out.push(`Acabado: ${fin}`);
  if (d.soldadura) out.push(`Soldadura: ${d.soldadura}`);
  out.push(d.instalacion ? 'Incluye instalación' : 'No incluye instalación');
  if (d.transporte) out.push('Incluye transporte');
  if (d.notas.trim()) out.push(d.notas.trim());
  return out;
}

/** Arreglo para datos viejos o escritos a mano. */
export function fixDetail(d: Partial<Detail> | undefined): Detail | undefined {
  if (!d) return undefined;
  const e = emptyDetail();
  let pintura = d.pintura ?? e.pintura;
  let base = d.base;
  // Versiones anteriores juntaban la base y el acabado en un solo texto.
  if (base === undefined) {
    base = /anticorrosivo \+/i.test(pintura) ? '1 mano' : '';
    if (/^anticorrosivo \+ esmalte$/i.test(pintura)) pintura = 'Esmalte sintético';
    if (pintura === 'Pintura electrostática') pintura = 'Pintura electrostática (al horno)';
  }
  return {
    ...e, ...d, pintura, base,
    mats: (d.mats || []).map((m) => ({ name: m?.name || '', spec: m?.spec || '', qty: m?.qty || '' })),
    accesorios: d.accesorios || [],
    pliegues: +(d.pliegues ?? 0) || 0,
    manos: +(d.manos ?? 0) || 0,
    soldadura: d.soldadura || '',
    diseno: d.diseno || '',
  };
}
