/**
 * Canonical production origin (apex, https, no trailing slash).
 * Static HTML <head> tags, robots.txt and api/sitemap.js must use the same value.
 */
const HAIBO_SITE_URL = 'https://haiboafricatours.co.tz';

/** Fallbacks only — live values come from the admin CMS (Firestore contact/socials). */
const HAIBO_CONFIG = {
  siteUrl: HAIBO_SITE_URL,
  /** Your Render API URL after deploy, e.g. https://haibo-tours-api.onrender.com */
  apiBaseUrl: '',
  logoPath: 'assets/logo/logo.png',
  whatsappNumber: '255718975060',
  defaultTourMessage:
    'Hello HAIBO Tours & Safaris! I would like to inquire about a simple tour package in Tanzania. Please share availability and pricing. Thank you!',
  email: 'hello@haiboafricatours.com',
  phoneDisplay: '+255 718 975 060',
  address: 'Tanzania',
  officeHours: 'Monday – Saturday: 8:00 AM – 6:00 PM (EAT)',
  mapUrl: 'https://maps.google.com/?q=Arusha+Tanzania',
  social: {
    instagram: 'https://www.instagram.com/haiboafrica_tours',
    facebook: '',
    tiktok: '',
    whatsapp: '',
  },
};
window.HAIBO_SITE_URL = HAIBO_SITE_URL;

function normalizeWhatsAppNumber(value) {
  return String(value || '').replace(/\D+/g, '');
}

function getWhatsAppUrl(customMessage) {
  const text = encodeURIComponent(customMessage || HAIBO_CONFIG.defaultTourMessage);
  const number = normalizeWhatsAppNumber(HAIBO_CONFIG.whatsappNumber);
  return `https://wa.me/${number}?text=${text}`;
}

HAIBO_CONFIG.whatsappNumber = normalizeWhatsAppNumber(HAIBO_CONFIG.whatsappNumber);
window.normalizeWhatsAppNumber = normalizeWhatsAppNumber;
