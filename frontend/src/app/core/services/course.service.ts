import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export type CourseStatus = 'pending' | 'in-progress' | 'completed';
export interface CourseRecord { _id:string; sectionId:string; name:string; description?:string; iconUrl?:string; commonDraft?:string; order:number; status:CourseStatus; }
@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly api = `${environment.apiUrl}/courses`;
  constructor(private http:HttpClient) {}
  list(sectionId?:string):Observable<{data:CourseRecord[]}> {
    const query = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}&page=1&pageSize=100` : '?page=1&pageSize=100';
    return this.http.get<{data:CourseRecord[]}>(`${this.api}${query}`);
  }
  get(id:string):Observable<{data:CourseRecord}> { return this.http.get<{data:CourseRecord}>(`${this.api}/${id}`); }
  create(data:Partial<CourseRecord>):Observable<{data:CourseRecord}> { return this.http.post<{data:CourseRecord}>(this.api,data); }
  update(id:string,data:Partial<CourseRecord>):Observable<{data:CourseRecord}> { return this.http.put<{data:CourseRecord}>(`${this.api}/${id}`,data); }
  remove(id:string):Observable<unknown> { return this.http.delete(`${this.api}/${id}`); }
}
