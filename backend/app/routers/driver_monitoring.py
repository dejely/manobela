import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.dependencies import (
    ConnectionManagerDep,
    ConnectionManagerWsDep,
    FaceLandmarkerDepWs,
    ObjectDetectorDepWs,
)
from app.models.webrtc import MessageType
from app.services.webrtc_handler import (
    handle_answer,
    handle_ice_candidate,
    handle_offer,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["driver_monitoring"])


@router.websocket("/ws/driver-monitoring")
async def driver_monitoring(
    websocket: WebSocket,
    connection_manager: ConnectionManagerWsDep,
    face_landmarker: FaceLandmarkerDepWs,
    object_detector: ObjectDetectorDepWs,
):
    """
    WebSocket endpoint that handles WebRTC signaling messages for a single client.
    """
    await websocket.accept()
    await connection_manager.cleanup_expired_sessions(settings.session_ttl_seconds)

    requested_client_id = websocket.query_params.get("client_id")
    initial_message: dict | None = None
    client_id: str | None = None

    if requested_client_id and connection_manager.is_session_valid(
        requested_client_id, settings.session_ttl_seconds
    ):
        client_id = requested_client_id

    if client_id is None:
        try:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            initial_message = message
            requested_client_id = message.get("client_id")
            if requested_client_id and connection_manager.is_session_valid(
                requested_client_id, settings.session_ttl_seconds
            ):
                client_id = requested_client_id
        except json.JSONDecodeError:
            logger.warning("Invalid JSON on initial message: %s", raw)
        except WebSocketDisconnect:
            logger.info("Client disconnected before handshake completed")
            return

    if client_id is None:
        client_id = str(uuid.uuid4())

    existing_ws = connection_manager.active_connections.get(client_id)
    if existing_ws and existing_ws is not websocket:
        await existing_ws.close()

    connection_manager.register_websocket(websocket, client_id)

    try:
        # Initial handshake message so the client knows its assigned ID
        await connection_manager.send_message(
            client_id,
            {
                "type": MessageType.WELCOME.value,
                "client_id": client_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )

        async def handle_message(message: dict) -> None:
            connection_manager.touch(client_id)
            msg_type = message.get("type")
            logger.info("Received %s from %s", msg_type, client_id)

            if msg_type == MessageType.OFFER.value:
                await handle_offer(
                    client_id,
                    message,
                    connection_manager,
                    face_landmarker,
                    object_detector,
                )

            elif msg_type == MessageType.ANSWER.value:
                await handle_answer(client_id, message, connection_manager)

            elif msg_type == MessageType.ICE_CANDIDATE.value:
                await handle_ice_candidate(client_id, message, connection_manager)

            else:
                logger.warning("Unknown message type from %s: %s", client_id, msg_type)

        if initial_message:
            await handle_message(initial_message)

        while True:
            # Receive a message from the client
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                logger.warning("Invalid JSON from %s: %s", client_id, raw)
                continue

            connection_manager.touch(client_id)
            await handle_message(message)

    except WebSocketDisconnect:
        logger.info("Client %s disconnected", client_id)

    except Exception as exc:
        logger.exception("WebSocket error for %s: %s", client_id, exc)

    finally:
        if client_id:
            connection_manager.detach_websocket(client_id)


@router.get("/connections")
async def connections(
    connection_manager: ConnectionManagerDep,
):
    """
    Returns an overview of active driver monitoring sessions and resources.
    """
    return {
        "active_connections": len(connection_manager.active_connections),
        "peer_connections": len(connection_manager.peer_connections),
        "data_channels": len(connection_manager.data_channels),
        "frame_tasks": len(connection_manager.frame_tasks),
        "sessions": len(connection_manager.sessions),
    }
