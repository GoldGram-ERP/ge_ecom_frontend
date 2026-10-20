// Company facts and outbound links. The facts come from the prototypes. The links marked
// "to confirm" were placeholders there too; set the env variables when the real ones exist.
export const site = {
  hotline: "17937",
  email: "info@goldgram-eg.com",
  commercialRegister: "295852",
  taxRegistration: "774-088-346",
  hallmarking: "200409",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Cairo+Business+Plaza+New+Cairo",
  // to confirm
  whatsappUrl: process.env.NEXT_PUBLIC_WHATSAPP_URL ?? "#whatsapp",
  iosUrl: process.env.NEXT_PUBLIC_IOS_URL ?? "#ios",
  androidUrl: process.env.NEXT_PUBLIC_ANDROID_URL ?? "#android",
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "#instagram",
  facebookUrl: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "#facebook",
  tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL ?? "#tiktok",
} as const;
