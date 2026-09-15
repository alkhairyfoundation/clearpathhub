import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { query as neonQuery } from '@/lib/neon'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: { predictionId: string } }
) {
  const supabase = await createSupabaseServerClient()
  try {
    const { predictionId } = params;

    const { data: userData } = await supabase.auth.getUser();
    const acknowledgedBy = userData.user?.id || null;
    const acknowledgedAt = new Date().toISOString();

    // Write to Neon FIRST (primary data store)
    await neonQuery(
      `UPDATE student_risk_predictions
       SET is_acknowledged = $1, acknowledged_by = $2::uuid, acknowledged_at = $3
       WHERE id = $4::uuid`,
      [true, acknowledgedBy, acknowledgedAt, predictionId]
    );

    // Mirror to Supabase (secondary store, best-effort)
    try {
      await supabase
        .from('student_risk_predictions')
        .update({
          is_acknowledged: true,
          acknowledged_by: acknowledgedBy,
          acknowledged_at: acknowledgedAt,
        })
        .eq('id', predictionId);
    } catch (mirrorError) {
      console.error('Supabase acknowledge mirror error:', mirrorError);
    }

    return NextResponse.json({ success: true, data: null });
  } catch (error: any) {
    console.error('Error acknowledging prediction:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}