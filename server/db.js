const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;

function getSupabaseClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : undefined,
      },
    },
  });
}

module.exports = getSupabaseClient;
