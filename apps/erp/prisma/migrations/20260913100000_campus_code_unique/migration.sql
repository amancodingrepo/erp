-- Unique campus codes so login and public apply can address a tenant.
CREATE UNIQUE INDEX "Campus_code_key" ON "Campus"("code");
