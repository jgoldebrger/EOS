"use client";

import { useMemo, useState } from "react";
import { getSeguePromptForIndex } from "@/features/meetings/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SeguePromptCardProps {
  prompts: string[];
}

export function SeguePromptCard({ prompts }: SeguePromptCardProps) {
  const [index, setIndex] = useState(0);
  const prompt = useMemo(() => getSeguePromptForIndex(prompts, index), [prompts, index]);

  return (
    <Card data-testid="segue-prompt-card">
      <CardHeader>
        <CardTitle className="text-base">Segue prompt</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{prompt}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIndex((current) => current + 1)}
        >
          Next prompt
        </Button>
      </CardContent>
    </Card>
  );
}
