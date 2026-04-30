-- ============================================================
-- Munera Database Schema v1.0
-- Extensions and Enums
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums
CREATE TYPE user_role AS ENUM ('staff', 'sv', 'admin');
CREATE TYPE auth_method AS ENUM ('line', 'email');
CREATE TYPE attendance_type AS ENUM ('clock_in', 'clock_out', 'break_start', 'break_end');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'on_hold');
CREATE TYPE expense_status AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'on_hold', 'paid');
CREATE TYPE overtime_status AS ENUM ('pre_detected', 'acknowledged', 'approved', 'rejected');
CREATE TYPE shift_type AS ENUM ('day', 'night', 'flex', 'custom');
CREATE TYPE audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');
