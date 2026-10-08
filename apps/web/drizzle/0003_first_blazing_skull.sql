CREATE TABLE "budget_holds" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"session_id" text NOT NULL,
	"keys" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "budget_periods" (
	"key" text PRIMARY KEY NOT NULL,
	"turns" integer DEFAULT 0 NOT NULL,
	"usd" double precision DEFAULT 0 NOT NULL,
	"tokens" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_holds" ADD CONSTRAINT "budget_holds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_holds_expiry_idx" ON "budget_holds" USING btree ("expires_at");