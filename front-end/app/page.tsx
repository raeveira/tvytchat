import Link from "next/link"
import {Button} from "@/components/ui/button"
import {Twitch as BrandTwitch, Youtube as BrandYoutube} from "lucide-react"

export default function Home() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <main className="max-w-4xl w-full space-y-8 text-center">
                <div className="space-y-4">
                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tighter">TVYT</h1>
                    <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
                        Unify your stream chat experience by combining Twitch and YouTube live chats into one seamless
                        interface.
                    </p>
                </div>

                <div className="flex items-center justify-center gap-6 py-8">
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-purple-600">
                        <BrandTwitch className="w-6 h-6"/>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600">
                        <BrandYoutube className="w-6 h-6"/>
                    </div>
                </div>

                <div className="space-y-4">
                    <Link href="/login">
                        <Button size="lg"
                                className="text-lg px-8 bg-white text-black hover:bg-gray-200 transition-colors">
                            Login
                        </Button>
                    </Link>
                    <p className="text-sm text-gray-500">Log in to connect and view combined Twitch and YouTube live
                        chats</p>
                </div>
            </main>

            <footer className="fixed bottom-0 w-full p-4 text-center text-gray-500 text-sm">
                <p>© {new Date().getFullYear()} Raeveira. All rights reserved.</p>
            </footer>
        </div>
    )
}

