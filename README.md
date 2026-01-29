<div align="center">

[![Stargazers](https://img.shields.io/github/stars/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/stargazers)
[![Contributors](https://img.shields.io/github/contributors/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/network/members)
[![Issues Closed](https://img.shields.io/github/issues-closed/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/issues?q=is%3Aissue+is%3Aclosed)
[![Pull Requests Closed](https://img.shields.io/github/issues-pr-closed/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/pulls?q=is%3Apr+is%3Aclosed)
[![License](https://img.shields.io/github/license/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/blob/master/LICENSE)

<a href="https://github.com/popcorn-prophets/manobela">
  <img src="docs/images/logo.png" alt="Logo" width="80" height="80">
</a>

<h3 align="center">Manobela</h1>

<p align="center">
  Mobile app for driver monitoring using computer vision
  <br />
  <a href="https://github.com/popcorn-prophets/manobela/tree/master/docs">Docs</a>
  &middot;
  <a href="https://manobela.vercel.app">Website</a>
  &middot;
  <a href="https://manobela.onrender.com">API</a>
  &middot;
  <a href="https://github.com/popcorn-prophets/manobela/issues/new?labels=bug&template=bug_report.md">Report Bug</a>
  &middot;
  <a href="https://github.com/popcorn-prophets/manobela/issues/new?labels=enhancement&template=feature_request.md">Request Feature</a>
</p>

<div align="center">
  <a href="https://manobela.vercel.app/download"
     style="display: inline-block; background:#000; color:#fff; font-size:14px; font-weight:bold; padding:10px 20px; text-decoration:none; border-radius:8px;">
    Download Manobela
  </a>
</div>

</div>

## About The Project

Manobela is a real-time driver monitoring system that uses computer vision to detect unsafe driving behaviors with only a mobile phone.

### Built With

[![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![OpenCV](https://img.shields.io/badge/OpenCV-5C3EE8?style=for-the-badge&logo=opencv&logoColor=white)](https://opencv.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-0052D4?style=for-the-badge&logo=mediapipe&logoColor=white)](https://mediapipe.dev/)
[![YOLO](https://img.shields.io/badge/YOLO-v8-orange?style=for-the-badge)](https://github.com/ultralytics/YOLO)
[![ONNX](https://img.shields.io/badge/ONNX-005CED?style=for-the-badge&logo=onnx&logoColor=white)](https://onnxruntime.ai/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)](https://webrtc.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React Native](https://img.shields.io/badge/React%20Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)

[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)
[![Render](https://img.shields.io/badge/Render-2EC866?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)

## Features

- **Face and object detection:** Real-time tracking of facial landmarks and objects.
- **Eye closure detection:** Monitors drowsiness and triggers alerts.
- **Yawn detection:** Detects fatigue to prevent unsafe driving.
- **Head pose tracking:** Identifies distraction through head movement.
- **Gaze direction monitoring:** Checks if the driver is looking at the road.
- **Phone usage detection:** Alerts when the driver uses a phone.
- **Live video streaming:** WebRTC-based real-time streaming.
- **Offline video analysis:** Processes recorded sessions for insights.
- **Real-time alerts:** Audio, haptic, and visual notifications for unsafe behavior.
- **Session logging:** Tracks driving activity and performance metrics.
- **Analytics dashboard:** Visualizes driving patterns and metrics.
- **Maps integration:** Navigation, routing, and location-based analytics.
- **Customizable settings:** Adjust thresholds, alerts, and monitoring preferences.

## Project Structure

```txt
.
├── backend/  # FastAPI backend
└── mobile/   # Expo React Native mobile app
└── website/  # Next.js website
└── docs/     # Documentation
```

## Setup

- [Backend setup](docs/backend/setup.md)
- [Mobile setup](docs/mobile/setup.md)
- [Website setup](docs/website/setup.md)

## Contributing

Contributions are welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for more information.

### Top contributors

<a href="https://github.com/popcorn-prophets/manobela/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=popcorn-prophets/manobela" />
</a>

## License

Distributed under the [Apache License 2.0](LICENSE).
