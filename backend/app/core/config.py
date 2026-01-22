from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application
    app_name: str = "Manobela Backend"
    environment: str = "development"

    # CORS
    cors_allow_origins: list[str] = ["*"]

    # WebRTC
    metered_domain: str = ""
    metered_secret_key: str = ""
    metered_credentials_api_key: str = ""

    # Video processing
    target_fps: int = 15
    max_upload_byte_size: int = 100 * 1024 * 1024
    max_upload_duration_seconds: int = 5 * 60
    max_processing_time_seconds: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
