"use client";

import { JoinConsent } from "@/components/JoinConsentToast";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

export default function Page() {
  return (
    <div className="h-screen w-screen flex justify-center items-center">
      <Button
        onClick={() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toast((t: any) => {
            return <JoinConsent firstName="Atharv" toastId={t.id} />;
          });
        }}
      >
        Toast
      </Button>
    </div>
  );
}
