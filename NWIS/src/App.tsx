import Shell from "@/components/layout/Shell"
import SignIn from "@/components/auth/SignIn"
import { useAppStore } from "@/store/useAppStore"

function App() {
  const user = useAppStore((s) => s.user)
  return user ? <Shell /> : <SignIn />
}

export default App
