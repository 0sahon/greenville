/**
 * Greenville Montessori Schools — Benin City, Nigeria.
 * Source: https://www.greenvillemontessorischools.ng/
 * Admin → Settings can override `school_name` in the database for live apps.
 */
export const SCHOOL_NAME = 'Greenville Montessori Schools';
export const SCHOOL_NAME_SHORT = 'Greenville Montessori';
/** Prefix for admission / print references (e.g. GMS-A1B2C3D4). */
export const SCHOOL_REFERENCE_PREFIX = 'GMS';

export const SCHOOL_DOMAIN = 'greenvillemontessorischools.ng';
export const SCHOOL_WEBSITE = `https://www.${SCHOOL_DOMAIN}/`;
/** Public site lists this contact email. */
export const SCHOOL_EMAIL_INFO = `ceo@${SCHOOL_DOMAIN}`;
export const SCHOOL_EMAIL_ADMISSIONS = `ceo@${SCHOOL_DOMAIN}`;

export const SCHOOL_TAGLINE = 'Education for Life';

export const SCHOOL_ADDRESS_LINE1 = 'Plot 110 Ekenwan Road, by Agbonma Junction';
export const SCHOOL_ADDRESS_LINE2 = 'Benin City, Edo State, Nigeria';
export const SCHOOL_ADDRESS_SINGLE = `${SCHOOL_ADDRESS_LINE1}, ${SCHOOL_ADDRESS_LINE2}`;
export const SCHOOL_CITY_TAGLINE = 'Benin City, Edo State, Nigeria';

export const SCHOOL_PHONE_DISPLAY = '+234 802 871 7629';
export const SCHOOL_PHONE_TEL_HREF = 'tel:+2348028717629';

/** Used in `toLocaleDateString` / `toLocaleString` across dashboards (Nigeria). */
export const DATE_LOCALE = 'en-NG';

/** Official badge from the school website (`/images/g2a.jpg`), stored locally for offline builds. */
export const SCHOOL_LOGO_PATH = '/gms-logo.jpg';

export const KIDS_PROGRESS_STORAGE_KEY = 'greenville_montessori_schools_kids_progress_v1';

/** DOM id for printable result card wrapper. */
export const RESULT_CARD_PRINT_DOM_ID = 'gms-result-card';

/** OpenStreetMap embed (approx. Ekenwan Road / Benin City). */
export const SCHOOL_MAP_EMBED_URL =
  'https://www.openstreetmap.org/export/embed.html?bbox=5.55%2C6.26%2C5.72%2C6.38&layer=mapnik&marker=6.318%2C5.628';
export const SCHOOL_MAP_EXTERNAL_URL =
  'https://www.openstreetmap.org/?mlat=6.318&mlon=5.628#map=15/6.318/5.628';
