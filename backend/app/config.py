from pydantic_settings import BaseSettings
from pydantic import validator

class Settings(BaseSettings):
    # БД
    database_url: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # MinIO
    minio_root_user: str
    minio_root_password: str
    minio_bucket: str = "documents"

    # GigaChat
    gigachat_api_key: str = ""

    # DeepSeek (резервный)
    deepseek_api_key: str = ""

    # Groq (резервный)
    groq_api_key: str = ""

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # Окружение
    env: str = "development"

    @validator("secret_key")
    def secret_key_must_be_strong(cls, v):
        if len(v) < 32:
            raise ValueError("SECRET_KEY должен быть минимум 32 символа")
        return v

    @validator("gigachat_api_key")
    def gigachat_key_required(cls, v):
        if not v or v.strip() == "":
            raise ValueError("GIGACHAT_API_KEY не задан — AI консультант не будет работать")
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()