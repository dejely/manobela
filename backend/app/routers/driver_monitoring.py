import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.models.webrtc import MessageType
from app.services.connection_manager import manager
from app.services.webrtc_handler import (
    handle_answer,
    handle_ice_candidate,
    handle_offer,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])


@router.websocket("/ws/driver-monitoring")
async def driver_monitoring(websocket: WebSocket):
    """
    WebSocket endpoint that handles WebRTC signaling messages for a single client.
    """

    # Generate a unique identifier for this client session
    client_id = str(uuid.uuid4())
    await manager.connect(websocket, client_id)

    try:
        # Initial handshake message so the client knows its assigned I
        await manager.send_message(
            client_id,
            {
                "type": MessageType.WELCOME.value,
                "client_id": client_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        while True:
            # Receive a message from the client
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from %s: %s", client_id, raw)
                continue

            msg_type = message.get("type")
            logger.info("Received %s from %s", msg_type, client_id)

            # Route signaling messages based on type
            if msg_type == MessageType.OFFER.value:
                await handle_offer(client_id, message)

            elif msg_type == MessageType.ANSWER.value:
                await handle_answer(client_id, message)

            elif msg_type == MessageType.ICE_CANDIDATE.value:
                await handle_ice_candidate(client_id, message)

            else:
                logger.warning("Unknown message type from %s: %s", client_id, msg_type)

    except WebSocketDisconnect:
        logger.info("Client %s disconnected", client_id)

    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", client_id, exc)

    finally:
        # Ensure peer connection and background tasks are cleaned up
        pc = manager.disconnect(client_id)
        if pc:
            await pc.close()
