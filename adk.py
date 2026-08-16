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
