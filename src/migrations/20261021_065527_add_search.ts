import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "search" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"title" varchar,
  	"priority" numeric,
  	"url" varchar,
  	"kind" varchar,
  	"title_norm" varchar,
  	"body_text" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"tsv" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('russian'::regconfig, coalesce(title_norm, '')), 'A') || setweight(to_tsvector('russian'::regconfig, coalesce(body_text, '')), 'B')) STORED
  );
  
  CREATE TABLE "search_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"glass_types_id" uuid,
  	"thicknesses_id" uuid,
  	"constructions_id" uuid,
  	"processing_services_id" uuid,
  	"pages_id" uuid,
  	"articles_id" uuid,
  	"objects_id" uuid
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "search_id" uuid;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_glass_types_fk" FOREIGN KEY ("glass_types_id") REFERENCES "public"."glass_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_thicknesses_fk" FOREIGN KEY ("thicknesses_id") REFERENCES "public"."thicknesses"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_constructions_fk" FOREIGN KEY ("constructions_id") REFERENCES "public"."constructions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_processing_services_fk" FOREIGN KEY ("processing_services_id") REFERENCES "public"."processing_services"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_articles_fk" FOREIGN KEY ("articles_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "search_rels" ADD CONSTRAINT "search_rels_objects_fk" FOREIGN KEY ("objects_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "search_updated_at_idx" ON "search" USING btree ("updated_at");
  CREATE INDEX "search_created_at_idx" ON "search" USING btree ("created_at");
  CREATE INDEX "search_tsv_gin" ON "search" USING gin ("tsv");
  CREATE INDEX "search_rels_order_idx" ON "search_rels" USING btree ("order");
  CREATE INDEX "search_rels_parent_idx" ON "search_rels" USING btree ("parent_id");
  CREATE INDEX "search_rels_path_idx" ON "search_rels" USING btree ("path");
  CREATE INDEX "search_rels_glass_types_id_idx" ON "search_rels" USING btree ("glass_types_id");
  CREATE INDEX "search_rels_thicknesses_id_idx" ON "search_rels" USING btree ("thicknesses_id");
  CREATE INDEX "search_rels_constructions_id_idx" ON "search_rels" USING btree ("constructions_id");
  CREATE INDEX "search_rels_processing_services_id_idx" ON "search_rels" USING btree ("processing_services_id");
  CREATE INDEX "search_rels_pages_id_idx" ON "search_rels" USING btree ("pages_id");
  CREATE INDEX "search_rels_articles_id_idx" ON "search_rels" USING btree ("articles_id");
  CREATE INDEX "search_rels_objects_id_idx" ON "search_rels" USING btree ("objects_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_search_fk" FOREIGN KEY ("search_id") REFERENCES "public"."search"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_search_id_idx" ON "payload_locked_documents_rels" USING btree ("search_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // custom: the generated statements dropped `search` (CASCADE also removes the FK of
  // `payload_locked_documents_rels`) before `DROP CONSTRAINT` of that FK, which then failed.
  // Detach `payload_locked_documents_rels` first, then drop the search tables.
  await db.execute(sql`
   ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_search_fk";
  DROP INDEX IF EXISTS "payload_locked_documents_rels_search_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN IF EXISTS "search_id";
  DROP TABLE IF EXISTS "search_rels" CASCADE;
  DROP TABLE IF EXISTS "search" CASCADE;`)
}
