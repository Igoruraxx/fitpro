-- ============================================================================
-- FITPRO DATABASE SCHEMA - COMPLETE REBUILD FROM SCRATCH
-- ============================================================================
-- This migration drops all existing tables and recreates them with:
-- - Proper constraints and foreign keys
-- - Row Level Security (RLS) policies
-- - Indexes for performance
-- - CHECK constraints for business logic
-- - Clean, normalized structure
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING TABLES AND TYPES (Clean Slate)
-- ============================================================================

DROP TABLE IF EXISTS "bioimpedanceExams" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "progressPhotos" CASCADE;
DROP TABLE IF EXISTS "bodyMeasurements" CASCADE;
DROP TABLE IF EXISTS "appointments" CASCADE;
DROP TABLE IF EXISTS "clients" CASCADE;
DROP TABLE IF EXISTS "authTokens" CASCADE;
DROP TABLE IF EXISTS "auth_tokens" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- Drop all enums
DROP TYPE IF EXISTS "transaction_status" CASCADE;
DROP TYPE IF EXISTS "transaction_type" CASCADE;
DROP TYPE IF EXISTS "photo_type" CASCADE;
DROP TYPE IF EXISTS "recurrence_type" CASCADE;
DROP TYPE IF EXISTS "appointment_status" CASCADE;
DROP TYPE IF EXISTS "plan_type" CASCADE;
DROP TYPE IF EXISTS "client_status" CASCADE;
DROP TYPE IF EXISTS "gender" CASCADE;
DROP TYPE IF EXISTS "subscription_status" CASCADE;
DROP TYPE IF EXISTS "subscription_plan" CASCADE;
DROP TYPE IF EXISTS "role" CASCADE;

-- ============================================================================
-- STEP 2: CREATE ALL ENUMS
-- ============================================================================

CREATE TYPE "role" AS ENUM('user', 'admin');
CREATE TYPE "subscription_plan" AS ENUM('free', 'basic', 'pro', 'premium');
CREATE TYPE "subscription_status" AS ENUM('active', 'inactive', 'trial', 'cancelled');
CREATE TYPE "gender" AS ENUM('male', 'female', 'other');
CREATE TYPE "client_status" AS ENUM('active', 'inactive', 'trial');
CREATE TYPE "plan_type" AS ENUM('monthly', 'package', 'consulting');
CREATE TYPE "appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');
CREATE TYPE "recurrence_type" AS ENUM('none', 'daily', 'weekly', 'biweekly', 'monthly');
CREATE TYPE "photo_type" AS ENUM('front', 'back', 'side_left', 'side_right', 'other');
CREATE TYPE "transaction_type" AS ENUM('income', 'expense');
CREATE TYPE "transaction_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');

-- ============================================================================
-- STEP 3: CREATE USERS TABLE (Trainers/Admins)
-- ============================================================================

CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  
  -- Authentication fields
  "openId" VARCHAR(64) UNIQUE,
  "email" VARCHAR(320) UNIQUE,
  "passwordHash" TEXT,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  "googleId" VARCHAR(255) UNIQUE,
  "loginMethod" VARCHAR(64),
  
  -- Profile fields
  "name" TEXT,
  "role" "role" NOT NULL DEFAULT 'user',
  "phone" VARCHAR(20),
  "photoUrl" TEXT,
  "specialties" TEXT,
  "bio" TEXT,
  "cref" VARCHAR(20),
  
  -- Subscription fields
  "subscriptionPlan" "subscription_plan" NOT NULL DEFAULT 'free',
  "subscriptionStatus" "subscription_status" NOT NULL DEFAULT 'trial',
  "subscriptionExpiresAt" TIMESTAMP,
  "proSource" VARCHAR(20),
  "proExpiresAt" TIMESTAMP,
  "trialRequestedAt" TIMESTAMP,
  
  -- AbacatePay integration
  "abacatepayCustomerId" VARCHAR(255) UNIQUE,
  "abacatepaySubscriptionId" VARCHAR(255) UNIQUE,
  "planStartAt" TIMESTAMP,
  "planExpiresAt" TIMESTAMP,
  "planGrantedBy" INTEGER,
  "lastPaymentId" VARCHAR(255),
  "lastPaymentDate" TIMESTAMP,
  "lastPaymentAmount" DECIMAL(10, 2),
  
  -- Limits and metadata
  "maxClients" INTEGER NOT NULL DEFAULT 5,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT "check_email_or_openid_or_googleid" 
    CHECK ("email" IS NOT NULL OR "openId" IS NOT NULL OR "googleId" IS NOT NULL),
  CONSTRAINT "check_max_clients_positive" 
    CHECK ("maxClients" > 0),
  CONSTRAINT "check_pro_source" 
    CHECK ("proSource" IS NULL OR "proSource" IN ('trial', 'payment', 'courtesy'))
);

