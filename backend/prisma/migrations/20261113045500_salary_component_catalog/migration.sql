-- CreateTable
CREATE TABLE "salary_components" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salary_components_name_key_active_idx" ON "salary_components"("name_key") WHERE "is_active" = true;

-- CreateIndex
CREATE INDEX "salary_components_name_key_idx" ON "salary_components"("name_key");
