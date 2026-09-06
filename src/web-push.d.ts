// web-push paketinin kendi TypeScript tipleri yok; derleme hatasını önlemek için
// kullandığımız fonksiyonları burada tanımlıyoruz.
declare module "web-push" {
  interface WebPushSubscriptionKeys {
    p256dh: string;
    auth: string;
  }
  interface WebPushSubscription {
    endpoint: string;
    keys: WebPushSubscriptionKeys;
  }
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: WebPushSubscription,
    payload?: string
  ): Promise<unknown>;
  const _default: {
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default _default;
}