-- Add self-referencing foreign key after table creation
ALTER TABLE "users" 
  ADD CONSTRAINT "users_planGrantedBy_fkey" 
  FOREIGN KEY ("planGrantedBy") 
  REFERENCES "users"("id") 
  ON DELETE SET NULL;

-- ============================================================================
-- STEP 4: CREATE AUTH TOKENS TABLE
-- ============================================================================

CREATE TABLE "authTokens" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "type" VARCHAR(50) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT "authTokens_userId_fkey" 
    FOREIGN KEY ("userId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
    
  -- Constraints
  CONSTRAINT "check_token_type" 
    CHECK ("type" IN ('email_confirmation', 'password_reset'))
);

-- ============================================================================
-- STEP 5: CREATE CLIENTS TABLE
-- ============================================================================

CREATE TABLE "clients" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER NOT NULL,
  
  -- Basic info
  "name" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(20),
  "birthDate" DATE,
  "gender" "gender",
  "photoUrl" TEXT,
  "status" "client_status" NOT NULL DEFAULT 'active',
  
  -- Plan configuration
  "planType" "plan_type" NOT NULL DEFAULT 'monthly',
  
  -- Monthly plan fields
  "monthlyFee" DECIMAL(10, 2),
  "paymentDay" INTEGER,
  
  -- Package plan fields
  "packageSessions" INTEGER,
  "sessionsRemaining" INTEGER,
  "packageValue" DECIMAL(10, 2),
  
  -- Weekly schedule (monthly/package plans only)
  "sessionsPerWeek" INTEGER,
  "sessionDays" VARCHAR(20),
  "sessionTime" VARCHAR(5),
  "sessionTimesPerDay" TEXT,
  "sessionDuration" INTEGER NOT NULL DEFAULT 60,
  
  -- Prepaid/advance payment
  "prepaidValue" DECIMAL(10, 2),
  "prepaidDueDate" DATE,
  
  -- Renewal tracking
  "renovationHistory" TEXT,
  
  -- Metadata
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT "clients_trainerId_fkey" 
    FOREIGN KEY ("trainerId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
    
  -- Constraints
  CONSTRAINT "check_payment_day_valid" 
    CHECK ("paymentDay" IS NULL OR ("paymentDay" >= 1 AND "paymentDay" <= 31)),
  CONSTRAINT "check_sessions_remaining_valid" 
    CHECK ("sessionsRemaining" IS NULL OR "sessionsRemaining" >= 0),
  CONSTRAINT "check_session_duration_positive" 
    CHECK ("sessionDuration" > 0)
);

-- ============================================================================
-- STEP 6: CREATE APPOINTMENTS TABLE
-- ============================================================================

CREATE TABLE "appointments" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER NOT NULL,
  "clientId" INTEGER,
  "guestName" VARCHAR(255),
  
  -- Schedule
  "date" DATE NOT NULL,
  "startTime" VARCHAR(5) NOT NULL,
  "duration" INTEGER NOT NULL DEFAULT 60,
  
  -- Status and notes
  "status" "appointment_status" NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "muscleGroups" TEXT,
  
  -- Recurrence
  "recurrenceGroupId" VARCHAR(36),
  "recurrenceType" "recurrence_type" NOT NULL DEFAULT 'none',
  "recurrenceDays" VARCHAR(20),
  
  -- Metadata
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT "appointments_trainerId_fkey" 
    FOREIGN KEY ("trainerId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
  CONSTRAINT "appointments_clientId_fkey" 
    FOREIGN KEY ("clientId") 
    REFERENCES "clients"("id") 
    ON DELETE CASCADE,
    
  -- Constraints
  CONSTRAINT "check_client_or_guest" 
    CHECK ("clientId" IS NOT NULL OR "guestName" IS NOT NULL),
  CONSTRAINT "check_duration_positive" 
    CHECK ("duration" > 0)
);

