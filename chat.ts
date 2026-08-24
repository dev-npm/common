// ============================================================================
// FILE: conversation-sidebar.component.ts
// ============================================================================

import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import {
  Conversation
} from '../../models/conversation.model';


@Component({
  selector: 'app-conversation-sidebar',
  templateUrl: './conversation-sidebar.component.html',
  styleUrls: ['./conversation-sidebar.component.css']
})
export class ConversationSidebarComponent {

  @Input()
  conversations: Conversation[] = [];

  @Input()
  selectedConversationId: string | null = null;

  @Input()
  isLoading = false;

  @Input()
  disabled = false;


  @Output()
  conversationSelected =
    new EventEmitter<Conversation>();

  @Output()
  newChatRequested =
    new EventEmitter<void>();


  selectConversation(
    conversation: Conversation
  ): void {

    if (this.disabled) {
      return;
    }

    this.conversationSelected.emit(
      conversation
    );
  }


  newChat(): void {

    if (this.disabled) {
      return;
    }

    this.newChatRequested.emit();
  }
}



// ============================================================================
// FILE: conversation-sidebar.component.html
// ============================================================================

/*

<aside class="conversation-sidebar">

  <button
    type="button"
    class="new-chat-button"
    [disabled]="disabled"
    (click)="newChat()">

    + New Chat

  </button>


  <div
    *ngIf="isLoading"
    class="conversation-loading">

    Loading conversations...

  </div>


  <div
    *ngIf="
      !isLoading &&
      conversations.length === 0
    "
    class="conversation-empty">

    No conversations yet.

  </div>


  <div class="conversation-list">

    <button
      *ngFor="let conversation of conversations"
      type="button"
      class="conversation-item"
      [class.selected]="
        selectedConversationId ===
        conversation.conversation_id
      "
      [disabled]="disabled"
      (click)="selectConversation(conversation)">

      <div class="conversation-title">

        {{
          conversation.title ||
          'New conversation'
        }}

      </div>

      <div class="conversation-date">

        {{
          conversation.updated_at
            | date:'short'
        }}

      </div>

    </button>

  </div>

</aside>

*/



// ============================================================================
// FILE: conversation-chat.component.ts
// ============================================================================

