Drop free Lottie JSON files here (from lottiefiles.com — search "brain", "quiz",
"loading", "confetti", export as Lottie JSON, no attribution needed on free tier)
and they'll play automatically wherever <LottiePlayer src="/lottie/xxx.json" /> is used:

- brain.json      → used on the Splash screen
- (add more and wire into Matchmaking / Result screens the same way)

If a file is missing, LottiePlayer falls back to a plain spinner — nothing breaks.
