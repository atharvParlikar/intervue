import { Button } from "./ui/button";
import { useStore } from "../contexts/zustandStore";
import { UserButton } from "@clerk/clerk-react";

type TopbarProps = {
  runCode: (code: string) => void;
  endMeeting: (token: string) => void;
};

const Topbar: React.FC<TopbarProps> = ({ runCode, endMeeting }) => {
  const { code } = useStore();

  return (
    <div className="flex justify-center items-center w-full ">
      <Button className="mx-2 my-1" onClick={() => runCode(code)}>
        Fuck Shit
      </Button>
      <Button
        className="mx-2 my-1"
        onClick={() => endMeeting(localStorage.getItem("token")!)}
      >
        End Meeting
      </Button>
      <Button
        className="mx-2 my-1"
        onClick={() => endMeeting(localStorage.getItem("token")!)}
      >
        Invite Candidate
      </Button>
      <UserButton />
    </div>
  );
};

export default Topbar;
