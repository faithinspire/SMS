-- Check arms table schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'arms' 
ORDER BY ordinal_position;

-- Check class_arm_combos table schema
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'class_arm_combos' 
ORDER BY ordinal_position;
