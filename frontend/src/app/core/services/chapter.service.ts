import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface ChapterRecord { _id:string; courseId:string; name:string; content:string; chatLink:string; order:number; status:'Pending'|'Updated'|'Published'; }
@Injectable({providedIn:'root'})
export class ChapterService {
  private readonly api=environment.apiUrl;
  constructor(private http:HttpClient) {}
  list(courseId:string):Observable<{data:ChapterRecord[]}> { return this.http.get<{data:ChapterRecord[]}>(`${this.api}/courses/${courseId}/chapters?page=1&pageSize=100`); }
  create(data:Partial<ChapterRecord>):Observable<{data:ChapterRecord}> { return this.http.post<{data:ChapterRecord}>(`${this.api}/chapters`,data); }
  update(id:string,data:Partial<ChapterRecord>):Observable<{data:ChapterRecord}> { return this.http.put<{data:ChapterRecord}>(`${this.api}/chapters/${id}`,data); }
  setStatus(id:string,status:ChapterRecord['status']):Observable<unknown> { return this.http.patch(`${this.api}/chapters/${id}/status`,{status}); }
  remove(id:string):Observable<unknown> { return this.http.delete(`${this.api}/chapters/${id}`); }
  bulkImport(courseId:string,chapters:Array<{name:string;order:number}>):Observable<unknown> { return this.http.post(`${this.api}/courses/${courseId}/chapters/bulk-import`,{chapters}); }
}
