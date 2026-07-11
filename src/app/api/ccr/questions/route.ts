import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getQuestionsByType } from '@/lib/ccr-questions';
import type { CcrRespondentType } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') as CcrRespondentType | null;

    if (!type || !['student', 'father', 'mother', 'teacher', 'subject_teacher'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Valid respondent type is required' }, { status: 400 });
    }

    const questions = getQuestionsByType(type);
    return NextResponse.json({ success: true, data: questions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
