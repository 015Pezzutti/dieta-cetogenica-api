// ============================================================
// KETO+ - App React Native Expo
// VERSÃO COMPLETA COM MELHORIAS - DESAFIOS + HIDRATAÇÃO
// ============================================================
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, Alert, ActivityIndicator, Modal,
  Dimensions, Platform, FlatList, Switch, Vibration, Animated,
  KeyboardAvoidingView, StatusBar, AppState, LogBox, Share,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons, FontAwesome5, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { BackHandler } from 'react-native';
import * as Notifications from 'expo-notifications';
import { initializeAdMob, createRewardedAd, showRewardedAd, AdBanner } from './adsConfig';
import * as Clipboard from 'expo-clipboard';
// firebase/functions removido pois não é utilizado no código

// ─── Configurar handler de notificações para resposta em background ───
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─── Notificações persistentes ────────────────────────────────────────────────
async function requestNotificationPermission() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (_) { return false; }
}

async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('water-channel', {
      name: 'Hidratação',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: true,
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync('fasting-channel', {
      name: 'Jejum Intermitente',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 300, 500],
      lightColor: '#4ADE80',
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: true,
      enableVibrate: true,
      enableLights: true,
    });

    await Notifications.setNotificationChannelAsync('social-channel', {
      name: 'Rede Social',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 0, 250],
      lightColor: '#4ADE80',
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('activity-channel', {
      name: 'Atividade Física',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: false,
    });

    await Notifications.setNotificationChannelAsync('challenge-channel', {
      name: 'Desafios',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 0, 250],
      lightColor: '#F59E0B',
      sound: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
      showBadge: true,
    });

    console.log('✅ Canais criados');
  } catch (e) {
    console.log('Erro ao criar canais:', e);
  }
}

async function showSocialNotification(title, body, data = {}) {
  try {
    if (Platform.OS !== 'android') return;
    await Notifications.scheduleNotificationAsync({
      identifier: `social-${Date.now()}`,
      content: {
        title: title,
        body: body,
        data: { screen: 'social', ...data },
        channelId: 'social-channel',
        sound: true,
      },
      trigger: null,
    });
  } catch (_) {}
}

async function showChallengeNotification(title, body, data = {}) {
  try {
    if (Platform.OS !== 'android') return;
    await Notifications.scheduleNotificationAsync({
      identifier: `challenge-${Date.now()}`,
      content: {
        title: title,
        body: body,
        data: { screen: 'challenges', ...data },
        channelId: 'challenge-channel',
        sound: true,
      },
      trigger: null,
    });
  } catch (_) {}
}

async function dismissFastingNotification() {
  try { await Notifications.dismissNotificationAsync('fasting-ongoing'); } catch (_) {}
}

async function dismissActivityNotification() {
  try { await Notifications.dismissNotificationAsync('activity-ongoing'); } catch (_) {}
}


let ongoingNotificationInterval = null;
let currentOngoingNotificationId = null;

async function showFastingOngoingNotification(elapsedSeconds, targetSeconds, typeLabel) {
  if (Platform.OS !== 'android') return;

  try {
    const pct = targetSeconds > 0
      ? Math.min(Math.floor((elapsedSeconds / targetSeconds) * 100), 99)
      : 0;

    const remaining = Math.max(targetSeconds - elapsedSeconds, 0);

    const h = Math.floor(remaining / 3600).toString().padStart(2, '0');
    const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0');
    const s = (remaining % 60).toString().padStart(2, '0');

    const elH = Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0');
    const elM = Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0');
    const elS = (elapsedSeconds % 60).toString().padStart(2, '0');

    // Cancela a notificação anterior
    if (currentOngoingNotificationId) {
      await Notifications.dismissNotificationAsync(
        currentOngoingNotificationId
      ).catch(() => {});
    }

    const notificationId = `fasting-ongoing-${Date.now()}`;
    currentOngoingNotificationId = notificationId;

    // Barra visual de progresso
    const bar =
      pct >= 100 ? '🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩' :
      pct >= 90 ? '🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜' :
      pct >= 80 ? '🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜' :
      pct >= 70 ? '🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜' :
      pct >= 60 ? '🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜' :
      pct >= 50 ? '🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜' :
      pct >= 40 ? '🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜' :
      pct >= 30 ? '🟩🟩🟩⬜⬜⬜⬜⬜⬜⬜' :
      pct >= 20 ? '🟩🟩⬜⬜⬜⬜⬜⬜⬜⬜' :
      pct >= 10 ? '🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜' :
      '⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜';

    await Notifications.scheduleNotificationAsync({
      identifier: notificationId,
      content: {
        title: `🥑 KETO+ • Jejum ${typeLabel}`,
        body:
          `${bar}\n` +
          `📊 ${pct}% concluído\n` +
          `⏳ Restam ${h}:${m}:${s}\n` +
          `⌛ Decorridos ${elH}:${elM}:${elS}`,
        data: {
          action: 'fasting_ongoing',
          screen: 'fasting',
        },
        channelId: 'fasting-channel',
        sticky: true,
        ongoing: true,
        autoDismiss: false,
        sound: null,
      },
      trigger: null,
    });

  } catch (error) {
    console.log('Erro na notificação de jejum:', error);
  }
}

// NOVA FUNÇÃO: Agenda atualizações periódicas mesmo em background
async function startBackgroundFastingUpdates(elapsedSeconds, targetSeconds, typeLabel) {
  // Limpa intervalo existente
  if (ongoingNotificationInterval) {
    clearInterval(ongoingNotificationInterval);
    ongoingNotificationInterval = null;
  }

  // Atualiza a cada 60 segundos (menos frequente para economia de bateria)
  ongoingNotificationInterval = setInterval(async () => {
    // Recupera o estado atual do AsyncStorage
    try {
      const savedStartTime = await AsyncStorage.getItem(FASTING_KEYS.START_TIME);
      const savedElapsedOnPause = await AsyncStorage.getItem(FASTING_KEYS.ELAPSED_ON_PAUSE);
      const isRunning = await AsyncStorage.getItem(FASTING_KEYS.IS_RUNNING);
      
      if (isRunning !== 'true' || !savedStartTime) {
        // Se não está mais em jejum, para as atualizações
        if (ongoingNotificationInterval) {
          clearInterval(ongoingNotificationInterval);
          ongoingNotificationInterval = null;
        }
        await cancelFastingOngoingNotification();
        return;
      }

      const startTime = parseInt(savedStartTime, 10);
      const elapsedOnPause = parseFloat(savedElapsedOnPause || '0');
      const currentElapsed = elapsedOnPause + Math.floor((Date.now() - startTime) / 1000);
      
      await showFastingOngoingNotification(currentElapsed, targetSeconds, typeLabel);
    } catch (e) {
      console.log('Erro ao atualizar notificação em background:', e);
    }
  }, 60000); // Atualiza a cada 60 segundos
}

// ============================================================
// Deve existir APENAS UMA vez esta função no arquivo
// Mantenha esta versão (a mais completa):
// ============================================================
async function cancelFastingOngoingNotification() {
  try {
    if (ongoingNotificationInterval) {
      clearInterval(ongoingNotificationInterval);
      ongoingNotificationInterval = null;
    }
    if (currentOngoingNotificationId) {
      await Notifications.dismissNotificationAsync(currentOngoingNotificationId).catch(() => {});
      currentOngoingNotificationId = null;
    }
    await Notifications.dismissNotificationAsync('fasting-ongoing').catch(() => {});
    await Notifications.cancelScheduledNotificationAsync('fasting-ongoing').catch(() => {});
  } catch (_) {}
}

// ✅ CORREÇÃO: scheduleFastingCompleteNotification — usa trigger por segundos (mais confiável)
async function scheduleFastingCompleteNotification(targetSeconds, typeLabel) {
  try {
    await Notifications.cancelScheduledNotificationAsync('fasting-complete').catch(() => {});
    if (targetSeconds <= 0) return;

    await Notifications.scheduleNotificationAsync({
      identifier: 'fasting-complete',
      content: {
        title: '🎉 Jejum concluído!',
        body: `Parabéns! Você completou o jejum ${typeLabel}! Hora de se alimentar.`,
        data: { action: 'fasting_complete' },
        channelId: 'fasting-channel',
        sound: true,
      },
      trigger: { type: 'timeInterval', seconds: targetSeconds, repeats: false },
    });

    console.log(`✅ Notificação de jejum agendada para daqui ${Math.floor(targetSeconds/3600)}h${Math.floor((targetSeconds%3600)/60)}min`);
  } catch (e) {
    console.log('Erro ao agendar notificação de jejum:', e);
  }
}

async function cancelFastingCompleteNotification() {
  try {
    await Notifications.cancelScheduledNotificationAsync('fasting-complete').catch(() => {});
  } catch (_) {}
}




// Silenciar logs desnecessários
LogBox.ignoreLogs([
  'expo-notifications',
  'AsyncStorage',
  'setNotificationHandler',
  'scheduleNotificationAsync',
  'setBehaviorAsync',
  'setPositionAsync',
  'setBackgroundColorAsync',
  'edge-to-edge',
  'Android Push notifications',
]);



// Firebase com persistência correta
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

// Expo
import * as ImagePicker from 'expo-image-picker';
import { Accelerometer } from 'expo-sensors';
import { WebView } from 'react-native-webview';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import * as NavigationBar from 'expo-navigation-bar';


const { width, height } = Dimensions.get('window');

// ─── Firebase Config ───────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCTGOQdXk-sZKnu6SjZhoHi4A_4ZNnij-4",
  authDomain: "nutrigo-a7c43.firebaseapp.com",
  projectId: "nutrigo-a7c43",
  storageBucket: "nutrigo-a7c43.firebasestorage.app",
  messagingSenderId: "780250461476",
  appId: "1:780250461476:web:61905603559ec7f7a26fb1",
  measurementId: "G-YEFTTWJDRP"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

const db = getFirestore(app);

// ─── Constants ─────────────────────────────────────────────
const CLOUDINARY_CLOUD = 'df0db5tqt';
const CLOUDINARY_PRESET = 'NutriGo';
const YOUTUBE_API_KEY = 'AIzaSyBgXNgbpEwwEzlf7VuU-arKUJwB5YLV59c';
const GROQ_API_KEY = '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'; 

const STORAGE_KEYS = {
  SAVED_EMAIL: 'saved_email',
  SAVED_PASSWORD: 'saved_password',
  BIOMETRY_ENABLED: 'biometry_enabled',
  THEME: 'app_theme',
  WATER_REMINDER: 'water_reminder_enabled',
  LAST_RESET_DATE: 'last_reset_date',
};

const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Gratuito',
    price: 'R$ 0,00',
    features: ['Jejum Básico', 'Calculadora de Macros', 'Treinos Básicos'],
    limits: { photoAnalysis: 0, coachAI: 0 }
  },
  PREMIUM: {
    id: 'premium',
    name: 'Premium',
    price: 'R$ 29,90/mês',
    features: ['Tudo do Gratuito', 'Análise de Foto (ILIMITADO)', 'Coach Keto IA (ILIMITADO)', 'Vídeos Exclusivos'],
    limits: { photoAnalysis: -1, coachAI: -1 }
  },
  PRO: {
    id: 'pro',
    name: 'Pro Plus',
    price: 'R$ 49,90/mês',
    features: ['Tudo do Premium', 'Consultoria Semanal IA', 'Planos de Treino Avançados', 'Suporte Prioritário'],
    limits: { photoAnalysis: -1, coachAI: -1 }
  }
};

const FASTING_KEYS = {
  START_TIME: 'fasting_start_time',
  TYPE_ID: 'fasting_type_id',
  IS_RUNNING: 'fasting_is_running',
  ELAPSED_ON_PAUSE: 'fasting_elapsed_on_pause',
  NOTIFICATION_SENT: 'fasting_notification_sent',
};

const COLORS = {
  bg: '#0A0F0A',
  bgCard: '#111811',
  bgCard2: '#162016',
  green: '#4ADE80',
  greenDark: '#166534',
  greenLight: '#86EFAC',
  accent: '#F59E0B',
  accentLight: '#FCD34D',
  text: '#F0FDF4',
  textMuted: '#6B7280',
  textSub: '#9CA3AF',
  border: '#1F2F1F',
  red: '#EF4444',
  blue: '#3B82F6',
  purple: '#A855F7',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  pink: '#EC4899',
  indigo: '#6366F1',
};

const LIGHT_COLORS = {
  bg: '#F0F2F0',
  bgCard: '#FFFFFF',
  bgCard2: '#F5F7F5',
  green: '#059669',
  greenDark: '#047857',
  greenLight: '#34D399',
  accent: '#D97706',
  accentLight: '#FBBF24',
  text: '#111827',
  textMuted: '#6B7280',
  textSub: '#4B5563',
  border: '#D1D5DB',
  red: '#DC2626',
  blue: '#2563EB',
  purple: '#7C3AED',
  gold: '#B45309',
  silver: '#9CA3AF',
  bronze: '#B45309',
  pink: '#DB2777',
  indigo: '#4F46E5',
};

// ─── GAMIFICAÇÃO ───────────────────────────────────────────
const BADGE_LEVELS = {
  BRONZE: { name: 'Bronze', minPoints: 0, color: '#CD7F32', borderColor: '#CD7F32', icon: '🥉' },
  PRATA: { name: 'Prata', minPoints: 100, color: '#C0C0C0', borderColor: '#C0C0C0', icon: '🥈' },
  OURO: { name: 'Ouro', minPoints: 300, color: '#FFD700', borderColor: '#FFD700', icon: '🥇' },
  PLATINA: { name: 'Platina', minPoints: 600, color: '#E5E4E2', borderColor: '#E5E4E2', icon: '💎' },
  DIAMANTE: { name: 'Diamante', minPoints: 1000, color: '#00FFFF', borderColor: '#00FFFF', icon: '💎' },
  LENDARIO: { name: 'Lendário', minPoints: 1500, color: '#FF4444', borderColor: '#FF4444', icon: '🏆' },
};

const RANK_TITLES = {
  1: { name: '💎 SUPREMO', icon: '👑', color: '#FFD700', bgColor: '#FFD70022', emoji: '🏆', description: 'O MAIOR DE TODOS!' },
  2: { name: '⚡ SUPER-PODEROSO', icon: '⭐', color: '#C0C0C0', bgColor: '#C0C0C022', emoji: '🥈', description: 'FORÇA INCRÍVEL!' },
  3: { name: '🔥 PODEROSO', icon: '💪', color: '#CD7F32', bgColor: '#CD7F3222', emoji: '🥉', description: 'DESTAQUE ABSOLUTO!' },
};

const OTHER_RANKS = [
  { minPoints: 800, name: '🦅 GUERREIRO LENDÁRIO', icon: '⚔️', color: '#4ADE80', description: 'GUERREIRO EXPERIENTE' },
  { minPoints: 500, name: '⚡ GUERREIRO ELITE', icon: '✨', color: '#3B82F6', description: 'ELITE ENTRE OS GUERREIROS' },
  { minPoints: 300, name: '🌱 COMPETENTE', icon: '📚', color: '#F59E0B', description: 'COMPETENTE EM AÇÃO' },
  { minPoints: 150, name: '📖 APRENDIZ', icon: '🎓', color: '#A855F7', description: 'APRENDIZ DEDICADO' },
  { minPoints: 80, name: '🐔 FRANGO', icon: '🍗', color: '#9CA3AF', description: 'AINDA ENGORDOU POUCO' },
  { minPoints: 30, name: '🐤 FRANGALHO', icon: '🐥', color: '#6B7280', description: 'FRANGALHO CRESCENDO' },
  { minPoints: 0, name: '🥚 FRANGOLINO', icon: '🥚', color: '#4B5563', description: 'FRANGOLINO INICIANTE' },
];

const ACTIVITIES = {
  WALKING: { id: 'walking', name: '🚶 Caminhada', icon: '🚶', speed: 5, met: 3.5, color: '#4ADE80', bgColor: '#4ADE8022' },
  RUNNING: { id: 'running', name: '🏃 Corrida', icon: '🏃', speed: 10, met: 8.0, color: '#F59E0B', bgColor: '#F59E0B22' },
  BIKING: { id: 'biking', name: '🚴 Bike', icon: '🚴', speed: 15, met: 6.0, color: '#3B82F6', bgColor: '#3B82F622' },
};

const FASTING_TYPES = [
  { id: '16_8', label: '16:8', fast: 16, eat: 8, desc: 'Jejum de 16h, janela alimentar de 8h' },
  { id: '18_6', label: '18:6', fast: 18, eat: 6, desc: 'Jejum de 18h, janela alimentar de 6h' },
  { id: '20_4', label: '20:4', fast: 20, eat: 4, desc: 'Jejum de 20h, janela alimentar de 4h' },
  { id: '5_2', label: '5:2', fast: 0, eat: 0, desc: '5 dias normais, 2 dias restritos (500kcal)' },
  { id: 'omad', label: 'OMAD', fast: 23, eat: 1, desc: 'Uma refeição por dia' },
  { id: '24h', label: '24h', fast: 24, eat: 0, desc: 'Jejum de 24 horas' },
];

const WORKOUT_VIDEOS_QUERY = 'treino em casa sem equipamento';
const RECIPE_VIDEOS_QUERY = 'receitas low carb cetogenica';

const WORKOUT_EXERCISES = [
  { id: '1',  name: 'Aquecimento',         duration: 300, reps: null, desc: 'Movimentos leves, rotação de ombros e quadril para preparar o corpo' },
  { id: '2',  name: 'Agachamento',          duration: 40,  reps: 15,  desc: 'Pés na largura dos ombros, desça devagar até a coxa ficar paralela ao chão' },
  { id: '3',  name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '4',  name: 'Flexão',               duration: 40,  reps: 12,  desc: 'Mantenha o core firme e o corpo alinhado' },
  { id: '5',  name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '6',  name: 'Afundo',               duration: 40,  reps: 10,  desc: 'Alterne as pernas, joelho não ultrapassa a ponta do pé' },
  { id: '7',  name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '8',  name: 'Prancha',              duration: 45,  reps: null, desc: 'Mantenha o corpo reto, abdômen contraído' },
  { id: '9',  name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '10', name: 'Burpee',               duration: 40,  reps: 10,  desc: 'Explosão total — agacha, apoia as mãos, chuta os pés, levanta e pula' },
  { id: '11', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '12', name: 'Mountain Climber',     duration: 40,  reps: null, desc: 'Ritmo constante, core firme, traga os joelhos ao peito alternando' },
  { id: '13', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '14', name: 'Polichinelo',          duration: 40,  reps: null, desc: 'Braços e pernas sincronizados, manter ritmo constante' },
  { id: '15', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '16', name: 'Elevação de Joelhos',  duration: 40,  reps: null, desc: 'Joelhos ao nível do quadril, core ativado, ritmo de corrida no lugar' },
  { id: '17', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '18', name: 'Ponte de Glúteo',      duration: 40,  reps: 15,  desc: 'Deite de costas, pés no chão, eleve o quadril e contraia o glúteo no topo' },
  { id: '19', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '20', name: 'Agachamento Sumô',     duration: 40,  reps: 12,  desc: 'Pés bem abertos e pontas viradas para fora, desça fundo' },
  { id: '21', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '22', name: 'Tríceps no Chão',      duration: 40,  reps: 12,  desc: 'Mãos apontando para os pés, dobre os cotovelos e empurre de volta' },
  { id: '23', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '24', name: 'Abdominais',           duration: 40,  reps: 20,  desc: 'Pés no chão, mãos atrás da cabeça, eleve o tronco sem puxar o pescoço' },
  { id: '25', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '26', name: 'Superman',             duration: 40,  reps: 12,  desc: 'Deite de barriga para baixo, eleve braços e pernas ao mesmo tempo' },
  { id: '27', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '28', name: 'Flexão de Diamante',   duration: 40,  reps: 10,  desc: 'Mãos formando triângulo sob o peito — foco no tríceps' },
  { id: '29', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '30', name: 'Salto no Agachamento', duration: 40,  reps: 10,  desc: 'Agacha fundo e explode em salto, aterrisse suave com joelhos dobrados' },
  { id: '31', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '32', name: 'Prancha Lateral',      duration: 30,  reps: null, desc: 'Apoio no antebraço, corpo alinhado — 30s cada lado' },
  { id: '33', name: 'Descanso',             duration: 20,  reps: null, desc: 'Respire fundo e se prepare' },
  { id: '34', name: 'Resfriamento',         duration: 180, reps: null, desc: 'Alongamento completo — quadríceps, isquiotibiais, ombros e respiração profunda' },
];

const ACHIEVEMENTS_LIST = [
  { id: 'FIRST_FAST', icon: '🌙', name: 'Primeiro Jejum', description: 'Completou seu primeiro jejum', points: 50 },
  { id: 'FAST_MASTER', icon: '👑', name: 'Mestre do Jejum', description: 'Completou 10 jejuns', points: 200 },
  { id: 'WEEK_WARRIOR', icon: '🔥', name: 'Guerreiro Semanal', description: 'Jejum por 7 dias seguidos', points: 150 },
  { id: 'FIRST_WALK', icon: '👣', name: 'Primeiros Passos', description: 'Deu seus primeiros 1000 passos', points: 30 },
  { id: 'MARATHON', icon: '🏃', name: 'Maratonista', description: 'Acumulou 100km no pedômetro', points: 250 },
  { id: 'DAILY_GOAL', icon: '🎯', name: 'Meta Diária', description: 'Atingiu 10000 passos em um dia', points: 100 },
  { id: 'FIRST_WORKOUT', icon: '💪', name: 'Primeiro Treino', description: 'Completou seu primeiro treino', points: 50 },
  { id: 'WORKOUT_MASTER', icon: '🏆', name: 'Mestre do Treino', description: 'Completou 10 treinos', points: 200 },
  { id: 'WEIGHT_GOAL', icon: '⚖️', name: 'Meta de Peso', description: 'Criou seu plano personalizado', points: 40 },
];

// Funções Utilitárias
function getBadgeLevel(points) {
  if (points >= BADGE_LEVELS.LENDARIO.minPoints) return BADGE_LEVELS.LENDARIO;
  if (points >= BADGE_LEVELS.DIAMANTE.minPoints) return BADGE_LEVELS.DIAMANTE;
  if (points >= BADGE_LEVELS.PLATINA.minPoints) return BADGE_LEVELS.PLATINA;
  if (points >= BADGE_LEVELS.OURO.minPoints) return BADGE_LEVELS.OURO;
  if (points >= BADGE_LEVELS.PRATA.minPoints) return BADGE_LEVELS.PRATA;
  return BADGE_LEVELS.BRONZE;
}

function calculateTotalPoints(gamification) {
  if (!gamification) return 0;
  let total = gamification.totalPoints || 0;
  if (gamification.achievements) {
    Object.values(gamification.achievements).forEach(ach => {
      if (ach.completed) total += ach.points || 0;
    });
  }
  return total;
}

function getUserRank(points) {
  if (points >= 1000) return RANK_TITLES[1];
  if (points >= 500) return RANK_TITLES[2];
  if (points >= 250) return RANK_TITLES[3];
  for (const rank of OTHER_RANKS) {
    if (points >= rank.minPoints) return rank;
  }
  return OTHER_RANKS[OTHER_RANKS.length - 1];
}

function calculateCalories(met, weight, durationHours) {
  return Math.round(met * weight * durationHours);
}

function calculateDistance(speedKmh, durationHours) {
  return (speedKmh * durationHours).toFixed(2);
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

async function setupImmersiveMode() {
  if (Platform.OS === 'android') {
    try {
      await NavigationBar.setVisibilityAsync('hidden');
      StatusBar.setHidden(true);
      StatusBar.setTranslucent(true);
    } catch (e) {
      console.log('Erro no modo imersivo:', e);
    }
  }
}

// Som nativo do Android via vibração (sem expo-audio)
function playFastingCompleteSound() {
  Vibration.vibrate([400, 200, 400, 200, 800]);
}



// ─── Função para resetar dados diários (passos, calorias, água) ───
async function resetDailyDataIfNeeded(userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = await AsyncStorage.getItem(`${STORAGE_KEYS.LAST_RESET_DATE}_${userId}`);
    
    if (lastReset !== today) {
      console.log('🔄 Resetando dados diários para o usuário:', userId);
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        steps: 0,
        caloriesBurned: 0,
        lastDailyReset: today
      });
      
      await AsyncStorage.setItem(`${STORAGE_KEYS.LAST_RESET_DATE}_${userId}`, today);
      
      console.log('✅ Dados diários resetados com sucesso!');
      return true;
    }
    return false;
  } catch (e) {
    console.log('Erro ao resetar dados diários:', e);
    return false;
  }
}

// ─── Upload Cloudinary ─────────────────────────────────────
async function uploadToCloudinary(uri) {
  const filename = uri.split('/').pop();
  const ext = filename.split('.').pop();
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
  const formData = new FormData();
  formData.append('file', { uri, name: filename, type: mimeType });
  formData.append('upload_preset', CLOUDINARY_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
    method: 'POST', body: formData,
  });
  const data = await res.json();
  return data.secure_url;
}

// ─── YouTube API ───────────────────────────────────────────
async function fetchYouTubeVideos(query, maxResults = 8) {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items || [];
}

// ─── Open Food Facts API ───────────────────────────────────
async function searchFoodProduct(barcode) {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();
    if (data.status === 1) {
      const nutriments = data.product.nutriments;
      return {
        name: data.product.product_name,
        carbs: nutriments.carbohydrates_100g || 0,
        protein: nutriments.proteins_100g || 0,
        fat: nutriments.fat_100g || 0,
        calories: nutriments['energy-kcal_100g'] || 0,
        servingSize: 100,
      };
    }
    return null;
  } catch (error) {
    console.log('Erro na Open Food Facts:', error);
    return null;
  }
}

// ─── Função para atualizar gamificação ─────────────────────
async function updateGamification(userId, type, value = 1) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();
    let gamification = userData?.gamification || {
      totalPoints: 0,
      fastingCount: 0,
      workoutCount: 0,
      totalSteps: 0,
      achievements: {},
      lastFastingDate: null,
      fastingStreak: 0
    };

    let pointsEarned = 0;
    let newAchievements = [];

    switch (type) {
      case 'fasting':
        gamification.fastingCount = (gamification.fastingCount || 0) + value;
        pointsEarned = 50;
        
        if (gamification.fastingCount === 1 && !gamification.achievements?.FIRST_FAST?.completed) {
          if (!gamification.achievements) gamification.achievements = {};
          gamification.achievements.FIRST_FAST = { completed: true, date: new Date().toISOString(), points: 50 };
          pointsEarned += 50;
          newAchievements.push({ name: 'Primeiro Jejum', icon: '🌙' });
        }
        if (gamification.fastingCount >= 10 && !gamification.achievements?.FAST_MASTER?.completed) {
          gamification.achievements.FAST_MASTER = { completed: true, date: new Date().toISOString(), points: 200 };
          pointsEarned += 200;
          newAchievements.push({ name: 'Mestre do Jejum', icon: '👑' });
        }
        
        const today = new Date().toDateString();
        if (gamification.lastFastingDate) {
          const lastDate = new Date(gamification.lastFastingDate).toDateString();
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (lastDate === yesterday.toDateString()) {
            gamification.fastingStreak = (gamification.fastingStreak || 0) + 1;
          } else if (lastDate !== today) {
            gamification.fastingStreak = 1;
          }
        } else {
          gamification.fastingStreak = 1;
        }
        
        if (gamification.fastingStreak >= 7 && !gamification.achievements?.WEEK_WARRIOR?.completed) {
          gamification.achievements.WEEK_WARRIOR = { completed: true, date: new Date().toISOString(), points: 150 };
          pointsEarned += 150;
          newAchievements.push({ name: 'Guerreiro Semanal', icon: '🔥' });
        }
        
        gamification.lastFastingDate = new Date().toISOString();
        break;
        
      case 'workout':
        gamification.workoutCount = (gamification.workoutCount || 0) + value;
        pointsEarned = 30;
        
        if (gamification.workoutCount === 1 && !gamification.achievements?.FIRST_WORKOUT?.completed) {
          if (!gamification.achievements) gamification.achievements = {};
          gamification.achievements.FIRST_WORKOUT = { completed: true, date: new Date().toISOString(), points: 50 };
          pointsEarned += 50;
          newAchievements.push({ name: 'Primeiro Treino', icon: '💪' });
        }
        if (gamification.workoutCount >= 10 && !gamification.achievements?.WORKOUT_MASTER?.completed) {
          gamification.achievements.WORKOUT_MASTER = { completed: true, date: new Date().toISOString(), points: 200 };
          pointsEarned += 200;
          newAchievements.push({ name: 'Mestre do Treino', icon: '🏆' });
        }
        break;
        
      case 'steps':
        const oldSteps = gamification.totalSteps || 0;
        gamification.totalSteps = oldSteps + value;
        
        if (oldSteps < 1000 && gamification.totalSteps >= 1000 && !gamification.achievements?.FIRST_WALK?.completed) {
          if (!gamification.achievements) gamification.achievements = {};
          gamification.achievements.FIRST_WALK = { completed: true, date: new Date().toISOString(), points: 30 };
          pointsEarned += 30;
          newAchievements.push({ name: 'Primeiros Passos', icon: '👣' });
        }
        if (oldSteps < 100000 && gamification.totalSteps >= 100000 && !gamification.achievements?.MARATHON?.completed) {
          gamification.achievements.MARATHON = { completed: true, date: new Date().toISOString(), points: 250 };
          pointsEarned += 250;
          newAchievements.push({ name: 'Maratonista', icon: '🏃' });
        }
        break;
        
      case 'dailyGoal':
        if (!gamification.achievements?.DAILY_GOAL?.completed) {
          if (!gamification.achievements) gamification.achievements = {};
          gamification.achievements.DAILY_GOAL = { completed: true, date: new Date().toISOString(), points: 100 };
          pointsEarned += 100;
          newAchievements.push({ name: 'Meta Diária', icon: '🎯' });
        }
        break;
        
      case 'weightPlan':
        if (!gamification.achievements?.WEIGHT_GOAL?.completed) {
          if (!gamification.achievements) gamification.achievements = {};
          gamification.achievements.WEIGHT_GOAL = { completed: true, date: new Date().toISOString(), points: 40 };
          pointsEarned += 40;
          newAchievements.push({ name: 'Meta de Peso', icon: '⚖️' });
        }
        break;
    }

    gamification.totalPoints = (gamification.totalPoints || 0) + pointsEarned;
    
    await updateDoc(userRef, { gamification });
    
    if (newAchievements.length > 0) {
      const achievementNames = newAchievements.map(a => `${a.icon} ${a.name}`).join('\n');
      Alert.alert(
        '🏆 Nova Conquista! 🏆',
        `Parabéns! Você desbloqueou:\n${achievementNames}\n\n+${pointsEarned} pontos!`,
        [{ text: 'Continue assim! 🎉' }]
      );
      Vibration.vibrate([200, 100, 200, 500]);
    }
    
    return { pointsEarned, newAchievements };
  } catch (e) {
    console.log('Erro ao atualizar gamificação:', e);
    return { pointsEarned: 0, newAchievements: [] };
  }
}

// ════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════

function Header({ title, onBack, rightAction, theme }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  return (
    <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={styles.headerBack}>
          <Text style={{ fontSize: 22, color: colors.green }}>‹</Text>
          <Text style={[styles.headerBackText, { color: colors.green }]}> Voltar</Text>
        </TouchableOpacity>
      ) : <View style={{ width: 70 }} />}
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      {rightAction || <View style={{ width: 70 }} />}
    </View>
  );
}

function Card({ children, style, theme }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  return (
    <View style={[
      styles.card,
      {
        backgroundColor: colors.bgCard,
        borderColor: colors.border,
        ...(theme === 'light' && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.08,
          shadowRadius: 3,
          elevation: 2,
        }),
      },
      style,
    ]}>
      {children}
    </View>
  );
}

function Input({ label, theme, ...props }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={[styles.inputLabel, { color: colors.textSub }]}>{label}</Text>}
      <TextInput 
        style={[styles.input, { backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text }]} 
        placeholderTextColor={colors.textMuted} 
        {...props} 
      />
    </View>
  );
}

