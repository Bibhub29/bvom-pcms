import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface DashboardNotice { _id:string; title:string; message:string; type:'info'|'reminder'|'warning'|'success'; createdAt:string; }
@Injectable({providedIn:'root'})
export class DashboardService {
  private readonly api=`${environment.apiUrl}/dashboard`;
  constructor(private http:HttpClient) {}
  notices():Observable<{data:DashboardNotice[]}> { return this.http.get<{data:DashboardNotice[]}>(`${this.api}/notices`); }
  dismiss(id:string):Observable<unknown> { return this.http.patch(`${this.api}/notices/${id}/dismiss`,{}); }
}
