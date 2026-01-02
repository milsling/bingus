import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    }
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription && VAPID_PUBLIC_KEY) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      if (subscription) {
        const p256dhKey = subscription.getKey('p256dh');
        const authKey = subscription.getKey('auth');
        
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: {
              p256dh: p256dhKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(p256dhKey)))) : '',
              auth: authKey ? btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(authKey)))) : '',
            },
          }),
        });

        if (response.ok) {
          setIsSubscribed(true);
          return true;
        }
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
    }
    return false;
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        
        await subscription.unsubscribe();
        setIsSubscribed(false);
        return true;
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
    }
    return false;
  }, []);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}
