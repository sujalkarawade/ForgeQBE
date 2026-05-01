-- Demo seed data for QBE Explorer
-- Run this against your PostgreSQL instance to get a working demo

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  country VARCHAR(50),
  age INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(100),
  price NUMERIC(10, 2),
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  total_amount NUMERIC(10, 2),
  status VARCHAR(30) DEFAULT 'pending',
  order_date TIMESTAMP DEFAULT NOW()
);

-- Seed users
INSERT INTO users (name, email, status, country, age) VALUES
  ('Alice Johnson', 'alice@example.com', 'active', 'US', 28),
  ('Bob Smith', 'bob@example.com', 'active', 'US', 34),
  ('Carol White', 'carol@example.com', 'inactive', 'UK', 25),
  ('David Brown', 'david@example.com', 'active', 'CA', 41),
  ('Eve Davis', 'eve@example.com', 'active', 'US', 30),
  ('Frank Miller', 'frank@example.com', 'suspended', 'AU', 22),
  ('Grace Wilson', 'grace@example.com', 'active', 'US', 35),
  ('Henry Moore', 'henry@example.com', 'active', 'UK', 29)
ON CONFLICT DO NOTHING;

-- Seed products
INSERT INTO products (name, category, price, stock, is_active) VALUES
  ('Laptop Pro 15', 'Electronics', 1299.99, 45, TRUE),
  ('Wireless Mouse', 'Electronics', 29.99, 200, TRUE),
  ('Standing Desk', 'Furniture', 499.00, 12, TRUE),
  ('USB-C Hub', 'Electronics', 49.99, 150, TRUE),
  ('Office Chair', 'Furniture', 349.00, 8, TRUE),
  ('Monitor 27"', 'Electronics', 399.99, 30, TRUE),
  ('Keyboard Mech', 'Electronics', 89.99, 75, FALSE),
  ('Desk Lamp', 'Furniture', 39.99, 60, TRUE)
ON CONFLICT DO NOTHING;

-- Seed orders
INSERT INTO orders (user_id, product_id, quantity, total_amount, status, order_date) VALUES
  (1, 1, 1, 1299.99, 'shipped', NOW() - INTERVAL '5 days'),
  (1, 2, 2, 59.98, 'delivered', NOW() - INTERVAL '10 days'),
  (2, 3, 1, 499.00, 'pending', NOW() - INTERVAL '1 day'),
  (3, 4, 3, 149.97, 'shipped', NOW() - INTERVAL '3 days'),
  (4, 5, 1, 349.00, 'delivered', NOW() - INTERVAL '15 days'),
  (5, 6, 1, 399.99, 'pending', NOW() - INTERVAL '2 days'),
  (6, 2, 1, 29.99, 'cancelled', NOW() - INTERVAL '7 days'),
  (7, 1, 2, 2599.98, 'shipped', NOW() - INTERVAL '4 days'),
  (8, 8, 1, 39.99, 'delivered', NOW() - INTERVAL '20 days'),
  (1, 6, 1, 399.99, 'pending', NOW())
ON CONFLICT DO NOTHING;
