import { SignUp } from "@clerk/react";
import { clerkBasePath } from "@/lib/clerk";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full bg-primary" />
          <span className="font-semibold tracking-widest text-lg uppercase text-foreground">Larkin2</span>
        </div>
        <SignUp
          routing="path"
          path={`${clerkBasePath}/sign-up`}
          signInUrl={`${clerkBasePath}/sign-in`}
          forceRedirectUrl={`${clerkBasePath}/dashboard`}
        />
      </div>
    </div>
  );
}
