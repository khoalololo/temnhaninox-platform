export type ProductType = 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
  children?: Category[];
}

export interface ProcessingMethod {
  id: string;
  name: string;
  code: string;
  description?: string;
  baseLeadTimeDays?: number;
  isActive?: boolean;
}

export interface Material {
  id: string;
  code: string;
  name: string;
  isMetal: boolean;
  densityKgM3?: number;
  pricePerKg?: number;
  thinSheetRatePerM2?: number;
  minThicknessMm: number;
  maxThicknessMm: number;
  pbrPreviewConfig?: Record<string, unknown>;
  isActive?: boolean;
  allowedProcessingMethods?: ProcessingMethod[];
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  productType: ProductType;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  processingMethodId?: string;
  processingMethodCode?: string;
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
  images?: string[];
  galleryUrls?: string[];
  featured?: boolean;
  isActive?: boolean;
}
