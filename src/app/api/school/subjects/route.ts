// src/app/api/school/subjects/route.ts
// Centralized subject curriculum endpoint
// Used by: student registration, teacher registration, CBT, results

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface SubjectFilterParams {
  schoolId: string;
  level?: number;
  department?: string;
  assignable?: boolean;
}

async function getSubjects(params: SubjectFilterParams) {
  try {
    const { schoolId, level, department, assignable } = params;

    let query = supabase
      .from("subjects")
      .select("id, school_id, name, subject_code, level, department, created_at")
      .eq("school_id", schoolId);

    // Filter by level (0=PREP, 1=KG/NUR, 2=PRI1-3, 3=PRI4-6, 4=JSS, 5=SS)
    if (level !== undefined) {
      query = query.eq("level", level);
    }

    // Filter by department (for SS subjects: CORE, SCIENCE, HUMANITIES, BUSINESS, TRADE)
    if (department) {
      query = query.eq("department", department);
    }

    // Filter for assignable subjects (exclude special subjects if needed)
    if (assignable === true) {
      // For now, all subjects are assignable
      // In future, could add flags like "teacher_assignable", "student_assignable"
    }

    const { data, error } = await query.order("subject_code");

    if (error) {
      console.error("Supabase query error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
      };
    }

    return {
      success: true,
      data: data || [],
    };
  } catch (err: any) {
    console.error("Error fetching subjects:", err);
    return {
      success: false,
      error: err.message || "Unknown error",
      data: [],
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get("schoolId");
    const level = searchParams.get("level");
    const department = searchParams.get("department");
    const assignable = searchParams.get("assignable");

    // Validate required parameters
    if (!schoolId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: schoolId",
          data: [],
        },
        { status: 400 }
      );
    }

    // Build filter params
    const filterParams: SubjectFilterParams = {
      schoolId,
      level: level ? parseInt(level) : undefined,
      department: department || undefined,
      assignable: assignable === "true" ? true : undefined,
    };

    const result = await getSubjects(filterParams);

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        count: result.data.length,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
        data: [],
      },
      { status: 500 }
    );
  }
}

/**
 * Usage Examples:
 *
 * 1. Get all subjects for a school:
 *    GET /api/school/subjects?schoolId=xxx
 *
 * 2. Get Primary 1 subjects:
 *    GET /api/school/subjects?schoolId=xxx&level=2
 *
 * 3. Get SS Science subjects:
 *    GET /api/school/subjects?schoolId=xxx&level=5&department=SCIENCE
 *
 * 4. Get SS Core subjects:
 *    GET /api/school/subjects?schoolId=xxx&level=5&department=CORE
 *
 * 5. Get JSS subjects:
 *    GET /api/school/subjects?schoolId=xxx&level=4
 *
 * 6. Get SS Business subjects:
 *    GET /api/school/subjects?schoolId=xxx&level=5&department=BUSINESS
 *
 * Response Format:
 * {
 *   "success": true,
 *   "count": 13,
 *   "data": [
 *     {
 *       "id": "uuid",
 *       "school_id": "uuid",
 *       "name": "English Studies",
 *       "subject_code": "PRI-ENG",
 *       "level": 2,
 *       "department": null,
 *       "created_at": "2025-09-23T..."
 *     }
 *   ]
 * }
 */
