import { SignUp } from "@clerk/clerk-react";

function SignUpPage() {
  return (
    <div className="h-screen w-screen flex justify-center ">
      <div className="my-auto">
        <SignUp />
      </div>
    </div>
  );
}

export default SignUpPage;
