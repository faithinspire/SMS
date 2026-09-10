/**
 * Populate all schools with classes and subjects
 * Run with: node populate-schools.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://egdreueuspmuxhezdpqm.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiZXhwIjoyMDk3NTM2NDM5fQ.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function populateAllSchools() {
  try {
    console.log('🔍 Fetching all schools...');
    
    // Get all schools
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, name');
    
    if (schoolsError) {
      console.error('❌ Error fetching schools:', schoolsError);
      return;
    }
    
    console.log(`✅ Found ${schools.length} schools`);
    
    if (schools.length === 0) {
      console.log('⚠️  No schools found. Create a school first!');
      return;
    }
    
    // Populate each school
    for (const school of schools) {
      console.log(`\n📚 Processing school: ${school.name} (${school.id})`);
      
      // Check if already has classes
      const { count: classCount } = await supabase
        .from('classes')
        .select('id', { count: 'exact' })
        .eq('school_id', school.id);
      
      if (classCount && classCount > 0) {
        console.log(`⏭️  Already has ${classCount} classes, skipping...`);
        continue;
      }
      
      // Call the create_default_school_data function
      const { error } = await supabase.rpc('create_default_school_data', {
        p_school_id: school.id,
      });
      
      if (error) {
        console.error(`❌ Error populating school ${school.name}:`, error);
        continue;
      }
      
      // Verify data was created
      const { count: newClassCount } = await supabase
        .from('classes')
        .select('id', { count: 'exact' })
        .eq('school_id', school.id);
      
      const { count: newSubjectCount } = await supabase
        .from('subjects')
        .select('id', { count: 'exact' })
        .eq('school_id', school.id);
      
      console.log(`✅ Created: ${newClassCount} classes, ${newSubjectCount} subjects`);
    }
    
    console.log('\n🎉 All schools populated successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

populateAllSchools();
