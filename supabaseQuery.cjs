const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return console.error("No API key");

  const tools = [{
      functionDeclarations: [{
        name: "get_user_stats",
        description: "Returns user statistics.",
      }]
  }];
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:streamGenerateContent?alt=sse&key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: "What are my stats?" }]}],
      tools,
      generationConfig: { temperature: 0.3 }
    })
  });
  
  const text = await response.text();
  console.log(text);
}
testGemini();
