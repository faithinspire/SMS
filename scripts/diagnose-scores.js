#!/usr/bin/env node

/**
 * Diagnostic script to check if score_sheets has data
 * Run: node scripts/diagnose-scores.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnose() {
  try {
    console.log('\n📋 SCORE SHEET DIAGNOSTIC\n');

    // Check 1: Score sheets count
    console.log('1️⃣  Checking score_sheets table...');
    const { data: scoreCount, error: countError } = await supabase
      .from('score_sheets')
      .select('id', { count: 'exact' });

    if (countError) {
      console.error('   ❌ Error:', countError.message);
    } else {
      console.log(`   ✓ Score sheets found: ${scoreCount?.length || 0}`);
    }

    // Check 2: Sample score sheet record
    if (scoreCount && scoreCount.length > 0) {
      console.log('\n2️⃣  Fetching sample score sheet...');
      const { data: sample, error: sampleError } = await supabase
        .from('score_sheets')
        .select(`
          id,
          student_id,
          subject_id,
          term_id,
          school_id,
          test1,
          test2,
          test3,
          test4,
          exam,
          total,
          grade,
          test1_source,
          test2_source,
          test3_source,
          test4_source,
          exam_source,
          academic_session_id,
          subjects(id, name, code),
          academic_terms(id, term_name)
        `)
        .limit(1)
        .single();

      if (sampleError) {
        console.error('   ❌ Error:', sampleError.message);
      } else {
        console.log('   ✓ Sample record:');
        console.log('     - Student ID:', sample.student_id);
        console.log('     - Subject:', sample.subjects?.name || 'N/A');
        console.log('     - Term:', sample.academic_terms?.term_name || 'N/A');
        console.log('     - Test1:', sample.test1, 'Source:', sample.test1_source);
        console.log('     - Test2:', sample.test2, 'Source:', sample.test2_source);
        console.log('     - Test3:', sample.test3, 'Source:', sample.test3_source);
        console.log('     - Test4:', sample.test4, 'Source:', sample.test4_source);
        console.log('     - Exam:', sample.exam, 'Source:', sample.exam_source);
        console.log('     - Total:', sample.total);
        console.log('     - Grade:', sample.grade);
      }
    }

    // Check 3: Academic sessions
    console.log('\n3️⃣  Checking academic_sessions...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('academic_sessions')
      .select('id, session_year, school_id', { count: 'exact' })
      .limit(5);

    if (sessionsError) {
      console.error('   ❌ Error:', sessionsError.message);
    } else {
      console.log(`   ✓ Academic sessions found: ${sessions?.length || 0}`);
      sessions?.slice(0, 3).forEach((s) => {
        console.log(`     - ${s.session_year} (school: ${s.school_id})`);
      });
    }

    // Check 4: Academic terms
    console.log('\n4️⃣  Checking academic_terms...');
    const { data: terms, error: termsError } = await supabase
      .from('academic_terms')
      .select('id, term_name, session_id, school_id', { count: 'exact' })
      .limit(5);

    if (termsError) {
      console.error('   ❌ Error:', termsError.message);
    } else {
      console.log(`   ✓ Academic terms found: ${terms?.length || 0}`);
      terms?.slice(0, 3).forEach((t) => {
        console.log(`     - ${t.term_name} (session: ${t.session_id})`);
      });
    }

    // Check 5: Score sheet query for a specific student
    console.log('\n5️⃣  Testing results API query pattern...');
    
    // Get a sample school
    const { data: schools, error: schoolError } = await supabase
      .from('schools')
      .select('id')
      .limit(1)
      .single();

    if (schoolError || !schools) {
      console.error('   ❌ No schools found');
    } else {
      const schoolId = schools.id;

      // Get a sample student
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', schoolId)
        .limit(1)
        .single();

      if (studentError || !students) {
        console.error('   ❌ No students found in this school');
      } else {
        const studentId = students.id;

        // Get a sample term
        const { data: termData, error: termError } = await supabase
          .from('academic_terms')
          .select('id')
          .eq('school_id', schoolId)
          .limit(1)
          .single();

        if (termError || !termData) {
          console.error('   ❌ No terms found for this school');
        } else {
          const termId = termData.id;

          // Now try the actual query
          const { data: results, error: resultsError } = await supabase
            .from('score_sheets')
            .select(`
              id,
              student_id,
              subject_id,
              test1,
              test2,
              test3,
              test4,
              exam,
              total,
              grade,
              subjects(name)
            `)
            .eq('school_id', schoolId)
            .eq('student_id', studentId)
            .eq('term_id', termId);

          if (resultsError) {
            console.error('   ❌ Query error:', resultsError.message);
          } else {
            console.log(`   ✓ Query successful`);
            console.log(`     - Student ID: ${studentId}`);
            console.log(`     - School ID: ${schoolId}`);
            console.log(`     - Term ID: ${termId}`);
            console.log(`     - Results found: ${results?.length || 0}`);

            if (results && results.length > 0) {
              console.log('\n   📊 Sample Results:');
              results.slice(0, 3).forEach((r) => {
                console.log(`     - ${r.subjects?.name}: T1=${r.test1} T2=${r.test2} T3=${r.test3} T4=${r.test4} E=${r.exam} Total=${r.total}`);
              });
            }
          }
        }
      }
    }

    console.log('\n✅ Diagnostic complete\n');
  } catch (err) {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  }
}

diagnose();
