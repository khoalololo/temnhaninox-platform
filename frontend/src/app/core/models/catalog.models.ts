export type ProductType = 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  displayOrder?: number;
}

export interface Material {
  id: string;
  name: string;
  code: string;
  densityKgPerM3: number;
  basePricePerCm2?: number;
  basePricePerKg?: number;
  isMetal: boolean;
  description?: string;
  active?: boolean;
}

export interface ProcessingMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  surchargePerCm2?: number;
  setupFee?: number;
  active?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  productType: ProductType;
  categoryId: string;
  categoryName?: string;
  materialId?: string;
  materialName?: string;
  processingMethodId?: string;
  processingMethodName?: string;
  defaultWidthMm?: number;
  defaultHeightMm?: number;
  defaultThicknessMm?: number;
  basePrice?: number;
  stockQuantity?: number;
  minOrderQuantity?: number;
  shortDescription?: string;
  description?: string;
  imageUrl?: string;
  galleryUrls?: string[];
  featured?: boolean;
  active?: boolean;
}
