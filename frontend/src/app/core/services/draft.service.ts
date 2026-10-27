import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface SectionDraftRecord {
  _id: string;
  draftName: string;
  draftOrder: number;
  content: string;
}

export type DraftStatus = 'pending' | 'in-progress' | 'approved' | 'published' | 'rejected';

export interface CourseDraftRecord {
  _id: string;
  draftName: string;
  draftOrder: number;
  commonDraft: string;
  customDraft: string;
  status: DraftStatus;
}

@Injectable({
  providedIn: 'root'
})
export class DraftService {

  private readonly api = `${environment.apiUrl}/drafts`;
  private readonly sectionsApi = `${environment.apiUrl}/sections`;
  private readonly coursesApi = `${environment.apiUrl}/courses`;

  constructor(private http: HttpClient) { }

  listSection(sectionId: string) {
    return this.http.get<{ data: SectionDraftRecord[] }>(`${this.sectionsApi}/${encodeURIComponent(sectionId)}/drafts?page=1&pageSize=100`);
  }

  listCourse(courseId: string) {
    return this.http.get<{ data: CourseDraftRecord[] }>(`${this.coursesApi}/${encodeURIComponent(courseId)}/drafts?page=1&pageSize=100`);
  }

  createCourse(courseId: string, body: Omit<CourseDraftRecord, '_id'>) {
    return this.http.post<{ data: CourseDraftRecord }>(`${this.coursesApi}/${encodeURIComponent(courseId)}/drafts`, body);
  }

  importCourse(courseId: string, drafts: Array<Omit<CourseDraftRecord, '_id'>>) {
    return this.http.post<{ data: CourseDraftRecord[] }>(`${this.coursesApi}/${encodeURIComponent(courseId)}/drafts/bulk-import`, { drafts });
  }

  createSection(sectionId: string, body: { draftName: string; draftOrder: number; content: string }) {
    return this.http.post<{ data: SectionDraftRecord }>(`${this.sectionsApi}/${encodeURIComponent(sectionId)}/drafts`, body);
  }

  update(id: string, body: { draftName: string; content: string }) {
    return this.http.put<{ data: SectionDraftRecord }>(`${this.api}/${id}`, body);
  }

  updateCourse(id: string, body: Partial<Omit<CourseDraftRecord, '_id'>>) {
    return this.http.put<{ data: CourseDraftRecord }>(`${this.api}/${encodeURIComponent(id)}`, body);
  }

  updateStatus(id: string, status: DraftStatus) {
    return this.http.patch<{ data: CourseDraftRecord }>(`${this.api}/${encodeURIComponent(id)}/status`, { status });
  }

  reorderCourse(courseId: string, items: Array<{ id: string; order: number }>) {
    return this.http.patch<{ data: CourseDraftRecord[] }>(`${this.api}/reorder`, { type: 'course', parentId: courseId, items });
  }

  remove(id: string) {
    return this.http.delete(`${this.api}/${id}`);
  }
}
