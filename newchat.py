async def stream_message(
    self,
    message: str,
    context: RequestContext,
) -> AsyncIterator[dict[str, Any]]:
    """
    Stream one chat execution.

    IMPORTANT:

    We temporarily bypass BaseAgent.ainvoke() and call
    the already-compiled graph directly because BaseAgent
    cannot currently be changed to expose astream().

    The existing non-streaming send_message() is untouched.
    """

    # =========================================================
    # 1. CREATE / VALIDATE CONVERSATION
    # =========================================================

    conversation_id = (
        await self._conversation_service.get_or_create(
            company_user_id=context.company_user_id,
            conversation_id=context.conversation_id,
            first_message=message,
        )
    )

    # =========================================================
    # 2. SAVE USER MESSAGE AS PENDING
    #
    # This method commits before returning.
    #
    # Therefore NO DB transaction remains open while
    # the LLM is streaming.
    # =========================================================

    pending_user_message = (
        await self._conversation_message_service
        .create_pending_user_message(
            conversation_id=conversation_id,
            content=message,
        )
    )

    # =========================================================
    # 3. BUILD SAME LANGGRAPH CONFIG AS send_message()
    # =========================================================

    config = (
        self._orchestrator_agent.get_run_config()
    )

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

    # =========================================================
    # 4. BUILD INPUT
    #
    # This is the standard create_agent input shape.
    #
    # IMPORTANT:
    # If your existing send_message() already builds
    # input_messages differently, COPY THAT EXACT INPUT HERE.
    # =========================================================

    input_messages = {
        "messages": [
            HumanMessage(
                content=message
            )
        ]
    }

    # =========================================================
    # 5. SET REQUEST-SPECIFIC REAL MODEL
    # =========================================================

    reset_handle = set_current_llm_model(
        context.llm_model
    )

    start_time = time.perf_counter()

    # Used only as a fallback.
    streamed_text_parts: list[str] = []

    # Collect agent/node names seen during streaming.
    streamed_agent_flow: list[str] = []

    try:

        # =====================================================
        # 6. TELL ANGULAR WHICH CONVERSATION/RUN STARTED
        # =====================================================

        yield {
            "type": "start",
            "run_id": context.run_id,
            "conversation_id": conversation_id,
            "user_message_id": (
                pending_user_message.message_id
            ),
        }

        # =====================================================
        # 7. STREAM DIRECTLY FROM COMPILED ORCHESTRATOR GRAPH
        #
        # NOTICE:
        #
        # self._orchestrator_agent.agent
        #
        # not:
        #
        # self._orchestrator_agent.astream()
        #
        # because BaseAgent does not expose astream yet.
        # =====================================================

        async for raw_event in (
            self._orchestrator_agent.agent.astream(
                input_messages,
                config=config,
                stream_mode="messages",
                subgraphs=True,
            )
        ):

            unpacked = (
                self._unpack_message_stream_event(
                    raw_event
                )
            )

            if unpacked is None:
                continue

            message_chunk, metadata = unpacked

            # We only want AI-generated chunks.
            if not isinstance(
                message_chunk,
                AIMessageChunk,
            ):
                continue

            # ---------------------------------------------
            # Track which agent/node produced the chunk.
            # ---------------------------------------------

            agent_name = (
                metadata.get("lc_agent_name")
                or metadata.get("langgraph_node")
            )

            if (
                agent_name
                and agent_name
                not in streamed_agent_flow
            ):
                streamed_agent_flow.append(
                    str(agent_name)
                )

            # ---------------------------------------------
            # Extract textual content.
            # Ignore tool-call-only chunks, empty chunks,
            # metadata-only chunks, etc.
            # ---------------------------------------------

            text = self._extract_content_text(
                message_chunk.content
            )

            if not text:
                continue

            streamed_text_parts.append(text)

            # ---------------------------------------------
            # Send token/chunk to FastAPI -> Angular.
            # ---------------------------------------------

            yield {
                "type": "token",
                "text": text,
                "agent": agent_name,
            }

        # =====================================================
        # 8. STREAM COMPLETED SUCCESSFULLY
        # =====================================================

        response_time_ms = int(
            (
                time.perf_counter()
                - start_time
            )
            * 1000
        )

        # =====================================================
        # 9. READ FINAL GRAPH STATE
        #
        # This does NOT call the LLM again.
        #
        # It gives us the final completed assistant message
        # instead of relying entirely on concatenating every
        # streamed chunk from every agent.
        # =====================================================

        final_answer, final_agent_flow = (
            await self._get_final_stream_result(
                config=config,
                fallback_answer="".join(
                    streamed_text_parts
                ),
                fallback_agent_flow=(
                    streamed_agent_flow
                ),
            )
        )

        if not final_answer:
            raise RuntimeError(
                "Streaming completed but no final "
                "assistant answer was found."
            )

        # =====================================================
        # 10. COMPLETE MESSAGE EXCHANGE
        #
        # SHORT transaction:
        #
        # user pending -> completed
        # INSERT assistant
        # response_time_ms -> assistant
        #
        # COMMIT
        # =====================================================

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
                assistant_content=final_answer,
                response_time_ms=response_time_ms,
            )
        )

        logger.info(
            "Streaming chat completed. "
            "conversation_id=%s "
            "run_id=%s "
            "user_message_id=%s "
            "assistant_message_id=%s "
            "response_time_ms=%s",
            conversation_id,
            context.run_id,
            pending_user_message.message_id,
            assistant_message.message_id,
            response_time_ms,
        )

        # =====================================================
        # 11. FINAL STREAM EVENT
        #
        # This is equivalent to your normal ChatResponse:
        #
        # run_id
        # agent_flow
        # answer
        # conversation_id
        #
        # plus persistence/timing information.
        # =====================================================

        yield {
            "type": "done",
            "run_id": context.run_id,
            "conversation_id": conversation_id,
            "agent_flow": final_agent_flow,
            "answer": final_answer,
            "assistant_message_id": (
                assistant_message.message_id
            ),
            "response_time_ms": response_time_ms,
        }

    # =========================================================
    # CLIENT DISCONNECTED / CANCELLED STREAM
    # =========================================================

    except asyncio.CancelledError:

        failed_response_time_ms = int(
            (
                time.perf_counter()
                - start_time
            )
            * 1000
        )

        await self._try_mark_stream_failed(
            user_message_id=(
                pending_user_message.message_id
            ),
            conversation_id=conversation_id,
            response_time_ms=(
                failed_response_time_ms
            ),
            run_id=context.run_id,
        )

        logger.warning(
            "Streaming chat cancelled. "
            "conversation_id=%s "
            "run_id=%s "
            "message_id=%s",
            conversation_id,
            context.run_id,
            pending_user_message.message_id,
        )

        # Cancellation must continue upward so FastAPI
        # can stop the stream properly.
        raise

    # =========================================================
    # NORMAL FAILURE
    # =========================================================

    except Exception:

        failed_response_time_ms = int(
            (
                time.perf_counter()
                - start_time
            )
            * 1000
        )

        await self._try_mark_stream_failed(
            user_message_id=(
                pending_user_message.message_id
            ),
            conversation_id=conversation_id,
            response_time_ms=(
                failed_response_time_ms
            ),
            run_id=context.run_id,
        )

        logger.exception(
            "Streaming chat failed. "
            "conversation_id=%s "
            "run_id=%s "
            "message_id=%s "
            "response_time_ms=%s",
            conversation_id,
            context.run_id,
            pending_user_message.message_id,
            failed_response_time_ms,
        )

        # Since streaming HTTP headers may already have
        # been sent, we communicate the failure as a
        # stream event.
        yield {
            "type": "error",
            "run_id": context.run_id,
            "conversation_id": conversation_id,
            "message": (
                "Unable to complete the chat response."
            ),
        }

    finally:

        # =====================================================
        # ALWAYS REMOVE REQUEST-SPECIFIC MODEL
        # =====================================================

        reset_current_llm_model(
            reset_handle
        )