-- ============================================================================
-- STEP 7: CREATE BODY MEASUREMENTS TABLE
-- ============================================================================

CREATE TABLE "bodyMeasurements" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER NOT NULL,
  "clientId" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  
  -- Measurements
  "weight" DECIMAL(5, 2),
  "height" DECIMAL(5, 2),
  "bodyFat" DECIMAL(5, 2),
  "chest" DECIMAL(5, 2),
  "waist" DECIMAL(5, 2),
  "hips" DECIMAL(5, 2),
  "leftArm" DECIMAL(5, 2),
  "rightArm" DECIMAL(5, 2),
  "leftThigh" DECIMAL(5, 2),
  "rightThigh" DECIMAL(5, 2),
  "leftCalf" DECIMAL(5, 2),
  "rightCalf" DECIMAL(5, 2),
  
  -- Notes
  "notes" TEXT,
  
  -- Metadata
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT "bodyMeasurements_trainerId_fkey" 
    FOREIGN KEY ("trainerId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
  CONSTRAINT "bodyMeasurements_clientId_fkey" 
    FOREIGN KEY ("clientId") 
    REFERENCES "clients"("id") 
    ON DELETE CASCADE,
    
  -- Constraints
  CONSTRAINT "check_measurements_positive" 
    CHECK (
      ("weight" IS NULL OR "weight" > 0) AND
      ("height" IS NULL OR "height" > 0) AND
      ("bodyFat" IS NULL OR ("bodyFat" >= 0 AND "bodyFat" <= 100))
    )
);

-- ============================================================================
-- STEP 8: CREATE PROGRESS PHOTOS TABLE
-- ============================================================================

CREATE TABLE "progressPhotos" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER NOT NULL,
  "clientId" INTEGER NOT NULL,
  "photoUrl" TEXT NOT NULL,
  "photoType" "photo_type" NOT NULL DEFAULT 'front',
  "date" DATE NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT "progressPhotos_trainerId_fkey" 
    FOREIGN KEY ("trainerId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
  CONSTRAINT "progressPhotos_clientId_fkey" 
    FOREIGN KEY ("clientId") 
    REFERENCES "clients"("id") 
    ON DELETE CASCADE
);

-- ============================================================================
-- STEP 9: CREATE TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE "transactions" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER NOT NULL,
  "clientId" INTEGER,
  "type" "transaction_type" NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(10, 2) NOT NULL,
  "date" DATE NOT NULL,
  "dueDate" DATE,
  "paidAt" DATE,
  "status" "transaction_status" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT "transactions_trainerId_fkey" 
    FOREIGN KEY ("trainerId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
  CONSTRAINT "transactions_clientId_fkey" 
    FOREIGN KEY ("clientId") 
    REFERENCES "clients"("id") 
    ON DELETE SET NULL,
    
  -- Constraints
  CONSTRAINT "check_amount_positive" 
    CHECK ("amount" > 0)
);

-- ============================================================================
-- STEP 10: CREATE BIOIMPEDANCE EXAMS TABLE
-- ============================================================================

CREATE TABLE "bioimpedanceExams" (
  "id" SERIAL PRIMARY KEY,
  "trainerId" INTEGER NOT NULL,
  "clientId" INTEGER NOT NULL,
  "date" DATE NOT NULL,
  
  -- Core measurements
  "weight" DECIMAL(6, 2),
  "muscleMass" DECIMAL(6, 2),
  "musclePct" DECIMAL(5, 2),
  "bodyFatPct" DECIMAL(5, 2),
  "visceralFat" DECIMAL(5, 1),
  
  -- Additional standard measurements
  "bmi" DECIMAL(5, 2),
  "fatMass" DECIMAL(6, 2),
  "leanMass" DECIMAL(6, 2),
  "muscleRate" DECIMAL(5, 2),
  "skeletalMuscleMass" DECIMAL(6, 2),
  "boneMass" DECIMAL(6, 2),
  "proteinMass" DECIMAL(6, 2),
  "proteinPct" DECIMAL(5, 2),
  "moistureContent" DECIMAL(6, 2),
  "bodyWaterPct" DECIMAL(5, 2),
  "subcutaneousFatPct" DECIMAL(5, 2),
  "bmr" DECIMAL(7, 2),
  "metabolicAge" INTEGER,
  "whr" DECIMAL(5, 3),
  "idealWeight" DECIMAL(6, 2),
  "obesityLevel" VARCHAR(50),
  "bodyType" VARCHAR(50),
  
  -- Flexible measurements (JSON)
  "perimetria" TEXT,
  "dobras" TEXT,
  
  -- Report
  "imageUrl" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT "bioimpedanceExams_trainerId_fkey" 
    FOREIGN KEY ("trainerId") 
    REFERENCES "users"("id") 
    ON DELETE CASCADE,
  CONSTRAINT "bioimpedanceExams_clientId_fkey" 
    FOREIGN KEY ("clientId") 
    REFERENCES "clients"("id") 
    ON DELETE CASCADE,
    
  -- Constraints
  CONSTRAINT "check_bioimpedance_values" 
    CHECK (
      ("weight" IS NULL OR "weight" > 0) AND
      ("bodyFatPct" IS NULL OR ("bodyFatPct" >= 0 AND "bodyFatPct" <= 100)) AND
      ("musclePct" IS NULL OR ("musclePct" >= 0 AND "musclePct" <= 100))
    )
);

