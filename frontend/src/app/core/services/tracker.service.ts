import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
export interface TrackerTask { _id:string; title:string; priority:'low'|'medium'|'high'; isCompleted:boolean; }
export interface ActivityRecord { date:string; attended:boolean; minutesSpent:number; tasksCompleted:number; chaptersCompleted:number; note?:string; }
@Injectable({ providedIn:'root' })
export class TrackerService {
  private readonly api=`${environment.apiUrl}/tracker`;
  constructor(private http:HttpClient) {}
  tasks():Observable<{data:TrackerTask[]}> { return this.http.get<{data:TrackerTask[]}>(`${this.api}/tasks?page=1&pageSize=100`); }
  createTask(data:{title:string;priority:string;isCompleted:boolean}):Observable<{data:TrackerTask}> { return this.http.post<{data:TrackerTask}>(`${this.api}/tasks`,data); }
  updateTask(id:string,data:{title:string;priority:string;isCompleted:boolean}):Observable<{data:TrackerTask}> { return this.http.put<{data:TrackerTask}>(`${this.api}/tasks/${id}`,data); }
  completeTask(id:string,isCompleted:boolean):Observable<unknown> { return this.http.patch(`${this.api}/tasks/${id}/completion`,{isCompleted}); }
  deleteTask(id:string):Observable<unknown> { return this.http.delete(`${this.api}/tasks/${id}`); }
  courses():Observable<{data:Array<{course:{_id:string;name:string};progress:{totalChapters:number;completedChapters:number}}>}> { return this.http.get<any>(`${this.api}/courses`); }
  activity(year:number):Observable<{data:ActivityRecord[]}> { return this.http.get<{data:ActivityRecord[]}>(`${this.api}/activity?year=${year}`); }
  saveActivity(date:string,attended:boolean):Observable<unknown> { return this.http.put(`${this.api}/activity/${date}`,{attended,minutesSpent:0,tasksCompleted:0,chaptersCompleted:0}); }
}
