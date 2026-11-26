-- V1 baseline for order_schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- SCHEMA 3: order_schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS order_schema;

CREATE TABLE order_schema.carts (
                                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                    customer_id UUID UNIQUE NOT NULL,
                                    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_schema.cart_items (
                                         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                         cart_id UUID NOT NULL REFERENCES order_schema.carts(id) ON DELETE CASCADE,
                                         product_id UUID,
                                         item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('STANDARD_ITEM', 'CUSTOM_ITEM')),
                                         material_id UUID,
                                         processing_method_id UUID,
                                         width_mm DECIMAL(8, 2),
                                         height_mm DECIMAL(8, 2),
                                         thickness_mm DECIMAL(5, 2),
                                         quantity INT NOT NULL CHECK (quantity > 0),
                                         estimated_unit_price DECIMAL(14, 2) NOT NULL,
                                         design_file_url TEXT,
                                         customer_note TEXT,
                                         created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_schema.orders (
                                     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                     order_code VARCHAR(30) UNIQUE NOT NULL,
                                     customer_id UUID NOT NULL,
                                     order_type VARCHAR(30) NOT NULL CHECK (order_type IN ('DIRECT_STORE_ORDER', 'CUSTOM_QUOTE_ORDER')),
                                     status VARCHAR(30) NOT NULL CHECK (status IN (
                                                                                   'QUOTE_PENDING',
                                                                                   'QUOTE_APPROVED',
                                                                                   'PROTOTYPING',
                                                                                   'AWAITING_DEPOSIT',
                                                                                   'IN_PRODUCTION',
                                                                                   'READY_FOR_DELIVERY',
                                                                                   'COMPLETED',
                                                                                   'CANCELLED'
                                         )),
                                     recipient_name VARCHAR(150) NOT NULL,
                                     recipient_phone VARCHAR(20) NOT NULL,
                                     shipping_address TEXT NOT NULL,
                                     customer_note TEXT,
                                     subtotal_amount DECIMAL(14, 2) NOT NULL,
                                     discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                                     vat_rate DECIMAL(4, 2) NOT NULL DEFAULT 0.00,
                                     vat_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                                     total_amount DECIMAL(14, 2) NOT NULL,
                                     deposit_required_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                                     paid_amount DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                                     requires_vat_invoice BOOLEAN NOT NULL DEFAULT FALSE,
                                     vat_company_name VARCHAR(255),
                                     vat_tax_code VARCHAR(50),
                                     vat_company_address TEXT,
                                     vat_invoice_number VARCHAR(50),
                                     production_worker_note VARCHAR(255),
                                     estimated_completion_date DATE,
                                     admin_internal_note TEXT,
                                     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                                     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_schema.order_items (
                                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                          order_id UUID NOT NULL REFERENCES order_schema.orders(id) ON DELETE CASCADE,
                                          product_id UUID,
                                          item_name VARCHAR(255) NOT NULL,
                                          material_id UUID,
                                          material_name_snapshot VARCHAR(150),
                                          processing_method_id UUID,
                                          processing_name_snapshot VARCHAR(150),
                                          width_mm DECIMAL(8, 2),
                                          height_mm DECIMAL(8, 2),
                                          thickness_mm DECIMAL(5, 2),
                                          calculated_weight_kg DECIMAL(10, 4),
                                          system_unit_price DECIMAL(14, 2) NOT NULL,
                                          final_unit_price DECIMAL(14, 2) NOT NULL,
                                          quantity INT NOT NULL CHECK (quantity > 0),
                                          line_total DECIMAL(14, 2) NOT NULL,
                                          design_file_url TEXT,
                                          prototype_image_url TEXT
);

CREATE TABLE order_schema.payment_transactions (
                                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                   order_id UUID NOT NULL REFERENCES order_schema.orders(id) ON DELETE CASCADE,
                                                   payment_phase VARCHAR(20) NOT NULL CHECK (payment_phase IN ('DEPOSIT_50', 'BALANCE_50', 'FULL_100')),
                                                   payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('BANK_TRANSFER', 'CASH', 'VNPAY_SANDBOX')),
                                                   amount DECIMAL(14, 2) NOT NULL,
                                                   status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED')),
                                                   transaction_ref VARCHAR(120),
                                                   proof_image_url TEXT,
                                                   verified_at TIMESTAMP WITH TIME ZONE,
                                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE order_schema.order_status_logs (
                                                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                order_id UUID NOT NULL REFERENCES order_schema.orders(id) ON DELETE CASCADE,
                                                from_status VARCHAR(30),
                                                to_status VARCHAR(30) NOT NULL,
                                                changed_by_user_id UUID NOT NULL,
                                                note TEXT,
                                                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON order_schema.orders(customer_id);
CREATE INDEX idx_orders_status ON order_schema.orders(status);
CREATE INDEX idx_orders_order_code ON order_schema.orders(order_code);
CREATE INDEX idx_order_items_order_id ON order_schema.order_items(order_id);
CREATE INDEX idx_payments_order_id ON order_schema.payment_transactions(order_id);
