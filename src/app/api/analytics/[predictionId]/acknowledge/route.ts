import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { predictionId: string } }
) {
  const supabase = await createSupabaseServerClient()
  try {
    const { predictionId } = params;
    
    // Update the prediction to mark it as acknowledged
    const { data, error } = await supabase
      .from('student_risk_predictions')
      .update({ 
        is_acknowledged: true,
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', predictionId)

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error acknowledging prediction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}