"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { loginSchema } from "@/lib/schemas"
import { loginUser } from "@/app/actions/auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { EyeIcon, EyeOffIcon } from "lucide-react"

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrUsername: "",
      password: "",
    },
  })

  const onSubmit = form.handleSubmit(() => {
    setIsSubmitting(true)
    setError("")
  })

  useEffect(() => {
    if (isSubmitting) {
      const submitForm = async () => {
        try {
          const formData = new FormData()
          Object.entries(form.getValues()).forEach(([key, value]) => formData.append(key, value))

          const result = await loginUser(formData)

          if (result.error) {
            setError(result.error)
          } else {
            router.push("/dashboard")
          }
        } catch (err) {
          console.error(err)
          setError("An unexpected error occurred")
        } finally {
          setIsSubmitting(false)
        }
      }

      submitForm()
    }
  }, [isSubmitting, form, router])

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormField
          control={form.control}
          name="emailOrUsername"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Email or Username</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter your email or username"
                  {...field}
                  className="bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...field}
                    className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full text-gray-400 hover:text-white"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                  </Button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button
          type="submit"
          className="w-full bg-white text-black hover:bg-gray-200 transition-colors"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Logging in..." : "Log In"}
        </Button>
      </form>
    </Form>
  )
}

