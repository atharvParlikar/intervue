import { SignIn } from "@clerk/clerk-react";

function SignInPage() {
  return (
    <div className="h-screen w-screen flex justify-center ">
      <div className="my-auto">
        <SignIn />
      </div>
    </div>
  );
}

export default SignInPage;
