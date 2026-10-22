import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type NoticeType = 'Update' | 'Reminder' | 'Tip' | 'Alert';

export interface ApiNotice {
  _id: string;
  type: NoticeType;
  title: string;
  message: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NoticeService {
  private readonly api = `${environment.apiUrl}/notices`;

  constructor(private http: HttpClient) {}

  list(): Observable<{ data: ApiNotice[] }> {
    return this.http.get<{ data: ApiNotice[] }>(this.api);
  }

  create(body: { type: NoticeType; title: string; message: string }): Observable<{ data: ApiNotice }> {
    return this.http.post<{ data: ApiNotice }>(this.api, body);
  }

  dismiss(id: string): Observable<unknown> {
    return this.http.patch(`${this.api}/${id}/dismiss`, {});
  }
}
