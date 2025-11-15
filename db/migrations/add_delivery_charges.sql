-- Migration: Add delivery charges columns to orders table
-- This migration adds columns to track delivery charges and delivery boy earnings

-- delivery_charge column already exists, so only add the missing ones

-- Add delivery_boy_earning column
ALTER TABLE orders ADD delivery_boy_earning DECIMAL(10, 2) DEFAULT 0.00;

-- Add delivery_charge_paid column
ALTER TABLE orders ADD delivery_charge_paid BOOLEAN DEFAULT FALSE;
