export interface DeadlineAlert {
  invoice_id: string
  invoice_number: string
  issue_date: string
  deadline_date: string
  days_remaining: number
  status: string
}

export interface DashboardStats {
  total_invoices: number
  pending_submission: number
  overdue: number
  accepted_this_month: number
  total_value_this_month: number
  upcoming_deadlines: DeadlineAlert[]
}
