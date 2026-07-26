/**
 * Adaptador SUP Dropshipping.
 *
 * Convierte un producto crudo de SUP (export CSV/JSON o, a futuro, su API)
 * al modelo `Product` de la tienda. Cuando SUP habilite la API, solo hay que
 * llamar a su endpoint y pasar cada item por `mapSupProduct`.
 */

import { Product, ProductVariant } from '../data/types';

/** Margen por defecto aplicado sobre el costo de SUP (60%). */
export const DEFAULT_MARGIN = 0.6;

/** Forma cruda de un producto tal como llega de SUP (export o API). */
export interface SupRawProduct {
  /** ID de SUP (SPU / product id) */
  id: string | number;
  name: string;
  description?: string;
  /** Precio de costo en USD */
  cost_price: number | string;
  images?: string[];
  /** Tallas disponibles */
  sizes?: string[];
  /** Colores disponibles */
  colors?: string[];
  /** Colecciones/categorías destino en la tienda */
  categories?: string[];
  tags?: string[];
  stock?: number;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Precio de venta = costo + margen, redondeado a entero. */
export function retailPrice(cost: number, margin: number = DEFAULT_MARGIN): number {
  return Math.round(cost * (1 + margin));
}

function buildVariants(raw: SupRawProduct, price: number): ProductVariant[] {
  const sizes = raw.sizes?.length ? raw.sizes : ['Única'];
  const colors = raw.colors?.length ? raw.colors : ['Estándar'];
  const inStock = raw.stock === undefined ? true : raw.stock > 0;

  return sizes.flatMap((size, sIndex) =>
    colors.map((color, cIndex) => ({
      id: `sup-${raw.id}-${sIndex}-${cIndex}`,
      title: `${size} / ${color}`,
      price,
      available: inStock,
      sku: `SUP-${raw.id}-${slugify(size)}-${slugify(color)}`.toUpperCase(),
      options: [
        { name: 'Size', value: size },
        { name: 'Color', value: color },
      ],
    }))
  );
}

/** Mapea un producto de SUP al catálogo de la tienda. */
export function mapSupProduct(raw: SupRawProduct, margin: number = DEFAULT_MARGIN): Product {
  const cost = typeof raw.cost_price === 'string' ? parseFloat(raw.cost_price) : raw.cost_price;
  const price = retailPrice(Number.isFinite(cost) ? cost : 0, margin);
  const images = (raw.images ?? []).map((url, i) => ({
    id: `sup-img-${raw.id}-${i}`,
    url,
    altText: `${raw.name} - Imagen ${i + 1}`,
    width: 800,
    height: 1000,
  }));

  return {
    id: `sup-${raw.id}`,
    slug: slugify(raw.name),
    title: raw.name,
    description: raw.description ?? '',
    price,
    images,
    variants: buildVariants(raw, price),
    collections: raw.categories ?? [],
    tags: raw.tags ?? [],
    available: raw.stock === undefined ? true : raw.stock > 0,
    createdAt: new Date().toISOString(),
  };
}

/** Mapea un lote completo (export CSV convertido a JSON o respuesta de API). */
export function mapSupCatalog(raws: SupRawProduct[], margin: number = DEFAULT_MARGIN): Product[] {
  return raws.map(raw => mapSupProduct(raw, margin));
}
