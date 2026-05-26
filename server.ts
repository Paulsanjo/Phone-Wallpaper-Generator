import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Set high request body limit for uploading base64 reference images
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Lazy initializer for GoogleGenAI SDK to prevent crashing on startups with missing keys
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add it via Settings > Secrets.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// Helper to generate a single image using gemini-2.5-flash-image with a fallback to imagen-4.0-generate-001
async function generateWallpaperImage(gemini: GoogleGenAI, prompt: string): Promise<string> {
  try {
    const imageResult = await gemini.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "9:16",
        },
      },
    });

    const parts = imageResult.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No inline image data in candidates response");
  } catch (error: any) {
    console.warn("gemini-2.5-flash-image failed, trying fallback to imagen-4.0-generate-001:", error.message || error);
    try {
      const fallbackResult = await gemini.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "9:16",
        },
      });

      if (fallbackResult.generatedImages?.[0]?.image?.imageBytes) {
        return `data:image/png;base64,${fallbackResult.generatedImages[0].image.imageBytes}`;
      }
    } catch (fallbackError: any) {
      console.error("Both image generation models failed:", fallbackError.message || fallbackError);
    }
    throw new Error(`Failed to generate wallpaper image: ${error.message || error}`);
  }
}

// API endpoint to generate 4 variations of wallpapers
app.post("/api/generate-wallpapers", async (req, res) => {
  try {
    const gemini = getGeminiClient();
    const { vibe, preset, referenceImage } = req.body;

    if (!vibe) {
      return res.status(400).json({ error: "vibe parameter is required" });
    }

    // Phase 1: Use gemini-3.5-flash to write 4 distinct visual wallpaper prompts based on the desired vibe & style
    const systemInstruction = `You are a professional wallpaper designer drafting visual ideas for high-end mobile wallpapers.
Your goal is to output exactly 4 unique, highly detailed visual descriptions/prompts for an AI image generator.
To make these masterpieces, follow these layout rules:
1. Composition must be ideal for 9:16 portrait mobile aspect ratios. High-impact subjects, vertical framing.
2. Ensure readable backgrounds with clean zones or sophisticated negative space so time and notification widgets remain readable on phone lock screens.
3. No letters, phone UI mockups, watermark borders, or status icons in the description. Always focus purely on style, subject, mood, and lighting.
4. Vary the 4 descriptions so they offer genuine artistic diversity (different camera angles, moods, color emphasis, levels of abstractness).

You MUST output ONLY a valid JSON array of 4 string prompts. Do not wrap the JSON in Markdown delimiters like \`\`\`json or add extra text.`;

    let promptText = `Generate 4 distinct visual wallpaper descriptions.
Desired Vibe: "${vibe}"
Additional Style Preset: "${preset || "None"}"`;

    const parts: any[] = [];

    // If a reference image is provided for remixing, incorporate it
    if (referenceImage) {
      const match = referenceImage.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
        promptText += `\n\nCRITICAL: Remix this provided reference image!
Detailed Instruction: Examine this image's layout, composition, aesthetic, color scheme, and subject details.
FUSE its look and feel with the new vibe "${vibe}" and style "${preset || "None"}".
Generate 4 distinct prompt strings representing variations of this remix, ensuring they preserve visual traits from the reference but strongly incorporate the new vibe.`;
      }
    }

    parts.push({ text: promptText });

    const promptGenResponse = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    let prompts: string[] = [];
    try {
      const rawText = promptGenResponse.text?.trim() || "[]";
      prompts = JSON.parse(rawText);
    } catch (parseError) {
      console.error("Failed to parse prompt JSON from Gemini, raw response:", promptGenResponse.text);
      // Fallback: build simple prompts manually from vibe
      prompts = [
        `Beautiful 9:16 wallpaper, concept of ${vibe}, preset style: ${preset}, aesthetic composition, detailed, negative space, 4k`,
        `Vertical portrait design of ${vibe}, artistic preset: ${preset}, atmospheric lighting, modern art, perfect phone wallpaper`,
        `Minimalist vertical wallpaper depicting ${vibe}, stylized under ${preset}, clean vector shapes, beautiful background color`,
        `Moody close-up shot focused on ${vibe}, elegant visual texture, beautiful dark style, lock-screen layout, ultra high resolution`,
      ];
    }

    // Ensure we have exactly 4 prompts
    if (!Array.isArray(prompts) || prompts.length < 4) {
      prompts = [
        ...prompts,
        ...[
          `Vibrant vertical wallpaper based on ${vibe}`,
          `Moody smartphone background of ${vibe}`,
          `Minimal styled 9:16 background: ${vibe}`,
          `Artistic details representing the vibe of ${vibe}`,
        ],
      ].slice(0, 4);
    }

    console.log("Generated prompts for variations:", prompts);

    // Phase 2: Generate the 4 images in parallel using our helper
    const imagePromises = prompts.map((prompt) =>
      generateWallpaperImage(gemini, prompt).catch((err) => {
        console.error(`Failed generating image for prompt: "${prompt}":`, err);
        // Fallback placeholder image with seed to keep it functional, using a random seed to make them different
        const randomSeed = Math.floor(Math.random() * 1000000);
        return `https://picsum.photos/seed/${randomSeed}/1080/1920`;
      })
    );

    const imageUrls = await Promise.all(imagePromises);

    res.json({
      success: true,
      prompts,
      images: imageUrls.map((url, index) => ({
        url,
        prompt: prompts[index],
      })),
    });
  } catch (error: any) {
    console.error("Endpoint generation failure:", error);
    res.status(500).json({ error: error.message || "An error occurred during generation." });
  }
});

// Vite & Static file serving setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Wallpaper App server running on http://localhost:${PORT}`);
  });
}

startServer();
