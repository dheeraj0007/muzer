"use client";
import { Button } from "@/components/ui/button";
import { signIn, signOut, useSession } from "next-auth/react";

const Appbar = () => {
  const session = useSession();

  return (
    <div className="flex justify-between px-20 pt-2">
      <div className="text-lg font-bold flex flex-col justify-center text-white">
        Muzer
      </div>
      <div>
        {session.data?.user ? (
          <Button
            onClick={() => signOut()}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Logout
          </Button>
        ) : (
          <Button
            onClick={() => signIn()}
            className="bg-purple-600 text-white hover:bg-purple-700"
          >
            Sign in
          </Button>
        )}
      </div>
    </div>
  );
};

export default Appbar;
