import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersAndAssignDocuments1760000002000
  implements MigrationInterface {
  name = 'CreateUsersAndAssignDocuments1760000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "name" character varying(150) NOT NULL,
        "email" character varying(255) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
    await queryRunner.query(`
      INSERT INTO "users" ("name", "email")
      VALUES ('Demo User', 'demo@papertrail.local')
      ON CONFLICT ("email") DO NOTHING
    `);
    await queryRunner.query(
      'ALTER TABLE "documents" ADD COLUMN "user_id" integer',
    );
    await queryRunner.query(`
      UPDATE "documents"
      SET "user_id" = (SELECT "id" FROM "users" WHERE "email" = 'demo@papertrail.local')
      WHERE "user_id" IS NULL
    `);
    await queryRunner.query(
      'ALTER TABLE "documents" ALTER COLUMN "user_id" SET NOT NULL',
    );
    await queryRunner.query(`
      ALTER TABLE "documents"
      ADD CONSTRAINT "FK_documents_user_id" FOREIGN KEY ("user_id")
      REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_documents_user_created_at" ON "documents" ("user_id", "created_at" DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_documents_user_created_at"');
    await queryRunner.query(
      'ALTER TABLE "documents" DROP CONSTRAINT "FK_documents_user_id"',
    );
    await queryRunner.query(
      'ALTER TABLE "documents" DROP COLUMN "user_id"',
    );
    await queryRunner.query('DROP TABLE "users"');
  }
}
