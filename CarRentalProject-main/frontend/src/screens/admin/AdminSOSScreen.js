import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Linking, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';

const BASE_URL = API_URL.replace('/api', '');

const AdminSOSScreen = () => {
    const { logout } = useContext(AuthContext);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyVisible, setReplyVisible] = useState(false);
    const [imageModalVisible, setImageModalVisible] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [replyText, setReplyText] = useState('');

    useEffect(() => {
        fetchAlerts();
    }, []);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/sos/admin`);
            if (res.data.success) {
                setAlerts(res.data.data);
            }
        } catch (e) {
            console.log('Admin SOS fetch error:', e.message);
        } finally {
            setLoading(false);
        }
    };

    const replyToAlert = async () => {
        if (!replyText || !selectedId) return;
        try {
            const res = await axios.put(`${API_URL}/sos/${selectedId}/reply`, { adminReply: replyText });
            if (res.data.success) {
                Alert.alert('Sent', 'Your reply has been sent to the user.');
                setReplyVisible(false);
                setReplyText('');
                fetchAlerts();
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to send reply.');
        }
    };

    const deleteAlert = async (id) => {
        Alert.alert('Delete Report', 'Are you sure you want to permanently remove this incident?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    await axios.delete(`${API_URL}/sos/${id}`);
                    setAlerts(alerts.filter(a => a._id !== id));
                    Alert.alert('Deleted', 'Incident report removed.');
                } catch (e) {
                    Alert.alert('Error', 'Failed to delete alert.');
                }
            }}
        ]);
    };

    const resolveAlert = async (id) => {
        try {
            const res = await axios.put(`${API_URL}/sos/${id}/admin-resolve`, { status: 'Resolved' });
            if (res.data.success) {
                Alert.alert('Resolved', 'This emergency has been marked as resolved.');
                fetchAlerts();
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to resolve alert.');
        }
    };

    const openMap = (lat, lng) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(url);
    };

    const viewPdf = (pdfPath) => {
        if (!pdfPath) return;
        const base = API_URL.replace('/api', '');
        Linking.openURL(`${base}/${pdfPath}`);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.error} /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Emergency SOS Hub</Text>
                    <Text style={styles.headerSub}>{alerts.filter(a => !a.resolvedByAdmin).length} Active Incidents</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable onPress={fetchAlerts} style={styles.refreshBtn}>
                        <Ionicons name="refresh" size={20} color={COLORS.primary} />
                    </Pressable>
                    <Pressable onPress={logout} style={{ marginLeft: 15 }}>
                       <Ionicons name="log-out" size={24} color={COLORS.error} />
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.sectionHeading}>Accident Reports</Text>
                {alerts.filter(a => a.emergencyType === 'Accident').length === 0 ? (
                    <Text style={styles.emptyText}>No accident alerts reported yet.</Text>
                ) : (
                    alerts.filter(a => a.emergencyType === 'Accident').map((alert) => (
                        <View key={alert._id} style={[styles.card, alert.priority === 'High' && styles.highPriorityCard]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.typeBadge, { backgroundColor: '#FEE2E2' }]}>
                                    <Ionicons name="car-sport" size={16} color="#EF4444" />
                                    <Text style={[styles.typeText, { color: '#B91C1C' }]}>
                                        {alert.emergencyType.toUpperCase()}
                                    </Text>
                                </View>
                                <Pressable onPress={() => deleteAlert(alert._id)}>
                                    <Ionicons name="trash" size={18} color={COLORS.error} />
                                </Pressable>
                            </View>

                            <View style={styles.userInfo}>
                                <Ionicons name="person" size={14} color={COLORS.textMuted} />
                                <Text style={styles.userName}>{alert.user?.name || 'Unknown User'}</Text>
                                <Text style={styles.userPhone}> • {alert.user?.phone || 'No Phone'}</Text>
                            </View>

                            <Text style={styles.descText}>Damage: {alert.damageDescription || "Not provided"}</Text>

                            {alert.photos && alert.photos.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoContainer}>
                                    {alert.photos.map((photo, i) => (
                                        <Pressable key={i} onPress={() => { setSelectedImage(`${BASE_URL}/${photo}`); setImageModalVisible(true); }}>
                                            <Image source={{ uri: `${BASE_URL}/${photo}` }} style={styles.thumbnail} />
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            )}

                            {alert.adminReply && (
                                <View style={styles.adminReplyBox}>
                                    <Text style={styles.adminReplyLabel}>Admin Reply Sent:</Text>
                                    <Text style={styles.adminReplyText}>{alert.adminReply}</Text>
                                </View>
                            )}

                            <View style={styles.actionRow}>
                                <Pressable style={styles.btnSmall} onPress={() => openMap(alert.location.lat, alert.location.lng)}>
                                    <Ionicons name="location" size={14} color={COLORS.white} />
                                    <Text style={styles.btnText}>Map</Text>
                                </Pressable>

                                {alert.accidentReportPdfPath && (
                                    <Pressable style={[styles.btnSmall, { backgroundColor: '#10B981' }]} onPress={() => viewPdf(alert.accidentReportPdfPath)}>
                                        <Ionicons name="document-text" size={14} color={COLORS.white} />
                                        <Text style={styles.btnText}>PDF Form</Text>
                                    </Pressable>
                                )}

                                {!alert.resolvedByAdmin ? (
                                    <Pressable style={[styles.btnSmall, { backgroundColor: '#6366F1' }]} onPress={() => resolveAlert(alert._id)}>
                                        <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                                        <Text style={styles.btnText}>Resolve</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.resolvedBadge}>
                                        <Text style={styles.resolvedText}>RESOLVED</Text>
                                    </View>
                                )}
                            </View>

                            {!alert.resolvedByAdmin && (
                                <Pressable 
                                    style={styles.replyButton}
                                    onPress={() => {
                                        setSelectedId(alert._id);
                                        setReplyVisible(true);
                                    }}
                                >
                                    <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.primary} />
                                    <Text style={styles.replyBtnText}>Send Quick Reply</Text>
                                </Pressable>
                            )}
                        </View>
                    ))
                )}

                <Text style={[styles.sectionHeading, { marginTop: 10 }]}>Breakdown Reports</Text>
                {alerts.filter(a => a.emergencyType === 'Breakdown').length === 0 ? (
                    <Text style={styles.emptyText}>No breakdown alerts reported yet.</Text>
                ) : (
                    alerts.filter(a => a.emergencyType === 'Breakdown').map((alert) => (
                        <View key={alert._id} style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.typeBadge, { backgroundColor: '#DBEAFE' }]}>
                                    <Ionicons name="construct" size={16} color="#1E40AF" />
                                    <Text style={[styles.typeText, { color: '#1E40AF' }]}>
                                        {alert.emergencyType.toUpperCase()}
                                    </Text>
                                </View>
                                <Pressable onPress={() => deleteAlert(alert._id)}>
                                    <Ionicons name="trash" size={18} color={COLORS.error} />
                                </Pressable>
                            </View>

                            <View style={styles.userInfo}>
                                <Ionicons name="person" size={14} color={COLORS.textMuted} />
                                <Text style={styles.userName}>{alert.user?.name || 'Unknown User'}</Text>
                                <Text style={styles.userPhone}> • {alert.user?.phone || 'No Phone'}</Text>
                            </View>

                            <Text style={styles.descText}>Issue: {alert.damageDescription || "Not provided"}</Text>

                            {alert.photos && alert.photos.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoContainer}>
                                    {alert.photos.map((photo, i) => (
                                        <Pressable key={i} onPress={() => { setSelectedImage(`${BASE_URL}/${photo}`); setImageModalVisible(true); }}>
                                            <Image source={{ uri: `${BASE_URL}/${photo}` }} style={styles.thumbnail} />
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            )}

                            {alert.adminReply && (
                                <View style={styles.adminReplyBox}>
                                    <Text style={styles.adminReplyLabel}>Admin Reply Sent:</Text>
                                    <Text style={styles.adminReplyText}>{alert.adminReply}</Text>
                                </View>
                            )}

                            <View style={styles.actionRow}>
                                <Pressable style={styles.btnSmall} onPress={() => openMap(alert.location.lat, alert.location.lng)}>
                                    <Ionicons name="location" size={14} color={COLORS.white} />
                                    <Text style={styles.btnText}>Map</Text>
                                </Pressable>

                                {!alert.resolvedByAdmin ? (
                                    <Pressable style={[styles.btnSmall, { backgroundColor: '#6366F1' }]} onPress={() => resolveAlert(alert._id)}>
                                        <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                                        <Text style={styles.btnText}>Resolve</Text>
                                    </Pressable>
                                ) : (
                                    <View style={styles.resolvedBadge}>
                                        <Text style={styles.resolvedText}>RESOLVED</Text>
                                    </View>
                                )}
                            </View>

                            {!alert.resolvedByAdmin && (
                                <Pressable 
                                    style={styles.replyButton}
                                    onPress={() => {
                                        setSelectedId(alert._id);
                                        setReplyVisible(true);
                                    }}
                                >
                                    <Ionicons name="chatbubble-ellipses" size={16} color={COLORS.primary} />
                                    <Text style={styles.replyBtnText}>Send Quick Reply</Text>
                                </Pressable>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* REPLY MODAL FOR ANDROID COMPATIBILITY */}
            <Modal visible={replyVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Admin Response</Text>
                        <TextInput 
                            style={styles.modalInput}
                            placeholder="Type your reply here..."
                            multiline
                            value={replyText}
                            onChangeText={setReplyText}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setReplyVisible(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.sendBtn} onPress={replyToAlert}>
                                <Text style={styles.sendText}>Send Reply</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* FULL SCREEN IMAGE MODAL */}
            <Modal visible={imageModalVisible} transparent animationType="fade">
                <View style={styles.fullImageOverlay}>
                    <Pressable style={styles.closeImageBtn} onPress={() => setImageModalVisible(false)}>
                        <Ionicons name="close-circle" size={40} color={COLORS.white} />
                    </Pressable>
                    {selectedImage && (
                        <Image 
                            source={{ uri: selectedImage }} 
                            style={styles.fullImage} 
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 20, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', ...SHADOWS.floating },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#EF4444' },
    headerSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2, fontWeight: '700' },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: 20 },
    sectionHeading: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginBottom: 15, marginLeft: 5 },
    emptyText: { textAlign: 'center', marginTop: 10, marginBottom: 30, color: COLORS.textMuted, fontWeight: '600' },
    card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginBottom: 20, ...SHADOWS.small, borderLeftWidth: 5, borderLeftColor: COLORS.primary },
    highPriorityCard: { borderLeftColor: '#EF4444', backgroundColor: '#FFF5F5' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    typeText: { fontSize: 11, fontWeight: '900', color: COLORS.primary },
    userInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    userName: { fontSize: 14, fontWeight: '800', color: COLORS.textDark, marginLeft: 6 },
    userPhone: { fontSize: 13, color: COLORS.textMuted },
    descText: { fontSize: 14, color: COLORS.textDark, backgroundColor: '#F3F4F6', padding: 12, borderRadius: 10, marginBottom: 12, lineHeight: 20 },
    photoContainer: { flexDirection: 'row', marginBottom: 15, paddingBottom: 5 },
    thumbnail: { width: 70, height: 70, borderRadius: 8, marginRight: 10, borderWidth: 1, borderColor: '#E5E7EB' },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    btnSmall: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.textDark, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    btnText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
    resolvedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
    resolvedText: { color: '#059669', fontSize: 11, fontWeight: '900' },
    adminReplyBox: { backgroundColor: '#F0FDF4', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#DCFCE7' },
    adminReplyLabel: { fontSize: 10, fontWeight: '800', color: '#166534', marginBottom: 3 },
    adminReplyText: { fontSize: 13, color: '#14532D' },
    replyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 12, marginTop: 5 },
    replyBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 25, ...SHADOWS.heavy },
    modalTitle: { fontSize: 18, fontWeight: '900', color: COLORS.textDark, marginBottom: 15 },
    modalInput: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15, fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
    cancelBtn: { padding: 10 },
    cancelText: { color: COLORS.textMuted, fontWeight: '700' },
    sendBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
    sendText: { color: COLORS.white, fontWeight: '800' },
    fullImageOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    closeImageBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullImage: { width: '100%', height: '80%' }
});

export default AdminSOSScreen;
