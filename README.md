<div align="center">

[![Contributors](https://img.shields.io/github/contributors/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/graphs/contributors)
[![Forks](https://img.shields.io/github/forks/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/network/members)
[![Stargazers](https://img.shields.io/github/stars/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/stargazers)
[![License](https://img.shields.io/github/license/popcorn-prophets/manobela?style=flat-square&color=000000)](https://github.com/popcorn-prophets/manobela/blob/master/LICENSE)

  <a href="https://github.com/popcorn-prophets/manobela">
    <img src="docs/images/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Manobela</h1>

  <p align="center">
    A driver monitoring system
    <br />
    <a href="https://github.com/popcorn-prophets/manobela">View Demo</a>
    &middot;
    <a href="https://github.com/popcorn-prophets/manobela/issues/new?labels=bug&template=bug_report.md">Report Bug</a>
    &middot;
    <a href="https://github.com/popcorn-prophets/manobela/issues/new?labels=enhancement&template=feature_request.md">Request Feature</a>
  </p>
</div>

## About The Project

**Manobela** is a real-time driver monitoring system that uses **on-device computer vision** to detect unsafe driving behaviors using only a mobile phone.  It is designed to be **accessible, low-cost, and deployable without specialized hardware**, making driver safety technology more attainable.

The system processes live video streams from a mobile device and analyzes driver behavior through a FastAPI backend, enabling near real-time feedback and analysis.
## Key Features
- 👀 **Gaze Monitoring** (On-road vs Off-road attention)
- 🥱 **Fatigue indicators** (e.g., yawning, prolonged eye closure)
- 📱 **Phone usage detection**
- 🧏 **Head pose level detection**
- 👁️ **Eye Aspect Ratio**
- 🏗️ **Modular Architecture** for extending detection metrics

## Project Structure

```txt
.
├── backend/  # FastAPI backend
└── mobile/   # Expo React Native mobile app
```

## Getting Started

### Prerequisites

- Python 3.11+, [uv](https://docs.astral.sh/uv/getting-started/installation/)
- Node.js 18+, [pnpm](https://pnpm.io/installation)
- [Android Studio](https://developer.android.com/studio) with an emulator or an Android device
- [SDK Manager](https://developer.android.com/studio/intro/update#sdk-manager) (**Optional**)

### Installation

#### 1. Clone the repo

```sh
git clone git@github.com:popcorn-prophets/manobela.git
cd manobela
```

#### 2. Install dependencies

```sh
cd backend
uv sync
```

```sh
cd mobile
pnpm install
```

#### 3. Create `.env` files

Copy the `.env.example` file to `.env` in both the backend and mobile directories.

```sh
cp .env.example .env
```
Do this for both `mobile/` and `backend/`
|Variable	|Description	|Required|
|----------|------------|---------|
|API_BASE_URL	|Backend HTTP endpoint	| ✔️ |
|WS_BASE_URL	|WebSocket signaling endpoint	| ✔️ |

Make sure to update variables in the `.env` file with your _own_ values.

#### Running the Application
You'll need to run the backend and mobile app on two different terminals simultaneously.
**Backend**
```sh
cd backend
source .venv/bin/activate
python run.py
# or uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
```sh
cd mobile
pnpm android  # or `pnpm ios`
pnpm dev --tunnel # if using smartphone device
```
---

## Running on a Physical Device (Optional)

**Enable Developer Options**
1. Settings → About Phone
2. Tap Build Number 7 times.
3. Confirm developer is enabled

### Option A: USB Debugging (Recommended)
1. Go to **Settings → Developer Options**
2. Enable **USB Debugging**
3. Connect device via USB

Verify:
```sh
adb devices
# Ensure you have
```

If your device appears then you are ready

### Option B: Wireless ADB

> Requires Android 11+ and both devices on the same Wi-Fi network

1. Go to **Settings → Developer Options**
2. Enable **Wireless Debugging**
3. Tap **Wireless Debugging** → **Pair device with pairing code**
4. Note the **IP address, pairing port, and pairing code**

#### Pair your device

```sh
adb pair <ip address> → pairing code
adb connect <ip address>
```

#### Verify device

```sh
adb device
```

#### Proceed to backend

```sh
cd backend
adb reverse tcp:8000 tcp:8000
```



