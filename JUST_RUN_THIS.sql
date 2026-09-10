-- This verifies the foreign key is fixed (simpler version with no ambiguity)
SELECT constraint_name, table_name
FROM information_schema.table_constraints
WHERE table_name = 'score_sheets' 
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name LIKE '%academic_terms%';
