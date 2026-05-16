import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const VISION_PROMPT = `Describe this security camera frame in detail for a searchable index. Include:
- People: clothing colours, approximate age/gender, distinguishing features, actions
- Vehicles: colour, type, make if identifiable, licence plate if visible
- Objects: bags, weapons, tools, or any notable items
- Setting: indoor/outdoor, location type (car park, corridor, street, shop, etc.)
- Events: any notable activity, movement direction, interactions
- Anomalies: anything unusual, suspicious, or out of place
Use specific, searchable descriptors. Be concise but complete.`;

export async function analyzeFrame(imageBuffer: Buffer): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

  const result = await model.generateContent([
    VISION_PROMPT,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBuffer.toString('base64'),
      },
    },
  ]);

  return result.response.text();
}
