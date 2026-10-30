import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDocuments1760000001000 implements MigrationInterface {
  name = 'CreateDocuments1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "documents" (
        "id" uuid NOT NULL,
        "template_id" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "file_type" character varying(8) NOT NULL,
        "file_name" character varying(255) NOT NULL,
        "file_path" character varying(500) NOT NULL,
        "form_data" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_documents_file_type" CHECK ("file_type" IN ('docx', 'pptx')),
        CONSTRAINT "FK_documents_template_id" FOREIGN KEY ("template_id")
          REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_documents_template_id" ON "documents" ("template_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_documents_created_at" ON "documents" ("created_at")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_documents_created_at"');
    await queryRunner.query('DROP INDEX "IDX_documents_template_id"');
    await queryRunner.query('DROP TABLE "documents"');
  }
}
