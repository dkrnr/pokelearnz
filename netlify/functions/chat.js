const OPENROUTER_MODEL = "google/gemma-4-31b-it:free";
const OPENROUTER_FALLBACKS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "inclusionai/ling-3.0-flash-fin:free",
  "openrouter/free",
];

async function fetchWithRetry(url, options) {
  let res = await fetch(url, options);
  if (res.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    res = await fetch(url, options);
  }
  return res;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!process.env.OPENROUTER_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server misconfigured: OPENROUTER_KEY not set" }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const messages = payload.messages;
  if (!Array.isArray(messages)) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Expected { messages: [...] }" }),
    };
  }

  const res = await fetchWithRetry("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pokelearnz.netlify.app",
      "X-OpenRouter-Title": "PokeLearn",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      models: OPENROUTER_FALLBACKS,
      messages,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    return {
      statusCode: res.status,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: text.slice(0, 500),
        status: res.status,
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: text,
  };
};
