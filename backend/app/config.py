from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_service_key: str = ""

    # ANAF
    anaf_client_id: str = ""
    anaf_client_secret: str = ""
    anaf_redirect_uri: str = "http://localhost:8000/api/auth/anaf/callback"
    anaf_env: str = "test"  # 'test' or 'prod'

    # Anthropic
    anthropic_api_key: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Resend
    resend_api_key: str = ""

    # App
    app_url: str = "http://localhost:5173"
    api_url: str = "http://localhost:8000"
    secret_key: str = "change-me"

    @property
    def anaf_base_url(self) -> str:
        env = "prod" if self.anaf_env == "prod" else "test"
        return f"https://api.anaf.ro/{env}/FCTEL/rest"


settings = Settings()
