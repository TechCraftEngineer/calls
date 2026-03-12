"""Records router for serving audio files."""

from fastapi import APIRouter, HTTPException, Path as PathParam
from fastapi.responses import FileResponse
import mimetypes
from pathlib import Path

from app.routers.utils import RECORDS_DIR

router = APIRouter()


@router.get("/records/{filename}")
async def get_record(filename: str):
    """Serve audio record file."""
    file_path = RECORDS_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="Not a file")
    
    media_type, _ = mimetypes.guess_type(str(file_path))
    return FileResponse(
        path=str(file_path),
        media_type=media_type or "application/octet-stream",
        filename=filename
    )


