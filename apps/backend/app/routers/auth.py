"""Authentication routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie
from typing import Optional
from app.models.schemas import LoginRequest, LoginResponse, UserResponse
from app.services.storage import SQLiteStorage
from app.dependencies import get_storage, get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    response: Response,
    storage: SQLiteStorage = Depends(get_storage),
):
    """Login endpoint."""
    username = login_data.username.strip()
    password = login_data.password.strip()
    
    logger.info(f"Login attempt for username: {username}")

    try:
        if storage.verify_password(username, password):
            user = storage.get_user_by_username(username)
            if not user:
                logger.warning(f"User {username} not found after password verification")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials",
                )

            # Set session cookie (simple approach - in production use proper session management)
            # For now, we'll use username as session identifier
            response.set_cookie(
                key="session",
                value=username,
                httponly=True,
                samesite="lax",
                secure=True,  # Required for HTTPS
                path="/",  # Available for all paths
                max_age=86400 * 7,  # 7 days
            )
            logger.info(f"Cookie set for user: {username}, secure=True, path=/")
            
            storage.add_activity_log("info", f"User logged in: {username}", username)
            logger.info(f"Successful login for user: {username} (ID: {user['id']})")

            return LoginResponse(
                success=True,
                message="Login successful",
                user={
                    "id": user["id"],
                    "username": user["username"],
                    "name": user["name"],
                    "first_name": user.get("first_name", ""),
                    "last_name": user.get("last_name", ""),
                },
            )
        else:
            logger.warning(f"Failed login attempt for username: {username} - invalid password")
            storage.add_activity_log("warning", f"Failed login attempt: {username}", "system")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login for {username}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error during login",
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
    )


@router.post("/logout")
async def logout(response: Response):
    """Logout endpoint."""
    response.delete_cookie(key="session")
    return {"success": True, "message": "Logged out"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict = Depends(get_current_user),
):
    """Get current user information."""
    return current_user

