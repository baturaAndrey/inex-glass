import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_leads_refuse_reason_code" AS ENUM('expensive', 'other_supplier', 'needs_installation', 'no_contact', 'other');
  CREATE TYPE "public"."enum__leads_v_version_refuse_reason_code" AS ENUM('expensive', 'other_supplier', 'needs_installation', 'no_contact', 'other');
  CREATE TYPE "public"."enum_notification_log_channel" AS ENUM('group', 'user');
  CREATE TYPE "public"."enum_notification_log_event" AS ENUM('new_lead', 'status_change', 'assigned', 'order_event', 'unassigned_reminder');
  CREATE TYPE "public"."enum_notification_log_status" AS ENUM('pending', 'sent', 'failed', 'skipped');
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'max-notify';
  ALTER TYPE "public"."enum_payload_jobs_log_task_slug" ADD VALUE 'max-unassigned-reminder';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'max-notify';
  ALTER TYPE "public"."enum_payload_jobs_task_slug" ADD VALUE 'max-unassigned-reminder';
  CREATE TABLE "notification_log" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"channel" "enum_notification_log_channel" NOT NULL,
  	"event" "enum_notification_log_event" NOT NULL,
  	"lead_id" uuid,
  	"order_id" uuid,
  	"recipient_id" uuid,
  	"chat_id" varchar,
  	"message_id" varchar,
  	"status" "enum_notification_log_status" DEFAULT 'sent' NOT NULL,
  	"error" varchar,
  	"sent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users" ADD COLUMN "max_user_id" varchar;
  ALTER TABLE "users" ADD COLUMN "max_linked_at" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "max_bot_stopped" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "max_link_token_hash" varchar;
  ALTER TABLE "users" ADD COLUMN "max_link_token_expires_at" timestamp(3) with time zone;
  ALTER TABLE "pages" ADD COLUMN "updated_by_id" uuid;
  ALTER TABLE "_pages_v" ADD COLUMN "version_updated_by_id" uuid;
  ALTER TABLE "leads" ADD COLUMN "refuse_reason_code" "enum_leads_refuse_reason_code";
  ALTER TABLE "leads" ADD COLUMN "kp_amount" numeric;
  ALTER TABLE "leads" ADD COLUMN "updated_by_id" uuid;
  ALTER TABLE "_leads_v" ADD COLUMN "version_refuse_reason_code" "enum__leads_v_version_refuse_reason_code";
  ALTER TABLE "_leads_v" ADD COLUMN "version_kp_amount" numeric;
  ALTER TABLE "_leads_v" ADD COLUMN "version_updated_by_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "notification_log_id" uuid;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_new_lead" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_status_change" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_assigned" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_order_events" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_unassigned_reminder" boolean DEFAULT true;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_group_chat_id" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_group_chat_title" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_group_linked_at" timestamp(3) with time zone;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_group_link_token_hash" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "notifications_max_group_link_token_expires_at" timestamp(3) with time zone;
  ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "notification_log_key_idx" ON "notification_log" USING btree ("key");
  CREATE INDEX "notification_log_lead_idx" ON "notification_log" USING btree ("lead_id");
  CREATE INDEX "notification_log_order_idx" ON "notification_log" USING btree ("order_id");
  CREATE INDEX "notification_log_recipient_idx" ON "notification_log" USING btree ("recipient_id");
  CREATE INDEX "notification_log_updated_at_idx" ON "notification_log" USING btree ("updated_at");
  CREATE INDEX "notification_log_created_at_idx" ON "notification_log" USING btree ("created_at");
  ALTER TABLE "pages" ADD CONSTRAINT "pages_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "leads" ADD CONSTRAINT "leads_updated_by_id_users_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_leads_v" ADD CONSTRAINT "_leads_v_version_updated_by_id_users_id_fk" FOREIGN KEY ("version_updated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_notification_log_fk" FOREIGN KEY ("notification_log_id") REFERENCES "public"."notification_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_max_user_id_idx" ON "users" USING btree ("max_user_id");
  CREATE INDEX "pages_updated_by_idx" ON "pages" USING btree ("updated_by_id");
  CREATE INDEX "_pages_v_version_version_updated_by_idx" ON "_pages_v" USING btree ("version_updated_by_id");
  CREATE INDEX "leads_updated_by_idx" ON "leads" USING btree ("updated_by_id");
  CREATE INDEX "_leads_v_version_version_updated_by_idx" ON "_leads_v" USING btree ("version_updated_by_id");
  CREATE INDEX "payload_locked_documents_rels_notification_log_id_idx" ON "payload_locked_documents_rels" USING btree ("notification_log_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // custom:
  // - the job-slug enums are re-created below without the MAX values, and the cast back to the
  //   enum fails while rows with those slugs exist: delete those jobs first;
  // - the generated statements dropped `notification_log` (CASCADE also removes the FK of
  //   `payload_locked_documents_rels`) before `DROP CONSTRAINT` of that FK, which then failed.
  //   Detach `payload_locked_documents_rels` first, then drop the table (as in `add_search`).
  await db.execute(sql`
   DELETE FROM "payload_jobs" WHERE "task_slug" IN ('max-notify', 'max-unassigned-reminder');
  DELETE FROM "payload_jobs_log" WHERE "task_slug" IN ('max-notify', 'max-unassigned-reminder');
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_notification_log_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_notification_log_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "notification_log_id";
  ALTER TABLE "notification_log" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "notification_log" CASCADE;
  ALTER TABLE "pages" DROP CONSTRAINT "pages_updated_by_id_users_id_fk";
  
  ALTER TABLE "_pages_v" DROP CONSTRAINT "_pages_v_version_updated_by_id_users_id_fk";
  
  ALTER TABLE "leads" DROP CONSTRAINT "leads_updated_by_id_users_id_fk";
  
  ALTER TABLE "_leads_v" DROP CONSTRAINT "_leads_v_version_updated_by_id_users_id_fk";
  
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'notify-new-lead', 'notify-assigned', 'send-order-status', 'cleanup-tmp-uploads', 'expire-order-links', 'cleanup-rate-limits', 'indexnow-submit');
  ALTER TABLE "payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_log_task_slug" USING "task_slug"::"public"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "public"."enum_payload_jobs_task_slug";
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'notify-new-lead', 'notify-assigned', 'send-order-status', 'cleanup-tmp-uploads', 'expire-order-links', 'cleanup-rate-limits', 'indexnow-submit');
  ALTER TABLE "payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "public"."enum_payload_jobs_task_slug" USING "task_slug"::"public"."enum_payload_jobs_task_slug";
  DROP INDEX "users_max_user_id_idx";
  DROP INDEX "pages_updated_by_idx";
  DROP INDEX "_pages_v_version_version_updated_by_idx";
  DROP INDEX "leads_updated_by_idx";
  DROP INDEX "_leads_v_version_version_updated_by_idx";
  ALTER TABLE "users" DROP COLUMN "max_user_id";
  ALTER TABLE "users" DROP COLUMN "max_linked_at";
  ALTER TABLE "users" DROP COLUMN "max_bot_stopped";
  ALTER TABLE "users" DROP COLUMN "max_link_token_hash";
  ALTER TABLE "users" DROP COLUMN "max_link_token_expires_at";
  ALTER TABLE "pages" DROP COLUMN "updated_by_id";
  ALTER TABLE "_pages_v" DROP COLUMN "version_updated_by_id";
  ALTER TABLE "leads" DROP COLUMN "refuse_reason_code";
  ALTER TABLE "leads" DROP COLUMN "kp_amount";
  ALTER TABLE "leads" DROP COLUMN "updated_by_id";
  ALTER TABLE "_leads_v" DROP COLUMN "version_refuse_reason_code";
  ALTER TABLE "_leads_v" DROP COLUMN "version_kp_amount";
  ALTER TABLE "_leads_v" DROP COLUMN "version_updated_by_id";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_new_lead";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_status_change";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_assigned";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_order_events";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_unassigned_reminder";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_group_chat_id";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_group_chat_title";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_group_linked_at";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_group_link_token_hash";
  ALTER TABLE "site_settings" DROP COLUMN "notifications_max_group_link_token_expires_at";
  DROP TYPE "public"."enum_leads_refuse_reason_code";
  DROP TYPE "public"."enum__leads_v_version_refuse_reason_code";
  DROP TYPE "public"."enum_notification_log_channel";
  DROP TYPE "public"."enum_notification_log_event";
  DROP TYPE "public"."enum_notification_log_status";`)
}
