/**
 * Protective drops. Walking onto one wraps the parents in a shield that lets
 * curses pass through them harmlessly for a short time.
 */
export const SHIELD_SECONDS = 2.5

export const POWERUP_TYPES = {
  prayer: {
    label: 'תפילה', // shown in the HUD while the shield is up
    color: '#F6C453', // shield + halo colour (warm gold)
  },
  summon: {
    label: 'סגולה',
    color: '#A98BFF', // crystal lavender
  },
}

export const POWERUP_KEYS = Object.keys(POWERUP_TYPES)
