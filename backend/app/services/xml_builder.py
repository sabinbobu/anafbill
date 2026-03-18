import logging
from lxml import etree

logger = logging.getLogger(__name__)

# XML namespace URIs
NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

NSMAP = {
    None: NS_INVOICE,
    "cac": NS_CAC,
    "cbc": NS_CBC,
}

CUSTOMIZATION_ID = (
    "urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1"
)
PROFILE_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"


def _cbc(tag: str) -> str:
    return f"{{{NS_CBC}}}{tag}"


def _cac(tag: str) -> str:
    return f"{{{NS_CAC}}}{tag}"


def _text(parent: etree._Element, tag: str, value: str | None) -> etree._Element:
    """Append a cbc element with text content to *parent*."""
    el = etree.SubElement(parent, _cbc(tag))
    el.text = value or ""
    return el


def _add_party_tax_scheme(
    party_tax_scheme_parent: etree._Element,
    vat_number: str,
) -> None:
    """Append a cac:PartyTaxScheme block."""
    pts = etree.SubElement(party_tax_scheme_parent, _cac("PartyTaxScheme"))
    company_id = etree.SubElement(pts, _cbc("CompanyID"))
    company_id.text = vat_number
    tax_scheme = etree.SubElement(pts, _cac("TaxScheme"))
    scheme_id = etree.SubElement(tax_scheme, _cbc("ID"))
    scheme_id.text = "VAT"


def _add_party(
    parent: etree._Element,
    wrapper_tag: str,
    name: str,
    cui: str | None,
    address_street: str | None,
    address_city: str | None,
    address_county: str | None,
    address_postal_code: str | None,
    country_code: str = "RO",
    vat_registered: bool = False,
) -> None:
    """Build an AccountingSupplierParty / AccountingCustomerParty block."""
    wrapper = etree.SubElement(parent, _cac(wrapper_tag))
    party = etree.SubElement(wrapper, _cac("Party"))

    # Party identifier (CUI / registration number)
    if cui:
        party_id = etree.SubElement(party, _cbc("EndpointID"))
        party_id.set("schemeID", "9944")  # Romanian CUI scheme in Peppol
        party_id.text = cui

    # Legal name
    party_name_el = etree.SubElement(party, _cac("PartyName"))
    name_el = etree.SubElement(party_name_el, _cbc("Name"))
    name_el.text = name

    # Postal address
    postal_address = etree.SubElement(party, _cac("PostalAddress"))
    if address_street:
        street_el = etree.SubElement(postal_address, _cbc("StreetName"))
        street_el.text = address_street
    if address_city:
        city_el = etree.SubElement(postal_address, _cbc("CityName"))
        city_el.text = address_city
    if address_postal_code:
        postal_el = etree.SubElement(postal_address, _cbc("PostalZone"))
        postal_el.text = address_postal_code
    if address_county:
        county_el = etree.SubElement(postal_address, _cbc("CountrySubentity"))
        county_el.text = address_county
    country = etree.SubElement(postal_address, _cac("Country"))
    country_id_el = etree.SubElement(country, _cbc("IdentificationCode"))
    country_id_el.text = country_code

    # PartyTaxScheme (VAT)
    if vat_registered and cui:
        vat_number = f"RO{cui}" if not cui.upper().startswith("RO") else cui
        _add_party_tax_scheme(party, vat_number)

    # PartyLegalEntity
    legal_entity = etree.SubElement(party, _cac("PartyLegalEntity"))
    reg_name_el = etree.SubElement(legal_entity, _cbc("RegistrationName"))
    reg_name_el.text = name
    if cui:
        company_id_el = etree.SubElement(legal_entity, _cbc("CompanyID"))
        company_id_el.text = cui


