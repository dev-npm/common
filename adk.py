app/api/routes/conversation_routes.py

from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.dependencies.auth_dependency import get_current_user
from app.models.conversation_models import ConversationListItem
from app.security.authenticated_user import AuthenticatedUser


router = APIRouter(
    prefix="/api/conversations",
    tags=["Conversations"],
)


@router.get(
    "",
    response_model=list[ConversationListItem],
)
async def get_conversations(
    request: Request,

    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
) -> list[ConversationListItem]:

    runtime = request.app.state.runtime

    conversations = (
        await runtime.conversation_service.list_conversations(
            company_user_id=user.company_user_id
        )
    )

    return [
        ConversationListItem(
            conversation_id=conversation.conversation_id,
            title=conversation.title,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
        )
        for conversation in conversations
    ]
^^^^^^^^^^^^^^

async def list_conversations(
    self,
    company_user_id: str,
) -> list[Conversation]:

    return await self._repository.list_for_user(
        company_user_id=company_user_id
    )
app/services/conversation_service.py

@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
async def list_for_user(
    self,
    company_user_id: str,
) -> list[Conversation]:

    sql = """
        SELECT
            conversation_id,
            company_user_id,
            title,
            created_at,
            updated_at
        FROM user_conversation
        WHERE company_user_id = %s
        ORDER BY updated_at DESC;
    """

    async with self._pool.connection() as connection:

        async with connection.cursor() as cursor:

            await cursor.execute(
                sql,
                (company_user_id,),
            )

            rows = await cursor.fetchall()

    return [
        Conversation(
            conversation_id=str(
                row["conversation_id"]
            ),
            company_user_id=row["company_user_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]














&&&&&&&&&&&*****************&&&&&&&&&&&&&&&&&&&&&&**************
^^^^^^^^^^^^^^^^^^^^&&&&&&&&&&&&&&&&&*************(((((((((((((((^^^^^^^^^^^%%%%%%%%%%%%%%%^&&&&&&&&&&&
                                                                $$$$$$$$$$$$$$$$$$$
                                        
import asyncio
import selectors

import uvicorn


def create_selector_loop():
    """
    Create the Windows SelectorEventLoop required
    by async Psycopg.
    """

    return asyncio.SelectorEventLoop(
        selectors.SelectSelector()
    )


async def main() -> None:

    config = uvicorn.Config(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
    )

    server = uvicorn.Server(config)

    # IMPORTANT:
    # We call serve(), NOT uvicorn.run().
    #
    # This lets our outer asyncio.run()
    # own the event loop.
    await server.serve()


if __name__ == "__main__":

    asyncio.run(
        main(),
        loop_factory=create_selector_loop,
    )

import logging

from psycopg_pool import AsyncConnectionPool

from app.models.conversation_models import Conversation


logger = logging.getLogger(__name__)


class ConversationRepository:

    def __init__(
        self,
        pool: AsyncConnectionPool,
    ):
        self._pool = pool

    async def create(
        self,
        conversation_id: str,
        user_id: str,
        title: str | None,
    ) -> Conversation:

        sql = """
            INSERT INTO conversation
            (
                conversation_id,
                user_id,
                title
            )
            VALUES
            (
                %s,
                %s,
                %s
            )
            RETURNING
                conversation_id,
                user_id,
                title,
                created_at,
                updated_at;
        """

        async with self._pool.connection() as connection:

            async with connection.cursor() as cursor:

                await cursor.execute(
                    sql,
                    (
                        conversation_id,
                        user_id,
                        title,
                    ),
                )

                row = await cursor.fetchone()

        if row is None:
            raise RuntimeError(
                "Conversation could not be created."
            )

        logger.info(
            "Conversation created "
            "conversation_id=%s user_id=%s",
            conversation_id,
            user_id,
        )

        return Conversation(
            conversation_id=str(
                row["conversation_id"]
            ),
            user_id=row["user_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def get_for_user(
        self,
        conversation_id: str,
        user_id: str,
    ) -> Conversation | None:

        sql = """
            SELECT
                conversation_id,
                user_id,
                title,
                created_at,
                updated_at
            FROM conversation
            WHERE conversation_id = %s
              AND user_id = %s;
        """

        async with self._pool.connection() as connection:

            async with connection.cursor() as cursor:

                await cursor.execute(
                    sql,
                    (
                        conversation_id,
                        user_id,
                    ),
                )

                row = await cursor.fetchone()

        if row is None:
            return None

        return Conversation(
            conversation_id=str(
                row["conversation_id"]
            ),
            user_id=row["user_id"],
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    async def touch(
        self,
        conversation_id: str,
        user_id: str,
    ) -> None:

        sql = """
            UPDATE conversation
            SET updated_at = NOW()
            WHERE conversation_id = %s
              AND user_id = %s;
        """

        async with self._pool.connection() as connection:

            async with connection.cursor() as cursor:

                await cursor.execute(
                    sql,
                    (
                        conversation_id,
                        user_id,
                    ),
                )

***********************************(((((((((((((((((((((((
import logging

from uuid import uuid4

from app.repositories.conversation_repository import (
    ConversationRepository,
)


logger = logging.getLogger(__name__)


class ConversationNotFoundError(Exception):
    pass


class ConversationService:

    def __init__(
        self,
        repository: ConversationRepository,
    ):
        self._repository = repository

    async def get_or_create(
        self,
        user_id: str,
        conversation_id: str | None,
        first_message: str,
    ) -> str:

        # -----------------------------------------
        # Existing conversation
        # -----------------------------------------

        if conversation_id:

            conversation = (
                await self._repository.get_for_user(
                    conversation_id=conversation_id,
                    user_id=user_id,
                )
            )

            if conversation is None:

                raise ConversationNotFoundError(
                    "Conversation does not exist "
                    "or does not belong to this user."
                )

            await self._repository.touch(
                conversation_id=conversation_id,
                user_id=user_id,
            )

            return conversation_id

        # -----------------------------------------
        # New conversation
        # -----------------------------------------

        new_conversation_id = str(uuid4())

        # Temporary title.
        # Later we can let the LLM generate the title.
        title = self._create_title(
            first_message
        )

        await self._repository.create(
            conversation_id=new_conversation_id,
            user_id=user_id,
            title=title,
        )

        return new_conversation_id

    @staticmethod
    def _create_title(
        message: str,
    ) -> str:

        message = message.strip()

        if len(message) <= 80:
            return message

        return message[:77] + "..."



**********************************************************
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.security.models import IncomingAccessToken


bearer_scheme = HTTPBearer(
    auto_error=False
)


async def get_incoming_access_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> IncomingAccessToken:

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication is required.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return IncomingAccessToken(
        value=credentials.credentials
    )
******************

import os

from dotenv import load_dotenv


# Load values from the .env file into environment variables.
load_dotenv()


class Settings:
    """
    Application configuration.

    Settings are loaded once when this module is imported.
    Required settings cause application startup to fail
    if they are missing.
    """

    def __init__(self):

        # ---------------------------------------------------------
        # Microsoft Entra / App Registration A
        #
        # App Registration A is currently shared by:
        #   - Angular
        #   - FastAPI
        #
        # Angular obtains Token A.
        # FastAPI validates Token A.
        # ---------------------------------------------------------

        self.azure_tenant_id = self._require(
            "AZURE_TENANT_ID"
        )

        self.azure_api_client_id = self._require(
            "AZURE_API_CLIENT_ID"
        )

        self.azure_required_scope = self._require(
            "AZURE_REQUIRED_SCOPE"
        )

    @staticmethod
    def _require(name: str) -> str:
        """
        Read a required environment variable.

        If the value does not exist or is empty,
        fail immediately instead of allowing the
        application to run with invalid configuration.
        """

        value = os.getenv(name)

        if not value:
            raise RuntimeError(
                f"Required environment variable "
                f"'{name}' is not configured."
            )

        return value


# Create one Settings object for the running application.
settings = Settings()
**********************

from dataclasses import dataclass, field


@dataclass(frozen=True)
class IncomingAccessToken:
    value: str = field(
        repr=False,
        compare=False,
    )


@dataclass(frozen=True)
class AuthenticatedUser:
    user_id: str
    tenant_id: str
    object_id: str
    name: str | None
    preferred_username: str | None
    scopes: frozenset[str]

    access_token: str = field(
        repr=False,
        compare=False,
    )

********************
import jwt

from fastapi.concurrency import run_in_threadpool
from jwt import PyJWKClient
from jwt.exceptions import (
    InvalidTokenError,
    PyJWKClientError,
)

from app.security.models import (
    AuthenticatedUser,
    IncomingAccessToken,
)


class TokenValidationError(Exception):
    pass


class InsufficientScopeError(Exception):
    pass


class EntraTokenValidator:

    def __init__(
        self,
        tenant_id: str,
        audience: str,
        required_scope: str,
    ):
        self._tenant_id = tenant_id
        self._audience = audience
        self._required_scope = required_scope

        self._issuer = (
            "https://login.microsoftonline.com/"
            f"{tenant_id}/v2.0"
        )

        jwks_url = (
            "https://login.microsoftonline.com/"
            f"{tenant_id}/discovery/v2.0/keys"
        )

        self._jwks_client = PyJWKClient(
            jwks_url
        )

    async def validate(
        self,
        token: IncomingAccessToken,
    ) -> AuthenticatedUser:

        try:
            signing_key = await run_in_threadpool(
                self._jwks_client.get_signing_key_from_jwt,
                token.value,
            )

            claims = jwt.decode(
                token.value,
                signing_key.key,
                algorithms=["RS256"],
                audience=self._audience,
                issuer=self._issuer,
                options={
                    "require": [
                        "exp",
                        "iss",
                        "aud",
                        "tid",
                        "oid",
                    ]
                },
            )

        except (
            InvalidTokenError,
            PyJWKClientError,
        ) as exception:

            raise TokenValidationError(
                "Access token validation failed."
            ) from exception

        token_tenant_id = claims["tid"]

        if token_tenant_id != self._tenant_id:
            raise TokenValidationError(
                "Access token tenant is invalid."
            )

        scopes = frozenset(
            claims.get(
                "scp",
                ""
            ).split()
        )

        if self._required_scope not in scopes:
            raise InsufficientScopeError(
                "Required API scope is missing."
            )

        object_id = claims["oid"]

        user_id = (
            f"{token_tenant_id}:{object_id}"
        )

        return AuthenticatedUser(
            user_id=user_id,
            tenant_id=token_tenant_id,
            object_id=object_id,
            name=claims.get("name"),
            preferred_username=claims.get(
                "preferred_username"
            ),
            scopes=scopes,
            access_token=token.value,
        )

        *************

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.security.token_validator import (
    EntraTokenValidator,
)


@dataclass(frozen=True)
class ApplicationRuntime:
    instance_id: str
    started_at: datetime
    token_validator: EntraTokenValidator

    @classmethod
    def create(
        cls,
        token_validator: EntraTokenValidator,
    ) -> "ApplicationRuntime":

        return cls(
            instance_id=str(uuid4()),
            started_at=datetime.now(
                timezone.utc
            ),
            token_validator=token_validator,
        )

*************

from app.core.config import settings

from app.security.token_validator import (
    EntraTokenValidator,
)
logger.info(
    "Creating Entra token validator"
)

token_validator = EntraTokenValidator(
    tenant_id=settings.azure_tenant_id,
    audience=settings.azure_api_client_id,
    required_scope=settings.azure_required_scope,
)

runtime = ApplicationRuntime.create(
    token_validator=token_validator
)

*******************

import logging

from typing import Annotated

from fastapi import (
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from app.runtime.application_runtime import (
    ApplicationRuntime,
)
from app.security.models import (
    AuthenticatedUser,
    IncomingAccessToken,
)
from app.security.token_validator import (
    InsufficientScopeError,
    TokenValidationError,
)


logger = logging.getLogger(__name__)


bearer_scheme = HTTPBearer(
    auto_error=False
)


async def get_incoming_access_token(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
) -> IncomingAccessToken:

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer authentication is required.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    return IncomingAccessToken(
        value=credentials.credentials
    )


async def get_current_user(
    request: Request,

    token: Annotated[
        IncomingAccessToken,
        Depends(get_incoming_access_token),
    ],

) -> AuthenticatedUser:

    runtime: ApplicationRuntime = (
        request.app.state.runtime
    )

    try:
        user = await runtime.token_validator.validate(
            token
        )

        logger.info(
            "Access token validated "
            "user_id=%s",
            user.user_id,
        )

        return user

    except InsufficientScopeError:

        logger.warning(
            "Access denied: required scope missing"
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You do not have permission "
                "to access this API."
            ),
        )

    except TokenValidationError:

        logger.warning(
            "Access token validation failed"
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="The access token is invalid.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

************
from typing import Annotated

from fastapi import APIRouter, Depends

from app.dependencies.security import (
    get_current_user,
)
from app.security.models import (
    AuthenticatedUser,
)


router = APIRouter(
    prefix="/debug/auth",
    tags=["Authentication Debug"],
)


@router.get("/me")
async def get_me(
    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
):

    return {
        "user_id": user.user_id,
        "tenant_id": user.tenant_id,
        "object_id": user.object_id,
        "name": user.name,
        "preferred_username": (
            user.preferred_username
        ),
        "scopes": sorted(
            user.scopes
        ),
    }
**************************************

import logging

from azure.core.exceptions import AzureError
from azure.identity import CredentialUnavailableError
from azure.identity.aio import OnBehalfOfCredential

from app.security.models import (
    AuthenticatedUser,
    DownstreamAccessToken,
)


logger = logging.getLogger(__name__)


class OboTokenExchangeError(Exception):
    """
    Raised when FastAPI cannot exchange the incoming
    user access token for a downstream access token.
    """

    pass


class OboTokenService:
    """
    Exchanges the validated Token A received by FastAPI
    for Token B using the Microsoft Entra OBO flow.

    This service contains only shared/static configuration.

    It NEVER stores a user's access token on self.
    """

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        downstream_scope: str,
    ):
        self._tenant_id = tenant_id
        self._client_id = client_id
        self._client_secret = client_secret
        self._downstream_scope = downstream_scope

    async def get_downstream_token(
        self,
        user: AuthenticatedUser,
    ) -> DownstreamAccessToken:

        credential = OnBehalfOfCredential(
            tenant_id=self._tenant_id,
            client_id=self._client_id,
            client_secret=self._client_secret,

            # Token A
            user_assertion=user.access_token,
        )

        try:

            logger.info(
                "OBO token exchange started "
                "user_id=%s",
                user.user_id,
            )

            access_token = await credential.get_token(
                self._downstream_scope
            )

            logger.info(
                "OBO token exchange completed "
                "user_id=%s expires_on=%s",
                user.user_id,
                access_token.expires_on,
            )

            return DownstreamAccessToken(
                value=access_token.token,
                expires_on=access_token.expires_on,
            )

        except (
            AzureError,
            CredentialUnavailableError,
        ) as exception:

            logger.exception(
                "OBO token exchange failed "
                "user_id=%s",
                user.user_id,
            )

            raise OboTokenExchangeError(
                "Unable to acquire downstream access token."
            ) from exception

        finally:

            await credential.close()
**************************'
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from app.dependencies.security import (
    get_current_user,
)
from app.security.models import (
    AuthenticatedUser,
)
from app.security.obo_token_service import (
    OboTokenExchangeError,
)


router = APIRouter(
    prefix="/debug/auth",
    tags=["Authentication Debug"],
)


@router.get("/obo")
async def test_obo(
    request: Request,

    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
):

    runtime = request.app.state.runtime

    try:

        downstream_token = (
            await runtime.obo_token_service
            .get_downstream_token(user)
        )

        return {
            "obo_success": True,
            "expires_on": (
                downstream_token.expires_on
            ),
        }

    except OboTokenExchangeError:

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Unable to acquire downstream "
                "LLM access token."
            ),
        )
***********************
@router.get("/model")
async def test_model_creation(
    request: Request,

    user: Annotated[
        AuthenticatedUser,
        Depends(get_current_user),
    ],
):

    try:
        downstream_token = (
            await request.app.state.runtime
            .obo_token_service
            .get_downstream_token(user)
        )

        model = (
            request.app.state.runtime
            .model_factory
            .create(downstream_token)
        )

        return {
            "model_created": True,
            "model_type": type(model).__name__,
        }

    except OboTokenExchangeError:

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "Unable to acquire downstream "
                "LLM access token."
            ),
        )
***********************************8

import logging

from langchain_core.messages import HumanMessage

from app.models.chat_models import ChatResponse
from app.orchestration.request_context import RequestContext


logger = logging.getLogger(__name__)


class ChatService:
    """
    Application service responsible for executing
    one user chat request.

    For the current step, it invokes the BaseChatModel
    directly.

    Later, this direct model call will be replaced with
    the Main Agent Workflow.
    """

    async def send_message(
        self,
        message: str,
        context: RequestContext,
    ) -> ChatResponse:

        logger.info(
            "Chat execution started "
            "instance_id=%s user_id=%s run_id=%s",
            context.application_instance_id,
            context.user_id,
            context.run_id,
        )

        try:
            ai_message = await context.llm_model.ainvoke(
                [
                    HumanMessage(
                        content=message
                    )
                ]
            )

            if isinstance(ai_message.content, str):
                response_text = ai_message.content
            else:
                response_text = str(
                    ai_message.content
                )

            logger.info(
                "Chat execution completed "
                "instance_id=%s user_id=%s run_id=%s",
                context.application_instance_id,
                context.user_id,
                context.run_id,
            )

            return ChatResponse(
                run_id=context.run_id,
                response=response_text,
            )

        except Exception:
            logger.exception(
                "Chat execution failed "
                "instance_id=%s user_id=%s run_id=%s",
                context.application_instance_id,
                context.user_id,
                context.run_id,
            )

            raise
            *********************

from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import uuid4

from app.llm.corporate_model_factory import (
    CorporateModelFactory,
)
from app.security.obo_token_service import (
    OboTokenService,
)
from app.security.token_validator import (
    EntraTokenValidator,
)
from app.services.chat_service import (
    ChatService,
)


@dataclass(frozen=True)
class ApplicationRuntime:
    """
    Shared application-level services.

    One ApplicationRuntime exists for the lifetime
    of one FastAPI application process/pod.
    """

    instance_id: str

    started_at: datetime

    token_validator: EntraTokenValidator

    obo_token_service: OboTokenService

    model_factory: CorporateModelFactory

    chat_service: ChatService

    @classmethod
    def create(
        cls,
        token_validator: EntraTokenValidator,
        obo_token_service: OboTokenService,
        model_factory: CorporateModelFactory,
        chat_service: ChatService,
    ) -> "ApplicationRuntime":

        return cls(
            instance_id=str(uuid4()),
            started_at=datetime.now(
                timezone.utc
            ),
            token_validator=token_validator,
            obo_token_service=obo_token_service,
            model_factory=model_factory,
            chat_service=chat_service,
        )
        ((((((((((import logging

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from app.dependencies.request_context import (
    get_request_context,
)
from app.models.chat_models import (
    ChatRequest,
    ChatResponse,
)
from app.orchestration.request_context import (
    RequestContext,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


@router.post(
    "",
    response_model=ChatResponse,
)
async def send_message(
    chat_request: ChatRequest,

    request: Request,

    context: Annotated[
        RequestContext,
        Depends(get_request_context),
    ],
) -> ChatResponse:

    try:
        runtime = request.app.state.runtime

        return await runtime.chat_service.send_message(
            message=chat_request.message,
            context=context,
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Chat API request failed "
            "instance_id=%s user_id=%s run_id=%s",
            context.application_instance_id,
            context.user_id,
            context.run_id,
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to process chat request.",
        )

        ********************

        import logging

from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)

from app.dependencies.request_context import (
    get_request_context,
)
from app.models.chat_models import (
    ChatRequest,
    ChatResponse,
)
from app.orchestration.request_context import (
    RequestContext,
)


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


@router.post(
    "",
    response_model=ChatResponse,
)
async def send_message(
    chat_request: ChatRequest,

    request: Request,

    context: Annotated[
        RequestContext,
        Depends(get_request_context),
    ],
) -> ChatResponse:

    try:
        runtime = request.app.state.runtime

        return await runtime.chat_service.send_message(
            message=chat_request.message,
            context=context,
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception(
            "Chat API request failed "
            "instance_id=%s user_id=%s run_id=%s",
            context.application_instance_id,
            context.user_id,
            context.run_id,
        )
*************&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

from contextvars import ContextVar, Token

from langchain_core.language_models.chat_models import BaseChatModel


_current_llm_model: ContextVar[
    BaseChatModel | None
] = ContextVar(
    "current_llm_model",
    default=None,
)


def set_current_llm_model(
    model: BaseChatModel,
) -> Token:
    """
    Set the real user-specific model for
    the current async execution.
    """

    return _current_llm_model.set(model)


def get_current_llm_model() -> BaseChatModel:
    """
    Get the real model for the current execution.
    """

    model = _current_llm_model.get()

    if model is None:
        raise RuntimeError(
            "No runtime LLM model is available "
            "for the current execution."
        )

    return model


def reset_current_llm_model(
    token: Token,
) -> None:
    """
    Restore the previous ContextVar value.
    """

    _current_llm_model.reset(token)
      
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to process chat request.",
        )
********************************************
        from typing import Any

from langchain_core.language_models.chat_models import (
    BaseChatModel,
)
from langchain_core.messages import BaseMessage
from langchain_core.outputs import (
    ChatGeneration,
    ChatResult,
)

from app.llm.model_context import (
    get_current_llm_model,
)


class ContextAwareChatModel(BaseChatModel):
    """
    Shared chat model used by the application.

    It does not own an Azure token and does not own
    a user-specific model.

    When invoked, it looks up the real BaseChatModel
    belonging to the current request and delegates
    the LLM call to that model.
    """

    @property
    def _llm_type(self) -> str:
        return "context-aware-chat-model"

    def _get_runtime_model(
        self,
    ) -> BaseChatModel:

        model = get_current_llm_model()

        if model is self:
            raise RuntimeError(
                "ContextAwareChatModel cannot "
                "delegate to itself."
            )

        return model

    def _generate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:

        runtime_model = (
            self._get_runtime_model()
        )

        response = runtime_model.invoke(
            messages,
            stop=stop,
            **kwargs,
        )

        return ChatResult(
            generations=[
                ChatGeneration(
                    message=response
                )
            ]
        )

    async def _agenerate(
        self,
        messages: list[BaseMessage],
        stop: list[str] | None = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:

        runtime_model = (
            self._get_runtime_model()
        )

        response = await runtime_model.ainvoke(
            messages,
            stop=stop,
            **kwargs,
        )

        return ChatResult(
            generations=[
                ChatGeneration(
                    message=response
                )
            ]
        )

        ********************

        class CorporateModelFactory:

    def create(
        self,
        token: DownstreamAccessToken,
    ) -> BaseChatModel:
        """
        Your EXISTING working code.

        Token B -> real model
        """
        ...

    def create_context_aware_model(
        self,
    ) -> BaseChatModel:
        """
        Shared proxy model.
        No Token B required.
        """

        return ContextAwareChatModel()
        ************************8

        import logging

from langchain_core.language_models.chat_models import (
    BaseChatModel,
)
from langchain_core.messages import HumanMessage

from app.llm.model_context import (
    reset_current_llm_model,
    set_current_llm_model,
)
from app.models.chat_models import ChatResponse
from app.orchestration.request_context import (
    RequestContext,
)


logger = logging.getLogger(__name__)


class ChatService:

    def __init__(
        self,
        model: BaseChatModel,
    ):
        self._model = model

    async def send_message(
        self,
        message: str,
        context: RequestContext,
    ) -> ChatResponse:

        logger.info(
            "Chat execution started "
            "instance_id=%s user_id=%s run_id=%s",
            context.application_instance_id,
            context.user_id,
            context.run_id,
        )

        context_token = (
            set_current_llm_model(
                context.llm_model
            )
        )

        try:

            ai_message = await self._model.ainvoke(
                [
                    HumanMessage(
                        content=message
                    )
                ]
            )

            if isinstance(
                ai_message.content,
                str,
            ):
                response_text = (
                    ai_message.content
                )
            else:
                response_text = str(
                    ai_message.content
                )

            logger.info(
                "Chat execution completed "
                "instance_id=%s user_id=%s run_id=%s",
                context.application_instance_id,
                context.user_id,
                context.run_id,
            )

            return ChatResponse(
                run_id=context.run_id,
                response=response_text,
            )

        except Exception:

            logger.exception(
                "Chat execution failed "
                "instance_id=%s user_id=%s run_id=%s",
                context.application_instance_id,
                context.user_id,
                context.run_id,
            )

            raise

        finally:

            reset_current_llm_model(
                context_token
            )
&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&

        from contextvars import ContextVar, Token

from langchain_core.language_models.chat_models import BaseChatModel


_current_llm_model: ContextVar[
    BaseChatModel | None
] = ContextVar(
    "current_llm_model",
    default=None,
)


def set_current_llm_model(
    model: BaseChatModel,
) -> Token:

    return _current_llm_model.set(model)


def get_current_llm_model() -> BaseChatModel:

    model = _current_llm_model.get()

    if model is None:
        raise RuntimeError(
            "No runtime LLM model is available."
        )

    return model


def reset_current_llm_model(
    reset_handle: Token,
) -> None:

    _current_llm_model.reset(
        reset_handle
    )
