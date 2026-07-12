from datetime import datetime
from typing import Dict, Union
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Query


app = FastAPI(
    title="US Time API",
    version="1.0.0",
    description="Async FastAPI service that returns the current time for US time zones.",
)

US_TIME_ZONES = {
    "eastern": "America/New_York",
    "central": "America/Chicago",
    "mountain": "America/Denver",
    "pacific": "America/Los_Angeles",
    "alaska": "America/Anchorage",
    "hawaii": "Pacific/Honolulu",
}


def format_utc_offset(now: datetime) -> str:
    offset = now.utcoffset()
    if offset is None:
        return "unknown"

    total_minutes = int(offset.total_seconds() // 60)
    sign = "+" if total_minutes >= 0 else "-"
    total_minutes = abs(total_minutes)
    hours, minutes = divmod(total_minutes, 60)
    return f"{sign}{hours:02d}:{minutes:02d}"


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/time/us")
async def get_us_time(
    tz: str = Query(
        default="eastern",
        description="US zone key: eastern, central, mountain, pacific, alaska, hawaii",
    ),
) -> Dict[str, Union[str, int, float]]:
    zone_name = US_TIME_ZONES.get(tz.lower())
    if zone_name is None:
        valid_zones = ", ".join(sorted(US_TIME_ZONES))
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported timezone. Use one of: {valid_zones}",
        )

    now = datetime.now(ZoneInfo(zone_name))

    return {
        "timezone": zone_name,
        "datetime": now.isoformat(),
        "date": now.date().isoformat(),
        "time": now.strftime("%H:%M:%S"),
        "utc_offset": format_utc_offset(now),
        "unix_timestamp": now.timestamp(),
    }
