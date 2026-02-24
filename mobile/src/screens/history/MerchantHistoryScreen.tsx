import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { getFrequentItems, getTransactions } from '../../services/api';
import type { HomeStackParamList, Transaction, FrequentItem, TransactionItem } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'MerchantHistory'>;
  route: RouteProp<HomeStackParamList, 'MerchantHistory'>;
};

type Tab = 'frequent' | 'recent';

export default function MerchantHistoryScreen({ navigation, route }: Props) {
  const { merchant } = route.params;
  const [tab, setTab] = useState<Tab>('frequent');
  const [frequent, setFrequent] = useState<FrequentItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [freq, txs] = await Promise.all([
        getFrequentItems(merchant.id),
        getTransactions(merchant.id),
      ]);
      setFrequent(freq);
      setTransactions(txs);
    } catch {
      Alert.alert('Error', 'Failed to load history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [merchant.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleItem = (sku: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const handleRepeatOrder = () => {
    if (selectedItems.size === 0) {
      Alert.alert('No items selected', 'Select items to include in your repeat order.');
      return;
    }
    const items: TransactionItem[] = frequent
      .filter((f) => selectedItems.has(f.sku))
      .map((f) => ({ name: f.name, price: f.lastPrice, quantity: 1, sku: f.sku }));
    navigation.navigate('OrderQR', { merchant, items });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'frequent' && styles.tabActive]}
          onPress={() => setTab('frequent')}
        >
          <Text style={[styles.tabText, tab === 'frequent' && styles.tabTextActive]}>
            Frequent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'recent' && styles.tabActive]}
          onPress={() => setTab('recent')}
        >
          <Text style={[styles.tabText, tab === 'recent' && styles.tabTextActive]}>
            Recent
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'frequent' ? (
        <>
          <Text style={styles.hint}>
            Select items, then tap "Repeat Order" to generate a QR for the merchant.
          </Text>
          <FlatList
            data={frequent}
            keyExtractor={(item) => item.sku}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
            renderItem={({ item }) => {
              const selected = selectedItems.has(item.sku);
              return (
                <TouchableOpacity
                  style={[styles.itemCard, selected && styles.itemCardSelected]}
                  onPress={() => toggleItem(item.sku)}
                >
                  <View style={styles.itemBody}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemMeta}>
                      Ordered {item.count}× · ${item.lastPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={styles.empty}>No frequent items yet.</Text>}
          />
          {selectedItems.size > 0 && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.orderButton} onPress={handleRepeatOrder}>
                <Text style={styles.orderButtonText}>
                  Repeat Order ({selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(tx) => tx.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          renderItem={({ item: tx }) => (
            <View style={styles.txCard}>
              <View style={styles.txHeader}>
                <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.txTotal}>${Number(tx.total).toFixed(2)}</Text>
              </View>
              {(tx.items as TransactionItem[]).map((item, i) => (
                <Text key={i} style={styles.txItem}>
                  {item.quantity}× {item.name} – ${item.price.toFixed(2)}
                </Text>
              ))}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No transactions found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#6366f1' },
  hint: { fontSize: 13, color: '#6b7280', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { padding: 16, gap: 10 },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: { borderColor: '#6366f1', backgroundColor: '#faf5ff' },
  itemBody: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  itemMeta: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  orderButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  orderButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  txCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  txDate: { fontSize: 13, color: '#6b7280' },
  txTotal: { fontSize: 15, fontWeight: '700', color: '#111827' },
  txItem: { fontSize: 13, color: '#374151', marginBottom: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 14 },
});
