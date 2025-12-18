import { NextRequest } from "next/server";
import OpenAI, { toFile } from "openai";
import fs from "fs";
import path from "path";
import { getRandomPrompt, getPromptByIndex, buildFinalPrompt } from "@/lib/prompts";

// Force Node.js runtime for file system access
export const runtime = "nodejs";

// Increase body size limit for image uploads
export const maxDuration = 60;

/**
 * Get OpenAI API key from environment or local file
 */
function getApiKey(): string {
  // First try environment variable (Vercel deployment)
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  // Fallback to local key.txt file (local development)
  try {
    const keyPath = path.join(process.cwd(), "key.txt");
    const keyContent = fs.readFileSync(keyPath, "utf8");
    // Parse the key file - take the second line which contains the actual key
    const lines = keyContent.split("\n").filter((line) => line.trim());
    // Find a line that looks like an API key (starts with sk-)
    const apiKeyLine = lines.find((line) => line.trim().startsWith("sk-"));
    if (apiKeyLine) {
      return apiKeyLine.trim();
    }
    // If no sk- line found, try the second line (common format)
    if (lines.length >= 2) {
      return lines[1].trim();
    }
    return lines[0].trim();
  } catch (error) {
    throw new Error(
      "No OpenAI API key found. Set OPENAI_API_KEY environment variable or create key.txt"
    );
  }
}

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

/**
 * Get path to Karl reference image
 */
function getKarlImagePath(): string {
  const referenzDir = path.join(process.cwd(), "Referenz");
  
  // Try different possible filenames
  const possibleNames = ["karl.png", "karl.jpg", "karl1.jpg", "karl1.png", "karl2.jpg", "karl3.jpg"];
  
  for (const name of possibleNames) {
    const fullPath = path.join(referenzDir, name);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  // List available files and use the first image
  try {
    const files = fs.readdirSync(referenzDir);
    const imageFile = files.find((f) => 
      f.toLowerCase().endsWith(".jpg") || 
      f.toLowerCase().endsWith(".png") ||
      f.toLowerCase().endsWith(".jpeg")
    );
    if (imageFile) {
      return path.join(referenzDir, imageFile);
    }
  } catch (e) {
    console.error("Error reading Referenz directory:", e);
  }
  
  throw new Error("No Karl reference image found in Referenz/ folder");
}

export async function POST(request: NextRequest) {
  try {
    // Get API key
    const apiKey = getApiKey();

    // Parse form data
    const formData = await request.formData();
    const selfieFile = formData.get("selfie") as File | null;
    const sceneIndexStr = formData.get("sceneIndex") as string | null;

    if (!selfieFile) {
      return Response.json(
        { error: "No selfie image provided" },
        { status: 400 }
      );
    }

    console.log("Received selfie:", selfieFile.name, selfieFile.type, selfieFile.size, "bytes");

    // Get selfie as buffer
    const selfieBuffer = Buffer.from(await selfieFile.arrayBuffer());

    // Get scene prompt
    let sceneDescription: string;
    if (sceneIndexStr && !isNaN(parseInt(sceneIndexStr))) {
      sceneDescription = getPromptByIndex(parseInt(sceneIndexStr));
    } else {
      sceneDescription = getRandomPrompt();
    }

    // Build final prompt
    const finalPrompt = buildFinalPrompt(sceneDescription);
    console.log("Using prompt:", finalPrompt);

    // Initialize OpenAI client
    const client = new OpenAI({ apiKey });

    // Get Karl reference image path
    const karlPath = getKarlImagePath();
    const karlMimeType = getMimeType(karlPath);
    const karlFileName = path.basename(karlPath);
    console.log("Using Karl image:", karlPath, "MIME:", karlMimeType);

    // Read Karl image as buffer
    const karlBuffer = fs.readFileSync(karlPath);

    // Convert images to uploadable files using toFile with explicit MIME types
    const karlFile = await toFile(karlBuffer, karlFileName, { type: karlMimeType });
    const selfieUpload = await toFile(selfieBuffer, "selfie.jpg", { type: "image/jpeg" });

    console.log("Sending to OpenAI...");

    // Call OpenAI Images Edit API with both images
    const result = await client.images.edit({
      model: "gpt-image-1",
      image: [karlFile, selfieUpload],
      prompt: finalPrompt,
      size: "1024x1536",
      quality: "high",
    });

    console.log("OpenAI response received");

    // Extract base64 image from response
    const imageData = result.data?.[0];
    
    if (!imageData || !imageData.b64_json) {
      console.error("OpenAI response:", JSON.stringify(result, null, 2));
      throw new Error("No image data in OpenAI response");
    }

    // Return the generated image and prompt used
    return Response.json({
      imageBase64: imageData.b64_json,
      promptUsed: sceneDescription,
      fullPrompt: finalPrompt,
    });
  } catch (error) {
    console.error("Error in /api/render:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return Response.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
