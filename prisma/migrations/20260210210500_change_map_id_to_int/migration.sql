-- Alter table to use integer IDs instead of text (UUID)
-- Existing rows will receive new sequential IDs.
ALTER TABLE "Map" DROP CONSTRAINT "Map_pkey";
ALTER TABLE "Map" DROP COLUMN "id";
ALTER TABLE "Map" ADD COLUMN "id" SERIAL NOT NULL;
ALTER TABLE "Map" ADD CONSTRAINT "Map_pkey" PRIMARY KEY ("id");
