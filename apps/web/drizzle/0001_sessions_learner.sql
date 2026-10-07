ALTER TABLE "consent_receipts" ADD COLUMN "password_confirmed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "learner_id" text;--> statement-breakpoint
CREATE INDEX "password_resets_expires_idx" ON "password_resets" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");