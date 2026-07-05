import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';

import { AgentItem } from './models/agent.model';
import { ChatMessage } from './models/chat.model';
import { AgentService } from './services/agent.service';
import { ChatService } from './services/chat.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzLayoutModule,
    NzSelectModule,
    NzSpinModule,
    NzTagModule,
    NzTypographyModule
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  // For now we type user and role manually.
  // Later you can fill these from Azure AD / JWT claims.
  userId = 'saif';
  roles = 'Viewer';

  agents: AgentItem[] = [];
  selectedAgentName: string | null = null;
  messageText = '';
  sessionId: string | null = null;
  isAgentsLoading = false;
  isSending = false;
  errorText = '';

  // The chat history shown in the UI.
  messages: ChatMessage[] = [
    {
      sender: 'assistant',
      text: 'Welcome. Select an agent, then ask a question. Try: Get recent Jira linked items for DE-123'
    }
  ];

  constructor(
    private readonly agentService: AgentService,
    private readonly chatService: ChatService
  ) {}

  ngOnInit(): void {
    this.loadAgents();
  }

  // Load the list of agents for the current user.
  // This method fills the ng-zorro dropdown.
  loadAgents(): void {
    this.isAgentsLoading = true;
    this.errorText = '';

    this.agentService
      .getAgents(this.userId, this.roles)
      .pipe(finalize(() => (this.isAgentsLoading = false)))
      .subscribe({
        next: (agents) => {
          this.agents = agents;
          if (agents.length > 0 && !this.selectedAgentName) {
            this.selectedAgentName = agents[0].name;
          }
        },
        error: (error) => {
          this.errorText = error?.error?.detail ?? 'Failed to load agents.';
        }
      });
  }

  // Read the selected agent object so we can show its description.
  get selectedAgent(): AgentItem | undefined {
    return this.agents.find((agent) => agent.name === this.selectedAgentName);
  }

  // Send the user message to the backend.
  // The selected agent is included in the request body.
  sendMessage(): void {
    const trimmed = this.messageText.trim();
    if (!trimmed || !this.selectedAgentName || this.isSending) {
      return;
    }

    this.errorText = '';
    this.messages = [...this.messages, { sender: 'user', text: trimmed }];
    this.isSending = true;

    this.chatService
      .sendMessage(this.userId, this.roles, {
        agent_name: this.selectedAgentName,
        message: trimmed,
        session_id: this.sessionId
      })
      .pipe(finalize(() => (this.isSending = false)))
      .subscribe({
        next: (response) => {
          this.sessionId = response.session_id;

          this.messages = [...this.messages, { sender: 'assistant', text: response.answer }];

          if (response.tool_calls.length > 0) {
            const toolNames = response.tool_calls.map((item) => item.tool_name).join(', ');
            this.messages = [
              ...this.messages,
              {
                sender: 'assistant',
                text: `Tools used in this turn: ${toolNames}`
              }
            ];
          }

          this.messageText = '';
        },
        error: (error) => {
          this.errorText = error?.error?.detail ?? 'Failed to send message.';
        }
      });
  }

  // Optional helper so Enter sends the message and Shift+Enter keeps a new line.
  onComposerKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
