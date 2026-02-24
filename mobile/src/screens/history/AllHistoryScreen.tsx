import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions } from '../../services/api';
import type { Transaction, TransactionItem } from '../../types';

export default function AllHistoryScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getTransactions();
      setTransactions(data);
    } catch {
      Alert.alert('Error', 'Failed to load receipts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>All Receipts</Text>
        <Text style={styles.subtitle}>{transactions.length} synced</Text>
      </View>
      <FlatList
        data={transactions}
        keyExtractor={(tx) => tx.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        renderItem={({ item: tx }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.merchantName}>{tx.merchant.name}</Text>
              <Text style={styles.total}>${Number(tx.total).toFixed(2)} {tx.currency}</Text>
            </View>
            <Text style={styles.date}>{new Date(tx.createdAt).toLocaleString()}</Text>
            <View style={styles.divider} />
            {(tx.items as TransactionItem[]).map((item, i) => (
              <View key={i} style={styles.itemRow}>
                <Text style={styles.itemName}>{item.quantity}× {item.name}</Text>
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyText}>
              Use the Sync tab to link your purchases.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  merchantName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  total: { fontSize: 15, fontWeight: '700', color: '#6366f1' },
  date: { fontSize: 12, color: '#9ca3af', marginTop: 2, marginBottom: 10 },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginBottom: 10 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 13, color: '#374151' },
  itemPrice: { fontSize: 13, color: '#6b7280' },
  emptyState: { paddingTop: 80, alignItems: 'center', paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
});
