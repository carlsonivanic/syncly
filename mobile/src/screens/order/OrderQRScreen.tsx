import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import QRCode from 'react-native-qrcode-svg';
import { generateOrderQR } from '../../services/api';
import type { HomeStackParamList, OrderResult } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'OrderQR'>;
  route: RouteProp<HomeStackParamList, 'OrderQR'>;
};

export default function OrderQRScreen({ route }: Props) {
  const { merchant, items } = route.params;
  const [order, setOrder] = useState<OrderResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    async function generate() {
      try {
        const result = await generateOrderQR(merchant.id, items);
        setOrder(result);

        // Auto-flag as expired when TTL elapses
        const msUntilExpiry = new Date(result.expiresAt).getTime() - Date.now();
        if (msUntilExpiry > 0) {
          timer = setTimeout(() => setExpired(true), msUntilExpiry);
        }
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          'Failed to generate order QR.';
        Alert.alert('Error', msg);
      } finally {
        setLoading(false);
      }
    }

    generate();
    return () => clearTimeout(timer);
  }, [merchant.id, items]);

  const handleRegenerate = async () => {
    setLoading(true);
    setExpired(false);
    setOrder(null);
    try {
      const result = await generateOrderQR(merchant.id, items);
      setOrder(result);
      const msUntilExpiry = new Date(result.expiresAt).getTime() - Date.now();
      if (msUntilExpiry > 0) setTimeout(() => setExpired(true), msUntilExpiry);
    } catch {
      Alert.alert('Error', 'Failed to regenerate QR code.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Generating your order QR…</Text>
      </View>
    );
  }

  if (!order) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.merchantName}>{merchant.name}</Text>
      <Text style={styles.subtitle}>Show this QR to the merchant to place your order.</Text>

      {/* QR Code */}
      <View style={[styles.qrContainer, expired && styles.qrExpired]}>
        {expired ? (
          <View style={styles.expiredOverlay}>
            <Text style={styles.expiredIcon}>⏱</Text>
            <Text style={styles.expiredTitle}>QR Expired</Text>
            <Text style={styles.expiredText}>Tap "Refresh" to generate a new one.</Text>
          </View>
        ) : (
          <QRCode value={order.qrPayload} size={240} color="#111827" backgroundColor="#fff" />
        )}
      </View>

      <Text style={styles.expiresLabel}>
        {expired
          ? 'Expired'
          : `Expires ${new Date(order.expiresAt).toLocaleTimeString()}`}
      </Text>

      {expired && (
        <TouchableOpacity style={styles.refreshButton} onPress={handleRegenerate}>
          <Text style={styles.refreshButtonText}>Refresh QR</Text>
        </TouchableOpacity>
      )}

      {/* Order summary */}
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>Your order</Text>
        {items.map((item, i) => (
          <View key={i} style={styles.summaryRow}>
            <Text style={styles.summaryItem}>
              {item.quantity}× {item.name}
            </Text>
            <Text style={styles.summaryPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryTotal}>Total</Text>
          <Text style={styles.summaryTotal}>
            ${items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2)}
          </Text>
        </View>
      </View>

      <Text style={styles.note}>
        The merchant will scan this QR to automatically load your order — no need to repeat yourself.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  inner: { padding: 24, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  merchantName: { fontSize: 22, fontWeight: '800', color: '#111827', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 4, marginBottom: 28 },
  qrContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 280,
    minHeight: 280,
  },
  qrExpired: { opacity: 0.3 },
  expiredOverlay: { alignItems: 'center', gap: 8 },
  expiredIcon: { fontSize: 40 },
  expiredTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  expiredText: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
  expiresLabel: { fontSize: 13, color: '#9ca3af', marginTop: 10, marginBottom: 8 },
  refreshButton: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 8,
  },
  refreshButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  summary: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryItem: { fontSize: 14, color: '#374151' },
  summaryPrice: { fontSize: 14, color: '#6b7280' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 10 },
  summaryTotal: { fontSize: 15, fontWeight: '700', color: '#111827' },
  note: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 20,
    paddingHorizontal: 20,
  },
});
