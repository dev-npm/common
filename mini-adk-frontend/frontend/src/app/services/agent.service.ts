import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AgentItem } from '../models/agent.model';

@Injectable({ providedIn: 'root' })
export class AgentService {
  private readonly apiBase = 'http://localhost:8000/api';

  constructor(private readonly http: HttpClient) {}

  getAgents(userId: string, roles: string): Observable<AgentItem[]> {
    const headers = new HttpHeaders({
      'X-User-Id': userId,
      'X-Roles': roles
    });

    return this.http.get<AgentItem[]>(`${this.apiBase}/agents`, { headers });
  }
}
