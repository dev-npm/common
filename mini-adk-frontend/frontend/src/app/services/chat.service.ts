import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ChatRequest, ChatResponse } from '../models/chat.model';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly apiBase = 'http://localhost:8000/api';

  constructor(private readonly http: HttpClient) {}

  sendMessage(userId: string, roles: string, request: ChatRequest): Observable<ChatResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-User-Id': userId,
      'X-Roles': roles
    });

    return this.http.post<ChatResponse>(`${this.apiBase}/chat`, request, { headers });
  }
}
