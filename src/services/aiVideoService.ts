/**
 * AI Video Generator Service using Hugging Face Inference API
 * - Automatically selects LTX-Video (Image-to-Video) for smoothest graph motion animation,
 *   or Wan 2.1 (Text-to-Video) for pure text prompts.
 */

const DEFAULT_HF_KEY = import.meta.env.VITE_HF_API_KEY || '';

export interface VideoGenOptions {
  prompt: string;
  imageBase64?: string;
  apiKey?: string;
  mode?: 'text-to-video' | 'image-to-video';
}

export async function generateAIVideo(options: VideoGenOptions): Promise<string> {
  const token = options.apiKey || localStorage.getItem('hf_api_key') || DEFAULT_HF_KEY;
  if (!token) {
    throw new Error('Hugging Face API key is missing. Please provide your API key.');
  }

  // Automatic Model Selection: LTX-Video for smoothest image-to-video graph animation, Wan 2.1 for text
  const isImageMode = !!options.imageBase64;
  const modelId = isImageMode
    ? 'Lightricks/LTX-Video'
    : 'Wan-AI/Wan2.1-T2V-1.3B';

  const endpoint = `https://api-inference.huggingface.co/models/${modelId}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  let body: string;
  if (isImageMode && options.imageBase64) {
    body = JSON.stringify({
      inputs: options.imageBase64,
      parameters: {
        prompt: options.prompt || 'Smooth 60fps animation of glowing state machine transitions and neon particle flow',
      },
    });
  } else {
    body = JSON.stringify({
      inputs: options.prompt,
    });
  }

  // Poll Hugging Face in case model is warming up (503 status)
  const maxRetries = 12;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body,
    });

    if (response.ok) {
      const videoBlob = await response.blob();
      return URL.createObjectURL(videoBlob);
    }

    const errorText = await response.text();
    let errorJson: any = {};
    try {
      errorJson = JSON.parse(errorText);
    } catch {
      // ignore
    }

    if (response.status === 503 && errorJson.estimated_time) {
      const waitTimeMs = Math.min(Math.ceil(errorJson.estimated_time * 1000), 10000);
      await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
      continue;
    }

    throw new Error(errorJson.error || errorText || `HTTP ${response.status} failed to generate video`);
  }

  throw new Error('Video generation timed out while waiting for model initialization.');
}
