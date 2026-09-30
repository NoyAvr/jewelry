import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { LEVELS, TOP_FLOOR } from '../game/levelData.js'
import { HAZARD_TYPES } from '../game/hazards.js'
import { POWERUP_TYPES, SHIELD_SECONDS } from '../game/powerups.js'
import { selectFloor, useGame } from '../game/store.js'

/* ------------------------------------------------------------------------------------------------
 * Small building blocks
 * --------------------------------------------------------------------------------------------- */

function PrimaryButton({ children, onClick, autoFocus }) {
  return (
    <button
      autoFocus={autoFocus}
      onClick={onClick}
      className="pointer-events-auto rounded-full bg-ink px-7 py-3 whitespace-nowrap font-hebrew text-lg font-semibold tracking-wide text-cream shadow-[0_6px_0_#1c282e] transition hover:-translate-y-0.5 hover:bg-ink-soft active:translate-y-1 active:shadow-[0_2px_0_#1c282e] focus:outline-none focus-visible:ring-4 focus-visible:ring-sand"
    >
      {children}
    </button>
  )
}

function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="pointer-events-auto rounded-full px-5 py-3 whitespace-nowrap font-hebrew text-base font-semibold text-ink-soft underline-offset-4 transition hover:text-ink hover:underline focus:outline-none focus-visible:ring-4 focus-visible:ring-sand"
    >
      {children}
    </button>
  )
}

function Chip({ label, value }) {
  return (
    <div className="rounded-2xl bg-cream/80 px-3 py-1.5 text-center shadow-sm backdrop-blur">
      <div className="text-xs font-bold text-ink-soft">{label}</div>
      <div className="font-hebrew text-lg leading-tight font-semibold text-ink">{value}</div>
    </div>
  )
}

/** Animated centred card used by the Start, Game Over and Victory screens. */
function Modal({ children, tone = 'cream' }) {
  const backdrop = useRef()
  const card = useRef()
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out' })
      gsap.fromTo(
        card.current,
        { y: 48, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)', delay: 0.1 },
      )
      gsap.from('[data-stagger]', { y: 14, opacity: 0, duration: 0.4, stagger: 0.07, delay: 0.3, ease: 'power2.out' })
      const stamp = backdrop.current.querySelector('[data-stamp]')
      if (stamp) gsap.fromTo(
        stamp,
        { scale: 2.6, rotate: -28, opacity: 0 },
        { scale: 1, rotate: -12, opacity: 1, duration: 0.45, delay: 0.55, ease: 'power4.in' },
      )
    }, backdrop)
    return () => ctx.revert()
  }, [])

  const toneClass = tone === 'danger' ? 'bg-[#2f3e46]/35' : 'bg-[#2f3e46]/20'
  return (
    <div ref={backdrop} className={`pointer-events-auto absolute inset-0 flex items-center justify-center p-4 ${toneClass} backdrop-blur-[2px]`}>
      <div
        ref={card}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] bg-cream text-ink shadow-[0_24px_60px_-20px_rgba(47,62,70,0.55)]"
      >
        {children}
      </div>
    </div>
  )
}

/** Boarding-pass header strip shared by the result cards. */
function PassHeader({ color, label }) {
  return (
    <div className={`px-6 py-3 text-cream ${color}`}>
      <span className="font-hebrew text-sm font-semibold tracking-wide">{label}</span>
    </div>
  )
}

