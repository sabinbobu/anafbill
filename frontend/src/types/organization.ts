export interface Organization {
  id: string
  user_id: string
  cui: string
  company_name: string
  trade_register_nr?: string
  address_street?: string
  address_city?: string
  address_county?: string
  address_postal_code?: string
  vat_registered: boolean
  bank_account?: string
  bank_name?: string
  anaf_token_expires_at?: string
  invoice_series: string
  next_invoice_number: number
  created_at: string
  updated_at: string
}
