export const INVOICE_STATUS = {
  DRAFT: "draft",
  GENERATED: "generated",
  UPLOADED: "uploaded",
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  ARCHIVED: "archived",
} as const

export const VAT_RATES = [0, 5, 9, 19] as const

export const UNIT_CODES = {
  H87: "Bucată (pcs)",
  HUR: "Oră (h)",
  DAY: "Zi",
  MON: "Lună",
  KGM: "Kilogram (kg)",
  MTR: "Metru (m)",
  LTR: "Litru (l)",
  MTK: "Metru pătrat (m²)",
} as const

export const CURRENCY = "RON"
