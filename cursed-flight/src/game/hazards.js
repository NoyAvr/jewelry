/**
 * The curses. Each hazard type has a collision radius, how wildly it tumbles
 * while falling, and the (Hebrew) copy shown when it cancels the parents' flight.
 */
export const HAZARD_TYPES = {
  crab: {
    radius: 0.42,
    tumble: 1,
    title: 'פלישת סרטנים',
    reason: 'צבא של סרטנים השתלט על המסלול.',
  },
  missile: {
    radius: 0.34,
    tumble: 0,
    title: 'המרחב האווירי נסגר',
    reason: 'פרצה מלחמה בלילה, וכל הטיסות קורקעו.',
  },
  plane: {
    radius: 0.42,
    tumble: 0, // nose-dives in a tight spiral instead of tumbling
    title: 'חברת התעופה קורקעה',
    reason: 'טייס מחבל ניסה לרסק מטוס, וכל הטיסות של חברת התעופה בוטלו.',
  },
  tv: {
    radius: 0.42,
    tumble: 0.5,
    title: 'מבזק חדשות',
    reason: 'חברת התעופה הכריזה הרגע על שביתה פתאומית, בשידור חי.',
  },
  medkit: {
    radius: 0.38,
    tumble: 0.9,
    title: 'מצב חירום רפואי',
    reason: 'מקרה חירום רפואי פתאומי, והטיסה נדחתה שוב.',
  },
}

export const HAZARD_KEYS = Object.keys(HAZARD_TYPES)
