const https = require("https"); // Netlify function — proxy for Anthropic API

function httpsPost(data, headers) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: { ...headers, "Content-Length": Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const userKey = (event.headers["x-api-key"] || event.headers["X-Api-Key"] || "").trim();
    const apiKey = userKey || process.env.ANTHROPIC_API_KEY || "";

    if (!apiKey) {
      return {
        statusCode: 401,
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
        body: JSON.stringify({ error: { message: "No API key provided" } }),
      };
    }

    const data = JSON.stringify(body);
    const result = await httpsPost(data, {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    });

    return {
      statusCode: result.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: result.body,
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
      body: JSON.stringify({ error: { message: err.message } }),
    };
  }
};
