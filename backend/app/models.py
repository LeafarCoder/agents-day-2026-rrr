from typing import Any
from pydantic import BaseModel


class RunRequest(BaseModel):
    latitude: float
    longitude: float
    session_id: str


class RunResponse(BaseModel):
    run_id: str


class RunStatus(BaseModel):
    id: str
    session_id: str
    status: str
    steps: list[str]
    result: Any = None
