// Data types matching Shopify Storefront API structure
// This allows easy migration when connecting to real Shopify

export interface ProductImage {
  id: string;
  url: string;
  altText: string;
  width: number;
  height: number;
}

export interface ProductVariant {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  available: boolean;
  sku: string;
  options: {
    name: string;
    value: string;
  }[];
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  images: ProductImage[];
  variants: ProductVariant[];
  collections: string[];
  tags: string[];
  available: boolean;
  createdAt: string;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: ProductImage;
  productCount: number;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  product: Product;
  variant: ProductVariant;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest';

export interface FilterOptions {
  collection?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
  search?: string;
}
