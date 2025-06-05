const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

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

// Helper: build OpenAI prompt
function buildChatbotPrompt(events, messages, question) {
  const promptTemplate = fs.readFileSync(path.join(__dirname, '../data/chatbot_prompt.txt'), 'utf8');
  // Format events as a readable string
  const eventsStr = events.map(ev => {
    // Quote all property values for clarity
    return `- id: "${ev.id}" title: "${ev.title}" year: "${ev.date || ''}" description: "${ev.description || ''}"`;
  }).join('\n');
  // Format conversation history
  const historyStr = messages.map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
  return promptTemplate
    .replace('{events}', eventsStr)
    .replace('{history}', historyStr)
    .replace('{question}', question);
}

// POST /api/chatbot
router.post('/', async (req, res) => {
  const { conversationId, message, userId } = req.body;
  let convId = conversationId;
  console.log('[Chatbot] Incoming request:', { conversationId, message, userId });
  try {
    // 1. Create conversation if needed
    if (!convId) {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .insert([{ user_id: userId }])
        .select()
        .single();
      console.log('[Chatbot] Created conversation:', conv, convErr);
      if (convErr) throw convErr;
      convId = conv.id;
    }
    // 2. Store user message
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([{ conversation_id: convId, sender: 'user', content: message }]);
    console.log('[Chatbot] Stored user message:', msgErr);
    if (msgErr) throw msgErr;
    // 3. Fetch conversation history
    const messages = await getConversationMessages(convId);
    console.log('[Chatbot] Conversation history:', messages);
    // 4. Fetch events (for context)
    const events = await getAllEvents();
    console.log('[Chatbot] Events count:', events.length);
    // 5. Call OpenAI
    const prompt = buildChatbotPrompt(events, messages, message);
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        { role: 'system', content: 'You are a helpful AI history assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 512,
      temperature: 0.1
    });
    const botReply = completion.choices[0].message.content.trim();
    // 6. Store bot response
    const { error: botErr } = await supabase
      .from('messages')
      .insert([{ conversation_id: convId, sender: 'bot', content: botReply }]);
    console.log('[Chatbot] Stored bot reply:', botErr);
    if (botErr) throw botErr;
    // 7. Return conversationId and all messages
    const updatedMessages = await getConversationMessages(convId);
    console.log('[Chatbot] Returning messages:', updatedMessages);
    res.json({ conversationId: convId, messages: updatedMessages });
  } catch (err) {
    console.error('[Chatbot] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE all chatbot conversations and messages
router.post('/delete-all', async (req, res) => {
  try {
    // Delete all messages first (to avoid FK constraint issues)
    const { error: msgErr } = await supabase
      .from('messages')
      .delete()
      .not('id', 'is', null); // delete all rows
    if (msgErr) throw msgErr;
    // Delete all conversations
    const { error: convErr } = await supabase
      .from('conversations')
      .delete()
      .not('id', 'is', null); // delete all rows
    if (convErr) throw convErr;
    res.json({ success: true });
  } catch (err) {
    console.error('[Chatbot] Delete all error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
