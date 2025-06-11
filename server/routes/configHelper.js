// Helper to fetch config values from Supabase config table
const supabase = require("../db");

async function getConfigValue(key) {
    const { data, error } = await supabase.from("config").select("value").eq("key", key).single();
    if (error || !data) throw new Error(`Config key not found: ${key}`);
    return data.value;
}

module.exports = { getConfigValue };
