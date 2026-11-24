export interface QuoteCalculationRequest {
  materialId: string;
  processingMethodId: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  quantity: number;
  requiresVatInvoice: boolean;
}

export interface QuoteCalculationResponse {
  pricingFormulaMode: string;
  areaM2: number;
  calculatedWeightKg: number;
  unitPrice: number;
  quantity: number;
  subtotalAmount: number;
  discountRate: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  depositRequiredAmount: number;
  estimatedLeadTimeDays: number;
}

export interface FileUploadResponse {
  bucket: string;
  key: string;
  fileName: string;
  contentType: string;
  size: number;
  url: string;
}
