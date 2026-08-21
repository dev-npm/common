conversation_message_repository
from psycopg_pool import AsyncConnectionPool

from app.models.conversation_message import ConversationMessage


class ConversationMessageRepository:

    def __init__(
        self,
        database_pool: AsyncConnectionPool,
    ) -> None:
        self._database_pool = database_pool

    # =========================================================
    # CREATE PENDING USER MESSAGE
    # =========================================================

    async def create_pending_user_message(
        self,
        conversation_id: str,
        content: str,
    ) -> ConversationMessage:
        """
        Persist the incoming user message as pending.

        This transaction commits BEFORE the LLM is called.
        Therefore no database transaction remains open
        during LLM execution.
        """

        async with self._database_pool.connection() as connection:

            async with connection.transaction():

                async with connection.cursor() as cursor:

                    await cursor.execute(
                        """
                        INSERT INTO user_conversation_message
                        (
                            conversation_id,
                            role,
                            content,
                            status,
                            response_time_ms
                        )
                        VALUES
                        (
                            %s,
                            'user',
                            %s,
                            'pending',
                            NULL
                        )
                        RETURNING
                            message_id,
                            conversation_id,
                            role,
                            content,
                            created_at,
                            status,
                            response_time_ms;
                        """,
                        (
                            conversation_id,
                            content,
                        ),
                    )

                    row = await cursor.fetchone()

                    if row is None:
                        raise RuntimeError(
                            "Failed to create pending user message."
                        )

        return self._map_message(row)

    # =========================================================
    # COMPLETE SUCCESSFUL EXCHANGE
    # =========================================================

    async def complete_exchange(
        self,
        user_message_id: int,
        conversation_id: str,
        assistant_content: str,
        response_time_ms: int,
    ) -> tuple[
        ConversationMessage,
        ConversationMessage,
    ]:
        """
        Complete a successful exchange in one transaction:

            user pending -> completed
            INSERT assistant completed

        If either operation fails, everything rolls back.
        """

        async with self._database_pool.connection() as connection:

            async with connection.transaction():

                async with connection.cursor() as cursor:

                    # -------------------------------------------------
                    # Mark user message completed
                    # -------------------------------------------------

                    await cursor.execute(
                        """
                        UPDATE user_conversation_message
                        SET
                            status = 'completed'
                        WHERE message_id = %s
                          AND conversation_id = %s
                          AND role = 'user'
                          AND status = 'pending'
                        RETURNING
                            message_id,
                            conversation_id,
                            role,
                            content,
                            created_at,
                            status,
                            response_time_ms;
                        """,
                        (
                            user_message_id,
                            conversation_id,
                        ),
                    )

                    user_row = await cursor.fetchone()

                    if user_row is None:
                        raise RuntimeError(
                            "Pending user message was not found "
                            "while completing exchange."
                        )

                    # -------------------------------------------------
                    # Insert assistant response
                    # -------------------------------------------------

                    await cursor.execute(
                        """
                        INSERT INTO user_conversation_message
                        (
                            conversation_id,
                            role,
                            content,
                            status,
                            response_time_ms
                        )
                        VALUES
                        (
                            %s,
                            'assistant',
                            %s,
                            'completed',
                            %s
                        )
                        RETURNING
                            message_id,
                            conversation_id,
                            role,
                            content,
                            created_at,
                            status,
                            response_time_ms;
                        """,
                        (
                            conversation_id,
                            assistant_content,
                            response_time_ms,
                        ),
                    )

                    assistant_row = await cursor.fetchone()

                    if assistant_row is None:
                        raise RuntimeError(
                            "Failed to save assistant message."
                        )

        return (
            self._map_message(user_row),
            self._map_message(assistant_row),
        )

    # =========================================================
    # MARK USER MESSAGE FAILED
    # =========================================================

    async def mark_user_message_failed(
        self,
        user_message_id: int,
        conversation_id: str,
        response_time_ms: int,
    ) -> ConversationMessage:
        """
        Mark a pending request as failed.

        Because there is no assistant message on failure,
        response_time_ms is stored on the failed user row.
        """

        async with self._database_pool.connection() as connection:

            async with connection.transaction():

                async with connection.cursor() as cursor:

                    await cursor.execute(
                        """
                        UPDATE user_conversation_message
                        SET
                            status = 'failed',
                            response_time_ms = %s
                        WHERE message_id = %s
                          AND conversation_id = %s
                          AND role = 'user'
                          AND status = 'pending'
                        RETURNING
                            message_id,
                            conversation_id,
                            role,
                            content,
                            created_at,
                            status,
                            response_time_ms;
                        """,
                        (
                            response_time_ms,
                            user_message_id,
                            conversation_id,
                        ),
                    )

                    row = await cursor.fetchone()

                    if row is None:
                        raise RuntimeError(
                            "Pending user message was not found "
                            "while marking it failed."
                        )

        return self._map_message(row)

    # =========================================================
    # GET CONVERSATION MESSAGES
    # =========================================================

    async def list_for_conversation(
        self,
        conversation_id: str,
    ) -> list[ConversationMessage]:

        async with self._database_pool.connection() as connection:

            async with connection.cursor() as cursor:

                await cursor.execute(
                    """
                    SELECT
                        message_id,
                        conversation_id,
                        role,
                        content,
                        created_at,
                        status,
                        response_time_ms
                    FROM user_conversation_message
                    WHERE conversation_id = %s
                    ORDER BY message_id;
                    """,
                    (
                        conversation_id,
                    ),
                )

                rows = await cursor.fetchall()

        return [
            self._map_message(row)
            for row in rows
        ]

    # =========================================================
    # MAPPING
    # =========================================================

    @staticmethod
    def _map_message(
        row,
    ) -> ConversationMessage:

        return ConversationMessage(
            message_id=row["message_id"],
            conversation_id=row["conversation_id"],
            role=row["role"],
            content=row["content"],
            created_at=row["created_at"],
            status=row["status"],
            response_time_ms=row["response_time_ms"],
        )

  conversation_message_repository(***************

conversation_message_service****************
from app.models.conversation_message import ConversationMessage

from app.repositories.conversation_message_repository import (
    ConversationMessageRepository,
)


class ConversationMessageService:

    def __init__(
        self,
        repository: ConversationMessageRepository,
    ) -> None:

        self._repository = repository

    async def create_pending_user_message(
        self,
        conversation_id: str,
        content: str,
    ) -> ConversationMessage:

        return await self._repository.create_pending_user_message(
            conversation_id=conversation_id,
            content=content,
        )

    async def complete_exchange(
        self,
        user_message_id: int,
        conversation_id: str,
        assistant_content: str,
        response_time_ms: int,
    ) -> tuple[
        ConversationMessage,
        ConversationMessage,
    ]:

        return await self._repository.complete_exchange(
            user_message_id=user_message_id,
            conversation_id=conversation_id,
            assistant_content=assistant_content,
            response_time_ms=response_time_ms,
        )

    async def mark_user_message_failed(
        self,
        user_message_id: int,
        conversation_id: str,
        response_time_ms: int,
    ) -> ConversationMessage:

        return await self._repository.mark_user_message_failed(
            user_message_id=user_message_id,
            conversation_id=conversation_id,
            response_time_ms=response_time_ms,
        )

    async def get_messages(
        self,
        conversation_id: str,
    ) -> list[ConversationMessage]:

        return await self._repository.list_for_conversation(
            conversation_id=conversation_id,
        )


ChatService******************************8
import logging
import time
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import AIMessage

from app.models.chat import ChatResponse
from app.orchestration.orchestrator_agent import OrchestratorAgent
from app.orchestration.request_context import RequestContext
from app.services.conversation_service import ConversationService
from app.services.conversation_message_service import (
    ConversationMessageService,
)

# IMPORTANT:
# Use the import path you ALREADY have for these two functions.
from app.infrastructure.llm.llm_context import (
    set_current_llm_model,
    reset_current_llm_model,
)


logger = logging.getLogger(__name__)


class ChatService:

    def __init__(
        self,
        model: BaseChatModel,
        orchestrator_agent: OrchestratorAgent,
        conversation_service: ConversationService,
        conversation_message_service: ConversationMessageService,
    ) -> None:

        self._model = model

        # Existing shared/compiled orchestrator.
        # DO NOT create this per request.
        self._orchestrator_agent = orchestrator_agent

        self._conversation_service = conversation_service

        self._conversation_message_service = (
            conversation_message_service
        )

    async def send_message(
        self,
        message: str,
        context: RequestContext,
    ) -> ChatResponse:

        # =====================================================
        # 1. CREATE / VALIDATE CONVERSATION
        # =====================================================

        conversation_id = (
            await self._conversation_service.get_or_create(
                company_user_id=context.company_user_id,
                conversation_id=context.conversation_id,
                first_message=message,
            )
        )

        # =====================================================
        # 2. SAVE USER MESSAGE AS PENDING
        #
        # DB transaction opens here and COMMITS here.
        #
        # Once this await returns there is NO transaction open.
        # =====================================================

        pending_user_message = (
            await self._conversation_message_service
            .create_pending_user_message(
                conversation_id=conversation_id,
                content=message,
            )
        )

        # =====================================================
        # 3. BUILD LANGGRAPH CONFIG
        # =====================================================

        config = self._orchestrator_agent.get_run_config()

        config = {
            **config,
            "configurable": {
                **config.get(
                    "configurable",
                    {},
                ),
                "thread_id": conversation_id,
            },
        }

        # =====================================================
        # 4. SET REQUEST-SPECIFIC REAL LLM MODEL
        # =====================================================

        reset_handle = set_current_llm_model(
            context.llm_model
        )

        # =====================================================
        # 5. START TIMER
        #
        # This measures actual agent/LLM execution.
        # =====================================================

        start_time = time.perf_counter()

        try:

            # =================================================
            # 6. CALL EXISTING ORCHESTRATOR
            #
            # NO DATABASE TRANSACTION IS OPEN HERE.
            # =================================================

            result = await self._orchestrator_agent.ainvoke(
                message,
                config=config,
            )

            # =================================================
            # 7. CALCULATE RESPONSE TIME
            # =================================================

            response_time_ms = int(
                (
                    time.perf_counter()
                    - start_time
                )
                * 1000
            )

            # =================================================
            # 8. GET ASSISTANT TEXT
            # =================================================

            assistant_content = (
                self._extract_assistant_content(
                    result
                )
            )

            # =================================================
            # 9. COMPLETE SUCCESSFUL EXCHANGE
            #
            # SHORT DB TRANSACTION:
            #
            # user pending -> completed
            # INSERT assistant
            #
            # COMMIT
            # =================================================

            (
                _completed_user_message,
                assistant_message,
            ) = await (
                self._conversation_message_service
                .complete_exchange(
                    user_message_id=(
                        pending_user_message.message_id
                    ),
                    conversation_id=conversation_id,
                    assistant_content=assistant_content,
                    response_time_ms=response_time_ms,
                )
            )

            logger.info(
                "Chat request completed. "
                "conversation_id=%s "
                "user_message_id=%s "
                "assistant_message_id=%s "
                "run_id=%s "
                "response_time_ms=%s",
                conversation_id,
                pending_user_message.message_id,
                assistant_message.message_id,
                context.run_id,
                response_time_ms,
            )

            # =================================================
            # 10. RETURN YOUR CHAT RESPONSE
            # =================================================

            return ChatResponse(
                conversation_id=conversation_id,
                run_id=context.run_id,
                response=assistant_content,
            )

        except Exception:

            # =================================================
            # Calculate elapsed time up to failure.
            # =================================================

            failed_response_time_ms = int(
                (
                    time.perf_counter()
                    - start_time
                )
                * 1000
            )

            # =================================================
            # Mark the persisted user request FAILED.
            #
            # This is another independent SHORT transaction.
            # =================================================

            try:

                await (
                    self._conversation_message_service
                    .mark_user_message_failed(
                        user_message_id=(
                            pending_user_message.message_id
                        ),
                        conversation_id=conversation_id,
                        response_time_ms=(
                            failed_response_time_ms
                        ),
                    )
                )

            except Exception:

                # Very important:
                #
                # Do NOT replace/hide the original chat exception
                # if marking the message failed also fails.

                logger.exception(
                    "Failed to update conversation message "
                    "to failed status. "
                    "conversation_id=%s "
                    "message_id=%s "
                    "run_id=%s",
                    conversation_id,
                    pending_user_message.message_id,
                    context.run_id,
                )

            logger.exception(
                "Chat request failed. "
                "conversation_id=%s "
                "message_id=%s "
                "run_id=%s "
                "response_time_ms=%s",
                conversation_id,
                pending_user_message.message_id,
                context.run_id,
                failed_response_time_ms,
            )

            raise

        finally:

            # =================================================
            # ALWAYS restore ContextVar.
            # =================================================

            reset_current_llm_model(
                reset_handle
            )

    # =========================================================
    # ASSISTANT RESPONSE EXTRACTION
    # =========================================================

    @staticmethod
    def _extract_assistant_content(
        result: Any,
    ) -> str:
        """
        Extract the final assistant response from the standard
        LangChain/LangGraph create_agent() result.

        If your existing working extraction is different,
        keep your existing implementation instead.
        """

        if isinstance(result, str):
            return result

        if not isinstance(result, dict):
            raise RuntimeError(
                "Unexpected orchestrator result type."
            )

        messages = result.get("messages")

        if not messages:
            raise RuntimeError(
                "Orchestrator returned no messages."
            )

        for message in reversed(messages):

            if isinstance(message, AIMessage):

                content = message.content

                if isinstance(content, str):
                    return content

                # Some models return structured content blocks.
                if isinstance(content, list):

                    text_parts: list[str] = []

                    for item in content:

                        if isinstance(item, str):
                            text_parts.append(item)

                        elif isinstance(item, dict):

                            text = item.get("text")

                            if text:
                                text_parts.append(
                                    str(text)
                                )

                    if text_parts:
                        return "".join(text_parts)

        raise RuntimeError(
            "No assistant response was found "
            "in orchestrator result."
        )

  ((((((((((((((((((((


                     orchestrator_agent = OrchestratorAgent(
    model=context_aware_model,
    checkpointer=checkpointer,
)

await orchestrator_agent.initialize()


conversation_repository = ConversationRepository(
    database_pool=database_pool,
)

conversation_service = ConversationService(
    repository=conversation_repository,
)


conversation_message_repository = (
    ConversationMessageRepository(
        database_pool=database_pool,
    )
)

conversation_message_service = (
    ConversationMessageService(
        repository=conversation_message_repository,
    )
)


chat_service = ChatService(
    model=context_aware_model,
    orchestrator_agent=orchestrator_agent,
    conversation_service=conversation_service,
    conversation_message_service=(
        conversation_message_service
    ),
)
