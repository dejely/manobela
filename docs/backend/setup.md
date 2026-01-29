# Backend setup

## Prerequisites

- Python 3.11+
- uv: <https://docs.astral.sh/uv/getting-started/installation/>/>

## Install

1. Copy .env and set values.

```sh
cp .env.example .env
```

1. Install dependencies with uv.

```sh
uv sync
```

## Run

```sh
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You can also run:

```sh
python run.py
```
