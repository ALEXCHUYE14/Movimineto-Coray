import Logo from './Logo'

export default function Splash() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-4 animate-fade-up">
        <Logo size={64} />
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-clinic-100">
          <div className="h-full w-1/2 bg-clinic-500 animate-[slide-in_1s_ease-in-out_infinite]" />
        </div>
        <p className="text-sm text-clinic-400 font-medium">Cargando tu consultorio...</p>
      </div>
    </div>
  )
}
