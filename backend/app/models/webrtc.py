from enum import Enum
from typing import Optional

from pydantic import BaseModel


class MessageType(str, Enum):
    """
    Supported signaling message types exchanged over WebSocket.
    """

    OFFER = "offer"
    ANSWER = "answer"
    ICE_CANDIDATE = "ice-candidate"
    WELCOME = "welcome"
    ERROR = "error"


class SDPMessage(BaseModel):
    """
    SDP offer/answer payload used during WebRTC negotiation.
    """

    type: MessageType
    sdp: str
    sdpType: str  # "offer" or "answer"


class ICECandidatePayload(BaseModel):
    """
    ICE candidate details required.
    """

    candidate: str
    sdpMid: Optional[str]
    sdpMLineIndex: Optional[int]


class ICECandidateMessage(BaseModel):
    """
    ICE candidate signaling message.
    """

    type: MessageType
    candidate: ICECandidatePayload


class WelcomeMessage(BaseModel):
    """
    Initial message after WebSocket connection.
    """

    type: MessageType
    client_id: str
    timestamp: str  # ISO 8601 UTC string


class ErrorMessage(BaseModel):
    """
    Error response sent when signaling or processing fails.
    """

    type: MessageType
    message: str


SignalingMessage = SDPMessage | ICECandidateMessage | WelcomeMessage | ErrorMessage
