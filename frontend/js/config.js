/** Update with your real details */
const HAIBO_CONFIG = {
  /** Production URL for canonical links, sitemap, and Open Graph */
  siteUrl: 'https://haibotours.com',
  /** Your Render API URL after deploy, e.g. https://haibo-tours-api.onrender.com */
  apiBaseUrl: '',
  logoPath: 'assets/logo/logo.png',
  whatsappNumber: '255712345678',
  defaultTourMessage:
    'Hello HAIBO Tours & Safaris! I would like to inquire about a simple tour package in Tanzania. Please share availability and pricing. Thank you!',
  email: 'info@haibotours.com',
  phoneDisplay: '+255 712 345 678',
  address: 'Sokoine Road, Arusha, Tanzania',
  officeHours: 'Monday – Saturday: 8:00 AM – 6:00 PM (EAT)',
  mapUrl: 'https://maps.google.com/?q=Arusha+Tanzania',
  social: {
    instagram: 'https://instagram.com/haibotours',
    facebook: 'https://facebook.com/haibotours',
    tiktok: '',
    whatsapp: '',
  },
};

function getWhatsAppUrl(customMessage) {
  const text = encodeURIComponent(customMessage || HAIBO_CONFIG.defaultTourMessage);
  return `https://wa.me/${HAIBO_CONFIG.whatsappNumber}?text=${text}`;
}
