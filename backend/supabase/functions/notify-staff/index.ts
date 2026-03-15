import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const expoPushEndpoint = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { record, type, table } = await req.json();

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let messages = [];

    if (table === 'alerts' && type === 'INSERT') {
      const alert = record;
      
      // Notify Officers and the specific Admin of that Home
      const { data: users, error } = await supabaseClient
        .from('users')
        .select('push_token, role, vrudhashram_id')
        .not('push_token', 'is', null);

      if (error) throw error;

      users.forEach(user => {
        if (
          user.role === 'officer' || 
          (user.role === 'admin' && user.vrudhashram_id === alert.vrudhashram_id)
        ) {
          messages.push({
            to: user.push_token,
            sound: 'default',
            title: `New Alert: ${alert.type.toUpperCase()}`,
            body: alert.description,
            data: { alertId: alert.id },
          });
        }
      });
    }

    if (table === 'daily_reports' && type === 'INSERT') {
      const report = record;
      // Trigger notification if there is an issue or negative mood reported
      if (report.issues || ['sad', 'aggressive'].includes(report.mood)) {
        const { data: users } = await supabaseClient
          .from('users')
          .select('push_token, role, vrudhashram_id')
          .not('push_token', 'is', null);
          
        const { data: resident } = await supabaseClient
          .from('residents')
          .select('vrudhashram_id, name')
          .eq('id', report.resident_id)
          .single();

        if (users && resident) {
           users.forEach(user => {
            if (
              user.role === 'officer' || 
              (user.role === 'admin' && user.vrudhashram_id === resident.vrudhashram_id)
            ) {
              messages.push({
                to: user.push_token,
                sound: 'default',
                title: `High Risk Resident Report`,
                body: `Issues reported for ${resident.name}. Please review.`,
                data: { reportId: report.id },
              });
            }
          });
        }
      }
    }

    // Dispatch Push Notifications via Expo
    if (messages.length > 0) {
      await fetch(expoPushEndpoint, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });
      console.log(`Sent ${messages.length} notifications`);
    }

    return new Response(JSON.stringify({ success: true, count: messages.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
