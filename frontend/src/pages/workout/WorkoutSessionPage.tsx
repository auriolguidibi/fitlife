import { VideoPlayer } from '@/components/domain/VideoPlayer'
import { videoForExercise } from '@/data/exerciseVideos'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronLeft, Flame, Pause, Play, SkipForward, Timer } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Badge, Button, Card, EmptyState, ProgressBar, Spinner } from '@/components/ui'
import { levelLabels, workoutTypeLabels } from '@/utils/labels'
import { formatClock } from '@/utils/format'
import { workoutImage } from '@/data/images'
import { Trophy } from 'lucide-react'

type Phase = 'work' | 'rest' | 'done'

export function WorkoutSessionPage() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const { data: program, loading } = useAsync(() => api.getProgram(), [])

  const workout = useMemo(
    () => program?.weeks.flatMap((w) => w.workouts).find((w) => w.id === workoutId),
    [program, workoutId],
  )

  const [exIndex, setExIndex] = useState(0)
  const [setIndex, setSetIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('work')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [paused, setPaused] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const saved = useRef(false)
  /** Un chrono d'exercice minuté est en cours (pour enchaîner automatiquement à 0). */
  const workTimer = useRef(false)

  const exercise = workout?.exercises[exIndex]
  const exerciseVideo = exercise ? videoForExercise(exercise.name) : null

  // total elapsed tick
  useEffect(() => {
    if (paused || phase === 'done') return
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(id)
  }, [paused, phase])

  // countdown tick (timed exercise or rest)
  useEffect(() => {
    if (paused || phase === 'done' || secondsLeft <= 0) return
    const id = window.setInterval(() => setSecondsLeft((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [paused, phase, secondsLeft])

  const goNext = useCallback(() => {
    if (!workout) return
    const ex = workout.exercises[exIndex]
    const isLastSet = setIndex + 1 >= ex.sets
    const isLastExercise = exIndex + 1 >= workout.exercises.length

    if (!isLastSet) {
      setSetIndex((s) => s + 1)
      setPhase('rest')
      setSecondsLeft(ex.restSeconds || 30)
      return
    }
    if (isLastExercise) {
      setPhase('done')
      return
    }
    setExIndex((i) => i + 1)
    setSetIndex(0)
    setPhase('rest')
    setSecondsLeft(ex.restSeconds || 30)
  }, [workout, exIndex, setIndex])

  // Démarre le chrono d'un exercice minuté (premier exercice de la séance)
  useEffect(() => {
    if (phase === 'work' && exercise?.durationSeconds && secondsLeft === 0 && !paused) {
      workTimer.current = true
      setSecondsLeft(exercise.durationSeconds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise])

  // Fin du repos : on reprend automatiquement (avec le chrono si l'exercice est minuté)
  useEffect(() => {
    if (phase !== 'rest' || secondsLeft > 0 || paused) return
    setPhase('work')
    if (exercise?.durationSeconds) {
      workTimer.current = true
      setSecondsLeft(exercise.durationSeconds)
    }
  }, [phase, secondsLeft, paused, exercise])

  // Fin du chrono d'un exercice minuté : série ou exercice suivant
  useEffect(() => {
    if (phase === 'work' && workTimer.current && secondsLeft === 0 && !paused) {
      workTimer.current = false
      goNext()
    }
  }, [phase, secondsLeft, paused, goNext])

  useEffect(() => {
    if (phase === 'done' && workout && !saved.current) {
      saved.current = true
      void api.completeWorkout({
        workoutId: workout.id,
        workoutName: workout.name,
        durationSeconds: elapsed,
        calories: workout.calories,
      })
    }
  }, [phase, workout, elapsed])

  if (loading) return <Spinner label="Chargement de la séance…" />
  if (!workout) {
    return (
      <div className="py-10">
        <EmptyState
          title="Séance introuvable"
          description="Cette séance ne fait plus partie de ton programme."
          action={<Button onClick={() => navigate('/program')}>Voir mon programme</Button>}
        />
      </div>
    )
  }
  if (!exercise && phase !== 'done') return <Spinner />

  const progressPct = ((exIndex + (setIndex + 1) / Math.max(1, exercise?.sets ?? 1)) / workout.exercises.length) * 100
  if (!exercise) return <Spinner />

  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-md space-y-5 py-6 text-center animate-slide-up">
        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-fit to-fit-dark text-white shadow-fit">
          <Trophy size={40} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Séance terminée !</h1>
          <p className="mt-1 text-sm text-white/50">Excellent travail, continue comme ça.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card padding="sm">
            <p className="text-xs text-white/50">Durée</p>
            <p className="text-lg font-extrabold text-white">{formatClock(elapsed)}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-white/50">Exercices</p>
            <p className="text-lg font-extrabold text-white">{workout.exercises.length}</p>
          </Card>
          <Card padding="sm">
            <p className="text-xs text-white/50">Calories</p>
            <p className="text-lg font-extrabold text-white">{workout.calories}</p>
          </Card>
        </div>
        <p className="text-xs text-white/40">
          Séance enregistrée automatiquement dans ta progression.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => navigate('/program')}>
            Retour au programme
          </Button>
          <Button fullWidth onClick={() => navigate('/')}>
            Accueil
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink-700 text-white/70"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs text-white/50">Exercice {exIndex + 1} / {workout.exercises.length}</p>
          <p className="text-sm font-bold text-white">{workoutTypeLabels[workout.type]}</p>
        </div>
        <Badge tone="fit">{levelLabels[workout.difficulty]}</Badge>
      </div>

      <ProgressBar value={progressPct} showLabel />

      <Card padding="none" className="overflow-hidden">
        <div className="relative grid h-64 place-items-center overflow-hidden bg-ink-800">
          <img
            src={workoutImage(workout.type, 900)}
            alt={exercise.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/10 to-ink-900/30" />
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <Badge tone="fit">{exercise.sets} séries × {exercise.durationSeconds ? `${exercise.durationSeconds}s` : `${exercise.reps} rép.`}</Badge>
            <span className="rounded-full bg-ink-900/70 px-3 py-1 text-xs font-bold text-white">
              Série {setIndex + 1} / {exercise.sets}
            </span>
          </div>
        </div>
        <div className="p-4">
          <h2 className="text-xl font-extrabold text-white">{exercise.name}</h2>
          <p className="mt-1 text-sm text-white/60">{exercise.description}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {exercise.muscles.map((m) => (
              <Badge key={m} tone="gray">{m}</Badge>
            ))}
          </div>
          {exerciseVideo && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-fit">Vidéo de l’exercice</p>
              <VideoPlayer key={exercise.id} ids={exerciseVideo} title={exercise.name} />
            </div>
          )}
        </div>
      </Card>

      {(phase === 'rest' || (exercise.durationSeconds && secondsLeft > 0)) && (
        <Card className="flex items-center gap-3 border-fit/30 bg-fit/10">
          <Timer className="text-fit" size={22} />
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              {phase === 'rest' ? 'Temps de repos' : 'Exercice en cours'}
            </p>
            <p className="text-xs text-white/60">
              {phase === 'rest' ? 'Reprends ton souffle' : 'Tiens la position'}
            </p>
          </div>
          <span className="text-2xl font-extrabold text-fit">
            {formatClock(phase === 'rest' ? secondsLeft : secondsLeft)}
          </span>
        </Card>
      )}

      <Card>
        <p className="mb-2 flex items-center gap-2 text-sm font-bold text-white">
          <Flame size={16} className="text-fit" /> Conseils
        </p>
        <ul className="space-y-1.5 text-sm text-white/60">
          {exercise.tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <Check size={14} className="mt-0.5 shrink-0 text-fit" /> {tip}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Button variant="secondary" onClick={() => setPaused((p) => !p)} leftIcon={paused ? <Play size={16} /> : <Pause size={16} />}>
          {paused ? 'Reprendre' : 'Pause'}
        </Button>
        {phase === 'rest' ? (
          <Button className="col-span-2" onClick={() => { setPhase('work'); workTimer.current = !!exercise.durationSeconds; setSecondsLeft(exercise.durationSeconds ?? 0) }} leftIcon={<SkipForward size={16} />}>
            Passer le repos
          </Button>
        ) : (
          <Button
            className="col-span-2"
            onClick={() => {
              workTimer.current = false
              goNext()
            }}
            rightIcon={<SkipForward size={16} />}
          >
            {exIndex + 1 >= workout.exercises.length && setIndex + 1 >= exercise.sets
              ? 'Terminer la séance'
              : setIndex + 1 < exercise.sets
                ? 'Série suivante'
                : 'Exercice suivant'}
          </Button>
        )}
      </div>
      <Button variant="ghost" fullWidth onClick={() => setPhase('done')}>
        Terminer maintenant
      </Button>
    </div>
  )
}
