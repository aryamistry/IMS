-- ============================================================
-- Inventory Management System - MySQL Schema
-- Generated to exactly match server/prisma/schema.prisma
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- Table: roles
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL,
  `description` TEXT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: users
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NULL,
  `email` VARCHAR(100) NULL,
  `password_hash` VARCHAR(255) NULL,
  `role_id` INT NULL,
  `is_active` BOOLEAN NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: product_categories
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `product_categories`;
CREATE TABLE `product_categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `category_name` VARCHAR(100) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: units_of_measure
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `units_of_measure`;
CREATE TABLE `units_of_measure` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `unit_name` VARCHAR(50) NULL,
  `symbol` VARCHAR(10) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: products
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `sku` VARCHAR(100) NULL,
  `category_id` INT NULL,
  `unit_id` INT NULL,
  `reorder_level` INT NULL DEFAULT 0,
  `description` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `category_id` (`category_id`),
  KEY `idx_product_sku` (`sku`),
  KEY `unit_id` (`unit_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`unit_id`) REFERENCES `units_of_measure` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: warehouses
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `warehouses`;
CREATE TABLE `warehouses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NULL,
  `short_code` VARCHAR(10) NULL,
  `address` TEXT NULL,
  `manager_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `manager_id` (`manager_id`),
  CONSTRAINT `warehouses_ibfk_1` FOREIGN KEY (`manager_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: locations
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `locations`;
CREATE TABLE `locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `warehouse_id` INT NULL,
  `location_code` VARCHAR(50) NULL,
  `description` TEXT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_location_warehouse` (`warehouse_id`),
  CONSTRAINT `locations_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: suppliers
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `suppliers`;
CREATE TABLE `suppliers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NULL,
  `email` VARCHAR(100) NULL,
  `phone` VARCHAR(20) NULL,
  `address` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: receipts
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `receipts`;
CREATE TABLE `receipts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reference_no` VARCHAR(50) NULL,
  `supplier_name` VARCHAR(150) NULL,
  `warehouse_id` INT NULL,
  `status` ENUM('draft','waiting','ready','done','cancelled') NULL DEFAULT 'draft',
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `supplier_id` INT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_no` (`reference_no`),
  KEY `created_by` (`created_by`),
  KEY `fk_receipt_supplier` (`supplier_id`),
  KEY `idx_receipt_warehouse` (`warehouse_id`),
  CONSTRAINT `fk_receipt_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `receipts_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `receipts_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: receipt_items
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `receipt_items`;
CREATE TABLE `receipt_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `receipt_id` INT NULL,
  `product_id` INT NULL,
  `location_id` INT NULL,
  `quantity` INT NULL,
  PRIMARY KEY (`id`),
  KEY `location_id` (`location_id`),
  KEY `product_id` (`product_id`),
  KEY `receipt_id` (`receipt_id`),
  CONSTRAINT `receipt_items_ibfk_1` FOREIGN KEY (`receipt_id`) REFERENCES `receipts` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `receipt_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `receipt_items_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: delivery_orders
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `delivery_orders`;
CREATE TABLE `delivery_orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reference_no` VARCHAR(50) NULL,
  `customer_name` VARCHAR(150) NULL,
  `warehouse_id` INT NULL,
  `status` ENUM('draft','waiting','ready','done','cancelled') NULL DEFAULT 'draft',
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_no` (`reference_no`),
  KEY `created_by` (`created_by`),
  KEY `idx_delivery_warehouse` (`warehouse_id`),
  CONSTRAINT `delivery_orders_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `delivery_orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: delivery_items
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `delivery_items`;
CREATE TABLE `delivery_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `delivery_id` INT NULL,
  `product_id` INT NULL,
  `location_id` INT NULL,
  `quantity` INT NULL,
  PRIMARY KEY (`id`),
  KEY `delivery_id` (`delivery_id`),
  KEY `location_id` (`location_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `delivery_items_ibfk_1` FOREIGN KEY (`delivery_id`) REFERENCES `delivery_orders` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `delivery_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `delivery_items_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: transfers
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `transfers`;
CREATE TABLE `transfers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reference_no` VARCHAR(50) NULL,
  `from_warehouse` INT NULL,
  `to_warehouse` INT NULL,
  `status` ENUM('draft','waiting','ready','done','cancelled') NULL DEFAULT 'draft',
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reference_no` (`reference_no`),
  KEY `created_by` (`created_by`),
  KEY `from_warehouse` (`from_warehouse`),
  KEY `to_warehouse` (`to_warehouse`),
  CONSTRAINT `transfers_ibfk_1` FOREIGN KEY (`from_warehouse`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `transfers_ibfk_2` FOREIGN KEY (`to_warehouse`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `transfers_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: transfer_items
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `transfer_items`;
CREATE TABLE `transfer_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `transfer_id` INT NULL,
  `product_id` INT NULL,
  `from_location` INT NULL,
  `to_location` INT NULL,
  `quantity` INT NULL,
  PRIMARY KEY (`id`),
  KEY `from_location` (`from_location`),
  KEY `product_id` (`product_id`),
  KEY `to_location` (`to_location`),
  KEY `transfer_id` (`transfer_id`),
  CONSTRAINT `transfer_items_ibfk_1` FOREIGN KEY (`transfer_id`) REFERENCES `transfers` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `transfer_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `transfer_items_ibfk_3` FOREIGN KEY (`from_location`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `transfer_items_ibfk_4` FOREIGN KEY (`to_location`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: adjustments
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `adjustments`;
CREATE TABLE `adjustments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `reference_no` VARCHAR(50) NULL,
  `warehouse_id` INT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `warehouse_id` (`warehouse_id`),
  CONSTRAINT `adjustments_ibfk_1` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `adjustments_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: adjustment_items
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `adjustment_items`;
CREATE TABLE `adjustment_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `adjustment_id` INT NULL,
  `product_id` INT NULL,
  `location_id` INT NULL,
  `system_qty` INT NULL,
  `actual_qty` INT NULL,
  `difference` INT NULL,
  PRIMARY KEY (`id`),
  KEY `adjustment_id` (`adjustment_id`),
  KEY `location_id` (`location_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `adjustment_items_ibfk_1` FOREIGN KEY (`adjustment_id`) REFERENCES `adjustments` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `adjustment_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `adjustment_items_ibfk_3` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: stock_balances
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `stock_balances`;
CREATE TABLE `stock_balances` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NULL,
  `location_id` INT NULL,
  `quantity` INT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_product_location` (`product_id`, `location_id`),
  KEY `idx_stock_product_location` (`product_id`, `location_id`),
  KEY `location_id` (`location_id`),
  CONSTRAINT `stock_balances_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `stock_balances_ibfk_2` FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------
-- Table: stock_moves
-- ------------------------------------------------------------
DROP TABLE IF EXISTS `stock_moves`;
CREATE TABLE `stock_moves` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `product_id` INT NULL,
  `from_location` INT NULL,
  `to_location` INT NULL,
  `quantity` INT NULL,
  `move_type` ENUM('receipt','delivery','transfer','adjustment') NULL,
  `reference_table` VARCHAR(50) NULL,
  `reference_id` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `stock_moves_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- Seed data (matches server/prisma/seed.ts)
-- ============================================================

INSERT INTO `roles` (`role_name`, `description`) VALUES
('admin', 'System administrator'),
('operator', 'Warehouse operator');

-- Password for the admin user below is 'password123' (bcrypt hash, cost 10)
INSERT INTO `users` (`name`, `email`, `password_hash`, `role_id`) VALUES
('Admin User', 'admin@warehouse.com', '$2a$10$CwTycUXWue0Thq9StjUM0uJ8i8XfnJ8Q6XyN2b7RJmxYzYr2Wtn0y', 1);

INSERT INTO `product_categories` (`category_name`) VALUES
('Electronics'),
('Hardware'),
('Packaging'),
('Tools');

INSERT INTO `units_of_measure` (`unit_name`, `symbol`) VALUES
('Piece', 'pcs'),
('Kilogram', 'kg'),
('Box', 'box'),
('Meter', 'm');

INSERT INTO `warehouses` (`name`, `address`) VALUES
('Main Warehouse', '100 Industrial Ave, Zone A'),
('Secondary Warehouse', '200 Storage Blvd, Zone B');

INSERT INTO `locations` (`warehouse_id`, `location_code`) VALUES
(1, 'Shelf A-01'),
(1, 'Shelf A-02'),
(1, 'Shelf B-01'),
(1, 'Shelf B-02'),
(1, 'Receiving Bay'),
(2, 'Rack 1A'),
(2, 'Rack 1B'),
(2, 'Overflow Area');

INSERT INTO `suppliers` (`name`, `email`, `phone`, `address`) VALUES
('TechParts Global', 'orders@techparts.com', '+1-555-0100', '123 Tech Blvd, CA'),
('MegaHardware Inc', 'supply@megahw.com', '+1-555-0200', '456 Industrial Rd, TX'),
('PackMasters Ltd', 'info@packmasters.com', '+1-555-0300', '789 Logistics Way, NY');

INSERT INTO `products` (`name`, `sku`, `category_id`, `unit_id`, `reorder_level`) VALUES
('Arduino Uno Rev3', 'ELEC-001', 1, 1, 10),
('Raspberry Pi 4 (4GB)', 'ELEC-002', 1, 1, 5),
('Steel Bolt M8x30', 'HW-001', 2, 1, 100),
('Hex Nut M8', 'HW-002', 2, 1, 100),
('Bubble Wrap Roll', 'PKG-001', 3, 4, 20),
('Digital Caliper 150mm', 'TOOL-001', 4, 1, 3);

INSERT INTO `stock_balances` (`product_id`, `location_id`, `quantity`) VALUES
(1, 1, 45),
(2, 1, 8),
(3, 2, 350),
(4, 2, 280),
(5, 3, 15),
(6, 3, 2);

INSERT INTO `stock_moves` (`product_id`, `to_location`, `quantity`, `move_type`, `reference_table`, `reference_id`) VALUES
(1, 1, 45, 'receipt', 'seed', 0),
(2, 1, 8, 'receipt', 'seed', 0),
(3, 2, 350, 'receipt', 'seed', 0),
(4, 2, 280, 'receipt', 'seed', 0),
(5, 3, 15, 'receipt', 'seed', 0),
(6, 3, 2, 'receipt', 'seed', 0);
