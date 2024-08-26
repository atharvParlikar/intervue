import Webcam from "react-webcam";

function JoinPermissionPage() {
  return (<>
    <div className="flex h-screen w-screen items-center justify-center ">
      <Webcam className="rounded-lg w-full border-4 border-black drop-shadow-xl videoElement" />
    </div>
  </>)
}

export default JoinPermissionPage;
