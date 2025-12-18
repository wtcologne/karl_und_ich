import fs from "fs";
import path from "path";

/**
 * Cache for parsed prompts
 */
let cachedPrompts: string[] | null = null;

/**
 * Read and parse the prompts file
 */
export function loadPrompts(): string[] {
  if (cachedPrompts) {
    return cachedPrompts;
  }

  const promptsPath = path.join(
    process.cwd(),
    "karl_und_user_absurde_prompts.txt"
  );

  try {
    const content = fs.readFileSync(promptsPath, "utf8");

    // Parse lines and remove numbering (e.g., "1. ", "2. ", etc.)
    const prompts = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        // Remove leading number and period (e.g., "1. " or "12. ")
        return line.replace(/^\d+\.\s*/, "").trim();
      })
      .filter((line) => line.length > 0);

    cachedPrompts = prompts;
    return prompts;
  } catch (error) {
    console.error("Error loading prompts file:", error);
    // Fallback prompts
    return [
      "Karl der Kasten und der Nutzer sitzen zusammen auf einer Parkbank und füttern Tauben mit kleinen Holzstückchen.",
    ];
  }
}

/**
 * Get a random prompt from the list
 */
export function getRandomPrompt(): string {
  const prompts = loadPrompts();
  const randomIndex = Math.floor(Math.random() * prompts.length);
  return prompts[randomIndex];
}

/**
 * Get a specific prompt by index
 */
export function getPromptByIndex(index: number): string {
  const prompts = loadPrompts();
  const safeIndex = Math.max(0, Math.min(index, prompts.length - 1));
  return prompts[safeIndex];
}

/**
 * Get total number of prompts
 */
export function getPromptCount(): number {
  return loadPrompts().length;
}

/**
 * Build the final prompt for OpenAI image generation
 */
export function buildFinalPrompt(sceneDescription: string): string {
  const context = `Create an ultra-photorealistic image. This is a fun, family-friendly artistic composition.`;

  const imageReference = `CRITICAL - Two reference images provided:
- Image 1: Karl, the wooden block character (use as exact reference for Karl's appearance)
- Image 2: The user's selfie (MUST preserve this person's EXACT facial features, face shape, skin tone, hair color, hair style, eye color, and all identifying characteristics)`;

  const karlDescription = `Karl the wooden character: A recognizable humanoid figure made entirely of stacked natural wooden blocks. Visible wood grain texture on all surfaces. Small metal screw details at joints. Rectangular blocky head with a comically grumpy/unimpressed facial expression carved into the wood. Proportions exactly as shown in reference image 1.`;

  const userDescription = `IMPORTANT - The human person in this image MUST be an EXACT photorealistic likeness of the person in reference image 2 (the selfie). Preserve with 100% accuracy:
- Exact face shape, jawline, and facial structure
- Exact eye color, eye shape, eyebrows
- Exact nose shape and size
- Exact lip shape and skin tone
- Exact hair color, texture, length, and style
- Any distinctive features like freckles, moles, or facial hair
The person should look like a real photograph of this specific individual, not a generic person.`;

  const scene = `Scene Description: ${sceneDescription}`;

  const styleGuide = `Visual Style: Ultra-photorealistic, indistinguishable from a real photograph. Shot on professional cinema camera with 35mm lens. Natural cinematic lighting with soft shadows. Realistic global illumination. Shallow depth of field. 8K resolution quality. The wooden Karl character should look like a real physical wooden sculpture photographed in this scene. The human should look like an actual photograph of a real person.`;

  const constraints = `Requirements: Family-friendly content. No text, logos, or watermarks. Absolutely NO cartoon or CGI aesthetic - this must look like a real photograph. The human's face must match the selfie reference exactly.`;

  return [
    context,
    imageReference,
    karlDescription,
    userDescription,
    scene,
    styleGuide,
    constraints,
  ].join("\n\n");
}
