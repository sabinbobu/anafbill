import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routers import invoices, clients, organizations, anaf_auth, chat, dashboard, archive

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FacturAI API",
    description="AI-Powered e-Factura Compliance Assistant",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.app_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(invoices.router, prefix="/api/invoices", tags=["invoices"])
app.include_router(clients.router, prefix="/api/clients", tags=["clients"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
app.include_router(anaf_auth.router, prefix="/api/auth/anaf", tags=["anaf-auth"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(archive.router, prefix="/api/archive", tags=["archive"])


@app.get("/api/health", tags=["health"])
async def health_check() -> dict:
    return {"status": "ok", "service": "facturai-api", "version": "0.1.0"}
