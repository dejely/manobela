# Troubleshooting

## Connection fails

- Verify EXPO_PUBLIC_WS_BASE points to the backend.
- Ensure the backend is running and reachable from the device.
- Check METERED_DOMAIN and METERED_SECRET_KEY.
- Confirm /ice-servers returns valid servers.

## Model load errors

- Ensure backend/assets/models contains face_landmarker.task and yolov8n.onnx.
- Verify the files are readable in the container or runtime environment.
