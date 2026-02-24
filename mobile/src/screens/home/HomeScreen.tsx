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
import { getMerchantVisits } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import type { HomeStackParamList, MerchantVisit } from '../../types';

type Props = { navigation: NativeStackNavigationProp<HomeStackParamList, 'HomeScreen'> };

export default function HomeScreen({ navigation }: Props) {
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [visits, setVisits] = useState<MerchantVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getMerchantVisits();
      setVisits(data);
    } catch {
      Alert.alert('Error', 'Failed to load merchants.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: clearAuth },
    ]);
  };

  const renderItem = ({ item }: { item: MerchantVisit }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MerchantHistory', { merchant: item.merchant })}
    >
      <View style={styles.cardIcon}>
        <Text style={styles.cardIconText}>{item.merchant.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{item.merchant.name}</Text>
        {item.merchant.category ? (
          <Text style={styles.cardCategory}>{item.merchant.category}</Text>
        ) : null}
        <Text style={styles.cardMeta}>
          {item.visitCount} visit{item.visitCount !== 1 ? 's' : ''} · Last:{' '}
          {new Date(item.lastVisit).toLocaleDateString()}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

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
        <View>
          <Text style={styles.greeting}>
            Hello, {user?.name ?? user?.phone ?? 'there'}
          </Text>
          <Text style={styles.headerSub}>Your merchant history</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visits}
        keyExtractor={(item) => item.merchant.id}
        renderItem={renderItem}
        contentContainerStyle={visits.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No merchants yet</Text>
            <Text style={styles.emptyText}>
              Sync your first receipt using the Sync tab and your purchases will appear here.
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  greeting: { fontSize: 18, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  logout: { fontSize: 14, color: '#ef4444' },
  listContent: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ede9fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardIconText: { fontSize: 20, fontWeight: '700', color: '#6366f1' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  cardCategory: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  chevron: { fontSize: 22, color: '#d1d5db', marginLeft: 8 },
  emptyContainer: { flex: 1 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
});
