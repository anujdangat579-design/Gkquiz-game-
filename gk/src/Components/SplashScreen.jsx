import LottiePlayer from './LottiePlayer'

// Drop a Lottie JSON at public/lottie/brain.json (grab any free "brain/quiz/loading"
// animation from lottiefiles.com — search "brain" or "quiz", export JSON) and it
// plays automatically. Until then, or if the fetch ever fails, LottiePlayer falls
// back to a plain spinner ring, so the splash never breaks.
export default function SplashScreen() {
  return (
    <div className="splash-screen">
      <LottiePlayer src="/lottie/brain.json" size={150} className="splash-lottie" />
      <h1 className="splash-title">GK QUIZ GAME</h1>
      <p className="splash-tagline">Challenge Your Knowledge</p>
    </div>
  )
}
