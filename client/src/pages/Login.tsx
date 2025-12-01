import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Github, Code2, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export default function Login() {
  const handleGithubLogin = () => {
    // This would trigger GitHub OAuth flow
    console.log("Initiating GitHub OAuth...");
    // For demo purposes, redirect to dashboard
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link to="/" className="flex items-center space-x-2">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">CodePilot</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Sign In to CodePilot</CardTitle>
            <CardDescription>
              Connect your GitHub account to start analyzing pull requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button 
              onClick={handleGithubLogin}
              className="w-full" 
              size="lg"
            >
              <Github className="mr-2 h-5 w-5" />
              Sign in with GitHub
            </Button>

            {/* Privacy Notice */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Your privacy matters
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We only access your public repositories and pull requests. No private data is stored on our servers.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
