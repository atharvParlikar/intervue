import { Button } from "./ui/button";
import { useStore } from "../contexts/zustandStore";
import { UserButton } from "@clerk/clerk-react";
import { useParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { toast } from "react-toastify";

type Toast = typeof toast;

type TopbarProps = {
  runCode: (code: string) => void;
  endMeeting: (token: string) => void;
  toast: Toast;
};

const InviteDropdown = ({ toast }: { toast: Toast }) => {
  const { roomId } = useParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button className="mx-2 my-1">Invite</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Invite Candidate</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(
              `http://localhost:3000/room/${roomId}`,
            );
            // TODO: Add toast
            toast("Copied to clipboard", { type: "success", autoClose: 500 });
          }}
        >
          <span>Copy link</span>
        </DropdownMenuItem>
        <DropdownMenuItem></DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Topbar: React.FC<TopbarProps> = ({ runCode, endMeeting, toast }) => {
  const { code } = useStore();

  return (
    <div className="flex justify-center items-center w-full ">
      <Button className="mx-2 my-1" onClick={() => runCode(code)}>
        Run Code
      </Button>
      <Button
        className="mx-2 my-1"
        onClick={() => endMeeting(localStorage.getItem("token")!)}
      >
        End Meeting
      </Button>
      {/* <Button className="mx-2 my-1">Invite Candidate</Button> */}
      <InviteDropdown toast={toast} />
      <UserButton />
    </div>
  );
};

export default Topbar;