def _add_tax_total(
    parent: etree._Element,
    currency: str,
    lines: list[dict],
) -> None:
    """Build cac:TaxTotal with per-rate subtotals."""
    # Group lines by VAT rate
    rate_groups: dict[tuple[float, str], dict] = {}
    for line in lines:
        vat_rate = float(line.get("vat_rate", 19.0))
        vat_cat = str(line.get("vat_category_code", "S"))
        key = (vat_rate, vat_cat)
        line_total = float(line.get("line_total", 0.0))
        vat_amount = round(line_total * vat_rate / 100, 2)
        if key not in rate_groups:
            rate_groups[key] = {"taxable": 0.0, "vat": 0.0}
        rate_groups[key]["taxable"] += line_total
        rate_groups[key]["vat"] += vat_amount

    total_vat = sum(g["vat"] for g in rate_groups.values())

    tax_total_el = etree.SubElement(parent, _cac("TaxTotal"))
    tax_amount_el = etree.SubElement(tax_total_el, _cbc("TaxAmount"))
    tax_amount_el.set("currencyID", currency)
    tax_amount_el.text = f"{total_vat:.2f}"

    for (vat_rate, vat_cat), group in rate_groups.items():
        subtotal = etree.SubElement(tax_total_el, _cac("TaxSubtotal"))
        taxable_amount_el = etree.SubElement(subtotal, _cbc("TaxableAmount"))
        taxable_amount_el.set("currencyID", currency)
        taxable_amount_el.text = f"{group['taxable']:.2f}"
        sub_tax_amount_el = etree.SubElement(subtotal, _cbc("TaxAmount"))
        sub_tax_amount_el.set("currencyID", currency)
        sub_tax_amount_el.text = f"{group['vat']:.2f}"
        tax_category = etree.SubElement(subtotal, _cac("TaxCategory"))
        tc_id = etree.SubElement(tax_category, _cbc("ID"))
        tc_id.text = vat_cat
        tc_percent = etree.SubElement(tax_category, _cbc("Percent"))
        tc_percent.text = f"{vat_rate:.2f}"
        tc_scheme = etree.SubElement(tax_category, _cac("TaxScheme"))
        tc_scheme_id = etree.SubElement(tc_scheme, _cbc("ID"))
        tc_scheme_id.text = "VAT"


def _add_legal_monetary_total(
    parent: etree._Element,
    currency: str,
    subtotal: float,
    vat_amount: float,
    total: float,
) -> None:
    lmt = etree.SubElement(parent, _cac("LegalMonetaryTotal"))
    line_extension = etree.SubElement(lmt, _cbc("LineExtensionAmount"))
    line_extension.set("currencyID", currency)
    line_extension.text = f"{subtotal:.2f}"
    tax_exclusive = etree.SubElement(lmt, _cbc("TaxExclusiveAmount"))
    tax_exclusive.set("currencyID", currency)
    tax_exclusive.text = f"{subtotal:.2f}"
    tax_inclusive = etree.SubElement(lmt, _cbc("TaxInclusiveAmount"))
    tax_inclusive.set("currencyID", currency)
    tax_inclusive.text = f"{total:.2f}"
    payable = etree.SubElement(lmt, _cbc("PayableAmount"))
    payable.set("currencyID", currency)
    payable.text = f"{total:.2f}"


