-- Add admin-uploaded QR code image for crypto wallets.
ALTER TABLE crypto_wallets ADD COLUMN qr_code_url TEXT;
