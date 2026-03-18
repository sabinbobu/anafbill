export interface Client {
  id: string
  organization_id: string
  cui?: string
  name: string
  address_street?: string
  address_city?: string
  address_county?: string
  address_postal_code?: string
  email?: string
  is_company: boolean
  created_at: string
}

export interface CreateClientDto {
  cui?: string
  name: string
  address_street?: string
  address_city?: string
  address_county?: string
  address_postal_code?: string
  email?: string
  is_company?: boolean
}
