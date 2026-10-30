export const AREA = 'm²';
export const UNITS = ['m²', 'ml', 'unidad', 'peldaño', 'hora', 'global', 'kg'];

/** Un material del trabajo, con su medida o espesor. */
export interface Mat {
  name: string;
  spec: string;
  qty: string;
}

/** Especificación técnica de un trabajo: materiales, chapa, pintura y lo que incluye. */
export interface Detail {
  mats: Mat[];
  /** Cuántos pliegues u hojas tiene (puertas plegables, portones, ventanas). 0 = no aplica. */
  pliegues: number;
  /** '' = no incluye chapa. */
  chapa: string;
  accesorios: string[];
  /** Acabado final (esmalte sintético, gloss, epóxico…). */
  pintura: string;
  /** Manos del acabado. 0 = no se indica. */
  manos: number;
  /** Base anticorrosiva: '' (sin base), '1 mano' o '2 manos'. */
  base: string;
  color: string;
  /** Tipo de soldadura. '' = no se indica. */
  soldadura: string;
  /** Diseño o estilo (barrotes, rombos, ornamental…). */
  diseno: string;
  instalacion: boolean;
  transporte: boolean;
  notas: string;
}

/** Un trabajo de la lista de precios. */
export interface CatalogItem {
  code: string;
  cat: string;
  name: string;
  inc: string;
  unit: string;
  material: number;
  labor: number;
  /** Materiales y accesorios que se usan normalmente (se copian al cotizar). */
  detail?: Detail;
}

/** Una línea de la cotización. Guarda una copia del nombre y precio para que
 *  cambiar la lista de precios no altere cotizaciones antiguas. */
export interface QuoteItem {
  code: string;
  name: string;
  inc: string;
  unit: string;
  price: number;
  w: number | null;
  h: number | null;
  q: number;
  detail?: Detail;
  /** Foto que sale en la cotización: ruta del catálogo de puertas o 'f:<id>' de una foto del servicio. */
  img?: string;
}

/** Una foto de un servicio de la lista de precios. */
export interface Foto {
  id: string;
  /** Código del servicio. */
  code: string;
  /** Orden dentro del servicio (0 = la principal). */
  n: number;
  /** Imagen comprimida (data:) o ruta de una foto del catálogo de puertas. */
  src: string;
}

export type Estado = 'Pendiente' | 'Aceptada' | 'Rechazada';
export const ESTADOS: Estado[] = ['Pendiente', 'Aceptada', 'Rechazada'];

export interface Client {
  /** Persona o empresa. Sin dato = persona (o empresa si el documento es un RUC 20…). */
  kind?: 'persona' | 'empresa';
  /** Nombre y apellidos, o razón social. */
  name: string;
  doc: string;
  tel: string;
  /** Dirección de la obra. */
  place: string;
  /** Solo empresas: quién hace el trato. */
  contact?: string;
  email?: string;
}

export function isCompany(c: Client): boolean {
  return c.kind ? c.kind === 'empresa' : /^20\d{9}$/.test(String(c.doc || '').replace(/\D/g, ''));
}

export interface Quote {
  num: string;
  seq: number;
  date: string;
  client: Client;
  desc: string;
  items: QuoteItem[];
  discount: number;
  advance: number;
  days: number;
  validity: number;
  warranty: number;
  igv: boolean;
  penalty: number;
  notes: string;
  estado: Estado;
  /** Descuento especial en soles que se da al aceptar el trabajo (antes del IGV). */
  special?: number;
  /** Adelanto en soles cuando no es un porcentaje. Si tiene valor, manda sobre advance. */
  advanceAmt?: number;
  updatedAt: string;
}

export interface Shop {
  name: string;
  ruc: string;
  tel: string;
  /** Segundo celular del taller. */
  tel2: string;
  address: string;
  rep: string;
  repDni: string;
  advance: number;
  validity: number;
  warranty: number;
  maxDiscount: number;
  igv: boolean;
  /** Serie de las notas de venta, ej. NV01. */
  serie: string;
  /** Texto al pie de la boleta. */
  footer: string;
  /** Yape / Plin / cuenta para mostrar en la boleta. */
  payInfo: string;
}

export const PAY_METHODS = ['Efectivo', 'Yape', 'Plin', 'Transferencia', 'Tarjeta'] as const;
export type PayMethod = (typeof PAY_METHODS)[number];
export type Concept = 'Venta' | 'Adelanto' | 'A cuenta' | 'Saldo';

/** Gasto del taller, de un trabajo (cotización) o general. */
export interface Expense {
  id: string;
  date: string;
  /** '' = gasto general del taller. */
  quoteNum: string;
  cat: string;
  desc: string;
  amount: number;
  pay: PayMethod;
  updatedAt: string;
}

export const EXPENSE_CATS = ['Materiales', 'Pintura', 'Soldadura y discos', 'Mano de obra', 'Transporte', 'Alquiler de equipo', 'Luz y local', 'Otros'];

export interface SaleItem {
  desc: string;
  unit: string;
  qty: number;
  price: number;
}

/** Nota de venta (boleta interna del taller). */
export interface Sale {
  num: string;
  seq: number;
  date: string;
  time: string;
  client: Client;
  items: SaleItem[];
  discount: number;
  pay: PayMethod;
  received: number;
  concept: Concept;
  quoteNum: string;
  notes: string;
  void: boolean;
  updatedAt: string;
}