function Btn({ label, onPress, variant = 'primary', loading = false, style, theme }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const variants = {
    primary:   { bg: colors.green,        text: theme === 'dark' ? '#000' : '#fff' },
    accent:    { bg: colors.accent,       text: '#000' },
    secondary: { bg: colors.bgCard2,      text: colors.textSub },
    danger:    { bg: colors.red,          text: '#fff' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      style={[{
        backgroundColor: v.bg,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: loading ? 0.7 : 1,
      }, style]}
    >
      {loading
        ? <ActivityIndicator color={v.text} size="small" />
        : <Text style={{ color: v.text, fontWeight: '700', fontSize: 15 }}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: ONBOARDING
// ════════════════════════════════════════════════════════════
function OnboardingScreen({ onComplete, theme }) {
  const [step, setStep] = useState(0);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  const [goal, setGoal] = useState('');
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  const steps = [
    {
      title: 'Bem-vindo ao KETO+!',
      description: 'Seu guia completo para uma vida mais saudável com jejum intermitente, atividades físicas e muito mais.',
      icon: '🥑',
    },
    {
      title: 'Vamos começar com seus dados',
      description: 'Isso nos ajudará a personalizar seu plano.',
      component: (
        <>
          <Input label="Peso atual (kg)" value={weight} onChangeText={setWeight} keyboardType="decimal-pad" theme={theme} />
          <Input label="Altura (cm)" value={height} onChangeText={setHeight} keyboardType="numeric" theme={theme} />
          <Input label="Idade" value={age} onChangeText={setAge} keyboardType="numeric" theme={theme} />
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            {['M', 'F'].map(g => (
              <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => setGender(g)}>
                <Text style={[styles.genderBtnText, { color: gender === g ? '#000' : colors.textSub }]}>{g === 'M' ? '♂ Masculino' : '♀ Feminino'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ),
    },
    {
      title: 'Qual seu objetivo?',
      description: 'Quanto peso você deseja perder?',
      component: (
        <Input label="Quanto deseja perder (kg)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" theme={theme} />
      ),
    },
    {
      title: 'Tudo pronto!',
      description: 'Seu plano será gerado automaticamente. Vamos começar sua jornada!',
      icon: '🚀',
    },
  ];

  const current = steps[step];

  const handleNext = async () => {
    if (step === 1 && (!weight || !height || !age)) {
      Alert.alert('Atenção', 'Preencha todos os dados');
      return;
    }
    if (step === 2 && !goal) {
      Alert.alert('Atenção', 'Informe seu objetivo');
      return;
    }
    if (step === 2) {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem('user_weight', weight);
      await AsyncStorage.setItem('user_height', height);
      await AsyncStorage.setItem('user_age', age);
      await AsyncStorage.setItem('user_gender', gender);
      await AsyncStorage.setItem('user_goal', goal);
      onComplete({ weight: parseFloat(weight), height: parseFloat(height), age: parseInt(age), gender, goal: parseFloat(goal) });
    } else {
      setStep(step + 1);
    }
  };

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>{current.icon || '🥑'}</Text>
          <Text style={[styles.logoTitle, { color: colors.green, textAlign: 'center' }]}>{current.title}</Text>
          <Text style={[styles.logoSub, { color: colors.textMuted, textAlign: 'center', marginTop: 8 }]}>{current.description}</Text>
        </View>

        {current.component && <View style={{ width: '100%', marginBottom: 32 }}>{current.component}</View>}

        <Btn label={step === 2 ? 'Começar Jornada' : 'Continuar'} onPress={handleNext} variant="primary" theme={theme} style={{ width: '100%' }} />
        
        {step > 0 && step < 2 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={{ marginTop: 16 }}>
            <Text style={{ color: colors.green }}>← Voltar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: COACH IA
// ════════════════════════════════════════════════════════════
async function testGroqAPISimple() {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: "Diga apenas: CONECTADO" }],
        max_tokens: 10,
      }),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function getCoachResponse(question) {
  if (!question || question.trim().length < 2) {
    return "Por favor, digite uma pergunta mais específica sobre dieta keto.\n\nExemplos:\n• O que posso comer no café da manhã?\n• Como começar o jejum intermitente?\n• Quais alimentos evitar na dieta keto?";
  }
  
  try {
    const systemPrompt = `Você é o "Coach Keto", um assistente especialista em dieta keto e jejum intermitente.

REGRAS IMPORTANTES:
1. Responda SEMPRE em português
2. Seja educado, motivador e prático
3. Dê exemplos concretos de alimentos low carb
4. Seja conciso (máximo 150 palavras)
5. Use emojis ocasionalmente para tornar amigável
6. Nunca recomende alimentos com muito açúcar ou carboidratos

Responda como um nutricionista amigo que está ajudando alguém na jornada keto.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) return '🥑 Desculpe, estou com dificuldades técnicas. Tente novamente em alguns instantes.';

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta. Tente reformular.';
  } catch (error) {
    return '🥑 Erro de conexão. Verifique sua internet e tente novamente.';
  }
}

function CoachScreen({ onBack, user, profile, theme }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: '🥑 Olá! Sou seu Coach Keto especialista em dieta keto!\n\nPosso ajudar você com:\n✅ O que comer na dieta keto\n✅ Dicas de jejum intermitente\n✅ Como entrar em cetose\n✅ Responder dúvidas sobre low carb\n\nComo posso ajudar você hoje?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState('testing');
  const flatListRef = useRef(null);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  useEffect(() => { testConnection(); }, []);

  const testConnection = async () => {
    setApiStatus('testing');
    const working = await testGroqAPISimple();
    setApiStatus(working ? 'online' : 'offline');
    if (!working) {
      setMessages(prev => [...prev, {
        id: 'error',
        role: 'assistant',
        content: '⚠️ Estou com problemas de conexão com a IA. Verifique sua internet e tente novamente.\n\nEnquanto isso, aqui vão algumas dicas keto:\n• Beba 2-3 litros de água por dia\n• Mantenha os carbs abaixo de 20g\n• Priorize gorduras boas (abacate, azeite, coco)\n• Faça jejum de 16 horas'
      }]);
    }
  };

  // ============================================================
  // FUNÇÃO sendMessage MODIFICADA COM ANÚNCIO
  // ============================================================
  const sendMessage = async () => {
    if (!input.trim()) {
      Alert.alert('Atenção', 'Digite uma mensagem primeiro');
      return;
    }
    
    const userPlan = profile?.subscriptionPlan || 'free';
    
    // Se for premium/pro, libera direto sem anúncio
    if (userPlan !== 'free') {
      await performSendMessage();
      return;
    }
    
    // Plano gratuito: precisa assistir anúncio
    Alert.alert(
      '🎬 Anúncio Necessário',
      'No plano gratuito, você precisa assistir a um anúncio para usar o Coach IA.\n\nO anúncio dura cerca de 5-10 segundos.\n\nDeseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: '📺 Assistir Anúncio', 
          onPress: async () => {
            setLoading(true);
            
            // Inicializar AdMob se necessário
            await initializeAdMob();
            
            const ad = createRewardedAd('coach');
            
            await showRewardedAd(
              ad,
              (reward) => {
                console.log('✅ Usuário assistiu ao anúncio! Recompensa:', reward);
                Alert.alert('🎉 Anúncio concluído!', 'Você pode usar o Coach IA agora!', [
                  { text: 'OK', onPress: () => performSendMessage() }
                ]);
                setLoading(false);
              },
              (error) => {
                console.log('Erro no anúncio:', error);
                Alert.alert('⚠️ Erro', 'Não foi possível carregar o anúncio. Tente novamente.');
                setLoading(false);
              },
              () => {
                setLoading(false);
              }
            );
          }
        }
      ]
    );
  };

  // ============================================================
  // FUNÇÃO AUXILIAR performSendMessage (NOVA - Colocar AQUI)
  // ============================================================
  const performSendMessage = async () => {
    if (apiStatus === 'offline') {
      Alert.alert('⚠️ IA Indisponível', 'Verifique sua conexão com a internet e tente novamente.');
      return;
    }
    
    const userMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = input;
    setInput('');
    setLoading(true);

    try {
      const response = await getCoachResponse(currentQuestion);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: '🥑 Desculpe, não consegui processar sua pergunta agora. Pode tentar reformular ou perguntar algo mais específico sobre dieta keto?' }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const quickQuestions = [
    'O que posso comer no café da manhã keto?',
    'Como sei se estou em cetose?',
    'Dicas para jejum de 16 horas',
    'Quais frutas posso comer?',
    'O que é carboidrato líquido?',
    'Sugestões de lanches low carb',
  ];

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header 
        title="🥑 Coach Keto" 
        onBack={onBack} 
        theme={theme}
        rightAction={
          <TouchableOpacity onPress={testConnection} style={{ padding: 8 }}>
            <Ionicons 
              name={apiStatus === 'online' ? "checkmark-circle" : apiStatus === 'offline' ? "alert-circle" : "sync-outline"} 
              size={22} 
              color={apiStatus === 'online' ? colors.green : colors.red} 
            />
          </TouchableOpacity>
        }
      />
      
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListHeaderComponent={
          messages.length === 1 && apiStatus === 'online' ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.textSub, marginTop: 0 }]}>💬 PERGUNTAS RÁPIDAS</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {quickQuestions.map((q, i) => (
                  <TouchableOpacity
                    key={i}
                    style={{
                      backgroundColor: colors.bgCard,
                      borderColor: colors.green,
                      borderWidth: 1,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                    onPress={() => setInput(q)}
                  >
                    <Text style={{ color: colors.green, fontSize: 12 }}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[
            { maxWidth: '85%', padding: 12, borderRadius: 20, marginVertical: 6 },
            item.role === 'user' 
              ? { alignSelf: 'flex-end', backgroundColor: colors.green, marginLeft: 40, borderBottomRightRadius: 4 }
              : { alignSelf: 'flex-start', backgroundColor: colors.bgCard, marginRight: 40, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border }
          ]}>
            <Text style={{ color: item.role === 'user' ? '#000' : colors.text, fontSize: 15, lineHeight: 22 }}>{item.content}</Text>
          </View>
        )}
      />
      
      <View style={{ flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, alignItems: 'center' }}>
        <TextInput
          style={{ flex: 1, backgroundColor: colors.bgCard, borderColor: colors.border, color: colors.text, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, borderWidth: 1 }}
          value={input}
          onChangeText={setInput}
          placeholder="Digite sua pergunta sobre keto e saúde..."
          placeholderTextColor={colors.textMuted}
          multiline
          editable={!loading}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          disabled={loading || !input.trim() || apiStatus === 'offline'} 
          style={{ backgroundColor: colors.green, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 8, opacity: (loading || !input.trim() || apiStatus === 'offline') ? 0.5 : 1 }}
        >
          {loading ? <ActivityIndicator color="#000" size="small" /> : <Ionicons name="send" size={22} color="#000" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}
// ════════════════════════════════════════════════════════════
// TELA: DIÁRIO ALIMENTAR
// ════════════════════════════════════════════════════════════
function FoodDiaryScreen({ onBack, user, profile, theme }) {
  const [meals, setMeals] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [dailyTotals, setDailyTotals] = useState({ carbs: 0, protein: 0, fat: 0, calories: 0 });
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDescription, setManualDescription] = useState('');
  const [analyzingManual, setAnalyzingManual] = useState(false);

  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const plan = profile?.weightPlan;
  const dailyMacroTarget = plan
    ? { carbs: plan.carbs, protein: plan.protein, fat: plan.fat, calories: plan.targetCals }
    : { carbs: 50, protein: 100, fat: 120, calories: 1800 };

  useEffect(() => {
    loadMealsForDate(selectedDate);
  }, [selectedDate]);

  const changeDate = (direction) => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + direction);
    const newDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    setSelectedDate(newDate);
    setMeals([]);
    setDailyTotals({ carbs: 0, protein: 0, fat: 0, calories: 0 });
  };

  const formatDateDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    if (dateStr === todayStr) return `Hoje — ${date.toLocaleDateString('pt-BR')}`;
    if (dateStr === yesterdayStr) return `Ontem — ${date.toLocaleDateString('pt-BR')}`;
    return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const loadMealsForDate = async (date) => {
    if (!user) return;
    try {
      const mealsRef = collection(db, 'users', user.uid, 'foodEntries');
      const q = query(mealsRef, where('date', '==', date));
      const snapshot = await getDocs(q);
      const loadedMeals = [];
      let totals = { carbs: 0, protein: 0, fat: 0, calories: 0 };
      snapshot.forEach(doc => {
        const meal = { id: doc.id, ...doc.data() };
        loadedMeals.push(meal);
        totals.carbs    += Number(meal.carbs)    || 0;
        totals.protein  += Number(meal.protein)  || 0;
        totals.fat      += Number(meal.fat)      || 0;
        totals.calories += Number(meal.calories) || 0;
      });
      loadedMeals.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
      setMeals(loadedMeals);
      setDailyTotals(totals);
    } catch (e) {
      console.log('Erro ao carregar refeições:', e);
    }
  };

  const addMeal = async (food) => {
    if (!user) return;
    const meal = {
      name: food.name,
      carbs: Math.round(Number(food.carbs) || 0),
      protein: Math.round(Number(food.protein) || 0),
      fat: Math.round(Number(food.fat) || 0),
      calories: Math.round(Number(food.calories) || 0),
      date: selectedDate,
      timestamp: new Date().toISOString(),
    };
    try {
      await addDoc(collection(db, 'users', user.uid, 'foodEntries'), meal);
      await loadMealsForDate(selectedDate);
      setSearchQuery('');
      setSearchResults([]);
      setManualDescription('');
      setShowManualEntry(false);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível adicionar a refeição');
    }
  };

  const deleteMeal = async (mealId) => {
    Alert.alert('Remover', 'Deseja remover este item?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'foodEntries', mealId));
          await loadMealsForDate(selectedDate);
        } catch (e) {
          Alert.alert('Erro', 'Não foi possível remover');
        }
      }},
    ]);
  };

  const searchFood = async (text) => {
    setSearchQuery(text);
    if (text.length < 2) { setSearchResults([]); return; }
    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(text)}&search_simple=1&action=process&json=1&page_size=8`);
      const data = await response.json();
      if (data.products) {
        setSearchResults(data.products.filter(p => p.product_name).map(p => ({
          name: p.product_name,
          carbs: Number(p.nutriments?.carbohydrates_100g) || 0,
          protein: Number(p.nutriments?.proteins_100g) || 0,
          fat: Number(p.nutriments?.fat_100g) || 0,
          calories: Number(p.nutriments?.['energy-kcal_100g']) || 0,
        })));
      }
    } catch (e) {
      console.log('Erro na busca:', e);
    }
  };

  const analyzeManualEntry = async () => {
    if (!manualDescription.trim()) {
      Alert.alert('Atenção', 'Descreva o que você comeu antes de calcular.');
      return;
    }
    setAnalyzingManual(true);
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          response_format: { type: "json_object" },
          messages: [
            { role: 'system', content: 'Você é nutricionista. Calcule macros e calorias da refeição descrita. Responda APENAS com JSON válido: {"name":"nome da refeição","carbs":0,"protein":0,"fat":0,"calories":0}' },
            { role: 'user', content: manualDescription.trim() }
          ],
          temperature: 0.2,
          max_tokens: 200,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const errorMsg = data?.error?.message || 'Erro na API';
        console.log('Groq manual error:', errorMsg);
        Alert.alert('Erro', 'Não foi possível calcular. Tente novamente.');
        return;
      }
      const text = data.choices?.[0]?.message?.content || '';
      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { Alert.alert('Erro', 'Não consegui interpretar a resposta. Tente descrever com mais detalhes.'); return; }
      const parsed = JSON.parse(jsonMatch[0]);
      Alert.alert('🥗 Refeição Calculada', `📝 ${parsed.name || 'Refeição'}\n\n🥖 Carbs: ${Math.round(parsed.carbs || 0)}g\n🥩 Proteína: ${Math.round(parsed.protein || 0)}g\n🥑 Gordura: ${Math.round(parsed.fat || 0)}g\n🔥 Calorias: ${Math.round(parsed.calories || 0)} kcal`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: '✅ Adicionar', onPress: () => addMeal({ name: parsed.name || manualDescription.slice(0, 40), carbs: Math.round(parsed.carbs || 0), protein: Math.round(parsed.protein || 0), fat: Math.round(parsed.fat || 0), calories: Math.round(parsed.calories || 0) }) }
      ]);
    } catch (e) { console.log('Erro manual entry:', e); Alert.alert('Erro', 'Falha ao processar. Verifique sua conexão.'); } finally { setAnalyzingManual(false); }
  };

  const launchPhotoAnalysis = async (source) => {
    let result;
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permissão necessária', 'Permita o acesso à câmera.'); return; }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.3,
          base64: true,
          allowsEditing: true,
          exif: false,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permissão necessária', 'Permita o acesso à galeria.'); return; }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.3,
          base64: true,
          allowsEditing: true,
          exif: false,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      if (!asset.base64) {
        Alert.alert('Erro', 'Não foi possível obter os dados da imagem. Tente novamente.');
        return;
      }

      setAnalyzing(true);

      const requestBody = {
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é um nutricionista especialista. Responda SEMPRE com JSON válido, sem texto adicional.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analise a imagem e identifique todos os alimentos visíveis. Estime as quantidades em gramas de forma realista para uma porção normal. Retorne EXATAMENTE este JSON (sem markdown, sem texto extra):
{"foods":[{"name":"nome do alimento","carbs":0,"protein":0,"fat":0,"calories":0,"portionGrams":0}],"totalMeal":{"carbs":0,"protein":0,"fat":0,"calories":0}}`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${asset.base64}`,
                  detail: "low",
                },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || 'Erro desconhecido da API';
        console.log('Groq API error:', JSON.stringify(data));
        Alert.alert('Erro ao analisar foto', `${errorMsg}\n\nTente uma foto com melhor iluminação.`);
        return;
      }

      const text = data.choices?.[0]?.message?.content || '';
      console.log('Groq vision response:', text);

      const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('Nenhum JSON encontrado na resposta:', cleaned);
        Alert.alert('⚠️ Erro', 'A IA não retornou um formato válido. Tente descrever o alimento manualmente.');
        return;
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseErr) {
        console.log('Erro ao parsear JSON:', parseErr, jsonMatch[0]);
        Alert.alert('⚠️ Erro', 'Não foi possível interpretar a resposta da IA. Tente descrever manualmente.');
        return;
      }

      const foods = Array.isArray(parsed.foods) ? parsed.foods : [];
      if (foods.length === 0) {
        Alert.alert('⚠️ Nenhum alimento identificado', 'A IA não reconheceu alimentos nesta foto. Tente uma foto mais próxima e com boa iluminação.');
        return;
      }

      const total = parsed.totalMeal || {
        carbs: foods.reduce((s, f) => s + (Number(f.carbs) || 0), 0),
        protein: foods.reduce((s, f) => s + (Number(f.protein) || 0), 0),
        fat: foods.reduce((s, f) => s + (Number(f.fat) || 0), 0),
        calories: foods.reduce((s, f) => s + (Number(f.calories) || 0), 0),
      };

      const foodsText = foods
        .map(f => `• ${f.name} (${f.portionGrams || '?'}g): ${f.carbs}g carbs, ${f.protein}g prot, ${f.fat}g gord, ${f.calories}kcal`)
        .join('\n');

      Alert.alert(
        '🥗 Análise da Refeição',
        `🍽️ ALIMENTOS IDENTIFICADOS:\n\n${foodsText}\n\n📊 TOTAL DA REFEIÇÃO:\n🥖 Carbs: ${Math.round(total.carbs)}g\n🥩 Proteína: ${Math.round(total.protein)}g\n🥑 Gordura: ${Math.round(total.fat)}g\n🔥 Calorias: ${Math.round(total.calories)} kcal`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: '✅ Adicionar Tudo',
            onPress: async () => {
              for (const food of foods) {
                await addMeal({
                  name: food.name,
                  carbs: Math.round(Number(food.carbs) || 0),
                  protein: Math.round(Number(food.protein) || 0),
                  fat: Math.round(Number(food.fat) || 0),
                  calories: Math.round(Number(food.calories) || 0),
                });
              }
              Alert.alert('✅ Adicionado!', `${foods.length} alimento(s) adicionado(s) ao diário.`);
            },
          },
        ]
      );
    } catch (e) {
      console.log('Erro ao processar imagem:', e);
      Alert.alert('Erro', 'Ocorreu um erro ao processar a imagem. Verifique sua conexão e tente novamente.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePhotoAnalysis = () => {
  const userPlan = profile?.subscriptionPlan || 'free';
  
  if (userPlan !== 'free') {
    Alert.alert('Analisar Refeição por Foto', 'A IA vai identificar TODOS os alimentos na foto.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📷 Câmera', onPress: () => launchPhotoAnalysis('camera') },
      { text: '🖼 Galeria', onPress: () => launchPhotoAnalysis('gallery') },
    ]);
    return;
  }
  
  Alert.alert(
    '🎬 Anúncio Necessário',
    'No plano gratuito, você precisa assistir a um anúncio para usar a análise por foto.\n\nO anúncio dura cerca de 5-10 segundos.\n\nDeseja continuar?',
    [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: '📺 Assistir Anúncio', 
        onPress: async () => {
          setAnalyzing(true);
          await initializeAdMob();
          const ad = createRewardedAd('photo');
          
          await showRewardedAd(
            ad,
            (reward) => {
              Alert.alert('🎉 Anúncio concluído!', 'Você pode usar a análise por foto agora!', [
                { text: 'OK', onPress: () => {
                  Alert.alert('Analisar Refeição por Foto', 'A IA vai identificar TODOS os alimentos na foto.', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: '📷 Câmera', onPress: () => launchPhotoAnalysis('camera') },
                    { text: '🖼 Galeria', onPress: () => launchPhotoAnalysis('gallery') },
                  ]);
                }}
              ]);
            },
            (error) => {
              Alert.alert('⚠️ Erro', 'Não foi possível carregar o anúncio. Tente novamente.');
            },
            () => {
              setAnalyzing(false);
            }
          );
        }
      }
    ]
  );
};

  const carbPercentage = Math.min((dailyTotals.carbs / dailyMacroTarget.carbs) * 100, 100);
  const proteinPercentage = Math.min((dailyTotals.protein / dailyMacroTarget.protein) * 100, 100);
  const fatPercentage = Math.min((dailyTotals.fat / dailyMacroTarget.fat) * 100, 100);
  const calPercentage = Math.min((dailyTotals.calories / dailyMacroTarget.calories) * 100, 100);

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="📝 Diário Alimentar" onBack={onBack} theme={theme} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={() => changeDate(-1)} style={{ padding: 8 }}><Text style={{ fontSize: 24, color: colors.green }}>‹</Text></TouchableOpacity>
          <Text style={[styles.dateText, { color: colors.text, fontSize: 14, textAlign: 'center', flex: 1 }]}>{formatDateDisplay(selectedDate)}</Text>
          <TouchableOpacity onPress={() => changeDate(1)} style={{ padding: 8 }}><Text style={{ fontSize: 24, color: colors.green }}>›</Text></TouchableOpacity>
        </View>
        <Card theme={theme} style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, paddingHorizontal: 0 }]}>🎯 Meta Diária</Text>
          {[
            { label: '🥖 Carbs', current: dailyTotals.carbs, target: dailyMacroTarget.carbs, pct: carbPercentage, color: colors.red },
            { label: '🥩 Proteínas', current: dailyTotals.protein, target: dailyMacroTarget.protein, pct: proteinPercentage, color: colors.green },
            { label: '🥑 Gorduras', current: dailyTotals.fat, target: dailyMacroTarget.fat, pct: fatPercentage, color: colors.accent },
            { label: '🔥 Calorias', current: dailyTotals.calories, target: dailyMacroTarget.calories, pct: calPercentage, color: colors.text, suffix: '' },
          ].map(m => (
            <View key={m.label} style={styles.macroItem}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[styles.macroLabel, { color: m.color }]}>{m.label}</Text>
                <Text style={[styles.macroValue, { color: m.color }]}>{Math.round(m.current)}{m.suffix !== '' ? 'g' : ''} / {Math.round(m.target)}{m.suffix !== '' ? 'g' : ''}</Text>
              </View>
              <View style={styles.progressBarSmall}><View style={[styles.progressFillSmall, { width: `${m.pct}%`, backgroundColor: m.color }]} /></View>
            </View>
          ))}
        </Card>
        <Card theme={theme} style={{ marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, paddingHorizontal: 0 }]}>➕ Adicionar Refeição</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            <TouchableOpacity style={[styles.addMethodButton, { backgroundColor: colors.green + '22', borderColor: colors.green, flex: 1 }]} onPress={() => { setShowManualEntry(!showManualEntry); setSearchQuery(''); setSearchResults([]); }}>
              <Text style={{ fontSize: 20 }}>✍️</Text><Text style={{ color: colors.green, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Descrever{'\n'}manualmente</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addMethodButton, { backgroundColor: colors.purple + '22', borderColor: colors.purple, flex: 1 }]} onPress={() => { setShowManualEntry(false); setSearchQuery(''); setSearchResults([]); }}>
              <Text style={{ fontSize: 20 }}>🔍</Text><Text style={{ color: colors.purple, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Buscar{'\n'}alimento</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addMethodButton, { backgroundColor: colors.blue + '22', borderColor: colors.blue, flex: 1 }]} onPress={() => { setShowManualEntry(false); setSearchQuery(''); setSearchResults([]); handlePhotoAnalysis(); }}>
              <Text style={{ fontSize: 20 }}>📷</Text><Text style={{ color: colors.blue, fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Foto da{'\n'}refeição</Text>
            </TouchableOpacity>
          </View>
          {showManualEntry && (
            <View style={{ marginBottom: 8 }}>
              <Text style={[styles.inputLabel, { color: colors.textSub }]}>Descreva o que você comeu:</Text>
              <TextInput style={{ backgroundColor: colors.bgCard2, borderColor: colors.green, borderWidth: 1, borderRadius: 12, padding: 14, color: colors.text, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 }} placeholder="Ex: 2 ovos mexidos com manteiga, 1 fatia de pão integral" placeholderTextColor={colors.textMuted} value={manualDescription} onChangeText={setManualDescription} multiline maxLength={500} />
              <TouchableOpacity style={{ backgroundColor: analyzingManual ? colors.bgCard2 : colors.green, borderRadius: 12, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: analyzingManual || !manualDescription.trim() ? 0.6 : 1 }} onPress={analyzeManualEntry} disabled={analyzingManual || !manualDescription.trim()}>
                {analyzingManual ? <><ActivityIndicator color={colors.text} size="small" /><Text style={{ color: colors.text, fontWeight: '700' }}>Calculando...</Text></> : <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>🤖 Calcular com IA</Text>}
              </TouchableOpacity>
            </View>
          )}
          {!showManualEntry && (
            <>
              <TextInput style={[styles.input, { backgroundColor: colors.bgCard2, borderColor: colors.border, color: colors.text, marginBottom: 4 }]} value={searchQuery} onChangeText={searchFood} placeholder="Digite o nome do alimento..." placeholderTextColor={colors.textMuted} />
              {searchResults.length > 0 && (
                <View style={[styles.searchResults, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  {searchResults.slice(0, 6).map((food, i) => (
                    <TouchableOpacity key={i} style={[styles.searchResultItem, { borderBottomColor: colors.border }]} onPress={() => addMeal(food)}>
                      <Text style={{ color: colors.text, fontSize: 13 }}>{food.name}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11 }}>{food.calories} kcal · C:{food.carbs}g P:{food.protein}g G:{food.fat}g</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>🍽️ Refeições do Dia</Text>
        {meals.length === 0 ? (
          <Card theme={theme} style={{ alignItems: 'center', padding: 28 }}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>🍽️</Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Nenhuma refeição registrada{'\n'}em {formatDateDisplay(selectedDate)}</Text>
          </Card>
        ) : (
          meals.map(meal => (
            <Card key={meal.id} theme={theme} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>{meal.name}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>🥖 {meal.carbs}g  🥩 {meal.protein}g  🥑 {meal.fat}g  🔥 {meal.calories}kcal</Text>
                </View>
                <TouchableOpacity onPress={() => deleteMeal(meal.id)} style={{ padding: 6 }}><Text style={{ fontSize: 20 }}>🗑️</Text></TouchableOpacity>
              </View>
            </Card>
          ))
        )}
        {meals.length > 0 && (
          <Card theme={theme} style={{ marginTop: 4, backgroundColor: colors.greenDark + '33', borderColor: colors.green + '44' }}>
            <Text style={{ color: colors.green, fontWeight: '700', marginBottom: 6 }}>📊 Total do Dia</Text>
            <Text style={{ color: colors.text, fontSize: 13 }}>🥖 {Math.round(dailyTotals.carbs)}g carbs  ·  🥩 {Math.round(dailyTotals.protein)}g prot  ·  🥑 {Math.round(dailyTotals.fat)}g gord  ·  🔥 {Math.round(dailyTotals.calories)} kcal</Text>
          </Card>
        )}
      </ScrollView>
      {(analyzing || analyzingManual) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={{ color: colors.text, marginTop: 12 }}>{analyzingManual ? '🤖 IA calculando macros...' : '🔍 Analisando foto...'}</Text>
        </View>
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: HIDRATAÇÃO - VERSÃO PROFISSIONAL COM NOTIFICAÇÕES
const WATER_CONFIG_KEY = 'water_config_v1';
const WATER_NOTIF_IDS_KEY = 'water_notif_ids';

// ✅ ADICIONE estas variáveis GLOBAIS
let scheduleWaterRemindersCallCount = 0;
let lastScheduleCall = 0;
let scheduleTimeout = null;

async function cancelAllWaterNotifications() {
  try {
    const saved = await AsyncStorage.getItem(WATER_NOTIF_IDS_KEY);
    if (saved) {
      const ids = JSON.parse(saved);
      for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
      }
    }
    await AsyncStorage.removeItem(WATER_NOTIF_IDS_KEY);
  } catch (_) {}
}

// ✅ CORREÇÃO: scheduleWaterReminders — usa trigger 'daily' para repetir todo dia
async function scheduleWaterReminders(config) {
  if (!config.enabled) return;

  await cancelAllWaterNotifications();

  const { intervalMinutes, mlPerGlass, startHour, endHour } = config;
  const ids = [];

  let currentMinutes = startHour * 60;
  const endMinutes = endHour * 60;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Hora de beber água!',
          body: `Beba ${mlPerGlass}ml agora para se manter hidratado(a)!`,
          data: { action: 'drink_water', ml: mlPerGlass, type: 'water_reminder' },
          channelId: 'water-channel',
          sound: true, // ← corrigido
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY, // ← SDK 54
          hour: hours,
          minute: minutes,
        },
      });
      ids.push(notificationId);
      console.log(`✅ Agendada: ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`);
    } catch (e) {
      console.log('❌ Erro ao agendar:', e.message);
    }

    currentMinutes += intervalMinutes;
  }

  await AsyncStorage.setItem(WATER_NOTIF_IDS_KEY, JSON.stringify(ids));

  if (ids.length > 0) {
    Alert.alert('✅ Lembretes configurados', `${ids.length} notificações diárias agendadas`);
  } else {
    Alert.alert('⚠️ Nenhuma notificação agendada', 'Verifique os horários e tente novamente.');
  }
}

async function getNextWaterNotificationTime(config) {
  if (!config.enabled) return null;

  const { intervalMinutes, startHour, endHour } = config;
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let minuteOffset = startHour * 60;
  const endMinutes = endHour * 60;

  while (minuteOffset < endMinutes) {
    if (minuteOffset > nowMinutes) {
      const next = new Date();
      next.setHours(Math.floor(minuteOffset / 60), minuteOffset % 60, 0, 0);
      return next;
    }
    minuteOffset += intervalMinutes;
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(startHour, 0, 0, 0);
  return tomorrow;
}

// ════════════════════════════════════════════════════════════
// TELA: HIDRATAÇÃO - VERSÃO CORRIGIDA (SEM NOTIFICAÇÕES DUPLICADAS)
// ════════════════════════════════════════════════════════════
function WaterTrackerScreen({ onBack, user, theme }) {
  const [waterIntake, setWaterIntake] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nextNotificationTime, setNextNotificationTime] = useState(null);
  const [testingNotif, setTestingNotif] = useState(false);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  const [config, setConfig] = useState({
    enabled: false,
    dailyGoalMl: 2000,
    mlPerGlass: 250,
    intervalMinutes: 60,
    startHour: 7,
    endHour: 22,
  });

  const glassesGoal = Math.ceil(config.dailyGoalMl / config.mlPerGlass);
  const glassesConsumed = Math.floor(waterIntake / config.mlPerGlass);
  const percentage = Math.min((waterIntake / config.dailyGoalMl) * 100, 100);

  // ✅ REFs para controle
  const hasInitialized = useRef(false);
  const isSavingRef = useRef(false);

  // ✅ useEffect ÚNICO - roda apenas na montagem do componente
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const init = async () => {
      await loadConfigOnce();
      await loadWaterData();
      setupDailyReset();
    };
    init();

    const cleanup = setupNotificationListener();
    return cleanup;
  }, []); // ✅ Sem dependências — roda UMA única vez

  // ✅ Função que APENAS carrega a config salva - NÃO agenda nada!
  const loadConfigOnce = async () => {
    try {
      const saved = await AsyncStorage.getItem(WATER_CONFIG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(parsed);

        // Apenas atualiza o horário da próxima notificação para exibição (sem agendar)
        if (parsed.enabled) {
          const nextTime = await getNextWaterNotificationTime(parsed);
          setNextNotificationTime(nextTime);
        }
      }
    } catch (_) {}
  };

  // ✅ Função para carregar os dados de água do dia
  const loadWaterData = async () => {
    if (!user) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const ref = collection(db, 'users', user.uid, 'waterEntries');
      const q = query(ref, where('date', '==', today));
      const snap = await getDocs(q);
      let total = 0;
      snap.forEach(d => { total += (d.data().ml || d.data().amount * 250 || 0); });
      setWaterIntake(total);
    } catch (e) { console.log('Erro ao carregar água:', e); }
  };

  // ✅ Reset diário dos dados de água
  const setupDailyReset = () => {
    const checkReset = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastReset = await AsyncStorage.getItem(`water_last_reset_${user?.uid}`);
      if (lastReset !== today && user) {
        setWaterIntake(0);
        await AsyncStorage.setItem(`water_last_reset_${user?.uid}`, today);
      }
    };
    checkReset();
    const interval = setInterval(checkReset, 60000);
    return () => clearInterval(interval);
  };

  // ✅ Listener para resposta às notificações
  const setupNotificationListener = () => {
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      if (data?.action === 'drink_water') {
        console.log('Notificação de água recebida:', data);
      }
    });
    
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.action === 'drink_water') {
        const ml = data.ml || 250;
        // Registrar diretamente para evitar múltiplos cliques/registros acidentais
        addWaterMl(ml, true);
        Alert.alert('💧 Hidratação', `Você registrou ${ml}ml de água! Continue assim!`);
      }
    });
    
    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  };

  // ✅ Teste de notificação
  const testNotification = async () => {
    setTestingNotif(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Ative as notificações nas configurações do celular.');
        setTestingNotif(false);
        return;
      }

      await Notifications.scheduleNotificationAsync({
        identifier: `test_${Date.now()}`,
        content: {
          title: '🔔 Teste de Notificação',
          body: 'Se você está vendo isso, as notificações estão funcionando! ✅',
          data: { action: 'test' },
          channelId: 'water-channel',
          sound: true,
        },
        trigger: { type: 'date', timestamp: Date.now() + 2000 },
      });

      Alert.alert('✅ Teste enviado!', 'Você receberá uma notificação em 2 segundos.');
    } catch (e) {
      console.log('Erro notificação teste:', e);
      Alert.alert('Erro', `Detalhe: ${e.message}`);
    } finally {
      setTestingNotif(false);
    }
  };

  // ✅ Adicionar água
  const addWaterMl = async (ml, fromNotification = false) => {
    const newTotal = waterIntake + ml;
    setWaterIntake(newTotal);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDoc(collection(db, 'users', user.uid, 'waterEntries'), {
        ml,
        amount: ml / 250,
        date: today,
        timestamp: new Date().toISOString(),
        fromNotification,
      });
      if (newTotal >= config.dailyGoalMl && waterIntake < config.dailyGoalMl) {
        Vibration.vibrate([200, 100, 200]);
        if (!fromNotification) Alert.alert('🎉 Meta atingida!', `Você tomou ${(config.dailyGoalMl / 1000).toFixed(1)}L de água hoje!`);
      }
    } catch (e) { console.log('Erro ao salvar água'); }
  };

  // ✅ Remover último copo
  const removeLastDrink = async () => {
    if (waterIntake <= 0) return;
    const newTotal = Math.max(waterIntake - config.mlPerGlass, 0);
    setWaterIntake(newTotal);
    Alert.alert('💧 Removido', `Último copo removido. Total: ${newTotal}ml`);
  };

  // ✅ SALVAR CONFIGURAÇÃO - ÚNICO LUGAR QUE AGENDA NOTIFICAÇÕES!
  const saveConfig = async () => {
  // ✅ Impede chamadas simultâneas
  if (isSavingRef.current) {
    console.log('⏳ Já salvando, ignorando chamada duplicada...');
    return;
  }
  isSavingRef.current = true;
  setSaving(true);

  try {
    const newConfig = { ...config };
    
    console.log('📝 saveConfig chamada com:', {
      enabled: newConfig.enabled,
      startHour: newConfig.startHour,
      endHour: newConfig.endHour,
      intervalMinutes: newConfig.intervalMinutes
    });

    if (newConfig.enabled) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('⚠️ Permissão negada', 'Ative as notificações nas configurações do celular.');
        newConfig.enabled = false;
        await AsyncStorage.setItem(WATER_CONFIG_KEY, JSON.stringify(newConfig));
        setConfig(newConfig);
        setSaving(false);
        isSavingRef.current = false;
        return;
      }
    }

    await AsyncStorage.setItem(WATER_CONFIG_KEY, JSON.stringify(newConfig));

    if (newConfig.enabled) {
      console.log('🚀 Chamando scheduleWaterReminders...');
      await scheduleWaterReminders(newConfig);
      
      const nextTime = await getNextWaterNotificationTime(newConfig);
      setNextNotificationTime(nextTime);
      setConfig(newConfig);
      setShowConfig(false);
    } else {
      await cancelAllWaterNotifications();
      setNextNotificationTime(null);
      setConfig(newConfig);
      setShowConfig(false);
      Alert.alert('✅ Lembretes desativados!');
    }
  } catch (e) {
    console.log('Erro:', e);
    Alert.alert('Erro', 'Tente novamente.');
    const saved = await AsyncStorage.getItem(WATER_CONFIG_KEY);
    if (saved) setConfig(JSON.parse(saved));
  } finally {
    setSaving(false);
    setTimeout(() => { isSavingRef.current = false; }, 2000);
  }
};

  // ✅ Formatar hora para exibição
  const formatTimeDisplay = (date) => {
    if (!date) return '---';
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // ============================================================
  // TELA DE CONFIGURAÇÃO (showConfig = true)
  // ============================================================
  if (showConfig) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
        <StatusBar hidden translucent backgroundColor="transparent" />
        <Header title="⚙️ Configurar Hidratação" onBack={() => setShowConfig(false)} theme={theme} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

          <Card theme={theme} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <View>
                <Text style={{ color: colors.text, fontWeight: '600' }}>🔔 Ativar lembretes</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Notificações automáticas de hidratação</Text>
              </View>
              <Switch
                value={config.enabled}
                onValueChange={v => setConfig(c => ({ ...c, enabled: v }))}
                trackColor={{ false: colors.border, true: colors.blue }}
                thumbColor={colors.text}
              />
            </View>
          </Card>

          <Card theme={theme} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 12 }}>🥤 Meta e quantidade</Text>
            
            <Text style={[styles.inputLabel, { color: colors.textSub }]}>Meta diária (litros)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              {[1.5, 2, 2.5, 3, 3.5, 4].map(l => (
                <TouchableOpacity
                  key={l}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: config.dailyGoalMl === l * 1000 ? colors.blue : colors.bgCard2, borderWidth: 1, borderColor: config.dailyGoalMl === l * 1000 ? colors.blue : colors.border }}
                  onPress={() => setConfig(c => ({ ...c, dailyGoalMl: l * 1000 }))}
                >
                  <Text style={{ color: config.dailyGoalMl === l * 1000 ? '#fff' : colors.text, fontWeight: '600', fontSize: 12 }}>{l}L</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSub }]}>ml por registro (copo/garrafa)</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 4 }}>
              {[150, 200, 250, 300, 500].map(ml => (
                <TouchableOpacity
                  key={ml}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: config.mlPerGlass === ml ? colors.blue : colors.bgCard2, borderWidth: 1, borderColor: config.mlPerGlass === ml ? colors.blue : colors.border }}
                  onPress={() => setConfig(c => ({ ...c, mlPerGlass: ml }))}
                >
                  <Text style={{ color: config.mlPerGlass === ml ? '#fff' : colors.text, fontWeight: '600', fontSize: 11 }}>{ml}ml</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          <Card theme={theme} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 12 }}>⏰ Frequência dos lembretes</Text>

            <Text style={[styles.inputLabel, { color: colors.textSub }]}>Intervalo entre lembretes</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              {[30, 45, 60, 90, 120].map(min => (
                <TouchableOpacity
                  key={min}
                  style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: config.intervalMinutes === min ? colors.blue : colors.bgCard2, borderWidth: 1, borderColor: config.intervalMinutes === min ? colors.blue : colors.border }}
                  onPress={() => setConfig(c => ({ ...c, intervalMinutes: min }))}
                >
                  <Text style={{ color: config.intervalMinutes === min ? '#fff' : colors.text, fontWeight: '600', fontSize: 12 }}>{min >= 60 ? `${min / 60}h` : `${min}min`}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSub }]}>Horário dos lembretes</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Das (hora)</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[6, 7, 8, 9].map(h => (
                    <TouchableOpacity key={h} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: config.startHour === h ? colors.blue : colors.bgCard2, borderWidth: 1, borderColor: config.startHour === h ? colors.blue : colors.border }} onPress={() => setConfig(c => ({ ...c, startHour: h }))}>
                      <Text style={{ color: config.startHour === h ? '#fff' : colors.text, fontSize: 12 }}>{h}h</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <Text style={{ color: colors.textMuted }}>até</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>Até (hora)</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[20, 21, 22, 23].map(h => (
                    <TouchableOpacity key={h} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: config.endHour === h ? colors.blue : colors.bgCard2, borderWidth: 1, borderColor: config.endHour === h ? colors.blue : colors.border }} onPress={() => setConfig(c => ({ ...c, endHour: h }))}>
                      <Text style={{ color: config.endHour === h ? '#fff' : colors.text, fontSize: 12 }}>{h}h</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </Card>

          {config.enabled && (
            <Card theme={theme} style={{ marginBottom: 12, backgroundColor: colors.blue + '22', borderColor: colors.blue + '44' }}>
              <Text style={{ color: colors.blue, fontWeight: '600', marginBottom: 8 }}>📊 Resumo das notificações</Text>
              <Text style={{ color: colors.text, fontSize: 13 }}>
                🔔 Serão <Text style={{ fontWeight: '700', color: colors.blue }}>
                  {Math.ceil((config.endHour - config.startHour) * 60 / config.intervalMinutes)}
                </Text> notificações por dia
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                ⏰ Das {config.startHour}h às {config.endHour}h, a cada {config.intervalMinutes}min
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                📅 Total de {Math.ceil((config.endHour - config.startHour) * 60 / config.intervalMinutes) * 7} na semana
              </Text>
            </Card>
          )}

          {config.enabled && (
            <Card theme={theme} style={{ marginBottom: 16, borderColor: colors.blue + '44', borderWidth: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>⏰ PRÓXIMA NOTIFICAÇÃO</Text>
              <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 16 }}>
                {formatTimeDisplay(nextNotificationTime)}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                Lembretes das {config.startHour}h às {config.endHour}h, a cada {config.intervalMinutes >= 60 ? `${config.intervalMinutes / 60}h` : `${config.intervalMinutes}min`}
              </Text>
            </Card>
          )}

          {config.enabled && (
            <Btn 
              label={testingNotif ? '⏳ Enviando...' : '🔔 Testar Notificação'} 
              onPress={testNotification} 
              loading={testingNotif}
              variant="accent" 
              style={{ marginBottom: 12 }}
              theme={theme} 
            />
          )}

          <Btn label={saving ? 'Salvando...' : '💾 Salvar configuração'} onPress={saveConfig} loading={saving} variant="primary" theme={theme} />
        </ScrollView>
      </View>
    );
  }

  // ============================================================
  // TELA PRINCIPAL DA HIDRATAÇÃO
  // ============================================================
  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header
        title="💧 Hidratação"
        onBack={onBack}
        theme={theme}
        rightAction={
          <TouchableOpacity onPress={() => setShowConfig(true)} style={{ padding: 8 }}>
            <Text style={{ fontSize: 20 }}>⚙️</Text>
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        <Card theme={theme} style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 12 }}>
          <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <View style={{
              width: 160, height: 160, borderRadius: 80,
              borderWidth: 10,
              borderColor: waterIntake >= config.dailyGoalMl ? colors.green : colors.bgCard2,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: colors.bgCard2,
            }}>
              <View style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${percentage}%`,
                backgroundColor: '#3B82F622',
                borderBottomLeftRadius: 80,
                borderBottomRightRadius: 80,
              }} />
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#3B82F6' }}>
                {(waterIntake / 1000).toFixed(2)}L
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                de {(config.dailyGoalMl / 1000).toFixed(1)}L
              </Text>
              <Text style={{ color: waterIntake >= config.dailyGoalMl ? colors.green : '#3B82F6', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                {waterIntake >= config.dailyGoalMl ? '✅ Meta atingida!' : `${percentage.toFixed(0)}%`}
              </Text>
            </View>
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 10 }}>
            {glassesConsumed} de {glassesGoal} copos ({config.mlPerGlass}ml cada)
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 20, paddingHorizontal: 16 }}>
            {Array.from({ length: Math.min(glassesGoal, 20) }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => i === glassesConsumed ? addWaterMl(config.mlPerGlass) : null}
                style={{
                  width: 32, height: 40,
                  borderWidth: 2,
                  borderColor: i < glassesConsumed ? '#3B82F6' : colors.border,
                  borderRadius: 4,
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {i < glassesConsumed && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '85%', backgroundColor: '#3B82F666', borderRadius: 2 }} />
                )}
                <Text style={{ fontSize: 14, zIndex: 1 }}>💧</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>Adicionar rapidamente:</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { ml: config.mlPerGlass,     label: `${config.mlPerGlass}ml`, icon: '🥤' },
              { ml: 500,                   label: '500ml',                  icon: '🍶' },
              { ml: config.mlPerGlass * 2, label: `${config.mlPerGlass * 2}ml`, icon: '💧' },
              { ml: 1000,                  label: '1L',                     icon: '🫙' },
            ].map((btn, i) => (
              <TouchableOpacity
                key={i}
                style={{
                  backgroundColor: '#3B82F622',
                  borderColor: '#3B82F6',
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  alignItems: 'center',
                  minWidth: 70,
                }}
                onPress={() => addWaterMl(btn.ml)}
              >
                <Text style={{ fontSize: 22 }}>{btn.icon}</Text>
                <Text style={{ color: '#3B82F6', fontWeight: '700', fontSize: 13, marginTop: 2 }}>+{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {waterIntake > 0 && (
            <TouchableOpacity
              onPress={removeLastDrink}
              style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.7 }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>↩ Remover último copo</Text>
            </TouchableOpacity>
          )}
        </Card>

        <Card theme={theme} style={{ marginBottom: 12 }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>📊 Progresso do Dia</Text>
          <View style={{ height: 14, backgroundColor: colors.bgCard2, borderRadius: 7, overflow: 'hidden', marginBottom: 6 }}>
            <View style={{
              width: `${percentage}%`,
              height: '100%',
              backgroundColor: waterIntake >= config.dailyGoalMl ? colors.green : '#3B82F6',
              borderRadius: 7,
            }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>0</Text>
            <Text style={{ color: '#3B82F6', fontSize: 11, fontWeight: '700' }}>
              {waterIntake}ml / {config.dailyGoalMl}ml
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{(config.dailyGoalMl / 1000).toFixed(1)}L</Text>
          </View>

          {waterIntake < config.dailyGoalMl && (
            <View style={{ marginTop: 10, backgroundColor: '#3B82F618', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>💡</Text>
              <Text style={{ color: '#3B82F6', fontSize: 12, flex: 1 }}>
                Faltam <Text style={{ fontWeight: '700' }}>{config.dailyGoalMl - waterIntake}ml</Text> ({Math.ceil((config.dailyGoalMl - waterIntake) / config.mlPerGlass)} copos) para atingir sua meta!
              </Text>
            </View>
          )}
          {waterIntake >= config.dailyGoalMl && (
            <View style={{ marginTop: 10, backgroundColor: colors.green + '22', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🎉</Text>
              <Text style={{ color: colors.green, fontSize: 12, fontWeight: '700' }}>
                Meta diária atingida! Excelente hidratação hoje!
              </Text>
            </View>
          )}
        </Card>

        <Card theme={theme}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {config.enabled ? '🔔 Lembretes ativos' : '🔕 Lembretes desativados'}
              </Text>
              {config.enabled && nextNotificationTime && (
                <Text style={{ color: colors.blue, fontSize: 12, marginTop: 4 }}>
                  ⏰ Próxima: {formatTimeDisplay(nextNotificationTime)}
                </Text>
              )}
              {config.enabled && (
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  A cada {config.intervalMinutes >= 60 ? `${config.intervalMinutes / 60}h` : `${config.intervalMinutes}min`}, das {config.startHour}h às {config.endHour}h
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowConfig(true)}
              style={{ backgroundColor: '#3B82F622', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#3B82F6' }}
            >
              <Text style={{ color: '#3B82F6', fontWeight: '600', fontSize: 12 }}>⚙️ Config</Text>
            </TouchableOpacity>
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: CONFIGURAÇÕES
// ════════════════════════════════════════════════════════════
function SettingsScreen({ user, profile, onBack, onUpdateProfile, onLogout, theme, onToggleTheme, onNavigate }) { 
  const [displayName, setDisplayName] = useState(profile?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [biometryEnabled, setBiometryEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [biometryAvailable, setBiometryAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('');
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  useEffect(() => {
    setupImmersiveMode();
    checkBiometryStatus();
    loadBiometryPreference();
  }, []);

  async function checkBiometryStatus() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometryAvailable(compatible && enrolled);
      if (compatible && enrolled) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBiometryType('digital');
        else if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBiometryType('facial');
      }
    } catch (e) { console.log(e); }
  }

  async function loadBiometryPreference() {
    try {
      const saved = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRY_ENABLED);
      setBiometryEnabled(saved === 'true');
    } catch (e) { console.log(e); }
  }

  async function saveBiometryPreference(value) {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.BIOMETRY_ENABLED, value ? 'true' : 'false');
      if (!value) await SecureStore.deleteItemAsync(STORAGE_KEYS.SAVED_PASSWORD);
    } catch (e) { console.log(e); }
  }

  async function handleChangePhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão negada', 'Precisamos de acesso à galeria.');
    Alert.alert('Alterar foto', 'Escolha uma opção:', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📷 Câmera', onPress: async () => {
        const camStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (camStatus.status !== 'granted') return Alert.alert('Permissão negada');
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1,1], quality: 0.7 });
        if (!result.canceled) uploadPhoto(result.assets[0].uri);
      }},
      { text: '🖼 Galeria', onPress: async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1,1], quality: 0.7 });
        if (!result.canceled) uploadPhoto(result.assets[0].uri);
      }},
    ]);
  }

  async function uploadPhoto(uri) {
    setPhotoLoading(true);
    try {
      const url = await uploadToCloudinary(uri);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      await updateProfile(auth.currentUser, { photoURL: url });
      onUpdateProfile({ ...profile, photoURL: url });
      Alert.alert('✅ Foto atualizada!');
    } catch (e) { Alert.alert('Erro', 'Não foi possível fazer upload da foto'); }
    finally { setPhotoLoading(false); }
  }

  async function handleUpdateName() {
    if (!displayName.trim()) return Alert.alert('Atenção', 'Digite um nome válido');
    setLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: displayName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { name: displayName.trim() });
      onUpdateProfile({ ...profile, name: displayName.trim() });
      Alert.alert('✅ Nome atualizado!');
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function handleChangePassword() {
    if (!currentPassword) return Alert.alert('Atenção', 'Digite sua senha atual');
    if (!newPassword) return Alert.alert('Atenção', 'Digite a nova senha');
    if (newPassword.length < 6) return Alert.alert('Atenção', 'Mínimo 6 caracteres');
    if (newPassword !== confirmPassword) return Alert.alert('Atenção', 'Senhas não coincidem');
    setLoading(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      if (biometryEnabled) await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_PASSWORD, newPassword);
      Alert.alert('✅ Senha alterada!');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) { Alert.alert('Erro', e.code === 'auth/wrong-password' ? 'Senha atual incorreta' : e.message); }
    finally { setLoading(false); }
  }

  async function handleToggleBiometry(value) {
    if (value && !biometryAvailable) return Alert.alert('Indisponível', 'Seu dispositivo não suporta biometria');
    if (value) {
      const savedEmail = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_EMAIL);
      const savedPassword = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_PASSWORD);
      if (!savedEmail || !savedPassword) return Alert.alert('Credenciais não encontradas', 'Faça login salvando as credenciais primeiro');
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme para ativar', cancelLabel: 'Cancelar' });
      if (!result.success) return Alert.alert('Erro', 'Não foi possível verificar sua biometria');
    }
    setBiometryEnabled(value);
    await saveBiometryPreference(value);
    Alert.alert(value ? '🔐 Biometria ativada' : '🔐 Biometria desativada', value ? `Use sua ${biometryType === 'digital' ? 'digital' : 'face'} para acessar` : 'Você precisará digitar sua senha');
  }

  function handleExitApp() {
    Alert.alert('Fechar app', 'Deseja fechar o aplicativo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Fechar', style: 'destructive', onPress: () => {
        if (Platform.OS === 'android') { BackHandler.exitApp(); }
        else { Alert.alert('iOS', 'No iOS, use o gesto do sistema para fechar o app.'); }
      }},
    ]);
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="Configurações" onBack={onBack} theme={theme} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.settingsContainer, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>

        <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>📸 FOTO DE PERFIL</Text>
        <Card theme={theme} style={styles.settingsCard}>
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <TouchableOpacity onPress={handleChangePhoto} disabled={photoLoading} style={{ position: 'relative' }}>
              {profile?.photoURL ? (
                <Image source={{ uri: profile.photoURL }} style={{ width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: colors.green }} />
              ) : (
                <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.green }}>
                  <FontAwesome5 name="user" size={36} color={colors.textSub} />
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.green, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
                {photoLoading ? <ActivityIndicator size="small" color="#000" /> : <Ionicons name="camera" size={14} color="#000" />}
              </View>
            </TouchableOpacity>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 8 }}>Toque para alterar a foto</Text>
          </View>
        </Card>

        <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>👤 NOME DE USUÁRIO</Text>
        <Card theme={theme} style={styles.settingsCard}>
          <Input label="Nome de usuário" value={displayName} onChangeText={setDisplayName} placeholder="Seu nome" theme={theme} />
          <Btn label="Salvar nome" onPress={handleUpdateName} loading={loading} variant="accent" theme={theme} style={{ marginTop: 8 }} />
        </Card>

        <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>🎨 APARÊNCIA</Text>
        <Card theme={theme} style={styles.settingsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text }}>🌙 Tema Escuro</Text>
            <Switch value={theme === 'dark'} onValueChange={() => onToggleTheme(theme === 'dark' ? 'light' : 'dark')} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.text} />
          </View>
        </Card>

        <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>🔒 ALTERAR SENHA</Text>
        <Card theme={theme} style={styles.settingsCard}>
          <Input label="Senha atual" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Senha atual" secureTextEntry theme={theme} />
          <Input label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 6 caracteres" secureTextEntry theme={theme} />
          <Input label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirme" secureTextEntry theme={theme} />
          <Btn label="Alterar senha" onPress={handleChangePassword} loading={loading} variant="primary" theme={theme} style={{ marginTop: 8 }} />
        </Card>

        {biometryAvailable && (
          <>
            <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>🔐 ACESSO RÁPIDO COM BIOMETRIA</Text>
            <Card theme={theme} style={styles.settingsCard}>
              <View style={styles.biometryRow}>
                <View style={styles.biometryInfo}>
                  <Text style={styles.biometryIcon}>{biometryType === 'digital' ? '👆' : '😀'}</Text>
                  <View>
                    <Text style={{ color: colors.text }}>Acesso com {biometryType === 'digital' ? 'Digital' : 'Reconhecimento Facial'}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>Use sua {biometryType === 'digital' ? 'digital' : 'face'} para entrar rapidamente</Text>
                  </View>
                </View>
                <Switch value={biometryEnabled} onValueChange={handleToggleBiometry} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.text} />
              </View>
            </Card>
          </>
        )}

                <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>💎 ASSINATURA</Text>
        <Card theme={theme} style={styles.settingsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
            <View>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Seu Plano Atual</Text>
              <Text style={{ color: colors.gold, fontSize: 13, fontWeight: 'bold', marginTop: 2 }}>
                {profile?.subscriptionPlan === 'pro' ? '🚀 PRO PLUS' : profile?.subscriptionPlan === 'premium' ? '💎 PREMIUM' : '🌱 GRATUITO'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => onNavigate('planos')}
              style={{ backgroundColor: colors.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 }}
            >
              <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>Gerenciar</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Text style={[styles.settingsSectionTitle, { color: colors.green }]}>⚙️ CONTA</Text>
        <Card theme={theme} style={styles.settingsCard}>
          <TouchableOpacity style={[styles.logoutButton, { borderBottomWidth: 1, borderColor: colors.border, marginBottom: 8, paddingBottom: 16 }]} onPress={onLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={[styles.logoutText, { color: colors.red }]}>Sair da conta</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleExitApp}>
            <Text style={styles.logoutIcon}>❌</Text>
            <Text style={[styles.logoutText, { color: colors.textMuted }]}>Fechar aplicativo</Text>
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// COMPONENTE: MEU PROGRESSO
// ════════════════════════════════════════════════════════════
function MeuProgressoCard({ profile, onNavigate, theme }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const plan = profile?.weightPlan;
  const fastingDays = profile?.fastingDays || 0;
  const activities = profile?.activities || [];
  const workouts = profile?.gamification?.workoutCount || 0;

  const totalCaloriesActivity = activities.reduce((s, a) => s + (a.calories || 0), 0);
  const totalDistKm = activities.reduce((s, a) => s + (a.distance || 0), 0);
  const actByType = { walking: 0, running: 0, biking: 0 };
  activities.forEach(a => { if (actByType[a.type] !== undefined) actByType[a.type]++; });

  const weeklyLoss = plan ? parseFloat(plan.weeklyLoss) || 0 : 0;
  const estimatedLossKg = plan ? Math.min(((fastingDays / 7) * weeklyLoss + totalCaloriesActivity / 7700), plan.goal || 999) : 0;
  const goalKg = plan?.goal || 0;
  const progressPct = goalKg > 0 ? Math.min((estimatedLossKg / goalKg) * 100, 100) : 0;

  const fastingGoalDays = plan ? (plan.totalWeeks || 0) * 7 : 0;
  const fastingPct = fastingGoalDays > 0 ? Math.min((fastingDays / fastingGoalDays) * 100, 100) : 0;

  const actGoal = plan ? Math.max((plan.totalWeeks || 1) * 3, 1) : 1;
  const actPct = Math.min((activities.length / actGoal) * 100, 100);

  function ProgressBar({ pct, color, height: h = 8 }) {
    return (
      <View style={{ height: h, backgroundColor: colors.bgCard2, borderRadius: h, overflow: 'hidden', marginTop: 6 }}>
        <View style={{ width: `${Math.max(pct, 2)}%`, height: h, backgroundColor: color, borderRadius: h }} />
      </View>
    );
  }

  function MiniStat({ icon, label, value, color = colors.green }) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 16, marginRight: 8 }}>{icon}</Text>
        <Text style={{ color: colors.textSub, fontSize: 12, flex: 1 }}>{label}</Text>
        <Text style={{ color, fontWeight: '700', fontSize: 13 }}>{value}</Text>
      </View>
    );
  }

  if (!plan) {
    return null;
  }

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 4 }}>
      <Card theme={theme} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>📊</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Meu Progresso</Text>
            {plan && <Text style={{ color: colors.textMuted, fontSize: 11 }}>Atualizado em {new Date(plan.updatedAt).toLocaleDateString('pt-BR')}</Text>}
          </View>
          {plan && (
            <View style={{ backgroundColor: colors.greenDark + '44', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: colors.green + '44' }}>
              <Text style={{ color: colors.green, fontWeight: '800', fontSize: 16 }}>{plan.bmi}</Text>
              <Text style={{ color: colors.textSub, fontSize: 10, textAlign: 'center' }}>IMC</Text>
            </View>
          )}
        </View>

        {plan && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>🎯 Meta de Emagrecimento</Text>
              <Text style={{ color: colors.green, fontWeight: '700', fontSize: 13 }}>{progressPct.toFixed(0)}%</Text>
            </View>
            <ProgressBar pct={progressPct} color={colors.green} />
            <View style={{ marginTop: 10 }}>
              <MiniStat icon="⚖️" label="Peso atual" value={`${plan.weight} kg`} />
              <MiniStat icon="📉" label="Estimativa perdida" value={`≈ ${estimatedLossKg.toFixed(2)} kg`} />
              <MiniStat icon="🔥" label="Meta calórica diária" value={`${plan.targetCals} kcal`} color={colors.accent} />
            </View>
          </View>
        )}

        {plan && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13, marginBottom: 10 }}>🥑 Macros</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: 'Gordura', value: `${plan.fat}g`, color: colors.accent },
                { label: 'Proteína', value: `${plan.protein}g`, color: colors.green },
                { label: 'Carbs', value: `${plan.carbs}g`, color: colors.red },
              ].map(m => (
                <View key={m.label} style={{ flex: 1, backgroundColor: m.color + '18', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: m.color + '33' }}>
                  <Text style={{ color: m.color, fontWeight: '800', fontSize: 15 }}>{m.value}</Text>
                  <Text style={{ color: colors.textSub, fontSize: 10, marginTop: 2 }}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>⏱️ Jejum Intermitente</Text>
            <Text style={{ color: colors.purple, fontWeight: '700', fontSize: 13 }}>{fastingPct.toFixed(0)}%</Text>
          </View>
          <ProgressBar pct={fastingPct} color={colors.purple} />
          <View style={{ marginTop: 10 }}>
            <MiniStat icon="✅" label="Jejuns concluídos" value={`${fastingDays} dias`} color={colors.purple} />
            {plan && <MiniStat icon="🎯" label="Jejum recomendado" value={plan.recFasting} />}
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>🏃 Atividades Físicas</Text>
            <Text style={{ color: colors.blue, fontWeight: '700', fontSize: 13 }}>{actPct.toFixed(0)}%</Text>
          </View>
          <ProgressBar pct={actPct} color={colors.blue} />
          <View style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              {[
                { icon: '🚶', label: 'Caminhada', count: actByType.walking, color: colors.green },
                { icon: '🏃', label: 'Corrida', count: actByType.running, color: colors.accent },
                { icon: '🚴', label: 'Bike', count: actByType.biking, color: colors.blue },
              ].map(a => (
                <View key={a.label} style={{ flex: 1, alignItems: 'center', backgroundColor: a.color + '18', borderRadius: 10, marginHorizontal: 3, paddingVertical: 8, borderWidth: 1, borderColor: a.color + '33' }}>
                  <Text style={{ fontSize: 20 }}>{a.icon}</Text>
                  <Text style={{ color: a.color, fontWeight: '800', fontSize: 16 }}>{a.count}</Text>
                  <Text style={{ color: colors.textSub, fontSize: 10 }}>{a.label}</Text>
                </View>
              ))}
            </View>
            <MiniStat icon="🔥" label="Total kcal queimadas" value={`${totalCaloriesActivity} kcal`} color={colors.accent} />
            <MiniStat icon="📏" label="Distância total" value={`${totalDistKm.toFixed(2)} km`} color={colors.blue} />
          </View>
        </View>

        <View style={{ marginBottom: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>💪 Treinos em Casa</Text>
            <Text style={{ color: '#F97316', fontWeight: '700', fontSize: 13 }}>{workouts}</Text>
          </View>
          <ProgressBar pct={Math.min((workouts / Math.max((plan?.totalWeeks || 4) * 3, 1)) * 100, 100)} color="#F97316" />
          <MiniStat icon="🏋️" label="Treinos concluídos" value={`${workouts}`} color="#F97316" />
        </View>

        <TouchableOpacity onPress={() => onNavigate('calculator')} style={{ marginTop: 14, backgroundColor: colors.greenDark + '44', borderRadius: 12, paddingVertical: 11, alignItems: 'center', borderWidth: 1, borderColor: colors.green + '44' }}>
          <Text style={{ color: colors.green, fontWeight: '700', fontSize: 13 }}>🔄 Atualizar Meu Plano</Text>
        </TouchableOpacity>
      </Card>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: HOME (PRINCIPAL)
// ════════════════════════════════════════════════════════════
// TELA: HOME (PRINCIPAL)
// ════════════════════════════════════════════════════════════
function HomeScreen({ user, profile, onNavigate, onLogout, onUpdatePhoto, theme, onToggleTheme }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const [activeTab, setActiveTab] = useState('feed');
  const [waterTodayMl, setWaterTodayMl] = useState(0);
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [dailySteps, setDailySteps] = useState(profile?.steps || 0);
  const [dailyCalories, setDailyCalories] = useState(profile?.caloriesBurned || 0);

  useEffect(() => {
    const checkAndResetDaily = async () => {
      if (!user) return;
      const today = new Date().toISOString().split('T')[0];
      const lastReset = await AsyncStorage.getItem(`${STORAGE_KEYS.LAST_RESET_DATE}_${user.uid}`);
      
      if (lastReset !== today) {
        await resetDailyDataIfNeeded(user.uid);
        setDailySteps(0);
        setDailyCalories(0);
        setWaterTodayMl(0);
        await AsyncStorage.setItem(`${STORAGE_KEYS.LAST_RESET_DATE}_${user.uid}`, today);
      } else {
        setDailySteps(profile?.steps || 0);
        setDailyCalories(profile?.caloriesBurned || 0);
      }
    };
    
    checkAndResetDaily();
    const interval = setInterval(checkAndResetDaily, 60000);
    return () => clearInterval(interval);
  }, [user, profile]);

  useEffect(() => {
    if (activeTab === 'feed') loadWaterToday();
  }, [activeTab]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        loadWaterToday();
        refreshProfileData();
      }
    });
    return () => sub?.remove();
  }, [user]);

  const refreshProfileData = async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setDailySteps(data.steps || 0);
        setDailyCalories(data.caloriesBurned || 0);
      }
    } catch (e) {}
  };

  const loadWaterToday = async () => {
    if (!user) return;
    try {
      const savedConfig = await AsyncStorage.getItem('water_config_v1');
      if (savedConfig) {
        const cfg = JSON.parse(savedConfig);
        if (cfg.dailyGoalMl) setWaterGoalMl(cfg.dailyGoalMl);
      }
      const today = new Date().toISOString().split('T')[0];
      const ref = collection(db, 'users', user.uid, 'waterEntries');
      const q = query(ref, where('date', '==', today));
      const snap = await getDocs(q);
      let total = 0;
      snap.forEach(d => { total += (d.data().ml || (d.data().amount || 0) * 250); });
      setWaterTodayMl(total);
    } catch (_) {}
  };

    useEffect(() => {
    loadWaterToday();
  }, [user]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const points = calculateTotalPoints(profile?.gamification);
  const badgeLevel = getBadgeLevel(points);
  const userRank = getUserRank(points);
  const plan = profile?.weightPlan;

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão negada');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled) {
      try {
        const url = await uploadToCloudinary(result.assets[0].uri);
        await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
        await updateProfile(user, { photoURL: url });
        onUpdatePhoto(url);
      } catch (e) { Alert.alert('Erro ao fazer upload', e.message); }
    }
  }

       const menuItems = [
    { id: 'fasting',    icon: '⏱️', label: 'Jejum\nIntermitente',          color: colors.green   },
    { id: 'calculator', icon: '📊', label: 'Calculadora\nEmagrecimento',    color: colors.accent  },
    { id: 'planos',     icon: '💳', label: 'Meu Plano\nKETO+',             color: colors.gold    }, // ADICIONADO
    { id: 'workout',    icon: '💪', label: 'Treino\nem Casa',               color: colors.blue    },
    { id: 'activities', icon: '🏃', label: 'Atividades\nFísicas',           color: colors.purple  },
    { id: 'wvideos',    icon: '🎥', label: 'Vídeos de\nTreino',             color: colors.red     },
    { id: 'rvideos',    icon: '🥗', label: 'Receitas\nLow Carb',            color: '#10B981'      },
    { id: 'foodDiary',  icon: '📝', label: 'Diário\nAlimentar',             color: colors.green   },
    { id: 'water',      icon: '💧', label: 'Hidratação',                    color: '#3B82F6'      },
    { id: 'coach',      icon: '🤖', label: 'Coach IA',                      color: colors.purple  },
    { id: 'challenges', icon: '🏅', label: 'Desafios',                      color: colors.gold    },
  ];

  const FeedTab = useCallback(() => (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 90 }} showsVerticalScrollIndicator={false}>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 12, paddingLeft: 12 }}>
        <TouchableOpacity onPress={pickPhoto} style={{ alignItems: 'center', marginRight: 16 }}>
          <View style={{ position: 'relative' }}>
            {profile?.photoURL
              ? <Image source={{ uri: profile.photoURL }} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: colors.green }} />
              : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.green }}><Text style={{ fontSize: 28 }}>👤</Text></View>}
            <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.green, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg }}>
              <Text style={{ color: '#000', fontSize: 12, fontWeight: '900' }}>+</Text>
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4, maxWidth: 64, textAlign: 'center' }}>Minha foto</Text>
        </TouchableOpacity>

        {[
          { id: 'fasting',    icon: '⏱️', label: 'Jejum',      color: colors.green  },
          { id: 'workout',    icon: '💪', label: 'Treino',     color: colors.blue   },
          { id: 'water',      icon: '💧', label: 'Água',       color: '#3B82F6'     },
          { id: 'foodDiary',  icon: '📝', label: 'Diário',     color: colors.accent },
          { id: 'coach',      icon: '🤖', label: 'Coach IA',   color: colors.purple },
          { id: 'challenges', icon: '🏅', label: 'Desafios',   color: colors.gold   },
        ].map(item => (
          <TouchableOpacity key={item.id} onPress={() => onNavigate(item.id)} style={{ alignItems: 'center', marginRight: 16 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: item.color + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: item.color }}>
              <Text style={{ fontSize: 26 }}>{item.icon}</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 4, maxWidth: 64, textAlign: 'center' }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={{ height: 8, backgroundColor: theme === 'dark' ? '#0D130D' : '#E5E7EB' }} />

      <View style={{ backgroundColor: colors.bgCard, padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <TouchableOpacity onPress={pickPhoto}>
            {profile?.photoURL
              ? <Image source={{ uri: profile.photoURL }} style={{ width: 42, height: 42, borderRadius: 21, marginRight: 12 }} />
              : <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Text style={{ fontSize: 20 }}>👤</Text></View>}
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, backgroundColor: colors.bgCard2, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: colors.border }} onPress={() => setActiveTab('social')}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{greeting()}, {profile?.name?.split(' ')[0] || 'atleta'} 👋 O que está rolando?</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 }}>
          <TouchableOpacity onPress={() => onNavigate('wvideos')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18 }}>🎥</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Vídeo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate('rvideos')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18 }}>🥗</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Receita</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate('activities')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 18 }}>🏃</Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>Atividade</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 8, backgroundColor: theme === 'dark' ? '#0D130D' : '#E5E7EB' }} />

      <View style={{ backgroundColor: colors.bgCard, padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>📋 Resumo do Dia</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>

          <TouchableOpacity onPress={() => onNavigate('activities')} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.green }}>
              {dailySteps.toLocaleString('pt-BR')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>👣 Passos</Text>
            <View style={{ width: '80%', height: 3, backgroundColor: colors.bgCard2, borderRadius: 2, marginTop: 4 }}>
              <View style={{ width: `${Math.min((dailySteps / 10000) * 100, 100)}%`, height: 3, backgroundColor: colors.green, borderRadius: 2 }} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 2 }}>meta: 10.000</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate('activities')} style={{ alignItems: 'center', flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colors.accent }}>
              {dailyCalories}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>🔥 Kcal</Text>
            <View style={{ width: '80%', height: 3, backgroundColor: colors.bgCard2, borderRadius: 2, marginTop: 4 }}>
              <View style={{ width: `${Math.min((dailyCalories / (plan?.targetCals || 2000)) * 100, 100)}%`, height: 3, backgroundColor: colors.accent, borderRadius: 2 }} />
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 9, marginTop: 2 }}>queimadas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('water')}
            style={{
              alignItems: 'center', flex: 1,
              backgroundColor: '#3B82F611',
              borderRadius: 12, paddingVertical: 8,
              borderWidth: 1, borderColor: '#3B82F633',
            }}
          >
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#3B82F6' }}>
              {(waterTodayMl / 1000).toFixed(1)}L
            </Text>
            <Text style={{ color: '#3B82F6', fontSize: 10, marginTop: 2, fontWeight: '600' }}>💧 Hidratação</Text>
            <View style={{ width: '80%', height: 3, backgroundColor: '#3B82F622', borderRadius: 2, marginTop: 4 }}>
              <View style={{ width: `${Math.min((waterTodayMl / waterGoalMl) * 100, 100)}%`, height: 3, backgroundColor: '#3B82F6', borderRadius: 2 }} />
            </View>
            <Text style={{ color: '#3B82F6', fontSize: 9, marginTop: 2, opacity: 0.8 }}>
              {Math.floor(waterTodayMl / 250)}/{Math.ceil(waterGoalMl / 250)} copos
            </Text>
          </TouchableOpacity>

        </View>

        <View style={{ flexDirection: 'row', marginTop: 14, gap: 8 }}>
          <TouchableOpacity
            onPress={() => onNavigate('fasting')}
            style={{ flex: 1, backgroundColor: colors.purple + '18', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.purple + '33' }}
          >
            <Text style={{ color: colors.purple, fontWeight: '800', fontSize: 16 }}>{profile?.fastingDays || 0}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>⏱️ Jejuns feitos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('workout')}
            style={{ flex: 1, backgroundColor: '#F9731618', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#F9731633' }}
          >
            <Text style={{ color: '#F97316', fontWeight: '800', fontSize: 16 }}>{profile?.gamification?.workoutCount || 0}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>💪 Treinos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onNavigate('foodDiary')}
            style={{ flex: 1, backgroundColor: colors.green + '18', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.green + '33' }}
          >
            <Text style={{ color: colors.green, fontWeight: '800', fontSize: 16 }}>
              {plan?.targetCals || '--'}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, marginTop: 2 }}>🥗 Meta kcal</Text>
          </TouchableOpacity>
        </View>
      </View>

            <View style={{ height: 8, backgroundColor: theme === 'dark' ? '#0D130D' : '#E5E7EB' }} />

      {/* BOTÃO DE UPGRADE - SÓ APARECE PARA USUÁRIOS GRATUITOS */}
      {profile?.subscriptionPlan === 'free' && (
        <TouchableOpacity 
          onPress={() => onNavigate('planos')} 
          style={{ 
            backgroundColor: colors.accent, 
            borderRadius: 16, 
            paddingVertical: 16, 
            alignItems: 'center', 
            marginHorizontal: 16, 
            marginBottom: 16,
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 10
          }}
        >
          <Text style={{ fontSize: 22 }}>🚀</Text>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Fazer Upgrade para Premium</Text>
          <Text style={{ fontSize: 22 }}>💎</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 8, backgroundColor: theme === 'dark' ? '#0D130D' : '#E5E7EB' }} />

      <FastingWidget onNavigate={onNavigate} theme={theme} />

      {plan && (
        <View style={{ backgroundColor: colors.bgCard, padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>📊 Meu Plano</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {[
              { val: plan.bmr,        label: 'TMB',       bg: colors.bgCard2,         col: colors.text  },
              { val: plan.tdee,       label: 'TDEE',      bg: colors.bgCard2,         col: colors.text  },
              { val: plan.targetCals, label: 'META kcal', bg: colors.greenDark+'44',  col: colors.green },
            ].map((p, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: p.bg, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: p.col }}>{p.val}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{p.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { val: `${plan.fat}g`,     label: 'Gordura',  bg: '#F59E0B22', col: '#F59E0B' },
              { val: `${plan.protein}g`, label: 'Proteína', bg: '#4ADE8022', col: colors.green },
              { val: `${plan.carbs}g`,   label: 'Carbs',    bg: '#EF444422', col: colors.red },
            ].map((m, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: m.bg, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', color: m.col }}>{m.val}</Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>{m.label}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity onPress={() => onNavigate('calculator')} style={{ flex: 1, backgroundColor: colors.greenDark+'44', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.green+'44' }}>
              <Text style={{ color: colors.green, fontWeight: '700', fontSize: 13 }}>🔄 Atualizar Plano</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={async () => {
                Alert.alert('Limpar Plano', 'Deseja realmente remover seu plano atual?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Limpar', style: 'destructive', onPress: async () => {
                    try {
                      await updateDoc(doc(db, 'users', user.uid), { weightPlan: null });
                      refreshProfileData();
                      Alert.alert('Sucesso', 'Plano removido com sucesso!');
                    } catch (e) { Alert.alert('Erro', 'Não foi possível limpar o plano.'); }
                  }}
                ]);
              }}
              style={{ flex: 1, backgroundColor: colors.red + '22', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: colors.red + '44' }}
            >
              <Text style={{ color: colors.red, fontWeight: '700', fontSize: 13 }}>🗑️ Limpar Plano</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!plan && (
        <View style={{ backgroundColor: colors.bgCard, padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
          <TouchableOpacity 
            onPress={() => onNavigate('calculator')} 
            style={{ backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
          >
            <Text style={{ fontSize: 18 }}>🚀</Text>
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>Configurar Plano</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 8, backgroundColor: theme === 'dark' ? '#0D130D' : '#E5E7EB' }} />

      <MeuProgressoCard profile={profile} onNavigate={onNavigate} theme={theme} />

      <View style={{ height: 8, backgroundColor: theme === 'dark' ? '#0D130D' : '#E5E7EB' }} />

      <View style={{ backgroundColor: colors.bgCard, padding: 16 }}>
        <Text style={{ color: colors.accent, fontWeight: '700', marginBottom: 6 }}>💡 Dica do Dia</Text>
        <Text style={{ color: colors.textSub, lineHeight: 20, fontSize: 13 }}>A dieta keto reduz carboidratos e aumenta gorduras saudáveis. O corpo entra em cetose e usa gordura como combustível, acelerando o emagrecimento.</Text>
      </View>
    </ScrollView>
  ), [profile, colors, waterTodayMl, waterGoalMl, theme, plan, dailySteps, dailyCalories]);

  const MenuTab = () => (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 90 }}>
      <View style={{ backgroundColor: colors.bgCard, padding: 16, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>🌿 Ferramentas KETO+</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>Tudo que você precisa para sua jornada</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 8, gap: 8 }}>
        {menuItems.map(item => (
          <TouchableOpacity
            key={item.id}
            style={{ width: (width - 48) / 3, aspectRatio: 0.95, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: item.color + '44', padding: 8 }}
            onPress={() => onNavigate(item.id)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 28, marginBottom: 6 }}>{item.icon}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14, color: item.color }}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  const HeaderBar = () => (
    <View style={{
      backgroundColor: colors.bgCard,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderColor: colors.border,
      elevation: 6,
    }}>
      <Text style={{ fontSize: 26, fontWeight: '900', color: colors.green, letterSpacing: 1 }}>🥑 KETO+</Text>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => onNavigate('water')}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#3B82F622', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3B82F644' }}
        >
          <Text style={{ fontSize: 18 }}>💧</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onNavigate('coach')}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.purple + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.purple + '44' }}
        >
          <Text style={{ fontSize: 18 }}>🤖</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onNavigate('challenges')}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.gold + '22', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold + '44' }}
        >
          <Text style={{ fontSize: 18 }}>🔔</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('settings')}
          style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
        >
          <Text style={{ fontSize: 18 }}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const BottomTabBar = () => (
    <View style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.bgCard,
      flexDirection: 'row',
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingBottom: Platform.OS === 'ios' ? 20 : 6,
      paddingTop: 6,
      elevation: 12,
    }}>
      {[
        { id: 'feed', label: 'Início', icon: '🏠' },
        { id: 'social', label: 'Feed', icon: '👥' },
        { id: 'actions', label: 'Menu', icon: '⊞' },
        { id: 'ranking', label: 'Ranking', icon: '🏆' },
        { id: 'settings', label: 'Perfil', icon: '👤' },
      ].map(tab => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4, position: 'relative' }}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            {isActive && (
              <View style={{ position: 'absolute', top: -6, width: 28, height: 3, borderRadius: 2, backgroundColor: colors.green }} />
            )}
            {tab.id === 'actions' ? (
              <View style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: isActive ? colors.green : colors.bgCard2,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: isActive ? colors.green : colors.border,
                marginBottom: 2,
              }}>
                <Text style={{ fontSize: 20 }}>≡</Text>
              </View>
            ) : (
              <Text style={{ fontSize: 22 }}>{tab.icon}</Text>
            )}
            <Text style={{
              fontSize: 10,
              marginTop: tab.id === 'actions' ? 0 : 3,
              color: isActive ? colors.green : colors.textMuted,
              fontWeight: isActive ? '700' : '400',
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderActiveTab = () => {
    if (activeTab === 'feed') return <FeedTab />;
    if (activeTab === 'actions') return <MenuTab />;
    if (activeTab === 'social') return <SocialFeedScreen onBack={() => setActiveTab('feed')} user={user} profile={profile} theme={theme} />;
    if (activeTab === 'ranking') return <RankingScreen onBack={() => setActiveTab('feed')} currentUser={user} profile={profile} theme={theme} />;
    if (activeTab === 'settings') return <SettingsScreen user={user} profile={profile} onBack={() => setActiveTab('feed')} onUpdateProfile={() => {}} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme || (() => {})} />;
    return <FeedTab />;
  };

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent backgroundColor="transparent" />
      <HeaderBar />
      <View style={{ flex: 1 }}>
        {renderActiveTab()}
      </View>
      <BottomTabBar />
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: JEJUM INTERMITENTE
// ════════════════════════════════════════════════════════════
function FastingScreen({ onBack, theme }) {
  const { selectedType, changeType, isRunning, elapsed, start, resume, stop, reset } = React.useContext(FastingContext);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const target = selectedType.fast * 3600;
  const pct = target > 0 ? Math.min((elapsed / target) * 100, 100).toFixed(1) : 0;
  const remaining = Math.max(target - elapsed, 0);

  useEffect(() => {
    setupImmersiveMode();
    Animated.timing(progressAnim, { toValue: target > 0 ? Math.min(elapsed / target, 1) : 0, duration: 500, useNativeDriver: false }).start();
  }, [elapsed, target]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const fmt = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="Jejum Intermitente" onBack={onBack} theme={theme} />
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textSub }]}>Tipo de Jejum</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {FASTING_TYPES.map(ft => (
            <TouchableOpacity key={ft.id} style={[styles.fastTypeChip, selectedType.id === ft.id && styles.fastTypeChipActive, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => { if (!isRunning) changeType(ft); }}>
              <Text style={[styles.fastTypeChipText, selectedType.id === ft.id && { color: '#000' }, { color: selectedType.id === ft.id ? '#000' : colors.textSub }]}>{ft.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Card theme={theme} style={{ marginBottom: 16 }}><Text style={{ color: colors.textSub }}>{selectedType.desc}</Text></Card>
        <Card theme={theme} style={styles.timerCard}>
          <Text style={[styles.timerLabel, { color: colors.textMuted }]}>{isRunning ? '🔥 Em jejum' : elapsed > 0 ? '⏸ Pausado' : '😴 Aguardando'}</Text>
          <Text style={[styles.timerDisplay, { color: colors.green }]}>{fmt(elapsed)}</Text>
          <Text style={[styles.timerSub, { color: colors.textMuted }]}>{pct}% da meta ({fmt(target)})</Text>
          <View style={[styles.progressBar, { backgroundColor: colors.bgCard2 }]}><Animated.View style={[styles.progressFill, { width: progressWidth, backgroundColor: colors.green }]} /></View>
          {isRunning && <Text style={[styles.timerRemaining, { color: colors.accent }]}>Faltam {fmt(remaining)}</Text>}
        </Card>
        <View style={styles.timerControls}>
          {!isRunning ? (
            <Btn label={elapsed > 0 ? '▶ Continuar' : '▶ Iniciar Jejum'} onPress={elapsed > 0 ? resume : start} style={{ flex: 1, marginRight: 8 }} theme={theme} />
          ) : (
            <Btn label="⏸ Pausar" onPress={stop} variant="accent" style={{ flex: 1, marginRight: 8 }} theme={theme} />
          )}
          <Btn label="↺ Reset" onPress={reset} variant="secondary" style={{ flex: 1 }} theme={theme} />
        </View>
        <Card theme={theme} style={{ marginTop: 16 }}>
          <Text style={[styles.infoTitle, { color: colors.greenLight }]}>📋 Como funciona o {selectedType.label}?</Text>
          <Text style={[styles.infoText, { color: colors.textSub }]}>• Período de jejum: {selectedType.fast}h{'\n'}• Janela alimentar: {selectedType.eat}h{'\n'}• {selectedType.desc}{'\n\n'}Durante o jejum, beba bastante água, chá e café (sem açúcar).</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: CALCULADORA DE EMAGRECIMENTO
// ════════════════════════════════════════════════════════════
function CalculatorScreen({ onBack, user, onPlanSaved, theme }) {
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [goal, setGoal] = useState('');
  const [gender, setGender] = useState('M');
  const [activity, setActivity] = useState('sedentary');
  const [dietType, setDietType] = useState('keto');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  useEffect(() => { setupImmersiveMode(); }, []);

  const activityLevels = [
    { id: 'sedentary', label: 'Sedentário', factor: 1.2 },
    { id: 'light', label: 'Levemente ativo', factor: 1.375 },
    { id: 'moderate', label: 'Moderado', factor: 1.55 },
    { id: 'active', label: 'Muito ativo', factor: 1.725 },
  ];

  function calculate() {
    const a = parseInt(age), w = parseFloat(weight), h = parseFloat(height), g = parseFloat(goal);
    if (!a || !w || !h || !g) return Alert.alert('Atenção', 'Preencha todos os campos.');
    if (g > w * 0.5) return Alert.alert('Atenção', 'Meta de perda muito alta.');
    
    const bmr = gender === 'M'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const actFactor = activityLevels.find(x => x.id === activity)?.factor || 1.2;
    const tdee = bmr * actFactor;
    const deficit = 500;
    const targetCals = Math.max(tdee - deficit, 1200);
    const weeklyLoss = (deficit * 7) / 7700;
    const totalWeeks = Math.ceil(g / weeklyLoss);
    
    let fat, protein, carbs;
    if (dietType === 'keto') {
      fat = Math.round((targetCals * 0.70) / 9);
      protein = Math.round((targetCals * 0.25) / 4);
      carbs = Math.round((targetCals * 0.05) / 4);
    } else {
      fat = Math.round((targetCals * 0.25) / 9);
      protein = Math.round((targetCals * 0.30) / 4);
      carbs = Math.round((targetCals * 0.45) / 4);
    }
    
    const recFasting = g <= 5 ? '16:8' : g <= 10 ? '18:6' : '20:4';
    
    setResult({
      bmr: Math.round(bmr), tdee: Math.round(tdee), targetCals: Math.round(targetCals),
      fat, protein, carbs, weeklyLoss: weeklyLoss.toFixed(2), totalWeeks, recFasting,
      bmi: (w / ((h / 100) ** 2)).toFixed(1),
      dietType,
    });
  }

  async function savePlan() {
    if (!result || !user) return;
    setSaving(true);
    try {
      const planData = { 
        ...result, 
        updatedAt: new Date().toISOString(),
        weight: parseFloat(weight),
        goal: parseFloat(goal),
        height: parseFloat(height),
        age: parseInt(age),
        gender,
        activity,
        dietType,
      };
      await updateDoc(doc(db, 'users', user.uid), { weightPlan: planData });
      await updateGamification(user.uid, 'weightPlan');
      onPlanSaved(planData);
      Alert.alert('✅ Salvo!', 'Seu plano foi salvo! +40 pontos!');
    } catch (e) { Alert.alert('Erro ao salvar', e.message); }
    finally { setSaving(false); }
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="Calculadora" onBack={onBack} theme={theme} />
      <ScrollView style={{ backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textSub }]}>Seus Dados</Text>
        
        <View style={{ flexDirection: 'row', marginBottom: 14 }}>
          {['M', 'F'].map(g => (
            <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderBtnActive, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => setGender(g)}>
              <Text style={[styles.genderBtnText, gender === g && { color: '#000' }, { color: gender === g ? '#000' : colors.textSub }]}>{g === 'M' ? '♂ Masculino' : '♀ Feminino'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input label="Idade" value={age} onChangeText={setAge} placeholder="Ex: 30" keyboardType="numeric" theme={theme} />
        <Input label="Peso atual (kg)" value={weight} onChangeText={setWeight} placeholder="Ex: 80" keyboardType="decimal-pad" theme={theme} />
        <Input label="Altura (cm)" value={height} onChangeText={setHeight} placeholder="Ex: 170" keyboardType="numeric" theme={theme} />
        <Input label="Quanto deseja perder (kg)" value={goal} onChangeText={setGoal} placeholder="Ex: 10" keyboardType="decimal-pad" theme={theme} />

        <Text style={[styles.inputLabel, { color: colors.textSub }]}>Tipo de Dieta</Text>
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
          <TouchableOpacity 
            style={[styles.dietTypeBtn, dietType === 'keto' && styles.dietTypeActive, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => setDietType('keto')}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🥑</Text>
            <Text style={[styles.dietTypeText, dietType === 'keto' && { color: colors.green, fontWeight: '700' }]}>Cetogênica</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center' }}>Low carb, alta gordura</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.dietTypeBtn, dietType === 'traditional' && styles.dietTypeActive, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => setDietType('traditional')}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🍽️</Text>
            <Text style={[styles.dietTypeText, dietType === 'traditional' && { color: colors.green, fontWeight: '700' }]}>Tradicional</Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center' }}>Equilibrada em macros</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.inputLabel, { color: colors.textSub }]}>Nível de atividade</Text>
        <View style={{ marginBottom: 14 }}>
          {activityLevels.map(al => (
            <TouchableOpacity key={al.id} style={[styles.activityBtn, activity === al.id && styles.activityBtnActive, { backgroundColor: colors.bgCard, borderColor: colors.border }]} onPress={() => setActivity(al.id)}>
              <Text style={[styles.activityBtnText, activity === al.id && { color: '#000' }, { color: activity === al.id ? '#000' : colors.textSub }]}>{al.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Btn label="📊 Calcular Plano" onPress={calculate} theme={theme} />

        {result && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { color: colors.textSub }]}>Seu Plano Personalizado</Text>

            <Card theme={theme} style={styles.resultCard}>
              <Text style={[styles.resultTitle, { color: colors.accent }]}>📏 Índice de Massa Corporal</Text>
              <Text style={[styles.resultBig, { color: colors.green }]}>{result.bmi}</Text>
              <Text style={[styles.resultSub, { color: colors.textMuted }]}>{result.bmi < 18.5 ? 'Abaixo do peso' : result.bmi < 25 ? 'Peso normal' : result.bmi < 30 ? 'Sobrepeso' : 'Obesidade'}</Text>
            </Card>

            <Card theme={theme} style={styles.resultCard}>
              <Text style={[styles.resultTitle, { color: colors.accent }]}>🔥 Calorias</Text>
              <View style={styles.resultRow}>
                <View style={[styles.resultItem, { backgroundColor: colors.bgCard2 }]}><Text style={[styles.resultNum, { color: colors.text }]}>{result.bmr}</Text><Text style={[styles.resultItemLabel, { color: colors.textMuted }]}>TMB</Text></View>
                <View style={[styles.resultItem, { backgroundColor: colors.bgCard2 }]}><Text style={[styles.resultNum, { color: colors.text }]}>{result.tdee}</Text><Text style={[styles.resultItemLabel, { color: colors.textMuted }]}>TDEE</Text></View>
                <View style={[styles.resultItem, { backgroundColor: colors.greenDark + '44' }]}><Text style={[styles.resultNum, { color: colors.green }]}>{result.targetCals}</Text><Text style={[styles.resultItemLabel, { color: colors.textMuted }]}>META</Text></View>
              </View>
            </Card>

            <Card theme={theme} style={styles.resultCard}>
              <Text style={[styles.resultTitle, { color: colors.accent }]}>🥑 Macros {result.dietType === 'keto' ? 'Cetogênicos' : 'Tradicionais'}</Text>
              <View style={styles.resultRow}>
                <View style={[styles.resultItem, { backgroundColor: colors.bgCard2 }]}><Text style={[styles.resultNum, { color: '#F59E0B' }]}>{result.fat}g</Text><Text style={[styles.resultItemLabel, { color: colors.textMuted }]}>Gordura</Text></View>
                <View style={[styles.resultItem, { backgroundColor: colors.bgCard2 }]}><Text style={[styles.resultNum, { color: colors.green }]}>{result.protein}g</Text><Text style={[styles.resultItemLabel, { color: colors.textMuted }]}>Proteína</Text></View>
                <View style={[styles.resultItem, { backgroundColor: colors.bgCard2 }]}><Text style={[styles.resultNum, { color: colors.red }]}>{result.carbs}g</Text><Text style={[styles.resultItemLabel, { color: colors.textMuted }]}>Carbs</Text></View>
              </View>
            </Card>

            <Card theme={theme} style={styles.resultCard}>
              <Text style={[styles.resultTitle, { color: colors.accent }]}>⏱️ Jejum Recomendado</Text>
              <Text style={[styles.resultBig, { color: colors.green }]}>{result.recFasting}</Text>
              <Text style={[styles.resultSub, { color: colors.textMuted }]}>Para perder {result.weeklyLoss}kg/semana</Text>
              <Text style={[styles.resultSub, { color: colors.textMuted }]}>Meta atingida em ~{result.totalWeeks} semanas</Text>
            </Card>

            <Btn label="💾 Salvar Plano no Perfil" onPress={savePlan} loading={saving} variant="accent" theme={theme} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: VÍDEOS YOUTUBE
// ════════════════════════════════════════════════════════════
function VideosScreen({ type, onBack, user, profile, theme }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const query = type === 'workout' ? WORKOUT_VIDEOS_QUERY : RECIPE_VIDEOS_QUERY;
  const title = type === 'workout' ? '🎥 Vídeos de Treino' : '🥗 Receitas Low Carb';

  useEffect(() => {
    setupImmersiveMode();
    (async () => {
      try { const items = await fetchYouTubeVideos(query, 10); setVideos(items); }
      catch (e) { Alert.alert('Erro', 'Não foi possível carregar vídeos.'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function shareVideoToFeed(video) {
    const videoId = video.id?.videoId;
    const videoTitle = video.snippet?.title || 'Vídeo';
    const channel = video.snippet?.channelTitle || '';
    const thumb = video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.default?.url || '';
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    setSharingId(videoId);
    try {
      let imageUrl = null;
      if (thumb) {
        try {
          const res = await fetch(thumb);
          const blob = await res.blob();
          const reader = new FileReader();
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const formData = new FormData();
          formData.append('file', `data:image/jpeg;base64,${base64}`);
          formData.append('upload_preset', CLOUDINARY_PRESET);
          const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
            method: 'POST', body: formData,
          });
          const uploadData = await uploadRes.json();
          imageUrl = uploadData.secure_url;
        } catch (_) { imageUrl = null; }
      }

      const points = calculateTotalPoints(profile?.gamification);
      const badgeLevel = getBadgeLevel(points);
      const userRank = getUserRank(points);
      const typeEmoji = type === 'workout' ? '💪' : '🥑';

      await addDoc(collection(db, 'socialPosts'), {
        content: `${typeEmoji} Recomendo esse vídeo!\n\n📺 "${videoTitle}"\n🎬 ${channel}\n\n▶️ ${videoUrl}`,
        imageUrl,
        type: type === 'workout' ? 'workout' : 'meal',
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Usuário',
        userPhoto: profile?.photoURL || '',
        userBadge: badgeLevel.icon,
        userRankName: userRank.name,
        userPoints: points,
        videoUrl,
        videoId,
        createdAt: new Date().toISOString(),
        likes: [],
        reactions: {},
        commentCount: 0,
      });

      await showSocialNotification(
        `${typeEmoji} Novo vídeo compartilhado!`,
        `${profile?.name || 'Usuário'} recomendou: ${videoTitle.slice(0, 50)}`
      );
      await playSocialSound();
      Alert.alert('✅ Compartilhado!', 'O vídeo foi compartilhado no Feed Social!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível compartilhar no feed.');
    } finally {
      setSharingId(null);
    }
  }

  if (selected) {
    const videoId = selected.id?.videoId;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
        <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
        <Header title={selected.snippet?.title?.slice(0, 30) + '...'} onBack={() => setSelected(null)} theme={theme} />
        <WebView
          source={{ uri: videoUrl }}
          style={{ flex: 1 }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          renderLoading={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
              <ActivityIndicator color={colors.green} size="large" />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Carregando vídeo...</Text>
            </View>
          )}
          onError={() =>
            Alert.alert('Erro', 'Não foi possível carregar o vídeo. Verifique sua conexão.')
          }
        />
      </View>
    );
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title={title} onBack={onBack} theme={theme} />
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator color={colors.green} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando vídeos...</Text>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(item, i) => item.id?.videoId || String(i)}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const videoId = item.id?.videoId;
            const isSharing = sharingId === videoId;
            return (
              <View style={[styles.videoCard, { backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 16 }]}>
                <View style={{ position: 'relative' }}>
                  <Image
                    source={{ uri: item.snippet?.thumbnails?.high?.url }}
                    style={[styles.videoThumb, { borderRadius: 0 }]}
                    resizeMode="cover"
                  />
                  <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                </View>

                <View style={{ padding: 12 }}>
                  <Text style={[styles.videoTitle, { color: colors.text }]} numberOfLines={2}>{item.snippet?.title}</Text>
                  <Text style={[styles.videoChannel, { color: colors.textMuted }]}>{item.snippet?.channelTitle}</Text>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.red, paddingVertical: 10, borderRadius: 12 }}
                      onPress={() => setSelected(item)}
                    >
                      <Ionicons name="play-circle" size={18} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>▶ Assistir</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.green + '22', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.green }}
                      onPress={() => shareVideoToFeed(item)}
                      disabled={isSharing}
                    >
                      {isSharing ? (
                        <ActivityIndicator size="small" color={colors.green} />
                      ) : (
                        <>
                          <Ionicons name="share-social-outline" size={18} color={colors.green} />
                          <Text style={{ color: colors.green, fontWeight: '700', fontSize: 13 }}>📱 Feed</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: TREINO EM CASA
// ════════════════════════════════════════════════════════════
function WorkoutScreen({ onBack, userId, profile, theme }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(WORKOUT_EXERCISES[0].duration);
  const [isRunning, setIsRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [sharing, setSharing] = useState(false);
  const intervalRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const cardRef = useRef(null);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const ex = WORKOUT_EXERCISES[currentIdx];
  const workoutCompletedRef = useRef(false);
  const isRest = ex.name === 'Descanso';

  useEffect(() => {
    setupImmersiveMode();
    return () => clearInterval(intervalRef.current);
  }, []);

  useEffect(() => {
    setTimeLeft(ex.duration);
    progressAnim.setValue(1);
    return () => clearInterval(intervalRef.current);
  }, [currentIdx]);

  function startTimer() {
    clearInterval(intervalRef.current);
    const totalDuration = WORKOUT_EXERCISES[currentIdx].duration;
    let current = timeLeft;
    intervalRef.current = setInterval(() => {
      current -= 1;
      setTimeLeft(current);
      Animated.timing(progressAnim, {
        toValue: current / totalDuration,
        duration: 900,
        useNativeDriver: false,
      }).start();
      if (current <= 0) {
        clearInterval(intervalRef.current);
        Vibration.vibrate([200, 100, 200]);
        handleNextExercise();
      }
    }, 1000);
  }

  function toggleTimer() {
    if (isRunning) {
      clearInterval(intervalRef.current);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      playBeepSound();
      startTimer();
    }
  }

  async function handleNextExercise() {
    clearInterval(intervalRef.current);
    setIsRunning(false);

    if (currentIdx < WORKOUT_EXERCISES.length - 1) {
      const nextIdx = currentIdx + 1;
      const next = WORKOUT_EXERCISES[nextIdx];
      setCurrentIdx(nextIdx);
      setTimeLeft(next.duration);
      progressAnim.setValue(1);
      await playBeepSound();
      if (next.name === 'Descanso') {
        Alert.alert('😮‍💨 Descanso', `Descanse por ${next.duration} segundos.\nPrepare-se para o próximo exercício!`);
      } else {
        Alert.alert('💪 Próximo', `Agora: ${next.name}`);
      }
    } else {
      await playBeepSound();
      Vibration.vibrate([500, 300, 500, 300, 1000]);
      setDone(true);
      if (!workoutCompletedRef.current && userId) {
        workoutCompletedRef.current = true;
        await updateGamification(userId, 'workout');
        Alert.alert('🎉 Parabéns!', 'Treino completo! +30 pontos!');
      }
    }
  }

  function resetWorkout() {
    clearInterval(intervalRef.current);
    setCurrentIdx(0);
    setTimeLeft(WORKOUT_EXERCISES[0].duration);
    progressAnim.setValue(1);
    setIsRunning(false);
    setDone(false);
    workoutCompletedRef.current = false;
    playBeepSound();
  }

  async function shareWorkout(shareType = 'external') {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (shareType === 'external') {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar treino' });
      } else {
        const imageUrl = await uploadToCloudinary(uri);
        const points = calculateTotalPoints(profile?.gamification);
        const badgeLevel = getBadgeLevel(points);
        const userRank = getUserRank(points);
        await addDoc(collection(db, 'socialPosts'), {
          content: 'Completei meu treino em casa! 🏋️💪\n\nCada exercício concluído com sucesso!',
          imageUrl,
          type: 'workout',
          userId: userId,
          userName: profile?.name || 'Atleta',
          userPhoto: profile?.photoURL || '',
          userBadge: badgeLevel.icon,
          userRankName: userRank.name,
          userPoints: points,
          createdAt: new Date().toISOString(),
          likes: [],
          reactions: {},
          commentCount: 0,
        });
        Alert.alert('✅ Compartilhado!', 'Seu treino foi para o Feed Social!');
      }
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível compartilhar');
    } finally {
      setSharing(false);
    }
  }

  const handleShare = () => {
    Alert.alert('Compartilhar treino', 'Onde deseja compartilhar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📱 Feed Social', onPress: () => shareWorkout('internal') },
      { text: '🌐 WhatsApp/Outros', onPress: () => shareWorkout('external') },
    ]);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  if (done) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
        <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
        <Header title="Treino Concluído 🎉" onBack={onBack} theme={theme} />
        <ScrollView contentContainerStyle={{ alignItems: 'center', padding: 24, paddingBottom: 40 }}>
          <Text style={{ fontSize: 70, marginBottom: 8 }}>🏆</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: colors.green, marginBottom: 4 }}>Parabéns!</Text>
          <Text style={{ color: colors.textMuted, marginBottom: 24 }}>Você completou o treino completo!</Text>
          <View
            ref={cardRef}
            collapsable={false}
            style={{
              backgroundColor: colors.bgCard,
              borderRadius: 24,
              padding: 20,
              marginBottom: 20,
              borderWidth: 2,
              borderColor: colors.green,
              alignItems: 'center',
              width: 300,
            }}
          >
            <Text style={{ color: colors.green, fontSize: 18, fontWeight: '900' }}>🏋️ TREINO CONCLUÍDO</Text>
            <Text style={{ color: colors.text, marginTop: 8 }}>{profile?.name || 'Atleta'}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
              {WORKOUT_EXERCISES.length} exercícios completados!
            </Text>
            <Text style={{ color: colors.accent, fontWeight: '700', marginTop: 8 }}>+30 pontos!</Text>
          </View>
          <Btn
            label={sharing ? '⏳ Gerando...' : '📤 Compartilhar Resultado'}
            onPress={handleShare}
            variant="accent"
            loading={sharing}
            style={{ marginBottom: 12, width: 300 }}
            theme={theme}
          />
          <Btn label="🔄 Fazer de novo" onPress={resetWorkout} variant="secondary" style={{ marginBottom: 12, width: 300 }} theme={theme} />
          <Btn label="← Voltar" onPress={onBack} variant="secondary" style={{ width: 300 }} theme={theme} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="💪 Treino em Casa" onBack={onBack} theme={theme} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

        <View style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              Exercício {currentIdx + 1} de {WORKOUT_EXERCISES.length}
            </Text>
            <Text style={{ color: colors.green, fontSize: 13, fontWeight: '700' }}>
              {Math.round(((currentIdx + 1) / WORKOUT_EXERCISES.length) * 100)}%
            </Text>
          </View>
          <View style={[styles.progressBar, { backgroundColor: colors.bgCard2 }]}>
            <View style={[styles.progressFill, {
              width: `${((currentIdx + 1) / WORKOUT_EXERCISES.length) * 100}%`,
              backgroundColor: colors.green,
            }]} />
          </View>
        </View>

        <Card theme={theme} style={[styles.workoutCard, isRest && { borderColor: colors.blue + '66', borderWidth: 2 }]}>
          <Text style={{
            fontSize: 13,
            color: colors.textMuted,
            marginBottom: 8,
            textAlign: 'center',
            letterSpacing: 1,
          }}>
            {isRest ? '😮‍💨 DESCANSO' : '💪 EXERCÍCIO'}
          </Text>

          <Text style={[styles.workoutExName, {
            color: isRest ? colors.blue : colors.text,
            fontSize: 24,
          }]}>
            {ex.name}
          </Text>

          <Text style={[styles.workoutExDesc, { color: colors.textMuted, marginBottom: 8 }]}>
            {ex.desc}
          </Text>

          {ex.reps && (
            <View style={{
              backgroundColor: colors.accent + '22',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 6,
              marginBottom: 12,
            }}>
              <Text style={{ color: colors.accent, fontWeight: '700', fontSize: 15 }}>
                {ex.reps} repetições
              </Text>
            </View>
          )}

          <View style={styles.countdownContainer}>
            <Text style={[styles.countdown, { color: isRest ? colors.blue : colors.green }]}>
              {timeLeft}s
            </Text>
          </View>

          <View style={[styles.progressBar, { backgroundColor: colors.bgCard2 }]}>
            <Animated.View style={[styles.progressFill, {
              width: progressWidth,
              backgroundColor: isRest ? colors.blue : colors.green,
            }]} />
          </View>
        </Card>

        {currentIdx < WORKOUT_EXERCISES.length - 1 && (
          <Card theme={theme} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>PRÓXIMOS</Text>
            {WORKOUT_EXERCISES.slice(currentIdx + 1, currentIdx + 4).map((e, i) => (
              <View key={i} style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 6,
                borderBottomWidth: i < 2 ? 1 : 0,
                borderColor: colors.border,
              }}>
                <View style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: e.name === 'Descanso' ? colors.blue + '22' : colors.green + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 12 }}>{e.name === 'Descanso' ? '⏸' : '💪'}</Text>
                </View>
                <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>{e.name}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{e.duration}s</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={[styles.timerControls, { marginTop: 16 }]}>
          <TouchableOpacity
            onPress={() => {
              if (currentIdx > 0) {
                clearInterval(intervalRef.current);
                const prevIdx = currentIdx - 1;
                setCurrentIdx(prevIdx);
                setTimeLeft(WORKOUT_EXERCISES[prevIdx].duration);
                progressAnim.setValue(1);
                setIsRunning(false);
              }
            }}
            disabled={currentIdx === 0}
            style={[styles.btn, {
              width: 52,
              backgroundColor: colors.bgCard,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: currentIdx === 0 ? 0.4 : 1,
            }]}
          >
            <Text style={{ color: colors.text, fontSize: 18 }}>◀</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={toggleTimer}
            style={[styles.btn, {
              flex: 1,
              marginHorizontal: 8,
              backgroundColor: isRunning ? colors.accent : colors.green,
            }]}
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 16 }}>
              {isRunning ? '⏸ PAUSAR' : timeLeft === ex.duration ? '▶ INICIAR' : '▶ CONTINUAR'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextExercise}
            style={[styles.btn, {
              width: 52,
              backgroundColor: colors.bgCard,
              borderWidth: 1,
              borderColor: colors.border,
            }]}
          >
            <Text style={{ color: colors.text, fontSize: 18 }}>▶▶</Text>
          </TouchableOpacity>
        </View>

        <Card theme={theme} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.green, textAlign: 'center', fontSize: 13 }}>
            💡 Complete o treino e ganhe +30 pontos!
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// TELA: ATIVIDADES (CAMINHADA, CORRIDA, BIKE) - VERSÃO CORRIGIDA
// ════════════════════════════════════════════════════════════
function ActivitiesScreen({ onBack, user, profile, onStepsUpdate, theme }) {
  const [selectedActivity, setSelectedActivity] = useState(ACTIVITIES.WALKING);
  const [isActive, setIsActive] = useState(false);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  const [calories, setCalories] = useState(0);
  const [steps, setSteps] = useState(0);
  const [subscription, setSubscription] = useState(null);
  const intervalRef = useRef(null);
  const lastMagRef = useRef(null);
  const startTimeRef = useRef(null);
  const THRESHOLD = 1.2;
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef(null);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  const userWeight = profile?.weightPlan?.weight || profile?.weight || 70;

  useEffect(() => {
    setupImmersiveMode();
    return () => {
      if (subscription) subscription.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isActive && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - startTimeRef.current) / 1000);
        setDuration(elapsedSeconds);
        const durationHours = elapsedSeconds / 3600;
        const newCalories = calculateCalories(selectedActivity.met, userWeight, durationHours);
        setCalories(newCalories);
        
        const newDistance = (selectedActivity.speed * durationHours);
        setDistance(parseFloat(newDistance.toFixed(2)));
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, selectedActivity, userWeight]);

  async function startActivity() {
    if (isActive) return;
    startTimeRef.current = Date.now();
    setIsActive(true);
    setDuration(0); setDistance(0); setCalories(0); setSteps(0);
    lastMagRef.current = null;

    if (selectedActivity.id !== 'biking') {
      Accelerometer.setUpdateInterval(100);
      const sub = Accelerometer.addListener(({ x, y, z }) => {
        const mag = Math.sqrt(x * x + y * y + z * z);
        if (lastMagRef.current !== null) {
          const delta = Math.abs(mag - lastMagRef.current);
          if (delta > THRESHOLD) setSteps(prev => prev + 1);
        }
        lastMagRef.current = mag;
      });
      setSubscription(sub);
    }

    Vibration.vibrate(100);
  }

  async function stopActivity() {
    if (!isActive) return;
    if (subscription) subscription.remove();
    setSubscription(null);
    setIsActive(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    Vibration.vibrate([200, 100, 200]);
    
    if (user && duration > 0) {
      const activityData = {
        type: selectedActivity.id,
        name: selectedActivity.name,
        duration, distance, calories, steps,
        date: new Date().toISOString(),
        speed: selectedActivity.speed,
        met: selectedActivity.met,
      };
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const activities = userSnap.data()?.activities || [];
        activities.push(activityData);
        await updateDoc(userRef, { activities });
        
        const currentSteps = userSnap.data()?.steps || 0;
        const currentCalories = userSnap.data()?.caloriesBurned || 0;
        await updateDoc(userRef, { 
          steps: currentSteps + steps,
          caloriesBurned: currentCalories + calories
        });
        
        if (onStepsUpdate) {
          onStepsUpdate(currentSteps + steps, currentCalories + calories);
        }
        
        await updateGamification(user.uid, 'workout', 1);
        if (steps > 0) await updateGamification(user.uid, 'steps', steps);
        
        Alert.alert(
          '✅ Atividade Concluída!',
          `${selectedActivity.name}\n⏱️ Tempo: ${formatDuration(duration)}\n📏 Distância: ${distance.toFixed(2)} km (estimada)\n🔥 Calorias: ${calories} kcal\n👣 Passos: ${steps}`,
          [{ text: 'Fechar' }, { text: 'Compartilhar!', onPress: () => shareActivity(activityData) }]
        );
      } catch (e) { 
        console.log('Erro ao salvar atividade:', e);
        Alert.alert('Erro', 'Não foi possível salvar a atividade'); 
      }
    }
  }

  async function shareActivity(activityData) {
    Alert.alert('Compartilhar', 'Onde deseja compartilhar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📱 Feed Interno', onPress: () => shareActivityInternal(activityData) },
      { text: '🌐 Externo (WhatsApp, etc)', onPress: () => shareActivityExternal(activityData) },
    ]);
  }

  async function shareActivityExternal(activityData) {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar atividade' });
    } catch (e) { Alert.alert('Erro', 'Não foi possível gerar a imagem'); }
    finally { setSharing(false); }
  }

  async function shareActivityInternal(activityData) {
    setSharing(true);
    try {
      let imageUri = null;
      if (shareCardRef.current) imageUri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      
      const points = calculateTotalPoints(profile?.gamification);
      const badgeLevel = getBadgeLevel(points);
      const userRank = getUserRank(points);
      
      await addDoc(collection(db, 'socialPosts'), {
        content: `Completei ${activityData.name}! 🏃‍♂️🔥\n⏱️ ${formatDuration(activityData.duration)}\n📏 ${activityData.distance.toFixed(2)} km\n🔥 ${activityData.calories} kcal\n👣 ${activityData.steps} passos`,
        imageUrl: imageUri || null,
        type: 'activity',
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Usuário',
        userPhoto: profile?.photoURL || '',
        userBadge: badgeLevel.icon,
        userRankName: userRank.name,
        userPoints: points,
        createdAt: new Date().toISOString(),
        likes: [],
        reactions: {},
        commentCount: 0,
      });
      
      await showSocialNotification('🏃 Nova Atividade!', `${profile?.name || 'Usuário'} completou uma atividade!`);
      Alert.alert('✅ Sucesso!', 'Sua atividade foi compartilhada no Feed Social!');
    } catch (e) { Alert.alert('Erro', 'Não foi possível compartilhar'); }
    finally { setSharing(false); }
  }

  function resetActivity() {
    if (isActive) return;
    setDuration(0); setDistance(0); setCalories(0); setSteps(0);
    startTimeRef.current = null;
    Vibration.vibrate(50);
  }

  const caloriesPerHour = calculateCalories(selectedActivity.met, userWeight, 1);

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="🏃 Atividades" onBack={onBack} theme={theme} />
      <ScrollView contentContainerStyle={[styles.activitiesContainer]} showsVerticalScrollIndicator={false}>

        <View style={styles.activitySelector}>
          {Object.values(ACTIVITIES).map(act => (
            <TouchableOpacity
              key={act.id}
              style={[styles.activityCard, { backgroundColor: colors.bgCard, borderColor: selectedActivity.id === act.id ? act.color : colors.border, borderWidth: selectedActivity.id === act.id ? 2.5 : 1 }]}
              onPress={() => !isActive && setSelectedActivity(act)}
              disabled={isActive}
            >
              <Text style={styles.activityIcon}>{act.icon}</Text>
              <Text style={[styles.activityName, { color: selectedActivity.id === act.id ? act.color : colors.text }]}>{act.name.split(' ')[1]}</Text>
              <Text style={[styles.activitySpeed, { color: colors.textMuted }]}>{act.speed} km/h</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Card theme={theme} style={styles.activityStatusCard}>
          <Text style={[styles.activityStatusTitle, { color: colors.text }]}>
            {isActive ? `${selectedActivity.icon} ${selectedActivity.name} - Em andamento...` : `${selectedActivity.icon} ${selectedActivity.name}`}
          </Text>
          <View style={styles.activityMetrics}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: selectedActivity.color }]}>{formatDuration(duration)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>⏱️ Tempo</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: selectedActivity.color }]}>{distance.toFixed(2)}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>📏 km*</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricValue, { color: selectedActivity.color }]}>{calories}</Text>
              <Text style={[styles.metricLabel, { color: colors.textMuted }]}>🔥 kcal</Text>
            </View>
            {selectedActivity.id !== 'biking' && (
              <View style={styles.metricItem}>
                <Text style={[styles.metricValue, { color: selectedActivity.color }]}>{steps}</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>👣 passos</Text>
              </View>
            )}
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginBottom: 12 }}>
            *Distância estimada baseada na velocidade média
          </Text>
          <View style={styles.activityButtons}>
            {!isActive ? (
              <>
                <Btn label="▶ INICIAR" onPress={startActivity} variant="primary" style={{ flex: 1, marginRight: 8 }} theme={theme} />
                <Btn label="↺ ZERAR" onPress={resetActivity} variant="secondary" style={{ flex: 1 }} theme={theme} />
              </>
            ) : (
              <Btn label="⏹️ FINALIZAR" onPress={stopActivity} variant="danger" style={{ flex: 1 }} theme={theme} />
            )}
          </View>
        </Card>

        <Card theme={theme} style={styles.activityInfoCard}>
          <Text style={[styles.infoTitle, { color: colors.greenLight }]}>📊 INFORMAÇÕES DA ATIVIDADE</Text>
          <View style={styles.activityInfoRow}>
            <View style={styles.activityInfoItem}><Text style={[styles.activityInfoLabel, { color: colors.textMuted }]}>Velocidade média</Text><Text style={[styles.activityInfoValue, { color: selectedActivity.color }]}>{selectedActivity.speed} km/h</Text></View>
            <View style={styles.activityInfoItem}><Text style={[styles.activityInfoLabel, { color: colors.textMuted }]}>Calorias por hora</Text><Text style={[styles.activityInfoValue, { color: selectedActivity.color }]}>{caloriesPerHour} kcal</Text></View>
          </View>
          <View style={styles.activityInfoRow}>
            <View style={styles.activityInfoItem}><Text style={[styles.activityInfoLabel, { color: colors.textMuted }]}>Intensidade</Text><Text style={[styles.activityInfoValue, { color: selectedActivity.color }]}>{selectedActivity.met <= 4 ? 'Moderada' : selectedActivity.met <= 7 ? 'Alta' : 'Intensa'}</Text></View>
            <View style={styles.activityInfoItem}><Text style={[styles.activityInfoLabel, { color: colors.textMuted }]}>Seu peso</Text><Text style={[styles.activityInfoValue, { color: selectedActivity.color }]}>{userWeight} kg</Text></View>
          </View>
          {selectedActivity.id !== 'biking' && <Text style={[styles.activitySensorInfo, { color: colors.textMuted }]}>📱 Sensor de movimento ativo - mantenha o celular no bolso ou na mão</Text>}
        </Card>

        {duration > 0 && !isActive && (
          <>
            <View style={{ alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
              <View ref={shareCardRef} collapsable={false} style={{ backgroundColor: colors.bgCard, borderRadius: 24, padding: 20, borderWidth: 2, borderColor: selectedActivity.color }}>
                <Text style={{ color: selectedActivity.color, fontSize: 18, fontWeight: '900', textAlign: 'center' }}>{selectedActivity.icon} {selectedActivity.name}</Text>
                <Text style={{ color: colors.text, textAlign: 'center', marginTop: 8 }}>{profile?.name || 'Atleta'}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>{formatDuration(duration)} • {distance.toFixed(2)} km • {calories} kcal</Text>
                {steps > 0 && <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center' }}>{steps} passos</Text>}
                <Text style={{ color: colors.accent, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>+{Math.floor(duration / 60)} pontos!</Text>
              </View>
            </View>
            <Btn label={sharing ? '⏳ Gerando...' : '📤 Compartilhar Resultado'} onPress={() => shareActivity({ name: selectedActivity.name, duration, distance, calories, steps })} variant="accent" loading={sharing} style={{ marginBottom: 16 }} theme={theme} />
          </>
        )}

      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: RANKING GLOBAL
// ════════════════════════════════════════════════════════════
function RankingScreen({ onBack, currentUser, profile, theme }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const podiumRef = useRef(null);
  const myCardViewRef = useRef(null);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  const currentUserPosition = users.findIndex(u => u.id === currentUser?.uid);

  useEffect(() => { loadRanking(); }, []);

  async function loadRanking() {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const points = calculateTotalPoints(data.gamification);
        const userRank = getUserRank(points);
        usersList.push({ id: doc.id, name: data.name || 'Usuário', photoURL: data.photoURL, points, fastingDays: data.fastingDays || 0, workouts: data.gamification?.workoutCount || 0, steps: data.gamification?.totalSteps || 0, rankTitle: userRank.name, rankIcon: userRank.icon, rankColor: userRank.color });
      });
      usersList.sort((a, b) => b.points - a.points);
      setUsers(usersList);
    } catch (e) { Alert.alert('Erro', 'Não foi possível carregar o ranking.'); }
    finally { setLoading(false); setRefreshing(false); }
  }

  function onRefresh() { setRefreshing(true); loadRanking(); }
  
  function getRankInfo(position) {
    if (position === 0) return { ...RANK_TITLES[1], emoji: '🥇', color: colors.gold, bgColor: colors.gold + '22' };
    if (position === 1) return { ...RANK_TITLES[2], emoji: '🥈', color: colors.silver, bgColor: colors.silver + '22' };
    if (position === 2) return { ...RANK_TITLES[3], emoji: '🥉', color: colors.bronze, bgColor: colors.bronze + '22' };
    return { name: `#${position + 1}`, icon: '🏅', color: colors.textMuted, bgColor: colors.bgCard + '44', emoji: `${position + 1}` };
  }

  async function shareRankingCard() {
    if (!podiumRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(podiumRef, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar conquista no ranking!' });
    } catch (e) { Alert.alert('Erro', 'Não foi possível gerar a imagem'); }
    finally { setSharing(false); }
  }

  async function shareMyPosition(mode = 'external') {
    const myUser = users[currentUserPosition];
    if (!myUser) return;
    setSharing(true);
    try {
      if (mode === 'internal') {
        let imageUrl = null;
        try {
          const refToCapture = currentUserPosition < 3 ? podiumRef : myCardViewRef;
          if (refToCapture.current) {
            const uri = await captureRef(refToCapture, { format: 'png', quality: 1 });
            imageUrl = await uploadToCloudinary(uri);
          }
        } catch (_) {}
        const rankEmoji = currentUserPosition === 0 ? '🥇' : currentUserPosition === 1 ? '🥈' : currentUserPosition === 2 ? '🥉' : '🏅';
        const points = myUser.points;
        const badgeLevel = getBadgeLevel(points);
        await addDoc(collection(db, 'socialPosts'), {
          content: `${rankEmoji} Estou em #${currentUserPosition + 1}° no Ranking Global!\n\n🏆 ${myUser.points} pontos\n${myUser.rankTitle}\n\n💪 Rumo ao topo!`,
          imageUrl,
          type: 'achievement',
          userId: currentUser.uid,
          userName: myUser.name,
          userPhoto: myUser.photoURL || '',
          userBadge: badgeLevel.icon,
          userRankName: myUser.rankTitle,
          userPoints: myUser.points,
          createdAt: new Date().toISOString(),
          likes: [],
          reactions: {},
          commentCount: 0,
        });
        Alert.alert('✅ Compartilhado!', 'Sua posição foi para o Feed Social!');
      } else {
        const refToCapture = currentUserPosition < 3 ? podiumRef : myCardViewRef;
        if (!refToCapture.current) { Alert.alert('Erro', 'Nada para capturar'); return; }
        const uri = await captureRef(refToCapture, { format: 'png', quality: 1 });
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Minha posição no ranking!' });
      }
    } catch (e) {
      console.log('Erro ao compartilhar ranking:', e);
      Alert.alert('Erro', 'Não foi possível compartilhar');
    } finally {
      setSharing(false);
    }
  }

  function handleShareRanking() {
    if (currentUserPosition < 0) {
      Alert.alert('Você não está no ranking ainda', 'Complete atividades para aparecer no ranking!');
      return;
    }
    Alert.alert(
      `🏅 Posição #${currentUserPosition + 1}`,
      'Onde deseja compartilhar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: '📱 Feed Social', onPress: () => shareMyPosition('internal') },
        { text: '🌐 WhatsApp/Outros', onPress: () => shareMyPosition('external') },
      ]
    );
  }

  if (loading) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
        <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
        <Header title="Ranking Global" onBack={onBack} theme={theme} />
        <View style={styles.centerContent}><ActivityIndicator color={colors.green} size="large" /><Text style={[styles.loadingText, { color: colors.textMuted }]}>Carregando ranking...</Text></View>
      </View>
    );
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <Header title="🏆 RANKING GLOBAL" onBack={onBack} theme={theme} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.rankingContainer, { paddingBottom: 80 }]} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.green]} tintColor={colors.green} />} showsVerticalScrollIndicator={false}>
        <View style={styles.rankingHeader}>
          <Text style={[styles.rankingHeaderTitle, { color: colors.text }]}>CLASSIFICAÇÃO GERAL</Text>
          <Text style={[styles.rankingHeaderSubtitle, { color: colors.textMuted }]}>{users.length} participantes ativos</Text>
        </View>

        {users.length > 0 && (
          <View ref={podiumRef} collapsable={false} style={{ backgroundColor: colors.bg, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 16 }}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}><Text style={{ color: colors.gold, fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>🏆 PÓDIO</Text><Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>KETO+ · Ranking Global</Text></View>
            <View style={styles.topThreeContainer}>
              {[1, 0, 2].map(idx => {
                const user = users[idx];
                if (!user) return <View key={idx} style={{ flex: 1 }} />;
                const rankInfo = getRankInfo(idx);
                const isCurrentUser = user.id === currentUser?.uid;
                const podiumHeight = idx === 0 ? 90 : idx === 1 ? 70 : 55;
                return (
                  <View key={user.id} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={[styles.topThreeCard, { backgroundColor: rankInfo.bgColor, borderColor: rankInfo.color, borderWidth: isCurrentUser ? 3 : 2, marginBottom: 4 }]}>
                      <View style={styles.topThreePosition}><Text style={[styles.topThreeNumber, { color: rankInfo.color }]}>#{idx + 1}</Text><Text style={styles.topThreeEmoji}>{rankInfo.emoji}</Text></View>
                      <View style={styles.topThreeAvatarContainer}>
                        {user.photoURL ? <Image source={{ uri: user.photoURL }} style={[styles.topThreeAvatar, { borderColor: rankInfo.color }]} /> : <View style={[styles.topThreeAvatar, styles.avatarPlaceholder, { borderColor: rankInfo.color, backgroundColor: colors.bgCard2 }]}><FontAwesome5 name="user" size={22} color={rankInfo.color} /></View>}
                        {isCurrentUser && <View style={[styles.youBadge, { backgroundColor: rankInfo.color }]}><Text style={[styles.youBadgeText, { color: '#000' }]}>VOCÊ</Text></View>}
                      </View>
                      <Text style={[styles.topThreeName, { color: rankInfo.color }]} numberOfLines={1}>{user.name}</Text>
                      <Text style={[styles.topThreePoints, { color: colors.text }]}>{user.points} pts</Text>
                      <View style={[styles.topThreeRankBadge, { backgroundColor: rankInfo.color + '22' }]}><Text style={[styles.topThreeTitle, { color: rankInfo.color }]}>{user.rankTitle}</Text></View>
                    </View>
                    <View style={{ width: '90%', height: podiumHeight, backgroundColor: rankInfo.color + '33', borderTopWidth: 3, borderTopColor: rankInfo.color, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: rankInfo.color, fontSize: 24, fontWeight: '900' }}>{idx === 0 ? '1' : idx === 1 ? '2' : '3'}°</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 8 }}>#KetoPlus #RankingGlobal #Saúde</Text>
          </View>
        )}

        {currentUserPosition >= 3 && users[currentUserPosition] && (
          <View ref={myCardViewRef} collapsable={false} style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: colors.green, marginBottom: 12 }}>
            <Text style={{ color: colors.green, textAlign: 'center', fontWeight: '900', fontSize: 15, marginBottom: 10 }}>🏅 MINHA POSIÇÃO</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: colors.green }}>#{currentUserPosition + 1}</Text>
              {users[currentUserPosition].photoURL ? (
                <Image source={{ uri: users[currentUserPosition].photoURL }} style={{ width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.green }} />
              ) : (
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>👤</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{users[currentUserPosition].name}</Text>
                <Text style={{ color: users[currentUserPosition].rankColor, fontSize: 12 }}>{users[currentUserPosition].rankTitle}</Text>
                <Text style={{ color: colors.green, fontWeight: '700' }}>{users[currentUserPosition].points} pts</Text>
              </View>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 8 }}>#KetoPlus #RankingGlobal</Text>
          </View>
        )}

        {currentUserPosition >= 0 && (
          <Btn label={sharing ? '⏳ Gerando...' : `📤 Compartilhar minha posição #${currentUserPosition + 1}`} onPress={handleShareRanking} loading={sharing} variant="accent" style={{ marginBottom: 16 }} theme={theme} />
        )}

        <View style={[styles.rankLegend, { backgroundColor: colors.bgCard }]}>
          <Text style={[styles.rankLegendTitle, { color: colors.textSub }]}>🏅 TÍTULOS POR PONTUAÇÃO</Text>
          <View style={styles.rankLegendList}>
            {OTHER_RANKS.map((rank, idx) => (
              <View key={idx} style={[styles.rankLegendItem, { backgroundColor: colors.bgCard2 }]}><Text style={{ color: rank.color }}>{rank.icon}</Text><Text style={[styles.rankLegendName, { color: rank.color }]}>{rank.name}</Text><Text style={[styles.rankLegendPoints, { color: colors.textMuted }]}>{rank.minPoints}+ pts</Text></View>
            ))}
          </View>
        </View>

        <Text style={[styles.rankingSubtitle, { color: colors.textSub }]}>📋 CLASSIFICAÇÃO COMPLETA</Text>
        {users.map((user, index) => {
          const isCurrentUser = user.id === currentUser?.uid;
          const position = index + 1;
          const rankInfo = getRankInfo(index);
          return (
            <View key={user.id} style={[styles.rankingItem, isCurrentUser && { borderColor: colors.green, backgroundColor: colors.greenDark + '22' }, index < 3 && { borderColor: rankInfo.color + '88', borderWidth: 2 }, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.rankingPosition}>{index < 3 ? <Text style={{ fontSize: 20 }}>{rankInfo.emoji}</Text> : <Text style={[styles.rankingPositionText, { color: colors.textMuted }]}>#{position}</Text>}</View>
              <View style={styles.rankingAvatarContainer}>
                {user.photoURL ? <Image source={{ uri: user.photoURL }} style={styles.rankingAvatar} /> : <View style={[styles.rankingAvatar, styles.avatarPlaceholder, { backgroundColor: colors.bgCard2 }]}><FontAwesome5 name="user" size={16} color={colors.text} /></View>}
                {isCurrentUser && <View style={[styles.youBadgeSmall, { backgroundColor: colors.green }]}><Text style={[styles.youBadgeTextSmall, { color: '#000' }]}>VOCÊ</Text></View>}
              </View>
              <View style={styles.rankingInfo}><Text style={[styles.rankingName, { color: colors.text }]}>{user.name}</Text><View style={styles.rankingRankContainer}><Text style={styles.rankingRankIcon}>{user.rankIcon}</Text><Text style={[styles.rankingRank, { color: user.rankColor }]}>{user.rankTitle}</Text></View></View>
              <View style={styles.rankingStats}><Text style={[styles.rankingPoints, index < 3 && { color: rankInfo.color }, { color: index < 3 ? rankInfo.color : colors.green }]}>{user.points} pts</Text><View style={styles.rankingDetailsContainer}><Text style={[styles.rankingDetails, { color: colors.textMuted }]}>🔥 {user.fastingDays}</Text><Text style={[styles.rankingDetails, { color: colors.textMuted }]}>💪 {user.workouts}</Text></View></View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// COMPONENTE: WIDGET DE JEJUM
// ════════════════════════════════════════════════════════════
const FastingWidget = React.memo(function FastingWidget({ onNavigate, theme }) {
  const { selectedType, isRunning, elapsed, start, resume, stop, reset } = React.useContext(FastingContext);
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  const fmt = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  const target = selectedType.fast * 3600;
  const pct = target > 0 ? Math.min((elapsed / target) * 100, 100) : 0;
  const remaining = Math.max(target - elapsed, 0);
  const hasActivity = isRunning || elapsed > 0;

  if (!hasActivity) {
    return (
      <TouchableOpacity onPress={() => onNavigate('fasting')} activeOpacity={0.8}>
        <Card theme={theme} style={styles.fastingWidget}>
          <View style={styles.fastingWidgetRow}>
            <Text style={{ fontSize: 28 }}>⏱️</Text>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.fastingWidgetTitle, { color: colors.text }]}>Jejum Intermitente</Text>
              <Text style={[styles.fastingWidgetSub, { color: colors.textMuted }]}>Toque para iniciar seu jejum</Text>
            </View>
            <Text style={{ color: colors.textMuted, fontSize: 20 }}>›</Text>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card theme={theme} style={[styles.fastingWidget, isRunning && { borderColor: colors.green + '88' }]}>
      <View style={styles.fastingWidgetRow}>
        <Text style={{ fontSize: 24 }}>{isRunning ? '🔥' : '⏸'}</Text>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.fastingWidgetTitle, { color: colors.text }]}>{selectedType.label} — {isRunning ? 'Em jejum' : 'Pausado'}</Text>
          <Text style={[styles.fastingWidgetTimer, isRunning && { color: colors.green }]}>{fmt(elapsed)}</Text>
          <View style={[styles.progressBar, { marginTop: 6, backgroundColor: colors.bgCard2 }]}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: colors.green }]} />
          </View>
          <Text style={[styles.fastingWidgetSub, { color: colors.textMuted }]}>{pct.toFixed(0)}% • Faltam {fmt(remaining)}</Text>
        </View>
      </View>
      <View style={styles.fastingWidgetControls}>
        {!isRunning ? (
          <TouchableOpacity style={[styles.fastingWidgetBtn, { backgroundColor: colors.bgCard2 }]} onPress={elapsed > 0 ? resume : start}>
            <Text style={[styles.fastingWidgetBtnText, { color: colors.text }]}>▶ Continuar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.fastingWidgetBtn, { backgroundColor: colors.accent + '33' }]} onPress={stop}>
            <Text style={[styles.fastingWidgetBtnText, { color: colors.accent }]}>⏸ Pausar</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.fastingWidgetBtn, { backgroundColor: colors.bgCard2 }]} onPress={reset}>
          <Text style={[styles.fastingWidgetBtnText, { color: colors.textMuted }]}>↺ Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fastingWidgetBtn, { backgroundColor: colors.bgCard2 }]} onPress={() => onNavigate('fasting')}>
          <Text style={[styles.fastingWidgetBtnText, { color: colors.textSub }]}>Detalhes ›</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
});

