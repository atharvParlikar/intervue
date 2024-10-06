declare module "y-codemirror" {
  import { Text } from "yjs";
  import { Extension } from "@codemirror/state";
  import { Awareness } from "y-protocols/awareness";

  export function yCollab(
    ytext: Text,
    awareness: Awareness,
    options?: { clientID?: number },
  ): Extension;
}
