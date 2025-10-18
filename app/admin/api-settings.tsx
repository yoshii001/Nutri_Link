import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/constants/theme';
import { Plus, Trash2, Edit2, Key, Check, X } from 'lucide-react-native';
import {
  getAllApis,
  addApi,
  updateApi,
  deleteApi,
  ApiConfig,
} from '@/services/firebase/apiService';

export default function ApiSettingsScreen() {
  const router = useRouter();
  const { userData } = useAuth();
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingApi, setEditingApi] = useState<ApiConfig | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    apiKey: '',
    model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    isActive: true,
    priority: 1,
  });

  useEffect(() => {
    if (userData?.role !== 'admin') {
      router.replace('/');
      return;
    }
    loadApis();
  }, [userData]);

  const loadApis = async () => {
    try {
      setLoading(true);
      const allApis = await getAllApis();
      const apiList = Object.entries(allApis)
        .map(([id, api]) => ({ ...api, id }))
        .sort((a, b) => a.priority - b.priority);
      setApis(apiList);
    } catch (error) {
      console.error('Error loading APIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddApi = () => {
    setEditingApi(null);
    setFormData({
      name: '',
      apiKey: '',
      model: 'deepseek/deepseek-r1-0528-qwen3-8b:free',
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      isActive: true,
      priority: apis.length + 1,
    });
    setShowModal(true);
  };

  const handleEditApi = (api: ApiConfig) => {
    setEditingApi(api);
    setFormData({
      name: api.name,
      apiKey: api.apiKey,
      model: api.model,
      endpoint: api.endpoint,
      isActive: api.isActive,
      priority: api.priority,
    });
    setShowModal(true);
  };

  const handleSaveApi = async () => {
    if (!formData.name.trim() || !formData.apiKey.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      if (editingApi) {
        await updateApi(editingApi.id, formData);
      } else {
        await addApi(formData);
      }
      setShowModal(false);
      loadApis();
    } catch (error) {
      console.error('Error saving API:', error);
      Alert.alert('Error', 'Failed to save API configuration');
    }
  };

  const handleDeleteApi = (api: ApiConfig) => {
    Alert.alert(
      'Delete API',
      `Are you sure you want to delete "${api.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteApi(api.id);
              loadApis();
            } catch (error) {
              console.error('Error deleting API:', error);
              Alert.alert('Error', 'Failed to delete API');
            }
          },
        },
      ]
    );
  };

  const handleToggleActive = async (api: ApiConfig) => {
    try {
      await updateApi(api.id, { isActive: !api.isActive });
      loadApis();
    } catch (error) {
      console.error('Error updating API status:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>AI API Settings</Text>
        <TouchableOpacity onPress={handleAddApi} style={styles.addButton}>
          <Plus color={theme.colors.surface} size={24} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {apis.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Key color={theme.colors.text.light} size={64} />
            <Text style={styles.emptyText}>No API keys configured</Text>
            <Text style={styles.emptySubtext}>
              Add an OpenRouter API key to enable AI report generation
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddApi}>
              <Text style={styles.emptyButtonText}>Add API Key</Text>
            </TouchableOpacity>
          </View>
        ) : (
          apis.map((api) => (
            <View key={api.id} style={styles.apiCard}>
              <View style={styles.apiHeader}>
                <View style={styles.apiInfo}>
                  <View style={styles.apiTitleRow}>
                    <Text style={styles.apiName}>{api.name}</Text>
                    {api.priority === 1 && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.apiModel}>{api.model}</Text>
                  <Text style={styles.apiKey} numberOfLines={1}>
                    Key: {api.apiKey.substring(0, 20)}...
                  </Text>
                  {api.lastUsed && (
                    <Text style={styles.lastUsed}>
                      Last used: {new Date(api.lastUsed).toLocaleDateString()}
                    </Text>
                  )}
                  {api.failureCount !== undefined && api.failureCount > 0 && (
                    <Text style={styles.failureCount}>
                      Failures: {api.failureCount}
                    </Text>
                  )}
                </View>
                <View style={styles.apiActions}>
                  <Switch
                    value={api.isActive}
                    onValueChange={() => handleToggleActive(api)}
                    trackColor={{ false: '#ccc', true: theme.colors.primary }}
                  />
                </View>
              </View>
              <View style={styles.apiFooter}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEditApi(api)}
                >
                  <Edit2 color={theme.colors.primary} size={18} />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteApi(api)}
                >
                  <Trash2 color={theme.colors.error} size={18} />
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingApi ? 'Edit API' : 'Add API'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X color={theme.colors.text.primary} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>API Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="e.g., OpenRouter Primary"
                placeholderTextColor={theme.colors.text.light}
              />

              <Text style={styles.label}>API Key *</Text>
              <TextInput
                style={styles.input}
                value={formData.apiKey}
                onChangeText={(text) => setFormData({ ...formData, apiKey: text })}
                placeholder="sk-or-v1-..."
                placeholderTextColor={theme.colors.text.light}
                secureTextEntry={true}
              />

              <Text style={styles.label}>Model</Text>
              <TextInput
                style={styles.input}
                value={formData.model}
                onChangeText={(text) => setFormData({ ...formData, model: text })}
                placeholder="deepseek/deepseek-r1-0528-qwen3-8b:free"
                placeholderTextColor={theme.colors.text.light}
              />

              <Text style={styles.label}>Endpoint URL</Text>
              <TextInput
                style={styles.input}
                value={formData.endpoint}
                onChangeText={(text) => setFormData({ ...formData, endpoint: text })}
                placeholder="https://openrouter.ai/api/v1/chat/completions"
                placeholderTextColor={theme.colors.text.light}
              />

              <Text style={styles.label}>Priority</Text>
              <TextInput
                style={styles.input}
                value={formData.priority.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, priority: parseInt(text) || 1 })
                }
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={theme.colors.text.light}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) =>
                    setFormData({ ...formData, isActive: value })
                  }
                  trackColor={{ false: '#ccc', true: theme.colors.primary }}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveApi}
              >
                <Check color={theme.colors.surface} size={20} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.surface,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: theme.spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.borderRadius.full,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginTop: theme.spacing.lg,
  },
  emptySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  emptyButton: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  apiCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  apiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  apiInfo: {
    flex: 1,
  },
  apiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  apiName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  primaryBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  primaryBadgeText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  apiModel: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  apiKey: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.light,
  },
  lastUsed: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  failureCount: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  apiActions: {
    justifyContent: 'flex-start',
  },
  apiFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.primary,
  },
  deleteButton: {
    backgroundColor: theme.colors.errorLight,
  },
  deleteButtonText: {
    color: theme.colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    width: '90%',
    maxHeight: '80%',
    ...theme.shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: theme.colors.text.primary,
  },
  modalBody: {
    padding: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.text.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: theme.colors.surface,
  },
});
