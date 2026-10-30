import { MigrationInterface, QueryRunner } from 'typeorm';
export class CreateTemplates1760000000000 implements MigrationInterface {
  name = 'CreateTemplates1760000000000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE "templates" ("id" integer NOT NULL, "slug" character varying(120) NOT NULL, "name" character varying(180) NOT NULL, "description" text NOT NULL, "type" character varying(24) NOT NULL, "category" character varying(100) NOT NULL, "file_path" character varying(300) NOT NULL, "thumbnail_path" character varying(300), "preview" jsonb NOT NULL DEFAULT '{}', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(), "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(), CONSTRAINT "PK_templates_id" PRIMARY KEY ("id"), CONSTRAINT "UQ_templates_slug" UNIQUE ("slug"))`);
    await q.query(`CREATE INDEX "IDX_templates_type_category" ON "templates" ("type", "category")`);
  }
  async down(q: QueryRunner): Promise<void> { await q.query(`DROP INDEX "IDX_templates_type_category"`); await q.query(`DROP TABLE "templates"`); }
}
