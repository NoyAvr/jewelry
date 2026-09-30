import { useEffect, useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { TOP_FLOOR } from '../game/levelData.js'
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

function VictoryScreen() {
  const time = useGame((s) => s.finishTime)
  const cancellations = useGame((s) => s.cancellations)
  const restart = useGame((s) => s.restart)
  return (
    <Modal>
      <PassHeader color="bg-mint-deep" label="המריאה" />
      <div className="px-7 pt-5">
        <h2 data-stagger className="pl-32 font-hebrew text-3xl leading-tight font-bold">
          הטיסה המריאה בהצלחה!
        </h2>
        <p data-stagger className="mt-2 leading-relaxed text-ink-soft">
          אמא ואבא סוף סוף באוויר. הקללה נשברה, לפחות בינתיים.
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
        <PrimaryButton onClick={restart} autoFocus>
          לטוס שוב
        </PrimaryButton>
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
      const { phase, issueCommand, restart } = useGame.getState()
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

/* ------------------------------------------------------------------------------------------------
 * HUD
 * --------------------------------------------------------------------------------------------- */

function HUD() {
  const root = useRef()
  const phase = useGame((s) => s.phase)
  const floor = useGame(selectFloor)
  const cancellations = useGame((s) => s.cancellations)
  const restart = useGame((s) => s.restart)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-hud]', { y: -24, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div data-hud className="max-w-xs">
          <h1 className="font-hebrew text-xl font-bold tracking-tight text-ink sm:text-3xl">קללת הטיסה</h1>
          <p className="mt-0.5 text-xs font-semibold text-ink-soft sm:text-sm">
            הובילו את ההורים למטוס! התחמקו מהקללות הנופלות!
          </p>
        </div>
        <div data-hud className="flex items-start gap-2">
          <Chip label="קומה" value={`${floor}/${TOP_FLOOR}`} />
          <Chip label="בוטלו" value={cancellations} />
          <button
            onClick={restart}
            disabled={phase === 'intro'}
            aria-label="התחלה מחדש"
            title="התחלה מחדש (R)"
            className="pointer-events-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-ink text-cream shadow-[0_4px_0_#1c282e] transition hover:bg-ink-soft active:translate-y-0.5 active:shadow-none disabled:opacity-40"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 12a9 9 0 1 0 3-6.7" />
              <path d="M3 4v5h5" />
            </svg>
          </button>
        </div>
      </header>

      {/* dir="ltr" keeps the D-pad bottom-right (thumb side); the hint text itself stays RTL. */}
      <footer dir="ltr" className="flex items-end justify-between gap-3">
        <p data-hud dir="rtl" className="hidden rounded-full bg-cream/70 px-4 py-2 text-xs font-semibold text-ink-soft backdrop-blur sm:block">
          לחצו על משבצת כדי ללכת · חיצים / WASD לצעד אחד · R להתחלה מחדש
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
      {phase === 'intro' && <IntroScreen />}
      {phase === 'gameover' && <GameOverScreen key={`over-${runId}`} />}
      {phase === 'won' && <VictoryScreen key={`won-${runId}`} />}
    </div>
  )
}
