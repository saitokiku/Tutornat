CREATE TABLE "adult_self_authorities" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"session_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"notice_version" text NOT NULL,
	"processors" jsonb NOT NULL,
	"confirmed_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "adult_self_authorities" ADD CONSTRAINT "adult_self_authorities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adult_self_authorities" ADD CONSTRAINT "adult_self_authorities_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adult_self_authorities_session_idx" ON "adult_self_authorities" USING btree ("account_id","session_id");