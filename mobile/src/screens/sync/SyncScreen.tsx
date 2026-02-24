import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { syncReceipt } from '../../services/api';

type SyncMethod = 'code' | 'qr';

export default function SyncScreen() {
  const [method, setMethod] = useState<SyncMethod>('code');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const handleSync = async (rawCode: string) => {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter the code from your receipt.');
      return;
    }
    setLoading(true);
    try {
      const result = await syncReceipt(trimmed);
      setLastSynced(result.transaction.merchant.name);
      setCode('');
      Alert.alert(
        'Receipt synced!',
        `Your purchase at ${result.transaction.merchant.name} has been added to your history.`,
      );
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to sync receipt. Please check the code and try again.';
      Alert.alert('Sync Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sync a Receipt</Text>
        <Text style={styles.subtitle}>
          After a purchase, use the code or QR shown by the merchant to save your receipt.
        </Text>

        {/* Method selector */}
        <View style={styles.methodRow}>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'code' && styles.methodBtnActive]}
            onPress={() => setMethod('code')}
          >
            <Text style={[styles.methodText, method === 'code' && styles.methodTextActive]}>
              Enter Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.methodBtn, method === 'qr' && styles.methodBtnActive]}
            onPress={() => setMethod('qr')}
          >
            <Text style={[styles.methodText, method === 'qr' && styles.methodTextActive]}>
              Scan QR
            </Text>
          </TouchableOpacity>
        </View>

        {method === 'code' ? (
          <View style={styles.codeSection}>
            <TextInput
              style={styles.codeInput}
              placeholder="e.g. ABC123"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={() => handleSync(code)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Syncing…' : 'Sync Receipt'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.qrSection}>
            {/* QR scanner placeholder — requires native camera permission + react-native-vision-camera */}
            <View style={styles.scannerPlaceholder}>
              <Text style={styles.scannerIcon}>📷</Text>
              <Text style={styles.scannerLabel}>Camera viewfinder</Text>
              <Text style={styles.scannerHint}>
                Point camera at the QR code on the merchant's screen or receipt.
              </Text>
              <Text style={styles.scannerNote}>
                QR scanning requires react-native-vision-camera setup.{'\n'}
                See README for native configuration steps.
              </Text>
            </View>
          </View>
        )}

        {lastSynced && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>
              Last synced: {lastSynced}
            </Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1. After paying, the merchant's system shows a code or QR.{'\n'}
            2. Enter the 6-character code above, or scan the QR.{'\n'}
            3. The receipt is saved to your Syncly history.{'\n'}
            4. Next time you visit, select items to generate a repeat-order QR.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 28 },
  methodRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  methodBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  methodText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  methodTextActive: { color: '#6366f1' },
  codeSection: { gap: 12 },
  codeInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: 6,
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qrSection: {},
  scannerPlaceholder: {
    backgroundColor: '#111827',
    borderRadius: 16,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 24,
  },
  scannerIcon: { fontSize: 48 },
  scannerLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scannerHint: { color: '#9ca3af', fontSize: 13, textAlign: 'center' },
  scannerNote: { color: '#6b7280', fontSize: 11, textAlign: 'center', marginTop: 8, lineHeight: 18 },
  successBanner: {
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
  },
  successText: { color: '#065f46', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  infoBox: {
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 16,
    marginTop: 28,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#4c1d95', marginBottom: 8 },
  infoText: { fontSize: 13, color: '#5b21b6', lineHeight: 22 },
});
