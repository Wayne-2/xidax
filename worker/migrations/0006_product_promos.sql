-- Migration 0006: Product promo codes
--
-- Each product can carry one promo code with a percentage discount.
-- Orders store the applied promo so history is self-describing.

ALTER TABLE products ADD COLUMN promo_code TEXT;
ALTER TABLE products ADD COLUMN promo_discount REAL NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN promo_enabled INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS products_promo_code_idx ON products (promo_code);

ALTER TABLE orders ADD COLUMN promo_code TEXT;
ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0;
