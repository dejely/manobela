# Mobile app setup

## Prerequisites

- Node.js 18+
- pnpm: <https://pnpm.io/installation>
- Android Studio and an Android emulator or device

## Install

1. Copy .env and set values.

```sh
cp .env.example .env
```

1. Install dependencies.

```sh
pnpm install
```

## Run

```sh
pnpm android
# or
pnpm ios
```

## Physical Android device

### Enable developer options

1. Open Settings > About Phone.
2. Tap Build Number 7 times.

### Option A: USB debugging

1. Open Settings > Developer Options.
2. Enable USB Debugging.
3. Connect the device with a USB cable.
4. Verify the device connection.

```sh
adb devices
```

### Option B: Wireless ADB

1. Open Settings > Developer Options.
2. Enable Wireless Debugging.
3. Tap Pair device with pairing code.

```sh
adb pair <ip address>
adb connect <ip address>
```

### Backend port forwarding

```sh
adb reverse tcp:8000 tcp:8000
```

### Tunnel

If you are using experiencing issues, you can run the tunnel command.

```sh
pnpm dev --tunnel
```
