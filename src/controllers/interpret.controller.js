import { GoogleGenerativeAI } from "@google/generative-ai";

const geminiClient =
  process.env.GEMINI_API_KEY &&
  new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const INTERPRET_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const interpretTrack = async (req, res) => {
  const { wellName, wellInfo, nullValue, track, curves, view, plotImage } =
    req.body;

  if (!track || !curves || !curves.length) {
    return res.status(400).json({ message: "No curves provided for interpretation" });
  }

  if (!geminiClient) {
    return res.status(500).json({
      message:
        "LLM client is not configured. Please set GEMINI_API_KEY (and optionally GEMINI_MODEL) in your backend .env.",
    });
  }

  const depthRange = view?.yRange || null;

  const legendSummary = curves
    .map((c) => `- ${c.name} (color: ${c.color || "default"})`)
    .join("\n");

  let depthText = "full logged interval";
  if (depthRange && depthRange.length === 2) {
    const [top, base] = depthRange;
    depthText = `depth range from ${top} to ${base} (units as per depth curve)`;
  }

  try {
    const model = geminiClient.getGenerativeModel({ model: INTERPRET_MODEL });
    const prompt = [
      `You are a geoscientist interpreting ONE track from a well log. Your intrepration should be used to draw important conclusion regarding subsurface exploration for oil and gas exploration.`,
      ``,
      `The attached PNG image shows the current view of the track in the selected depth window.`,
      ``,
      `Well name: ${wellName || "Unnamed well"}`,
      `Depth window: ${depthText}`,
      ``,
      `Curves visible in this track (legend):`,
      legendSummary,
      ``,
      `IMPORTANT INSTRUCTIONS:`,
      `- Base your interpretation ONLY on what you can see in the plot image and the legend (curve names and colours) within the specified depth window.`,
      `- Do NOT refuse to interpret or say that it is impossible; always provide your best-effort qualitative interpretation from the visible traces.`,
      `- Do NOT guess the physical meaning of a curve from its mnemonic (e.g. 'HC4', 'HC5', 'GR'); if unsure, refer to it generically as "this curve" and focus on its behaviour (increasing, decreasing, noisy, etc.).`,
      ``,
      `Give a short interpretation for this track in this depth range. You can comment on:`,
      `- How each curve behaves across the window (e.g. trends, inflection points, noisy zones, plateaus).`,
      `- Co-variation between curves in the window (e.g. curves rising/falling together or diverging).`,
      `- Any obvious anomalies or artefacts visible in the plot.`,
      ``,
    ]
      .filter(Boolean)
      .join("\n");

    const parts = [];

    if (plotImage) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: plotImage,
        },
      });
    }

    parts.push({ text: prompt });

    const result = await model.generateContent(parts);
    const interpretation =
      result.response.text() ||
      "No interpretation text was returned by the model.";

    return res.json({ interpretation });
  } catch (err) {
    console.error("Interpretation LLM error:", err);
    return res.status(500).json({
      message: "Failed to get interpretation from LLM",
    });
  }
};

