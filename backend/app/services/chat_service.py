import logging
import anthropic
from ..config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Ești asistentul fiscal AI al Anaf Bill. Răspunzi DOAR la întrebări despre:
- e-Factura (RO e-Factura, SPV, XML, UBL)
- Obligații fiscale pentru PFA și SRL în România
- Erori ANAF (coduri BR-RO-XXX) și cum se rezolvă
- e-Transport
- Termene de raportare
- TVA, CAS, CASS, impozit pe venit

Reguli:
- Răspunde ÎNTOTDEAUNA în limba română
- Fii concis și practic — dă pași concreți, nu teorie
- Când explici o eroare BR-RO-XXX, specifică exact ce câmp trebuie corectat
- Nu da sfaturi juridice — recomandă consultarea unui contabil pentru situații complexe
- Dacă nu știi răspunsul, spune clar și sugerează să contacteze un contabil
- Folosește un ton prietenos dar profesional"""


async def get_chat_reply(message: str, history: list[dict]) -> str:
    """Send *message* to Claude Haiku (with conversation *history*) and return the reply."""
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    messages: list[dict] = [
        {"role": m["role"], "content": m["content"]} for m in history
    ]
    messages.append({"role": "user", "content": message})

    try:
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=messages,
        )
        return response.content[0].text
    except anthropic.APIError as exc:
        logger.error("Anthropic API error: %s", exc)
        raise