function Perforation() {
  return (
    <div className="relative my-1 h-4">
      <div className="absolute top-1/2 -left-3 h-6 w-6 -translate-y-1/2 rounded-full bg-mint" />
      <div className="absolute top-1/2 -right-3 h-6 w-6 -translate-y-1/2 rounded-full bg-mint" />
      <div className="absolute top-1/2 right-5 left-5 border-t-2 border-dashed border-ink/15" />
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Screens
 * --------------------------------------------------------------------------------------------- */

function IntroScreen() {
  const start = useGame((s) => s.start)
  return (
    <Modal>
      <PassHeader color="bg-turquoise" label="כרטיס עלייה למטוס" />
      <div className="px-7 pt-5 pb-7">
        <h2 data-stagger className="text-3xl font-bold">
          קללת הטיסה
        </h2>
        <p data-stagger className="mt-3 text-lg leading-relaxed text-ink-soft">
          עזרו לאמא ולאבא לטפס במגדל עד למטוס שמחכה למעלה: לחצו על משבצת כדי ללכת אליה, או השתמשו בחיצים.
        </p>
        <p data-stagger className="mt-2 text-lg leading-relaxed text-ink-soft">
          היזהרו מהקללות שנופלות מהשמיים, כי עיגול אדום מסמן איפה משהו עומד לנחות, אז זוזו ממנו מהר!
        </p>
        <div data-stagger className="mt-6 flex justify-center">
          <PrimaryButton onClick={start} autoFocus>
            יוצאים לדרך!
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}

function GameOverScreen() {
  const cause = useGame((s) => s.cause)
  const restart = useGame((s) => s.restart)
  const hazard = HAZARD_TYPES[cause] ?? { title: 'קללה לא ידועה', reason: 'אף אחד לא יודע מה קרה.' }
  return (
    <Modal tone="danger">
      <PassHeader color="bg-terracotta" label="עדכון סטטוס" />
      <div className="px-7 pt-5">
        <p data-stagger className="text-sm font-bold text-terracotta">
          {hazard.title}
        </p>
        <h2 data-stagger className="mt-1 pl-32 font-hebrew text-3xl font-bold">
          הטיסה בוטלה!
        </h2>
        <p data-stagger className="mt-2 leading-relaxed text-ink-soft">
          {hazard.reason}
        </p>
      </div>
      <div
        data-stamp
        className="pointer-events-none absolute top-[76px] left-5 rounded-lg border-4 border-terracotta px-3 py-0.5 font-hebrew text-xl font-bold text-terracotta opacity-0"
      >
        בוטלה
      </div>
      <Perforation />
      <div className="flex justify-center px-7 pt-2 pb-7">
        <div data-stagger>
          <PrimaryButton onClick={restart} autoFocus>
            להזמין שוב ולנסות
          </PrimaryButton>
        </div>
      </div>
    </Modal>
  )
}

/**
 * Shown when the plane takes off. After an earlier level it leads on to the next,
 * taller tower; after the last level it is the final victory and starts over.
 */
function VictoryScreen() {
  const time = useGame((s) => s.finishTime)
  const cancellations = useGame((s) => s.cancellations)
  const level = useGame((s) => s.level)
  const nextLevel = useGame((s) => s.nextLevel)
  const playAgain = useGame((s) => s.playAgain)
  const isLast = level === LEVELS.length - 1
  return (
    <Modal>
      <PassHeader color="bg-mint-deep" label={isLast ? 'המריאה' : `שלב ${level + 1} הושלם`} />
      <div className="px-7 pt-5">
        <h2 data-stagger className="pl-32 font-hebrew text-3xl leading-tight font-bold">
          {isLast ? 'הטיסה המריאה בהצלחה!' : 'הטיסה הראשונה המריאה!'}
        </h2>
        <p data-stagger className="mt-2 leading-relaxed text-ink-soft">
          {isLast
            ? 'אמא ואבא סוף סוף באוויר. הקללה נשברה, לפחות בינתיים.'
            : `אמא ואבא נחתו בקונקשן. עכשיו מחכה להם מגדל גבוה יותר, עם ${LEVELS[level + 1].topFloor} קומות, בדרך לטיסת ההמשך.`}
        </p>
      </div>
      <div
        data-stamp
        className="pointer-events-none absolute top-[76px] left-5 rounded-lg border-4 border-mint-deep px-3 py-0.5 font-hebrew text-xl font-bold text-mint-deep opacity-0"
      >
        בזמן
      </div>
      <Perforation />
      <div className="grid grid-cols-2 gap-4 px-7">
        <div data-stagger>
          <div className="text-xs font-bold text-ink-soft">זמן טיפוס</div>
          <div className="font-hebrew text-2xl font-semibold">{time.toFixed(1)} שניות</div>
        </div>
        <div data-stagger>
          <div className="text-xs font-bold text-ink-soft">ביטולים</div>
          <div className="font-hebrew text-2xl font-semibold">{cancellations}</div>
        </div>
      </div>
      <div data-stagger className="flex justify-center px-7 pt-6 pb-7">
        <PrimaryButton onClick={isLast ? playAgain : nextLevel} autoFocus>
          {isLast ? 'לשחק מההתחלה' : 'לשלב הבא'}
        </PrimaryButton>
      </div>
    </Modal>
  )
}

/**
 * Shown while the game is paused: either a plain "stopped" card (resume / restart / exit),
 * or the exit confirmation. Exiting goes back to the start screen at level 1.
 */
function PauseScreen() {
  const reason = useGame((s) => s.pauseReason)
  const resume = useGame((s) => s.resume)
  const restart = useGame((s) => s.restart)
  const askQuit = useGame((s) => s.askQuit)
  const quit = useGame((s) => s.quit)

  if (reason === 'quit') {
    return (
      <Modal key="quit">
        <PassHeader color="bg-ink-soft" label="המשחק מושהה" />
        <div className="px-7 pt-5 pb-7">
          <h2 data-stagger className="font-hebrew text-3xl font-bold">
            לצאת מהמשחק?
          </h2>
          <p data-stagger className="mt-2 leading-relaxed text-ink-soft">
            תחזרו למסך הפתיחה, וההתקדמות תתאפס: המסע יתחיל מחדש משלב 1.
          </p>
          <div data-stagger className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <PrimaryButton onClick={quit}>כן, לצאת</PrimaryButton>
            <SecondaryButton onClick={resume}>להמשיך לשחק</SecondaryButton>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal key="stop">
      <PassHeader color="bg-ink-soft" label="המשחק נעצר" />
      <div className="px-7 pt-5 pb-7">
        <h2 data-stagger className="font-hebrew text-3xl font-bold">
          הפסקה קצרה
        </h2>
        <p data-stagger className="mt-2 leading-relaxed text-ink-soft">
          הקללות קפאו באוויר. אפשר להמשיך מאותה נקודה בדיוק.
        </p>
        {/* One option per row, main action on top */}
        <div data-stagger className="mt-6 flex flex-col items-center gap-1">
          <PrimaryButton onClick={resume} autoFocus>
            להמשיך לשחק
          </PrimaryButton>
          <SecondaryButton onClick={restart}>התחלה מחדש</SecondaryButton>
          <SecondaryButton onClick={askQuit}>יציאה מהמשחק</SecondaryButton>
        </div>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Controls: keyboard + on-screen isometric D-pad
 * --------------------------------------------------------------------------------------------- */

/** Keyboard keys → isometric grid directions (rotated 45° to match the view). */
const KEYMAP = {
  ArrowUp: 'upRight',
  KeyW: 'upRight',
  ArrowRight: 'downRight',
  KeyD: 'downRight',
  ArrowDown: 'downLeft',
  KeyS: 'downLeft',
  ArrowLeft: 'upLeft',
  KeyA: 'upLeft',
}

function useKeyboardControls() {
  useEffect(() => {
    const onKey = (e) => {
      const { phase, issueCommand, restart, pause, resume } = useGame.getState()
      // Escape stops the game, and resumes it again.
      if (e.code === 'Escape') return phase === 'paused' ? resume() : pause()
      if (phase === 'paused') return
      if (e.code === 'KeyR' && phase !== 'intro') return restart()
      const dir = KEYMAP[e.code]
      if (!dir) return
      e.preventDefault()
      issueCommand({ type: 'step', dir })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}

const PAD = [
  { dir: 'upLeft', label: 'צעד למעלה שמאלה', rotate: '-45deg' },
  { dir: 'upRight', label: 'צעד למעלה ימינה', rotate: '45deg' },
  { dir: 'downLeft', label: 'צעד למטה שמאלה', rotate: '-135deg' },
  { dir: 'downRight', label: 'צעד למטה ימינה', rotate: '135deg' },
]

function PadButton({ dir, label, rotate }) {
  const timer = useRef()
  const stop = () => clearInterval(timer.current)
  const press = (e) => {
    e.preventDefault()
    const step = () => useGame.getState().issueCommand({ type: 'step', dir })
    step()
    stop()
    timer.current = setInterval(step, 200) // hold to keep walking
  }
  useEffect(() => stop, [])
  return (
    <button
      aria-label={label}
      onPointerDown={press}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream/85 text-ink shadow-[0_4px_0_rgba(47,62,70,0.25)] backdrop-blur transition select-none active:translate-y-0.5 active:bg-sand active:shadow-none"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" style={{ transform: `rotate(${rotate})` }} aria-hidden>
        <path d="M12 4 L20 14 H15 V20 H9 V14 H4 Z" fill="currentColor" />
      </svg>
    </button>
  )
}

function DPad() {
  // The arrows point along screen diagonals, so the pad keeps a left-to-right layout inside the RTL UI.
  return (
    <div dir="ltr" className="grid grid-cols-2 gap-2">
      {PAD.map((p) => (
        <PadButton key={p.dir} {...p} />
      ))}
    </div>
  )
}

/** Pops in while a prayer/summon protects the parents, with a bar that drains over the shield time. */
function ShieldIndicator() {
  const shield = useGame((s) => s.shield)
  const ref = useRef()
  useLayoutEffect(() => {
    if (!shield) return
    const tween = gsap.fromTo(ref.current, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2.5)' })
    return () => tween.kill()
  }, [shield])
  if (!shield) return null
  const { label, color } = POWERUP_TYPES[shield.type]
  return (
    <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 sm:top-6">
      {/* keyed by pickup id so a second pickup restarts the drain animation */}
      <div key={shield.id} ref={ref} className="overflow-hidden rounded-2xl bg-cream/90 shadow-md backdrop-blur">
        <div className="px-4 pt-1.5 pb-1 text-center text-sm font-bold text-ink">{label} · אתם מוגנים!</div>
        <div
          className="h-1.5 origin-right"
          style={{ background: color, animation: `shield-drain ${SHIELD_SECONDS}s linear forwards` }}
        />
      </div>
    </div>
  )
}

const FALSE_ALARM_TOAST_MS = 3500

/** Toast shown when a curse hits but turns out to be a false alarm. */
function FalseAlarmToast() {
  const alarm = useGame((s) => s.falseAlarm)
  const ref = useRef()
  useLayoutEffect(() => {
    if (!alarm) return
    const tween = gsap.fromTo(ref.current, { y: 16, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' })
    const timer = setTimeout(() => useGame.getState().clearFalseAlarm(alarm.id), FALSE_ALARM_TOAST_MS)
    return () => {
      tween.kill()
      clearTimeout(timer)
    }
  }, [alarm])
  if (!alarm) return null
  return (
    // Sits low on the screen so it never covers the tower: above the D-pad on phones,
    // and in the empty bottom-left corner just above the controls hint on larger screens.
    <div className="pointer-events-none absolute right-4 bottom-40 left-4 flex justify-center sm:right-auto sm:bottom-20 sm:left-6">
      <div
        key={alarm.id}
        ref={ref}
        className="max-w-md rounded-2xl border-2 border-mint-deep bg-cream/90 px-4 py-2 text-center shadow-md backdrop-blur"
      >
        <span className="font-bold text-mint-deep">אזעקת שווא! </span>
        <span className="text-sm font-semibold text-ink">{HAZARD_TYPES[alarm.type].falseAlarm}</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Options menu: stop, restart or exit
 * --------------------------------------------------------------------------------------------- */

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

const OPTION_ITEMS = [
  {
    id: 'stop',
    label: 'עצירה',
    hint: 'Esc',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 5v14M15 5v14" />
      </svg>
    ),
  },
  {
    id: 'restart',
    label: 'התחלה מחדש',
    hint: 'R',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 4v5h5" />
      </svg>
    ),
  },
  {
    id: 'exit',
    label: 'יציאה מהמשחק',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        <path d="M9 8l-4 4 4 4" />
        <path d="M5 12h10" />
      </svg>
    ),
  },
]

/** "אפשרויות" button that drops down a menu to stop, restart or exit the game. */
function OptionsMenu() {
  const [open, setOpen] = useState(false)
  const phase = useGame((s) => s.phase)
  const menu = useRef()
  const container = useRef()
  const enabled = phase === 'playing'

  // A press anywhere outside the button + menu closes it. (A full-screen catcher element
  // wouldn't work here: the HUD's GSAP transform makes `position: fixed` local to the header.)
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (!container.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  // Close when the game leaves normal play (e.g. game over) while the menu is open.
  useEffect(() => {
    if (!enabled) setOpen(false)
  }, [enabled])

  useLayoutEffect(() => {
    if (!open) return
    const tween = gsap.fromTo(menu.current, { y: -8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.2, ease: 'power2.out' })
    return () => tween.kill()
  }, [open])

  const choose = (id) => {
    setOpen(false)
    const { pause, restart, askQuit } = useGame.getState()
    if (id === 'stop') pause()
    if (id === 'restart') restart()
    if (id === 'exit') askQuit()
  }

  return (
    <div ref={container} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!enabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className="pointer-events-auto flex h-[52px] items-center gap-2 rounded-2xl bg-ink px-4 text-cream shadow-[0_4px_0_#1c282e] transition hover:bg-ink-soft active:translate-y-0.5 active:shadow-none disabled:opacity-40"
      >
        {/* Three-line "menu" glyph */}
        <svg {...ICON_PROPS}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <span className="hidden text-sm font-bold sm:inline">אפשרויות</span>
      </button>
      {open && (
        <div
          ref={menu}
          role="menu"
          className="pointer-events-auto absolute top-full right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl bg-cream py-1.5 text-ink shadow-[0_16px_40px_-12px_rgba(47,62,70,0.5)]"
        >
          {OPTION_ITEMS.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              onClick={() => choose(item.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-right font-semibold transition hover:bg-mint/40 focus:bg-mint/40 focus:outline-none"
            >
              <span className="text-ink-soft">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.hint && <span className="text-xs font-bold text-ink-soft/70" dir="ltr">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * HUD
 * --------------------------------------------------------------------------------------------- */

function HUD() {
  const root = useRef()
  const phase = useGame((s) => s.phase)
  const floor = useGame(selectFloor)
  const level = useGame((s) => s.level)
  const cancellations = useGame((s) => s.cancellations)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-hud]', { y: -24, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      {/* RTL layout: the options menu sits at the right edge, the counters at the left */}
      <header className="flex items-start justify-between gap-3">
        <div data-hud>
          <OptionsMenu />
        </div>
        <div data-hud className="flex items-start gap-2">
          <Chip label="שלב" value={`${level + 1}/${LEVELS.length}`} />
          <Chip label="קומה" value={`${floor}/${TOP_FLOOR}`} />
          <Chip label="בוטלו" value={cancellations} />
        </div>
      </header>

      {/* dir="ltr" keeps the D-pad bottom-right (thumb side); the hint text itself stays RTL. */}
      <footer dir="ltr" className="flex items-end justify-between gap-3">
        <p data-hud dir="rtl" className="hidden rounded-full bg-cream/70 px-4 py-2 text-xs font-semibold text-ink-soft backdrop-blur sm:block">
          לחצו על משבצת כדי ללכת · חיצים / WASD לצעד אחד · R להתחלה מחדש · Esc לעצירה
        </p>
        {/* GSAP owns the outer div's inline opacity; the inner one fades with the game phase. */}
        <div data-hud className="ml-auto">
          <div className={`transition-opacity duration-300 ${phase === 'playing' ? 'opacity-100' : 'opacity-0 [&_button]:pointer-events-none'}`}>
            <DPad />
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------------------------------------
 * Overlay root
 * --------------------------------------------------------------------------------------------- */

export default function UIOverlay() {
  const phase = useGame((s) => s.phase)
  const runId = useGame((s) => s.runId)
  useKeyboardControls()

  return (
    <div dir="rtl" lang="he" className="pointer-events-none absolute inset-0 font-hebrew select-none">
      <HUD />
      {phase === 'playing' && <ShieldIndicator />}
      {phase === 'playing' && <FalseAlarmToast />}
      {phase === 'intro' && <IntroScreen />}
      {phase === 'gameover' && <GameOverScreen key={`over-${runId}`} />}
      {phase === 'won' && <VictoryScreen key={`won-${runId}`} />}
      {phase === 'paused' && <PauseScreen />}
    </div>
  )
}