&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&
ChatService
@staticmethod
def _unpack_message_stream_event(
    raw_event: Any,
) -> tuple[Any, dict[str, Any]] | None:
    """
    Supports the common LangGraph message stream shapes.

    Normal:
        (AIMessageChunk, metadata)

    With subgraphs=True:
        (namespace, (AIMessageChunk, metadata))

    Also handles newer StreamPart-style dictionaries.
    """

    # ---------------------------------------------------------
    # Newer StreamPart dictionary shape
    # ---------------------------------------------------------

    if isinstance(raw_event, dict):

        if raw_event.get("type") != "messages":
            return None

        data = raw_event.get("data")

        if (
            isinstance(data, tuple)
            and len(data) == 2
        ):
            message_chunk, metadata = data

            if isinstance(metadata, dict):
                return message_chunk, metadata

        return None

    # ---------------------------------------------------------
    # Tuple shapes
    # ---------------------------------------------------------

    if not isinstance(
        raw_event,
        tuple,
    ):
        return None

    if len(raw_event) != 2:
        return None

    first, second = raw_event

    # ---------------------------------------------------------
    # Shape:
    #
    # (message_chunk, metadata)
    # ---------------------------------------------------------

    if isinstance(second, dict):
        return first, second

    # ---------------------------------------------------------
    # Shape with subgraph namespace:
    #
    # (
    #     namespace,
    #     (message_chunk, metadata)
    # )
    # ---------------------------------------------------------

    if (
        isinstance(second, tuple)
        and len(second) == 2
    ):

        message_chunk, metadata = second

        if isinstance(metadata, dict):
            return message_chunk, metadata

    return None


