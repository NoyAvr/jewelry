/** Chance that a curse hitting the parents turns out to be a false alarm. */
export const FALSE_ALARM_CHANCE = 0.3
/** Seconds of grace after a false alarm, so the next curse can't land instantly. */
export const FALSE_ALARM_GRACE = 1.5

/**
 * The curses. Each hazard type has a collision radius, how wildly it tumbles
 * while falling, the (Hebrew) copy shown when it cancels the parents' flight, and the
 * `falseAlarm` line shown when it hits them but the flight goes ahead after all.
 */
export const HAZARD_TYPES = {
  crab: {
    radius: 0.42,
    tumble: 1,
    title: 'פלישת סרטנים',
    reason: 'צבא של סרטנים השתלט על המסלול.',
    falseAlarm: 'הסרטנים התחרטו וחזרו לים. המסלול פנוי!',
  },
  missile: {
    radius: 0.34,
    tumble: 0,
    title: 'המרחב האווירי נסגר',
    reason: 'פרצה מלחמה בלילה, וכל הטיסות קורקעו.',
    falseAlarm: 'המלחמה בוטלה, טראמפ שינה את דעתו. הטיסה יוצאת כרגיל!',
  },
  plane: {
    radius: 0.42,
    tumble: 0, // nose-dives in a tight spiral instead of tumbling
    title: 'חברת התעופה קורקעה',
    reason: 'טייס מחבל ניסה לרסק מטוס, וכל הטיסות של חברת התעופה בוטלו.',
    falseAlarm: 'הייתה תקלה עם הטייס, אבל חברת התעופה ממשיכה לפעול כרגיל.',
  },
  tv: {
    radius: 0.42,
    tumble: 0.5,
    title: 'מבזק חדשות',
    reason: 'חברת התעופה הכריזה הרגע על שביתה פתאומית, בשידור חי.',
    falseAlarm: 'השביתה נמשכה שעתיים בלבד. הטיסה ממשיכה כמתוכנן!',
  },
  medkit: {
    radius: 0.38,
    tumble: 0.9,
    title: 'מצב חירום רפואי',
    reason: 'מקרה חירום רפואי פתאומי, והטיסה נדחתה שוב.',
    falseAlarm: 'סתם בהלה, הרופא אישר לטוס.',
  },
}

export const HAZARD_KEYS = Object.keys(HAZARD_TYPES)
