"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ChildError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="max-w-sm border-red-200 bg-red-50 text-center">
        <div className="mb-3 text-4xl">😵</div>
        <h2 className="mb-2 text-lg font-bold text-stone-800">Oops!</h2>
        <p className="mb-4 text-sm text-stone-500">
          Something went wrong loading the page. Please try again.
        </p>
        <Button onClick={reset} className="bg-indigo-500 text-white hover:bg-indigo-600">
          🔄 Try again
        </Button>
      </Card>
    </div>
  );
}
