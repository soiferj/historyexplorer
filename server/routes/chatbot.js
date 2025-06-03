const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

// Setup Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper: fetch all messages for a conversation
async function getConversationMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

// Helper: fetch all events (for context)
async function getAllEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*');
  if (error) throw error;
  return data;
}

// POST /api/chatbot
router.post('/', async (req, res) => {
  const { conversationId, message, userId } = req.body;
  let convId = conversationId;
  try {
    // 1. Create conversation if needed
    if (!convId) {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert([{ user_id: userId }])
        .select()
        .single();
      if (convErr) throw convErr;
      convId = conv.id;
    }
    // 2. Store user message
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([{ conversation_id: convId, sender: 'user', content: message }]);
    if (msgErr) throw msgErr;
    // 3. Fetch conversation history
    const messages = await getConversationMessages(convId);
    // 4. Fetch events (for context)
    const events = await getAllEvents();
    // 5. Call AI model (stub for now)
    // TODO: Replace with real AI call
    const botReply = `This is a placeholder answer. You asked: "${message}". (Events in DB: ${events.length})`;
    // 6. Store bot response
    const { error: botErr } = await supabase
      .from('messages')
      .insert([{ conversation_id: convId, sender: 'bot', content: botReply }]);
    if (botErr) throw botErr;
    // 7. Return conversationId and all messages
    const updatedMessages = await getConversationMessages(convId);
    res.json({ conversationId: convId, messages: updatedMessages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
