export type InvoiceStatus =
  | "draft"
  | "generated"
  | "uploaded"
  | "pending"
  | "accepted"
  | "rejected"
  | "archived"

export interface InvoiceLine {
  id: string
  invoice_id: string
  line_number: number
  description: string
  quantity: number
  unit_code: string
  unit_price: number
  vat_rate: number
  vat_category_code: string
  line_total: number
}

export interface Invoice {
  id: string
  organization_id: string
  client_id: string
  invoice_number: string
  issue_date: string
  due_date: string
  currency: string
  status: InvoiceStatus
  invoice_type: "b2b" | "b2c" | "b2g"
  subtotal_amount: number
  vat_amount: number
  total_amount: number
  xml_content?: string
  anaf_upload_id?: string
  anaf_download_id?: string
  anaf_error_message?: string
  submitted_at?: string
  deadline_date?: string
  notes?: string
  created_at: string
  updated_at: string
  lines?: InvoiceLine[]
}

export interface CreateInvoiceDto {
  client_id: string
  issue_date: string
  due_date: string
  currency?: string
  invoice_type?: "b2b" | "b2c" | "b2g"
  notes?: string
  lines: Omit<InvoiceLine, "id" | "invoice_id">[]
}
