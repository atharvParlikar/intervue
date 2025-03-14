import { useEffect } from "react";
import { useStore } from "@/contexts/store";
import { trpc } from "@/lib/trpc";
import { toast } from "react-hot-toast";

export function useSocketMutation({ roomId }: { roomId: string }) {
  const { socketId } = useStore();

  const setSocketMutation = trpc.setSocket.useMutation({
    onSuccess: () => {},
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (socketId) {
      setSocketMutation.mutate({ socketId, roomId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketId]);
}
