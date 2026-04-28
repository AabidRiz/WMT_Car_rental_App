import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/colors';
import { AuthContext, API_URL } from '../context/AuthContext';
import axios from 'axios';

const CustomerReviews = () => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Reply State
  const [replyText, setReplyText] = useState({});
  const [showReplyInput, setShowReplyInput] = useState(null);

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
      console.log('Error fetching reviews:', error);
    }
  };

  const submitReview = async () => {
    if (!text.trim()) {
      Alert.alert('Error', 'Please enter a review text.');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await axios.put(`${API_URL}/reviews/${editingId}`, { rating, text });
      } else {
        await axios.post(`${API_URL}/reviews`, { rating, text });
      }
      setRating(5);
      setText('');
      setEditingId(null);
      fetchReviews();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const deleteReview = async (id) => {
    Alert.alert('Delete Review', 'Are you sure you want to delete this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_URL}/reviews/${id}`);
            fetchReviews();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete review');
          }
        }
      }
    ]);
  };

  const likeReview = async (id) => {
    try {
      await axios.post(`${API_URL}/reviews/${id}/like`);
      fetchReviews();
    } catch (error) {
      console.log('Error liking review', error);
    }
  };

  const replyToReview = async (id) => {
    const txt = replyText[id];
    if (!txt?.trim()) return;
    try {
      await axios.post(`${API_URL}/reviews/${id}/reply`, { text: txt });
      setReplyText({ ...replyText, [id]: '' });
      setShowReplyInput(null);
      fetchReviews();
    } catch (error) {
      Alert.alert('Error', 'Failed to submit reply');
    }
  };

  const handleEditClick = (review) => {
    setEditingId(review._id);
    setText(review.text);
    setRating(review.rating);
  };

  const renderStars = (selectedRating, onStarPress = null) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map(star => (
          <Pressable key={star} onPress={() => onStarPress && onStarPress(star)}>
            <Ionicons
              name={star <= selectedRating ? "star" : "star-outline"}
              size={onStarPress ? 30 : 16}
              color="#FFD700"
              style={{ marginRight: onStarPress ? 10 : 2 }}
            />
          </Pressable>
        ))}
      </View>
    );
  };

  const renderReviewItem = ({ item }) => {
    const isOwner = user && user._id === item.user?._id;
    const hasLiked = user && item.likes.includes(user._id);

    return (
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <View style={styles.reviewerInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.user?.name?.charAt(0) || 'U'}</Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.reviewerName}>{item.user?.name || 'Unknown User'}</Text>
              {renderStars(item.rating)}
            </View>
          </View>
          {isOwner && !item.isRemoved && (
            <View style={styles.actionButtons}>
              <Pressable onPress={() => handleEditClick(item)} style={styles.iconBtn}>
                <Ionicons name="pencil" size={18} color={COLORS.primary} />
              </Pressable>
              <Pressable onPress={() => deleteReview(item._id)} style={styles.iconBtn}>
                <Ionicons name="trash" size={18} color={COLORS.error} />
              </Pressable>
            </View>
          )}
        </View>

        {item.isRemoved ? (
          <View style={styles.removedBox}>
            <Ionicons name="warning" size={20} color={COLORS.error} />
            <Text style={styles.removedText}>This review was removed by an administrator. Reason: {item.removalReason}</Text>
          </View>
        ) : (
          <Text style={styles.reviewText}>{item.text}</Text>
        )}

        {!item.isRemoved && (
          <View style={styles.interactionRow}>
            <Pressable onPress={() => likeReview(item._id)} style={styles.interactionBtn}>
              <Ionicons name={hasLiked ? "heart" : "heart-outline"} size={20} color={hasLiked ? COLORS.error : COLORS.textMuted} />
              <Text style={styles.interactionText}>{item.likes.length > 0 ? item.likes.length : ''} Like</Text>
            </Pressable>
            <Pressable onPress={() => setShowReplyInput(showReplyInput === item._id ? null : item._id)} style={styles.interactionBtn}>
              <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.interactionText}>Reply</Text>
            </Pressable>
          </View>
        )}

        {!item.isRemoved && showReplyInput === item._id && (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a reply..."
              value={replyText[item._id] || ''}
              onChangeText={val => setReplyText({ ...replyText, [item._id]: val })}
            />
            <Pressable onPress={() => replyToReview(item._id)} style={styles.replySubmitBtn}>
              <Ionicons name="send" size={18} color={COLORS.white} />
            </Pressable>
          </View>
        )}

        {/* Replies List */}
        {!item.isRemoved && item.replies && item.replies.length > 0 && (
          <View style={styles.repliesList}>
            {item.replies.map((reply, idx) => (
              <View key={idx} style={[styles.replyItem, reply.isAdminReply && styles.adminReplyItem]}>
                <View style={styles.replyHeaderRow}>
                  <Ionicons name={reply.isAdminReply ? "shield-checkmark" : "person"} size={14} color={reply.isAdminReply ? COLORS.primary : COLORS.textMuted} />
                  <Text style={[styles.replyUser, reply.isAdminReply && styles.adminReplyUser]}>
                    {reply.isAdminReply ? 'Admin' : (reply.user?.name || 'User')}
                  </Text>
                </View>
                <Text style={styles.replyContent}>{reply.text}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Customer Reviews</Text>
      
      {/* Add Review Form */}
      <View style={styles.formContainer}>
        <Text style={styles.formTitle}>{editingId ? 'Edit Your Review' : 'Write a Review'}</Text>
        <View style={styles.starSelection}>
          {renderStars(rating, setRating)}
        </View>
        <TextInput
          style={styles.textInput}
          placeholder="Share your experience..."
          multiline
          numberOfLines={4}
          value={text}
          onChangeText={setText}
        />
        <View style={styles.formActionsRow}>
          {editingId && (
            <Pressable style={styles.cancelBtn} onPress={() => { setEditingId(null); setText(''); setRating(5); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          )}
          <Pressable style={styles.submitBtn} onPress={submitReview} disabled={loading}>
            <Text style={styles.submitBtnText}>{editingId ? 'Update' : 'Post'} Review</Text>
          </Pressable>
        </View>
      </View>

      {/* Reviews List */}
      <FlatList
        data={reviews}
        keyExtractor={item => item._id}
        renderItem={renderReviewItem}
        scrollEnabled={false} // So it can live inside HomeScreen ScrollView
        ListEmptyComponent={<Text style={styles.emptyText}>No reviews yet. Be the first to review!</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 15,
  },
  formContainer: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    ...SHADOWS.floating,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 10,
  },
  starSelection: {
    marginBottom: 15,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    color: COLORS.textDark,
  },
  formActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  cancelBtnText: {
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  reviewCard: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    ...SHADOWS.item,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 2,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconBtn: {
    marginLeft: 15,
    padding: 4,
  },
  reviewText: {
    fontSize: 15,
    color: COLORS.textMuted,
    lineHeight: 22,
    marginBottom: 15,
  },
  interactionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  interactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  interactionText: {
    color: COLORS.textMuted,
    marginLeft: 5,
    fontSize: 14,
  },
  replyInputContainer: {
    flexDirection: 'row',
    marginTop: 15,
    alignItems: 'center',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  replySubmitBtn: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repliesList: {
    marginTop: 15,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#f0f0f0',
  },
  replyItem: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  adminReplyItem: {
    backgroundColor: '#e6f7ff',
    borderWidth: 1,
    borderColor: '#91d5ff',
  },
  replyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyUser: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 6,
  },
  adminReplyUser: {
    color: COLORS.primary,
  },
  replyContent: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    marginTop: 20,
  },
  removedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginTop: 5,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  removedText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1
  }
});

export default CustomerReviews;
