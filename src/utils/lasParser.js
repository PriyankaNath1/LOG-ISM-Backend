import fs from "fs";

export const parseLAS = (filePath) => {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/);

  let inCurveSection = false;
  let inAsciiSection = false;
  let inWellSection = false;

  let curveNames = [];
  let dataRows = [];
  let nullValue = null;
  let wellInfo = [];

  for (let rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (!line) continue;

    // Detect well section
    if (lower.startsWith("~w")) {
      inWellSection = true;
      inCurveSection = false;
      inAsciiSection = false;
      continue;
    }

    // Detect curve section
    if (lower.startsWith("~curve")) {
      inCurveSection = true;
      inAsciiSection = false;
      inWellSection = false;
      continue;
    }

    // Detect ascii section
    if (lower.startsWith("~ascii")) {
      inAsciiSection = true;
      inCurveSection = false;
      inWellSection = false;
      continue;
    }

    if (inWellSection && !line.startsWith("#")) {
      // General WELL information line patterns.
      // "STRT.F          8665.00:  START DEPTH"
      // "NULL    .         -999.2500                     :Absent Value"
      // "NULL.         -999.2500                     :Absent Value"
      if (line.includes(".")) {
        const [left, right] = line.split(":", 2);
        const description = (right || "").trim();
        const leftTrim = left.trim();

        // Match "MNEM.UNIT VALUE" or "MNEM .UNIT VALUE" or "MNEM . VALUE"
        const m = leftTrim.match(
          /^([A-Za-z0-9_]+)\s*\.\s*([A-Za-z0-9%/]+)?\s*(.*)$/
        );

        if (m) {
          const mnemonic = (m[1] || "").trim();
          const unit = (m[2] || "").trim();
          const value = (m[3] || "").trim();

          if (mnemonic) {
            // Capture NULL sentinel value in a robust way
            if (mnemonic.toLowerCase() === "null" && value) {
              const numMatch = value.match(/[+-]?\d+(\.\d+)?/);
              if (numMatch) {
                const parsed = Number(numMatch[0]);
                if (!Number.isNaN(parsed)) {
                  nullValue = parsed;
                }
              }
            }

            wellInfo.push({
              mnemonic,
              unit,
              value,
              description,
            });
          }
        }
      }
    }

    // Parse curve names
    if (inCurveSection && !line.startsWith("#")) {
      const parts = line.split(".");
      if (parts.length > 1) {
        const name = parts[0].trim();
        if (name) curveNames.push(name);
      }
    }

    // Parse ASCII data
    if (inAsciiSection) {
      const values = line.split(/\s+/).map(Number);
      if (values.length > 1 && !isNaN(values[0])) {
        dataRows.push(values);
      }
    }
  }

  if (dataRows.length === 0) {
    return { depth: [], curves: [], nullValue, wellInfo };
  }

  // Depth = first column
  const depth = dataRows.map((row) => {
    const v = row[0];
    if (nullValue !== null && v === nullValue) return null;
    return v;
  });

  const curves = [];

  for (let i = 1; i < curveNames.length; i++) {
    curves.push({
      name: curveNames[i],
      unit: "",
      data: dataRows.map((row) => {
        const v = row[i];
        if (v === undefined || Number.isNaN(v)) return null;
        if (nullValue !== null && v === nullValue) return null;
        return v;
      }),
    });
  }

  return { depth, curves, nullValue, wellInfo };
};