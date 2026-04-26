import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Linking, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import axios from 'axios';
import { COLORS, SHADOWS } from '../../theme/colors';
import { AuthContext, API_URL } from '../../context/AuthContext';
import AnimatedButton from '../../components/AnimatedButton';
import IncidentReportModal from '../../components/IncidentReportModal';

const UserSOSScreen = ({ navigation }) => {
  const { user } = useContext(AuthContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => {
    fetchMyReports();
  }, []);

  const fetchMyReports = async () => {
    try {
      const res = await axios.get(`${API_URL}/sos/my`);
      if (res.data.success) setReports(res.data.data);
    } catch (e) {
      console.log('Fetch reports error:', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSOS = async (type = 'SOS') => {
    // 1. Dials 119 immediately
    if (type === 'SOS') {
        Linking.openURL('tel:119');
        return; // Do not send an empty location report for 119 dial
    }

    // 2. Get Location & Notify Admin for Accidents/Breakdowns
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location is required to send help.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const coords = { lat: location.coords.latitude, lng: location.coords.longitude };

      const res = await axios.post(`${API_URL}/sos`, {
        lat: coords.lat,
        lng: coords.lng,
        emergencyType: type
      });

      if (res.data.success) {
        setSelectedReport(res.data.data);
        setReportVisible(true);
        fetchMyReports();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create report.');
    }
  };

  const handleEdit = (report) => {
    setSelectedReport(report);
    setReportVisible(true);
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Report', 'Are you sure you want to remove this report?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteReport(id) }
    ]);
  };

  const deleteReport = async (id) => {
    try {
      await axios.delete(`${API_URL}/sos/${id}`);
      setReports(reports.filter(r => r._id !== id));
      Alert.alert('Deleted', 'Report removed successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to delete report.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color={COLORS.error} /></View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOS & Emergency</Text>
          <Pressable onPress={() => navigation.navigate('Profile')}>
             <View style={styles.profileAvatar}>
               {user?.profilePicture ? (
                 <Image source={{ uri: user.profilePicture }} style={{ width: 36, height: 36, borderRadius: 18 }} />
               ) : (
                 <Text style={styles.avatarText}>{user?.name.charAt(0)}</Text>
               )}
             </View>
          </Pressable>
        </View>

        <View style={styles.sosCard}>
          <Text style={styles.pulseText}>EMERGENCY ALERT</Text>
          <Pressable style={styles.bigSosBtn} onPress={() => handleSOS('SOS')}>
            <View style={styles.sosInner}>
              <Ionicons name="warning" size={50} color={COLORS.white} />
              <Text style={styles.sosText}>SOS</Text>
            </View>
          </Pressable>
          <Text style={styles.sosSubtext}>Tap to call 119 & Alert Admin</Text>
        </View>

        <View style={styles.reportButtons}>
          <Pressable style={[styles.reportBtn, { backgroundColor: '#F97316' }]} onPress={() => handleSOS('Accident')}>
            <Ionicons name="car-sport" size={24} color={COLORS.white} />
            <Text style={styles.reportBtnText}>Report Accident</Text>
          </Pressable>
          <Pressable style={[styles.reportBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleSOS('Breakdown')}>
            <Ionicons name="construct" size={24} color={COLORS.white} />
            <Text style={styles.reportBtnText}>Breakdown</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Accident Reports</Text>
        {reports.filter(r => r.emergencyType === 'Accident').length === 0 ? (
          <Text style={styles.emptyTextSimple}>No accident reports.</Text>
        ) : (
          reports.filter(r => r.emergencyType === 'Accident').map(report => (
            <View key={report._id} style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.badgeText, { color: '#B91C1C' }]}>
                    {report.emergencyType}
                  </Text>
                </View>
                <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>
              </View>

              <Text style={styles.desc}>{report.damageDescription || "Location sent. Finish editing to add details."}</Text>
              
              {report.adminReply && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Admin Reply:</Text>
                  <Text style={styles.replyText}>{report.adminReply}</Text>
                </View>
              )}

              <View style={styles.actions}>
                <Pressable onPress={() => handleEdit(report)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={18} color={COLORS.primary} />
                  <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(report._id)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Breakdown Reports</Text>
        {reports.filter(r => r.emergencyType === 'Breakdown').length === 0 ? (
          <Text style={styles.emptyTextSimple}>No breakdown reports.</Text>
        ) : (
          reports.filter(r => r.emergencyType === 'Breakdown').map(report => (
            <View key={report._id} style={styles.reportCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badge, { backgroundColor: '#DBEAFE' }]}>
                  <Text style={[styles.badgeText, { color: '#1E40AF' }]}>
                    {report.emergencyType}
                  </Text>
                </View>
                <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString()}</Text>
              </View>

              <Text style={styles.desc}>{report.damageDescription || "Location sent. Finish editing to add details."}</Text>
              
              {report.adminReply && (
                <View style={styles.replyBox}>
                  <Text style={styles.replyLabel}>Admin Reply:</Text>
                  <Text style={styles.replyText}>{report.adminReply}</Text>
                </View>
              )}

              <View style={styles.actions}>
                <Pressable onPress={() => handleEdit(report)} style={styles.actionBtn}>
                  <Ionicons name="pencil" size={18} color={COLORS.primary} />
                  <Text style={[styles.actionText, { color: COLORS.primary }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => confirmDelete(report._id)} style={styles.actionBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  <Text style={[styles.actionText, { color: COLORS.error }]}>Delete</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <IncidentReportModal 
        visible={reportVisible}
        onClose={() => { setReportVisible(false); fetchMyReports(); setSelectedReport(null); }}
        report={selectedReport}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  headerTitle: { fontSize: 26, fontWeight: '900', color: COLORS.textDark },
  profileAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', ...SHADOWS.floating },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  sosCard: { backgroundColor: COLORS.white, padding: 30, borderRadius: 30, alignItems: 'center', ...SHADOWS.heavy, marginBottom: 20 },
  pulseText: { color: COLORS.error, fontWeight: '900', fontSize: 12, letterSpacing: 2, marginBottom: 20 },
  bigSosBtn: { width: 140, height: 140, borderRadius: 70, backgroundColor: COLORS.error, justifyContent: 'center', alignItems: 'center', ...SHADOWS.medium },
  sosInner: { alignItems: 'center' },
  sosText: { color: COLORS.white, fontSize: 24, fontWeight: '900', marginTop: 5 },
  sosSubtext: { marginTop: 15, color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  reportButtons: { flexDirection: 'row', gap: 12, marginBottom: 30 },
  reportBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 15, borderRadius: 15, ...SHADOWS.small },
  reportBtnText: { color: COLORS.white, fontWeight: '800', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark, marginBottom: 15 },
  empty: { alignItems: 'center', marginTop: 30, opacity: 0.6 },
  emptyText: { marginTop: 10, fontWeight: '600', color: COLORS.textMuted },
  emptyTextSimple: { fontSize: 14, color: COLORS.textMuted, opacity: 0.8 },
  reportCard: { backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginBottom: 15, ...SHADOWS.small },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  date: { fontSize: 12, color: COLORS.textMuted },
  desc: { fontSize: 14, color: COLORS.textDark, lineHeight: 20, marginBottom: 12 },
  replyBox: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 12, marginBottom: 12 },
  replyLabel: { fontSize: 12, fontWeight: '900', color: COLORS.primary, marginBottom: 4 },
  replyText: { fontSize: 13, color: COLORS.textDark },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10, justifyContent: 'flex-end', gap: 15 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  actionText: { fontSize: 13, fontWeight: '700' }
});

export default UserSOSScreen;
