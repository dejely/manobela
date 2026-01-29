from typing import List

import aiohttp
from aiortc import RTCIceServer
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.ice_servers import get_ice_servers

router = APIRouter(tags=["webrtc"])


class IceServersResponse(BaseModel):
    iceServers: List[RTCIceServer] = Field(
        ...,
        description="List of ICE servers (STUN/TURN) usable by WebRTC clients",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "iceServers": [
                    {"urls": "stun:stun.l.google.com:19302"},
                    {
                        "urls": "turn:turn.example.com:3478",
                        "username": "user",
                        "credential": "pass",
                        "credentialType": "password",
                    },
                ]
            }
        }


class TurnUsageResponse(BaseModel):
    quotaInGB: float
    usageInGB: float
    overageInGB: float


@router.get(
    "/ice-servers",
    summary="Get ICE servers",
    description="Retrieve STUN/TURN server configuration for WebRTC clients.",
    response_model=IceServersResponse,
)
async def ice_servers():
    servers = await get_ice_servers()
    return {"iceServers": [s.__dict__ for s in servers]}


@router.get(
    "/turn-usage",
    summary="Get TURN usage",
    description="Fetch current TURN usage.",
    response_model=TurnUsageResponse,
)
async def turn_usage():
    if not settings.metered_secret_key or not settings.metered_domain:
        raise HTTPException(status_code=400, detail="TURN secret key or domain not set")

    url = f"https://{settings.metered_domain}/api/v1/turn/current_usage?secretKey={settings.metered_secret_key}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as resp:
            if resp.status != 200:
                text = await resp.text()
                raise HTTPException(status_code=resp.status, detail=text)
            data = await resp.json()
    return data
