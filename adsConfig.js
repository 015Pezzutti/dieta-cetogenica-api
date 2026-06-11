// adsConfig.js - Configuração do Google AdMob
import mobileAds, { MaxAdContentRating, RewardedAd, BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';

// ✅ SEUS IDs REAIS DO GOOGLE AdMob
const ADMOB_CONFIG = {
  android: {
    appId: 'ca-app-pub-8650145097882918~5905706012',
    rewardedPhotoAnalysis: 'ca-app-pub-8650145097882918/2925971849',
    rewardedCoach: 'ca-app-pub-8650145097882918/2925971849',
    banner: 'ca-app-pub-8650145097882918/3714656948',
  },
  ios: {
    appId: 'ca-app-pub-8650145097882918~5905706012',
    rewardedPhotoAnalysis: 'ca-app-pub-8650145097882918/2925971849',
    rewardedCoach: 'ca-app-pub-8650145097882918/2925971849',
    banner: 'ca-app-pub-8650145097882918/3714656948',
  },
};

let isInitialized = false;

// Inicializar o AdMob
export async function initializeAdMob() {
  if (isInitialized) return true;
  
  try {
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    });
    
    await mobileAds().start();
    isInitialized = true;
    console.log('✅ AdMob inicializado com sucesso');
    return true;
  } catch (error) {
    console.log('❌ Erro ao inicializar AdMob:', error);
    return false;
  }
}

// Criar anúncio Rewarded (premiado)
export function createRewardedAd(type = 'photo') {
  const unitId = Platform.OS === 'android' 
    ? (type === 'photo' ? ADMOB_CONFIG.android.rewardedPhotoAnalysis : ADMOB_CONFIG.android.rewardedCoach)
    : (type === 'photo' ? ADMOB_CONFIG.ios.rewardedPhotoAnalysis : ADMOB_CONFIG.ios.rewardedCoach);
  
  return RewardedAd.createForAdRequest(unitId, {
    requestNonPersonalizedAdsOnly: false,
    keywords: ['fitness', 'health', 'nutrition', 'keto', 'diet', 'workout'],
  });
}

// Mostrar anúncio premiado com callback
export async function showRewardedAd(ad, onReward, onError, onDismiss) {
  if (!ad) {
    console.log('❌ Ad não disponível');
    onDismiss?.();
    return false;
  }
  
  try {
    // Carregar o anúncio
    await ad.load();
    
    // Listener para quando o usuário ganhar a recompensa
    const unsubscribeReward = ad.addAdEventListener('onRewarded', (reward) => {
      console.log(`🎁 Recompensa: ${reward.amount} ${reward.type}`);
      onReward?.(reward);
    });
    
    // Listener para erro
    const unsubscribeError = ad.addAdEventListener('onError', (error) => {
      console.log('❌ Erro no anúncio:', error);
      unsubscribeReward();
      unsubscribeError();
      unsubscribeClose();
      onError?.(error);
      onDismiss?.();
    });
    
    // Listener para quando fechar
    const unsubscribeClose = ad.addAdEventListener('onClosed', () => {
      unsubscribeReward();
      unsubscribeError();
      unsubscribeClose();
      onDismiss?.();
    });
    
    // Mostrar o anúncio
    await ad.show();
    return true;
    
  } catch (error) {
    console.log('❌ Erro ao mostrar anúncio:', error);
    onError?.(error);
    onDismiss?.();
    return false;
  }
}

// Componente de Banner (para ser usado no bottom da tela)
export function AdBanner({ theme }) {
  const unitId = Platform.OS === 'android' 
    ? ADMOB_CONFIG.android.banner
    : ADMOB_CONFIG.ios.banner;
  
  return (
    <BannerAd
      unitId={unitId}
      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
      requestOptions={{
        requestNonPersonalizedAdsOnly: false,
      }}
      onAdLoaded={() => console.log('✅ Banner carregado')}
      onAdFailedToLoad={(error) => console.log('❌ Banner erro:', error)}
    />
  );
}