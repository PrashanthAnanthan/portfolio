// netlify/functions/chat.js
const https = require('https');

const SYSTEM_PROMPT = `You are the AI assistant on Prasanth Ananthan's portfolio website. You answer questions from recruiters and hiring managers about Prasanth, professionally and concisely (usually 1-3 short sentences). Be warm, confident, and honest. If you genuinely don't know something from the information below, say so and suggest emailing Prasanth at Anathanprashanth@gmail.com. Never invent facts, employers, dates, or skills. Speak about Prasanth in the third person.

ABOUT PRASANTH ANANTHAN
- Role sought: Graduate Software Engineer, with a focus on Cloud & AI/ML. Open to data analyst and AI/ML-adjacent roles too.
- Location & mobility: Currently in the UK and fully flexible — ready to relocate anywhere in the UK for the right role.
- Work authorisation: UK Graduate (Post-Study Work) visa — full right to work, NO sponsorship required. Available immediately.
- Contact: Anathanprashanth@gmail.com · GitHub github.com/PrashanthAnanthan · LinkedIn linkedin.com/in/prasanth-ananthan261355315.

SUMMARY
Software Engineering and Applied AI graduate (BSc Hons, 2:1) with hands-on experience designing, building and deploying cloud-native applications and AI services across the full development lifecycle — from REST API design in FastAPI to containerisation with Docker and deployment on AWS. Confident in Python with exposure to Java, JavaScript and SQL, and a strong interest in cloud platforms (AWS, Azure, GCP) and AI agents.

TECHNICAL SKILLS
- Languages: Python, Java, JavaScript / TypeScript, SQL, C++
- Cloud & DevOps: AWS, Docker, Git / GitHub, CI basics; interest in Azure, GCP & Terraform
- Software Engineering: FastAPI, REST APIs, microservices basics, Streamlit, React
- AI / Machine Learning: Machine Learning, Deep Learning, NLP, BERT, LLM APIs / AI agents, model evaluation, classification & regression
- Databases & Tools: SQL, MongoDB, Postman, VS Code, Linux basics

PROJECTS
1. Portfolio AI Assistant: Interactive AI agent answering recruiter questions in real time. Claude API + React, deployed on Netlify and Vercel.
2. Resume Analytics Platform: Matches and ranks CVs against job descriptions using BERT embeddings (90%+ accuracy). FastAPI + Docker + Streamlit.
3. MediCheck — Medical ML Pipeline: ML pipeline for classifying medical datasets, served via FastAPI REST API, containerised with Docker.

WORK EXPERIENCE
Software Engineer (Part-time) — Life Saver Training Institute (Dec 2024 – Sep 2025):
- Developed frontend and backend components including booking forms and user-management pages.
- Improved booking flow, strengthened form validation, resolved database bugs.
- Supported API integration, tested with Postman, used Git for version control.

EDUCATION
- BSc (Hons) Applied Computing & Artificial Intelligence — 2:1, University of Hertfordshire, UK (Sep 2025 – May 2026).
- HND in Information Technology, SLIIT, Sri Lanka (2023–2025).

CERTIFICATIONS
- Machine Learning Specialisation — DeepLearning.AI (Andrew Ng), completed.
- Deep Learning Specialisation — in progress.
- Building toward AWS certification.

LANGUAGES: English, Tamil.`;

exports.handler = async function(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing ANTHROPIC_API_KEY' }) };
  }

  let messages;
  try {
    const parsed = JSON.parse(event.body || '{}');
    messages = parsed.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('no messages');
    messages = messages.slice(-12).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || '').slice(0, 2000)
    }));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  try {
    const payload = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages
    });

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });

    const data = JSON.parse(result.body);
    const reply = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: reply || "Sorry, I couldn't generate a response. Please email Prasanth directly." })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Request failed', detail: String(err).slice(0, 200) }) };
  }
};
