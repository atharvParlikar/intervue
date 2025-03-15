"use client";

import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Page() {
  const runCodeMutation = trpc.runCode.useMutation({
    onSuccess: ({ stderr, stdout }) => console.log(stderr ? stderr : stdout),
    onError: (err) => console.log(err.message)
  });

  return (
    <div className="h-screen w-screen flex flex-col justify-center items-center">
      <Button onClick={() => {
        runCodeMutation.mutate({ code: "print('wzzup nigga')" })
      }}>send</Button>
    </div>
  );
}
