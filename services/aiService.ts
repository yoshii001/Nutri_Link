const API_KEY = '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';

export interface AIResponse {
  content: string;
  error?: string;
}

export async function sendQuestion(question: string): Promise<AIResponse> {
  try {
    const apiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com',
        'X-Title': 'School Meal Management System',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
        messages: [
          {
            role: 'user',
            content: question,
          },
        ],
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      return {
        content: '',
        error: data.error?.message || `API error: ${apiResponse.status}`,
      };
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      return {
        content: data.choices[0].message.content,
      };
    } else {
      return {
        content: '',
        error: 'Unexpected API response format',
      };
    }
  } catch (err) {
    console.error('API Error:', err);
    return {
      content: '',
      error: err instanceof Error ? err.message : 'An error occurred',
    };
  }
}
