-- CreateTable
CREATE TABLE "basic_salary_assignments" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "basic_salary_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "basic_salary_assignments_employee_id_idx" ON "basic_salary_assignments"("employee_id");

-- CreatePartialUniqueIndex: exactly one active basic salary per employee
CREATE UNIQUE INDEX "basic_salary_active_employee_idx" ON "basic_salary_assignments"("employee_id") WHERE "is_active" = true;

-- AddForeignKey
ALTER TABLE "basic_salary_assignments" ADD CONSTRAINT "basic_salary_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
