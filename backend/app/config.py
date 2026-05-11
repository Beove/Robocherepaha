from pydantic_settings import BaseSettings

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

    #DeepSeek
    deepseek_api_key: str = ""

    #Groq
    groq_api_key: str = ""

    #Gigachat
    gigachat_api_key: str = ""

    #Redis
    redis_url: str = "redis://redis:6379/0"

    # Окружение
    env: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()