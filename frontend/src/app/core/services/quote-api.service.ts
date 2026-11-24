import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from '../models/api.models';
import {
  FileUploadResponse,
  QuoteCalculationRequest,
  QuoteCalculationResponse,
} from '../models/quote.models';

@Injectable({ providedIn: 'root' })
export class QuoteApiService {
  private readonly http = inject(HttpClient);

  calculateQuote(payload: QuoteCalculationRequest): Observable<ApiResponse<QuoteCalculationResponse>> {
    return this.http.post<ApiResponse<QuoteCalculationResponse>>('/api/v1/quotes/calculate', payload);
  }

  uploadFile(file: File, bucket = 'design-files'): Observable<ApiResponse<FileUploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);
    return this.http.post<ApiResponse<FileUploadResponse>>('/api/v1/files/upload', formData);
  }
}
