import LoginForm from "@/components/LoginForm"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 space-y-8">
        <h1 className="text-3xl font-bold text-center tracking-tighter">Log In to TVYT</h1>
        <p className="text-center text-gray-400">Connect your accounts to view combined live chats</p>
        <LoginForm />
      </div>
    </div>
  )
}
