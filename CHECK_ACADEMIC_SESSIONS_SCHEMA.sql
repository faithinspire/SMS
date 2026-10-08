-- Check actual columns in academic_sessions table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'academic_sessions' 
ORDER BY ordinal_position;
