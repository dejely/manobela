# WebRTC signaling

## WebSocket endpoint

- ws://<host>:8000/ws/driver-monitoring

## Signaling message types

- welcome: sent by server on connect.
- offer: SDP offer from client.
- answer: SDP answer from server or client.
- ice-candidate: ICE candidate message.
- error: error response from server.

## Basic flow

1. Client opens WebSocket.
2. Server sends welcome with client_id.
3. Client sends offer.
4. Server sends answer.
5. Both sides exchange ice-candidate messages.

## Data channel messages

The server expects JSON messages over the data channel with the following types:

- monitoring-control
  - action: pause or resume
- head_pose_recalibrate
  - requests head pose baseline reset

## Server output

Inference results are sent as JSON over the data channel. The format matches the InferenceData model used by the backend.
