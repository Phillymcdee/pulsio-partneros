import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type SignalType = 'funding' | 'marketplace' | 'launch' | 'hire' | 'changelog' | 'pr' | 'blog';

/**
 * Classifies a signal type using OpenAI
 */
export async function classifyType(title: string, content: string): Promise<SignalType> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a partner-ops analyst. Classify the following content into one of these types: funding, marketplace, launch, hire, changelog, pr, blog. Return only the type name.',
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nContent: ${content.substring(0, 1000)}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const type = response.choices[0]?.message?.content?.trim().toLowerCase() as SignalType;
    
    // Validate type
    const validTypes: SignalType[] = ['funding', 'marketplace', 'launch', 'hire', 'changelog', 'pr', 'blog'];
    if (validTypes.includes(type)) {
      return type;
    }

    // Fallback to blog if classification fails
    return 'blog';
  } catch (error) {
    console.error('Error classifying signal type:', error);
    return 'blog'; // Fallback
  }
}