// ════════════════════════════════════════════════════════════
// COMPONENTE: ACHIEVEMENTS SECTION
// ════════════════════════════════════════════════════════════
function AchievementsSection({ achievements, theme }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const completedCount = achievements ? Object.keys(achievements).filter(key => achievements[key]?.completed).length : 0;
  
  return (
    <View style={styles.achievementsSection}>
      <Text style={[styles.sectionTitle, { color: colors.textSub }]}>🏆 CONQUISTAS</Text>
      <Text style={[styles.achievementsProgress, { color: colors.textMuted }]}>{completedCount} / {ACHIEVEMENTS_LIST.length} desbloqueadas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.achievementsScroll}>
        {ACHIEVEMENTS_LIST.map(ach => {
          const isCompleted = achievements?.[ach.id]?.completed;
          return (
            <View key={ach.id} style={[styles.achievementCard, isCompleted && styles.achievementCompleted, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={styles.achievementIcon}>{ach.icon}</Text>
              <Text style={[styles.achievementName, isCompleted && { color: colors.green }, { color: isCompleted ? colors.green : colors.text }]}>{ach.name}</Text>
              <Text style={[styles.achievementDesc, { color: colors.textMuted }]}>{ach.description}</Text>
              <View style={styles.achievementPointsContainer}><Text style={[styles.achievementPoints, { color: colors.accent }]}>+{ach.points}</Text>{isCompleted && <Ionicons name="checkmark-circle" size={16} color={colors.green} />}</View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: FEED SOCIAL - COM EMOJIS (LIKE 👍 AMARELO)
// ════════════════════════════════════════════════════════════
// TELA: FEED SOCIAL - COM EMOJIS (LIKE 👍 AMARELO)
// ════════════════════════════════════════════════════════════

// FUNÇÕES AUXILIARES
const getReactionCounts = (reactions) => {
  const counts = {};
  Object.values(reactions || {}).forEach(type => { counts[type] = (counts[type] || 0) + 1; });
  return counts;
};

const getTotalReactions = (reactions) => Object.keys(reactions || {}).length;

// COMPONENTE POST CARD
const PostCard = ({ post, user, profile, friendStatuses, sendFriendRequest, removeFriend, toggleLike, addReaction, toggleComments, showComments, postComments, loadingComments, commentTarget, commentText, setCommentTarget, setCommentText, sendComment, replyTarget, replyToName, setReplyTarget, setReplyToName, deletePost, formatTime, REACTION_TYPES, colors, setSelectedPost }) => {
  const isLiked = post.likes?.includes(user.uid);
  const isOwn = post.userId === user.uid;
  const commentsVisible = showComments[post.id];
  const comments = postComments[post.id] || [];
  const reactionCounts = getReactionCounts(post.reactions);
  const totalReactions = getTotalReactions(post.reactions);
  const userReaction = post.reactions?.[user.uid];
  const friendStatus = friendStatuses[post.userId];

  const handleAvatarPress = () => {
    if (isOwn) return;
    const name = post.userName || 'Usuário';
    const photo = post.userPhoto || '';
    if (friendStatus === 'friend') { Alert.alert(`🤝 ${name}`, 'Vocês já são amigos!'); return; }
    if (friendStatus === 'pending') { Alert.alert('⏳ Pedido pendente', `Aguardando resposta de ${name}.`); return; }
    Alert.alert(`👤 ${name}`, `Deseja adicionar ${name} como amigo(a)?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: '🤝 Adicionar', onPress: () => sendFriendRequest(post.userId, name, photo) }
    ]);
  };

  const renderComment = (comment) => {
    const isReply = !!comment.parentId;
    return (
      <View key={comment.id} style={{ marginLeft: isReply ? 36 : 0, marginBottom: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          {comment.userPhoto
            ? <Image source={{ uri: comment.userPhoto }} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8 }} />
            : <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}><Text style={{ fontSize: 12 }}>👤</Text></View>}
          <View style={{ flex: 1, backgroundColor: colors.bgCard, borderRadius: 12, padding: 10 }}>
            <Text style={{ color: colors.green, fontSize: 12, fontWeight: '700', marginBottom: 2 }}>{comment.userName}</Text>
            {comment.replyToUser && <Text style={{ color: colors.accent, fontSize: 11, marginBottom: 2 }}>↳ Respondendo para {comment.replyToUser}</Text>}
            <Text style={{ color: colors.text, fontSize: 13 }}>{comment.text}</Text>
            <View style={{ flexDirection: 'row', marginTop: 6, gap: 12 }}>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>{formatTime(comment.createdAt)}</Text>
              <TouchableOpacity onPress={() => { setReplyTarget(comment.id); setReplyToName(comment.userName); setCommentTarget(post.id); }}>
                <Text style={{ color: colors.green, fontSize: 10 }}>Responder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ backgroundColor: colors.bgCard, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 8, borderRadius: 16, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, paddingBottom: 10 }}>
        <TouchableOpacity onPress={handleAvatarPress} style={{ position: 'relative', marginRight: 10 }}>
          {post.userPhoto
            ? <Image source={{ uri: post.userPhoto }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            : <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>👤</Text></View>}
          {post.userBadge && <View style={{ position: 'absolute', bottom: -4, right: -4, backgroundColor: colors.green, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 9 }}>{post.userBadge}</Text></View>}
          {!isOwn && friendStatus === 'friend' && (
            <View style={{ position: 'absolute', top: -3, left: -3, backgroundColor: colors.green, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 8 }}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{post.userName}</Text>
            {post.userBadge && <Text style={{ fontSize: 13 }}>{post.userBadge}</Text>}
            {!isOwn && friendStatus === 'friend' && <Text style={{ color: colors.green, fontSize: 10, fontWeight: '600' }}>• amigo</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>{formatTime(post.createdAt)}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>· {post.userRankName}</Text>
          </View>
        </View>
        {isOwn
          ? <TouchableOpacity onPress={() => deletePost(post.id)} style={{ padding: 6 }}><Ionicons name="trash-outline" size={18} color={colors.textMuted} /></TouchableOpacity>
          : !friendStatus
            ? <TouchableOpacity onPress={handleAvatarPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.green + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: colors.green + '55' }}>
                <Ionicons name="person-add-outline" size={14} color={colors.green} />
                <Text style={{ color: colors.green, fontSize: 11, fontWeight: '600' }}>Adicionar</Text>
              </TouchableOpacity>
            : friendStatus === 'pending'
              ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accent + '22', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Ionicons name="time-outline" size={14} color={colors.accent} />
                  <Text style={{ color: colors.accent, fontSize: 11, fontWeight: '600' }}>Pendente</Text>
                </View>
              : null
        }
      </View>

      <TouchableOpacity onPress={() => setSelectedPost(post)} activeOpacity={0.9}>
        {post.content ? (
          <Text style={{ color: colors.text, fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingBottom: 12 }}>{post.content}</Text>
        ) : null}
        {post.imageUrl && (
          <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: 260 }} resizeMode="cover" />
        )}
      </TouchableOpacity>

      {(post.likes?.length > 0 || totalReactions > 0 || post.commentCount > 0) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {post.likes?.length > 0 && <Text style={{ color: colors.textMuted, fontSize: 12 }}>👍 {post.likes.length} curtida{post.likes.length !== 1 ? 's' : ''}</Text>}
            {totalReactions > 0 && <View style={{ flexDirection: 'row', gap: 6 }}>{Object.entries(reactionCounts).map(([type, count]) => <Text key={type} style={{ color: colors.textMuted, fontSize: 12 }}>{REACTION_TYPES.find(r => r.id === type)?.icon} {count}</Text>)}</View>}
          </View>
          {post.commentCount > 0 && (<TouchableOpacity onPress={() => toggleComments(post.id)}><Text style={{ color: colors.textMuted, fontSize: 12 }}>💬 {post.commentCount} comentário{post.commentCount !== 1 ? 's' : ''}</Text></TouchableOpacity>)}
        </View>
      )}

      <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 14, marginTop: 8 }} />

      <View style={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 4, minHeight: 52 }}>
        <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }} onPress={() => toggleLike(post.id)}>
          <Text style={{ fontSize: 22 }}>{isLiked ? '👍' : '👍🏻'}</Text>
          <Text style={{ color: isLiked ? '#F59E0B' : colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: isLiked ? '700' : '400' }}>Curtir</Text>
        </TouchableOpacity>

        {REACTION_TYPES.filter(r => r.id !== 'like').map(reaction => (
          <TouchableOpacity key={reaction.id} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }} onPress={() => addReaction(post.id, reaction.id)}>
            <Text style={{ fontSize: 22, opacity: userReaction === reaction.id ? 1 : 0.6 }}>{reaction.icon}</Text>
            <Text style={{ color: userReaction === reaction.id ? reaction.color : colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: userReaction === reaction.id ? '700' : '400' }}>{reaction.label}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }} onPress={() => { toggleComments(post.id); setCommentTarget(post.id); }}>
          <Text style={{ fontSize: 22 }}>{commentsVisible ? '💬' : '💭'}</Text>
          <Text style={{ color: commentsVisible ? colors.blue : colors.textMuted, fontSize: 11, marginTop: 2, fontWeight: commentsVisible ? '700' : '400' }}>Comentar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }} onPress={() => Share.share({ message: `${post.userName}: ${post.content}` })}>
          <Text style={{ fontSize: 22 }}>📤</Text>
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Compartilhar</Text>
        </TouchableOpacity>
      </View>

      {commentsVisible && (
        <View style={{ backgroundColor: colors.bgCard2, borderTopWidth: 1, borderColor: colors.border, padding: 12 }}>
          {loadingComments[post.id] ? <ActivityIndicator color={colors.green} size="small" style={{ marginVertical: 8 }} /> : (
            <>
              {comments.length === 0 ? <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 8 }}>Seja o primeiro a comentar!</Text> : comments.map(c => renderComment(c))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {profile?.photoURL ? <Image source={{ uri: profile.photoURL }} style={{ width: 30, height: 30, borderRadius: 15 }} /> : <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.bgCard, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 14 }}>👤</Text></View>}
                <TextInput style={{ flex: 1, backgroundColor: colors.bgCard, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: colors.text, fontSize: 13, borderWidth: 1, borderColor: colors.border }} placeholder={replyTarget ? `Respondendo ${replyToName}...` : "Escreva um comentário..."} placeholderTextColor={colors.textMuted} value={commentTarget === post.id ? commentText : ''} onChangeText={v => { setCommentTarget(post.id); setCommentText(v); }} onSubmitEditing={() => sendComment(post.id, replyTarget, replyToName)} returnKeyType="send" />
                <TouchableOpacity onPress={() => sendComment(post.id, replyTarget, replyToName)} disabled={!commentText.trim() || commentTarget !== post.id} style={{ opacity: (!commentText.trim() || commentTarget !== post.id) ? 0.4 : 1 }}><Ionicons name="send" size={22} color={colors.green} /></TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

// COMPONENTE PRINCIPAL
function SocialFeedScreen({ onBack, user, profile, theme, colors: colorsProp }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postText, setPostText] = useState('');
  const [postType, setPostType] = useState('text');
  const [postImage, setPostImage] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [commentTarget, setCommentTarget] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState(null);
  const [replyToName, setReplyToName] = useState('');
  const [showComments, setShowComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [postComments, setPostComments] = useState({});
  const [reactions, setReactions] = useState({});
  const [feedTab, setFeedTab] = useState('feed');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [friendStatuses, setFriendStatuses] = useState({});
  const [friendsSubTab, setFriendsSubTab] = useState('my_friends');
  const [ketoPlusUsers, setKetoPlusUsers] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const colors = colorsProp || (theme === 'dark' ? COLORS : LIGHT_COLORS);
  
  const inputRef = useRef(null);
  const flatListRef = useRef(null);

  const POST_TYPES = [
    { id: 'text', icon: '✍️', label: 'Texto', color: colors.green },
    { id: 'meal', icon: '🥑', label: 'Refeição', color: colors.accent },
    { id: 'achievement', icon: '🏆', label: 'Conquista', color: colors.gold },
    { id: 'workout', icon: '💪', label: 'Treino', color: colors.blue },
    { id: 'photo', icon: '📸', label: 'Foto', color: colors.purple },
    { id: 'challenge', icon: '🏅', label: 'Desafio', color: colors.pink },
  ];

  const REACTION_TYPES = [
    { id: 'like', icon: '👍', label: 'Curtir', color: '#F59E0B' },
    { id: 'love', icon: '❤️', label: 'Amei', color: colors.red },
    { id: 'fire', icon: '🔥', label: 'Fogo', color: colors.accent },
    { id: 'clap', icon: '👏', label: 'Aplaudir', color: colors.gold },
  ];

  const PLACEHOLDERS = {
    text: 'O que está acontecendo? Compartilhe sua jornada keto...',
    meal: 'Que refeição low carb você fez hoje? Compartilhe! 🥑',
    achievement: 'Compartilhe sua conquista com a comunidade! 🏆',
    workout: 'Como foi seu treino hoje? 💪',
    photo: 'Adicione uma foto e descreva... 📸',
    challenge: 'Que desafio você está enfrentando? 🏅',
  };

  useEffect(() => { loadPosts(); loadFriendsData(); }, []);

  const loadFriendsData = async () => {
    if (!user) return;
    setLoadingFriends(true);
    try {
      const friendsSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'friends'), where('status', '==', 'accepted'))
      );
      const friendsList = [];
      friendsSnap.forEach(d => friendsList.push({ id: d.id, ...d.data() }));
      setFriends(friendsList);

      const reqSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'friendRequests'), where('status', '==', 'pending'))
      );
      const reqList = [];
      reqSnap.forEach(d => reqList.push({ id: d.id, ...d.data() }));
      setFriendRequests(reqList);

      const statuses = {};
      friendsList.forEach(f => { statuses[f.friendId] = 'friend'; });

      const sentSnap = await getDocs(
        query(collection(db, 'users', user.uid, 'friends'), where('status', '==', 'pending'))
      );
      sentSnap.forEach(d => { statuses[d.data().friendId] = 'pending'; });

      setFriendStatuses(statuses);
    } catch (e) { console.log('Erro ao carregar amigos:', e); }
    finally { setLoadingFriends(false); }
  };

  useEffect(() => {
    if (feedTab === 'friends') loadKetoPlusUsers();
  }, [feedTab]);

  const loadKetoPlusUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('subscriptionPlan', 'in', ['premium', 'pro']), limit(20));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(doc => {
        if (doc.id !== user.uid) list.push({ id: doc.id, ...doc.data() });
      });
      setKetoPlusUsers(list);
    } catch (e) { console.log(e); }
  };

  const sendFriendRequest = async (targetUserId, targetName, targetPhoto) => {
    if (targetUserId === user.uid) return;
    const status = friendStatuses[targetUserId];
    if (status === 'friend') { Alert.alert('Vocês já são amigos! 🤝'); return; }
    if (status === 'pending') { Alert.alert('Pedido já enviado', 'Aguardando a resposta dele(a).'); return; }
    try {
      await setDoc(doc(db, 'users', user.uid, 'friends', targetUserId), {
        friendId: targetUserId,
        friendName: targetName,
        friendPhoto: targetPhoto || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'users', targetUserId, 'friendRequests', user.uid), {
        fromId: user.uid,
        fromName: profile?.name || user.displayName || 'Usuário',
        fromPhoto: profile?.photoURL || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setFriendStatuses(prev => ({ ...prev, [targetUserId]: 'pending' }));
      Alert.alert('✅ Pedido enviado!', `Pedido de amizade enviado para ${targetName}!`);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar o pedido.');
    }
  };

  const respondFriendRequest = async (request, accept) => {
    try {
      if (accept) {
        await setDoc(doc(db, 'users', user.uid, 'friends', request.fromId), {
          friendId: request.fromId,
          friendName: request.fromName,
          friendPhoto: request.fromPhoto || '',
          status: 'accepted',
          createdAt: new Date().toISOString(),
        });
        await setDoc(doc(db, 'users', request.fromId, 'friends', user.uid), {
          friendId: user.uid,
          friendName: profile?.name || user.displayName || 'Usuário',
          friendPhoto: profile?.photoURL || '',
          status: 'accepted',
          createdAt: new Date().toISOString(),
        });
      }
      await deleteDoc(doc(db, 'users', user.uid, 'friendRequests', request.fromId));
      if (!accept) {
        await deleteDoc(doc(db, 'users', request.fromId, 'friends', user.uid)).catch(() => {});
      }
      await loadFriendsData();
    } catch (e) {
      console.log('Erro ao responder pedido:', e);
    }
  };

  const removeFriend = async (friendId) => {
    Alert.alert('Remover amigo', 'Deseja remover esta pessoa dos seus amigos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'users', user.uid, 'friends', friendId));
          await deleteDoc(doc(db, 'users', friendId, 'friends', user.uid)).catch(() => {});
          await loadFriendsData();
        } catch (e) { Alert.alert('Erro', 'Não foi possível remover.'); }
      }}
    ]);
  };

  const loadPosts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ref = collection(db, 'socialPosts');
      const q = query(ref, orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPosts(list);
      const reactionsMap = {};
      list.forEach(post => { reactionsMap[post.id] = post.reactions || {}; });
      setReactions(reactionsMap);
    } catch (e) { console.log('Erro ao carregar posts:', e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão necessária');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (!result.canceled) setPostImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permissão necessária');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true });
    if (!result.canceled) setPostImage(result.assets[0].uri);
  };

  const createPost = async () => {
    if (!postText.trim() && !postImage) return Alert.alert('Atenção', 'Escreva algo ou adicione uma foto para publicar');
    setPosting(true);
    try {
      let imageUrl = null;
      if (postImage) { setUploadingPhoto(true); imageUrl = await uploadToCloudinary(postImage); setUploadingPhoto(false); }
      const points = calculateTotalPoints(profile?.gamification);
      const badgeLevel = getBadgeLevel(points);
      const userRank = getUserRank(points);
      await addDoc(collection(db, 'socialPosts'), {
        content: postText.trim(), imageUrl, type: postType,
        userId: user.uid, userName: profile?.name || user.displayName || 'Usuário',
        userPhoto: profile?.photoURL || '', userBadge: badgeLevel.icon,
        userRankName: userRank.name, userPoints: points,
        createdAt: new Date().toISOString(), likes: [], reactions: {}, commentCount: 0,
      });
      setPostText(''); setPostImage(null); setPostType('text');
      await loadPosts(true);
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      await showSocialNotification('📱 Nova publicação!', `${profile?.name || 'Usuário'} compartilhou algo no feed!`);
    } catch (e) { Alert.alert('Erro', 'Não foi possível publicar'); }
    finally { setPosting(false); setUploadingPhoto(false); }
  };

  const addReaction = async (postId, reactionType) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const currentReactions = post.reactions || {};
    const userReaction = currentReactions[user.uid];
    let newReactions = { ...currentReactions };
    if (userReaction === reactionType) { delete newReactions[user.uid]; } else { newReactions[user.uid] = reactionType; }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: newReactions } : p));
    setReactions(prev => ({ ...prev, [postId]: newReactions }));
    try {
      await updateDoc(doc(db, 'socialPosts', postId), { reactions: newReactions });
    } catch (e) { loadPosts(true); }
  };

  const toggleLike = async (postId) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    const liked = post.likes?.includes(user.uid);
    const newLikes = liked ? (post.likes || []).filter(id => id !== user.uid) : [...(post.likes || []), user.uid];
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: newLikes } : p));
    try {
      await updateDoc(doc(db, 'socialPosts', postId), { likes: newLikes });
    } catch (e) { loadPosts(true); }
  };

  const loadComments = async (postId) => {
    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const ref = collection(db, 'socialPosts', postId, 'comments');
      const q = query(ref, orderBy('createdAt', 'asc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setPostComments(prev => ({ ...prev, [postId]: list }));
    } catch (e) { console.log('Erro ao carregar comentários:', e); }
    finally { setLoadingComments(prev => ({ ...prev, [postId]: false })); }
  };

  const toggleComments = async (postId) => {
    const nowVisible = !showComments[postId];
    setShowComments(prev => ({ ...prev, [postId]: nowVisible }));
    if (nowVisible && !postComments[postId]) await loadComments(postId);
  };

  const sendComment = async (postId, parentCommentId = null, replyToUser = null) => {
    if (!commentText.trim()) return;
    const text = commentText.trim();
    setCommentText(''); setCommentTarget(null); setReplyTarget(null); setReplyToName('');
    try {
      const targetPost = posts.find(p => p.id === postId);
      await addDoc(collection(db, 'socialPosts', postId, 'comments'), {
        text, userId: user.uid, userName: profile?.name || 'Você', userPhoto: profile?.photoURL || '',
        createdAt: new Date().toISOString(), parentId: parentCommentId || null, replyToUser: replyToUser || null,
      });
      await updateDoc(doc(db, 'socialPosts', postId), { commentCount: (posts.find(p => p.id === postId)?.commentCount || 0) + 1 });
      await loadComments(postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: (p.commentCount || 0) + 1 } : p));
    } catch (e) { Alert.alert('Erro', 'Não foi possível comentar'); }
  };

  const deletePost = async (postId) => {
    Alert.alert('Excluir post', 'Deseja remover esta publicação?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await deleteDoc(doc(db, 'socialPosts', postId));
          setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (e) { Alert.alert('Erro', 'Não foi possível excluir'); }
      }}
    ]);
  };

  const formatTime = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Agora mesmo';
    if (mins < 60) return `${mins}min atrás`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h atrás`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d atrás`;
    return new Date(iso).toLocaleDateString('pt-BR');
  };

  const FriendsTab = () => (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 10, gap: 10 }}>
        <TouchableOpacity 
          onPress={() => setFriendsSubTab('my_friends')}
          style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: friendsSubTab === 'my_friends' ? colors.green : colors.bgCard2 }}
        >
          <Text style={{ color: friendsSubTab === 'my_friends' ? '#000' : colors.textMuted, fontWeight: 'bold' }}>Meus Amigos</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setFriendsSubTab('suggestions')}
          style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: friendsSubTab === 'suggestions' ? colors.green : colors.bgCard2 }}
        >
          <Text style={{ color: friendsSubTab === 'suggestions' ? '#000' : colors.textMuted, fontWeight: 'bold' }}>Sugestões KETO+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {friendsSubTab === 'my_friends' ? (
          <>
            {friendRequests.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>🔔 Pedidos recebidos ({friendRequests.length})</Text>
                {friendRequests.map(req => (
                  <View key={req.fromId} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.green + '44' }}>
                    <Image source={{ uri: req.fromPhoto || 'https://via.placeholder.com/150' }} style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{req.fromName}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>Quer ser seu amigo(a)</Text>
                    </View>
                    <TouchableOpacity onPress={() => respondFriendRequest(req, true)} style={{ backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginRight: 6 }}><Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>Aceitar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => respondFriendRequest(req, false)} style={{ backgroundColor: colors.bgCard2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.border }}><Text style={{ color: colors.textMuted, fontWeight: '600', fontSize: 12 }}>Recusar</Text></TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>🤝 Meus amigos ({friends.length})</Text>
            {friends.map(f => (
              <View key={f.friendId} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border }}>
                <Image source={{ uri: f.friendPhoto || 'https://via.placeholder.com/150' }} style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{f.friendName}</Text>
                  <Text style={{ color: colors.green, fontSize: 11, marginTop: 2 }}>✅ Amigos</Text>
                </View>
                <TouchableOpacity onPress={() => removeFriend(f.friendId)} style={{ padding: 8 }}><Ionicons name="person-remove-outline" size={20} color={colors.textMuted} /></TouchableOpacity>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>✨ Usuários KETO+ Sugeridos</Text>
            {ketoPlusUsers.map(u => (
              <View key={u.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.gold + '44' }}>
                <Image source={{ uri: u.photoURL || 'https://via.placeholder.com/150' }} style={{ width: 46, height: 46, borderRadius: 23, marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>{u.name} {u.subscriptionPlan === 'pro' ? '🚀' : '💎'}</Text>
                  <Text style={{ color: colors.gold, fontSize: 11, marginTop: 2 }}>Membro {u.subscriptionPlan?.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => sendFriendRequest(u.id, u.name, u.photoURL)} style={{ backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 }}><Text style={{ color: '#000', fontWeight: '700', fontSize: 12 }}>Adicionar</Text></TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden translucent backgroundColor="transparent" />
      
      <View style={[styles.header, { backgroundColor: colors.bgCard, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>📱 KETO+ Feed</Text>
        <View style={{ width: 70, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 }}>
          <TouchableOpacity onPress={() => setFeedTab(feedTab === 'feed' ? 'friends' : 'feed')} style={{ padding: 6 }}>
            <Ionicons name={feedTab === 'friends' ? 'people' : 'people-outline'} size={24} color={feedTab === 'friends' ? colors.green : colors.textMuted} />
            {friendRequests.length > 0 && (
              <View style={{ position: 'absolute', top: 2, right: 2, backgroundColor: colors.red, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{friendRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderBottomWidth: 1, borderColor: colors.border }}>
        {[
          { id: 'feed', iconActive: 'newspaper', iconInactive: 'newspaper-outline', label: 'Feed' },
          { id: 'friends', iconActive: 'people', iconInactive: 'people-outline', label: friendRequests.length > 0 ? `Amigos (${friendRequests.length})` : 'Amigos' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderBottomWidth: 2, borderColor: feedTab === tab.id ? colors.green : 'transparent' }}
            onPress={() => setFeedTab(tab.id)}
          >
            <Ionicons name={feedTab === tab.id ? tab.iconActive : tab.iconInactive} size={18} color={feedTab === tab.id ? colors.green : colors.textMuted} />
            <Text style={{ color: feedTab === tab.id ? colors.green : colors.textMuted, fontSize: 13, fontWeight: feedTab === tab.id ? '700' : '400' }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal visible={!!selectedPost} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: colors.border }}>
            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>Publicação</Text>
            <TouchableOpacity onPress={() => setSelectedPost(null)} style={{ padding: 8 }}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {selectedPost && (
              <View style={{ paddingBottom: 40 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                  <Image source={{ uri: selectedPost.userPhoto || 'https://via.placeholder.com/150' }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }} />
                  <View>
                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{selectedPost.userName}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{formatTime(selectedPost.createdAt)}</Text>
                  </View>
                </View>
                {selectedPost.content && <Text style={{ color: colors.text, fontSize: 16, paddingHorizontal: 16, marginBottom: 16 }}>{selectedPost.content}</Text>}
                {selectedPost.imageUrl && <Image source={{ uri: selectedPost.imageUrl }} style={{ width: '100%', height: 400 }} resizeMode="contain" />}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {feedTab === 'friends' ? <FriendsTab /> : (
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={posts}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadPosts(); }} colors={[colors.green]} tintColor={colors.green} />}
          ListHeaderComponent={() => (
            <View style={{ backgroundColor: colors.bgCard, borderBottomWidth: 1, borderColor: colors.border, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}>
                {profile?.photoURL ? <Image source={{ uri: profile.photoURL }} style={{ width: 42, height: 42, borderRadius: 21 }} /> : <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>👤</Text></View>}
                <TouchableOpacity style={{ flex: 1, backgroundColor: colors.bgCard2, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.border }} onPress={() => inputRef.current?.focus()}><Text style={{ color: colors.textMuted, fontSize: 14 }}>{PLACEHOLDERS[postType]}</Text></TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 14, marginBottom: 10 }}>
                {POST_TYPES.map(t => (<TouchableOpacity key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: postType === t.id ? t.color + '33' : colors.bgCard2, borderWidth: 1, borderColor: postType === t.id ? t.color : colors.border, marginRight: 8 }} onPress={() => setPostType(t.id)}><Text style={{ fontSize: 15 }}>{t.icon}</Text><Text style={{ color: postType === t.id ? t.color : colors.textMuted, fontSize: 12, fontWeight: postType === t.id ? '600' : '400' }}>{t.label}</Text></TouchableOpacity>))}
              </ScrollView>
              <View style={{ paddingHorizontal: 14, marginBottom: 10 }}>
                <TextInput ref={inputRef} style={{ backgroundColor: colors.bgCard2, borderRadius: 14, padding: 14, color: colors.text, fontSize: 15, lineHeight: 22, minHeight: 80, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border }} placeholder={PLACEHOLDERS[postType]} placeholderTextColor={colors.textMuted} value={postText} onChangeText={setPostText} multiline maxLength={500} />
                {postText.length > 0 && <Text style={{ color: colors.textMuted, fontSize: 10, textAlign: 'right', marginTop: 4 }}>{postText.length}/500</Text>}
              </View>
              {postImage && (<View style={{ paddingHorizontal: 14, marginBottom: 10, position: 'relative' }}><Image source={{ uri: postImage }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" /><TouchableOpacity style={{ position: 'absolute', top: 8, right: 22, backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }} onPress={() => setPostImage(null)}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity></View>)}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.purple + '22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.purple + '44' }} onPress={pickImage}><Ionicons name="image-outline" size={18} color={colors.purple} /><Text style={{ color: colors.purple, fontSize: 12, fontWeight: '600' }}>Galeria</Text></TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.blue + '22', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.blue + '44' }} onPress={takePhoto}><Ionicons name="camera-outline" size={18} color={colors.blue} /><Text style={{ color: colors.blue, fontSize: 12, fontWeight: '600' }}>Câmera</Text></TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={{ backgroundColor: (!postText.trim() && !postImage) ? colors.bgCard2 : colors.green, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: posting ? 0.6 : 1 }} onPress={createPost} disabled={posting || (!postText.trim() && !postImage)}>
                  {posting ? <ActivityIndicator color="#000" size="small" /> : <><Ionicons name="send" size={15} color={(!postText.trim() && !postImage) ? colors.textMuted : '#000'} /><Text style={{ color: (!postText.trim() && !postImage) ? colors.textMuted : '#000', fontWeight: '700', fontSize: 13 }}>{uploadingPhoto ? 'Enviando...' : 'Publicar'}</Text></>}
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={() => !loading ? (<View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ fontSize: 60, marginBottom: 16 }}>📱</Text><Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Seja o primeiro a publicar!</Text><Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}>Compartilhe sua jornada keto com a comunidade 🥑</Text></View>) : (<View style={{ alignItems: 'center', paddingTop: 40 }}><ActivityIndicator color={colors.green} size="large" /><Text style={{ color: colors.textMuted, marginTop: 12 }}>Carregando feed...</Text></View>)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              user={user}
              profile={profile}
              friendStatuses={friendStatuses}
              sendFriendRequest={sendFriendRequest}
              removeFriend={removeFriend}
              toggleLike={toggleLike}
              addReaction={addReaction}
              toggleComments={toggleComments}
              showComments={showComments}
              postComments={postComments}
              loadingComments={loadingComments}
              commentTarget={commentTarget}
              commentText={commentText}
              setCommentTarget={setCommentTarget}
              setCommentText={setCommentText}
              sendComment={sendComment}
              replyTarget={replyTarget}
              replyToName={replyToName}
              setReplyTarget={setReplyTarget}
              setReplyToName={setReplyToName}
              deletePost={deletePost}
              formatTime={formatTime}
              REACTION_TYPES={REACTION_TYPES}
              colors={colors}
              setSelectedPost={setSelectedPost}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// TELA: DESAFIOS - COM CONVITES E NOTIFICAÇÕES
// ════════════════════════════════════════════════════════════
function ChallengesScreen({ onBack, user, profile, theme }) {
  const [tab, setTab] = useState('discover');
  const [challenges, setChallenges] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearch, setInviteSearch] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invitesReceived, setInvitesReceived] = useState([]);
  const [showInvites, setShowInvites] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'fasting', target: '', duration: '7', emoji: '🏆' });
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  const CHALLENGE_EMOJIS = ['🏆', '🔥', '💪', '⚡', '🌙', '👣', '🥑', '💧', '🎯', '🚀', '🏃', '🚴', '🥇', '⭐', '✨'];
  const CHALLENGE_TYPES = [
    { id: 'fasting', label: 'Jejum', icon: '⏱️', desc: 'Dias completando jejum', unit: 'jejuns', color: colors.purple },
    { id: 'steps', label: 'Passos', icon: '👣', desc: 'Total de passos acumulados', unit: 'passos', color: colors.green },
    { id: 'workouts', label: 'Treinos', icon: '💪', desc: 'Treinos em casa concluídos', unit: 'treinos', color: colors.blue },
    { id: 'water', label: 'Hidratação', icon: '💧', desc: 'Copos de água por dia', unit: 'copos', color: '#3B82F6' },
    { id: 'calories', label: 'Calorias', icon: '🔥', desc: 'Calorias queimadas', unit: 'kcal', color: colors.accent },
    { id: 'distance', label: 'Distância', icon: '📏', desc: 'Distância percorrida', unit: 'km', color: colors.green },
  ];

  useEffect(() => { loadAll(); loadInvites(); }, []);

  const loadInvites = async () => {
    if (!user) return;
    try {
      const invitesRef = collection(db, 'users', user.uid, 'challengeInvites');
      const q = query(invitesRef, where('status', '==', 'pending'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setInvitesReceived(list);
    } catch (e) { console.log('Erro ao carregar convites:', e); }
  };

  const loadAll = async () => {
    setLoading(true);
    try { await Promise.all([loadChallenges(), loadMyChallenges()]); }
    finally { setLoading(false); }
  };

  const loadChallenges = async () => {
    try {
      const ref = collection(db, 'challenges');
      const q = query(ref, where('status', '==', 'active'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setChallenges(list);
    } catch (e) { console.log('Erro ao carregar desafios:', e); }
  };

  const loadMyChallenges = async () => {
    if (!user) return;
    try {
      const ref = collection(db, 'users', user.uid, 'participatingChallenges');
      const snap = await getDocs(ref);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setMyChallenges(list);
    } catch (e) { console.log('Erro ao carregar meus desafios:', e); }
  };

  const searchUsers = async (text) => {
    if (text.length < 2) { setInviteResults([]); return; }
    setInviteLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('name', '>=', text), where('name', '<=', text + '\uf8ff'), limit(10));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => {
        if (d.id !== user.uid) {
          list.push({ id: d.id, name: d.data().name || 'Usuário', photoURL: d.data().photoURL });
        }
      });
      setInviteResults(list);
    } catch (e) { console.log('Erro ao buscar usuários:', e); }
    finally { setInviteLoading(false); }
  };

  const sendChallengeInvite = async (challengeId, targetUserId, targetName, targetPhoto) => {
    setInviting(true);
    try {
      // Enviar convite para o usuário
      await setDoc(doc(db, 'users', targetUserId, 'challengeInvites', challengeId), {
        challengeId,
        challengeName: challenges.find(c => c.id === challengeId)?.name || 'Desafio',
        fromId: user.uid,
        fromName: profile?.name || user.displayName || 'Usuário',
        fromPhoto: profile?.photoURL || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      
      // Notificar o usuário
      await showChallengeNotification(
        '🎯 Novo Convite para Desafio!',
        `${profile?.name || 'Usuário'} te convidou para participar do desafio "${challenges.find(c => c.id === challengeId)?.name}"!`,
        { challengeId, action: 'invite' }
      );
      
      Alert.alert('✅ Convite enviado!', `Convite enviado para ${targetName}!`);
      setShowInviteModal(false);
      setInviteSearch('');
      setInviteResults([]);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível enviar o convite.');
    } finally {
      setInviting(false);
    }
  };

  const acceptInvite = async (invite) => {
    try {
      // Adicionar usuário ao desafio
      const challengeRef = doc(db, 'challenges', invite.challengeId);
      await updateDoc(challengeRef, { 
        participants: arrayUnion(user.uid),
        leaderboard: arrayUnion({ userId: user.uid, name: profile?.name || 'Usuário', photoURL: profile?.photoURL || '', progress: 0 })
      });
      
      // Adicionar aos desafios do usuário
      await addDoc(collection(db, 'users', user.uid, 'participatingChallenges'), {
        challengeId: invite.challengeId,
        name: invite.challengeName,
        emoji: '🏆',
        type: 'fasting',
        target: 0,
        duration: 7,
        progress: 0,
        joinedAt: new Date().toISOString()
      });
      
      // Remover convite
      await deleteDoc(doc(db, 'users', user.uid, 'challengeInvites', invite.challengeId));
      
      // Notificar quem convidou
      await showChallengeNotification(
        '✅ Convite Aceito!',
        `${profile?.name || 'Usuário'} aceitou seu convite para o desafio "${invite.challengeName}"!`,
        { challengeId: invite.challengeId, action: 'accepted' }
      );
      
      await loadAll();
      await loadInvites();
      Alert.alert('🎉 Desafio aceito!', `Você agora participa do desafio "${invite.challengeName}"!`);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível aceitar o convite.');
    }
  };

  const declineInvite = async (invite) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'challengeInvites', invite.challengeId));
      await loadInvites();
      Alert.alert('Convite recusado');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível recusar o convite.');
    }
  };

  const postChallengeToFeed = async (challenge) => {
    try {
      const points = calculateTotalPoints(profile?.gamification);
      const badgeLevel = getBadgeLevel(points);
      const userRank = getUserRank(points);
      
      await addDoc(collection(db, 'socialPosts'), {
        content: `🏆 Acabei de criar um novo desafio!\n\n📌 "${challenge.name}"\n🎯 ${challenge.target} ${challenge.unit || 'pontos'} em ${challenge.duration} dias\n\n👥 Quem topa participar?`,
        imageUrl: null,
        type: 'challenge',
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Usuário',
        userPhoto: profile?.photoURL || '',
        userBadge: badgeLevel.icon,
        userRankName: userRank.name,
        userPoints: points,
        challengeId: challenge.id,
        challengeName: challenge.name,
        createdAt: new Date().toISOString(),
        likes: [],
        reactions: {},
        commentCount: 0,
      });
      
      await showSocialNotification('🏆 Novo Desafio!', `${profile?.name || 'Usuário'} criou um novo desafio: ${challenge.name}`);
      Alert.alert('✅ Compartilhado!', 'Seu desafio foi publicado no Feed Social!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível compartilhar no feed.');
    }
  };

  const createChallenge = async () => {
    if (!form.name.trim()) return Alert.alert('Atenção', 'Dê um nome ao desafio');
    if (!form.target || parseInt(form.target) <= 0) return Alert.alert('Atenção', 'Defina uma meta válida');
    setSubmitting(true);
    try {
      const typeInfo = CHALLENGE_TYPES.find(t => t.id === form.type);
      const data = {
        name: form.name.trim(),
        description: form.description.trim(),
        type: form.type,
        target: parseInt(form.target),
        duration: parseInt(form.duration),
        status: 'active',
        emoji: form.emoji,
        unit: typeInfo.unit,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        creatorName: profile?.name || 'Usuário',
        participants: [user.uid],
        leaderboard: [{ userId: user.uid, name: profile?.name || 'Você', photoURL: profile?.photoURL || '', progress: 0 }],
        endsAt: new Date(Date.now() + parseInt(form.duration) * 86400000).toISOString(),
      };
      const docRef = await addDoc(collection(db, 'challenges'), data);
      await addDoc(collection(db, 'users', user.uid, 'participatingChallenges'), { challengeId: docRef.id, name: form.name.trim(), emoji: form.emoji, type: form.type, target: parseInt(form.target), duration: parseInt(form.duration), progress: 0, joinedAt: new Date().toISOString() });
      
      const newChallenge = { id: docRef.id, ...data };
      setForm({ name: '', description: '', type: 'fasting', target: '', duration: '7', emoji: '🏆' });
      setTab('mine');
      await loadAll();
      
      // Perguntar se quer compartilhar no Feed
      Alert.alert(
        '🎉 Desafio criado!',
        'Deseja compartilhar este desafio no Feed Social para convidar amigos?',
        [
          { text: 'Agora não', style: 'cancel' },
          { text: '📱 Compartilhar', onPress: () => postChallengeToFeed(newChallenge) }
        ]
      );
    } catch (e) { Alert.alert('Erro', 'Não foi possível criar o desafio'); }
    finally { setSubmitting(false); }
  };

  const joinChallenge = async (challenge) => {
    const alreadyIn = challenge.participants?.includes(user.uid);
    if (alreadyIn) return Alert.alert('Você já participa deste desafio!');
    try {
      const ref = doc(db, 'challenges', challenge.id);
      await updateDoc(ref, { participants: arrayUnion(user.uid), leaderboard: arrayUnion({ userId: user.uid, name: profile?.name || 'Você', photoURL: profile?.photoURL || '', progress: 0 }) });
      await addDoc(collection(db, 'users', user.uid, 'participatingChallenges'), { challengeId: challenge.id, name: challenge.name, emoji: challenge.emoji || '🏆', type: challenge.type, target: challenge.target, duration: challenge.duration, progress: 0, joinedAt: new Date().toISOString() });
      await loadAll();
      setShowDetail(false);
      Alert.alert('🎉 Você entrou!', `Boa sorte no desafio "${challenge.name}"!`);
    } catch (e) { Alert.alert('Erro', 'Não foi possível entrar no desafio'); }
  };

  const updateProgress = async (challengeId, newProgress) => {
    try {
      const challengeRef = doc(db, 'challenges', challengeId);
      const snap = await getDoc(challengeRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const lb = (data.leaderboard || []).map(p => p.userId === user.uid ? { ...p, progress: newProgress } : p);
      await updateDoc(challengeRef, { leaderboard: lb });
      const myRef = collection(db, 'users', user.uid, 'participatingChallenges');
      const mySnap = await getDocs(myRef);
      mySnap.forEach(async (d) => { if (d.data().challengeId === challengeId) await updateDoc(doc(db, 'users', user.uid, 'participatingChallenges', d.id), { progress: newProgress }); });
      await loadAll();
      
      const challenge = challenges.find(c => c.id === challengeId);
      if (challenge && newProgress >= challenge.target) {
        Alert.alert('🏆 Desafio Concluído!', `Parabéns! Você completou o desafio "${challenge.name}"! 🎉`, [
          { text: 'Compartilhar!', onPress: () => shareChallengeCompletion(challenge, newProgress) },
          { text: 'Fechar' }
        ]);
      } else {
        Alert.alert('✅ Progresso atualizado!');
      }
    } catch (e) { Alert.alert('Erro', 'Não foi possível atualizar'); }
  };

  const shareChallengeCompletion = async (challenge, progress) => {
    Alert.alert('Compartilhar', 'Onde deseja compartilhar sua conquista?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📱 Feed Interno', onPress: () => shareChallengeInternal(challenge, progress) },
      { text: '🌐 Externo', onPress: () => shareChallengeExternal(challenge, progress) },
    ]);
  };

  const shareChallengeInternal = async (challenge, progress) => {
    try {
      const points = calculateTotalPoints(profile?.gamification);
      const badgeLevel = getBadgeLevel(points);
      const userRank = getUserRank(points);
      await addDoc(collection(db, 'socialPosts'), {
        content: `🎉 Completei o desafio "${challenge.name}"!\n\n🏆 Meta: ${challenge.target} ${challenge.unit || 'pontos'}\n✨ Conquista alcançada com sucesso!`,
        imageUrl: null,
        type: 'achievement',
        userId: user.uid,
        userName: profile?.name || user.displayName || 'Usuário',
        userPhoto: profile?.photoURL || '',
        userBadge: badgeLevel.icon,
        userRankName: userRank.name,
        userPoints: points,
        createdAt: new Date().toISOString(),
        likes: [],
        reactions: {},
        commentCount: 0,
      });
      await showSocialNotification('🏆 Nova Conquista!', `${profile?.name || 'Usuário'} completou um desafio!`);
      Alert.alert('✅ Sucesso!', 'Sua conquista foi compartilhada no Feed Social!');
    } catch (e) { Alert.alert('Erro', 'Não foi possível compartilhar'); }
  };

  const shareChallengeExternal = async (challenge, progress) => {
    try {
      await Share.share({ message: `🏆 Completei o desafio "${challenge.name}" no KETO+!\n\nMeta: ${challenge.target} ${challenge.unit || 'pontos'}\n\n#KetoPlus #Desafio #Fitness` });
    } catch (e) { Alert.alert('Erro', 'Não foi possível compartilhar'); }
  };

  const getDaysRemaining = (endsAt) => {
    if (!endsAt) return '?';
    const diff = new Date(endsAt) - new Date();
    const days = Math.ceil(diff / 86400000);
    return days > 0 ? days : 0;
  };

  const getMyProgress = (challenge) => {
    const entry = challenge.leaderboard?.find(p => p.userId === user.uid);
    return entry?.progress || 0;
  };

  const isParticipant = (challenge) => challenge.participants?.includes(user.uid);

  const getSortedLeaderboard = (challenge) => [...(challenge.leaderboard || [])].sort((a, b) => b.progress - a.progress);

  const typeInfo = (typeId) => CHALLENGE_TYPES.find(t => t.id === typeId) || CHALLENGE_TYPES[0];

  const InviteModal = () => (
    <Modal visible={showInviteModal} animationType="slide" transparent={true}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: colors.bgCard, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>👥 Convidar Amigos</Text>
            <TouchableOpacity onPress={() => { setShowInviteModal(false); setInviteSearch(''); setInviteResults([]); }}>
              <Text style={{ color: colors.textMuted, fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={[styles.input, { backgroundColor: colors.bgCard2, borderColor: colors.border, color: colors.text, marginBottom: 12 }]}
            placeholder="Buscar por nome..."
            placeholderTextColor={colors.textMuted}
            value={inviteSearch}
            onChangeText={(text) => { setInviteSearch(text); searchUsers(text); }}
          />
          
          {inviteLoading && <ActivityIndicator color={colors.green} style={{ marginVertical: 20 }} />}
          
          <ScrollView style={{ maxHeight: 400 }}>
            {inviteResults.map(u => (
              <TouchableOpacity
                key={u.id}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: colors.border }}
                onPress={() => sendChallengeInvite(selectedChallenge?.id, u.id, u.name, u.photoURL)}
                disabled={inviting}
              >
                {u.photoURL
                  ? <Image source={{ uri: u.photoURL }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12 }} />
                  : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Text style={{ fontSize: 18 }}>👤</Text></View>
                }
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{u.name}</Text>
                </View>
                <Btn label={inviting ? '...' : 'Convidar'} onPress={() => sendChallengeInvite(selectedChallenge?.id, u.id, u.name, u.photoURL)} variant="primary" theme={theme} style={{ paddingVertical: 6, paddingHorizontal: 12 }} />
              </TouchableOpacity>
            ))}
            {inviteResults.length === 0 && inviteSearch.length > 1 && !inviteLoading && (
              <Text style={{ color: colors.textMuted, textAlign: 'center', padding: 20 }}>Nenhum usuário encontrado</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const InvitesTab = () => (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 12 }}>
        🎯 Convites Recebidos ({invitesReceived.length})
      </Text>
      {invitesReceived.length === 0 ? (
        <Card theme={theme} style={{ alignItems: 'center', padding: 40 }}>
          <Text style={{ fontSize: 50, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: colors.text, textAlign: 'center' }}>Nenhum convite pendente</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8 }}>Quando alguém te convidar, aparecerá aqui</Text>
        </Card>
      ) : (
        invitesReceived.map(invite => (
          <Card key={invite.id} theme={theme} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              {invite.fromPhoto
                ? <Image source={{ uri: invite.fromPhoto }} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} />
                : <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}><Text style={{ fontSize: 24 }}>👤</Text></View>
              }
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{invite.fromName}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>te convidou para</Text>
                <Text style={{ color: colors.accent, fontWeight: '600' }}>🏆 {invite.challengeName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Btn label="✅ Aceitar" onPress={() => acceptInvite(invite)} variant="primary" style={{ flex: 1 }} theme={theme} />
              <Btn label="❌ Recusar" onPress={() => declineInvite(invite)} variant="secondary" style={{ flex: 1 }} theme={theme} />
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );

  if (showDetail && selectedChallenge) {
    const challenge = selectedChallenge;
    const ti = typeInfo(challenge.type);
    const myProg = getMyProgress(challenge);
    const pct = Math.min((myProg / challenge.target) * 100, 100);
    const lb = getSortedLeaderboard(challenge);
    const amIn = isParticipant(challenge);
    const daysLeft = getDaysRemaining(challenge.endsAt);
    const isCreator = challenge.createdBy === user?.uid;

    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
        <StatusBar hidden translucent backgroundColor="transparent" />
        <Header title={`${challenge.emoji || '🏆'} ${challenge.name}`} onBack={() => { setShowDetail(false); setSelectedChallenge(null); }} theme={theme} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ borderRadius: 20, padding: 20, marginBottom: 16, backgroundColor: ti.color + '22', borderWidth: 1, borderColor: ti.color + '55', alignItems: 'center' }}>
            <Text style={{ fontSize: 52, marginBottom: 8 }}>{challenge.emoji || '🏆'}</Text>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center' }}>{challenge.name}</Text>
            {challenge.description && <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>{challenge.description}</Text>}
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
              <View style={{ alignItems: 'center' }}><Text style={{ color: ti.color, fontSize: 22, fontWeight: '900' }}>{challenge.target}</Text><Text style={{ color: colors.textMuted, fontSize: 11 }}>{ti.unit}</Text></View>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ alignItems: 'center' }}><Text style={{ color: ti.color, fontSize: 22, fontWeight: '900' }}>{challenge.duration}</Text><Text style={{ color: colors.textMuted, fontSize: 11 }}>dias</Text></View>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ alignItems: 'center' }}><Text style={{ color: ti.color, fontSize: 22, fontWeight: '900' }}>{daysLeft}</Text><Text style={{ color: colors.textMuted, fontSize: 11 }}>restantes</Text></View>
              <View style={{ width: 1, backgroundColor: colors.border }} />
              <View style={{ alignItems: 'center' }}><Text style={{ color: ti.color, fontSize: 22, fontWeight: '900' }}>{challenge.participants?.length || 1}</Text><Text style={{ color: colors.textMuted, fontSize: 11 }}>atletas</Text></View>
            </View>
            {isCreator && <View style={{ marginTop: 10, backgroundColor: colors.gold + '22', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 }}><Text style={{ color: colors.gold, fontSize: 11 }}>👑 Criador do desafio</Text></View>}
          </View>

          {amIn && (
            <Card theme={theme} style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 12 }}>📊 Meu Progresso</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><Text style={{ color: colors.textMuted, fontSize: 13 }}>{myProg} / {challenge.target} {ti.unit}</Text><Text style={{ color: ti.color, fontWeight: '700' }}>{pct.toFixed(0)}%</Text></View>
              <View style={{ height: 10, backgroundColor: colors.bgCard2, borderRadius: 5, overflow: 'hidden' }}><View style={{ width: `${pct}%`, height: '100%', backgroundColor: ti.color, borderRadius: 5 }} /></View>
              {pct >= 100 && (<View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}><Text style={{ fontSize: 18 }}>🎉</Text><Text style={{ color: colors.green, fontWeight: '700' }}>Meta atingida! Parabéns!</Text></View>)}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                {[1, 5, 10].map(inc => (<TouchableOpacity key={inc} style={{ flex: 1, backgroundColor: ti.color + '22', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: ti.color + '55' }} onPress={() => updateProgress(challenge.id, myProg + inc)}><Text style={{ color: ti.color, fontWeight: '700' }}>+{inc}</Text><Text style={{ color: colors.textMuted, fontSize: 10 }}>{ti.unit}</Text></TouchableOpacity>))}
              </View>
            </Card>
          )}

          <Card theme={theme} style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 14 }}>🏆 Placar do Desafio</Text>
            {lb.length === 0 ? <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Nenhum participante ainda</Text> : lb.map((p, i) => {
              const progPct = Math.min((p.progress / challenge.target) * 100, 100);
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}°`;
              const isMe = p.userId === user.uid;
              return (<View key={p.userId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: isMe ? ti.color + '18' : 'transparent', borderRadius: 10, padding: isMe ? 8 : 0, borderWidth: isMe ? 1 : 0, borderColor: isMe ? ti.color + '44' : 'transparent' }}>
                <Text style={{ fontSize: 20, width: 36, textAlign: 'center' }}>{medal}</Text>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgCard2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>{p.photoURL ? <Image source={{ uri: p.photoURL }} style={{ width: 36, height: 36, borderRadius: 18 }} /> : <Text style={{ fontSize: 16 }}>👤</Text>}</View>
                <View style={{ flex: 1 }}><Text style={{ color: colors.text, fontWeight: isMe ? '700' : '500', fontSize: 13 }}>{p.name}{isMe ? ' (você)' : ''}</Text><View style={{ height: 4, backgroundColor: colors.bgCard2, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}><View style={{ width: `${progPct}%`, height: '100%', backgroundColor: ti.color, borderRadius: 2 }} /></View></View>
                <Text style={{ color: ti.color, fontWeight: '700', marginLeft: 8 }}>{p.progress}</Text>
              </View>);
            })}
          </Card>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            {!amIn ? (
              <Btn label="🚀 Participar do Desafio" onPress={() => joinChallenge(challenge)} variant="primary" style={{ flex: 1 }} theme={theme} />
            ) : (
              <View style={{ flex: 1, backgroundColor: colors.green + '22', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.green + '44' }}>
                <Text style={{ color: colors.green, fontWeight: '700' }}>✅ Você já está participando</Text>
              </View>
            )}
            
            {amIn && isCreator && (
              <Btn label="👥 Convidar" onPress={() => { setShowInviteModal(true); }} variant="accent" style={{ flex: 1 }} theme={theme} />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }

  const TabBar = () => (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bgCard, borderBottomWidth: 1, borderColor: colors.border }}>
      {[
        { id: 'discover', icon: '🌟', label: 'Descobrir' },
        { id: 'mine', icon: '🎯', label: 'Meus' },
        { id: 'create', icon: '➕', label: 'Criar' },
        { id: 'invites', icon: '📬', label: invitesReceived.length > 0 ? `Convites (${invitesReceived.length})` : 'Convites' },
      ].map(t => (
        <TouchableOpacity 
          key={t.id} 
          style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: tab === t.id ? 3 : 0, borderColor: colors.green }} 
          onPress={() => setTab(t.id)}
        >
          <Text style={{ fontSize: 18 }}>{t.icon}</Text>
          <Text style={{ color: tab === t.id ? colors.green : colors.textMuted, fontSize: 10, fontWeight: tab === t.id ? '700' : '400', marginTop: 2 }}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const ChallengeCard = ({ challenge }) => {
    const ti = typeInfo(challenge.type);
    const amIn = isParticipant(challenge);
    const daysLeft = getDaysRemaining(challenge.endsAt);
    const myProg = getMyProgress(challenge);
    const pct = Math.min((myProg / challenge.target) * 100, 100);
    const lb = getSortedLeaderboard(challenge);
    const leader = lb[0];
    const isCreator = challenge.createdBy === user?.uid;

    return (
      <TouchableOpacity 
        style={{ backgroundColor: colors.bgCard, borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: amIn ? ti.color + '66' : colors.border, overflow: 'hidden' }} 
        onPress={() => { setSelectedChallenge(challenge); setShowDetail(true); }} 
        activeOpacity={0.85}
      >
        <View style={{ backgroundColor: ti.color + '22', padding: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 36, marginRight: 12 }}>{challenge.emoji || '🏆'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '800' }}>{challenge.name}</Text>
            {challenge.description && <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>{challenge.description}</Text>}
          </View>
          {amIn && <View style={{ backgroundColor: colors.green, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={{ color: '#000', fontSize: 10, fontWeight: '700' }}>✓ INSCRITO</Text></View>}
          {isCreator && <View style={{ backgroundColor: colors.gold + '44', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 6 }}><Text style={{ color: colors.gold, fontSize: 10, fontWeight: '700' }}>👑 CRIADOR</Text></View>}
        </View>
        <View style={{ padding: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1, backgroundColor: colors.bgCard2, borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: ti.color, fontWeight: '800', fontSize: 16 }}>{challenge.target}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>{ti.unit}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.bgCard2, borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: ti.color, fontWeight: '800', fontSize: 16 }}>{daysLeft}d</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>restantes</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: colors.bgCard2, borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: ti.color, fontWeight: '800', fontSize: 16 }}>{challenge.participants?.length || 1}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 10 }}>atletas</Text>
            </View>
          </View>
          {amIn && (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: colors.textMuted, fontSize: 11 }}>Meu progresso</Text>
                <Text style={{ color: ti.color, fontWeight: '700', fontSize: 11 }}>{myProg}/{challenge.target} · {pct.toFixed(0)}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: colors.bgCard2, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: '100%', backgroundColor: ti.color, borderRadius: 3 }} />
              </View>
            </View>
          )}
          {leader && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>👑</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Liderando: <Text style={{ color: colors.text, fontWeight: '600' }}>{leader.name}</Text> com {leader.progress} {ti.unit}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
            <Text style={{ fontSize: 14 }}>{ti.icon}</Text>
            <Text style={{ color: ti.color, fontSize: 12, fontWeight: '600' }}>{ti.label}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11 }}>· Por {challenge.creatorName || 'Usuário'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden translucent backgroundColor="transparent" />
      <Header 
        title="🏆 Desafios" 
        onBack={onBack} 
        theme={theme} 
        rightAction={
          <TouchableOpacity onPress={loadAll} style={{ padding: 8 }}>
            <Ionicons name="refresh-outline" size={22} color={colors.green} />
          </TouchableOpacity>
        } 
      />
      <TabBar />
      <InviteModal />

      {tab === 'discover' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {loading ? (
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <ActivityIndicator color={colors.green} size="large" />
              <Text style={{ color: colors.textMuted, marginTop: 12 }}>Carregando desafios...</Text>
            </View>
          ) : challenges.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 60 }}>🏆</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Nenhum desafio ativo</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>Seja o primeiro a criar um desafio!</Text>
              <TouchableOpacity style={{ marginTop: 20, backgroundColor: colors.green, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }} onPress={() => setTab('create')}>
                <Text style={{ color: '#000', fontWeight: '700' }}>➕ Criar Desafio</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
                {challenges.length} desafio{challenges.length !== 1 ? 's' : ''} ativo{challenges.length !== 1 ? 's' : ''}
              </Text>
              {challenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
            </>
          )}
        </ScrollView>
      )}

      {tab === 'mine' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {loading ? (
            <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
          ) : myChallenges.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 60 }}>🎯</Text>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 12 }}>Você não está em nenhum desafio</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>Participe de um desafio ou crie o seu!</Text>
              <TouchableOpacity style={{ marginTop: 20, backgroundColor: colors.green, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }} onPress={() => setTab('discover')}>
                <Text style={{ color: '#000', fontWeight: '700' }}>🌟 Descobrir Desafios</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>
                {myChallenges.length} desafio{myChallenges.length !== 1 ? 's' : ''} em andamento
              </Text>
              {myChallenges.map(mc => {
                const fullChallenge = challenges.find(c => c.id === mc.challengeId);
                const ti = typeInfo(mc.type);
                const pct = Math.min(((mc.progress || 0) / mc.target) * 100, 100);
                if (fullChallenge) return <ChallengeCard key={mc.id} challenge={fullChallenge} />;
                return (
                  <Card key={mc.id} theme={theme} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={{ fontSize: 28, marginRight: 10 }}>{mc.emoji || '🏆'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{mc.name}</Text>
                        <Text style={{ color: colors.textMuted, fontSize: 11 }}>{ti.icon} {ti.label} · {mc.duration} dias</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>{mc.progress || 0}/{mc.target} {ti.unit}</Text>
                      <Text style={{ color: ti.color, fontWeight: '700', fontSize: 12 }}>{pct.toFixed(0)}%</Text>
                    </View>
                    <View style={{ height: 6, backgroundColor: colors.bgCard2, borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: ti.color, borderRadius: 3 }} />
                    </View>
                  </Card>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      {tab === 'create' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
            Crie um desafio para você e seus amigos. Defina a meta, o tipo de atividade e a duração.
          </Text>
          <Card theme={theme} style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 10 }}>Ícone do Desafio</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {CHALLENGE_EMOJIS.map(e => (
                <TouchableOpacity 
                  key={e} 
                  style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: form.emoji === e ? colors.green + '33' : colors.bgCard2, borderWidth: form.emoji === e ? 2 : 1, borderColor: form.emoji === e ? colors.green : colors.border }} 
                  onPress={() => setForm({ ...form, emoji: e })}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
          <Input label="Nome do desafio *" value={form.name} onChangeText={v => setForm({ ...form, name: v })} placeholder="Ex: 30 dias de jejum" theme={theme} />
          <Input label="Descrição (opcional)" value={form.description} onChangeText={v => setForm({ ...form, description: v })} placeholder="Descreva o desafio..." theme={theme} multiline />
          <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '700', marginBottom: 10 }}>Tipo de Atividade *</Text>
          <View style={{ gap: 8, marginBottom: 14 }}>
            {CHALLENGE_TYPES.map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, backgroundColor: form.type === t.id ? t.color + '22' : colors.bgCard, borderWidth: 1, borderColor: form.type === t.id ? t.color : colors.border }} 
                onPress={() => setForm({ ...form, type: t.id })}
              >
                <Text style={{ fontSize: 22, marginRight: 12 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: form.type === t.id ? t.color : colors.text, fontWeight: '600' }}>{t.label}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{t.desc}</Text>
                </View>
                {form.type === t.id && <Ionicons name="checkmark-circle" size={20} color={t.color} />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Input label="Meta *" value={form.target} onChangeText={v => setForm({ ...form, target: v })} placeholder="Ex: 10" keyboardType="numeric" theme={theme} /></View>
            <View style={{ flex: 1 }}><Input label="Duração (dias)" value={form.duration} onChangeText={v => setForm({ ...form, duration: v })} placeholder="7" keyboardType="numeric" theme={theme} /></View>
          </View>
          {form.name && (
            <Card theme={theme} style={{ marginBottom: 16, borderColor: colors.green + '44', borderWidth: 1 }}>
              <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 8 }}>PREVIEW</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 32 }}>{form.emoji}</Text>
                <View>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>{form.name || 'Nome do desafio'}</Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>{typeInfo(form.type).icon} {form.target || '?'} {typeInfo(form.type).unit} em {form.duration || '7'} dias</Text>
                </View>
              </View>
            </Card>
          )}
          <Btn label={submitting ? 'Criando desafio...' : `${form.emoji} Criar Desafio`} onPress={createChallenge} loading={submitting} variant="primary" theme={theme} />
        </ScrollView>
      )}

      {tab === 'invites' && <InvitesTab />}
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// HOOK: JEJUM PERSISTENTE
function sendFastingCompletedAlert(fastingType) {
  try {
    Alert.alert(
      '🎉 Jejum Concluído!',
      `Parabéns! Você completou o jejum ${fastingType?.label || ''}!\n\nHora de se alimentar de forma saudável. 🥑`,
      [{ text: 'Arrasou! 💪' }]
    );
    Vibration.vibrate([400, 200, 400, 200, 800]);
    playFastingCompleteSound();
  } catch (e) {
    console.log('Erro ao exibir alerta de jejum:', e);
  }
}

function useFastingTimer() {
  const [selectedType, setSelectedType] = useState(FASTING_TYPES[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const intervalRef = useRef(null);
  const ongoingNotifRef = useRef(null);
  const startTimeRef = useRef(null);
  const elapsedOnPauseRef = useRef(0);
  const notificationSentRef = useRef(false);

  useEffect(() => {
    loadFastingState();
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      clearInterval(intervalRef.current);
      if (ongoingNotifRef.current) clearInterval(ongoingNotifRef.current);
    };
  }, []);

  useEffect(() => {
    let backgroundCheckInterval;
    const checkCompletion = async () => {
      if (startTimeRef.current && isRunning) {
        const now = Date.now();
        const currentElapsed = elapsedOnPauseRef.current + Math.floor((now - startTimeRef.current) / 1000);
        const targetSeconds = selectedType.fast * 3600;
        if (currentElapsed >= targetSeconds && !notificationSentRef.current) {
          notificationSentRef.current = true;
          sendFastingCompletedAlert(selectedType);
          await stop();
          const user = auth.currentUser;
          if (user) {
            await updateGamification(user.uid, 'fasting');
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const currentDays = userSnap.data().fastingDays || 0;
              await updateDoc(userRef, { fastingDays: currentDays + 1 });
              const fastingHistory = userSnap.data().fastingHistory || [];
              fastingHistory.push({
                label: selectedType.label,
                duration: formatDuration(currentElapsed),
                date: new Date().toISOString(),
              });
              await updateDoc(userRef, { fastingHistory });
              setCompletedCount(c => c + 1);
            }
          }
        }
      }
    };
    backgroundCheckInterval = setInterval(checkCompletion, 5000);
    return () => { if (backgroundCheckInterval) clearInterval(backgroundCheckInterval); };
  }, [isRunning, selectedType]);

  async function loadFastingState() {
    try {
      const [typeId, running, startTime, pausedElapsed, notificationSent] = await Promise.all([
        AsyncStorage.getItem(FASTING_KEYS.TYPE_ID),
        AsyncStorage.getItem(FASTING_KEYS.IS_RUNNING),
        AsyncStorage.getItem(FASTING_KEYS.START_TIME),
        AsyncStorage.getItem(FASTING_KEYS.ELAPSED_ON_PAUSE),
        AsyncStorage.getItem(FASTING_KEYS.NOTIFICATION_SENT),
      ]);

      const savedType = FASTING_TYPES.find(t => t.id === typeId) || FASTING_TYPES[0];
      setSelectedType(savedType);

      const pausedSecs = parseFloat(pausedElapsed || '0');
      elapsedOnPauseRef.current = pausedSecs;
      notificationSentRef.current = notificationSent === 'true';

      if (running === 'true' && startTime) {
        const start = parseInt(startTime, 10);
        startTimeRef.current = start;
        const currentElapsed = pausedSecs + Math.floor((Date.now() - start) / 1000);
        setElapsed(currentElapsed);

        const targetSeconds = savedType.fast * 3600;
        if (currentElapsed >= targetSeconds && !notificationSentRef.current) {
          notificationSentRef.current = true;
          sendFastingCompletedAlert(savedType);
          setIsRunning(false);
          await cancelFastingOngoingNotification();
          try {
            const u = auth.currentUser;
            if (u) {
              await updateGamification(u.uid, 'fasting');
              const userRef = doc(db, 'users', u.uid);
              const userSnap = await getDoc(userRef);
              if (userSnap.exists()) {
                const currentDays = userSnap.data().fastingDays || 0;
                await updateDoc(userRef, { fastingDays: currentDays + 1 });
                const fastingHistory = userSnap.data().fastingHistory || [];
                fastingHistory.push({
                  label: savedType.label,
                  duration: formatDuration(currentElapsed),
                  date: new Date().toISOString(),
                });
                await updateDoc(userRef, { fastingHistory });
                setCompletedCount(c => c + 1);
              }
            }
          } catch (e) { console.log('Erro ao salvar fastingDays (loadState):', e); }
        } else {
          setIsRunning(true);
          startInterval(savedType, pausedSecs);
        }
      } else {
        setElapsed(pausedSecs);
        setIsRunning(false);
      }
    } catch (e) { console.log('Erro ao carregar jejum:', e); }
  }

  function handleAppStateChange(nextState) {
    if (nextState === 'active' && startTimeRef.current) {
      const currentElapsed = elapsedOnPauseRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(currentElapsed);
    }
  }

  // ✅ CORREÇÃO 3: Remover a lógica de ongoing baseada em setInterval
  // No useFastingTimer, SIMPLIFIQUE o startInterval assim:

  function startInterval(type, pausedSecs) {
    clearInterval(intervalRef.current);
    if (ongoingNotifRef.current) clearInterval(ongoingNotifRef.current);

    // Só atualiza o timer no UI — sem tentativas de notificação contínua via JS
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const currentElapsed =
          elapsedOnPauseRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(currentElapsed);
      }
    }, 1000);

    // Mostra UMA notificação de status ao iniciar (não em loop)
    setTimeout(() => {
      if (startTimeRef.current) {
        const currentElapsed =
          elapsedOnPauseRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000);
        const tgt = (type || selectedType).fast * 3600;
        const lbl = (type || selectedType).label;
        showFastingOngoingNotification(currentElapsed, tgt, lbl);
      }
    }, 1500);
  }

  // Dentro do useFastingTimer hook, modifique a função start:

  async function start() {
    const now = Date.now();
    startTimeRef.current = now;
    elapsedOnPauseRef.current = 0;
    notificationSentRef.current = false;
    setElapsed(0);
    setIsRunning(true);
    startInterval(selectedType, 0);
    Vibration.vibrate(200);

    const targetSeconds = selectedType.fast * 3600;
    await scheduleFastingCompleteNotification(targetSeconds, selectedType.label);
    
    // ✅ ADICIONE: Inicia atualizações em background
    await startBackgroundFastingUpdates(0, targetSeconds, selectedType.label);

    await AsyncStorage.multiSet([
      [FASTING_KEYS.IS_RUNNING, 'true'],
      [FASTING_KEYS.START_TIME, String(now)],
      [FASTING_KEYS.ELAPSED_ON_PAUSE, '0'],
      [FASTING_KEYS.TYPE_ID, selectedType.id],
      [FASTING_KEYS.NOTIFICATION_SENT, 'false'],
    ]);
  }

  // Modifique a função resume:

  async function resume() {
    const now = Date.now();
    startTimeRef.current = now;
    notificationSentRef.current = false;
    setIsRunning(true);
    startInterval(selectedType, elapsedOnPauseRef.current);
    Vibration.vibrate(200);

    const targetSeconds = selectedType.fast * 3600;
    const remainingSeconds = Math.max(targetSeconds - elapsedOnPauseRef.current, 0);
    if (remainingSeconds > 0) {
      // Cancela a anterior e agenda com o tempo RESTANTE (não o total)
      await Notifications.cancelScheduledNotificationAsync('fasting-complete').catch(() => {});
      await Notifications.scheduleNotificationAsync({
        identifier: 'fasting-complete',
        content: {
          title: '🎉 Jejum concluído!',
          body: `Parabéns! Você completou o jejum ${selectedType.label}! Hora de se alimentar.`,
          data: { action: 'fasting_complete' },
          channelId: 'fasting-channel',
          sound: true,
        },
        trigger: { type: 'timeInterval', seconds: remainingSeconds, repeats: false },
      });
    }
    
    // Reinicia atualizações em background
    const currentElapsed = elapsedOnPauseRef.current;
    await startBackgroundFastingUpdates(currentElapsed, targetSeconds, selectedType.label);

    await AsyncStorage.multiSet([
      [FASTING_KEYS.IS_RUNNING, 'true'],
      [FASTING_KEYS.START_TIME, String(now)],
      [FASTING_KEYS.ELAPSED_ON_PAUSE, String(elapsedOnPauseRef.current)],
      [FASTING_KEYS.NOTIFICATION_SENT, 'false'],
    ]);
  }

  // Modifique a função stop:

  async function stop() {
    clearInterval(intervalRef.current);
    if (ongoingNotifRef.current) clearInterval(ongoingNotifRef.current);
    
    // ✅ ADICIONE: Para as atualizações em background
    if (ongoingNotificationInterval) {
      clearInterval(ongoingNotificationInterval);
      ongoingNotificationInterval = null;
    }

    const currentElapsed = startTimeRef.current
      ? elapsedOnPauseRef.current + Math.floor((Date.now() - startTimeRef.current) / 1000)
      : elapsedOnPauseRef.current;

    elapsedOnPauseRef.current = currentElapsed;
    startTimeRef.current = null;
    setElapsed(currentElapsed);
    setIsRunning(false);
    Vibration.vibrate([100, 100, 100]);

    await cancelFastingCompleteNotification();
    await cancelFastingOngoingNotification();

    await AsyncStorage.multiSet([
      [FASTING_KEYS.IS_RUNNING, 'false'],
      [FASTING_KEYS.ELAPSED_ON_PAUSE, String(currentElapsed)],
    ]);
    await AsyncStorage.removeItem(FASTING_KEYS.START_TIME);
  }

  // Modifique a função reset:

  async function reset() {
    clearInterval(intervalRef.current);
    if (ongoingNotifRef.current) clearInterval(ongoingNotifRef.current);
    
    // ✅ ADICIONE: Para as atualizações em background
    if (ongoingNotificationInterval) {
      clearInterval(ongoingNotificationInterval);
      ongoingNotificationInterval = null;
    }

    startTimeRef.current = null;
    elapsedOnPauseRef.current = 0;
    notificationSentRef.current = false;
    setIsRunning(false);
    setElapsed(0);

    await cancelFastingCompleteNotification();
    await cancelFastingOngoingNotification();

    await AsyncStorage.multiRemove([
      FASTING_KEYS.IS_RUNNING,
      FASTING_KEYS.START_TIME,
      FASTING_KEYS.ELAPSED_ON_PAUSE,
    ]);
  }

  async function changeType(ft) {
    if (!isRunning) {
      setSelectedType(ft);
      await AsyncStorage.setItem(FASTING_KEYS.TYPE_ID, ft.id);
    }
  }

  return { selectedType, changeType, isRunning, elapsed, start, resume, stop, reset, completedCount };
}
const FastingContext = React.createContext(null);

// ════════════════════════════════════════════════════════════
// TELA: LOGIN / CADASTRO
// ════════════════════════════════════════════════════════════
function AuthScreen({ onLogin, theme }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveCredentials, setSaveCredentials] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('free');
  const [showPlanModal, setShowPlanModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;

  useEffect(() => { setupImmersiveMode(); loadSavedEmail(); Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start(); }, []);

  async function loadSavedEmail() {
    try { const savedEmail = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_EMAIL); if (savedEmail) setEmail(savedEmail); }
    catch (e) { console.log('Erro ao carregar email:', e); }
  }

  async function saveUserCredentials(emailToSave, passwordToSave) {
    if (saveCredentials) { try { await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_EMAIL, emailToSave); await SecureStore.setItemAsync(STORAGE_KEYS.SAVED_PASSWORD, passwordToSave); } catch (e) { console.log('Erro ao salvar credenciais:', e); } }
  }

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Atenção', 'Preencha email e senha.');
    setLoading(true);
    try { const cred = await signInWithEmailAndPassword(auth, email.trim(), password); await saveUserCredentials(email.trim(), password); onLogin(cred.user); }
    catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!name || !email || !password) return Alert.alert('Atenção', 'Preencha todos os campos.');
    if (password.length < 6) return Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, 'users', cred.user.uid), { name, email: email.trim(), createdAt: new Date().toISOString(), photoURL: '', steps: 0, calories: 0, fastingDays: 0, waterIntake: 0, activities: [], gamification: { totalPoints: 0, fastingCount: 0, workoutCount: 0, totalSteps: 0, achievements: {}, fastingStreak: 0 }, subscriptionPlan: selectedPlan });
      Alert.alert('🔐 Salvar acesso', 'Deseja salvar suas credenciais?', [{ text: 'Não', style: 'cancel' }, { text: 'Sim', onPress: async () => { await saveUserCredentials(email.trim(), password); Alert.alert('✅ Sucesso', 'Credenciais salvas!'); } }]);
      onLogin(cred.user);
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  }

  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="transparent" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.authScrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', flex: 1 }}>

            <View style={styles.logoContainer}>
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 72 }}>🥑</Text>
              </View>
              <Text style={{ fontSize: 48, fontWeight: '900', color: colors.green, letterSpacing: 3 }}>KETO+</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['💪 Treino', '🥗 Receitas', '⏱️ Jejum', '📊 Plano'].map(tag => (
                  <View key={tag} style={{ backgroundColor: colors.green + '22', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: colors.green + '44' }}>
                    <Text style={{ color: colors.green, fontSize: 11, fontWeight: '600' }}>{tag}</Text>
                  </View>
                ))}
              </View>
              <Text style={[styles.logoSub, { color: colors.textMuted, marginTop: 12 }]}>
                {mode === 'login' ? 'Bem-vindo(a) de volta!' : 'Crie sua conta gratuita'}
              </Text>
            </View>

            <View style={styles.authForm}>
              {mode === 'register' && (
                <>
                  <Input label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome" autoCapitalize="words" theme={theme} />
                  <TouchableOpacity 
                    onPress={() => setShowPlanModal(true)}
                    style={{ backgroundColor: colors.bgCard2, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: colors.green }}
                  >
                    <Text style={{ color: colors.textSub, fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Plano Escolhido:</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.green, fontWeight: '700' }}>{SUBSCRIPTION_PLANS[selectedPlan.toUpperCase()]?.name || 'Gratuito'}</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Alterar Plano ➔</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
              <Input label="E-mail" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" theme={theme} />
              <Input label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres" secureTextEntry theme={theme} />
              {mode === 'login' && (<View style={styles.saveCredentialsRow}><TouchableOpacity style={styles.checkbox} onPress={() => setSaveCredentials(!saveCredentials)}><View style={[styles.checkboxBox, saveCredentials && styles.checkboxChecked]}>{saveCredentials && <Text style={styles.checkboxCheck}>✓</Text>}</View><Text style={[styles.checkboxLabel, { color: colors.textSub }]}>Salvar credenciais para acesso rápido</Text></TouchableOpacity></View>)}
            </View>

            <Modal visible={showPlanModal} transparent animationType="slide">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
                <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '80%' }}>
                  <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' }}>Escolha seu Plano 🚀</Text>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {Object.values(SUBSCRIPTION_PLANS).map(p => (
                      <TouchableOpacity 
                        key={p.id} 
                        onPress={() => { setSelectedPlan(p.id); setShowPlanModal(false); }}
                        style={{ backgroundColor: colors.bgCard, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: selectedPlan === p.id ? colors.green : colors.border }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{p.name}</Text>
                          <Text style={{ color: colors.green, fontWeight: '700' }}>{p.price}</Text>
                        </View>
                        {p.features.map((f, i) => (
                          <Text key={i} style={{ color: colors.textSub, fontSize: 12, marginBottom: 2 }}>• {f}</Text>
                        ))}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Btn label="FECHAR" onPress={() => setShowPlanModal(false)} variant="secondary" style={{ marginTop: 16 }} theme={theme} />
                </View>
              </View>
            </Modal>
            <View style={{ flex: 1 }} />
            <View style={styles.authButtonsContainer}>
              <Btn label={mode === 'login' ? 'ENTRAR NO KETO+' : 'CRIAR MINHA CONTA'} onPress={mode === 'login' ? handleLogin : handleRegister} loading={loading} style={styles.authMainButton} theme={theme} />
              <TouchableOpacity style={styles.switchModeButton} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                <Text style={[styles.switchModeText, { color: colors.green }]}>{mode === 'login' ? 'Não tem uma conta? Cadastre-se grátis' : 'Já tem uma conta? Faça login'}</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.authFooter, { color: colors.textMuted }]}>Ao usar o app, você concorda com nossos termos de uso.</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════
// TELA: PLANOS DE ASSINATURA (COMPRA ÚNICA VIA PIX - VITALÍCIO)
// ════════════════════════════════════════════════════════════
function PlanosScreen({ onBack, user, profile, theme, onPlanActivated, currentPlan }) {
  const colors = theme === 'dark' ? COLORS : LIGHT_COLORS;
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(3600);
  const [userPlan, setUserPlan] = useState(currentPlan || 'free');
  const countdownRef = useRef(null);

  const RENDER_API_URL = 'https://dieta-cetogenica-api-1.onrender.com/api/mercadopago';

  const plans = [
    {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      priceText: 'R$ 0,00',
      description: 'Para começar sua jornada',
      emoji: '📱',
      features: [
        '✅ Acesso completo ao app',
        '✅ Jejum, treinos, atividades',
        '✅ Diário alimentar',
        '✅ Hidratação e desafios',
        '🎬 Coach IA: assistir anúncio (30s)',
        '🎬 Análise de foto: assistir anúncio (30s)',
      ],
      color: colors.textMuted,
      buttonLabel: null, // sem botão de compra
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 29.90,
      priceText: 'R$ 29,90',
      description: 'Compra única — acesso vitalício',
      emoji: '💎',
      features: [
        '✅ Tudo do Gratuito',
        '✅ Coach IA: 5 mensagens/dia (SEM ANÚNCIOS)',
        '✅ Análise de foto: 5 fotos/dia (SEM ANÚNCIOS)',
        '✅ Sem anúncios em nenhum lugar',
        '✅ Suporte prioritário',
        '✅ Acesso VITALÍCIO',
      ],
      popular: true,
      color: colors.green,
      buttonLabel: 'Comprar Premium — R$ 29,90',
    },
    {
      id: 'plus',
      name: 'Plus',
      price: 49.90,
      priceText: 'R$ 49,90',
      description: 'Compra única — acesso vitalício',
      emoji: '🚀',
      features: [
        '✅ Tudo do Premium',
        '✅ Coach IA: ILIMITADO (SEM ANÚNCIOS)',
        '✅ Análise de foto: ILIMITADO (SEM ANÚNCIOS)',
        '✅ Sem anúncios em nenhum lugar',
        '✅ Suporte VIP',
        '✅ Treinos personalizados por IA',
        '✅ Planos alimentares exclusivos',
        '✅ Acesso VITALÍCIO',
      ],
      popular: false,
      color: colors.accent,
      buttonLabel: 'Comprar Plus — R$ 49,90',
    },
  ];

  useEffect(() => {
    loadUserPlan();
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [user]);

  const loadUserPlan = async () => {
    if (!user?.uid) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const plan = userDoc.data().subscriptionPlan || 'free';
        setUserPlan(plan);
      }
    } catch (e) {
      console.log('Erro ao carregar plano:', e);
    }
  };

  const startCountdown = () => {
    setCountdown(3600);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const gerarPix = async (plan) => {
    if (plan.id === 'free') return;

    if (userPlan === plan.id) {
      Alert.alert('✅ Plano já ativo', `Você já possui o plano ${plan.name}!`);
      return;
    }

    // Se já tem plus e quer premium, não faz sentido
    if (userPlan === 'plus' && plan.id === 'premium') {
      Alert.alert('ℹ️ Você já tem o Plus', 'Seu plano atual (Plus) já inclui tudo do Premium!');
      return;
    }

    Alert.alert(
      `💳 Comprar ${plan.name}`,
      `Você está prestes a comprar o plano ${plan.name} por ${plan.priceText}.\n\n✅ Acesso VITALÍCIO — paga uma vez, usa para sempre!\n\nDeseja prosseguir com o pagamento via PIX?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '📲 Gerar PIX',
          onPress: async () => {
            setLoading(true);
            setSelectedPlan(plan);

            try {
              const response = await fetch(RENDER_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'create_pix',
                  planId: plan.id,
                  userId: user?.uid || 'anon',
                  userEmail: profile?.email || user?.email || 'cliente@email.com',
                  planValue: plan.price,
                }),
              });

              const data = await response.json();

              if (data.success) {
                setPixData({
                  qrCode: data.qrCode,
                  qrCodeBase64: data.qrCodeBase64,
                  pixCopyPaste: data.pixCopyPaste,
                  paymentId: data.paymentId,
                  value: data.value,
                });
                startCountdown();
              } else {
                Alert.alert('❌ Erro', data.error || 'Não foi possível gerar o PIX. Tente novamente.');
                setSelectedPlan(null);
              }
            } catch (error) {
              console.error('Erro ao gerar PIX:', error);
              Alert.alert('❌ Erro de conexão', 'Verifique sua internet e tente novamente.');
              setSelectedPlan(null);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const copiarPix = async () => {
    if (!pixData?.pixCopyPaste) return;
    await Clipboard.setStringAsync(pixData.pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const verificarPagamento = async () => {
    if (!pixData?.paymentId) return;
    setLoading(true);
    try {
      const response = await fetch(RENDER_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_status',
          paymentId: pixData.paymentId,
        }),
      });

      const data = await response.json();

      if (data.status === 'approved' || data.status === 'confirmed') {
        // ✅ Acesso VITALÍCIO — sem data de expiração
        await updateDoc(doc(db, 'users', user.uid), {
          subscriptionPlan: selectedPlan.id,
          subscriptionStatus: 'active',
          subscriptionType: 'lifetime', // vitalício
          purchaseDate: new Date().toISOString(),
          paymentId: pixData.paymentId,
        });

        setUserPlan(selectedPlan.id);

        if (countdownRef.current) clearInterval(countdownRef.current);

        Alert.alert(
          '🎉 Pagamento Confirmado!',
          `Parabéns! Você agora tem o plano ${selectedPlan.name} VITALÍCIO!\n\n` +
          `${selectedPlan.id === 'plus'
            ? '🤖 Coach IA: Ilimitado\n📸 Análise de foto: Ilimitada'
            : '🤖 Coach IA: 5 mensagens/dia\n📸 Análise de foto: 5/dia'
          }\n🎬 Sem anúncios\n💎 Acesso para sempre!`,
          [{
            text: '🚀 Aproveitar!',
            onPress: () => {
              setPixData(null);
              setSelectedPlan(null);
              if (onPlanActivated) onPlanActivated(selectedPlan.id);
            },
          }]
        );
      } else if (data.status === 'pending') {
        Alert.alert(
          '⏳ Aguardando pagamento',
          'O PIX ainda não foi pago. Após realizar o pagamento, toque em "Já paguei!" novamente.\n\nO pagamento pode levar alguns minutos para ser confirmado.'
        );
      } else {
        Alert.alert('⚠️ Não confirmado', 'O pagamento ainda não foi identificado. Se já pagou, aguarde alguns minutos e tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao verificar pagamento:', error);
      Alert.alert('❌ Erro', 'Não foi possível verificar o pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const cancelarPix = () => {
    Alert.alert(
      'Cancelar pagamento?',
      'Deseja cancelar e voltar à tela de planos?',
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
            setPixData(null);
            setSelectedPlan(null);
            setCountdown(3600);
          },
        },
      ]
    );
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── TELA DO QR CODE PIX ──────────────────────────────────
  if (pixData && selectedPlan) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
        <StatusBar hidden={true} translucent backgroundColor="transparent" />
        <Header
          title="💳 Pagamento via PIX"
          onBack={cancelarPix}
          theme={theme}
        />

        <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: 40 }}>

          {/* Badge do plano */}
          <View style={{
            backgroundColor: selectedPlan.color + '22',
            borderWidth: 2,
            borderColor: selectedPlan.color,
            borderRadius: 20,
            paddingHorizontal: 20,
            paddingVertical: 10,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Text style={{ fontSize: 22 }}>{selectedPlan.emoji}</Text>
            <View>
              <Text style={{ color: selectedPlan.color, fontWeight: '900', fontSize: 18 }}>{selectedPlan.name}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>Acesso VITALÍCIO · {selectedPlan.priceText}</Text>
            </View>
          </View>

          <Card theme={theme} style={{ width: '100%', alignItems: 'center', marginBottom: 16 }}>

            {/* Contador */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Text style={{ fontSize: 16 }}>⏰</Text>
              <Text style={{ color: countdown < 300 ? colors.red : colors.textMuted, fontSize: 14, fontWeight: '600' }}>
                PIX expira em: {formatTime(countdown)}
              </Text>
            </View>

            {/* QR Code */}
            {pixData.qrCodeBase64 ? (
              <View style={{ padding: 12, backgroundColor: '#fff', borderRadius: 16, marginBottom: 16 }}>
                <Image
                  source={{ uri: `data:image/png;base64,${pixData.qrCodeBase64}` }}
                  style={{ width: 200, height: 200 }}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <View style={{
                width: 200, height: 200,
                backgroundColor: '#fff',
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <ActivityIndicator color={colors.green} size="large" />
                <Text style={{ color: '#000', fontSize: 12, marginTop: 8 }}>Carregando QR Code...</Text>
              </View>
            )}

            <Text style={{ color: colors.textSub, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
              Abra o app do seu banco, escolha PIX e escaneie o QR Code acima
            </Text>

            {/* Código copia e cola */}
            <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 6 }}>ou use o código PIX Copia e Cola:</Text>
            <TouchableOpacity
              onPress={copiarPix}
              style={{
                backgroundColor: copied ? colors.green + '22' : colors.bgCard2,
                borderWidth: 1,
                borderColor: copied ? colors.green : colors.border,
                borderRadius: 12,
                padding: 12,
                width: '100%',
                marginBottom: 8,
              }}
            >
              <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center' }} numberOfLines={3}>
                {pixData.pixCopyPaste}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={copiarPix}
              style={{
                backgroundColor: copied ? colors.green : colors.bgCard2,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: copied ? colors.green : colors.border,
              }}
            >
              <Text style={{ fontSize: 16 }}>{copied ? '✅' : '📋'}</Text>
              <Text style={{ color: copied ? '#000' : colors.text, fontWeight: '600', fontSize: 13 }}>
                {copied ? 'Código copiado!' : 'Copiar código PIX'}
              </Text>
            </TouchableOpacity>

            {/* Instruções */}
            <View style={{ backgroundColor: colors.bgCard2, borderRadius: 12, padding: 14, width: '100%', marginBottom: 20 }}>
              <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>📱 Como pagar:</Text>
              {[
                '1. Abra o app do seu banco',
                '2. Acesse a área de PIX',
                '3. Escolha "Pagar com QR Code" ou "Copia e Cola"',
                '4. Confirme o pagamento',
                '5. Volte aqui e toque em "Já paguei!"',
              ].map((step, i) => (
                <Text key={i} style={{ color: colors.textSub, fontSize: 12, marginBottom: 4 }}>{step}</Text>
              ))}
            </View>

            {/* Botão verificar */}
            <TouchableOpacity
              onPress={verificarPagamento}
              disabled={loading}
              style={{
                backgroundColor: colors.green,
                borderRadius: 16,
                paddingVertical: 16,
                width: '100%',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 12,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? <ActivityIndicator color="#000" size="small" />
                : <Text style={{ fontSize: 18 }}>✅</Text>
              }
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16 }}>
                {loading ? 'Verificando...' : 'Já paguei!'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={cancelarPix} style={{ padding: 10 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Cancelar e voltar</Text>
            </TouchableOpacity>

          </Card>

          <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 20 }}>
            🔒 Pagamento seguro via Mercado Pago. Após a confirmação, seu acesso é liberado automaticamente e de forma permanente.
          </Text>

        </ScrollView>
      </View>
    );
  }

  // ── TELA DE LISTAGEM DE PLANOS ────────────────────────────
  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.bg }]}>
      <StatusBar hidden={true} translucent backgroundColor="transparent" />
      <Header title="🚀 Planos KETO+" onBack={onBack} theme={theme} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Banner plano atual */}
        <View style={{
          backgroundColor: userPlan === 'free' ? colors.bgCard2 : (userPlan === 'premium' ? colors.green + '22' : colors.accent + '22'),
          borderWidth: 2,
          borderColor: userPlan === 'free' ? colors.border : (userPlan === 'premium' ? colors.green : colors.accent),
          borderRadius: 20,
          padding: 20,
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 6 }}>SEU PLANO ATUAL</Text>
          <Text style={{ fontSize: 32, marginBottom: 4 }}>
            {userPlan === 'free' ? '📱' : userPlan === 'premium' ? '💎' : '🚀'}
          </Text>
          <Text style={{
            fontSize: 22,
            fontWeight: '900',
            color: userPlan === 'free' ? colors.text : (userPlan === 'premium' ? colors.green : colors.accent),
            marginBottom: 4,
          }}>
            {userPlan === 'free' ? 'Gratuito' : userPlan === 'premium' ? 'Premium' : 'Plus'}
          </Text>
          {userPlan !== 'free' && (
            <View style={{
              backgroundColor: colors.green + '22',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 4,
              marginTop: 4,
            }}>
              <Text style={{ color: colors.green, fontWeight: '700', fontSize: 12 }}>✅ VITALÍCIO · PAGO</Text>
            </View>
          )}
          {userPlan === 'free' && (
            <Text style={{ color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
              Use as IAs assistindo anúncios de 30s
            </Text>
          )}
        </View>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 6 }}>
          {userPlan === 'plus' ? '🎉 Você tem o melhor plano!' : 'Compre uma vez, use para sempre'}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
          {userPlan === 'plus'
            ? 'Aproveite todos os recursos ilimitados do KETO+!'
            : 'Sem mensalidade. Pagamento único via PIX. Acesso vitalício.'}
        </Text>

        {/* Cards dos planos */}
        {plans.map(plan => {
          const isOwned = userPlan === plan.id;
          const isUpgrade = plan.id === 'plus' && userPlan === 'premium';

          return (
            <View
              key={plan.id}
              style={{
                backgroundColor: colors.bgCard,
                borderRadius: 20,
                borderWidth: plan.popular ? 2 : 1,
                borderColor: isOwned ? colors.green : (plan.popular ? plan.color : colors.border),
                marginBottom: 16,
                overflow: 'hidden',
              }}
            >
              {/* Tag popular */}
              {plan.popular && !isOwned && (
                <View style={{ backgroundColor: plan.color, paddingVertical: 6, alignItems: 'center' }}>
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 12, letterSpacing: 1 }}>⭐ MAIS POPULAR</Text>
                </View>
              )}

              {/* Tag já adquirido */}
              {isOwned && plan.id !== 'free' && (
                <View style={{ backgroundColor: colors.green, paddingVertical: 6, alignItems: 'center' }}>
                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 12 }}>✅ SEU PLANO ATUAL — VITALÍCIO</Text>
                </View>
              )}

              <View style={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 32, marginRight: 12 }}>{plan.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: plan.color, fontSize: 20, fontWeight: '900' }}>{plan.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>{plan.description}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: plan.id === 'free' ? colors.textMuted : colors.green, fontSize: 22, fontWeight: '900' }}>
                      {plan.priceText}
                    </Text>
                    {plan.id !== 'free' && (
                      <Text style={{ color: colors.textMuted, fontSize: 10 }}>pagamento único</Text>
                    )}
                  </View>
                </View>

                {/* Features */}
                {plan.features.map((f, i) => (
                  <Text key={i} style={{ color: colors.textSub, fontSize: 13, marginBottom: 6 }}>{f}</Text>
                ))}

                {/* Botão de compra */}
                {plan.buttonLabel && !isOwned && (
                  <TouchableOpacity
                    onPress={() => gerarPix(plan)}
                    disabled={loading && selectedPlan?.id === plan.id}
                    style={{
                      backgroundColor: plan.color,
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      marginTop: 16,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: (loading && selectedPlan?.id === plan.id) ? 0.7 : 1,
                    }}
                  >
                    {loading && selectedPlan?.id === plan.id
                      ? <ActivityIndicator color="#000" size="small" />
                      : <Text style={{ fontSize: 18 }}>📲</Text>
                    }
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>
                      {loading && selectedPlan?.id === plan.id ? 'Gerando PIX...' : plan.buttonLabel}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Upgrade para plus */}
                {plan.id === 'plus' && isUpgrade && (
                  <TouchableOpacity
                    onPress={() => gerarPix(plan)}
                    disabled={loading}
                    style={{
                      backgroundColor: plan.color,
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      marginTop: 16,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>⬆️</Text>
                    <Text style={{ color: '#000', fontWeight: '900', fontSize: 15 }}>
                      Fazer upgrade para Plus — R$ 49,90
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Já possui */}
                {isOwned && plan.id !== 'free' && (
                  <View style={{
                    backgroundColor: colors.green + '22',
                    borderRadius: 14,
                    paddingVertical: 12,
                    alignItems: 'center',
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: colors.green + '44',
                  }}>
                    <Text style={{ color: colors.green, fontWeight: '700', fontSize: 14 }}>✅ Plano ativo — Aproveite!</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {/* Aviso sobre pagamento */}
        <Card theme={theme} style={{ marginTop: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700', marginBottom: 8 }}>🔒 Pagamento seguro</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            • Pagamento via PIX processado pelo Mercado Pago{'\n'}
            • Compra única — sem mensalidade, sem renovação automática{'\n'}
            • Acesso liberado imediatamente após confirmação do PIX{'\n'}
            • Em caso de dúvidas, entre em contato pelo suporte
          </Text>
        </Card>

      </ScrollView>
    </View>
  );
}
// ════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ════════════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState('home');
  const [biometricPassed, setBiometricPassed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [theme, setTheme] = useState('dark');
  const fastingTimer = useFastingTimer();

useEffect(() => {
  setupImmersiveMode();
  setupNotificationChannels();
  requestNotificationPermission();
  loadTheme();
  checkOnboarding();
}, []);

  const loadTheme = async () => { try { const savedTheme = await AsyncStorage.getItem(STORAGE_KEYS.THEME); if (savedTheme) setTheme(savedTheme); } catch (e) {} };
  const toggleTheme = async (newTheme) => { setTheme(newTheme); await AsyncStorage.setItem(STORAGE_KEYS.THEME, newTheme); };
  const checkOnboarding = async () => {
    // Primeiro checa localmente para rapidez
    const completedLocal = await AsyncStorage.getItem('onboarding_completed');
    if (completedLocal) {
      setShowOnboarding(false);
      return;
    }
    
    // Se não tiver local, mas o perfil já tiver os dados, não mostra
    if (profile && profile.weight && profile.goal) {
      setShowOnboarding(false);
      await AsyncStorage.setItem('onboarding_completed', 'true');
    } else if (!user) {
      // Se não tem usuário e nem registro local, mostra onboarding (para novos usuários)
      setShowOnboarding(true);
    }
  };

  useEffect(() => { if (fastingTimer.completedCount > 0 && user) { setProfile(p => p ? ({ ...p, fastingDays: (p.fastingDays || 0) + 1 }) : p); } }, [fastingTimer.completedCount]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setProfile(snap.data());
      } catch (e) { console.log('Erro ao carregar perfil:', e); }
    })();
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'users', u.uid));
          if (snap.exists()) { 
            const data = snap.data();
            setProfile(data);
            // Se já tem dados de perfil, marca onboarding como concluído localmente
            if (data.weight && data.goal) {
              await AsyncStorage.setItem('onboarding_completed', 'true');
              setShowOnboarding(false);
            }
          }
          else { setProfile({ name: u.displayName || '', email: u.email, photoURL: u.photoURL || '', steps: 0, calories: 0, fastingDays: 0, waterIntake: 0, activities: [], gamification: { totalPoints: 0, fastingCount: 0, workoutCount: 0, totalSteps: 0, achievements: {}, fastingStreak: 0 }, subscriptionPlan: 'free' }); }
        } catch { setProfile({ name: u.displayName || '', email: u.email, fastingDays: 0, waterIntake: 0, activities: [], gamification: { totalPoints: 0, fastingCount: 0, workoutCount: 0, totalSteps: 0, achievements: {}, fastingStreak: 0 }, subscriptionPlan: 'free' }); }
        setUser(u);
        await tryBiometricForLoggedUser();
      } else {
        const biometricSuccess = await tryBiometricLogin();
        if (!biometricSuccess) { setUser(null); setProfile(null); }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const tryBiometricForLoggedUser = async () => {
    try {
      const biometryEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRY_ENABLED);
      if (biometryEnabled !== 'true') { setBiometricPassed(true); return; }
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Confirme sua identidade para acessar', cancelLabel: 'Cancelar', disableDeviceFallback: false });
      if (result.success) setBiometricPassed(true);
      else { await signOut(auth); setBiometricPassed(false); }
    } catch (e) { setBiometricPassed(true); }
  };

  const tryBiometricLogin = async () => {
    try {
      const biometryEnabled = await SecureStore.getItemAsync(STORAGE_KEYS.BIOMETRY_ENABLED);
      if (biometryEnabled !== 'true') return false;
      const savedEmail = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_EMAIL);
      const savedPassword = await SecureStore.getItemAsync(STORAGE_KEYS.SAVED_PASSWORD);
      if (!savedEmail || !savedPassword) return false;
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Autentique-se para acessar o app', cancelLabel: 'Cancelar', disableDeviceFallback: false });
      if (result.success) { await signInWithEmailAndPassword(auth, savedEmail, savedPassword); setBiometricPassed(true); return true; }
      return false;
    } catch (e) { return false; }
  };

  function handleLogout() {
    Alert.alert('Sair', 'Deseja realmente sair?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Sair', style: 'destructive', onPress: async () => { setBiometricPassed(false); await signOut(auth); } }]);
  }

  function updatePhoto(url) { setProfile(p => ({ ...p, photoURL: url })); }
  function updateProfileData(newData) { setProfile(p => ({ ...p, ...newData })); }
  function handlePlanSaved(planData) { setProfile(p => ({ ...p, weightPlan: planData })); }
  function updateStepsAndCalories(newSteps, newCalories) { setProfile(p => ({ ...p, steps: newSteps, caloriesBurned: newCalories })); }

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setProfile(snap.data());
    } catch (e) { console.log('Erro ao atualizar perfil:', e); }
  }, [user]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active' && user) refreshProfile();
    });
    return () => sub?.remove();
  }, [user, refreshProfile]);

  const handleOnboardingComplete = async (data) => {
    if (user) { await updateDoc(doc(db, 'users', user.uid), { weight: data.weight, height: data.height, age: data.age, gender: data.gender, goal: data.goal }); }
    setShowOnboarding(false);
  };

  if (loading) {
    const bgColor = theme === 'dark' ? COLORS.bg : LIGHT_COLORS.bg;
    const greenColor = theme === 'dark' ? COLORS.green : LIGHT_COLORS.green;
    const mutedColor = theme === 'dark' ? COLORS.textMuted : LIGHT_COLORS.textMuted;
    return (
      <View style={[styles.fullScreen, styles.centerContent, { backgroundColor: bgColor }]}>
        <StatusBar hidden={true} />
        <Text style={{ fontSize: 64, marginBottom: 8 }}>🥑</Text>
        <Text style={{ fontSize: 36, fontWeight: '900', color: greenColor, letterSpacing: 2, marginBottom: 4 }}>KETO+</Text>
        <Text style={{ fontSize: 12, color: mutedColor, letterSpacing: 1, marginBottom: 32 }}>Sua jornada keto começa aqui</Text>
        <ActivityIndicator color={greenColor} size="large" />
      </View>
    );
  }

  if (!user) return <AuthScreen onLogin={setUser} theme={theme} />;
  if (showOnboarding) return <OnboardingScreen onComplete={handleOnboardingComplete} theme={theme} />;

  if (!biometricPassed) {
    return (
      <View style={[styles.fullScreen, styles.centerContent, { backgroundColor: theme === 'dark' ? COLORS.bg : LIGHT_COLORS.bg }]}>
        <StatusBar hidden={true} />
        <Text style={{ fontSize: 50, marginBottom: 16 }}>🔐</Text>
        <Text style={[styles.loadingText, { marginTop: 12, fontSize: 16, color: theme === 'dark' ? COLORS.textSub : LIGHT_COLORS.textSub }]}>Verificando identidade...</Text>
        <TouchableOpacity onPress={tryBiometricForLoggedUser} style={{ marginTop: 24, paddingVertical: 14, paddingHorizontal: 32, backgroundColor: theme === 'dark' ? COLORS.green : LIGHT_COLORS.green, borderRadius: 14 }}>
          <Text style={{ color: '#000', fontWeight: '700', fontSize: 15 }}>👆 Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderScreen = () => {
  switch (screen) {
    case 'settings': return <SettingsScreen user={user} profile={profile} onBack={() => setScreen('home')} onUpdateProfile={updateProfileData} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} onNavigate={setScreen} />;
    case 'fasting':    return <FastingScreen onBack={() => { setScreen('home'); refreshProfile(); }} theme={theme} />;
    case 'calculator': return <CalculatorScreen onBack={() => setScreen('home')} user={user} onPlanSaved={handlePlanSaved} theme={theme} />;
    case 'workout':    return <WorkoutScreen onBack={() => { setScreen('home'); refreshProfile(); }} userId={user.uid} profile={profile} theme={theme} />;
    case 'activities': return <ActivitiesScreen onBack={() => { setScreen('home'); refreshProfile(); }} user={user} profile={profile} onStepsUpdate={updateStepsAndCalories} theme={theme} />;
    case 'ranking':    return <RankingScreen onBack={() => setScreen('home')} currentUser={user} profile={profile} theme={theme} />;
    case 'wvideos':    return <VideosScreen type="workout" onBack={() => setScreen('home')} user={user} profile={profile} theme={theme} />;
    case 'rvideos':    return <VideosScreen type="recipe" onBack={() => setScreen('home')} user={user} profile={profile} theme={theme} />;
    case 'foodDiary':  return <FoodDiaryScreen onBack={() => { setScreen('home'); refreshProfile(); }} user={user} profile={profile} theme={theme} />;
    case 'water':      return <WaterTrackerScreen onBack={() => { setScreen('home'); refreshProfile(); }} user={user} theme={theme} />;
    case 'coach':      return <CoachScreen onBack={() => setScreen('home')} user={user} profile={profile} theme={theme} />;
    case 'challenges': return <ChallengesScreen onBack={() => { setScreen('home'); refreshProfile(); }} user={user} profile={profile} theme={theme} />;
    case 'social':     return <SocialFeedScreen onBack={() => setScreen('home')} user={user} profile={profile} theme={theme} />;
    case 'planos':     return <PlanosScreen onBack={() => setScreen('home')} user={user} profile={profile} theme={theme} onPlanActivated={(planId) => {
      // Atualiza o perfil com o novo plano
      updateDoc(doc(db, 'users', user.uid), { subscriptionPlan: planId, subscriptionStatus: 'active' });
      setProfile(prev => ({ ...prev, subscriptionPlan: planId, subscriptionStatus: 'active' }));
      setScreen('home');
      Alert.alert('🎉 Parabéns!', `Seu plano ${planId === 'premium' ? 'Premium' : 'Pro Plus'} foi ativado!`);
    }} />;
    default:           return <HomeScreen user={user} profile={profile} onNavigate={setScreen} onLogout={handleLogout} onUpdatePhoto={updatePhoto} theme={theme} onToggleTheme={toggleTheme} />;
  }
};

  return (
  <FastingContext.Provider value={fastingTimer}>
    <View style={{ flex: 1 }}>
      {renderScreen()}
      {AdBanner ? <AdBanner theme={theme} /> : null}
    </View>
  </FastingContext.Provider>
  
);
}

