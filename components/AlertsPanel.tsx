import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronUp,
  Clock,
  DollarSign,
  FileWarning
} from 'lucide-react-native';

export interface Alert {
  id: string;
  type: 'pending_request' | 'low_inventory' | 'urgent' | 'success';
  title: string;
  message: string;
  action?: () => void;
  actionLabel?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const router = useRouter();

  if (alerts.length === 0) {
    return null;
  }

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'pending_request':
        return <Clock color="#FF9500" size={20} />;
      case 'low_inventory':
        return <FileWarning color="#FF3B30" size={20} />;
      case 'urgent':
        return <AlertCircle color="#FF3B30" size={20} />;
      case 'success':
        return <CheckCircle color="#34C759" size={20} />;
      default:
        return <AlertCircle color="#007AFF" size={20} />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'pending_request':
        return '#FFF3E0';
      case 'low_inventory':
        return '#FFEBEE';
      case 'urgent':
        return '#FFEBEE';
      case 'success':
        return '#E8F5E9';
      default:
        return '#E3F2FD';
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <AlertCircle color="#FF3B30" size={24} />
          <Text style={styles.headerTitle}>Alerts & Notifications</Text>
          {alerts.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{alerts.length}</Text>
            </View>
          )}
        </View>
        {isExpanded ? (
          <ChevronUp color="#666" size={20} />
        ) : (
          <ChevronDown color="#666" size={20} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.alertsList}>
          {alerts.map((alert) => (
            <View 
              key={alert.id} 
              style={[
                styles.alertItem,
                { backgroundColor: getAlertColor(alert.type) }
              ]}
            >
              <View style={styles.alertIcon}>
                {getAlertIcon(alert.type)}
              </View>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>{alert.title}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                {alert.action && alert.actionLabel && (
                  <TouchableOpacity 
                    style={styles.alertAction}
                    onPress={alert.action}
                  >
                    <Text style={styles.alertActionText}>{alert.actionLabel}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  alertsList: {
    padding: 12,
  },
  alertItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  alertIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  alertAction: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  alertActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007AFF',
  },
});