-- ============================================================================
-- STEP 11: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users indexes
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_users_openId" ON "users"("openId");
CREATE INDEX "idx_users_googleId" ON "users"("googleId");
CREATE INDEX "idx_users_role" ON "users"("role");
CREATE INDEX "idx_users_subscriptionPlan" ON "users"("subscriptionPlan");

-- Auth tokens indexes
CREATE INDEX "idx_authTokens_userId" ON "authTokens"("userId");
CREATE INDEX "idx_authTokens_token" ON "authTokens"("token");
CREATE INDEX "idx_authTokens_type_expiresAt" ON "authTokens"("type", "expiresAt");

-- Clients indexes
CREATE INDEX "idx_clients_trainerId" ON "clients"("trainerId");
CREATE INDEX "idx_clients_status" ON "clients"("status");
CREATE INDEX "idx_clients_trainerId_status" ON "clients"("trainerId", "status");

-- Appointments indexes
CREATE INDEX "idx_appointments_trainerId" ON "appointments"("trainerId");
CREATE INDEX "idx_appointments_clientId" ON "appointments"("clientId");
CREATE INDEX "idx_appointments_date" ON "appointments"("date");
CREATE INDEX "idx_appointments_status" ON "appointments"("status");
CREATE INDEX "idx_appointments_trainerId_date" ON "appointments"("trainerId", "date");
CREATE INDEX "idx_appointments_recurrenceGroupId" ON "appointments"("recurrenceGroupId");

-- Body measurements indexes
CREATE INDEX "idx_bodyMeasurements_trainerId" ON "bodyMeasurements"("trainerId");
CREATE INDEX "idx_bodyMeasurements_clientId" ON "bodyMeasurements"("clientId");
CREATE INDEX "idx_bodyMeasurements_date" ON "bodyMeasurements"("date");
CREATE INDEX "idx_bodyMeasurements_clientId_date" ON "bodyMeasurements"("clientId", "date");

-- Progress photos indexes
CREATE INDEX "idx_progressPhotos_trainerId" ON "progressPhotos"("trainerId");
CREATE INDEX "idx_progressPhotos_clientId" ON "progressPhotos"("clientId");
CREATE INDEX "idx_progressPhotos_date" ON "progressPhotos"("date");
CREATE INDEX "idx_progressPhotos_clientId_date" ON "progressPhotos"("clientId", "date");

-- Transactions indexes
CREATE INDEX "idx_transactions_trainerId" ON "transactions"("trainerId");
CREATE INDEX "idx_transactions_clientId" ON "transactions"("clientId");
CREATE INDEX "idx_transactions_date" ON "transactions"("date");
CREATE INDEX "idx_transactions_status" ON "transactions"("status");
CREATE INDEX "idx_transactions_type" ON "transactions"("type");
CREATE INDEX "idx_transactions_trainerId_date" ON "transactions"("trainerId", "date");

-- Bioimpedance exams indexes
CREATE INDEX "idx_bioimpedanceExams_trainerId" ON "bioimpedanceExams"("trainerId");
CREATE INDEX "idx_bioimpedanceExams_clientId" ON "bioimpedanceExams"("clientId");
CREATE INDEX "idx_bioimpedanceExams_date" ON "bioimpedanceExams"("date");
CREATE INDEX "idx_bioimpedanceExams_clientId_date" ON "bioimpedanceExams"("clientId", "date");

