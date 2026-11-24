export interface CartItem {
  id: string;
  productId?: string;
  productName: string;
  productSku?: string;
  productType: 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE';
  materialId?: string;
  materialNameSnapshot?: string;
  processingMethodId?: string;
  processingMethodNameSnapshot?: string;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  designFileUrl?: string;
  designFileName?: string;
  notes?: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  totalItems: number;
}

export interface AddCartItemRequest {
  productId?: string;
  productName: string;
  productType: 'STANDARD_ITEM' | 'CUSTOM_TEMPLATE';
  materialId?: string;
  processingMethodId?: string;
  widthMm?: number;
  heightMm?: number;
  thicknessMm?: number;
  quantity: number;
  designFileUrl?: string;
  designFileName?: string;
  notes?: string;
}

export interface UpdateCartItemRequest {
  quantity: number;
}
