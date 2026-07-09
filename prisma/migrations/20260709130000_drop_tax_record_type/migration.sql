-- Declarations are dropped along with the type column. Income rows were already
-- moved out by the previous migration, so any remaining non-expense rows are
-- declaration entries; delete them before removing the column.
DELETE FROM "TaxRecord" WHERE "type" <> 'expense';

-- DropIndex
DROP INDEX "TaxRecord_type_idx";

-- AlterTable
ALTER TABLE "TaxRecord" DROP COLUMN "type";
