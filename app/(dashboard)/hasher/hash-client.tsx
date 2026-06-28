"use client";

import { useState } from "react";
import { shake_256 } from "js-sha3";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Check, Lock } from "lucide-react";
import { toast } from "sonner";

export function HashClient() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  function handleHash() {
    if (!input) {
      toast.error("Enter text to hash");
      return;
    }
    const hash = shake_256(input, 256);
    setOutput(hash);
    setCopied(false);
  }

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">SHAKE-256 Hasher</h1>
        <p className="text-muted-foreground">
          Hash any text using SHAKE-256 (SHA-3 extendable-output function)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Input
          </CardTitle>
          <CardDescription>Enter text to hash (e.g. password)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hash-input">Text</Label>
            <Textarea
              id="hash-input"
              rows={3}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text to hash..."
              className="resize-none"
            />
          </div>
          <Button onClick={handleHash} disabled={!input}>
            Hash
          </Button>
        </CardContent>
      </Card>

      {output && (
        <Card>
          <CardHeader>
            <CardTitle>Output</CardTitle>
            <CardDescription>SHAKE-256 hash (256-bit / 64 hex chars)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hash-output">Hashed text</Label>
              <Input
                id="hash-output"
                readOnly
                value={output}
                className="font-mono text-sm"
              />
            </div>
            <Button onClick={handleCopy} variant="secondary">
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
