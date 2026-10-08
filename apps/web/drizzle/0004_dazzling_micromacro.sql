CREATE TABLE "capability_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"session_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"principal" jsonb NOT NULL,
	"receipt_id" text,
	"authority_id" text,
	"processor" text NOT NULL,
	"credential_ttl_seconds" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "capability_grants" ADD CONSTRAINT "capability_grants_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability_grants" ADD CONSTRAINT "capability_grants_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "capability_grants_receipt_idx" ON "capability_grants" USING btree ("account_id","receipt_id");--> statement-breakpoint
CREATE INDEX "capability_grants_session_idx" ON "capability_grants" USING btree ("session_id");