@staticmethod
def _extract_content_text(
    content: Any,
) -> str:

    if isinstance(content, str):
        return content

    if not isinstance(content, list):
        return ""

    text_parts: list[str] = []

    for item in content:

        if isinstance(item, str):

            text_parts.append(item)

            continue

        if isinstance(item, dict):

            text = item.get("text")

            if isinstance(text, str):
                text_parts.append(text)

    return "".join(text_parts)


async def _get_final_stream_result(
    self,
    config: dict[str, Any],
    fallback_answer: str,
    fallback_agent_flow: list[str],
) -> tuple[str, list[str]]:
    """
    Read final graph state after the stream finishes.

    This does not invoke the LLM again.
    """

    try:

        state = await (
            self._orchestrator_agent.agent.aget_state(
                config
            )
        )

        values = getattr(
            state,
            "values",
            None,
        )

        if not isinstance(values, dict):
            return (
                fallback_answer,
                fallback_agent_flow,
            )

        # -----------------------------------------------------
        # Agent flow
        # -----------------------------------------------------

        agent_flow = values.get(
            "agent_flow"
        )

        if not isinstance(
            agent_flow,
            list,
        ):
            agent_flow = (
                fallback_agent_flow
            )

        # -----------------------------------------------------
        # Final assistant answer
        # -----------------------------------------------------

        messages = values.get(
            "messages",
            [],
        )

        if isinstance(messages, list):

            for item in reversed(messages):

                if isinstance(
                    item,
                    AIMessage,
                ):

                    answer = (
                        self._extract_content_text(
                            item.content
                        )
                    )

                    if answer:
                        return (
                            answer,
                            agent_flow,
                        )

        return (
            fallback_answer,
            agent_flow,
        )

    except Exception:

        logger.exception(
            "Unable to read final graph state "
            "after streaming."
        )

        return (
            fallback_answer,
            fallback_agent_flow,
        )



async def _try_mark_stream_failed(
    self,
    user_message_id: int,
    conversation_id: str,
    response_time_ms: int,
    run_id: str,
) -> None:

    try:

        await (
            self._conversation_message_service
            .mark_user_message_failed(
                user_message_id=(
                    user_message_id
                ),
                conversation_id=(
                    conversation_id
                ),
                response_time_ms=(
                    response_time_ms
                ),
            )
        )

    except Exception:

        # Never hide the original streaming error.

        logger.exception(
            "Unable to mark streaming message "
            "as failed. "
            "conversation_id=%s "
            "message_id=%s "
            "run_id=%s",
            conversation_id,
            user_message_id,
            run_id,
        )



ggggggggg
@router.post("/stream")
async def stream_chat(
    chat_request: ChatRequest,
    request: Request,
    context: RequestContext = Depends(
        get_request_context
    ),
):
    """
    Stream chat response using Server-Sent Event format
    over a normal POST StreamingResponse.
    """

    # ---------------------------------------------------------
    # Same behavior as your existing /chat endpoint:
    # put Angular's conversation_id into immutable context.
    # ---------------------------------------------------------

    context = replace(
        context,
        conversation_id=(
            chat_request.conversation_id
        ),
    )

    runtime = request.app.state.runtime

    chat_service = runtime.chat_service

    async def event_generator():

        async for event in (
            chat_service.stream_message(
                message=chat_request.message,
                context=context,
            )
        ):

            event_type = event.get(
                "type",
                "message",
            )

            payload = json.dumps(
                event,
                ensure_ascii=False,
                default=str,
            )

            # Standard SSE format:
            #
            # event: token
            # data: {"text":"hello"}
            #
            # blank line terminates the event.
            yield (
                f"event: {event_type}\n"
                f"data: {payload}\n\n"
            )

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
