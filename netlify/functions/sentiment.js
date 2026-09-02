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

  if (!process.env.VALSEA_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Server misconfigured: VALSEA_KEY not set" }),
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

  const transcript = payload.transcript;
  if (typeof transcript !== "string") {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Expected { transcript: \"...\" }" }),
    };
  }

  const res = await fetchWithRetry("https://api.valsea.ai/v1/sentiment", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VALSEA_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "valsea-sentiment",
      transcript,
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

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "VALSEA returned non-JSON", status: 502 }),
    };
  }

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentiment: data.sentiment || "" }),
  };
};
