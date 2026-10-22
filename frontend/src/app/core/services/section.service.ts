import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface SectionRecord { _id: string; name: string; description?: string; status?: 'pending' | 'in-progress' | 'completed'; order: number; }
export interface ApiList<T> { success: boolean; data: T[]; meta?: { total: number; totalPages: number }; }
@Injectable({ providedIn: 'root' })
export class SectionService {
  private readonly api = `${environment.apiUrl}/sections`;
  constructor(private http: HttpClient) {}
  list(): Observable<ApiList<SectionRecord>> { return this.http.get<ApiList<SectionRecord>>(`${this.api}?page=1&pageSize=100`); }
  get(id:string): Observable<{data:SectionRecord}> { return this.http.get<{data:SectionRecord}>(`${this.api}/${id}`); }
  create(data: {name:string;description?:string;status?:SectionRecord['status']}): Observable<{data:SectionRecord}> { return this.http.post<{data:SectionRecord}>(this.api, data); }
  update(id:string,data:Partial<SectionRecord>): Observable<{data:SectionRecord}> { return this.http.put<{data:SectionRecord}>(`${this.api}/${id}`,data); }
  remove(id:string): Observable<unknown> { return this.http.delete(`${this.api}/${id}`); }
  reorder(items: { id:string; order:number }[]): Observable<unknown> { return this.http.patch(`${this.api}/reorder`, { items }); }
}
