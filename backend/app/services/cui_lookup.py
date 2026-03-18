import logging
from datetime import date
import httpx

logger = logging.getLogger(__name__)

ANAF_TVA_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva"
_TIMEOUT = 10.0


async def lookup_cui(cui: str) -> dict | None:
    """Query the ANAF public company info API for a given CUI.

    Strips the leading "RO" prefix if present and returns a normalised dict,
    or None if the company is not found or ANAF returns an error.
    """
    # Normalise: strip whitespace and leading "RO" / "ro"
    clean_cui = cui.strip().upper()
    if clean_cui.startswith("RO"):
        clean_cui = clean_cui[2:]

    try:
        cui_int = int(clean_cui)
    except ValueError:
        logger.warning("lookup_cui: invalid CUI value '%s'", cui)
        return None

    today_str = date.today().isoformat()
    payload = [{"cui": cui_int, "data": today_str}]

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            response = await client.post(
                ANAF_TVA_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error("ANAF TVA API HTTP error %s: %s", exc.response.status_code, exc)
        return None
    except httpx.RequestError as exc:
        logger.error("ANAF TVA API request error: %s", exc)
        return None

    try:
        data = response.json()
    except Exception as exc:
        logger.error("ANAF TVA API invalid JSON: %s", exc)
        return None

    found = data.get("found")
    if not found or not isinstance(found, list) or len(found) == 0:
        logger.info("lookup_cui: CUI %s not found in ANAF response", cui_int)
        return None

    company = found[0]
    if not company:
        return None

    # ANAF returns nested address data under "adresa" key and date_generale sub-object
    date_generale = company.get("date_generale", {}) or {}
    adresa = company.get("adresa", {}) or {}

    # Extract raw address fields — the API may return them flat or nested
    address_street: str | None = (
        adresa.get("ddenumire_Strada")
        or adresa.get("strada")
        or company.get("adresa")
        or None
    )
    address_city: str | None = (
        adresa.get("ddenumire_Localitate")
        or adresa.get("localitate")
        or None
    )
    address_county: str | None = (
        adresa.get("ddenumire_Judet")
        or adresa.get("judet")
        or None
    )
    address_postal_code: str | None = (
        adresa.get("dcod_Postal")
        or adresa.get("cod_postal")
        or None
    )

    company_name: str = (
        date_generale.get("denumire")
        or company.get("denumire")
        or ""
    )
    trade_register_nr: str | None = (
        date_generale.get("nrRegCom")
        or company.get("nrRegCom")
        or None
    )
    vat_registered: bool = bool(
        company.get("scpTVA")
        or date_generale.get("scpTVA")
        or False
    )

    return {
        "cui": str(cui_int),
        "name": company_name,
        "address_street": address_street,
        "address_city": address_city,
        "address_county": address_county,
        "address_postal_code": address_postal_code,
        "vat_registered": vat_registered,
        "trade_register_nr": trade_register_nr,
    }
