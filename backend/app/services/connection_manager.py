import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional

from aiortc import RTCDataChannel, RTCPeerConnection
from fastapi import WebSocket

logger = logging.getLogger(__name__)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class SessionState:
    peer_connection: Optional[RTCPeerConnection] = None
    data_channel: Optional[RTCDataChannel] = None
    frame_task: Optional[asyncio.Task] = None
    last_seen: datetime = field(default_factory=_utc_now)


class ConnectionManager:
    """
    Central registry for active WebSocket clients and their WebRTC resources.
    """

    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}
        self.peer_connections: dict[str, RTCPeerConnection] = {}
        self.data_channels: dict[str, RTCDataChannel] = {}
        self.frame_tasks: dict[str, asyncio.Task] = {}
        self.sessions: dict[str, SessionState] = {}
        logger.info("Connection Manager initialized")

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        self.register_websocket(websocket, client_id)
        logger.info(
            "Client %s connected. Total: %d", client_id, len(self.active_connections)
        )

    def register_websocket(self, websocket: WebSocket, client_id: str) -> None:
        self.active_connections[client_id] = websocket
        session = self.sessions.setdefault(client_id, SessionState())
        session.last_seen = _utc_now()

    def register_peer_connection(
        self, client_id: str, pc: RTCPeerConnection
    ) -> None:
        self.peer_connections[client_id] = pc
        session = self.sessions.setdefault(client_id, SessionState())
        session.peer_connection = pc
        session.last_seen = _utc_now()

    def register_data_channel(self, client_id: str, channel: RTCDataChannel) -> None:
        self.data_channels[client_id] = channel
        session = self.sessions.setdefault(client_id, SessionState())
        session.data_channel = channel
        session.last_seen = _utc_now()

    def register_frame_task(self, client_id: str, task: asyncio.Task) -> None:
        self.frame_tasks[client_id] = task
        session = self.sessions.setdefault(client_id, SessionState())
        session.frame_task = task
        session.last_seen = _utc_now()

    def touch(self, client_id: str) -> None:
        session = self.sessions.get(client_id)
        if session:
            session.last_seen = _utc_now()

    def is_session_valid(self, client_id: str, ttl_seconds: int) -> bool:
        session = self.sessions.get(client_id)
        if not session:
            return False
        age = (_utc_now() - session.last_seen).total_seconds()
        return age <= ttl_seconds

    def detach_websocket(self, client_id: str) -> None:
        self.active_connections.pop(client_id, None)
        self.touch(client_id)
        logger.info(
            "Client %s detached. Remaining: %d",
            client_id,
            len(self.active_connections),
        )

    async def close_session(self, client_id: str) -> None:
        """Remove all resources associated with a client and cancel background tasks."""
        ws = self.active_connections.pop(client_id, None)
        pc = self.peer_connections.pop(client_id, None)
        self.data_channels.pop(client_id, None)

        task = self.frame_tasks.pop(client_id, None)
        if task and not task.done():
            task.cancel()
            logger.info("Cancelled frame processing task for %s", client_id)

        session = self.sessions.pop(client_id, None)
        if not pc and session and session.peer_connection:
            pc = session.peer_connection
        if not task and session and session.frame_task:
            task = session.frame_task
            if task and not task.done():
                task.cancel()
                logger.info("Cancelled frame processing task for %s", client_id)

        if ws:
            try:
                await ws.close()
                logger.info("Closed WebSocket for %s", client_id)
            except Exception as e:
                logger.warning("Failed to close WebSocket for %s: %s", client_id, e)

        if pc:
            await pc.close()
            logger.info("Closed RTCPeerConnection for %s", client_id)

        logger.info(
            "Client %s cleaned up. Remaining: %d",
            client_id,
            len(self.active_connections),
        )

    async def cleanup_expired_sessions(self, ttl_seconds: int) -> None:
        now = _utc_now()
        expired_ids = [
            client_id
            for client_id, session in self.sessions.items()
            if (now - session.last_seen).total_seconds() > ttl_seconds
        ]

        for client_id in expired_ids:
            logger.info("Expiring stale session %s", client_id)
            await self.close_session(client_id)

    async def send_message(self, client_id: str, message: dict) -> None:
        """Send a JSON-serializable message to a client over WebSocket."""
        ws = self.active_connections.get(client_id)
        if ws:
            try:
                await ws.send_json(message)
                self.touch(client_id)
            except Exception as e:
                logger.error("Failed to send message to %s: %s", client_id, e)

    async def send_data(self, client_id: str, message: dict) -> None:
        """Send a JSON message to the client via its WebRTC data channel."""
        channel = self.data_channels.get(client_id)
        if channel and channel.readyState == "open":
            try:
                channel.send(json.dumps(message))
                self.touch(client_id)
            except Exception as e:
                logger.error("Failed to send data to %s: %s", client_id, e)
        else:
            logger.warning("Data channel not open for %s", client_id)

    async def broadcast(self, message: dict) -> None:
        """Send a message to all connected clients."""
        for client_id, ws in self.active_connections.items():
            try:
                await ws.send_json(message)
                self.touch(client_id)
            except Exception as e:
                logger.error("Failed to broadcast to %s: %s", client_id, e)

    async def close(self) -> None:
        """
        Close all active connections, peer connections, data channels, and cancel tasks.
        Intended to be called during app shutdown.
        """
        logger.info("Shutting down Connection Manager...")

        # Cancel all frame processing tasks
        for client_id, task in list(self.frame_tasks.items()):
            if task and not task.done():
                task.cancel()
                logger.info("Cancelled frame processing task for %s", client_id)

        # Close all RTCPeerConnections
        for client_id, pc in list(self.peer_connections.items()):
            if pc:
                await pc.close()
                logger.info("Closed RTCPeerConnection for %s", client_id)

        # Close all WebSockets
        for client_id, ws in list(self.active_connections.items()):
            try:
                await ws.close()
                logger.info("Closed WebSocket for %s", client_id)
            except Exception as e:
                logger.warning("Failed to close WebSocket for %s: %s", client_id, e)

        # Clear all internal dictionaries
        self.active_connections.clear()
        self.peer_connections.clear()
        self.data_channels.clear()
        self.frame_tasks.clear()
        self.sessions.clear()

        logger.info("Connection Manager shutdown complete")
