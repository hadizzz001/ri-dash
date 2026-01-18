"use client";

import axios, { AxiosError } from "axios";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserResponse {
  user: string | null;
  error: AxiosError | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const { push } = useRouter();

  useEffect(() => {
    (async () => {
     

      // if the error did not happen, if everything is alright
      setIsSuccess(true);
    })();
  }, [push]);

  // if (!isSuccess) {
  //   return <p>Loading...</p>;
  // }

  return (
    <main>
      <header>
 
      </header>
      {children}
    </main>
  );
}

 