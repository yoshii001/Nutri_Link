import { sendQuestion } from './aiService';
import { getAllMealTracking } from './firebase/mealTrackingService';
import { getAllDonations } from './firebase/donationService';
import { getAllFeedback } from './firebase/feedbackService';
import { getAllSchools } from './firebase/schoolService';
import { Report } from '@/types';
import { saveReport } from './firebase/reportService';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export interface ReportGenerationOptions {
  startDate?: string;
  endDate?: string;
  schoolId?: string;
  includeInsights?: boolean;
}

export async function generateAIReport(
  generatedBy: string,
  options: ReportGenerationOptions = {}
): Promise<{ reportId: string; report: Report; aiInsights?: string }> {
  try {
    const [meals, donations, feedback, schools] = await Promise.all([
      getAllMealTracking(),
      getAllDonations(),
      getAllFeedback(),
      getAllSchools(),
    ]);

    const now = new Date();
    const startDate = options.startDate ? new Date(options.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate ? new Date(options.endDate) : now;

    let totalMeals = 0;
    let totalShortages = 0;
    const feedbackList: string[] = [];

    Object.entries(meals).forEach(([date, tracking]) => {
      const mealDate = new Date(date);
      if (mealDate >= startDate && mealDate <= endDate) {
        totalMeals += Object.keys(tracking.students || {}).length;
      }
    });

    let totalDonationAmount = 0;
    Object.values(donations).forEach((donation) => {
      const donationDate = new Date(donation.date);
      if (donationDate >= startDate && donationDate <= endDate) {
        if (!options.schoolId || donation.schoolId === options.schoolId) {
          totalDonationAmount += donation.amount;
        }
      }
    });

    Object.values(feedback).forEach((fb) => {
      const fbDate = new Date(fb.mealDate);
      if (fbDate >= startDate && fbDate <= endDate) {
        feedbackList.push(fb.feedback);
      }
    });

    const dataForAI = {
      totalMeals,
      totalDonations: totalDonationAmount,
      totalFeedback: feedbackList.length,
      feedbackSamples: feedbackList.slice(0, 10),
      dateRange: {
        start: startDate.toLocaleDateString(),
        end: endDate.toLocaleDateString(),
      },
    };

    const prompt = `Generate a professional summary for a school meal management system report.

Period: ${dataForAI.dateRange.start} to ${dataForAI.dateRange.end}
Total Meals Served: ${dataForAI.totalMeals}
Total Donations Received: $${dataForAI.totalDonations}
Total Feedback Entries: ${dataForAI.totalFeedback}

Sample Feedback:
${dataForAI.feedbackSamples.join('\n')}

Provide a concise, professional summary covering:
1. Overall feedback sentiment and satisfaction levels
2. Key insights or patterns in the data
3. Specific recommendations for program improvement

Write in clear, professional language suitable for school administrators. Do not include conversational phrases like "Okay, here is" or "Based on the data". Start directly with the analysis.`;

    const aiResponse = await sendQuestion(prompt);

    const feedbackSummary = aiResponse.error
      ? 'AI summary unavailable. Manual review recommended for all feedback entries.'
      : aiResponse.content;

    const report: Report = {
      generatedBy,
      dateGenerated: now.toISOString(),
      mealsServed: totalMeals,
      shortages: totalShortages,
      donationsReceived: totalDonationAmount,
      feedbackSummary: feedbackSummary.substring(0, 500),
    };

    const reportId = generateId();
    await saveReport(reportId, report);

    return {
      reportId,
      report,
      aiInsights: options.includeInsights ? aiResponse.content : undefined,
    };
  } catch (error) {
    console.error('Error generating AI report:', error);
    throw new Error('Failed to generate report');
  }
}

export async function getAIInsights(data: {
  mealsServed: number;
  donations: number;
  feedback: string[];
  timeframe: string;
}): Promise<string> {
  const prompt = `
Analyze this school meal program data and provide actionable insights:

Timeframe: ${data.timeframe}
Meals Served: ${data.mealsServed}
Total Donations: $${data.donations}

Recent Feedback:
${data.feedback.slice(0, 15).join('\n')}

Provide:
1. Key trends or patterns
2. Areas of concern
3. Specific recommendations for program improvement
4. Recognition of positive aspects

Keep it concise and actionable.
`;

  const response = await sendQuestion(prompt);

  if (response.error) {
    return 'Unable to generate insights at this time. Please try again later.';
  }

  return response.content;
}
