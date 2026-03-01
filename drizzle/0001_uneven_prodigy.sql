ALTER TABLE "users" ADD COLUMN "abacatepayCustomerId" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "abacatepaySubscriptionId" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "planStartAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "planExpiresAt" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "planGrantedBy" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastPaymentId" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastPaymentDate" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "lastPaymentAmount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_planGrantedBy_users_id_fk" FOREIGN KEY ("planGrantedBy") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_abacatepayCustomerId_unique" UNIQUE("abacatepayCustomerId");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_abacatepaySubscriptionId_unique" UNIQUE("abacatepaySubscriptionId");