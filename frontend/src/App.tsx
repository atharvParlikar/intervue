import "./App.css";
import WebRTCVideoCall from "./components/WebRTCVideoCall";
import Editor from "./components/Editor";

// TODO:
// 1. Work on Editor.tsx

function App() {
  return (
    <div className="grid h-screen grid-cols-5 grid-rows-5 gap-4 p-3">
      <div className="col-span-3 row-span-5 rounded-md  ">
        <Editor />
      </div>
      <div className="col-span-2 col-start-4 row-span-3 rounded-md bg-blue-300"></div>
      <div className="col-span-2 col-start-4 row-span-2 row-start-4 rounded-md bg-green-300">
        <WebRTCVideoCall />
      </div>
    </div>
  );
}

export default App;
