CREATE DATABASE IF NOT EXISTS products_db;
USE products_db;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  description TEXT NOT NULL,
  brand VARCHAR(100) NULL,
  img VARCHAR(255) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO products (name, price, stock, description, brand, img) VALUES
('Mechanical Keyboard', 59.90, 25, 'Compact 75% mechanical keyboard', 'KeyCo', 'https://example.com/keyboard.jpg'),
('Wireless Mouse', 24.50, 40, 'Ergonomic wireless mouse', 'ClickIt', NULL);
