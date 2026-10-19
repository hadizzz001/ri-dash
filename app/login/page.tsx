import { redirect } from "next/navigation";

// The dashboard login lives at "/"; this old address leads there.
export default function LoginRedirect() {
  redirect("/");
}
