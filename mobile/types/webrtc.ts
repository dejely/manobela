/** Supported signaling message types exchanged over WebSocket. */
export enum MessageType {
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  WELCOME = 'welcome',
  ERROR = 'error',
}

/** SDP offer/answer payload used during WebRTC negotiation. */
export interface SDPMessage {
  type: MessageType.OFFER | MessageType.ANSWER;
  sdp: string;
  sdpType: 'offer' | 'answer';
}

/** ICE candidate details required. */
export interface ICECandidatePayload {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
}

/** ICE candidate signaling message. */
export interface ICECandidateMessage {
  type: MessageType.ICE_CANDIDATE;
  candidate: ICECandidatePayload;
}

/** Initial message after WebSocket connection. */
export interface WelcomeMessage {
  type: MessageType.WELCOME;
  client_id: string;
  timestamp: string;
}

/** Error response sent when signaling or processing fails. */
export interface ErrorMessage {
  type: MessageType.ERROR;
  message: string;
}

// Union of all signaling message types
export type SignalingMessage = SDPMessage | ICECandidateMessage | WelcomeMessage | ErrorMessage;

// Transport connection lifecycle states
export type TransportStatus = 'connecting' | 'open' | 'closing' | 'closed';

/**
 * Abstract signaling transport contract.
 */
export interface SignalingTransport {
  status: TransportStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  send: (msg: SignalingMessage) => void;
  onMessage: (handler: (msg: SignalingMessage) => void) => void;
}
