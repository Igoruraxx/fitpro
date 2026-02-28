CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'inactive', 'trial');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."photo_type" AS ENUM('front', 'back', 'side_left', 'side_right', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('monthly', 'package', 'consulting');--> statement-breakpoint
CREATE TYPE "public"."recurrence_type" AS ENUM('none', 'daily', 'weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'basic', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'inactive', 'trial', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'paid', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"clientId" integer,
	"guestName" varchar(255),
	"date" date NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"muscleGroups" text,
	"recurrenceGroupId" varchar(36),
	"recurrenceType" "recurrence_type" DEFAULT 'none' NOT NULL,
	"recurrenceDays" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "bioimpedanceExams" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"clientId" integer NOT NULL,
	"date" date NOT NULL,
	"weight" numeric(6, 2),
	"muscleMass" numeric(6, 2),
	"musclePct" numeric(5, 2),
	"bodyFatPct" numeric(5, 2),
	"visceralFat" numeric(5, 1),
	"bmi" numeric(5, 2),
	"fatMass" numeric(6, 2),
	"leanMass" numeric(6, 2),
	"muscleRate" numeric(5, 2),
	"skeletalMuscleMass" numeric(6, 2),
	"boneMass" numeric(6, 2),
	"proteinMass" numeric(6, 2),
	"proteinPct" numeric(5, 2),
	"moistureContent" numeric(6, 2),
	"bodyWaterPct" numeric(5, 2),
	"subcutaneousFatPct" numeric(5, 2),
	"bmr" numeric(7, 2),
	"metabolicAge" integer,
	"whr" numeric(5, 3),
	"idealWeight" numeric(6, 2),
	"obesityLevel" varchar(50),
	"bodyType" varchar(50),
	"perimetria" text,
	"dobras" text,
	"imageUrl" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyMeasurements" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"clientId" integer NOT NULL,
	"date" date NOT NULL,
	"weight" numeric(5, 2),
	"height" numeric(5, 2),
	"bodyFat" numeric(5, 2),
	"chest" numeric(5, 2),
	"waist" numeric(5, 2),
	"hips" numeric(5, 2),
	"leftArm" numeric(5, 2),
	"rightArm" numeric(5, 2),
	"leftThigh" numeric(5, 2),
	"rightThigh" numeric(5, 2),
	"leftCalf" numeric(5, 2),
	"rightCalf" numeric(5, 2),
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"birthDate" date,
	"gender" "gender",
	"photoUrl" text,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"planType" "plan_type" DEFAULT 'monthly' NOT NULL,
	"monthlyFee" numeric(10, 2),
	"paymentDay" integer,
	"packageSessions" integer,
	"sessionsRemaining" integer,
	"packageValue" numeric(10, 2),
	"sessionsPerWeek" integer,
	"sessionDays" varchar(20),
	"sessionTime" varchar(5),
	"sessionTimesPerDay" text,
	"sessionDuration" integer DEFAULT 60,
	"prepaidValue" numeric(10, 2),
	"prepaidDueDate" date,
	"renovationHistory" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progressPhotos" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"clientId" integer NOT NULL,
	"photoUrl" text NOT NULL,
	"photoType" "photo_type" DEFAULT 'front' NOT NULL,
	"date" date NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trainerId" integer NOT NULL,
	"clientId" integer,
	"type" "transaction_type" NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"amount" numeric(10, 2) NOT NULL,
	"date" date NOT NULL,
	"dueDate" date,
	"paidAt" date,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64),
	"email" varchar(320),
	"passwordHash" text,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"googleId" varchar(255),
	"name" text,
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"phone" varchar(20),
	"photoUrl" text,
	"specialties" text,
	"bio" text,
	"cref" varchar(20),
	"subscriptionPlan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"subscriptionStatus" "subscription_status" DEFAULT 'trial' NOT NULL,
	"subscriptionExpiresAt" timestamp,
	"proSource" varchar(20),
	"proExpiresAt" timestamp,
	"trialRequestedAt" timestamp,
	"maxClients" integer DEFAULT 5 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_googleId_unique" UNIQUE("googleId")
);
--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;