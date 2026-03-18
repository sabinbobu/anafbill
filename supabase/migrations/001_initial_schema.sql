-- anafbill Initial Schema
-- Migration: 001_initial_schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: organizations
-- ============================================================
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    cui VARCHAR(20) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    trade_register_nr VARCHAR(50),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_county VARCHAR(5),
    address_postal_code VARCHAR(6),
    vat_registered BOOLEAN DEFAULT false,
    bank_account VARCHAR(34),
    bank_name VARCHAR(100),
    anaf_access_token TEXT,
    anaf_refresh_token TEXT,
    anaf_token_expires_at TIMESTAMPTZ,
    invoice_series VARCHAR(20) DEFAULT 'FACT',
    next_invoice_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own organization"
    ON organizations FOR ALL
    USING (auth.uid() = user_id);

CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_cui ON organizations(cui);

-- ============================================================
-- TABLE: clients
-- ============================================================
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    cui VARCHAR(20),
    name VARCHAR(255) NOT NULL,
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_county VARCHAR(5),
    address_postal_code VARCHAR(6),
    email VARCHAR(255),
    is_company BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access clients in their organization"
    ON clients FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

CREATE INDEX idx_clients_organization_id ON clients(organization_id);
CREATE INDEX idx_clients_cui ON clients(cui);

-- ============================================================
-- TABLE: invoices
-- ============================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    currency VARCHAR(3) DEFAULT 'RON',
    status VARCHAR(20) DEFAULT 'draft',
    invoice_type VARCHAR(5) DEFAULT 'b2b',
    subtotal_amount NUMERIC(12,2) DEFAULT 0,
    vat_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    xml_content TEXT,
    anaf_upload_id VARCHAR(50),
    anaf_download_id VARCHAR(50),
    anaf_response_xml TEXT,
    anaf_error_message TEXT,
    submitted_at TIMESTAMPTZ,
    deadline_date DATE,
    archived_xml_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access invoices in their organization"
    ON invoices FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

CREATE INDEX idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX idx_invoices_client_id ON invoices(client_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_deadline_date ON invoices(deadline_date);
CREATE INDEX idx_invoices_anaf_upload_id ON invoices(anaf_upload_id);
CREATE UNIQUE INDEX idx_invoices_number_per_org ON invoices(organization_id, invoice_number);

-- ============================================================
-- TABLE: invoice_lines
-- ============================================================
CREATE TABLE invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    line_number INTEGER NOT NULL,
    description VARCHAR(500) NOT NULL,
    quantity NUMERIC(10,3) NOT NULL,
    unit_code VARCHAR(10) DEFAULT 'H87',
    unit_price NUMERIC(12,2) NOT NULL,
    vat_rate NUMERIC(5,2) DEFAULT 19.00,
    vat_category_code VARCHAR(5) DEFAULT 'S',
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access lines for their invoices"
    ON invoice_lines FOR ALL
    USING (
        invoice_id IN (
            SELECT i.id FROM invoices i
            JOIN organizations o ON o.id = i.organization_id
            WHERE o.user_id = auth.uid()
        )
    );

CREATE INDEX idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);

-- ============================================================
-- TABLE: chat_messages
-- ============================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(10) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own chat messages"
    ON chat_messages FOR ALL
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE user_id = auth.uid()
        )
    );

CREATE INDEX idx_chat_messages_organization_id ON chat_messages(organization_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- ============================================================
-- TRIGGERS: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
