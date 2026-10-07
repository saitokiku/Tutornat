CREATE SEQUENCE "public"."sync_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"goals" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "activity_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "acts" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "acts_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "attempts" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"skill_id" text NOT NULL,
	"level" integer NOT NULL,
	"seed" bigint NOT NULL,
	"set_id" text,
	"mode" text NOT NULL,
	"correct" boolean NOT NULL,
	"claimed_correct" boolean NOT NULL,
	"assisted" boolean NOT NULL,
	"seconds" integer NOT NULL,
	"response" text,
	"why" text,
	"verdict" text NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "attempts_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "auth_throttle" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "classes_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "consent_receipts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"profile_id" text NOT NULL,
	"method" text NOT NULL,
	"verified" boolean NOT NULL,
	"scope" jsonb NOT NULL,
	"notice_version" text NOT NULL,
	"under13" boolean NOT NULL,
	"evidence" text,
	"granted_by" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "courses_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "events_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "feedback_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "notes_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plan_done" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "plan_done_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "profiles_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "reading" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "reading_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "results" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "results_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "reviews_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sets" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "sets_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"account_id" text NOT NULL,
	"id" text NOT NULL,
	"profile_id" text,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL,
	"seq" bigint DEFAULT nextval('sync_seq') NOT NULL,
	CONSTRAINT "threads_account_id_id_pk" PRIMARY KEY("account_id","id")
);
--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acts" ADD CONSTRAINT "acts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_receipts" ADD CONSTRAINT "consent_receipts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_done" ADD CONSTRAINT "plan_done_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading" ADD CONSTRAINT "reading_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "results" ADD CONSTRAINT "results_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sets" ADD CONSTRAINT "sets_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_key" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "activity_seq_idx" ON "activity" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "activity_profile_idx" ON "activity" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "acts_seq_idx" ON "acts" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "acts_profile_idx" ON "acts" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "attempts_seq_idx" ON "attempts" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "attempts_profile_skill_idx" ON "attempts" USING btree ("account_id","profile_id","skill_id");--> statement-breakpoint
CREATE INDEX "classes_seq_idx" ON "classes" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "classes_profile_idx" ON "classes" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "consent_receipts_profile_idx" ON "consent_receipts" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "consent_receipts_seq_idx" ON "consent_receipts" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "courses_seq_idx" ON "courses" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "courses_profile_idx" ON "courses" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "events_seq_idx" ON "events" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "events_profile_idx" ON "events" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "feedback_seq_idx" ON "feedback" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "feedback_profile_idx" ON "feedback" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "notes_seq_idx" ON "notes" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "notes_profile_idx" ON "notes" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "password_resets_token_key" ON "password_resets" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "password_resets_account_idx" ON "password_resets" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "plan_done_seq_idx" ON "plan_done" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "plan_done_profile_idx" ON "plan_done" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "profiles_seq_idx" ON "profiles" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "profiles_profile_idx" ON "profiles" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "reading_seq_idx" ON "reading" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "reading_profile_idx" ON "reading" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "results_seq_idx" ON "results" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "results_profile_idx" ON "results" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "reviews_seq_idx" ON "reviews" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "reviews_profile_idx" ON "reviews" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_account_idx" ON "sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sets_seq_idx" ON "sets" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "sets_profile_idx" ON "sets" USING btree ("account_id","profile_id");--> statement-breakpoint
CREATE INDEX "threads_seq_idx" ON "threads" USING btree ("account_id","seq");--> statement-breakpoint
CREATE INDEX "threads_profile_idx" ON "threads" USING btree ("account_id","profile_id");