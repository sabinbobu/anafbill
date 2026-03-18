import logging
import zipfile
import io

import httpx

from ..config import settings

logger = logging.getLogger(__name__)


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def upload_invoice(xml_content: str, cif: str, token: str, b2c: bool = False) -> str:
    """Upload a UBL XML invoice to ANAF and return the id_incarcare.

    Args:
        xml_content: UBL 2.1 XML string
        cif: The issuer's CUI (without 'RO' prefix)
        token: Valid ANAF OAuth2 access token
        b2c: True for B2C invoices, False for B2B (default)

    Returns:
        id_incarcare (upload ID) as a string
    """
    endpoint = "uploadb2c" if b2c else "upload"
    url = f"{settings.anaf_base_url}/{endpoint}"
    params = {"standard": "UBL", "cif": cif}

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            url,
            params=params,
            content=xml_content.encode("utf-8"),
            headers={
                **_headers(token),
                "Content-Type": "text/plain",
            },
        )
        response.raise_for_status()
        data = response.json()

    # ANAF returns {"ExecutionStatus": 0, "index_incarcare": "12345678"}
    if data.get("ExecutionStatus") != 0:
        errs = data.get("Errors", [{}])
        msg = errs[0].get("errorMessage", "Unknown ANAF upload error") if errs else "Unknown error"
        raise ValueError(f"ANAF upload rejected: {msg}")

    upload_id = str(data.get("index_incarcare", ""))
    if not upload_id:
        raise ValueError("ANAF did not return an upload ID")

    logger.info("Invoice uploaded to ANAF, id_incarcare=%s", upload_id)
    return upload_id


async def check_status(upload_id: str, token: str) -> dict:
    """Poll ANAF for the status of an uploaded invoice.

    Returns a dict with keys:
      - status: "in prelucrare" | "ok" | "nok" | "XML cu erori neprelucrat"
      - download_id: str | None  (id_descarcare, present when status == "ok")
      - errors: list[str]
    """
    url = f"{settings.anaf_base_url}/stareMesaj"
    params = {"id_incarcare": upload_id}

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, params=params, headers=_headers(token))
        response.raise_for_status()
        data = response.json()

    stare = data.get("stare", "").lower()
    download_id = str(data.get("id_descarcare", "")) or None
    errors: list[str] = []

    if data.get("Errors"):
        errors = [e.get("errorMessage", "") for e in data["Errors"] if e.get("errorMessage")]

    return {
        "status": stare,
        "download_id": download_id,
        "errors": errors,
    }


async def download_response(download_id: str, token: str) -> bytes:
    """Download the signed response ZIP from ANAF.

    Returns the raw bytes of the ZIP archive (contains signed XML + signature files).
    """
    url = f"{settings.anaf_base_url}/descarcare"
    params = {"id": download_id}

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.get(url, params=params, headers=_headers(token))
        response.raise_for_status()
        return response.content


def extract_signed_xml(zip_bytes: bytes) -> str:
    """Extract the signed XML from an ANAF response ZIP archive."""
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        for name in zf.namelist():
            if name.endswith(".xml") and not name.startswith("semnatura"):
                return zf.read(name).decode("utf-8")
    raise ValueError("No signed XML found in ANAF response archive")


async def validate_xml(xml_content: str, token: str) -> list[str]:
    """Validate a UBL XML against ANAF's online validator.

    Returns a list of error messages (empty list = valid).
    """
    url = f"{settings.anaf_base_url}/validare/UBL"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            url,
            content=xml_content.encode("utf-8"),
            headers={
                **_headers(token),
                "Content-Type": "text/plain",
            },
        )
        response.raise_for_status()
        data = response.json()

    if data.get("ExecutionStatus") == 0:
        return []

    errors = data.get("Errors", [])
    return [e.get("errorMessage", str(e)) for e in errors if e]


async def convert_to_pdf(xml_content: str) -> bytes:
    """Convert a UBL XML invoice to PDF using the ANAF XML-to-PDF service.

    Returns the raw PDF bytes. Does not require OAuth token (public endpoint).
    """
    # This endpoint is public — no auth needed
    env = "prod" if settings.anaf_env == "prod" else "test"
    url = f"https://api.anaf.ro/{env}/FCTEL/rest/transformare/FACT1"

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            url,
            content=xml_content.encode("utf-8"),
            headers={"Content-Type": "text/plain"},
        )
        response.raise_for_status()
        return response.content
