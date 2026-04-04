"""Schedule management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..database import get_db
from ..models import ScheduleCreate, ScheduleResponse

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@router.get("/", response_model=list[ScheduleResponse])
async def list_schedules():
    """Return all schedules."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM schedules ORDER BY created_at DESC",
        )

    return [
        ScheduleResponse(**{**dict(r), "is_active": bool(r["is_active"])})
        for r in rows
    ]


@router.post("/", response_model=ScheduleResponse, status_code=201)
async def create_schedule(body: ScheduleCreate):
    """Create a new schedule."""
    async with get_db() as db:
        cursor = await db.execute(
            "INSERT INTO schedules (name, cron_expr, niche, action) "
            "VALUES (?, ?, ?, ?)",
            [body.name, body.cron_expr, body.niche, body.action],
        )
        await db.commit()
        schedule_id = cursor.lastrowid

        rows = await db.execute_fetchall(
            "SELECT * FROM schedules WHERE id = ?", [schedule_id],
        )

    row = rows[0]
    return ScheduleResponse(**{**dict(row), "is_active": bool(row["is_active"])})


@router.put("/{schedule_id}", response_model=ScheduleResponse)
async def update_schedule(schedule_id: int, body: ScheduleCreate):
    """Update an existing schedule."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT id FROM schedules WHERE id = ?", [schedule_id],
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Schedule not found")

        await db.execute(
            "UPDATE schedules SET name = ?, cron_expr = ?, niche = ?, action = ? "
            "WHERE id = ?",
            [body.name, body.cron_expr, body.niche, body.action, schedule_id],
        )
        await db.commit()

        rows = await db.execute_fetchall(
            "SELECT * FROM schedules WHERE id = ?", [schedule_id],
        )

    row = rows[0]
    return ScheduleResponse(**{**dict(row), "is_active": bool(row["is_active"])})


@router.delete("/{schedule_id}")
async def delete_schedule(schedule_id: int):
    """Delete a schedule."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT id FROM schedules WHERE id = ?", [schedule_id],
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Schedule not found")

        await db.execute("DELETE FROM schedules WHERE id = ?", [schedule_id])
        await db.commit()

    return {"deleted": True}


@router.post("/{schedule_id}/toggle", response_model=ScheduleResponse)
async def toggle_schedule(schedule_id: int):
    """Toggle a schedule's is_active flag."""
    async with get_db() as db:
        rows = await db.execute_fetchall(
            "SELECT * FROM schedules WHERE id = ?", [schedule_id],
        )
        if not rows:
            raise HTTPException(status_code=404, detail="Schedule not found")

        new_active = 0 if rows[0]["is_active"] else 1
        await db.execute(
            "UPDATE schedules SET is_active = ? WHERE id = ?",
            [new_active, schedule_id],
        )
        await db.commit()

        rows = await db.execute_fetchall(
            "SELECT * FROM schedules WHERE id = ?", [schedule_id],
        )

    row = rows[0]
    return ScheduleResponse(**{**dict(row), "is_active": bool(row["is_active"])})
