import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              404 Not Found
            </h1>
            <p className="text-sm text-muted-foreground">
              The page you're looking for doesn't exist or you don't have access to it.
            </p>
          </div>

          <div className="pt-4">
            <Link href="/">
              <Button>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Safety
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
