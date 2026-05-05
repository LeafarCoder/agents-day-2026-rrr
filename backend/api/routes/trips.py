from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import db.writer as writer
import db.reader as reader
from api.deps import is_demo_request, get_user_email

router = APIRouter(prefix="/api/trips")


def _user_email(request: Request) -> str | None:
    return get_user_email(request)


def _user_id(user_email: str) -> str | None:
    from db.client import get as get_client
    db = get_client()
    res = db.table("users").select("id").eq("email", user_email).execute()
    return res.data[0]["id"] if res.data else None


@router.get("")
def list_trips(request: Request):
    email = _user_email(request)
    if not email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    return reader.get_trips(email)


# Literal route before /{trip_id} so FastAPI resolves it first
@router.get("/merge-candidates")
def merge_candidates(request: Request):
    email = _user_email(request)
    if not email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    return reader.get_merge_candidates(email)


@router.get("/{trip_id}/emails")
def trip_emails(trip_id: str, request: Request):
    email = _user_email(request)
    if not email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    result = reader.get_trip_emails(email, trip_id)
    if result is None:
        return JSONResponse({"error": "trip_not_found"}, status_code=404)
    return result


@router.get("/{trip_id}")
def get_trip(trip_id: str, request: Request):
    email = _user_email(request)
    if not email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)
    result = reader.get_trip_detail(email, trip_id)
    if result is None:
        return JSONResponse({"error": "trip_not_found"}, status_code=404)
    return result


class TripPatch(BaseModel):
    title: str | None = None
    start_date: date | None = None
    end_date: date | None = None


@router.patch("/{trip_id}")
def patch_trip(trip_id: str, payload: TripPatch, request: Request):
    if is_demo_request(request):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    email = request.session.get("user_email")
    if not email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    if payload.start_date and payload.end_date and payload.start_date > payload.end_date:
        return JSONResponse({"error": "start_date_after_end_date"}, status_code=400)

    uid = _user_id(email)
    if not uid:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    set_fields = getattr(payload, "model_fields_set", None) or set(payload.__fields_set__)
    ok = writer.update_trip(
        uid,
        trip_id,
        title=payload.title if "title" in set_fields else None,
        start_date=payload.start_date.isoformat() if payload.start_date else None,
        end_date=payload.end_date.isoformat() if payload.end_date else None,
    )
    if not ok:
        return JSONResponse({"error": "trip_not_found"}, status_code=404)
    return {"ok": True}


class MergePayload(BaseModel):
    trip_ids: list[str]
    keep_id: str


@router.post("/merge")
def merge_trips_route(payload: MergePayload, request: Request):
    if is_demo_request(request):
        return JSONResponse({"error": "demo_mode_read_only"}, status_code=403)
    email = request.session.get("user_email")
    if not email:
        return JSONResponse({"error": "not_authenticated"}, status_code=401)

    if len(payload.trip_ids) < 2:
        return JSONResponse({"error": "need_at_least_two_trips"}, status_code=400)
    if payload.keep_id not in payload.trip_ids:
        return JSONResponse({"error": "keep_id_not_in_trip_ids"}, status_code=400)

    uid = _user_id(email)
    if not uid:
        return JSONResponse({"error": "user_not_found"}, status_code=404)

    ok = writer.merge_trips(uid, payload.trip_ids, payload.keep_id)
    if not ok:
        return JSONResponse({"error": "invalid_trips"}, status_code=400)

    trips = reader.get_trips(email)
    surviving = next((t for t in trips if t["id"] == payload.keep_id), None)
    return surviving or {"ok": True}
