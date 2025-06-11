const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { getModelProvider } = require('./modelProvider');

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

// Helper: fetch events with filters
async function getFilteredEvents(filters) {
  console.log('[Chatbot] getFilteredEvents filters:', filters);
  let { data, error } = await supabase.from('events').select('*');
  if (error) throw error;
  let filtered = data || [];
  // If neither filter, return all
  if ((!filters.tags || filters.tags.length === 0) && (!filters.text || filters.text.length === 0)) {
    return filtered;
  }
  // Prepare lowercase filters
  const filterTagsLower = (filters.tags || []).map(t => t.toLowerCase());
  const textFiltersLower = (filters.text || []).map(t => t.toLowerCase());
  // OR-join: keep event if it matches tag OR text
  filtered = filtered.filter(ev => {
    let tagMatch = false;
    let textMatch = false;
    if (filterTagsLower.length > 0 && Array.isArray(ev.tags)) {
      tagMatch = ev.tags.some(tag => filterTagsLower.includes(tag.toLowerCase()));
    }
    if (textFiltersLower.length > 0) {
      const title = (ev.title || '').toLowerCase();
      const description = (ev.description || '').toLowerCase();
      textMatch = textFiltersLower.some(t => title.includes(t) || description.includes(t));
    }
    return tagMatch || textMatch;
  });
  console.log('[Chatbot] getFilteredEvents result after OR filter:', filtered.length);
  return filtered;
}

// Helper: build filter prompt for LLM
function buildFilterPrompt(messages, question, tags) {
  const promptTemplate = fs.readFileSync(path.join(__dirname, '../data/chatbot_filter_prompt.txt'), 'utf8');
  const historyStr = messages.map(m => `${m.sender === 'user' ? 'User' : 'AI'}: ${m.content}`).join('\n');
  const tagsStr = tags.join('\n');
  return promptTemplate
    .replace('{tags}', tagsStr)
    .replace('{history}', historyStr)
    .replace('{question}', question);
}

// Helper: fetch all unique tags from events (only tags with 2+ events)
async function getAllTags() {
  const { data, error } = await supabase.from('events').select('tags');
  if (error) throw error;
  const tagCounts = {};
  (data || []).forEach(ev => {
    if (Array.isArray(ev.tags)) {
      ev.tags.forEach(tag => {
        if (!tag) return;
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    }
  });
  // Only include tags that appear in 2 or more events
  return Object.keys(tagCounts)
    .filter(tag => tagCounts[tag] > 2)
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

// POST /api/chatbot
router.post('/', async (req, res) => {
  const { conversationId, message, userId, model } = req.body;
  let convId = conversationId;
  console.log('[Chatbot] Incoming request:', { conversationId, message, userId, model });
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
    // 3.5. Fetch all unique tags
    const tags = await getAllTags();
    // 4. Use LLM to generate event filters
    let filters = { text: [], tags: [], dateRange: [] };
    let filterCompletion;
    const selectedModel = model || 'gpt-4.1-nano';
    const provider = getModelProvider(selectedModel);
    // Build filter prompt
    const filterPrompt = buildFilterPrompt(messages, message, tags);
    const filterMessages = [
      { role: 'system', content: 'You are an expert at generating search filters for historical events.' },
      { role: 'user', content: filterPrompt }
    ];
    let filterRaw;
    try {
      filterRaw = await provider.chatCompletion(filterMessages, { max_tokens: 256, temperature: 0.1 });
      filters = JSON.parse(filterRaw);
    } catch (e) {
      console.warn('[Chatbot] Could not parse filters, using all events.', e);
    }
    console.log('[Chatbot] Filters selected:', filters);
    // 5. Fetch filtered events
    let events = [];
    try {
      events = await getFilteredEvents(filters);
    } catch (e) {
      console.warn('[Chatbot] Error fetching filtered events, falling back to all events.', e);
      events = await getAllEvents();
    }
    console.log('[Chatbot] Filtered events count:', events.length);
    // 6. Call LLM for chatbot reply
    const prompt = buildChatbotPrompt(events, messages, message);
    const chatMessages = [
      { role: 'system', content: 'You are a helpful AI history assistant.' },
      { role: 'user', content: prompt }
    ];
    let botReply;
    try {
      botReply = await provider.chatCompletion(chatMessages, { max_tokens: 1024, temperature: 0.1 });
    } catch (e) {
      console.error('[Chatbot] Error getting bot reply:', e);
      throw e;
    }
    // 7. Store bot response
    const { error: botErr } = await supabase
      .from('messages')
      .insert([{ conversation_id: convId, sender: 'bot', content: botReply }]);
    console.log('[Chatbot] Stored bot reply:', botErr);
    if (botErr) throw botErr;
    // 8. Return conversationId and all messages
    const updatedMessages = await getConversationMessages(convId);
    console.log('[Chatbot] Returning messages:', updatedMessages);
    res.json({ conversationId: convId, messages: updatedMessages });
  } catch (err) {
    console.error('[Chatbot] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chatbot/debug
router.post('/debug', async (req, res) => {
  const { conversationId } = req.body;
  if (!conversationId) {
    return res.status(400).json({ error: 'Missing conversationId' });
  }
  try {
    const messages = await getConversationMessages(conversationId);
    res.json({ conversationId, messages });
  } catch (err) {
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