-- ============================================================================
-- STEP 12: ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ============================================================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "authTokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bodyMeasurements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "progressPhotos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bioimpedanceExams" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 13: CREATE RLS POLICIES
-- ============================================================================

-- Users: Can read their own profile, admins can read all
CREATE POLICY "users_select_own" ON "users"
  FOR SELECT
  USING (auth.uid()::integer = id OR 
         EXISTS (SELECT 1 FROM "users" WHERE id = auth.uid()::integer AND role = 'admin'));

CREATE POLICY "users_update_own" ON "users"
  FOR UPDATE
  USING (auth.uid()::integer = id OR 
         EXISTS (SELECT 1 FROM "users" WHERE id = auth.uid()::integer AND role = 'admin'));

CREATE POLICY "users_insert_self" ON "users"
  FOR INSERT
  WITH CHECK (true);

-- Auth Tokens: Users can only access their own tokens
CREATE POLICY "authTokens_select_own" ON "authTokens"
  FOR SELECT
  USING (auth.uid()::integer = "userId");

CREATE POLICY "authTokens_insert_own" ON "authTokens"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "userId");

CREATE POLICY "authTokens_delete_own" ON "authTokens"
  FOR DELETE
  USING (auth.uid()::integer = "userId");

-- Clients: Trainers can only access their own clients
CREATE POLICY "clients_select_own" ON "clients"
  FOR SELECT
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "clients_insert_own" ON "clients"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "trainerId");

CREATE POLICY "clients_update_own" ON "clients"
  FOR UPDATE
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "clients_delete_own" ON "clients"
  FOR DELETE
  USING (auth.uid()::integer = "trainerId");

-- Appointments: Trainers can only access their own appointments
CREATE POLICY "appointments_select_own" ON "appointments"
  FOR SELECT
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "appointments_insert_own" ON "appointments"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "trainerId");

CREATE POLICY "appointments_update_own" ON "appointments"
  FOR UPDATE
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "appointments_delete_own" ON "appointments"
  FOR DELETE
  USING (auth.uid()::integer = "trainerId");

-- Body Measurements: Trainers can only access their own data
CREATE POLICY "bodyMeasurements_select_own" ON "bodyMeasurements"
  FOR SELECT
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "bodyMeasurements_insert_own" ON "bodyMeasurements"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "trainerId");

CREATE POLICY "bodyMeasurements_update_own" ON "bodyMeasurements"
  FOR UPDATE
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "bodyMeasurements_delete_own" ON "bodyMeasurements"
  FOR DELETE
  USING (auth.uid()::integer = "trainerId");

-- Progress Photos: Trainers can only access their own data
CREATE POLICY "progressPhotos_select_own" ON "progressPhotos"
  FOR SELECT
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "progressPhotos_insert_own" ON "progressPhotos"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "trainerId");

CREATE POLICY "progressPhotos_update_own" ON "progressPhotos"
  FOR UPDATE
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "progressPhotos_delete_own" ON "progressPhotos"
  FOR DELETE
  USING (auth.uid()::integer = "trainerId");

-- Transactions: Trainers can only access their own data
CREATE POLICY "transactions_select_own" ON "transactions"
  FOR SELECT
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "transactions_insert_own" ON "transactions"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "trainerId");

CREATE POLICY "transactions_update_own" ON "transactions"
  FOR UPDATE
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "transactions_delete_own" ON "transactions"
  FOR DELETE
  USING (auth.uid()::integer = "trainerId");

-- Bioimpedance Exams: Trainers can only access their own data
CREATE POLICY "bioimpedanceExams_select_own" ON "bioimpedanceExams"
  FOR SELECT
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "bioimpedanceExams_insert_own" ON "bioimpedanceExams"
  FOR INSERT
  WITH CHECK (auth.uid()::integer = "trainerId");

CREATE POLICY "bioimpedanceExams_update_own" ON "bioimpedanceExams"
  FOR UPDATE
  USING (auth.uid()::integer = "trainerId");

CREATE POLICY "bioimpedanceExams_delete_own" ON "bioimpedanceExams"
  FOR DELETE
  USING (auth.uid()::integer = "trainerId");

-- ============================================================================
-- STEP 14: CREATE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON "clients"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON "transactions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Add a comment to verify migration was applied
COMMENT ON DATABASE postgres IS 'FitPro schema v2 - Rebuilt from scratch with RLS policies';
