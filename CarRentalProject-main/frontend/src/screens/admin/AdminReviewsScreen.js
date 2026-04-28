import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';
import axios from 'axios';

const AdminReviewsScreen = () => {
  const { logout } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState({});
  const [showReplyInput, setShowReplyInput] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const removalReasons = ['Hateful Language', 'Fake Information', 'Spam', 'Inappropriate Content'];

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await axios.get(`${API_URL}/reviews`);
      if (res.data.success) {
        setReviews(res.data.data);
      }
    } catch (error) {
      console.log('Error fetching admin reviews', error);
      Alert.alert('Error', 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const replyToReview = async (id) => {
    const txt = replyText[id];
    if (!txt || !txt.trim()) return;
    try {
      await axios.post(`${API_URL}/reviews/${id}/reply`, { text: txt });
      setReplyText({ ...replyText, [id]: '' });
      setShowReplyInput(null);
      fetchReviews();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit reply');
    }
  };

  const handleDeletePress = (id) => {
    setReviewToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDeleteReview = async (reason) => {
    if (!reviewToDelete) return;
    try {
      await axios.delete(`${API_URL}/reviews/${reviewToDelete}`, { data: { reason } });
      fetchReviews();
      setDeleteModalVisible(false);
      setReviewToDelete(null);
      Alert.alert('Removed', 'The review was removed based on your selected reason.');
    } catch (error) {
       Alert.alert('Error', 'Failed to remove review');
    }
  };

  const renderStars = (rating) => {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <Ionicons key={star} name={star <= rating ? "star" : "star-outline"} size={16} color="#FFD700" style={{ marginRight: 2 }} />
        ))}
      </View>
    );
  };

  const renderItem = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.userName}>{item.user?.name || 'Unknown User'}</Text>
          <View style={styles.rightHeader}>
              {renderStars(item.rating)}
              <Pressable onPress={() => handleDeletePress(item._id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </Pressable>
          </View>
        </View>
        <Text style={styles.reviewText}>{item.text}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <Pressable onPress={() => setShowReplyInput(showReplyInput === item._id ? null : item._id)}>
            <Text style={styles.replyActionText}>Reply as Admin</Text>
          </Pressable>
        </View>

        {showReplyInput === item._id && (
           <View style={styles.replyInputContainer}>
             <TextInput
               style={styles.replyInput}
               placeholder="Write admin reply..."
               value={replyText[item._id] || ''}
               onChangeText={val => setReplyText({...replyText, [item._id]: val})}
             />
             <Pressable onPress={() => replyToReview(item._id)} style={styles.replySubmitBtn}>
               <Ionicons name="send" size={16} color={COLORS.white} />
             </Pressable>
           </View>
        )}

        {/* Existing Replies List */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesList}>
             {item.replies.map((reply, idx) => (
                <View key={idx} style={[styles.replyItem, reply.isAdminReply && styles.adminReplyItem]}>
                  <Text style={[styles.replyUser, reply.isAdminReply && styles.adminReplyUser]}>
                    {reply.isAdminReply ? 'Admin Reply' : (reply.user?.name || 'User')}
                  </Text>
                  <Text style={styles.replyContent}>{reply.text}</Text>
                </View>
             ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Customer Reviews</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={fetchReviews} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={24} color={COLORS.primary} />
            </Pressable>
            <Pressable onPress={logout} style={{ marginLeft: 15 }}>
              <Ionicons name="log-out" size={24} color={COLORS.error} />
            </Pressable>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={item => item._id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50, color: COLORS.textMuted }}>No reviews to display.</Text>}
        />
      )}

      {/* Deletion Reason Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Removal Reason</Text>
                <Text style={styles.modalSubtitle}>This reason will be shown to the user.</Text>
                
                {removalReasons.map((reason, idx) => (
                    <Pressable key={idx} style={styles.reasonBtn} onPress={() => confirmDeleteReview(reason)}>
                        <Text style={styles.reasonText}>{reason}</Text>
                    </Pressable>
                ))}

                <Pressable style={styles.cancelModalBtn} onPress={() => { setDeleteModalVisible(false); setReviewToDelete(null); }}>
                    <Text style={styles.cancelModalText}>Cancel</Text>
                </Pressable>
            </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.textDark },
  refreshBtn: { padding: 5 },
  card: { backgroundColor: COLORS.white, padding: 15, borderRadius: 12, marginBottom: 15, ...SHADOWS.item },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.textDark, flex: 1 },
  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { marginLeft: 15 },
  reviewText: { fontSize: 15, color: COLORS.textMuted, lineHeight: 22, marginBottom: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  dateText: { fontSize: 13, color: '#aaa' },
  replyActionText: { color: COLORS.primary, fontWeight: '600' },
  replyInputContainer: { flexDirection: 'row', marginTop: 15, alignItems: 'center' },
  replyInput: { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
  replySubmitBtn: { backgroundColor: COLORS.primary, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  repliesList: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  replyItem: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginBottom: 5 },
  adminReplyItem: { backgroundColor: '#e6f7ff', borderWidth: 1, borderColor: '#91d5ff' },
  replyUser: { fontSize: 12, fontWeight: '700', color: COLORS.textDark, marginBottom: 2 },
  adminReplyUser: { color: COLORS.primary },
  replyContent: { fontSize: 14, color: COLORS.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 25, ...SHADOWS.heavy },
  modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginBottom: 5 },
  modalSubtitle: { fontSize: 13, color: COLORS.textMuted, marginBottom: 20 },
  reasonBtn: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  reasonText: { fontSize: 15, color: COLORS.textDark, fontWeight: '600', textAlign: 'center' },
  cancelModalBtn: { marginTop: 10, padding: 15 },
  cancelModalText: { fontSize: 15, color: COLORS.error, fontWeight: '700', textAlign: 'center' }
});

export default AdminReviewsScreen;