def _add_invoice_line(
    parent: etree._Element,
    currency: str,
    line: dict,
) -> None:
    line_el = etree.SubElement(parent, _cac("InvoiceLine"))
    id_el = etree.SubElement(line_el, _cbc("ID"))
    id_el.text = str(line.get("line_number", 1))

    invoiced_qty = etree.SubElement(line_el, _cbc("InvoicedQuantity"))
    invoiced_qty.set("unitCode", str(line.get("unit_code", "H87")))
    invoiced_qty.text = f"{float(line.get('quantity', 1)):.3f}"

    line_ext = etree.SubElement(line_el, _cbc("LineExtensionAmount"))
    line_ext.set("currencyID", currency)
    line_ext.text = f"{float(line.get('line_total', 0)):.2f}"

    item = etree.SubElement(line_el, _cac("Item"))
    desc = etree.SubElement(item, _cbc("Description"))
    desc.text = str(line.get("description", ""))
    item_name = etree.SubElement(item, _cbc("Name"))
    item_name.text = str(line.get("description", ""))

    classified_tc = etree.SubElement(item, _cac("ClassifiedTaxCategory"))
    ctc_id = etree.SubElement(classified_tc, _cbc("ID"))
    ctc_id.text = str(line.get("vat_category_code", "S"))
    ctc_percent = etree.SubElement(classified_tc, _cbc("Percent"))
    ctc_percent.text = f"{float(line.get('vat_rate', 19.0)):.2f}"
    ctc_scheme = etree.SubElement(classified_tc, _cac("TaxScheme"))
    ctc_scheme_id = etree.SubElement(ctc_scheme, _cbc("ID"))
    ctc_scheme_id.text = "VAT"

    price = etree.SubElement(line_el, _cac("Price"))
    price_amount = etree.SubElement(price, _cbc("PriceAmount"))
    price_amount.set("currencyID", currency)
    price_amount.text = f"{float(line.get('unit_price', 0)):.2f}"


def build_invoice_xml(
    invoice: dict,
    org: dict,
    client: dict,
    lines: list[dict],
) -> str:
    """Generate a UBL 2.1 Invoice XML string compliant with RO_CIUS.

    Parameters
    ----------
    invoice:
        Invoice record from the ``invoices`` table.
    org:
        Organization record (supplier).
    client:
        Client record (buyer).
    lines:
        List of ``invoice_lines`` records.

    Returns
    -------
    str
        UTF-8 XML string.
    """
    root = etree.Element(f"{{{NS_INVOICE}}}Invoice", nsmap=NSMAP)

    _text(root, "CustomizationID", CUSTOMIZATION_ID)
    _text(root, "ProfileID", PROFILE_ID)
    _text(root, "ID", str(invoice.get("invoice_number", "")))
    _text(root, "IssueDate", str(invoice.get("issue_date", "")))
    _text(root, "DueDate", str(invoice.get("due_date", "")))
    _text(root, "InvoiceTypeCode", "380")

    currency = str(invoice.get("currency", "RON"))
    _text(root, "DocumentCurrencyCode", currency)

    # Supplier
    _add_party(
        parent=root,
        wrapper_tag="AccountingSupplierParty",
        name=str(org.get("company_name", "")),
        cui=str(org.get("cui", "")) or None,
        address_street=org.get("address_street"),
        address_city=org.get("address_city"),
        address_county=org.get("address_county"),
        address_postal_code=org.get("address_postal_code"),
        vat_registered=bool(org.get("vat_registered", False)),
    )

    # Buyer
    _add_party(
        parent=root,
        wrapper_tag="AccountingCustomerParty",
        name=str(client.get("name", "")),
        cui=str(client.get("cui", "")) if client.get("cui") else None,
        address_street=client.get("address_street"),
        address_city=client.get("address_city"),
        address_county=client.get("address_county"),
        address_postal_code=client.get("address_postal_code"),
        vat_registered=False,
    )

    # Compute totals from lines
    subtotal = sum(float(ln.get("line_total", 0)) for ln in lines)
    vat_amount = sum(
        round(float(ln.get("line_total", 0)) * float(ln.get("vat_rate", 19.0)) / 100, 2)
        for ln in lines
    )
    total = subtotal + vat_amount

    # TaxTotal
    _add_tax_total(root, currency, lines)

    # LegalMonetaryTotal
    _add_legal_monetary_total(root, currency, subtotal, vat_amount, total)

    # InvoiceLines
    for line in lines:
        _add_invoice_line(root, currency, line)

    xml_bytes: bytes = etree.tostring(
        root,
        pretty_print=True,
        xml_declaration=True,
        encoding="UTF-8",
    )
    return xml_bytes.decode("utf-8")
