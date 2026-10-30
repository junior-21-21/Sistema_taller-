import { norm } from './calc';

/** Dibujos de referencia de cada tipo de trabajo (public/servicios). */
export const REFS: { key: string; title: string }[] = [
  { key: 'puerta', title: 'Puerta metálica' },
  { key: 'puerta-seguridad', title: 'Puerta con diseño' },
  { key: 'porton-batiente', title: 'Portón batiente' },
  { key: 'porton-corredizo', title: 'Portón corredizo' },
  { key: 'porton-levadizo', title: 'Portón levadizo' },
  { key: 'reja-ventana', title: 'Reja de ventana' },
  { key: 'cerco', title: 'Cerco' },
  { key: 'baranda', title: 'Baranda' },
  { key: 'escalera', title: 'Escalera' },
  { key: 'techo', title: 'Techo' },
  { key: 'techado', title: 'Solo techado' },
  { key: 'canaleta', title: 'Canaleta' },
  { key: 'estructura', title: 'Estructura' },
  { key: 'reparacion', title: 'Reparación' },
  { key: 'pintura', title: 'Pintura' },
  { key: 'soldador', title: 'Soldadura' },
  { key: 'mueble', title: 'Mueble' },
  { key: 'transporte', title: 'Transporte' },
  { key: 'medidas', title: 'Medidas' },
];

export const refSrc = (key: string) => `servicios/${key}.svg`;

/** Palabras que deciden el dibujo, de lo más específico a lo más general. */
const RULES: [RegExp, string][] = [
  [/reparaci|arreglo/, 'reparacion'],
  [/pintura|mantenimiento|anticorrosiv/, 'pintura'],
  [/desmontaje|mano de obra|instalacion|soldadura|domicilio/, 'soldador'],
  [/visita|medida/, 'medidas'],
  [/transporte|flete/, 'transporte'],
  [/canaleta|bajada/, 'canaleta'],
  [/corredizo|riel/, 'porton-corredizo'],
  [/levadizo|seccional|enrollable|basculante/, 'porton-levadizo'],
  [/porton/, 'porton-batiente'],
  [/puerta.*(seguridad|diseno|decorativ|reja)|(seguridad|diseno).*puerta/, 'puerta-seguridad'],
  [/puerta/, 'puerta'],
  [/solo techado|calamina|policarbonato|cobertura|teja/, 'techado'],
  [/techo|techad|cobertizo|tijeral/, 'techo'],
  [/cerco|perimetr/, 'cerco'],
  [/reja|ventana|proteccion/, 'reja-ventana'],
  [/baranda|pasamano|barandal/, 'baranda'],
  [/escalera|peldano/, 'escalera'],
  [/mueble|mesa|estante|silla|rack/, 'mueble'],
  [/estructura|columna|viga|mezanin|tinglado/, 'estructura'],
];

/** El dibujo que más se parece al trabajo, por su nombre o, si no, por su categoría. */
export function refFor(name: string, cat = ''): string {
  // Primero el nombre; la categoría solo si el nombre no dice nada.
  const hit = (t: string) => RULES.find(([re]) => re.test(norm(t)))?.[1];
  return refSrc(hit(name) ?? hit(cat) ?? 'soldador');
}
