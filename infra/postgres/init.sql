-- Clean reset of existing schemas
DROP SCHEMA IF EXISTS order_schema CASCADE;
DROP SCHEMA IF EXISTS catalog_pricing_schema CASCADE;
DROP SCHEMA IF EXISTS auth_schema CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SCHEMA 1: auth_schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS auth_schema;

CREATE TABLE auth_schema.users (
                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                   email VARCHAR(255) UNIQUE NOT NULL,
                                   password_hash VARCHAR(255) NOT NULL,
                                   full_name VARCHAR(150) NOT NULL,
                                   phone VARCHAR(20) NOT NULL,
                                   default_address TEXT,
                                   role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'CUSTOMER')),
                                   is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                                   updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE auth_schema.customer_vat_profiles (
                                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                   user_id UUID NOT NULL REFERENCES auth_schema.users(id) ON DELETE CASCADE,
                                                   company_name VARCHAR(255) NOT NULL,
                                                   tax_code VARCHAR(50) NOT NULL,
                                                   company_address TEXT NOT NULL,
                                                   is_default BOOLEAN NOT NULL DEFAULT TRUE,
                                                   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON auth_schema.users(email);
CREATE INDEX idx_vat_profiles_user_id ON auth_schema.customer_vat_profiles(user_id);

-- ============================================================================
-- SCHEMA 2: catalog_pricing_schema
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS catalog_pricing_schema;

CREATE TABLE catalog_pricing_schema.categories (
                                                   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                   parent_id UUID REFERENCES catalog_pricing_schema.categories(id) ON DELETE SET NULL,
                                                   name VARCHAR(150) NOT NULL,
                                                   slug VARCHAR(160) UNIQUE NOT NULL,
                                                   display_order INT NOT NULL DEFAULT 0,
                                                   is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE catalog_pricing_schema.materials (
                                                  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                  code VARCHAR(50) UNIQUE NOT NULL,
                                                  name VARCHAR(150) NOT NULL,
                                                  is_metal BOOLEAN NOT NULL DEFAULT TRUE,
                                                  density_kg_m3 DECIMAL(10, 2),
                                                  price_per_kg DECIMAL(12, 2),
                                                  thin_sheet_rate_per_m2 DECIMAL(12, 2) NOT NULL DEFAULT 5000000.00,
                                                  min_thickness_mm DECIMAL(5, 2) NOT NULL DEFAULT 0.20,
                                                  max_thickness_mm DECIMAL(5, 2) NOT NULL DEFAULT 10.00,
                                                  pbr_preview_config JSONB NOT NULL DEFAULT '{"baseColor": "#d4d7d9", "metalness": 0.9, "roughness": 0.25}'::jsonb,
                                                  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE catalog_pricing_schema.processing_methods (
                                                           id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                           code VARCHAR(50) UNIQUE NOT NULL,
                                                           name VARCHAR(150) NOT NULL,
                                                           description TEXT,
                                                           is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE catalog_pricing_schema.material_processing_rules (
                                                                  material_id UUID NOT NULL REFERENCES catalog_pricing_schema.materials(id) ON DELETE CASCADE,
                                                                  processing_method_id UUID NOT NULL REFERENCES catalog_pricing_schema.processing_methods(id) ON DELETE CASCADE,
                                                                  base_lead_time_days INT NOT NULL DEFAULT 7,
                                                                  PRIMARY KEY (material_id, processing_method_id)
);

CREATE TABLE catalog_pricing_schema.products (
                                                 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                                                 category_id UUID NOT NULL REFERENCES catalog_pricing_schema.categories(id),
                                                 material_id UUID REFERENCES catalog_pricing_schema.materials(id),
                                                 processing_method_id UUID REFERENCES catalog_pricing_schema.processing_methods(id),
                                                 sku VARCHAR(80) UNIQUE NOT NULL,
                                                 name VARCHAR(255) NOT NULL,
                                                 slug VARCHAR(260) UNIQUE NOT NULL,
                                                 description TEXT,
                                                 product_type VARCHAR(30) NOT NULL CHECK (product_type IN ('STANDARD_ITEM', 'CUSTOM_TEMPLATE')),
                                                 base_price DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
                                                 default_width_mm DECIMAL(8, 2),
                                                 default_height_mm DECIMAL(8, 2),
                                                 default_thickness_mm DECIMAL(5, 2),
                                                 stock_quantity INT NOT NULL DEFAULT 0,
                                                 images JSONB NOT NULL DEFAULT '[]'::jsonb,
                                                 is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                                 created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE catalog_pricing_schema.pricing_rules (
                                                      rule_key VARCHAR(80) PRIMARY KEY,
                                                      rule_value DECIMAL(14, 4) NOT NULL,
                                                      description VARCHAR(255) NOT NULL,
                                                      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
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

-- ============================================================================
-- SEED DATA: Pricing Rules, Materials, Processing Methods
-- ============================================================================
INSERT INTO catalog_pricing_schema.pricing_rules (rule_key, rule_value, description) VALUES
                                                                                         ('THIN_SHEET_THRESHOLD_MM', 1.0000, 'Max thickness (mm) priced by surface area'),
                                                                                         ('THIN_SHEET_RATE_M2', 5000000.0000, 'VND per m2 for thickness <= 1mm'),
                                                                                         ('THICK_METAL_MULTIPLIER', 5.0000, 'Multiplier applied to (weight * price_per_kg) for metal > 1mm'),
                                                                                         ('BULK_DISCOUNT_MIN_QTY', 1000.0000, 'Minimum quantity for bulk discount'),
                                                                                         ('BULK_DISCOUNT_RATE', 0.1000, '10% discount for >= 1000 units'),
                                                                                         ('VAT_RATE', 0.1000, '10% red VAT invoice rate'),
                                                                                         ('DEPOSIT_RATE', 0.5000, '50% mandatory deposit rate for custom orders');

INSERT INTO catalog_pricing_schema.materials (id, code, name, is_metal, density_kg_m3, price_per_kg, thin_sheet_rate_per_m2, min_thickness_mm, max_thickness_mm, pbr_preview_config) VALUES
                                                                                                                                                                                         ('11111111-1111-1111-1111-111111111101', 'INOX_304', 'Inox 304 (Thép không gỉ 304)', TRUE, 7930.00, 85000.00, 5000000.00, 0.30, 5.00, '{"baseColor": "#dce0e3", "metalness": 0.92, "roughness": 0.22}'),
                                                                                                                                                                                         ('11111111-1111-1111-1111-111111111102', 'INOX_201', 'Inox 201 (Thép không gỉ 201)', TRUE, 7930.00, 55000.00, 5000000.00, 0.30, 5.00, '{"baseColor": "#cfd4d8", "metalness": 0.88, "roughness": 0.28}'),
                                                                                                                                                                                         ('11111111-1111-1111-1111-111111111103', 'NHOM', 'Nhôm (Aluminum)', TRUE, 2700.00, 95000.00, 5000000.00, 0.30, 6.00, '{"baseColor": "#e6e9ec", "metalness": 0.85, "roughness": 0.30}'),
                                                                                                                                                                                         ('11111111-1111-1111-1111-111111111104', 'DONG', 'Đồng (Copper / Brass)', TRUE, 8960.00, 240000.00, 5000000.00, 0.40, 5.00, '{"baseColor": "#d99b52", "metalness": 0.94, "roughness": 0.20}'),
                                                                                                                                                                                         ('11111111-1111-1111-1111-111111111105', 'MICA_DECAL', 'Mica / Decal Công Nghiệp', FALSE, NULL, NULL, 5000000.00, 0.10, 5.00, '{"baseColor": "#f4f6f8", "metalness": 0.05, "roughness": 0.15}');

INSERT INTO catalog_pricing_schema.processing_methods (id, code, name, description) VALUES
                                                                                        ('22222222-2222-2222-2222-222222222201', 'AN_MON', 'Ăn mòn điện hóa / Hóa chất', 'Ăn mòn nội dung chìm trên kim loại và đổ sơn công nghiệp bền màu'),
                                                                                        ('22222222-2222-2222-2222-222222222202', 'KHAC_LASER', 'Khắc Laser Fiber', 'Khắc sắc nét tốc độ cao cho mã QR, số serial, thông số kỹ thuật'),
                                                                                        ('22222222-2222-2222-2222-222222222203', 'IN_UV', 'In UV Phẳng', 'In màu trực tiếp lên bề mặt kim loại, nhôm, mica sắc nét'),
                                                                                        ('22222222-2222-2222-2222-222222222204', 'CAT_CNC', 'Cắt & Phay CNC', 'Cắt tạo hình biên dạng, bo góc, khoan lỗ bắt vít chính xác'),
                                                                                        ('22222222-2222-2222-2222-222222222205', 'SON_PHU', 'Sơn phủ bảo vệ / Sơn tĩnh điện', 'Phủ lớp bảo vệ chống oxy hóa và trầy xước ngoài trời');

-- Material-Process Compatibility Matrix
INSERT INTO catalog_pricing_schema.material_processing_rules (material_id, processing_method_id, base_lead_time_days) VALUES
                                                                                                                          ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 7), -- Inox 304 + Ăn mòn
                                                                                                                          ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222202', 5), -- Inox 304 + Khắc Laser
                                                                                                                          ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222204', 5), -- Inox 304 + Cắt CNC
                                                                                                                          ('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', 7), -- Inox 201 + Ăn mòn
                                                                                                                          ('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222202', 5), -- Inox 201 + Khắc Laser
                                                                                                                          ('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222201', 7), -- Nhôm + Ăn mòn
                                                                                                                          ('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222203', 4), -- Nhôm + In UV
                                                                                                                          ('11111111-1111-1111-1111-111111111103', '22222222-2222-2222-2222-222222222204', 5), -- Nhôm + Cắt CNC
                                                                                                                          ('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222201', 7), -- Đồng + Ăn mòn
                                                                                                                          ('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222204', 6), -- Đồng + Cắt CNC
                                                                                                                          ('11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222203', 3), -- Mica Decal + In UV
                                                                                                                          ('11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222204', 3); -- Mica Decal + Cắt CNC