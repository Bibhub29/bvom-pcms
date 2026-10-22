import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface SectionDraftRecord {
  _id: string;
  draftName: string;
  draftOrder: number;
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class DraftService {

  private readonly api = `${environment.apiUrl}/drafts`;
  private readonly sectionsApi = `${environment.apiUrl}/sections`;

  constructor(private http: HttpClient) { }

  listSection(sectionId: string) {
    return this.http.get<{ data: SectionDraftRecord[] }>(`${this.sectionsApi}/${encodeURIComponent(sectionId)}/drafts?page=1&pageSize=100`);
  }

  createSection(sectionId: string, body: { draftName: string; draftOrder: number; content: string }) {
    return this.http.post<{ data: SectionDraftRecord }>(`${this.sectionsApi}/${encodeURIComponent(sectionId)}/drafts`, body);
  }

  update(id: string, body: { draftName: string; content: string }) {
    return this.http.put<{ data: SectionDraftRecord }>(`${this.api}/${id}`, body);
  }

  remove(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
