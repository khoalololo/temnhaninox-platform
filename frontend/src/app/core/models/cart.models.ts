export type CartItemType = 'STANDARD_ITEM' | 'CUSTOM_ITEM';

export interface CartItem {
  id: string;
  productId?: string;
  itemType: CartItemType;
  materialId?: string;
  processingMethodId?: string;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  quantity: number;
  estimatedUnitPrice: number;
  lineTotal: number;
  designFileUrl?: string;
  customerNote?: string;
  createdAt?: string;
}

export interface Cart {
  id: string;
  customerId: string;
  items: CartItem[];
  estimatedSubtotal: number;
  totalItems: number;
  updatedAt?: string;
}

export interface AddCartItemRequest {
  itemType: CartItemType;
  productId?: string;
  materialId?: string;
  processingMethodId?: string;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  quantity: number;
  designFileUrl?: string;
  customerNote?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
  customerNote?: string;
}
