import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ApiResponse, PageResponse } from '../models/api.models';
import { Category, Material, ProcessingMethod, Product, ProductType } from '../models/catalog.models';

export interface ProductQueryParams {
  categoryId?: string;
  productType?: ProductType | '';
  search?: string;
  page?: number;
  size?: number;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  private normalizeProduct(product: Product): Product {
    const imgs = Array.isArray(product.images) ? product.images : [];
    return {
      ...product,
      images: imgs,
      imageUrl: product.imageUrl || imgs[0] || undefined,
      galleryUrls: product.galleryUrls?.length ? product.galleryUrls : imgs,
    };
  }

  getCategories(): Observable<ApiResponse<Category[]>> {
    return this.http.get<ApiResponse<Category[]>>('/api/v1/catalog/categories');
  }

  getMaterials(): Observable<ApiResponse<Material[]>> {
    return this.http.get<ApiResponse<Material[]>>('/api/v1/catalog/materials');
  }

  getProcessingMethods(): Observable<ApiResponse<ProcessingMethod[]>> {
    return this.http.get<ApiResponse<ProcessingMethod[]>>('/api/v1/catalog/processing-methods');
  }

  getProducts(query: ProductQueryParams = {}): Observable<ApiResponse<PageResponse<Product>>> {
    let params = new HttpParams();
    if (query.categoryId) params = params.set('categoryId', query.categoryId);
    if (query.productType) params = params.set('productType', query.productType);
    if (query.search) params = params.set('search', query.search.trim());
    if (query.page !== undefined) params = params.set('page', query.page.toString());
    if (query.size !== undefined) params = params.set('size', query.size.toString());

    return this.http
      .get<ApiResponse<PageResponse<Product>>>('/api/v1/catalog/products', { params })
      .pipe(
        map((res) => ({
          ...res,
          data: res.data
            ? {
              ...res.data,
              content: (res.data.content || []).map((p) => this.normalizeProduct(p)),
            }
            : res.data,
        }))
      );
  }

  getProductBySlug(slug: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`/api/v1/catalog/products/${slug}`).pipe(
      map((res) => ({
        ...res,
        data: res.data ? this.normalizeProduct(res.data) : res.data,
      }))
    );
  }
}
