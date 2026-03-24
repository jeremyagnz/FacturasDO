-- Esquema de Base de Datos para SaaS de Facturación Electrónica (DGII e-CF)
-- Optimizado para PostgreSQL 15+

-- 1. EXTENSIONES Y TIPOS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos enumerados para consistencia
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');
CREATE TYPE ecf_status AS ENUM ('draft', 'signed', 'sent', 'accepted', 'rejected', 'voided');
CREATE TYPE company_type AS ENUM ('FISICA', 'JURIDICA');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');

-- 2. TABLAS MAESTRAS (SaaS)

CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    invoice_limit INTEGER NOT NULL DEFAULT 100,
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 3. MULTI-TENANCY (Empresas)

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rnc VARCHAR(11) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    commercial_name VARCHAR(255),
    type company_type NOT NULL,
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT rnc_length CHECK (length(rnc) IN (9, 11))
);

CREATE TABLE company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    role user_role NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, company_id)
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    plan_id UUID NOT NULL REFERENCES plans(id),
    status subscription_status DEFAULT 'trialing',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. OPERACIONES (e-CF)

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    rnc_cedula VARCHAR(11) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    sku VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(14, 4) NOT NULL DEFAULT 0.0000,
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 18.00, -- ITBIS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE ecf_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    type_code VARCHAR(2) NOT NULL, -- 31, 32, 33, 34, etc.
    prefix VARCHAR(3) NOT NULL,    -- E31, E32, etc.
    current_value BIGINT NOT NULL DEFAULT 0,
    max_value BIGINT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_id, type_code)
);

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    p12_path TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    ecf_number VARCHAR(13) UNIQUE, -- E310000000001
    type_code VARCHAR(2) NOT NULL,
    status ecf_status DEFAULT 'draft',
    total_itbis DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    security_code VARCHAR(10), -- Código de seguridad DGII
    xml_path TEXT,
    pdf_path TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    description TEXT NOT NULL,
    quantity DECIMAL(12, 4) NOT NULL DEFAULT 1.0000,
    unit_price DECIMAL(14, 4) NOT NULL,
    tax_amount DECIMAL(14, 2) NOT NULL,
    subtotal DECIMAL(14, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dgii_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    track_id VARCHAR(100), -- ID de seguimiento de DGII
    status_code VARCHAR(10),
    message TEXT,
    raw_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. ÍNDICES PARA RENDIMIENTO Y MULTI-TENANCY

CREATE INDEX idx_company_users_user ON company_users(user_id);
CREATE INDEX idx_company_users_company ON company_users(company_id);
CREATE INDEX idx_invoices_company_status ON invoices(company_id, status);
CREATE INDEX idx_invoices_ecf ON invoices(ecf_number);
CREATE INDEX idx_clients_company_rnc ON clients(company_id, rnc_cedula);
CREATE INDEX idx_products_company_sku ON products(company_id, sku);
CREATE INDEX idx_audit_company ON audit_logs(company_id, created_at DESC);

-- 6. RESTRICCIONES ADICIONALES (Constraints)

ALTER TABLE invoice_items ADD CONSTRAINT positive_quantity CHECK (quantity > 0);
ALTER TABLE invoices ADD CONSTRAINT positive_total CHECK (total_amount >= 0);
