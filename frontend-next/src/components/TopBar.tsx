import { UserButton } from "@clerk/nextjs";
import { Button } from "./ui/button";

export function TopBar() {
  return (
    <div className="w-full flex justify-between items-center p-2">
      <div className="">
        <UserButton />
      </div>
      <Button className="bg-green-500">
        Run
        {"  |>"}
      </Button>
      <span>whatever</span>
    </div>
  );
}
