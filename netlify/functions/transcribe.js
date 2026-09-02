function header(event, name) {
  const headers = event.headers || {};
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return "";
}

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

  const contentType = header(event, "content-type");
  if (!contentType) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing Content-Type" }),
    };
  }

  const body = event.isBase64Encoded
    ? Buffer.from(event.body || "", "base64")
    : Buffer.from(event.body || "", "utf8");

  const res = await fetchWithRetry("https://api.valsea.ai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VALSEA_KEY}`,
      "Content-Type": contentType,
    },
    body,
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
    body: JSON.stringify({ text: data.text || "" }),
  };
};
