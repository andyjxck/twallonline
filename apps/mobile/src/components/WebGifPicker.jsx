import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { X, Search } from 'lucide-react-native';

const GIPHY_API_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY;

export default function WebGifPicker({ visible, onSelect, onClose }) {
  if (Platform.OS !== 'web' || !visible) return null;

  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    if (!GIPHY_API_KEY) return;
    setLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=30&rating=pg-13`);
      const data = await res.json();
      setTrending(data.data || []);
    } catch (e) {
      console.warn('Giphy trending fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (q) => {
    if (!GIPHY_API_KEY || !q.trim()) {
      setGifs([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=30&rating=pg-13`);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (e) {
      console.warn('Giphy search error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQueryChange = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchGifs(text), 400);
  };

  const handleSelect = (gif) => {
    const url = gif.images?.original?.url || gif.images?.downsized?.url || gif.images?.fixed_height?.url;
    if (url) {
      onSelect({ url });
      onClose();
    }
  };

  const displayGifs = query.trim() ? gifs : trending;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GIFs</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color="rgba(255,255,255,0.4)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search GIFs..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={handleQueryChange}
          autoFocus
        />
        {query ? (
          <TouchableOpacity onPress={() => { setQuery(''); setGifs([]); }}>
            <X size={16} color="rgba(255,255,255,0.4)" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && displayGifs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFF" />
        </View>
      ) : (
        <FlatList
          data={displayGifs}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => {
            const preview = item.images?.fixed_height_small?.url || item.images?.fixed_height?.url;
            return (
              <TouchableOpacity
                onPress={() => handleSelect(item)}
                style={styles.gifItem}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: preview }}
                  style={styles.gifImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.emptyText}>
                {query ? 'No GIFs found' : 'Type to search GIFs'}
              </Text>
            ) : null
          }
        />
      )}

      <View style={styles.poweredBy}>
        <Text style={styles.poweredByText}>Powered by GIPHY</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 70,
    left: 8,
    right: 8,
    height: 360,
    backgroundColor: '#111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 10,
    marginVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    paddingVertical: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    padding: 6,
  },
  row: {
    gap: 6,
  },
  gifItem: {
    flex: 1,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 6,
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginTop: 40,
    fontSize: 14,
  },
  poweredBy: {
    paddingVertical: 6,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  poweredByText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
