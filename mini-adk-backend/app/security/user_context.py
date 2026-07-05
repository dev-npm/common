"""Current user extraction.

For now we keep this simple and read headers from the request.
Later you can replace this with Azure AD token validation.
"""

from fastapi import Header
from pydantic import BaseModel, Field


class UserContext(BaseModel):
    user_id: str
    roles: set[str] = Field(default_factory=set)

    def has_any_role(self, allowed_roles: set[str]) -> bool:
        """Return True if the user has at least one matching role.

        Admin acts as a super-role in this starter project.
        """
        if "Admin" in self.roles:
            return True
        return bool(self.roles.intersection(allowed_roles))


async def get_user_context(
    x_user_id: str = Header(default="anonymous"),
    x_roles: str = Header(default="Viewer"),
) -> UserContext:
    """Build a UserContext from simple request headers.

    Example:
    X-User-Id: saif
    X-Roles: Viewer,Admin
    """
    roles = {role.strip() for role in x_roles.split(",") if role.strip()}
    return UserContext(user_id=x_user_id, roles=roles)
