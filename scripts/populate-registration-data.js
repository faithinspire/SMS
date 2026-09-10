// Script to populate registration data
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://egdreueuspmuxhezdpqm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZHJldWV1c3BtdXhoZXpkcHFtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTk2MDQzOSwiZXhwIjoyMDk3NTM2NDM5fQ.Ae9n1r6m_hkvQNqACjIoe--bNcTfJ9AMzSW2VcRxMZk'
);

async function populateRegistrationData() {
  console.log('🚀 Populating registration data...');

  try {
    // Get first school
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id')
      .limit(1);

    if (schoolsError || !schools || schools.length === 0) {
      console.error('❌ No schools found');
      return;
    }

    const schoolId = schools[0].id;
    console.log(`📍 Using school: ${schoolId}`);

    // Delete existing data
    console.log('🗑️ Cleaning up existing data...');
    await supabase.from('class_arm_combos').delete().eq('school_id', schoolId);
    await supabase.from('arms').delete().eq('school_id', schoolId);
    await supabase.from('classes').delete().eq('school_id', schoolId);
    await supabase.from('subjects').delete().eq('school_id', schoolId);

    // Insert Classes
    console.log('📚 Creating classes...');
    const classes = [
      // PRIMARY
      { name: 'Nursery', level: 0, type: 'PRIMARY' },
      { name: 'Kindergarten', level: 1, type: 'PRIMARY' },
      { name: 'Primary 2', level: 2, type: 'PRIMARY' },
      { name: 'Primary 3', level: 3, type: 'PRIMARY' },
      { name: 'Primary 4', level: 4, type: 'PRIMARY' },
      { name: 'Primary 5', level: 5, type: 'PRIMARY' },
      { name: 'Primary 6', level: 6, type: 'PRIMARY' },
      // SECONDARY
      { name: 'JSS 1', level: 7, type: 'SECONDARY' },
      { name: 'JSS 2', level: 8, type: 'SECONDARY' },
      { name: 'JSS 3', level: 9, type: 'SECONDARY' },
      { name: 'SSS 1', level: 10, type: 'SECONDARY' },
      { name: 'SSS 2', level: 11, type: 'SECONDARY' },
      { name: 'SSS 3', level: 12, type: 'SECONDARY' },
    ].map(c => ({ ...c, school_id: schoolId, created_at: new Date() }));

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .insert(classes)
      .select('id, name, level');

    if (classError) {
      console.error('❌ Error creating classes:', classError);
      return;
    }

    console.log(`✅ Created ${classData.length} classes`);

    // Insert Arms for each class
    console.log('🎯 Creating arms...');
    const arms = [];
    classData.forEach(cls => {
      ['A', 'B', 'C'].forEach(armName => {
        arms.push({
          school_id: schoolId,
          class_id: cls.id,
          name: armName,
          created_at: new Date(),
        });
      });
    });

    const { data: armData, error: armError } = await supabase
      .from('arms')
      .insert(arms)
      .select('id');

    if (armError) {
      console.error('❌ Error creating arms:', armError);
      return;
    }

    console.log(`✅ Created ${armData.length} arms`);

    // Insert Subjects
    console.log('📖 Creating subjects...');
    const subjects = [
      { name: 'Mathematics', code: 'MATH', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
      { name: 'English Language', code: 'ENG', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
      { name: 'Science', code: 'SCI', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
      { name: 'Social Studies', code: 'SS', levels: [0,1,2,3,4,5,6] },
      { name: 'Physical Education', code: 'PE', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
      { name: 'Fine Arts', code: 'ART', levels: [0,1,2,3,4,5,6,7,8,9,10,11,12] },
      { name: 'Computer Science', code: 'CS', levels: [7,8,9,10,11,12] },
      { name: 'History', code: 'HIST', levels: [7,8,9,10,11,12] },
      { name: 'Literature in English', code: 'LIT', levels: [7,8,9,10,11,12] },
      { name: 'Agricultural Science', code: 'AGR', levels: [7,8,9,10,11,12] },
      { name: 'Government', code: 'GOV', levels: [7,8,9,10,11,12] },
      { name: 'Economics', code: 'ECO', levels: [7,8,9,10,11,12] },
    ].map(s => ({
      school_id: schoolId,
      name: s.name,
      code: s.code,
      applicable_to_levels: s.levels,
      created_at: new Date(),
    }));

    const { data: subjectData, error: subjectError } = await supabase
      .from('subjects')
      .insert(subjects)
      .select('id');

    if (subjectError) {
      console.error('❌ Error creating subjects:', subjectError);
      return;
    }

    console.log(`✅ Created ${subjectData.length} subjects`);

    // Insert Class-Arm Combos
    console.log('🔗 Creating class-arm combinations...');
    
    // Get the relationship between arms and classes
    const { data: armsWithClasses, error: armsError } = await supabase
      .from('arms')
      .select('id, class_id')
      .eq('school_id', schoolId);
    
    if (armsError) {
      console.error('❌ Error fetching arms with classes:', armsError);
      return;
    }

    const comboInserts = armsWithClasses.map(arm => ({
      school_id: schoolId,
      class_id: arm.class_id,
      arm_id: arm.id,
      created_at: new Date(),
    }));

    const { data: comboData, error: comboError } = await supabase
      .from('class_arm_combos')
      .insert(comboInserts)
      .select('id');

    if (comboError) {
      console.error('❌ Error creating combos:', comboError);
      return;
    }

    console.log(`✅ Created ${comboData.length} class-arm combinations`);
    console.log('\n✨ Registration data populated successfully!');
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

populateRegistrationData();