import {
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';

import {
  UiChatMessage
} from '../../models/ui-chat-message.model';


@Component({
  selector: 'app-conversation-chat',
  templateUrl: './conversation-chat.component.html',
  styleUrls: ['./conversation-chat.component.css']
})
export class ConversationChatComponent {

  @Input()
  messages: UiChatMessage[] = [];

  @Input()
  isLoadingMessages = false;

  @Input()
  isStreaming = false;


  @Output()
  messageSubmitted =
    new EventEmitter<string>();


  messageText = '';


  sendMessage(): void {

    const message =
      this.messageText.trim();

    if (!message) {
      return;
    }

    if (this.isStreaming) {
      return;
    }

    this.messageText = '';

    this.messageSubmitted.emit(
      message
    );
  }
}



// ============================================================================
// FILE: conversation-chat.component.html
// ============================================================================

/*

<div class="chat-container">

  <div class="messages-container">

    <div
      *ngIf="isLoadingMessages"
      class="messages-loading">

      Loading messages...

    </div>


    <div
      *ngIf="
        !isLoadingMessages &&
        messages.length === 0
      "
      class="empty-chat">

      Start a new conversation.

    </div>


    <div
      *ngFor="let message of messages"
      class="message"
      [class.user-message]="
        message.role === 'user'
      "
      [class.assistant-message]="
        message.role === 'assistant'
      ">

      <div class="message-role">

        {{
          message.role === 'user'
            ? 'You'
            : 'Assistant'
        }}

      </div>


      <div class="message-content">

        {{ message.content }}

      </div>


      <div
        *ngIf="
          message.status === 'streaming'
        "
        class="streaming-indicator">

        ...

      </div>


      <div
        *ngIf="
          message.status === 'failed'
        "
        class="message-error">

        Response failed.

      </div>

    </div>

  </div>


  <div class="message-input-container">

    <textarea
      [(ngModel)]="messageText"
      [disabled]="isStreaming"
      placeholder="Type your message..."
      rows="3">

    </textarea>


    <button
      type="button"
      [disabled]="
        isStreaming ||
        !messageText.trim()
      "
      (click)="sendMessage()">

      Send

    </button>

  </div>

</div>

*/



// ============================================================================
// FILE: chat-page.component.ts
// ============================================================================

import {
  Component,
  OnInit
} from '@angular/core';

import {
  Conversation,
  ConversationMessage
} from '../../models/conversation.model';

import {
  UiChatMessage
} from '../../models/ui-chat-message.model';

import {
  ChatService
} from '../../services/chat.service';


@Component({
  selector: 'app-chat-page',
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css']
})
export class ChatPageComponent
  implements OnInit {

  conversations: Conversation[] = [];

  messages: UiChatMessage[] = [];

  conversationId: string | null = null;

  isLoadingConversations = false;

  isLoadingMessages = false;

  isStreaming = false;


  constructor(
    private readonly chatService: ChatService
  ) {
  }


  ngOnInit(): void {

    this.loadConversations();
  }


  // ==========================================================================
  // LOAD CONVERSATION SIDEBAR
  // ==========================================================================

  loadConversations(): void {

    this.isLoadingConversations = true;

    this.chatService
      .getConversations()
      .subscribe({

        next: conversations => {

          this.conversations =
            conversations;

          this.isLoadingConversations =
            false;
        },


        error: error => {

          this.isLoadingConversations =
            false;

          console.error(
            'Unable to load conversations',
            error
          );
        }

      });
  }


  // ==========================================================================
  // SELECT CONVERSATION
  // ==========================================================================

  selectConversation(
    conversation: Conversation
  ): void {

    if (this.isStreaming) {
      return;
    }

    if (
      this.conversationId ===
      conversation.conversation_id
    ) {
      return;
    }

    this.conversationId =
      conversation.conversation_id;

    this.loadConversationMessages(
      conversation.conversation_id
    );
  }


  // ==========================================================================
  // LOAD CONVERSATION HISTORY
  // ==========================================================================

  loadConversationMessages(
    conversationId: string
  ): void {

    this.isLoadingMessages = true;

    this.messages = [];

    this.chatService
      .getConversationMessages(
        conversationId
      )
      .subscribe({

        next: messages => {

          this.messages =
            messages.map(
              message =>
                this.mapMessage(
                  message
                )
            );

          this.isLoadingMessages =
            false;
        },


        error: error => {

          this.isLoadingMessages =
            false;

          console.error(
            'Unable to load conversation messages',
            error
          );
        }

      });
  }


  // ==========================================================================
  // NEW CHAT
  // ==========================================================================

  newChat(): void {

    if (this.isStreaming) {
      return;
    }

    /*
     * Do NOT create a DB conversation here.
     *
     * conversation_id = null causes the backend to
     * create the conversation when the first message
     * is actually sent.
     */

    this.conversationId = null;

    this.messages = [];
  }


  // ==========================================================================
  // CHAT CHILD EMITS A MESSAGE
  // ==========================================================================

  sendMessage(
    message: string
  ): void {

    if (this.isStreaming) {
      return;
    }

    /*
     * IMPORTANT:
     *
     * Use your EXISTING Token A acquisition logic here.
     *
     * Once you obtain Token A:
     *
     * this.startStreaming(
     *   message,
     *   accessToken
     * );
     *
     * Example only:
     *
     * this.authService.getAccessToken()
     *   .subscribe(accessToken => {
     *
     *      this.startStreaming(
     *        message,
     *        accessToken
     *      );
     *
     *   });
     */

    this.getTokenAndStream(
      message
    );
  }


  // ==========================================================================
  // REPLACE THIS METHOD BODY WITH YOUR EXISTING TOKEN A CODE
  // ==========================================================================

  private getTokenAndStream(
    message: string
  ): void {

    /*
     * PUT YOUR EXISTING WORKING TOKEN A
     * ACQUISITION CODE HERE.
     *
     * Then call:
     *
     * this.startStreaming(
     *   message,
     *   accessToken
     * );
     */
  }


  // ==========================================================================
  // STREAM MESSAGE
  // ==========================================================================

  private startStreaming(
    message: string,
    accessToken: string
  ): void {

    this.isStreaming = true;


    // ------------------------------------------------------------------------
    // Add user message immediately to UI
    // ------------------------------------------------------------------------

    const userMessage: UiChatMessage = {

      role: 'user',

      content: message,

      status: 'completed'
    };

    this.messages.push(
      userMessage
    );


    // ------------------------------------------------------------------------
    // Add empty assistant bubble
    // ------------------------------------------------------------------------

    const assistantMessage: UiChatMessage = {

      role: 'assistant',

      content: '',

      status: 'streaming'
    };

    this.messages.push(
      assistantMessage
    );


    // ------------------------------------------------------------------------
    // Start backend stream
    // ------------------------------------------------------------------------

    this.chatService
      .streamMessage(
        {
          message: message,

          conversation_id:
            this.conversationId
        },
        accessToken
      )
      .subscribe({

        next: event => {

          switch (event.type) {


            // ================================================================
            // START
            // ================================================================

            case 'start':

              /*
               * Very important for a NEW conversation.
               *
               * conversationId was null.
               *
               * Backend created the UUID and sends it
               * back in the start event.
               */

              this.conversationId =
                event.conversation_id;

              break;


            // ================================================================
            // TOKEN
            // ================================================================

            case 'token':

              /*
               * Append each streamed token/chunk
               * to the SAME assistant message object.
               */

              assistantMessage.content +=
                event.text;

              break;


            // ================================================================
            // DONE
            // ================================================================

            case 'done':

              /*
               * Backend final answer is authoritative.
               *
               * Replace accumulated stream with the
               * final DB-persisted answer.
               */

              assistantMessage.content =
                event.answer;

              assistantMessage.status =
                'completed';

              assistantMessage.messageId =
                event.assistant_message_id;

              assistantMessage.responseTimeMs =
                event.response_time_ms;

              this.conversationId =
                event.conversation_id;


              /*
               * Refresh sidebar because:
               *
               * 1. New conversation may now exist.
               * 2. title may have been created.
               * 3. updated_at changed.
               * 4. conversation ordering may change.
               */

              this.loadConversations();

              break;


            // ================================================================
            // BACKEND STREAM ERROR EVENT
            // ================================================================

            case 'error':

              assistantMessage.status =
                'failed';

              if (
                !assistantMessage.content
              ) {

                assistantMessage.content =
                  event.message;
              }

              console.error(
                'Backend stream returned an error',
                event
              );

              break;
          }
        },


        // ====================================================================
        // HTTP / NETWORK ERROR
        // ====================================================================

        error: error => {

          this.isStreaming = false;

          assistantMessage.status =
            'failed';

          if (
            !assistantMessage.content
          ) {

            assistantMessage.content =
              'Unable to get a response.';
          }

          console.error(
            'Streaming failed',
            error
          );
        },


        // ====================================================================
        // STREAM COMPLETE
        // ====================================================================

        complete: () => {

          this.isStreaming = false;

          console.log(
            'Streaming connection completed.'
          );
        }

      });
  }


  // ==========================================================================
  // DATABASE MESSAGE -> UI MESSAGE
  // ==========================================================================

  private mapMessage(
    message: ConversationMessage
  ): UiChatMessage {

    return {

      messageId:
        message.message_id,

      role:
        message.role,

      content:
        message.content,

      status:
        message.status,

      createdAt:
        message.created_at,

      responseTimeMs:
        message.response_time_ms
    };
  }

}



// ============================================================================
// FILE: chat-page.component.html
// ============================================================================

/*

<div class="chat-page">


  <!-- ==================================================================== -->
  <!-- LEFT SIDE: CONVERSATION LIST                                        -->
  <!-- ==================================================================== -->

  <div class="sidebar-container">

    <app-conversation-sidebar

      [conversations]="conversations"

      [selectedConversationId]="conversationId"

      [isLoading]="isLoadingConversations"

      [disabled]="isStreaming"

      (conversationSelected)="
        selectConversation($event)
      "

      (newChatRequested)="
        newChat()
      ">

    </app-conversation-sidebar>

  </div>


  <!-- ==================================================================== -->
  <!-- RIGHT SIDE: CHAT                                                     -->
  <!-- ==================================================================== -->

  <div class="chat-container">

    <app-conversation-chat

      [messages]="messages"

      [isLoadingMessages]="isLoadingMessages"

      [isStreaming]="isStreaming"

      (messageSubmitted)="
        sendMessage($event)
      ">

    </app-conversation-chat>

  </div>


</div>

*/
