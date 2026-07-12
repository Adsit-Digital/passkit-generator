-- Migration number: 0001    Initial schema

CREATE TABLE merchants (
	id TEXT PRIMARY KEY,
	slug TEXT NOT NULL UNIQUE,
	name TEXT NOT NULL,
	email TEXT NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE coupons (
	id TEXT PRIMARY KEY,
	merchant_id TEXT NOT NULL REFERENCES merchants(id),
	slug TEXT NOT NULL,
	title TEXT NOT NULL,
	offer TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	terms TEXT NOT NULL DEFAULT '',
	background_color TEXT NOT NULL DEFAULT 'rgb(217,70,40)',
	foreground_color TEXT NOT NULL DEFAULT 'rgb(255,255,255)',
	label_color TEXT NOT NULL DEFAULT 'rgb(255,231,225)',
	expires_at TEXT,
	status TEXT NOT NULL DEFAULT 'active',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	UNIQUE (merchant_id, slug)
);

-- One row per wallet pass issued (per claim). serial doubles as Apple serialNumber
-- and as the value encoded in the redemption QR barcode.
CREATE TABLE passes (
	serial TEXT PRIMARY KEY,
	coupon_id TEXT NOT NULL REFERENCES coupons(id),
	auth_token TEXT NOT NULL,
	platform TEXT NOT NULL DEFAULT 'apple',
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	updated_at TEXT NOT NULL DEFAULT (datetime('now')),
	redeemed_at TEXT
);
CREATE INDEX idx_passes_coupon ON passes(coupon_id);

CREATE TABLE apple_devices (
	device_library_id TEXT PRIMARY KEY,
	push_token TEXT NOT NULL
);

CREATE TABLE apple_registrations (
	device_library_id TEXT NOT NULL REFERENCES apple_devices(device_library_id),
	serial TEXT NOT NULL REFERENCES passes(serial),
	created_at TEXT NOT NULL DEFAULT (datetime('now')),
	PRIMARY KEY (device_library_id, serial)
);
CREATE INDEX idx_apple_registrations_serial ON apple_registrations(serial);

CREATE TABLE redemptions (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	serial TEXT NOT NULL REFERENCES passes(serial),
	coupon_id TEXT NOT NULL,
	redeemed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_redemptions_coupon ON redemptions(coupon_id);
