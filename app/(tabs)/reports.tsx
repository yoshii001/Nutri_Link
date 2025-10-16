import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, Platform, Share } from 'react-native';
import { getAllReports } from '@/services/firebase/reportService';
import { getAllMealTracking } from '@/services/firebase/mealTrackingService';
import { getAllDonations } from '@/services/firebase/donationService';
import { getAllFeedback } from '@/services/firebase/feedbackService';
import { getAllSchools } from '@/services/firebase/schoolService';
import { Report } from '@/types';
import { FileText, TrendingUp, DollarSign, MessageSquare, Users, Calendar, Download, Sparkles, X, Share2, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { generateAIReport } from '@/services/aiReportService';
import { generateReportHTML, generateAndDownloadPDF, generateAndSharePDF } from '@/utils/pdfGenerator';

export default function ReportsScreen() {
  const { userData } = useAuth();
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [liveStats, setLiveStats] = useState({
    totalMeals: 0,
    totalDonations: 0,
    totalFeedback: 0,
    totalSchools: 0,
    weekMeals: 0,
    monthMeals: 0,
    pendingFeedback: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportPeriodDays, setReportPeriodDays] = useState('30');
  const [showShareModal, setShowShareModal] = useState(false);
  const [generatedReportData, setGeneratedReportData] = useState<{
    reportId: string;
    report: any;
  } | null>(null);

  if (!userData || (userData.role !== 'admin' && userData.role !== 'principal')) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>You don't have permission to view this page.</Text>
        </View>
      </View>
    );
  }

  const loadLiveStats = async () => {
    try {
      const [meals, donations, feedback, schools] = await Promise.all([
        getAllMealTracking(),
        getAllDonations(),
        getAllFeedback(),
        getAllSchools(),
      ]);

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let totalMeals = 0;
      let weekMeals = 0;
      let monthMeals = 0;

      Object.entries(meals).forEach(([date, tracking]) => {
        const mealCount = Object.keys(tracking.students || {}).length;
        totalMeals += mealCount;

        const mealDate = new Date(date);
        if (mealDate >= weekAgo) weekMeals += mealCount;
        if (mealDate >= monthAgo) monthMeals += mealCount;
      });

      const totalDonationAmount = Object.values(donations).reduce(
        (sum, donation) => sum + donation.amount,
        0
      );

      const pendingFeedbackCount = Object.values(feedback).filter(
        (fb) => fb.status === 'submitted'
      ).length;

      setLiveStats({
        totalMeals,
        totalDonations: totalDonationAmount,
        totalFeedback: Object.keys(feedback).length,
        totalSchools: Object.keys(schools).length,
        weekMeals,
        monthMeals,
        pendingFeedback: pendingFeedbackCount,
      });
    } catch (error) {
      console.error('Error loading live stats:', error);
    }
  };

  const loadReports = async () => {
    try {
      const data = await getAllReports();
      setReports(data);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  useEffect(() => {
    loadReports();
    loadLiveStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadReports(), loadLiveStats()]);
    setRefreshing(false);
  };

  const handleGenerateReport = async () => {
    if (!userData) return;

    setShowGenerateModal(false);
    setGenerating(true);

    try {
      const days = parseInt(reportPeriodDays) || 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await generateAIReport(userData.email, {
        startDate: startDate.toISOString(),
        includeInsights: true,
      });

      await loadReports();

      setGeneratedReportData(result);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleShareReport = async () => {
    if (!generatedReportData) return;

    const { report, reportId } = generatedReportData;

    try {
      const html = generateReportHTML(reportId, report);
      await generateAndSharePDF(html, `KidsFeed_Report_${reportId}`);

      if (Platform.OS === 'web') {
        Alert.alert('Success', 'Opening print dialog for PDF...');
      }

      setShowShareModal(false);
      setGeneratedReportData(null);
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report. Please try again.');
    }
  };

  const handleDownloadReport = async () => {
    if (!generatedReportData) return;

    const { report, reportId } = generatedReportData;

    try {
      const html = generateReportHTML(reportId, report);
      await generateAndDownloadPDF(html, `KidsFeed_Report_${reportId}`);

      if (Platform.OS === 'web') {
        Alert.alert('Success', 'Opening print dialog for PDF download...');
      }

      setShowShareModal(false);
      setGeneratedReportData(null);
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report. Please try again.');
    }
  };

  const handleDownloadExistingReport = async (reportId: string, report: Report) => {
    try {
      const html = generateReportHTML(reportId, report);
      await generateAndDownloadPDF(html, `KidsFeed_Report_${reportId}`);
    } catch (error) {
      console.error('Error downloading report:', error);
      Alert.alert('Error', 'Failed to download report. Please try again.');
    }
  };

  const handleShareExistingReport = async (reportId: string, report: Report) => {
    try {
      const html = generateReportHTML(reportId, report);
      await generateAndSharePDF(html, `KidsFeed_Report_${reportId}`);
    } catch (error) {
      console.error('Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report. Please try again.');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >

      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Generated Reports</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={() => setShowGenerateModal(true)}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Sparkles color="#fff" size={18} />
                  <Text style={styles.generateButtonText}>Generate with AI</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {Object.entries(reports)
          .sort(([, a], [, b]) =>
            new Date(b.dateGenerated).getTime() - new Date(a.dateGenerated).getTime()
          )
          .map(([id, report]) => (
            <View key={id} style={styles.card}>
              <View style={styles.cardHeader}>
                <FileText color="#007AFF" size={24} />
                <View style={styles.headerText}>
                  <View style={styles.reportTitleRow}>
                    <Text style={styles.reportId}>Report #{id.slice(-8)}</Text>
                    <View style={styles.aiBadge}>
                      <Sparkles color="#007AFF" size={12} />
                      <Text style={styles.aiBadgeText}>AI Generated</Text>
                    </View>
                  </View>
                  <View style={styles.dateRow}>
                    <Calendar color="#666" size={14} />
                    <Text style={styles.dateText}>
                      {new Date(report.dateGenerated).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <TrendingUp color="#4CAF50" size={20} />
                  <Text style={styles.statValue}>{report.mealsServed}</Text>
                  <Text style={styles.statLabel}>Meals Served</Text>
                </View>

                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.shortages}</Text>
                  <Text style={styles.statLabel}>Shortages</Text>
                </View>

                <View style={styles.statItem}>
                  <DollarSign color="#4CAF50" size={20} />
                  <Text style={styles.statValue}>${report.donationsReceived}</Text>
                  <Text style={styles.statLabel}>Donations</Text>
                </View>
              </View>

              <View style={styles.summarySection}>
                <Text style={styles.summaryTitle}>Feedback Summary</Text>
                <Text style={styles.summaryText}>{report.feedbackSummary}</Text>
              </View>

              <View style={styles.reportActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDownloadExistingReport(id, report)}
                >
                  <Download color="#007AFF" size={18} />
                  <Text style={styles.actionButtonText}>Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleShareExistingReport(id, report)}
                >
                  <Share2 color="#4CAF50" size={18} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

        {Object.keys(reports).length === 0 && (
          <View style={styles.emptyState}>
            <FileText color="#ccc" size={64} />
            <Text style={styles.emptyText}>No reports generated yet</Text>
            <Text style={styles.emptySubtext}>Use AI to generate your first report</Text>
          </View>
        )}
      </View>

      <Modal
        visible={showGenerateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Sparkles color="#007AFF" size={24} />
                <Text style={styles.modalTitle}>Generate AI Report</Text>
              </View>
              <TouchableOpacity onPress={() => setShowGenerateModal(false)}>
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Create a comprehensive report with AI-powered insights analyzing meals, donations, and feedback.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Report Period (Days)</Text>
              <TextInput
                style={styles.input}
                value={reportPeriodDays}
                onChangeText={setReportPeriodDays}
                keyboardType="number-pad"
                placeholder="30"
              />
              <Text style={styles.inputHint}>
                Data from the last {reportPeriodDays || '30'} days will be analyzed
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGenerateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleGenerateReport}
              >
                <Sparkles color="#fff" size={18} />
                <Text style={styles.confirmButtonText}>Generate Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showShareModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Sparkles color="#4CAF50" size={24} />
                <Text style={styles.modalTitle}>Report Generated!</Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowShareModal(false);
                setGeneratedReportData(null);
              }}>
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Your AI-powered report has been successfully generated. Choose an option below to share or save it.
            </Text>

            <View style={styles.shareOptions}>
              <TouchableOpacity
                style={styles.shareOptionButton}
                onPress={handleShareReport}
              >
                <View style={styles.shareOptionIcon}>
                  <Share2 color="#007AFF" size={28} />
                </View>
                <Text style={styles.shareOptionTitle}>Share Report</Text>
                <Text style={styles.shareOptionSubtitle}>
                  {Platform.OS === 'web' ? 'Print/Save as PDF' : 'Share PDF via apps'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shareOptionButton}
                onPress={handleDownloadReport}
              >
                <View style={styles.shareOptionIcon}>
                  <Save color="#4CAF50" size={28} />
                </View>
                <Text style={styles.shareOptionTitle}>
                  {Platform.OS === 'web' ? 'Download PDF' : 'Save & Share PDF'}
                </Text>
                <Text style={styles.shareOptionSubtitle}>
                  {Platform.OS === 'web' ? 'Save as PDF file' : 'Open share dialog with PDF'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeLaterButton}
              onPress={() => {
                setShowShareModal(false);
                setGeneratedReportData(null);
              }}
            >
              <Text style={styles.closeLaterButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 16,
  },
  content: {
    padding: 16,
    paddingTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  exportButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  generateButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    flex: 1,
  },
  reportTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  reportId: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  aiBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#007AFF',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  summarySection: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#bbb',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F44336',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  modalDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#666',
    lineHeight: 20,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#333',
  },
  inputHint: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#999',
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
  shareOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  shareOptionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  shareOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareOptionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 4,
  },
  shareOptionSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#666',
    textAlign: 'center',
  },
  closeLaterButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeLaterButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
  },
  reportActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
});