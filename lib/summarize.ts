import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Summarizes content for partner managers
 */
export async function summarize(text: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a partner-ops analyst. Summarize the following content for a partner manager in 4-6 crisp bullets. Include product names, teams, regions.',
        },
        {
          role: 'user',
          content: `TEXT:\n<<<${text.substring(0, 4000)}>>>`,
        },
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content?.trim() || text.substring(0, 500);
  } catch (error) {
    console.error('Error summarizing content:', error);
    // Fallback to truncated text
    return text.substring(0, 500);
  }
}

