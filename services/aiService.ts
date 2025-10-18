import { getActiveApis, markApiAsUsed, incrementApiFailureCount, resetApiFailureCount, ApiConfig } from './firebase/apiService';

export interface AIResponse {
  content: string;
  error?: string;
}

let cachedApis: ApiConfig[] = [];
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function getAvailableApis(): Promise<ApiConfig[]> {
  const now = Date.now();

  if (cachedApis.length > 0 && now - lastCacheTime < CACHE_DURATION) {
    return cachedApis;
  }

  try {
    cachedApis = await getActiveApis();
    lastCacheTime = now;
    return cachedApis;
  } catch (error) {
    console.error('Failed to fetch APIs from Firebase:', error);
    return [];
  }
}

async function callApiWithConfig(api: ApiConfig, question: string): Promise<AIResponse> {
  try {
    const apiResponse = await fetch(api.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api.apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://app.example.com',
        'X-Title': 'School Meal Management System',
      },
      body: JSON.stringify({
        model: api.model,
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
      throw new Error(data.error?.message || `API error: ${apiResponse.status}`);
    }

    if (data.choices && data.choices[0] && data.choices[0].message) {
      await markApiAsUsed(api.id);
      await resetApiFailureCount(api.id);

      return {
        content: data.choices[0].message.content,
      };
    } else {
      throw new Error('Unexpected API response format');
    }
  } catch (err) {
    await incrementApiFailureCount(api.id);
    throw err;
  }
}

export async function sendQuestion(question: string): Promise<AIResponse> {
  const apis = await getAvailableApis();

  if (apis.length === 0) {
    return {
      content: '',
      error: 'AI report currently unavailable. No API keys configured.',
    };
  }

  for (const api of apis) {
    try {
      const response = await callApiWithConfig(api, question);
      return response;
    } catch (err) {
      console.error(`API ${api.name} failed:`, err);
      continue;
    }
  }

  return {
    content: '',
    error: 'AI report currently unavailable. All configured APIs are unavailable.',
  };
}
