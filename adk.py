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
