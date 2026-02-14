import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiClient =
  process.env.GEMINI_API_KEY &&
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const CHAT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const chatWithAssistant = async (req, res) => {
  if (!geminiClient) {
    return res.status(500).json({
      message:
        "LLM client is not configured. Please set GEMINI_API_KEY (and optionally GEMINI_MODEL) in your backend .env.",
    });
  }

  const { message, well, trackNote } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ message: "Message is required" });
  }

  const headerSummary =
    (well?.wellInfo || [])
      .slice(0, 12)
      .map(
        (i) =>
          `${i.mnemonic}${i.unit ? ` (${i.unit})` : ""}: ${i.value}${
            i.description ? ` — ${i.description}` : ""
          }`
      )
      .join("\n") || "No WELL section information provided.";

  const curveSummary =
    (well?.curves || [])
      .slice(0, 20)
      .map((c) => `- ${c.name}${c.unit ? ` (${c.unit})` : ""}`)
      .join("\n") || "No curve metadata provided.";

  const depthSummary =
    Array.isArray(well?.depth) && well.depth.length
      ? `Depth range approx: ${well.depth[0]} to ${
          well.depth[well.depth.length - 1]
        } (number of samples: ${well.depth.length}).`
      : "No depth vector provided.";

  const trackLine = trackNote
    ? `Track / panel note from user: ${trackNote}`
    : "No explicit track note was provided.";

  try {
    const model = geminiClient.getGenerativeModel({ model: CHAT_MODEL });

    const prompt = [
      `You are a geoscientist helping interpret and reason about well logs in an application. Your responses may be used to draw important conclusions regarding subsurface exploration for oil and gas.`,
      `Answer clearly and concisely, and explain your reasoning qualitatively using the context below.`,
      ``,
      `Context from the app:`,
      ``,
      `Well name: ${well?.wellName || well?.name || "Unknown"}`,
      depthSummary,
      ``,
      `Selected WELL information (LAS header):`,
      headerSummary,
      ``,
      `Available curves in current well:`,
      curveSummary,
      ``,
      trackLine,
      ``,
      `User question:`,
      message,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await model.generateContent(prompt);
    const answer =
      result.response.text() ||
      "No answer was returned by the model.";

    return res.json({ answer });
  } catch (err) {
    console.error("Chat LLM error:", err);
    return res.status(500).json({
      message: "Failed to get response from LLM",
    });
  }
};