// ════════════════════════════════════════════════════════════
// ESTILOS (mantenha os mesmos estilos do seu código original)
// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  centerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 8 },
  textMuted: { fontSize: 12, marginBottom: 4 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerBack: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingRight: 8 },
  headerBackText: { fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', letterSpacing: 0.5 },

  card: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  btn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  inputLabel: { fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },

  authScrollContainer: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logoEmoji: { fontSize: 64, marginBottom: 12 },
  logoTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 3, textAlign: 'center', lineHeight: 38 },
  logoSub: { marginTop: 8, fontSize: 14, letterSpacing: 1 },
  authForm: { width: '100%', marginBottom: 30 },
  saveCredentialsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: { flexDirection: 'row', alignItems: 'center' },
  checkboxBox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: 'transparent' },
  checkboxChecked: { backgroundColor: '#4ADE80' },
  checkboxCheck: { color: '#000', fontSize: 14, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 13, flex: 1 },
  authButtonsContainer: { width: '100%', marginBottom: 20 },
  authMainButton: { marginBottom: 12 },
  switchModeButton: { alignItems: 'center', paddingVertical: 10 },
  switchModeText: { fontSize: 14, fontWeight: '600' },
  authFooter: { fontSize: 11, textAlign: 'center', lineHeight: 16 },

  homeTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  homeGreeting: { fontSize: 14 },
  settingsButton: { padding: 8 },
  
  avatarRingContainer: { alignItems: 'center', marginBottom: 8 },
  avatarRing: { width: 108, height: 108, borderRadius: 54, borderWidth: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2 },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  badgeInfo: { alignItems: 'center', marginTop: 8, paddingHorizontal: 16 },
  badgeName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  badgePoints: { fontSize: 11, marginBottom: 4 },
  progressBarSmall: { height: 4, borderRadius: 2, width: '100%', overflow: 'hidden' },
  progressFillSmall: { height: '100%', borderRadius: 2 },
  
  profileSection: { alignItems: 'center', paddingVertical: 16, paddingBottom: 8 },
  profileName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  profileEmail: { fontSize: 12 },
  
  userRankBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 6, borderWidth: 1 },
  userRankIcon: { fontSize: 12, marginRight: 4 },
  userRankText: { fontSize: 11, fontWeight: '600' },
  
  statBox: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', paddingHorizontal: 16, marginTop: 12, marginBottom: 10 },
  
  achievementsSection: { marginVertical: 8 },
  achievementsProgress: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
  achievementsScroll: { paddingLeft: 16, paddingRight: 8 },
  achievementCard: { width: 160, borderRadius: 16, padding: 12, marginRight: 12, alignItems: 'center', borderWidth: 1 },
  achievementCompleted: { borderColor: '#4ADE80' },
  achievementIcon: { fontSize: 36, marginBottom: 8 },
  achievementName: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  achievementDesc: { fontSize: 10, textAlign: 'center', marginBottom: 8 },
  achievementPointsContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  achievementPoints: { fontSize: 11, fontWeight: 'bold' },
  
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  menuCard: { width: (width - 48) / 3, aspectRatio: 0.95, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, padding: 8 },
  menuIcon: { fontSize: 28, marginBottom: 6 },
  menuLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center', lineHeight: 14 },
  tipCard: { marginHorizontal: 16 },
  tipTitle: { fontWeight: '700', marginBottom: 6 },
  tipText: { lineHeight: 20, fontSize: 13 },

  fastingWidget: { padding: 16, marginHorizontal: 16, marginBottom: 12 },
  fastingWidgetRow: { flexDirection: 'row', alignItems: 'center' },
  fastingWidgetTitle: { fontWeight: '700', fontSize: 15 },
  fastingWidgetSub: { fontSize: 12, marginTop: 2 },
  fastingWidgetTimer: { fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  fastingWidgetControls: { flexDirection: 'row', marginTop: 12, gap: 8 },
  fastingWidgetBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  fastingWidgetBtnText: { fontSize: 12, fontWeight: '600' },

  planCard: { marginBottom: 16, padding: 16 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  planHeaderLeft: { flex: 1 },
  planCardTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  planUpdated: { fontSize: 11 },
  planBmiBox: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', marginLeft: 12 },
  planBmiVal: { fontSize: 24, fontWeight: '900' },
  planBmiLabel: { fontSize: 10, marginTop: 2 },
  planRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  planItem: { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  planNum: { fontSize: 20, fontWeight: '800' },
  planItemLabel: { fontSize: 11, marginTop: 4 },
  planSectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 0.5 },

  settingsContainer: { padding: 16, paddingBottom: 32 },
  settingsSectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8, letterSpacing: 1 },
  settingsCard: { marginBottom: 16 },
  settingsSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  biometryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  biometryInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  biometryIcon: { fontSize: 32, marginRight: 12 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  logoutIcon: { fontSize: 20, marginRight: 8 },
  logoutText: { fontSize: 16, fontWeight: '600' },

  fastTypeChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  fastTypeChipActive: { backgroundColor: '#4ADE80' },
  fastTypeChipText: { fontWeight: '700' },
  timerCard: { alignItems: 'center', paddingVertical: 28 },
  timerLabel: { fontSize: 13, marginBottom: 8 },
  timerDisplay: { fontSize: 56, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: 2 },
  timerSub: { fontSize: 13, marginTop: 4 },
  timerRemaining: { fontSize: 13, marginTop: 8, fontWeight: '600' },
  timerControls: { flexDirection: 'row', gap: 8, marginTop: 8 },
  progressBar: { height: 6, borderRadius: 3, width: '100%', marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  infoTitle: { fontWeight: '700', marginBottom: 8 },
  infoText: { lineHeight: 22, fontSize: 13 },

  genderBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, marginRight: 8 },
  genderBtnActive: { backgroundColor: '#4ADE80' },
  genderBtnText: { fontWeight: '600' },
  activityBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  activityBtnActive: { backgroundColor: '#4ADE80' },
  resultCard: { marginBottom: 12 },
  resultTitle: { fontWeight: '700', marginBottom: 10, fontSize: 14 },
  resultBig: { fontSize: 42, fontWeight: '900', textAlign: 'center' },
  resultSub: { textAlign: 'center', marginTop: 4, fontSize: 13 },
  resultRow: { flexDirection: 'row', gap: 8 },
  resultItem: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  resultNum: { fontSize: 22, fontWeight: '800' },
  resultItemLabel: { fontSize: 11, marginTop: 2 },
  
  dietTypeBtn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  dietTypeActive: { borderColor: '#4ADE80', backgroundColor: '#4ADE8022' },
  dietTypeText: { fontSize: 13, marginTop: 4 },

  videoCard: { marginBottom: 16 },
  videoThumb: { width: '100%', height: 200, borderRadius: 12 },
  videoPlayOverlay: { position: 'absolute', top: 0, left: 0, right: 0, height: 200, alignItems: 'center', justifyContent: 'center' },
  videoPlayIcon: { fontSize: 40, color: '#fff', textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  videoTitle: { fontWeight: '600', marginTop: 8, fontSize: 14 },
  videoChannel: { fontSize: 12, marginTop: 2 },

  workoutCard: { alignItems: 'center', paddingVertical: 24 },
  workoutExName: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  workoutExDesc: { textAlign: 'center', marginBottom: 8 },
  workoutReps: { fontWeight: '700', marginBottom: 8 },
  countdownContainer: { marginVertical: 16 },
  countdown: { fontSize: 72, fontWeight: '900', fontVariant: ['tabular-nums'] },

  rankingContainer: { padding: 16, paddingBottom: 32 },
  rankingHeader: { alignItems: 'center', marginBottom: 20 },
  rankingHeaderTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  rankingHeaderSubtitle: { fontSize: 12 },
  topThreeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, gap: 8 },
  topThreeCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 2 },
  topThreePosition: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  topThreeNumber: { fontSize: 12, fontWeight: 'bold', marginRight: 4 },
  topThreeEmoji: { fontSize: 16 },
  topThreeAvatarContainer: { position: 'relative', marginBottom: 8 },
  topThreeAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2 },
  topThreeName: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  topThreePoints: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  topThreeRankBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  topThreeTitle: { fontSize: 10 },
  
  rankLegend: { marginBottom: 20, padding: 12, borderRadius: 12 },
  rankLegendTitle: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  rankLegendList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rankLegendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, gap: 4 },
  rankLegendName: { fontSize: 10, fontWeight: '500' },
  rankLegendPoints: { fontSize: 9 },
  
  rankingSubtitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
  rankingItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1 },
  rankingPosition: { width: 40 },
  rankingPositionText: { fontSize: 12, fontWeight: 'bold' },
  rankingAvatarContainer: { position: 'relative', marginRight: 12 },
  rankingAvatar: { width: 40, height: 40, borderRadius: 20 },
  rankingInfo: { flex: 1 },
  rankingName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  rankingRankContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rankingRankIcon: { fontSize: 12 },
  rankingRank: { fontSize: 11 },
  rankingStats: { alignItems: 'flex-end' },
  rankingPoints: { fontSize: 14, fontWeight: 'bold' },
  rankingDetailsContainer: { flexDirection: 'row', gap: 6, marginTop: 2 },
  rankingDetails: { fontSize: 10 },
  youBadge: { position: 'absolute', bottom: -4, right: -4, borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2 },
  youBadgeText: { fontSize: 8, fontWeight: 'bold' },
  youBadgeSmall: { position: 'absolute', bottom: -2, right: -2, borderRadius: 6, paddingHorizontal: 3, paddingVertical: 1 },
  youBadgeTextSmall: { fontSize: 6, fontWeight: 'bold' },

  activitiesContainer: { padding: 16, paddingBottom: 32 },
  activitySelector: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  activityCard: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 2 },
  activityIcon: { fontSize: 32, marginBottom: 8 },
  activityName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  activitySpeed: { fontSize: 11 },
  activityMet: { fontSize: 10, marginTop: 2 },
  activityStatusCard: { marginBottom: 16, alignItems: 'center' },
  activityStatusTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 16 },
  activityMetrics: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20, flexWrap: 'wrap' },
  metricItem: { alignItems: 'center', minWidth: 80 },
  metricValue: { fontSize: 24, fontWeight: 'bold' },
  metricLabel: { fontSize: 12, marginTop: 4 },
  activityButtons: { flexDirection: 'row', width: '100%' },
  activityInfoCard: { marginBottom: 16 },
  activityInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  activityInfoItem: { flex: 1, alignItems: 'center' },
  activityInfoLabel: { fontSize: 11, marginBottom: 4 },
  activityInfoValue: { fontSize: 16, fontWeight: 'bold' },
  activitySensorInfo: { fontSize: 11, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },

  macroProgressContainer: { marginTop: 8 },
  macroItem: { marginBottom: 12 },
  macroLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  macroValue: { fontSize: 14, fontWeight: '700', marginBottom: 4 },

  dateSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 16 },
  dateText: { fontSize: 16, fontWeight: '600' },

  addMethodButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 8 },
  searchResults: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  searchResultItem: { padding: 12, borderBottomWidth: 1 },

  waterButton: { padding: 12, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 70 },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
});