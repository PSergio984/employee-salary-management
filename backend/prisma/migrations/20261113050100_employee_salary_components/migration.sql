-- CreateTable
CREATE TABLE "employee_salary_components" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "component_id" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "employee_salary_components_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_salary_components_employee_id_idx" ON "employee_salary_components"("employee_id");

-- CreateIndex
CREATE INDEX "employee_salary_components_component_id_idx" ON "employee_salary_components"("component_id");

-- CreatePartialUniqueIndex: exactly one active assignment per (employee_id, component_id) pair
CREATE UNIQUE INDEX "employee_salary_components_active_pair_idx" ON "employee_salary_components"("employee_id", "component_id") WHERE "is_active" = true;

-- AddForeignKey
ALTER TABLE "employee_salary_components" ADD CONSTRAINT "employee_salary_components_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_salary_components" ADD CONSTRAINT "employee_salary_components_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "salary_components"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
