import { useEffect } from "react";
import { useStore } from "@/contexts/store";
import { trpc } from "@/lib/trpc";
import { toast } from "react-hot-toast";

export function useSocketMutation() {
  const { socketId } = useStore();

  const setSocketMutation = trpc.setSocket.useMutation({
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (socketId) {
      setSocketMutation.mutate({ socketId });
    }
  }, [socketId]);
}
